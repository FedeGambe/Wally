"""
Conversioni dei valori delle celle (testo) in numeri.

Il foglio può avere numeri all'italiana (1.234,56) o all'americana
(1,234.56): un errore qui corrompe in silenzio le cifre, quindi ogni regola
ha un test in tests/test_conversioni.py.

Alcune funzioni imitano di proposito JavaScript (parseFloat, parseInt,
String(numero)), perché il frontend ha sempre letto i dati così e gli id
delle righe devono restare identici.
"""
import re

_FLOAT_INIZIALE = re.compile(r"[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?")
_INTERO_INIZIALE = re.compile(r"[+-]?\d+")


def float_iniziale(testo: str) -> float | None:
    """Come parseFloat: il numero all'inizio del testo ("12.5abc" → 12.5), o None."""
    trovato = _FLOAT_INIZIALE.match(testo.lstrip())
    return float(trovato.group()) if trovato else None


def intero_iniziale(testo: str) -> int | None:
    """Come parseInt(testo, 10): l'intero all'inizio del testo ("25abc" → 25), o None."""
    trovato = _INTERO_INIZIALE.match(str(testo).lstrip())
    return int(trovato.group()) if trovato else None


def e_un_numero(testo: str) -> bool:
    """Come !isNaN(Number(testo)) per i testi che arrivano dal foglio (il testo vuoto vale 0)."""
    testo = testo.strip()
    return testo == "" or bool(_FLOAT_INIZIALE.fullmatch(testo))


def come_testo_js(valore) -> str:
    """Come String(valore) in JavaScript: 23.0 diventa "23", non "23.0"."""
    if isinstance(valore, float) and valore.is_integer():
        return str(int(valore))
    return str(valore)


def numero_localizzato(valore) -> float:
    """
    Numero da una cella, in formato italiano o americano:
      "1.234,56" → 1234.56   "1,234.56" → 1234.56   "123,45" → 123.45
      "1.500" → 1500 (tre cifre dopo un solo punto = migliaia)
      "1,234,567" e "1.234.567" → 1234567    vuoto o non numerico → 0
    """
    if isinstance(valore, bool):
        valore = "true" if valore else "false"
    if isinstance(valore, (int, float)):
        return valore
    if valore is None:
        return 0

    testo = re.sub(r"[^0-9.,-]", "", str(valore).strip())
    if not testo:
        return 0

    virgole, punti = testo.count(","), testo.count(".")
    if virgole and punti:
        if testo.rfind(",") > testo.rfind("."):
            testo = testo.replace(".", "").replace(",", ".")  # 1.234,56
        else:
            testo = testo.replace(",", "")                    # 1,234.56
    elif virgole:
        # Una virgola sola è il decimale italiano (123,45); più virgole sono
        # migliaia all'americana (1,234,567).
        testo = testo.replace(",", ".") if virgole == 1 else testo.replace(",", "")
    elif punti:
        if punti > 1:
            testo = testo.replace(".", "")                    # 1.234.567
        elif len(testo.split(".")[1]) == 3:
            testo = testo.replace(".", "")                    # 1.500

    numero = float_iniziale(testo)
    return 0 if numero is None else numero
