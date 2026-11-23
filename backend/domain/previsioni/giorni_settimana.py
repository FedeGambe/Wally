"""
Primarie frequenti stimate per giorno della settimana.

Alcune spese primarie si ripetono più volte al mese sempre negli stessi giorni
della settimana: il rifornimento, quasi tutto fra venerdì e domenica. Per
queste conta quanti venerdì, sabati e domeniche ha il periodo da stimare, non
il giorno del mese o la media dei mesi.

 - frequenti: categorie primarie con in media almeno 2 uscite al mese
   (tolte le uscite dei preset ricorrenti e le straordinarie);
 - spesa per giorno: quanto si spende in media in ogni lunedì, martedì…
   = spesa caduta in quel giorno della settimana / quante volte c'era.

Le usano fine_mese.py (giorni che restano nel mese) e flussi.py (giorni di
ogni mese dei prossimi 12).
"""
import calendar
from datetime import date

from backend.domain.previsioni.serie import data_da_testo, indice_mese, numero
from backend.domain.previsioni.straordinarie import uscite_straordinarie

USCITE_AL_MESE_FREQUENTI = 2


def nomi_preset(preset_uscite: list[dict] | None) -> set[str]:
    """Nomi dei preset in minuscolo: sul foglio "Rata assicurazione" è lo stesso preset."""
    return {str(p.get("nome") or "").strip().lower() for p in preset_uscite or []} - {""}


def primarie_variabili(uscite: list[dict] | None, preset_uscite: list[dict] | None) -> list[dict]:
    """Uscite primarie che non sono preset né straordinarie: mese, giorno della settimana, categoria, importo."""
    preset = nomi_preset(preset_uscite)
    straordinarie = uscite_straordinarie(uscite or [])
    voci = []
    for i, t in enumerate(uscite or []):
        d = data_da_testo(t.get("data"))
        if (not d or not t.get("primaria") or i in straordinarie
                or str(t.get("descrizione") or "").strip().lower() in preset):
            continue
        voci.append({"mese": indice_mese(d.year, d.month), "settimana": d.weekday(),
                     "categoria": str(t.get("categoria") or "").strip(), "importo": numero(t.get("importo"))})
    return voci


def giorni_della_settimana(mese: int) -> list[int]:
    """Quanti lunedì, martedì… domenica ha il mese (indice_mese)."""
    anno, m = divmod(mese, 12)
    conta = [0] * 7
    for g in range(1, calendar.monthrange(anno, m + 1)[1] + 1):
        conta[date(anno, m + 1, g).weekday()] += 1
    return conta


def categorie_frequenti(voci: list[dict], mesi: list[int]) -> set[str]:
    if not mesi:
        return set()
    finestra = set(mesi)
    conteggi: dict[str, int] = {}
    for v in voci:
        if v["mese"] in finestra:
            conteggi[v["categoria"]] = conteggi.get(v["categoria"], 0) + 1
    return {c for c, n in conteggi.items() if n / len(mesi) >= USCITE_AL_MESE_FREQUENTI}


def spesa_del_mese(voci: list[dict], mese: int, categorie: set[str]) -> float:
    return sum(v["importo"] for v in voci if v["mese"] == mese and v["categoria"] in categorie)


def spesa_per_giorno(voci: list[dict], mesi: list[int], categorie: set[str]) -> list[float]:
    """Spesa media di ogni giorno della settimana (lunedì = 0) nei mesi dati."""
    finestra = set(mesi)
    spesa, volte = [0.0] * 7, [0] * 7
    for m in mesi:
        for w, n in enumerate(giorni_della_settimana(m)):
            volte[w] += n
    for v in voci:
        if v["mese"] in finestra and v["categoria"] in categorie:
            spesa[v["settimana"]] += v["importo"]
    return [s / n if n else 0.0 for s, n in zip(spesa, volte)]
