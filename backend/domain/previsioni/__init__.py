"""
Previsioni per la pagina "Previsioni" dell'app (solo computer).

  A. fine_mese.py   come chiude il mese in corso
  B. flussi.py      entrate, spese e avanzo dei prossimi 12 mesi
  C. patrimonio.py  da dove viene la crescita del patrimonio e dove può arrivare

Ogni stima ha una fascia (10°-90° percentile) e, dove si può, l'errore medio
misurato provandola sui mesi passati. Lavorano solo sui dati ricevuti
dall'app: niente letture dal foglio.
"""
from datetime import date

from backend.domain.previsioni.fine_mese import previsione_fine_mese
from backend.domain.previsioni.flussi import previsioni_flussi
from backend.domain.previsioni.patrimonio import Ipotesi, previsioni_patrimonio


def calcola_previsioni(dati: dict, oggi: date, ipotesi: dict | None = None) -> dict:
    flussi = previsioni_flussi(dati.get("risparmio"), oggi, dati.get("uscite"), dati.get("entrate"))
    entrate_previste = flussi["previsti"][0]["entrate"]["centrale"] if flussi["disponibile"] else None
    fine_mese = previsione_fine_mese(dati.get("uscite"), dati.get("presetUscite"), dati.get("entrate"),
                                     dati.get("soglie"), oggi, entrate_previste)
    patrimonio = previsioni_patrimonio(dati, oggi, Ipotesi.da_dizionario(ipotesi), flussi)
    flussi.pop("_avanzo", None)
    return {"oggi": oggi.isoformat(), "fineMese": fine_mese, "flussi": flussi, "patrimonio": patrimonio}
