"""
Voci straordinarie: spese ed entrate una tantum (acquisto dell'auto, regali
per comprarla) che non devono entrare nelle stime dei mesi "normali".

Regola: una singola voce da SOGLIA_STRAORDINARIA in su, più le altre voci
dello stesso mese con la stessa descrizione (il saldo dell'auto pagato in due
bonifici, 5.000 € e 900 €). Per le entrate lo stipendio non è mai
straordinario: tredicesima e quattordicesima le gestisce stipendio.py.
"""
from collections import defaultdict

from backend.domain.previsioni.serie import chiave_mese, data_da_testo, indice_mese, mese_da_testo, numero
from backend.models.previsioni import CATEGORIA_STIPENDIO, SOGLIA_STRAORDINARIA


def _testo(t: dict, campo: str) -> str:
    return str(t.get(campo) or "").strip().lower()


def uscite_straordinarie(uscite: list[dict]) -> set[int]:
    """Posizioni (nella lista `uscite`) delle uscite straordinarie."""
    per_mese: dict[int, list[int]] = defaultdict(list)
    for i, t in enumerate(uscite or []):
        d = data_da_testo(t.get("data"))
        if d:
            per_mese[indice_mese(d.year, d.month)].append(i)
    scelte = set()
    for posizioni in per_mese.values():
        grandi = {_testo(uscite[i], "descrizione") for i in posizioni if numero(uscite[i].get("importo")) >= SOGLIA_STRAORDINARIA}
        for i in posizioni:
            if numero(uscite[i].get("importo")) >= SOGLIA_STRAORDINARIA or (
                    _testo(uscite[i], "descrizione") in grandi and _testo(uscite[i], "descrizione")):
                scelte.add(i)
    return scelte


def entrate_straordinarie(entrate: list[dict]) -> set[int]:
    return {i for i, e in enumerate(entrate or [])
            if _testo(e, "categoria") != CATEGORIA_STIPENDIO.lower() and numero(e.get("importo")) >= SOGLIA_STRAORDINARIA}


def straordinarie_per_mese(uscite: list[dict], entrate: list[dict]) -> tuple[dict[int, float], dict[int, float], list[dict]]:
    """Totale straordinario per mese (uscite, entrate) e l'elenco da mostrare."""
    per_uscite: dict[int, float] = defaultdict(float)
    per_entrate: dict[int, float] = defaultdict(float)
    elenco = []
    for i in sorted(uscite_straordinarie(uscite)):
        t = uscite[i]
        d = data_da_testo(t.get("data"))
        m = indice_mese(d.year, d.month)
        per_uscite[m] += numero(t.get("importo"))
        elenco.append({"tipo": "uscita", "mese": chiave_mese(m), "data": t.get("data"),
                       "descrizione": str(t.get("descrizione") or t.get("categoria") or "").strip(),
                       "importo": numero(t.get("importo"))})
    for i in sorted(entrate_straordinarie(entrate)):
        e = entrate[i]
        m = mese_da_testo(e.get("mese"), e.get("anno"))
        if m is None:
            continue
        per_entrate[m] += numero(e.get("importo"))
        elenco.append({"tipo": "entrata", "mese": chiave_mese(m), "data": None,
                       "descrizione": " · ".join(x for x in (str(e.get("categoria") or "").strip(),
                                                             str(e.get("dettagli") or "").strip()) if x),
                       "importo": numero(e.get("importo"))})
    elenco.sort(key=lambda v: v["mese"])
    return dict(per_uscite), dict(per_entrate), elenco
