"""
B. Prossimi 12 mesi: quanto entra, quanto esce, quanto avanza.

Parte dai mesi CHIUSI della scheda Risparmio (il mese in corso è a metà e
sembrerebbe un mese con poche spese) e li divide in tre pezzi stimati a parte:

  entrate = stipendio (stipendio.py: periodo attuale + mensilità extra)
          + altre entrate (regali, interessi…: modello mensile)
  spese   = spese normali (modello mensile)
          + primarie frequenti (giorni_settimana.py, es. il rifornimento):
            spesa media di ogni lunedì, martedì… degli ultimi 12 mesi per i
            lunedì, martedì… del mese. Un mese con 5 weekend ha un
            rifornimento in più di uno con 4. Provato sui dati veri: errore
            sulle spese del mese dopo -1,5%, sui 3 mesi dopo -1% (le spese
            ballano soprattutto per altro, i weekend spostano 20-30 €).
  avanzo  = entrate - spese: la parte che va negli investimenti più quella
            che resta sui conti

Le voci straordinarie (straordinarie.py: l'auto, i regali per l'auto) sono
tolte da tutti i mesi prima di stimare, e restituite in un elenco a parte.

La fascia di entrate e avanzo unisce le incertezze dei pezzi (radice della
somma dei quadrati: i pezzi ballano in modo indipendente).
"""
from datetime import date

import numpy as np

from backend.domain.previsioni.giorni_settimana import (categorie_frequenti, giorni_della_settimana,
                                                        primarie_variabili, spesa_del_mese, spesa_per_giorno)
from backend.domain.previsioni.modello_mensile import Z_80, prevedi_serie
from backend.domain.previsioni.serie import chiave_mese, indice_mese, serie_risparmio
from backend.domain.previsioni.stipendio import prevedi_stipendio, serie_stipendio
from backend.domain.previsioni.straordinarie import straordinarie_per_mese

MESI_MINIMI = 6
MESI_PROVA = 12


def mesi_chiusi(risparmio: list[dict], oggi: date) -> list[dict]:
    """Le righe di Risparmio pulite, senza il mese in corso.

    Il mese in corso è a metà: sembrerebbe un mese con poche spese e
    falserebbe la media.
    """
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


def _stima(mesi: list[int], serie: dict[str, np.ndarray], stipendi: dict[int, float], orizzonte: int,
           voci: list[dict] | None = None) -> dict:
    """Previsione dei tre pezzi a partire dai mesi dati. `voci`: le primarie
    variabili (giorni_settimana.py), per stimare a parte quelle frequenti."""
    futuri = [mesi[-1] + h for h in range(1, orizzonte + 1)]
    finestra = mesi[-12:]
    categorie = categorie_frequenti(voci or [], finestra)
    passato = np.array([spesa_del_mese(voci or [], m, categorie) for m in mesi])
    per_giorno = np.array(spesa_per_giorno(voci or [], finestra, categorie))
    frequenti = np.array([float(per_giorno @ giorni_della_settimana(m)) for m in futuri])
    spese = prevedi_serie(serie["spese"] - passato, mesi, orizzonte, minimo=0.0)
    spese["centrale"] = spese["centrale"] + frequenti
    stip = prevedi_stipendio(stipendi, mesi[-1], futuri)
    if stip is None:
        # Periodo attuale troppo corto: entrate stimate tutte insieme.
        altre = prevedi_serie(serie["entrate"], mesi, orizzonte, minimo=0.0)
        stip_centrale, stip_pieno, stip_dev = np.zeros(orizzonte), np.zeros(orizzonte), 0.0
    else:
        altre = prevedi_serie(serie["altre"], mesi, orizzonte, minimo=0.0)
        stip_centrale, stip_pieno, stip_dev = stip["centrale"], stip["pieno"], stip["deviazione"]
    return {"futuri": futuri, "spese": spese, "frequenti": frequenti, "categorieFrequenti": sorted(categorie),
            "altre": altre, "stipendio": stip,
            "stip_centrale": stip_centrale, "stip_dev": stip_dev,
            "entrate": stip_centrale + np.maximum(altre["centrale"], 0),
            "entrate_piene": stip_pieno + np.maximum(altre["centrale"], 0)}


def _prova(mesi, serie, stipendi, voci) -> dict:
    """Errore medio della stima del mese dopo, rifatta partendo da ognuno degli ultimi mesi."""
    errori = {"entrate": [], "spese": [], "avanzo": []}
    for p in range(max(MESI_MINIMI, len(mesi) - MESI_PROVA), len(mesi)):
        parziale = {k: v[:p] for k, v in serie.items()}
        s = _stima(mesi[:p], parziale, {m: v for m, v in stipendi.items() if m < mesi[p]}, 1, voci)
        entrate, spese = s["entrate"][0], max(s["spese"]["centrale"][0], 0)
        errori["entrate"].append(abs(serie["entrate"][p] - entrate))
        errori["spese"].append(abs(serie["spese"][p] - spese))
        errori["avanzo"].append(abs((serie["entrate"][p] - serie["spese"][p]) - (entrate - spese)))
    return {k: {"erroreMedio": round(float(np.mean(v)), 2) if v else None, "mesiProvati": len(v)} for k, v in errori.items()}


def previsioni_flussi(risparmio: list[dict], oggi: date, uscite: list[dict] | None = None,
                      entrate: list[dict] | None = None, orizzonte: int = 12,
                      preset_uscite: list[dict] | None = None) -> dict:
    """Entrate, spese e avanzo dei prossimi 12 mesi (scheda "Prossimi 12 mesi").

    Riceve: le righe di Risparmio, la data di oggi, uscite ed entrate (per
    stipendio, voci straordinarie e primarie frequenti) e i preset delle uscite.
    Restituisce un dizionario con:
      previsti         per ogni mese futuro: entrate, spese, avanzo e avanzo
                       accumulato (basso, centrale, alto), più la parte di
                       primarie frequenti e i weekend del mese
      storico          gli ultimi 24 mesi veri, senza le voci straordinarie
      stipendio        lavoro attuale, stipendio tipico, mensilità extra
      straordinarie    le voci tolte dalle stime
      affidabilita     di quanto sbagliava sul mese dopo, provata sul passato
      _avanzo          numeri per la proiezione del patrimonio (tolto prima di
                       rispondere all'app)
    Oppure {"disponibile": False, ...} con meno di 6 mesi chiusi.
    """
    righe = mesi_chiusi(risparmio, oggi)
    if len(righe) < MESI_MINIMI:
        return {"disponibile": False, "motivo": f"Servono almeno {MESI_MINIMI} mesi chiusi nella scheda Risparmio."}

    extra_uscite, extra_entrate, straordinarie = straordinarie_per_mese(uscite or [], entrate or [])
    stipendi = serie_stipendio(entrate or [])
    mesi = [r["mese"] for r in righe]
    serie = _componenti(righe, stipendi, extra_uscite, extra_entrate)
    voci = primarie_variabili(uscite, preset_uscite)
    s = _stima(mesi, serie, stipendi, orizzonte, voci)

    h = np.sqrt(np.arange(1, orizzonte + 1))
    spese_c = np.maximum(s["spese"]["centrale"], 0)
    entrate_c = s["entrate"]
    dev_entrate = float(np.hypot(s["stip_dev"], s["altre"]["deviazione"]))
    dev_spese = float(s["spese"]["deviazione"])
    dev_avanzo = float(np.hypot(dev_entrate, dev_spese))
    avanzo_c = entrate_c - spese_c

    def fascia(centrale, dev, minimo=None, scala=1.0):
        """Una stima pronta per l'app: centrale ± 1,28 deviazioni (8 volte su 10).

        `minimo` taglia il basso (le spese non vanno sotto zero); `scala` allarga
        la fascia per l'avanzo accumulato, che è più incerto più si va avanti.
        Esempio: fascia(800, 100) → {"centrale": 800, "basso": 671.84, "alto": 928.16}.
        """
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
            # di cui primarie frequenti (es. rifornimento), stimate dai giorni della settimana
            "primarieFrequenti": round(float(s["frequenti"][i]), 2),
            "weekend": giorni_della_settimana(m)[5],  # sabati del mese
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
        "affidabilita": _prova(mesi, serie, stipendi, voci),
        "categorieFrequenti": s["categorieFrequenti"],
        "mesiUsati": len(righe),
        # Per la proiezione del patrimonio; tolto prima di rispondere.
        "_avanzo": {"mesi": s["futuri"], "centrale": avanzo_c, "deviazione": dev_avanzo,
                    "centraleARegime": s["entrate_piene"] - spese_c,
                    "entrateMedie": float(np.mean(entrate_c))},
    }
