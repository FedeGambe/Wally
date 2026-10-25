"""
Logica pura delle scritture sul foglio: QUALI celle scrivere e con che valore,
dato quello che c'è già. Niente rete: la lettura del foglio e l'invio delle
richieste stanno in routes/scritture.py.

Regola di fondo, la stessa dello script Python originale: si scrivono solo le
celle che servono, cella per cella, mai righe o schede intere, e mai sopra una
formula o un valore già presente quando non è previsto.
"""
import re
from datetime import date, timedelta

from backend.domain.conversioni import come_testo_js, intero_iniziale, numero_localizzato
from backend.models.foglio import SchedaFoglio

MESI_ITALIANI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                 "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]


class ErroreScrittura(Exception):
    """Scrittura rifiutata prima di toccare il foglio (il messaggio va all'utente)."""


# --- Colonne ----------------------------------------------------------------

def lettera_colonna(indice: int) -> str:
    """0 → A, 25 → Z, 26 → AA, 27 → AB… (i tab dei broker arrivano oltre la Z)."""
    n, lettere = indice + 1, ""
    while n > 0:
        n, resto = divmod(n - 1, 26)
        lettere = chr(65 + resto) + lettere
    return lettere


def indice_colonna(lettere: str) -> int:
    """A → 0, Z → 25, AA → 26."""
    indice = 0
    for c in lettere.upper():
        indice = indice * 26 + (ord(c) - 64)
    return indice - 1


def normalizza_intestazione(testo) -> str:
    """Intestazioni confrontate senza spazi, maiuscole e punteggiatura, e con il
    refuso "comulativo" del foglio corretto."""
    return re.sub(r"[^a-z0-9%]", "", str(testo or "").lower()).replace("comulativ", "cumulativ")


# --- Formule ----------------------------------------------------------------

_RIFERIMENTO_CELLA = re.compile(r"(\$?)([A-Z]{1,3})(\$?)(\d+)")


def sposta_formula(formula: str, righe: int) -> str:
    """
    La formula della riga sopra adattata alla riga nuova, come quando in Sheets
    la si trascina in basso: B12 → B13, $B$2 e B$2 restano fermi. Non gestisce
    INDIRECT() o intervalli con nome (la formula esce invariata).
    """
    if not formula or not formula.startswith("="):
        return formula

    def sposta(m: re.Match) -> str:
        ancora_col, colonna, ancora_riga, riga = m.groups()
        if ancora_riga == "$":
            return m.group()
        return f"{ancora_col}{colonna}{ancora_riga}{int(riga) + righe}"

    return _RIFERIMENTO_CELLA.sub(sposta, formula)


# --- Date -------------------------------------------------------------------

def _data_come_js(anno: int, mese: int, giorno: int) -> date:
    """Come new Date(anno, mese - 1, giorno): mesi e giorni fuori misura
    scivolano avanti o indietro (31/02 → 3 marzo) invece di dare errore."""
    anno_esatto, mese_zero = divmod(anno * 12 + mese - 1, 12)
    return date(anno_esatto, mese_zero + 1, 1) + timedelta(days=giorno - 1)


def data_da_testo(valore) -> date | None:
    """Data da "25/12/2026", "2026-12-25", "25/12/26" o numero seriale di Sheets."""
    if not valore:
        return None
    testo = str(valore).strip()
    if not testo:
        return None
    if re.fullmatch(r"\d+(\.\d+)?", testo):
        try:
            return date(1899, 12, 30) + timedelta(days=int(float(testo)))
        except OverflowError:
            return None

    parti = re.split(r"[-/.]", testo)
    if len(parti) == 3:
        numeri = [intero_iniziale(p) for p in parti]
        if None not in numeri:
            p0, p1, p2 = numeri
            try:
                if p0 > 1000:
                    return _data_come_js(p0, p1, p2)               # aaaa/mm/gg
                if p2 > 1000:
                    return _data_come_js(p2, p1, p0)               # gg/mm/aaaa
                return _data_come_js(2000 + p2 if p2 < 50 else 1900 + p2, p1, p0)  # gg/mm/aa
            except (ValueError, OverflowError):
                return None
    return None


def data_italiana(valore):
    """gg/mm/aaaa per le righe nuove (il foglio è in italiano); se non è una data
    il valore resta com'è."""
    d = data_da_testo(valore)
    return f"{d.day:02d}/{d.month:02d}/{d.year}" if d else valore


def data_iso(valore):
    """aaaa-mm-gg: l'unico formato che Sheets legge uguale in ogni lingua."""
    d = data_da_testo(valore)
    return f"{d.year}-{d.month:02d}-{d.day:02d}" if d else valore


def data_del_mese(nome_mese, anno) -> str:
    """("Agosto", 2026) → "01/08/2026": la colonna Mese di Entrate e
    Trasferimenti è una data vera, mostrata come nome del mese."""
    nomi = [m.lower() for m in MESI_ITALIANI]
    nome = str(nome_mese or "").strip().lower()
    if nome not in nomi or not anno:
        return ""
    return f"01/{nomi.index(nome) + 1:02d}/{come_testo_js(anno)}"


# --- Riga nuova -------------------------------------------------------------

def richieste_preparazione_riga(scheda: SchedaFoglio, sheet_id: int, riga: int, righe_griglia: int) -> list[dict]:
    """
    Prima di scrivere: allunga la griglia se la riga non esiste ancora, e dà
    alle celle data il formato gg/mm/aaaa e a quelle mese il formato "mmmm"
    (una riga appena aggiunta non eredita la formattazione delle altre).
    """
    richieste = []
    if riga > righe_griglia:
        richieste.append({"appendDimension": {"sheetId": sheet_id, "dimension": "ROWS", "length": riga - righe_griglia}})
    for campi, formato in ((scheda.date, "dd/mm/yyyy"), (scheda.date_mese, "mmmm")):
        for campo in campi:
            if campo not in scheda.campi:
                continue
            colonna = scheda.campi.index(campo)
            richieste.append({"repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": riga - 1, "endRowIndex": riga,
                          "startColumnIndex": colonna, "endColumnIndex": colonna + 1},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "DATE", "pattern": formato}}},
                "fields": "userEnteredFormat.numberFormat",
            }})
    return richieste


def _valore_cella(scheda: SchedaFoglio, campo: str, record: dict):
    valore = record.get(campo)
    if campo in scheda.date_mese:
        return data_del_mese(valore, record.get("anno"))
    if valore is None:
        return ""
    if isinstance(valore, bool):
        return "Si" if valore else "No"
    if campo in scheda.date:
        return data_italiana(valore)
    return valore


def celle_riga_nuova(scheda: SchedaFoglio, record: dict, riga: int, formule_sopra: list) -> list[dict]:
    """
    Una cella per campo nella riga nuova. Le colonne-formula copiano la formula
    della riga sopra spostata di una riga; se sopra non c'è una formula (prima
    riga dati) la cella resta intatta invece di riceverne un valore a caso.
    """
    celle = []
    for indice, campo in enumerate(scheda.campi):
        intervallo = f"{scheda.titolo}!{lettera_colonna(indice)}{riga}"
        if campo in scheda.formule:
            sopra = formule_sopra[indice] if indice < len(formule_sopra) else None
            if isinstance(sopra, str) and sopra.startswith("="):
                celle.append({"range": intervallo, "values": [[sposta_formula(sopra, 1)]]})
            continue
        celle.append({"range": intervallo, "values": [[_valore_cella(scheda, campo, record)]]})
    return celle


# --- Portafoglio contanti ---------------------------------------------------

PORTAFOGLIO_SCHEDA = "Portafoglio Raw"
PORTAFOGLIO_RIGA = 3
# Riga 3 della scheda: un contatore per taglio di banconota, colonne B:F.
PORTAFOGLIO_COLONNE = {5: "B", 10: "C", 20: "D", 50: "E", 100: "F"}
PORTAFOGLIO_INTERVALLO = f"{PORTAFOGLIO_SCHEDA}!B{PORTAFOGLIO_RIGA}:F{PORTAFOGLIO_RIGA}"


def numero_cella(valore) -> float:
    """Come Number(x) || 0: "3" → 3, "" o testo → 0."""
    if isinstance(valore, (int, float)) and not isinstance(valore, bool):
        return valore
    testo = str(valore if valore is not None else "").strip()
    if re.fullmatch(r"[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?", testo):
        return float(testo)
    return 0


def _intero_se_possibile(n):
    return int(n) if isinstance(n, float) and n.is_integer() else n


def celle_portafoglio(riga_attuale: list, variazioni: dict[int, int]) -> list[dict]:
    """
    Nuovi contatori di banconote: positivi = aggiunte, negativi = tolte. Solo le
    celle dei tagli che cambiano. Se un contatore andrebbe sotto zero non si
    scrive niente: un numero di banconote negativo non ha senso.
    """
    attive = [t for t in PORTAFOGLIO_COLONNE if variazioni.get(t)]
    if not attive:
        return []
    attuali = {t: numero_cella(riga_attuale[i]) if i < len(riga_attuale) else 0
               for i, t in enumerate(PORTAFOGLIO_COLONNE)}
    nuovi = {t: attuali[t] + variazioni[t] for t in attive}

    insufficienti = [t for t in attive if nuovi[t] < 0]
    if insufficienti:
        elenco = ", ".join(f"{t}€ (disponibili {come_testo_js(attuali[t])}, richieste {come_testo_js(-variazioni[t])})"
                           for t in insufficienti)
        raise ErroreScrittura(f"Banconote insufficienti nel Portafoglio Raw: {elenco}.")

    return [{"range": f"{PORTAFOGLIO_SCHEDA}!{PORTAFOGLIO_COLONNE[t]}{PORTAFOGLIO_RIGA}",
             "values": [[_intero_se_possibile(nuovi[t])]]} for t in attive]


# --- Broker: investimenti, strumenti, verifica mensile ----------------------

def valore_accodato(attuale, importo):
    """
    Cella a cui si somma un investimento, come si fa a mano sul foglio:
    "=40*2" → "=40*2+50", 40 → "=40+50", vuota o zero → 50. `attuale` è letto
    come formula (sintassi inglese, punto decimale).
    """
    if isinstance(attuale, str) and attuale.startswith("="):
        return f"{attuale}+{come_testo_js(importo)}"
    numero = 0 if attuale in (None, "") else numero_localizzato(attuale)
    return f"={come_testo_js(numero)}+{come_testo_js(importo)}" if numero != 0 else importo


def intervallo_somma(formula: str) -> tuple[int, int] | None:
    """Colonne sommate da "Importo investito Mensile": "=…SUM(B23:I23)…" → (1, 8)."""
    m = re.search(r"(?:SUM|SOMMA)\(\s*\$?([A-Z]+)\$?\d+\s*:\s*\$?([A-Z]+)\$?\d+\s*\)", formula, re.IGNORECASE)
    return (indice_colonna(m.group(1)), indice_colonna(m.group(2))) if m else None


def riga_del_mese(colonna_a: list[list], mese: str) -> int | None:
    """Numero di riga (da 1) del mese in colonna A ("ottobre 2026")."""
    cercato = mese.strip().lower()
    for i, r in enumerate(colonna_a):
        if str((r[0] if r else "") or "").strip().lower() == cercato:
            return i + 1
    return None


def colonne_degli_strumenti(intestazioni: list, strumenti: list[str], scheda: str) -> list[int]:
    normalizzate = [str(h or "").strip().lower() for h in intestazioni]
    colonne = []
    for strumento in strumenti:
        nome = strumento.strip().lower()
        if nome not in normalizzate:
            raise ErroreScrittura(f'Colonna "{strumento}" non trovata nella riga 1 di "{scheda}".')
        colonne.append(normalizzate.index(nome))
    return colonne


def celle_investimenti(scheda: str, mese: str, riga: int, voci: list[dict], colonne: list[int],
                       formule_riga: list, somma: bool) -> list[dict]:
    """
    Celle mese × strumento. Contributi ricorrenti (somma=False): se una cella
    ha già una formula o un importo non si scrive niente. Investimento extra
    (somma=True): l'importo si accoda a quello presente.
    """
    def attuale(i):
        return formule_riga[colonne[i]] if colonne[i] < len(formule_riga) else None

    if not somma:
        conflitti = []
        for i, v in enumerate(voci):
            a = attuale(i)
            if isinstance(a, str) and a.startswith("="):
                conflitti.append(f"{v['strumento']} (contiene una formula)")
            elif a not in (None, "") and numero_localizzato(a) != 0:
                conflitti.append(f"{v['strumento']} (già {come_testo_js(a)})")
        if conflitti:
            raise ErroreScrittura(
                f'Nessun dato scritto su "{scheda}": celle di {mese} già valorizzate — {", ".join(conflitti)}.')

    return [{"range": f"{scheda}!{lettera_colonna(colonne[i])}{riga}",
             "values": [[valore_accodato(attuale(i), v["importo"]) if somma else v["importo"]]]}
            for i, v in enumerate(voci)]


def controlla_strumento_nuovo(scheda: str, intestazioni: list, nome: str) -> None:
    normalizzate = [str(h or "").strip().lower() for h in intestazioni]
    if nome.strip().lower() in normalizzate:
        raise ErroreScrittura(f'"{nome}" esiste già nel tab "{scheda}": usa l\'investimento extra su quello strumento.')


def colonna_nuovo_strumento(mese: str, formula_importo: str, colonna_importo: int) -> int:
    """
    Dove inserire la colonna di uno strumento nuovo. "Importo investito Mensile"
    somma un INTERVALLO di colonne (es. SUM(B:I)): la colonna va PRIMA
    dell'ultima dell'intervallo, così Sheets allarga la somma da solo e sposta
    tutti i riferimenti. Errore se la formula non è quella attesa.
    """
    intervallo = intervallo_somma(formula_importo)
    if not intervallo:
        raise ErroreScrittura(f'La formula di "Importo investito Mensile" di {mese} non contiene un intervallo '
                              f"da sommare: nessuna colonna aggiunta.")
    inizio, fine = intervallo
    if fine <= inizio or fine >= colonna_importo:
        raise ErroreScrittura(f"Intervallo {lettera_colonna(inizio)}:{lettera_colonna(fine)} di "
                              f'"Importo investito Mensile" inatteso: nessuna colonna aggiunta.')
    return fine


def colonna_importo_mensile(intestazioni: list, scheda: str) -> int:
    normalizzate = [re.sub(r"[^a-z]", "", str(h or "").strip().lower()) for h in intestazioni]
    if "importoinvestitomensile" not in normalizzate:
        raise ErroreScrittura(f'Colonna "Importo investito Mensile" non trovata in "{scheda}": nessuna colonna aggiunta.')
    return normalizzate.index("importoinvestitomensile")


def celle_verifica_mensile(scheda: str, voci: list[dict], intestazioni: list, colonna_a: list[list]) -> list[str]:
    """Cella (intestazione × mese) di ogni voce della verifica mensile."""
    normalizzate = [normalizza_intestazione(h) for h in intestazioni]
    mesi = [str((r[0] if r else "") or "").strip().lower() for r in colonna_a]
    celle = []
    for v in voci:
        cercata = normalizza_intestazione(v["intestazione"])
        if cercata not in normalizzate:
            raise ErroreScrittura(f'Colonna "{v["intestazione"]}" non trovata nella riga 1 di "{scheda}".')
        mese = v["meseLabel"].strip().lower()
        if mese not in mesi:
            raise ErroreScrittura(f'Riga "{v["meseLabel"]}" non trovata nella colonna A di "{scheda}".')
        celle.append(f"{scheda}!{lettera_colonna(normalizzate.index(cercata))}{mesi.index(mese) + 1}")
    return celle


def controlla_celle_vuote(scheda: str, voci: list[dict], attuali: list) -> None:
    conflitti = [f"{v['intestazione']} di {v['meseLabel']} (già {come_testo_js(a)})"
                 for v, a in zip(voci, attuali) if a not in (None, "")]
    if conflitti:
        raise ErroreScrittura(f'Nessun dato scritto su "{scheda}": celle già valorizzate — {", ".join(conflitti)}.')


# --- Dati Base (foglio di configurazione) ------------------------------------

def _valore_per_foglio(scheda: SchedaFoglio, campo: str, oggetto: dict):
    valore = oggetto.get(campo)
    if valore is None:
        return ""
    if isinstance(valore, bool):
        return "Si" if valore else "No"
    if campo in scheda.date:
        return data_iso(valore)
    return valore


def righe_scheda(scheda: SchedaFoglio, oggetti: list[dict]) -> list[list]:
    """Intestazioni + una riga per oggetto, da scrivere a partire da A1."""
    return [list(scheda.intestazioni)] + [[_valore_per_foglio(scheda, c, o) for c in scheda.campi] for o in oggetti]


def oggetti_dati_base(dati: dict) -> dict[str, list[dict]]:
    """I Dati Base dell'app (liste, macro con categorie, soglie 0-100) come righe
    piatte delle schede del foglio di configurazione."""
    categorie_uscite = []
    for m in dati.get("macroCategorieUscite") or []:
        if m.get("categorie"):
            categorie_uscite += [{"macro": m.get("nome"), "icon": m.get("icon"), "categoria": c} for c in m["categorie"]]
        else:
            categorie_uscite.append({"macro": m.get("nome"), "icon": m.get("icon"), "categoria": ""})
    return {
        "contiRows": [{"nome": n} for n in dati.get("conti") or []],
        "categorieEntrateRows": [{"nome": n} for n in dati.get("categorieEntrate") or []],
        "categorieUsciteRows": categorie_uscite,
        # Il foglio vuole le soglie come frazione (35 → 0,35).
        "soglieRows": [{"categoria": s.get("categoria"), "percentuale": float(s.get("percentuale") or 0) / 100}
                       for s in dati.get("soglie") or []],
        "presetUsciteRows": [{k: p.get(k) for k in ("giornoDelMese", "nome", "macroCategoria", "categoria", "conto",
                                                    "importo", "primaria")} for p in dati.get("presetUscite") or []],
        "presetTrasferimentiRows": [{k: p.get(k) for k in ("categoria", "contoOrdinante", "contoBeneficiario", "importo")}
                                    for p in dati.get("presetTrasferimenti") or []],
        "presetFondoPensioneRows": [{"quota": dati["quotaFondoPensione"]}] if "quotaFondoPensione" in dati else [],
    }


def matrice_preset_investimenti(preset: list[dict]) -> list[list]:
    """Riga 1 = "Conto" + strumenti nell'ordine in cui compaiono, una riga per
    broker, cella vuota dove non c'è contributo."""
    strumenti, broker = [], []
    for p in preset:
        if p["strumento"] not in strumenti:
            strumenti.append(p["strumento"])
        if p["broker"] not in broker:
            broker.append(p["broker"])

    def importo(b, s):
        trovato = next((p for p in preset if p["broker"] == b and p["strumento"] == s), None)
        return trovato["importo"] if trovato and trovato.get("importo") is not None else ""

    return [["Conto", *strumenti]] + [[b, *(importo(b, s) for s in strumenti)] for b in broker]
