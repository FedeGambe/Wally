"""
Previsione di una serie mensile (entrate, spese, avanzo…) per i prossimi mesi.

Il modello è volutamente semplice, perché i dati sono pochi (qualche anno di
mesi) e un modello complicato imparerebbe il rumore:

  previsione = livello + stagionalità del mese di calendario

 - livello: media degli ultimi 12 mesi, tolta la stagionalità;
 - stagionalità: di quanto quel mese (es. dicembre, con la tredicesima) sta di
   solito sopra o sotto la media dei 12 mesi intorno. Serve almeno un anno e
   mezzo di storia; con pochi anni l'effetto viene ridotto (verso zero) perché
   una sola osservazione per mese non basta a fidarsi.

La fascia (bassa/alta) viene da quanto i 12 mesi più recenti si sono
discostati dal modello (deviazione standard degli scarti): è l'incertezza
della situazione di oggi. È ±1,28 deviazioni, cioè 8 volte su 10 se i mesi
futuri ballano come quelli dell'ultimo anno. Non si usano gli scarti degli
anni prima perché da ottobre 2025 entrate e spese sono più che raddoppiate:
erano su un'altra scala. Per il totale di più mesi la fascia cresce con la
radice del numero di mesi (i mesi buoni e cattivi in parte si compensano).

A parte, la "prova sul passato": il modello viene rifatto partendo da ognuno
degli ultimi 12 mesi chiusi e confrontato con il mese dopo. Dice quanto
avrebbe sbagliato davvero, compresi i mesi del cambio di situazione.
"""
from dataclasses import dataclass

import numpy as np

MESI_STAGIONALITA = 18   # sotto questa storia niente stagionalità
MESI_PROVA = 12          # quante partenze nella prova sul passato
Z_80 = 1.2816            # ±1,28 deviazioni = 80% dei casi (10°-90° percentile)


@dataclass
class Modello:
    livello: float
    stagionalita: np.ndarray  # 12 valori, indice = mese di calendario - 1

    def prevedi(self, mesi: list[int]) -> np.ndarray:
        return np.array([self.livello + self.stagionalita[m % 12] for m in mesi])


def stima(valori: np.ndarray, mesi: list[int]) -> Modello:
    """Livello e stagionalità da una serie di mesi consecutivi."""
    n = len(valori)
    stagionalita = np.zeros(12)
    if n >= MESI_STAGIONALITA:
        scarti: list[list[float]] = [[] for _ in range(12)]
        for i in range(n):
            finestra = valori[max(0, i - 6): i + 7]
            if len(finestra) >= 12:
                scarti[mesi[i] % 12].append(valori[i] - finestra.mean())
        for c in range(12):
            if scarti[c]:
                k = len(scarti[c])
                stagionalita[c] = np.mean(scarti[c]) * k / (k + 1)
        stagionalita -= stagionalita.mean()
    recenti = slice(max(0, n - 12), n)
    livello = float(np.mean(valori[recenti] - stagionalita[[m % 12 for m in mesi[recenti]]]))
    return Modello(livello, stagionalita)


def prova_sul_passato(valori: np.ndarray, mesi: list[int]) -> tuple[float | None, int]:
    """Errore medio (in euro) della previsione del mese dopo, sulle ultime partenze."""
    errori = [abs(valori[p] - stima(valori[:p], mesi[:p]).prevedi([mesi[p]])[0])
              for p in range(max(6, len(valori) - MESI_PROVA), len(valori))]
    return (float(np.mean(errori)), len(errori)) if errori else (None, 0)


def prevedi_serie(valori: list[float], mesi: list[int], orizzonte: int = 12, minimo: float | None = None) -> dict:
    """
    Previsione dei prossimi `orizzonte` mesi dopo l'ultimo di `mesi`, con fascia
    per ogni mese e per il totale progressivo, più l'errore della prova.
    `minimo` (es. 0 per entrate e spese, che non possono essere negative)
    taglia la fascia bassa.
    """
    v = np.asarray(valori, dtype=float)
    modello = stima(v, mesi)
    futuri = [mesi[-1] + h for h in range(1, orizzonte + 1)]
    centrale = modello.prevedi(futuri)

    recenti = slice(max(0, len(v) - 12), len(v))
    scarti = v[recenti] - modello.prevedi(mesi[recenti])
    deviazione = float(np.std(scarti, ddof=1)) if len(scarti) > 1 else 0.0
    mezza_fascia = Z_80 * deviazione
    mezza_fascia_cum = mezza_fascia * np.sqrt(np.arange(1, orizzonte + 1))

    errore_medio, prove = prova_sul_passato(v, mesi)
    basso, basso_cum = centrale - mezza_fascia, np.cumsum(centrale) - mezza_fascia_cum
    if minimo is not None:
        basso, basso_cum = np.maximum(basso, minimo), np.maximum(basso_cum, minimo)
    return {
        "mesi": futuri,
        "centrale": centrale,
        "basso": basso,
        "alto": centrale + mezza_fascia,
        "cumulato": np.cumsum(centrale),
        "cumulatoBasso": basso_cum,
        "cumulatoAlto": np.cumsum(centrale) + mezza_fascia_cum,
        "erroreMedio": errore_medio,
        "mesiProvati": prove,
        "deviazione": deviazione,  # la usa la proiezione del patrimonio come "rumore" mensile
    }
