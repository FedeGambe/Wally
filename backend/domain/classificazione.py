"""
Motore delle regole per i movimenti scaricati dalle banche: decide quali si
possono registrare da soli e quali vanno nella lista "Da confermare", con la
proposta di cosa registrare (preset, trasferimento, entrata, investimento).

Funzioni pure. Un movimento è un dizionario con almeno id, conto, data
(AAAA-MM-GG), importo (negativo = uscita) e descrizione.

Esiti:
  "automatico"          registrabile senza conferma
  "da-confermare"       va nella lista "Da confermare"
  "lato-trasferimento"  entrata già coperta dal trasferimento abbinato: non genera record
"""
import math
from datetime import date, timedelta

from backend.domain.regole_banca import REGOLE_FISSE

# Trade Republic esegue i piani di accumulo il 2 e il 16 del mese (o il primo
# giorno lavorativo dopo, se cadono nel weekend).
FINESTRE_PAC = [[2, 4], [16, 18]]

# Giorni tra il pagamento e la data che la banca manda (booking_date, l'unica
# che Trade Republic fornisce). Misurato sulle uscite Trade Republic inserite a
# mano lug–ott 2026: +1 giorno in 44 casi su 49, mai lo stesso giorno.
RITARDO_CONTABILIZZAZIONE = {"Trade Republic": 1}


def _arrotonda_js(x: float) -> float:
    """Come Math.round: a metà si arrotonda verso l'alto."""
    return math.floor(x + 0.5)


# --- Regole -------------------------------------------------------------------

def regola_vale(regola: dict, m: dict) -> bool:
    if regola.get("conto") and regola["conto"] != m["conto"]:
        return False
    if (regola["verso"] == "uscita") != (m["importo"] < 0):
        return False
    testo = m["descrizione"].upper()
    # Una condizione presente vale anche se è una lista vuota, come nel frontend di prima.
    if regola.get("descrizioneContiene") is not None and not all(p.upper() in testo for p in regola["descrizioneContiene"]):
        return False
    if regola.get("importi") is not None and not any(abs(abs(m["importo"]) - i) < 0.005 for i in regola["importi"]):
        return False
    if regola.get("giorni") is not None:
        try:
            giorno = int(m["data"][8:10])
        except ValueError:
            return False
        if not any(da <= giorno <= a for da, a in regola["giorni"]):
            return False
    return True


def regole_da_preset_uscite(preset: list[dict]) -> list[dict]:
    """
    Una regola per ogni Preset Uscite Ricorrenti: un bonifico in uscita dal conto
    del preset la cui causale contiene il nome del preset ("Rata Bollo" ↔ "... PER
    RATA BOLLO") applica quel preset. Un preset nuovo viene riconosciuto senza
    toccare il codice. L'importo non è vincolato: se la rata cambia, vale quello
    della banca.
    """
    regole = []
    for p in preset:
        nome = str(p.get("nome") or "")
        if not nome.strip():
            continue
        regola = {"nome": f"Preset {nome}", "verso": "uscita",
                  "descrizioneContiene": ["BONIFICO", nome.strip()], "proposta": {"tipo": "preset", "nome": nome}}
        if p.get("conto"):
            regola["conto"] = p["conto"]
        regole.append(regola)
    return regole


def regole_da_preset_investimenti(preset: list[dict], broker_collegati: list[str]) -> list[dict]:
    """
    Piani di accumulo dei Preset Investimenti Ricorrenti sui broker collegati
    come conto (Trade Republic): il broker non manda la causale, quindi si
    riconoscono da importo e giorno. Il broker può eseguire l'importo MENSILE in
    due metà (80 = 40 il 2 + 40 il 16): valgono sia l'importo pieno sia la metà.
    """
    regole = []
    for broker in broker_collegati:
        mensili = [p["importo"] for p in preset if p.get("broker") == broker and (p.get("importo") or 0) > 0]
        importi = list(dict.fromkeys(x for i in mensili for x in (i, _arrotonda_js(i * 50) / 100)))
        if importi:
            regole.append({"nome": f"Piani di accumulo {broker}", "conto": broker, "verso": "uscita",
                           "importi": importi, "giorni": FINESTRE_PAC,
                           "proposta": {"tipo": "investimento", "broker": broker}})
    return regole


def regole_trasferimenti_tra_conti(conti_collegati: list[str], conti: list[str]) -> list[dict]:
    """
    Bonifici la cui causale nomina un altro dei tuoi conti ("Accredito Scalable -
    PAC", "Giroconto Santander"): trasferimenti tra conti tuoi, da confermare con
    il conto nominato già proposto come l'altro lato.
    """
    # Nomi più lunghi prima: "Santander Vincolato" deve vincere su "Santander".
    per_lunghezza = sorted(conti, key=len, reverse=True)
    regole = []
    for collegato in dict.fromkeys(conti_collegati):
        for altro in per_lunghezza:
            if altro == collegato or not altro.strip():
                continue
            for verso in ("uscita", "entrata"):
                ordinante, beneficiario = (collegato, altro) if verso == "uscita" else (altro, collegato)
                regole.append({
                    "nome": f"Trasferimento {'verso' if verso == 'uscita' else 'da'} {altro}",
                    "conto": collegato,
                    "verso": verso,
                    "descrizioneContiene": ["BONIFICO", altro],
                    "proposta": {"tipo": "trasferimento", "contoOrdinante": ordinante, "contoBeneficiario": beneficiario},
                    "conferma": True,
                })
    return regole


def tutte_le_regole(preset_uscite: list[dict], preset_investimenti: list[dict],
                    conti_collegati: list[str], conti: list[str]) -> list[dict]:
    """In ordine: preset e PAC (automatici, i più precisi), regole fisse
    (stipendio, PAC Scalable, bonifici a sé stessi), bonifici che nominano un
    altro conto."""
    return (regole_da_preset_uscite(preset_uscite)
            + regole_da_preset_investimenti(preset_investimenti, conti_collegati)
            + REGOLE_FISSE
            + regole_trasferimenti_tra_conti(conti_collegati, conti))


# --- Classificazione ------------------------------------------------------------

def _giorni_tra(a: str, b: str) -> float:
    try:
        return abs((date.fromisoformat(a) - date.fromisoformat(b)).days)
    except (TypeError, ValueError):
        return math.inf


def classifica(movimenti: list[dict], regole: list[dict], finestra_giorni: int = 3) -> list[dict]:
    """
    Classifica i movimenti di tutti i conti collegati:
     1. regole, nell'ordine dato: la prima che vale decide (automatico, o da
        confermare con una proposta se la regola ha `conferma`);
     2. giri tra conti: un'uscita e un'entrata dello stesso importo su due conti
        diversi entro `finestra_giorni` (un bonifico istantaneo il venerdì sera
        può arrivare il lunedì) diventano un trasferimento automatico;
     3. tutto il resto è da confermare.
    Le regole automatiche vengono prima dei giri perché sono più precise: il PAC
    da 50 € su Trade Republic non deve essere abbinato a un rimborso da 50 € su
    UniCredit. Quelle da confermare no: un "bonifico a te stesso" verso Trade
    Republic, se l'altro lato arriva, è un giro e si registra da solo.
    """
    esiti: dict[str, dict] = {}
    for m in movimenti:
        regola = next((r for r in regole if regola_vale(r, m)), None)
        if regola:
            esiti[m["id"]] = {"movimento": m, "esito": "da-confermare" if regola.get("conferma") else "automatico",
                              "proposta": regola["proposta"], "regola": regola["nome"]}

    def abbinabile(m):
        e = esiti.get(m["id"])
        return not e or (e["esito"] != "automatico" and not e.get("abbinatoA"))

    liberi = [m for m in movimenti if abbinabile(m)]
    entrate_libere = [m for m in liberi if m["importo"] > 0]
    for uscita in (m for m in liberi if m["importo"] < 0):
        candidate = sorted(
            (e for e in entrate_libere
             if abbinabile(e) and e["conto"] != uscita["conto"]
             and abs(e["importo"] + uscita["importo"]) < 0.005
             and _giorni_tra(e["data"], uscita["data"]) <= finestra_giorni),
            key=lambda e: _giorni_tra(e["data"], uscita["data"]),
        )
        if not candidate:
            continue
        entrata = candidate[0]
        proposta = {"tipo": "trasferimento", "contoOrdinante": uscita["conto"], "contoBeneficiario": entrata["conto"]}
        esiti[uscita["id"]] = {"movimento": uscita, "esito": "automatico", "proposta": proposta,
                               "regola": "giro tra conti", "abbinatoA": entrata["id"]}
        esiti[entrata["id"]] = {"movimento": entrata, "esito": "lato-trasferimento", "proposta": proposta,
                                "regola": "giro tra conti", "abbinatoA": uscita["id"]}

    return [esiti.get(m["id"]) or {"movimento": m, "esito": "da-confermare"} for m in movimenti]


# --- Suggerimenti per il modulo di registrazione --------------------------------

def data_probabile(m: dict) -> str:
    """Data probabile del pagamento di una spesa: quella della banca meno il
    ritardo di contabilizzazione del conto. Solo per le uscite."""
    ritardo = RITARDO_CONTABILIZZAZIONE.get(m["conto"], 0) if m["importo"] < 0 else 0
    if not ritardo:
        return m["data"]
    try:
        return (date.fromisoformat(m["data"]) - timedelta(days=ritardo)).isoformat()
    except ValueError:
        return m["data"]


def descrizione_breve(causale: str) -> str:
    """Dalla causale UniCredit ("... A MARIO ROSSI PER Cena da Gino") la parte
    dopo "PER", scritta da chi ha fatto il bonifico. '' se non c'è."""
    i = causale.rfind(" PER ")
    return causale[i + 5:].strip() if i >= 0 else ""


def conto_nella_causale(causale: str, conti: list[str], escludi: str) -> str | None:
    """Il conto di Wally nominato nella causale, se c'è (il più lungo vince):
    l'altro lato di un bonifico a sé stessi, che la banca non indica."""
    testo = causale.upper()
    candidati = sorted((c for c in conti if c.strip() and c != escludi), key=len, reverse=True)
    return next((c for c in candidati if c.upper() in testo), None)
