"""
Previsioni per la pagina "Previsioni" dell'app (solo computer).

  A. fine_mese.py   come chiude il mese in corso
  B. flussi.py      entrate, spese e avanzo dei prossimi 12 mesi
  C. patrimonio.py  da dove viene la crescita del patrimonio e dove può arrivare
  D. auto.py        km e costi dell'auto nei prossimi 12 mesi

Ogni stima ha una fascia (10°-90° percentile) e, dove si può, l'errore medio
misurato provandola sui mesi passati. Lavorano solo sui dati ricevuti
dall'app: niente letture dal foglio.
"""
from datetime import date

from backend.domain.previsioni.auto import previsione_auto
from backend.domain.previsioni.fine_mese import previsione_fine_mese
from backend.domain.previsioni.flussi import previsioni_flussi
from backend.domain.previsioni.patrimonio import Ipotesi, previsioni_patrimonio


def calcola_previsioni(dati: dict, oggi: date, ipotesi: dict | None = None) -> dict:
    """Tutte le previsioni della pagina, in una chiamata: la usa la rotta /api/previsioni.

    Riceve: i dati che l'app ha in memoria, la data di oggi e le ipotesi dei cursori.
    Restituisce: {"oggi", "fineMese", "flussi", "patrimonio", "auto"}.
    L'ordine conta: i flussi servono sia alla fine del mese (entrate stimate)
    sia al patrimonio (avanzo dei prossimi 12 mesi).
    """
    flussi = previsioni_flussi(dati.get("risparmio"), oggi, dati.get("uscite"), dati.get("entrate"),
                               preset_uscite=dati.get("presetUscite"))
    entrate_previste = flussi["previsti"][0]["entrate"]["centrale"] if flussi["disponibile"] else None
    fine_mese = previsione_fine_mese(dati.get("uscite"), dati.get("presetUscite"), dati.get("entrate"),
                                     dati.get("soglie"), oggi, entrate_previste)
    patrimonio = previsioni_patrimonio(dati, oggi, Ipotesi.da_dizionario(ipotesi), flussi)
    flussi.pop("_avanzo", None)
    auto = previsione_auto(dati.get("analisiConsumi"), dati.get("presetUscite"), oggi)
    return {"oggi": oggi.isoformat(), "fineMese": fine_mese, "flussi": flussi, "patrimonio": patrimonio, "auto": auto}
