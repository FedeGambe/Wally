"""
Dai movimenti classificati "automatico" (classificazione.py) ai record di
Wally da scrivere, come li scriverebbero i moduli "Aggiungi ..." a mano:
un'uscita da preset con il suo trasferimento collegato, un trasferimento per i
giri tra conti, i Preset Investimenti Ricorrenti del mese per un PAC. Funzioni
pure: l'esecuzione è in routes/banca.py.

Se il record c'è già (inserito a mano, o con "Uscite Ricorrenti") non se ne
crea un secondo: il movimento viene solo segnato come registrato.
"""
import math
from datetime import date

from backend.domain.scrittura import MESI_ITALIANI, numero_cella

# Giorni di scarto tra la data della banca e quella scritta a mano: le spese
# con carta arrivano contabilizzate qualche giorno dopo il pagamento.
SCARTO_GIORNI = 4


def _stesso_importo(a, b) -> bool:
    return abs(float(a or 0) - float(b or 0)) < 0.005


def _mese_anno(data_iso: str) -> tuple[int, str, str]:
    """"2026-10-05" → (2026, "Ottobre", "05/10/2026")."""
    anno, mese, giorno = data_iso.split("-")
    return int(anno), MESI_ITALIANI[int(mese) - 1], f"{giorno}/{mese}/{anno}"


def mese_label_broker(anno: int, mese: str) -> str:
    """Etichetta del mese come in colonna A dei tab broker: "ottobre 2026"."""
    return f"{mese.lower()} {anno}"


def _icona(macro: str, macro_categorie: list[dict]) -> str:
    trovata = next((m for m in macro_categorie if m.get("nome") == macro), None)
    return (trovata or {}).get("icon") or "💸"


def pianifica_registrazioni(classificati: list[dict], preset_uscite: list[dict], preset_trasferimenti: list[dict],
                            uscite: list[dict], trasferimenti: list[dict], macro_categorie: list[dict]) -> list[dict]:
    """
    Operazioni da eseguire, nell'ordine. Ognuna ha `tipo` ("record",
    "investimenti", "gia-presente"), le `righe` di "Movimenti Banca" che chiude e
    una `descrizione` da mostrare. `classificati` porta anche la `riga` di ogni
    movimento.
    """
    operazioni: list[dict] = []
    riga_di = {c["movimento"]["id"]: c["riga"] for c in classificati}
    investimenti: dict[str, dict] = {}

    for c in classificati:
        proposta = c.get("proposta")
        if c["esito"] != "automatico" or not proposta:
            continue
        m = c["movimento"]
        importo = abs(m["importo"])
        anno, mese, data_it = _mese_anno(m["data"])

        if proposta["tipo"] == "preset":
            preset = next((p for p in preset_uscite if p.get("nome") == proposta["nome"]), None)
            if not preset:
                continue
            # Stesso controllo di AggiungiUscitaForm per i "preset mancanti" del mese.
            gia_inserita = any(t.get("mese") == mese and _anno_della_data(t.get("data")) == str(anno)
                               and t.get("descrizione") == preset["nome"] for t in uscite)
            if gia_inserita:
                operazioni.append({"tipo": "gia-presente", "righe": [c["riga"]], "descrizione": f"{preset['nome']} ({mese})"})
                continue
            uscita = {
                "id": f"banca-{m['id']}",
                "data": data_it,
                "mese": mese,
                "descrizione": preset["nome"],
                "macroCategoria": preset.get("macroCategoria"),
                "categoria": preset.get("categoria"),
                "icon": _icona(preset.get("macroCategoria"), macro_categorie),
                "conto": m["conto"],
                "importo": importo,
                "primaria": preset.get("primaria"),
            }
            preset_t = next((pt for pt in preset_trasferimenti if pt.get("categoria") == preset["nome"]), None)
            operazione = {"tipo": "record", "righe": [c["riga"]], "uscita": uscita, "descrizione": preset["nome"]}
            if preset_t:
                operazione["trasferimento"] = {
                    "id": f"banca-{m['id']}-t",
                    "mese": mese,
                    "anno": anno,
                    "categoria": preset_t.get("categoria"),
                    # Ordinante vuoto nel preset = "Qualsiasi": è il conto da cui è partito il bonifico.
                    "contoOrdinante": preset_t.get("contoOrdinante") or m["conto"],
                    "contoBeneficiario": preset_t.get("contoBeneficiario"),
                    "importo": preset_t.get("importo"),
                }
            operazioni.append(operazione)

        elif proposta["tipo"] == "trasferimento":
            ordinante, beneficiario = proposta["contoOrdinante"], proposta["contoBeneficiario"]
            categoria = proposta.get("categoria") or "Trasferimento"
            altra_riga = riga_di.get(c["abbinatoA"]) if c.get("abbinatoA") else None
            righe = [c["riga"], altra_riga] if altra_riga else [c["riga"]]
            descrizione = f"{ordinante} → {beneficiario}"
            gia_presente = any(t.get("mese") == mese and t.get("anno") == anno and t.get("contoOrdinante") == ordinante
                               and t.get("contoBeneficiario") == beneficiario and _stesso_importo(t.get("importo"), importo)
                               for t in trasferimenti)
            if gia_presente:
                operazioni.append({"tipo": "gia-presente", "righe": righe, "descrizione": descrizione})
                continue
            operazioni.append({"tipo": "record", "righe": righe, "descrizione": descrizione, "trasferimento": {
                "id": f"banca-{m['id']}", "mese": mese, "anno": anno, "categoria": categoria,
                "contoOrdinante": ordinante, "contoBeneficiario": beneficiario, "importo": importo}})

        elif proposta["tipo"] == "investimento":
            # Un'operazione per broker e mese: scrive tutti i Preset Investimenti
            # Ricorrenti ancora mancanti, come il modulo "Investimenti Ricorrenti".
            mese_label = mese_label_broker(anno, mese)
            chiave = f"{proposta['broker']}|{mese_label}"
            if chiave in investimenti:
                investimenti[chiave]["righe"].append(c["riga"])
            else:
                investimenti[chiave] = {"tipo": "investimenti", "righe": [c["riga"]], "broker": proposta["broker"],
                                        "meseLabel": mese_label,
                                        "descrizione": f"Investimenti {proposta['broker']} ({mese_label})"}
                operazioni.append(investimenti[chiave])
    return operazioni


def _anno_della_data(data_it) -> str | None:
    parti = str(data_it or "").split("/")
    return parti[2] if len(parti) > 2 else None


def _giorno_da_data_it(data_it) -> float:
    """"10/10/2026" → numero del giorno (per contare la distanza), NaN se non è una data."""
    parti = str(data_it or "").split("/")
    numeri = [numero_cella(p) for p in parti[:3]] + [0] * (3 - len(parti[:3]))
    g, m, a = numeri
    if not (g and m and a):
        return math.nan
    try:
        anno, mese_zero = divmod(int(a) * 12 + int(m) - 1, 12)
        return (date(anno, mese_zero + 1, 1) - date(1970, 1, 1)).days + int(g) - 1
    except (ValueError, OverflowError):
        return math.nan


def _giorno_da_iso(data_iso: str) -> float:
    try:
        return (date.fromisoformat(data_iso) - date(1970, 1, 1)).days
    except (TypeError, ValueError):
        return math.nan


def trova_gia_inseriti(classificati: list[dict], uscite: list[dict]) -> dict[str, str]:
    """
    Per le uscite da confermare, la spesa inserita a mano che sembra già
    corrispondere: stesso conto, stesso importo e data entro SCARTO_GIORNI. Ogni
    spesa vale per un solo movimento. È solo un suggerimento: lo conferma
    l'utente. Le entrate restano fuori.
    """
    trovati: dict[str, str] = {}
    usati: set = set()
    for c in classificati:
        if c["esito"] != "da-confermare":
            continue
        m = c["movimento"]
        if m["importo"] >= 0:
            continue
        importo = abs(m["importo"])
        giorno = _giorno_da_iso(m["data"])
        candidati = sorted(
            (t for t in uscite if t.get("id") not in usati and t.get("conto") == m["conto"]
             and _stesso_importo(t.get("importo"), importo) and abs(_giorno_da_data_it(t.get("data")) - giorno) <= SCARTO_GIORNI),
            key=lambda t: abs(_giorno_da_data_it(t.get("data")) - giorno),
        )
        if candidati:
            scelta = candidati[0]
            usati.add(scelta.get("id"))
            trovati[m["id"]] = f"{scelta.get('descrizione')} del {str(scelta.get('data'))[:5]}"
    return trovati
