"""
Confronto sul passato fra il modello delle previsioni mensili (B. Prossimi 12
mesi) e alcune alternative, dalle più semplici al machine learning.

    uv run --with-requirements requirements-dev.txt --with scikit-learn --with statsmodels \\
        python -m backend.strumenti.confronto_previsioni dati.json [AAAA-MM-GG]

dati.json sono i dati dell'app (foglio principale + configurazione, le chiavi
di previsioniService.CHIAVI_DATI). Non si salva niente: stampa una tabella.

Come si misura: per ogni mese di partenza degli ultimi 24 mesi chiusi, ogni
modello vede solo i mesi PRIMA e prevede il mese dopo (e la somma dei 3 dopo).
Si confronta con quello che è successo davvero: errore medio in euro (MAE).
Le voci straordinarie sono tolte come nel modello vero. Lo stipendio ha il suo
modello (stipendio.py) uguale per tutti: le alternative cambiano solo la
stima delle spese e delle "altre entrate".
"""
import json
import sys
import warnings
from datetime import date

import numpy as np

from backend.domain.previsioni.flussi import _componenti, _stima, mesi_chiusi
from backend.domain.previsioni.modello_mensile import stima
from backend.domain.previsioni.serie import chiave_mese
from backend.domain.previsioni.stipendio import serie_stipendio
from backend.domain.previsioni.straordinarie import straordinarie_per_mese

PARTENZE = 24
FINESTRA_MODELLI = 24  # ETS/ARIMA sugli ultimi 24 mesi: prima la scala era diversa


# --- Modelli: storia (valori, mesi di calendario) → prossimi h mesi ------------

def attuale(v, mesi, h):
    return stima(v, mesi).prevedi([mesi[-1] + i for i in range(1, h + 1)])


def variante(finestra: int, stagionalita: bool):
    """Il modello attuale con il livello su `finestra` mesi, con o senza stagionalità."""
    def modello(v, mesi, h):
        m = stima(v, mesi)
        stag = m.stagionalita if stagionalita else np.zeros(12)
        recenti = slice(max(0, len(v) - finestra), len(v))
        livello = float(np.mean(v[recenti] - stag[[x % 12 for x in mesi[recenti]]]))
        return np.array([livello + stag[(mesi[-1] + i) % 12] for i in range(1, h + 1)])
    return modello


def ultimo_mese(v, mesi, h):
    return np.repeat(v[-1], h)


def media(k):
    return lambda v, mesi, h: np.repeat(np.mean(v[-k:]), h)


def mediana(k):
    return lambda v, mesi, h: np.repeat(np.median(v[-k:]), h)


def ets(v, mesi, h):
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    y = v[-FINESTRA_MODELLI:]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return ExponentialSmoothing(y, trend="add", damped_trend=True).fit().forecast(h)


def arima(v, mesi, h):
    from statsmodels.tsa.arima.model import ARIMA
    y = v[-FINESTRA_MODELLI:]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return ARIMA(y, order=(1, 0, 0)).fit().forecast(h)


def _caratteristiche(v, mesi, i):
    """Cosa sa il modello del mese i: i mesi prima e il mese di calendario."""
    passato = v[:i]
    return [passato[-1], passato[-2], passato[-3], passato[-3:].mean(), passato[-12:].mean(),
            np.sin(2 * np.pi * (mesi[i] % 12) / 12), np.cos(2 * np.pi * (mesi[i] % 12) / 12)]


def apprendimento(fabbrica):
    """Modello di ML addestrato su tutta la storia disponibile, previsione ricorsiva."""
    def modello(v, mesi, h):
        righe = range(3, len(v))
        if len(righe) < 8:
            return np.repeat(np.mean(v[-3:]), h)
        X = np.array([_caratteristiche(v, mesi, i) for i in righe])
        y = v[3:]
        m = fabbrica().fit(X, y)
        storia, cal, out = list(v), list(mesi), []
        for _ in range(h):
            cal.append(cal[-1] + 1)
            prossimo = float(m.predict([_caratteristiche(np.array(storia + [0.0]), cal, len(storia))])[0])
            out.append(prossimo)
            storia.append(prossimo)
        return np.array(out)
    return modello


def modelli():
    from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
    from sklearn.linear_model import Ridge
    return {
        "attuale (livello 12 mesi + stagionalità)": attuale,
        "attuale, livello 6 mesi": variante(6, True),
        "attuale senza stagionalità": variante(12, False),
        "livello 6 mesi senza stagionalità": variante(6, False),
        "ultimo mese": ultimo_mese,
        "media 3 mesi": media(3),
        "media 6 mesi": media(6),
        "mediana 6 mesi": mediana(6),
        "ETS (Holt smorzato)": ets,
        "ARIMA(1,0,0)": arima,
        "ML: regressione Ridge": apprendimento(lambda: Ridge(alpha=1.0)),
        "ML: random forest": apprendimento(lambda: RandomForestRegressor(n_estimators=200, min_samples_leaf=2, random_state=0)),
        "ML: gradient boosting": apprendimento(lambda: HistGradientBoostingRegressor(max_iter=200, min_samples_leaf=5, random_state=0)),
    }


# --- Prova sul passato --------------------------------------------------------

def confronta(dati: dict, oggi: date) -> dict:
    righe = mesi_chiusi(dati.get("risparmio"), oggi)
    extra_u, extra_e, _ = straordinarie_per_mese(dati.get("uscite") or [], dati.get("entrate") or [])
    stipendi = serie_stipendio(dati.get("entrate") or [])
    mesi = [r["mese"] for r in righe]
    serie = _componenti(righe, stipendi, extra_u, extra_e)
    n = len(mesi)
    partenze = list(range(max(12, n - PARTENZE), n))

    risultati = {}
    for nome, modello in modelli().items():
        err = {"spese": [], "entrate": [], "avanzo": [], "avanzo3": []}
        for p in partenze:
            # Lo stipendio con il suo modello, come nell'app; le "altre entrate" col modello in prova.
            s = _stima(mesi[:p], {k: x[:p] for k, x in serie.items()}, {m: x for m, x in stipendi.items() if m < mesi[p]}, 3)
            con_stipendio = s["stipendio"] is not None
            base_entrate = serie["altre"] if con_stipendio else serie["entrate"]
            h = min(3, n - p)
            spese = np.maximum(modello(serie["spese"][:p], mesi[:p], h), 0)
            entrate = s["stip_centrale"][:h] + np.maximum(modello(base_entrate[:p], mesi[:p], h), 0)
            vere_e, vere_s = serie["entrate"][p:p + h], serie["spese"][p:p + h]
            err["spese"].append(abs(vere_s[0] - spese[0]))
            err["entrate"].append(abs(vere_e[0] - entrate[0]))
            err["avanzo"].append(abs((vere_e[0] - vere_s[0]) - (entrate[0] - spese[0])))
            if h == 3:
                err["avanzo3"].append(abs((vere_e - vere_s).sum() - (entrate - spese).sum()))
        risultati[nome] = err
    return {"partenze": [chiave_mese(mesi[p]) for p in partenze], "risultati": risultati}


def stampa(c: dict) -> None:
    p = c["partenze"]
    print(f"Partenze: {p[0]} … {p[-1]} ({len(p)} mesi). Errore medio in euro, più basso = meglio.\n")
    print(f"{'modello':42} {'spese':>16} {'entrate':>16} {'avanzo':>16} {'avanzo 3 mesi':>16}")
    print(f"{'':42} {'24m / 12m':>16} {'24m / 12m':>16} {'24m / 12m':>16} {'24m / 12m':>16}")
    for nome, e in c["risultati"].items():
        def cella(x):
            return f"{np.mean(x):7.0f} / {np.mean(x[-12:]):6.0f}" if x else "—"
        print(f"{nome:42} {cella(e['spese']):>16} {cella(e['entrate']):>16} {cella(e['avanzo']):>16} {cella(e['avanzo3']):>16}")


if __name__ == "__main__":
    dati = json.load(open(sys.argv[1], encoding="utf-8"))
    oggi = date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else date.today()
    stampa(confronta(dati, oggi))
