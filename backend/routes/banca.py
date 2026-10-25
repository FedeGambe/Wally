"""
Rotte /api/banca/*: collegamento delle banche e sincronizzazione dei movimenti.

  POST /api/banca/collega       avvia il collegamento (o il rinnovo) di una banca
  GET  /api/banca/callback      ritorno dalla banca dopo l'autorizzazione
  GET  /api/banca/sincronizza   dal cron di Vercel (una volta al giorno, piano Hobby)
  POST /api/banca/sincronizza   dal pulsante "Sincronizza ora" di Wally
  GET  /api/banca/movimenti     righe di "Movimenti Banca" (token dell'utente)
  GET  /api/banca/collegamenti  banche collegate (token dell'utente)
  POST /api/banca/movimenti/stato   segna movimenti registrati o scartati (token dell'utente)
  POST /api/banca/elabora       classifica, registra da solo il certo, lista "Da confermare" (token dell'utente)
"""
import logging
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from backend.config import env
from backend.domain.classificazione import classifica, conto_nella_causale, data_probabile, descrizione_breve, tutte_le_regole
from backend.domain.conversioni import come_testo_js, numero_localizzato
from backend.domain.lettura import dati_principali, schede_presenti
from backend.domain.movimenti import normalizza_movimenti
from backend.domain.registrazione import pianifica_registrazioni, trova_gia_inseriti
from backend.domain.righe import nome_campo
from backend.domain.scrittura import ErroreScrittura, numero_cella
from backend.models.banca import (
    COLLEGAMENTI_INTESTAZIONI,
    COLLEGAMENTI_TITOLO,
    MOVIMENTI_INTESTAZIONI,
    MOVIMENTI_TITOLO,
    Collegamento,
)
from backend.models.foglio import SCHEDE
from backend.routes.comune import con_utente
from backend.security.accesso import crea_state, da_cron, da_proprietario, leggi_state, non_autorizzato
from backend.services import scritture
from backend.services.enable_banking import ErroreEB, chiama_eb, intestazioni_psu, scarica_movimenti
from backend.services.google_sheets import ErroreSheets, GoogleSheets

router = APIRouter(prefix="/api/banca")

TITOLI_PER_BANCA = ["Uscite", "Trasferimenti", "Scalable", "Trade Republic"]
log = logging.getLogger(__name__)

# Ogni volta si riscaricano gli ultimi giorni: le banche contabilizzano con
# qualche giorno di ritardo, e i doppioni si scartano con l'ID.
GIORNI_INDIETRO = 10


def _fogli() -> GoogleSheets:
    # Il cron gira senza utente: si usa il service account.
    return GoogleSheets.service_account()


def _oggi() -> str:
    return datetime.now(timezone.utc).date().isoformat()


# --- Collegamento -----------------------------------------------------------

class RichiestaCollega(BaseModel):
    banca: str = ""
    paese: str = "IT"


@router.post("/collega")
def collega(request: Request, richiesta: RichiestaCollega):
    """Risponde con { url }: Wally ci manda l'utente, che autorizza dalla banca
    e torna su /api/banca/callback."""
    if not da_proprietario(request):
        return non_autorizzato()
    banca, paese = richiesta.banca, richiesta.paese
    if not banca:
        return JSONResponse({"errore": "Banca mancante"}, status_code=400)

    # Durata del consenso: il massimo della banca meno un giorno (chiedere
    # esattamente il massimo può superarlo di qualche secondo → invalid_request).
    aspsps = chiama_eb("GET", "/aspsps", params={"country": paese})["aspsps"]
    info = next((a for a in aspsps if a["name"] == banca), None)
    if info is None:
        return JSONResponse({"errore": f'Banca "{banca}" non disponibile in {paese}'}, status_code=400)
    massimo_secondi = info.get("maximum_consent_validity") or 90 * 86400
    giorni = max(1, massimo_secondi // 86400 - 1)
    valido_fino = datetime.now(timezone.utc) + timedelta(days=giorni)

    risposta = chiama_eb("POST", "/auth", {
        "access": {"valid_until": valido_fino.isoformat(timespec="milliseconds").replace("+00:00", "Z")},
        "aspsp": {"name": banca, "country": paese},
        "state": crea_state(banca, paese),
        "redirect_url": env("EB_REDIRECT_URL"),
        "psu_type": "personal",
    })
    return {"url": risposta["url"]}


def _torna_a_wally(request: Request, parametri: dict[str, str]) -> RedirectResponse:
    # Dietro Vercel l'indirizzo pubblico è nelle intestazioni x-forwarded-*.
    protocollo = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", request.url.netloc)
    return RedirectResponse(f"{protocollo}://{host}/?{urlencode(parametri)}", status_code=302)


def _conto_wally_predefinito(banca: str) -> str:
    """Conto di Wally proposto per un conto appena collegato; si corregge a mano
    nella colonna "Conto Wally" del foglio se non è quello giusto."""
    return "Unicredit" if banca == "UniCredit" else banca


@router.get("/callback")
def callback(request: Request):
    """Apre la sessione su Enable Banking, salva i conti in "Banca Collegamenti"
    e rimanda l'utente su Wally con ?banca=collegata (o ?banca=errore&motivo=...)."""
    parametri = request.query_params
    state = leggi_state(parametri.get("state", ""))
    if state is None:
        return _torna_a_wally(request, {"banca": "errore", "motivo": "Collegamento scaduto o non partito da Wally"})
    code = parametri.get("code")
    if not code:
        motivo = parametri.get("error_description") or parametri.get("error") or "Autorizzazione annullata"
        return _torna_a_wally(request, {"banca": "errore", "motivo": motivo})

    try:
        salva_collegamento(state["banca"], state["paese"], chiama_eb("POST", "/sessions", {"code": code}))
        return _torna_a_wally(request, {"banca": "collegata", "nome": state["banca"]})
    except Exception as e:
        log.exception("Collegamento banca non riuscito")
        return _torna_a_wally(request, {"banca": "errore", "motivo": str(e)[:200]})


def salva_collegamento(banca: str, paese: str, sessione: dict) -> None:
    """Riscrive "Banca Collegamenti" con i conti della nuova sessione al posto
    di quelli vecchi della stessa banca, tenendo le correzioni fatte a mano."""
    foglio = env("VITE_DEFAULT_CONFIG_SPREADSHEET_ID")
    fogli = _fogli()
    fogli.assicura_scheda(foglio, COLLEGAMENTI_TITOLO, COLLEGAMENTI_INTESTAZIONI)
    esistenti = [Collegamento.da_riga(r) for r in fogli.leggi_scheda(foglio, COLLEGAMENTI_TITOLO)]

    nuovi = []
    for conto in sessione["accounts"]:
        iban = (conto.get("account_id") or {}).get("iban") or ""
        precedente = next((e for e in esistenti if iban and e.iban == iban), None)
        nuovi.append(Collegamento(
            banca=banca,
            paese=paese,
            sessione=sessione["session_id"],
            scadenza=sessione["access"]["valid_until"][:10],
            account=conto["uid"],
            iban=iban,
            conto_wally=(precedente and precedente.conto_wally) or _conto_wally_predefinito(banca),
            # Al primo collegamento si parte da oggi: i movimenti precedenti sono
            # già in Wally, inseriti a mano. Al rinnovo si riprende da dove si era.
            sincronizza_dal=(precedente and precedente.sincronizza_dal) or _oggi(),
        ))

    iban_nuovi = {n.iban for n in nuovi if n.iban}
    restanti = [e for e in esistenti if e.banca != banca and e.iban not in iban_nuovi]
    fogli.riscrivi_scheda(foglio, COLLEGAMENTI_TITOLO, COLLEGAMENTI_INTESTAZIONI,
                          [c.a_riga() for c in restanti + nuovi])


# --- Sincronizzazione -------------------------------------------------------

def sincronizza(psu: dict[str, str] | None = None) -> dict:
    """
    Scarica i movimenti nuovi di tutti i conti in "Banca Collegamenti" e li
    accoda in "Movimenti Banca". Non classifica e non registra niente: lo fa
    /api/banca/elabora quando Wally si apre, con i preset aggiornati e con tutti
    i movimenti sotto mano, così un giro tra conti i cui due lati arrivano in
    giorni diversi viene comunque abbinato.
    """
    oggi = _oggi()
    fogli = _fogli()
    da_giorni = (date.fromisoformat(oggi) - timedelta(days=GIORNI_INDIETRO)).isoformat()

    try:
        righe_collegamenti = fogli.leggi_scheda(env("VITE_DEFAULT_CONFIG_SPREADSHEET_ID"), COLLEGAMENTI_TITOLO)
    except Exception:
        righe_collegamenti = []  # scheda non ancora creata: nessuna banca collegata
    collegamenti = [c for c in map(Collegamento.da_riga, righe_collegamenti) if c.account and c.conto_wally]

    finanza = env("VITE_DEFAULT_SPREADSHEET_ID")
    fogli.assicura_scheda(finanza, MOVIMENTI_TITOLO, MOVIMENTI_INTESTAZIONI)
    gia_presenti = {r.get("ID") for r in fogli.leggi_scheda(finanza, MOVIMENTI_TITOLO)}

    esito = {"aggiunti": 0, "perConto": {}, "scaduti": [], "errori": []}
    righe = []

    for c in collegamenti:
        etichetta = f"{c.banca} → {c.conto_wally}"
        if c.scadenza and c.scadenza < oggi:
            esito["scaduti"].append(etichetta)
            continue
        try:
            dal = max(c.sincronizza_dal, da_giorni)
            # Il filtro sulla data va rifatto qui: Trade Republic ignora date_from
            # e restituisce comunque tutti i movimenti recenti.
            nuovi = [
                m for m in normalizza_movimenti(scarica_movimenti(c.account, dal, psu), c.conto_wally)
                if (m.data or "") >= dal and m.id not in gia_presenti
            ]
            for m in nuovi:
                gia_presenti.add(m.id)
                righe.append([m.id, m.data, m.conto, m.importo, m.descrizione, "", oggi])
            esito["perConto"][etichetta] = esito["perConto"].get(etichetta, 0) + len(nuovi)
        except Exception as e:
            log.exception("Sincronizzazione di %s non riuscita", etichetta)
            if isinstance(e, ErroreEB) and e.stato == 429:
                esito["errori"].append(f"{etichetta}: la banca ha raggiunto il limite di letture per oggi, riprova domani")
            else:
                esito["errori"].append(f"{etichetta}: {str(e)[:200]}")

    righe.sort(key=lambda r: str(r[1]))
    fogli.aggiungi_righe(finanza, MOVIMENTI_TITOLO, righe)
    esito["aggiunti"] = len(righe)
    return esito


@router.get("/sincronizza")
def sincronizza_da_cron(request: Request):
    if not da_cron(request):
        return non_autorizzato()
    return sincronizza()


@router.post("/sincronizza")
def sincronizza_ora(request: Request):
    if not da_proprietario(request):
        return non_autorizzato()
    return sincronizza(intestazioni_psu(request))


# --- Movimenti e collegamenti, con il token dell'utente --------------------------
# Letture e "Stato" dei movimenti fatti dall'app mentre l'utente la usa: come
# le rotte /api/fogli, con il suo token e non con il service account.

def _valori_o_vuoto(sheets: GoogleSheets, foglio: str, intervallo: str) -> list[list]:
    """400 = la scheda non esiste ancora (nessuna sincronizzazione fatta): nessun dato."""
    try:
        return sheets.leggi_valori(foglio, intervallo, "UNFORMATTED_VALUE")
    except ErroreSheets as e:
        if e.stato == 400:
            return []
        raise


def _testo(valore) -> str:
    return "" if valore is None else come_testo_js(valore)


def _righe_movimenti(sheets: GoogleSheets, foglio: str) -> list[dict]:
    """Righe di "Movimenti Banca" con il loro numero di riga, per segnarne lo Stato."""
    righe = _valori_o_vuoto(sheets, foglio, f"'{MOVIMENTI_TITOLO}'!A:F")[1:]
    cella = lambda r, i: r[i] if i < len(r) else None  # noqa: E731
    risultato = [{
        "riga": i + 2,
        "id": _testo(cella(r, 0)),
        "data": _testo(cella(r, 1)),
        "conto": _testo(cella(r, 2)),
        "importo": numero_cella(cella(r, 3)),
        "descrizione": _testo(cella(r, 4)),
        "stato": _testo(cella(r, 5)),
    } for i, r in enumerate(righe)]
    return [m for m in risultato if m["id"]]


@router.get("/movimenti")
def movimenti(request: Request, foglio: str):
    return con_utente(request, f'Lettura di "{MOVIMENTI_TITOLO}" non riuscita',
                      lambda sheets: {"movimenti": _righe_movimenti(sheets, foglio)})


@router.get("/collegamenti")
def collegamenti(request: Request, foglio: str):
    """Banche collegate (foglio di configurazione), per scadenze e conti."""
    def lavoro(sheets: GoogleSheets):
        valori = _valori_o_vuoto(sheets, foglio, f"'{COLLEGAMENTI_TITOLO}'")
        if not valori:
            return {"collegamenti": []}
        intestazioni, *righe = valori

        def campo(r, nome):
            i = intestazioni.index(nome) if nome in intestazioni else -1
            return _testo(r[i]) if 0 <= i < len(r) else ""

        risultato = [{"banca": campo(r, "Banca"), "scadenza": campo(r, "Scadenza"),
                      "iban": campo(r, "IBAN"), "contoWally": campo(r, "Conto Wally")} for r in righe]
        return {"collegamenti": [c for c in risultato if c["banca"]]}

    return con_utente(request, f'Lettura di "{COLLEGAMENTI_TITOLO}" non riuscita', lavoro)


class AggiornamentoStato(BaseModel):
    riga: int
    stato: str


class RichiestaStato(BaseModel):
    foglio: str
    aggiornamenti: list[AggiornamentoStato]


@router.post("/movimenti/stato")
def segna_movimenti(request: Request, r: RichiestaStato):
    """Scrive solo la colonna Stato (F) delle righe indicate: registrato o scartato."""
    def lavoro(sheets: GoogleSheets):
        sheets.scrivi_celle(r.foglio, [{"range": f"'{MOVIMENTI_TITOLO}'!F{a.riga}", "values": [[a.stato]]}
                                       for a in r.aggiornamenti], modo="RAW")

    return con_utente(request, f'Aggiornamento di "{MOVIMENTI_TITOLO}" non riuscito', lavoro)


# --- Classificazione e registrazione automatica ------------------------------------

STATO_REGISTRATO = "Registrato"


class RichiestaElabora(BaseModel):
    """I Dati Base arrivano dall'app: sono quelli che l'utente vede in
    Impostazioni (foglio di configurazione o valori di default)."""
    foglio: str
    registra: bool = False
    conti: list[str] = []
    contiCollegati: list[str] = []
    presetUscite: list[dict] = []
    presetTrasferimenti: list[dict] = []
    presetInvestimenti: list[dict] = []
    macroCategorieUscite: list[dict] = []


def _dati_del_foglio(sheets: GoogleSheets, foglio: str, titoli: list[str]) -> dict:
    """Uscite, Trasferimenti e broker, letti freschi: servono per il controllo
    "c'è già?" e per gli importi già inseriti nei broker."""
    presenti = schede_presenti((s for s in SCHEDE if s.titolo in TITOLI_PER_BANCA), titoli)
    return dati_principali(sheets.leggi_intervalli(foglio, [s.intervallo for s in presenti]), titoli, datetime.now().year)


def _importo_gia_inserito(dati: dict, broker: str, strumento: str, mese_label: str) -> float:
    """Importo già presente nella cella mese × strumento del broker (0 se vuota)."""
    righe = dati.get("scalable" if broker == "Scalable" else "tradeRepublic") or []
    riga = next((r for r in righe if str(r.get("mese") or "").strip().lower() == mese_label), None)
    return numero_localizzato(riga.get(nome_campo(strumento))) if riga else 0


def _classificati(righe: list[dict], regole: list[dict]) -> list[dict]:
    da_gestire = [m for m in righe if not m["stato"]]
    return [{**c, "riga": c["movimento"]["riga"]} for c in classifica(da_gestire, regole)]


def _registra(sheets: GoogleSheets, r: RichiestaElabora, righe: list[dict], regole: list[dict],
              dati: dict) -> tuple[list[str], str | None]:
    """
    Registra i movimenti riconosciuti con certezza, una operazione alla volta:
    se una fallisce, quelle prima restano scritte e segnate, e la volta dopo si
    riparte da lì. Restituisce le descrizioni registrate e l'eventuale errore.
    """
    operazioni = pianifica_registrazioni(_classificati(righe, regole), r.presetUscite, r.presetTrasferimenti,
                                         dati.get("uscite") or [], dati.get("trasferimenti") or [],
                                         r.macroCategorieUscite)
    fatte, descrizioni, errore = [], [], None
    try:
        for op in operazioni:
            if op["tipo"] == "record":
                if "uscita" in op:
                    scritture.aggiungi_riga(sheets, r.foglio, "Uscite", op["uscita"])
                if "trasferimento" in op:
                    scritture.aggiungi_riga(sheets, r.foglio, "Trasferimenti", op["trasferimento"])
                descrizioni.append(op["descrizione"])
            elif op["tipo"] == "investimenti":
                voci = [{"strumento": p["strumento"], "importo": p["importo"]} for p in r.presetInvestimenti
                        if p.get("broker") == op["broker"]
                        and _importo_gia_inserito(dati, op["broker"], p["strumento"], op["meseLabel"]) == 0]
                if voci:
                    scritture.scrivi_investimenti(sheets, r.foglio, op["broker"], op["meseLabel"], voci, somma=False)
                    descrizioni.append(op["descrizione"])
            fatte += [{"range": f"'{MOVIMENTI_TITOLO}'!F{riga}", "values": [[STATO_REGISTRATO]]} for riga in op["righe"]]
    except ErroreScrittura as e:
        errore = str(e)
    except ErroreSheets as e:
        if e.stato == 401:
            raise
        errore = f"Registrazione automatica non riuscita: {e}"
    finally:
        sheets.scrivi_celle(r.foglio, fatte, modo="RAW")
    return descrizioni, errore


def _da_confermare(righe: list[dict], regole: list[dict], uscite: list[dict], conti: list[str]) -> list[dict]:
    """La lista "Da confermare", dal movimento più recente, con i suggerimenti per
    il modulo: spesa già inserita a mano, data probabile, descrizione breve,
    conto nominato nella causale."""
    lista = [c for c in _classificati(righe, regole) if c["esito"] == "da-confermare"]
    # I movimenti già registrati passano per primi: i loro record non vanno
    # proposti come "già inserito" per un altro movimento uguale.
    registrati = [{"movimento": m, "esito": "da-confermare"} for m in righe if m["stato"] == STATO_REGISTRATO]
    gia_inseriti = trova_gia_inseriti(registrati + lista, uscite)

    risultato = []
    for c in lista:
        m = c["movimento"]
        voce = {**c, "dataProbabile": data_probabile(m), "descrizioneBreve": descrizione_breve(m["descrizione"])}
        if m["id"] in gia_inseriti:
            voce["giaInserito"] = gia_inseriti[m["id"]]
        altro = conto_nella_causale(m["descrizione"], conti, m["conto"])
        if altro:
            voce["contoNellaCausale"] = altro
        risultato.append(voce)
    return sorted(risultato, key=lambda v: v["movimento"]["data"], reverse=True)


@router.post("/elabora")
def elabora(request: Request, r: RichiestaElabora):
    """
    Classifica i movimenti ancora da gestire. Con `registra` (dopo un pull
    riuscito) prima registra da solo quelli riconosciuti con certezza (preset,
    giri tra conti, PAC). Risponde con la lista "Da confermare", le descrizioni
    di quanto registrato e l'eventuale errore della registrazione.
    """
    def lavoro(sheets: GoogleSheets):
        regole = tutte_le_regole(r.presetUscite, r.presetInvestimenti, r.contiCollegati, r.conti)
        righe = _righe_movimenti(sheets, r.foglio)
        titoli = sheets.titoli_schede(r.foglio)
        dati = _dati_del_foglio(sheets, r.foglio, titoli)

        registrati, errore = [], None
        if r.registra and any(not m["stato"] for m in righe):
            registrati, errore = _registra(sheets, r, righe, regole, dati)
            righe = _righe_movimenti(sheets, r.foglio)
            if registrati:
                dati = _dati_del_foglio(sheets, r.foglio, titoli)
        return {"daConfermare": _da_confermare(righe, regole, dati.get("uscite") or [], r.conti),
                "registrati": registrati, "errore": errore}

    return con_utente(request, "Elaborazione dei movimenti bancari non riuscita", lavoro)
