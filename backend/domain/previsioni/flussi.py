"""
B. Prossimi 12 mesi: quanto entra, quanto esce, quanto avanza.

Parte dai mesi CHIUSI della scheda Risparmio (il mese in corso è a metà e
sembrerebbe un mese con poche spese) e li divide in tre pezzi stimati a parte:

  entrate = stipendio (stipendio.py: periodo attuale + mensilità extra)
          + altre entrate (regali, interessi…: modello mensile)
  spese   = spese normali (modello mensile)
  avanzo  = entrate - spese: la parte che va negli investimenti più quella
            che resta sui conti

Le voci straordinarie (straordinarie.py: l'auto, i regali per l'auto) sono
tolte da tutti i mesi prima di stimare, e restituite in un elenco a parte.

La fascia di entrate e avanzo unisce le incertezze dei pezzi (radice della
somma dei quadrati: i pezzi ballano in modo indipendente).
"""
from datetime import date

import numpy as np

from backend.domain.previsioni.modello_mensile import Z_80, prevedi_serie
from backend.domain.previsioni.serie import chiave_mese, indice_mese, serie_risparmio
from backend.domain.previsioni.stipendio import prevedi_stipendio, serie_stipendio
from backend.domain.previsioni.straordinarie import straordinarie_per_mese

MESI_MINIMI = 6
MESI_PROVA = 12


def mesi_chiusi(risparmio: list[dict], oggi: date) -> list[dict]:
    corrente = indice_mese(oggi.year, oggi.month)
    return [r for r in serie_risparmio(risparmio, oggi) if r["mese"] < corrente]


def _componenti(righe, stipendi, extra_uscite, extra_entrate) -> dict[str, np.ndarray]:
    """Serie mese per mese, senza le voci straordinarie."""
    mesi = [r["mese"] for r in righe]
    entrate = np.array([r["entrate"] - extra_entrate.get(m, 0.0) for r, m in zip(righe, mesi)])
    stipendio = np.array([stipendi.get(m, 0.0) for m in mesi])
    return {
        "entrate": entrate,
        "stipendio": stipendio,
        "altre": entrate - stipendio,
        "spese": np.array([r["spese"] - extra_uscite.get(m, 0.0) for r, m in zip(righe, mesi)]),
    }


def _stima(mesi: list[int], serie: dict[str, np.ndarray], stipendi: dict[int, float], orizzonte: int) -> dict:
    """Previsione dei tre pezzi a partire dai mesi dati."""
    futuri = [mesi[-1] + h for h in range(1, orizzonte + 1)]
    spese = prevedi_serie(serie["spese"], mesi, orizzonte, minimo=0.0)
    stip = prevedi_stipendio(stipendi, mesi[-1], futuri)
    if stip is None:
        # Periodo attuale troppo corto: entrate stimate tutte insieme.
        altre = prevedi_serie(serie["entrate"], mesi, orizzonte, minimo=0.0)
        stip_centrale, stip_pieno, stip_dev = np.zeros(orizzonte), np.zeros(orizzonte), 0.0
    else:
        altre = prevedi_serie(serie["altre"], mesi, orizzonte, minimo=0.0)
        stip_centrale, stip_pieno, stip_dev = stip["centrale"], stip["pieno"], stip["deviazione"]
    return {"futuri": futuri, "spese": spese, "altre": altre, "stipendio": stip,
            "stip_centrale": stip_centrale, "stip_dev": stip_dev,
            "entrate": stip_centrale + np.maximum(altre["centrale"], 0),
            "entrate_piene": stip_pieno + np.maximum(altre["centrale"], 0)}


def _prova(mesi, serie, stipendi) -> dict:
    """Errore medio della stima del mese dopo, rifatta partendo da ognuno degli ultimi mesi."""
    errori = {"entrate": [], "spese": [], "avanzo": []}
    for p in range(max(MESI_MINIMI, len(mesi) - MESI_PROVA), len(mesi)):
        parziale = {k: v[:p] for k, v in serie.items()}
        s = _stima(mesi[:p], parziale, {m: v for m, v in stipendi.items() if m < mesi[p]}, 1)
        entrate, spese = s["entrate"][0], max(s["spese"]["centrale"][0], 0)
        errori["entrate"].append(abs(serie["entrate"][p] - entrate))
        errori["spese"].append(abs(serie["spese"][p] - spese))
        errori["avanzo"].append(abs((serie["entrate"][p] - serie["spese"][p]) - (entrate - spese)))
    return {k: {"erroreMedio": round(float(np.mean(v)), 2) if v else None, "mesiProvati": len(v)} for k, v in errori.items()}


def previsioni_flussi(risparmio: list[dict], oggi: date, uscite: list[dict] | None = None,
                      entrate: list[dict] | None = None, orizzonte: int = 12) -> dict:
    righe = mesi_chiusi(risparmio, oggi)
    if len(righe) < MESI_MINIMI:
        return {"disponibile": False, "motivo": f"Servono almeno {MESI_MINIMI} mesi chiusi nella scheda Risparmio."}

    extra_uscite, extra_entrate, straordinarie = straordinarie_per_mese(uscite or [], entrate or [])
    stipendi = serie_stipendio(entrate or [])
    mesi = [r["mese"] for r in righe]
    serie = _componenti(righe, stipendi, extra_uscite, extra_entrate)
    s = _stima(mesi, serie, stipendi, orizzonte)

    h = np.sqrt(np.arange(1, orizzonte + 1))
    spese_c = np.maximum(s["spese"]["centrale"], 0)
    entrate_c = s["entrate"]
    dev_entrate = float(np.hypot(s["stip_dev"], s["altre"]["deviazione"]))
    dev_spese = float(s["spese"]["deviazione"])
    dev_avanzo = float(np.hypot(dev_entrate, dev_spese))
    avanzo_c = entrate_c - spese_c

    def fascia(centrale, dev, minimo=None, scala=1.0):
        basso = centrale - Z_80 * dev * scala
        return {"centrale": round(float(centrale), 2),
                "basso": round(float(basso if minimo is None else max(basso, minimo)), 2),
                "alto": round(float(centrale + Z_80 * dev * scala), 2)}

    previsti = []
    cumulato = np.cumsum(avanzo_c)
    for i, m in enumerate(s["futuri"]):
        previsti.append({
            "mese": chiave_mese(m),
            "entrate": fascia(entrate_c[i], dev_entrate, 0.0),
            "spese": fascia(spese_c[i], dev_spese, 0.0),
            "avanzo": fascia(avanzo_c[i], dev_avanzo),
            "avanzoCumulato": fascia(cumulato[i], dev_avanzo, scala=h[i]),
        })

    stip = s["stipendio"]
    return {
        "disponibile": True,
        "storico": [{"mese": chiave_mese(m), "entrate": round(float(serie["entrate"][i]), 2),
                     "spese": round(float(serie["spese"][i]), 2),
                     "avanzo": round(float(serie["entrate"][i] - serie["spese"][i]), 2),
                     "straordinarieEntrate": round(extra_entrate.get(m, 0.0), 2),
                     "straordinarieUscite": round(extra_uscite.get(m, 0.0), 2)}
                    for i, m in enumerate(mesi)][-24:],
        "previsti": previsti,
        "stipendio": None if stip is None else {
            "periodo": stip["periodo"], "tipico": round(stip["tipico"], 2), "resaExtra": round(stip["resa"], 3),
            "mensilitaExtra": stip["extra"]},
        "straordinarie": straordinarie,
        "affidabilita": _prova(mesi, serie, stipendi),
        "mesiUsati": len(righe),
        # Per la proiezione del patrimonio; tolto prima di rispondere.
        "_avanzo": {"mesi": s["futuri"], "centrale": avanzo_c, "deviazione": dev_avanzo,
                    "centraleARegime": s["entrate_piene"] - spese_c,
                    "entrateMedie": float(np.mean(entrate_c))},
    }
