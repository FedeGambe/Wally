"""
Movimenti scaricati dalle banche (Enable Banking, PSD2) resi uniformi.
La classificazione (preset, giri tra conti…) è in classificazione.py, la
registrazione automatica in registrazione.py.

Cosa arriva davvero dalle banche (verificato sui dati reali, ott 2026):
 - UniCredit: data, importo, segno, causale completa in remittance_information
   ed entry_reference univoco.
 - Trade Republic: SOLO data, importo e segno (importo già negativo sulle
   uscite). Niente causale, esercente né id: l'id va costruito.
"""
import math
import re
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal


@dataclass
class MovimentoBanca:
    id: str
    conto: str        # nome del conto in Wally (es. 'Unicredit')
    data: str         # YYYY-MM-DD (data di contabilizzazione)
    importo: float    # con segno: negativo = uscita
    descrizione: str  # causale ripulita, '' se la banca non la fornisce


def pulisci_causale(testo: str) -> str:
    """La causale UniCredit finisce con un blocco fisso di commissioni e codici
    ("COMM 0,00 SPESE 0,00 COMM SERV 0,00 TRN ..."): non serve e allunga tutto."""
    testo = re.sub(r"\s+", " ", testo)
    return re.sub(r"\s(COMM|TRN)\s.*$", "", testo, count=1).strip()


def _numero(valore) -> float:
    try:
        n = float(valore)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if math.isnan(n) else n


def _due_decimali(importo: float) -> str:
    """Come toFixed(2) di JavaScript (a metà si arrotonda lontano da zero): gli
    id già scritti nel foglio sono nati così e devono restare identici."""
    return str(Decimal(importo).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _primo(*valori):
    return next((v for v in valori if v is not None), None)


def normalizza_movimenti(grezzi: list[dict], conto: str) -> list[MovimentoBanca]:
    """
    Converte i movimenti grezzi di un conto (risposta di
    GET /accounts/{uid}/transactions) in MovimentoBanca.

    Se la banca non dà un id (Trade Republic) l'id è conto|data|importo|n, con n
    che conta i movimenti identici dello stesso giorno: due caffè da 1,20 € lo
    stesso giorno restano due movimenti distinti, e lo stesso movimento
    riscaricato domani riottiene lo stesso id (niente doppioni).
    """
    visti: dict[str, int] = {}
    risultato = []
    for t in grezzi:
        valore = _numero((t.get("transaction_amount") or {}).get("amount"))
        # Esclusi i movimenti in attesa (cambiano o spariscono) e quelli a zero
        # (es. "COMPETENZE (INTERESSI/ONERI)" trimestrali di UniCredit a 0,00 €).
        if t.get("status") == "PDNG" or not valore:
            continue

        importo = -abs(valore) if t.get("credit_debit_indicator") == "DBIT" else abs(valore)
        data = _primo(t.get("booking_date"), t.get("value_date"), t.get("transaction_date"))
        id_banca = t.get("entry_reference") or t.get("transaction_id")
        if id_banca:
            id_movimento = f"{conto}|{id_banca}"
        else:
            chiave = f"{conto}|{data}|{_due_decimali(importo)}"
            n = visti.get(chiave, 0)
            visti[chiave] = n + 1
            id_movimento = f"{chiave}|{n}"

        controparte = (t.get("creditor") if importo < 0 else t.get("debtor")) or {}
        parti = [*(t.get("remittance_information") or []), controparte.get("name") or ""]
        descrizione = pulisci_causale(" ".join(p or "" for p in parti))
        risultato.append(MovimentoBanca(id_movimento, conto, data, importo, descrizione))
    return risultato
