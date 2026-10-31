"""
C. Crescita del patrimonio e del risparmio.

Tre parti:

1. STORICO: ogni mese l'aumento del patrimonio viene diviso in
     risparmio rimasto sui conti + versamenti negli investimenti
     + rendimento di mercato + versamenti nel fondo pensione.
   Sono le cifre del foglio (Risparmio, Rendimenti, Fondo Pensione), solo
   sommate mese dopo mese: niente stime.

2. OGGI: patrimonio totale (somma dei conti della scheda Patrimonio, come la
   pagina Patrimonio), diviso in liquidità, investimenti e fondo pensione, più
   due indicatori di solidità (mesi di autonomia, anni di spese).

3. PROIEZIONE: migliaia di futuri possibili (Monte Carlo). Ogni mese:
     liquidità    += avanzo del mese - versamenti PAC (+ risparmio extra)
     investimenti  = investimenti * (1 + rendimento casuale) + PAC
     fondo         = fondo * (1 + rendimento casuale) + versamento fondo
   L'avanzo dei primi 12 mesi viene dalla previsione B; dopo si ripete lo
   stesso anno, cresciuto con l'aumento delle entrate scelto. I rendimenti
   sono ipotesi prudenti di lungo periodo, modificabili dall'app: 3 anni di
   storia sono troppo pochi per stimarli dai dati.
   Il seme casuale è fisso: con gli stessi dati esce sempre lo stesso numero.
   Di default il fondo pensione (TFR) resta FUORI dalla proiezione: sono soldi
   che non si possono usare fino alla pensione. L'app lo può includere.
"""
from dataclasses import dataclass, field
from datetime import date

import numpy as np

from backend.domain.previsioni.serie import (
    chiave_mese,
    indice_mese,
    numero,
    serie_fondo_pensione,
    serie_rendimenti,
    serie_risparmio,
)

SCENARI = 2000
SEME = 42
ANNI_MASSIMI = 40


@dataclass
class Rendimento:
    medio: float       # % annuo
    volatilita: float  # % annua (deviazione standard)


@dataclass
class Ipotesi:
    anni: int = 20
    risparmio_extra: float = 0.0      # € al mese in più che restano sui conti
    pac_extra: float = 0.0            # € al mese in più negli investimenti
    crescita_entrate: float = 0.0     # % all'anno di aumento delle entrate
    inflazione: float = 0.0           # % all'anno; > 0 = cifre in euro di oggi
    includi_fondo: bool = False       # fondo pensione (TFR) dentro la proiezione
    obiettivo: float | None = None    # € da raggiungere
    rendimenti: dict[str, Rendimento] = field(default_factory=lambda: {
        "azioni": Rendimento(6.5, 15.0),
        "obbligazioni": Rendimento(2.5, 5.0),
        "monetari": Rendimento(2.0, 0.5),
        "fondoPensione": Rendimento(3.5, 6.0),
    })

    @classmethod
    def da_dizionario(cls, d: dict | None) -> "Ipotesi":
        d = d or {}
        ipotesi = cls()
        ipotesi.anni = int(min(ANNI_MASSIMI, max(1, numero(d.get("anni")) or ipotesi.anni)))
        ipotesi.risparmio_extra = numero(d.get("risparmioExtra"))
        ipotesi.pac_extra = numero(d.get("pacExtra"))
        ipotesi.crescita_entrate = numero(d.get("crescitaEntrate"))
        ipotesi.inflazione = numero(d.get("inflazione"))
        ipotesi.obiettivo = numero(d.get("obiettivo")) or None
        ipotesi.includi_fondo = d.get("includiFondoPensione") is True
        for nome, r in (d.get("rendimenti") or {}).items():
            if nome in ipotesi.rendimenti and isinstance(r, dict):
                base = ipotesi.rendimenti[nome]
                ipotesi.rendimenti[nome] = Rendimento(
                    numero(r.get("medio")) if r.get("medio") is not None else base.medio,
                    numero(r.get("volatilita")) if r.get("volatilita") is not None else base.volatilita)
        return ipotesi

    def come_dizionario(self) -> dict:
        return {"anni": self.anni, "risparmioExtra": self.risparmio_extra, "pacExtra": self.pac_extra,
                "crescitaEntrate": self.crescita_entrate, "inflazione": self.inflazione, "obiettivo": self.obiettivo,
                "includiFondoPensione": self.includi_fondo,
                "rendimenti": {k: {"medio": r.medio, "volatilita": r.volatilita} for k, r in self.rendimenti.items()}}


def _e_fondo(nome: str) -> bool:
    # "Fondo Unicredit" è il fondo pensione (valore di mercato).
    return "fondo" in nome.lower()


# --- 1. Storico ----------------------------------------------------------------

def storico(risparmio: list[dict], rendimenti: list[dict], fondo_pensione: list[dict], oggi: date) -> dict:
    righe = serie_risparmio(risparmio, oggi)
    rend = serie_rendimenti(rendimenti, oggi)
    fondo = serie_fondo_pensione(fondo_pensione, oggi)
    corrente = indice_mese(oggi.year, oggi.month)

    mesi, cumulato = [], {"risparmio": 0.0, "versamenti": 0.0, "mercato": 0.0, "fondoPensione": 0.0}
    for r in righe:
        m = r["mese"]
        voce = {"risparmio": r["risparmio"], "versamenti": r["investito"],
                "mercato": rend.get(m, {}).get("rendimento", 0.0), "fondoPensione": fondo.get(m, 0.0)}
        for k, v in voce.items():
            cumulato[k] += v
        tasso = (r["entrate"] - r["spese"]) / r["entrate"] if r["entrate"] else None
        mesi.append({"mese": chiave_mese(m), "inCorso": m == corrente,
                     **{k: round(v, 2) for k, v in voce.items()},
                     "cumulato": {k: round(v, 2) for k, v in cumulato.items()},
                     "tassoRisparmio": None if tasso is None else round(tasso, 4)})

    # Tasso di risparmio sugli ultimi 12 mesi chiusi, mese per mese.
    chiusi = [r for r in righe if r["mese"] < corrente]
    for i, voce in enumerate(mesi):
        finestra = [r for r in chiusi if righe[i]["mese"] - 12 < r["mese"] <= righe[i]["mese"]]
        entrate = sum(r["entrate"] for r in finestra)
        voce["tassoRisparmio12"] = (round(sum(r["entrate"] - r["spese"] for r in finestra) / entrate, 4)
                                    if len(finestra) >= 6 and entrate else None)

    ultimi = [v for v in mesi if not v["inCorso"]][-12:]
    somma = {k: sum(v[k] for v in ultimi) for k in ("risparmio", "versamenti", "mercato", "fondoPensione")}
    crescita = sum(somma.values())
    return {"mesi": mesi, "ultimi12": {**{k: round(v, 2) for k, v in somma.items()}, "totale": round(crescita, 2)}}


# --- 2. Oggi ---------------------------------------------------------------------

def situazione(patrimonio: list[dict], capitale_impegnato: list[dict], spese_medie: float) -> dict:
    totale = investimenti = fondo = 0.0
    for c in patrimonio or []:
        nome = str(c.get("categoria") or "")
        valore = numero(c.get("capitaleTotale"))
        totale += valore
        if _e_fondo(nome):
            fondo += valore
        else:
            investimenti += numero(c.get("capitaleInvestito"))
    liquidita = totale - investimenti - fondo
    impegnato = sum(numero(c.get("capitaleImpegnato")) for c in capitale_impegnato or [])
    libera = max(0.0, liquidita - impegnato)
    return {
        "totale": round(totale, 2), "liquidita": round(liquidita, 2), "investimenti": round(investimenti, 2),
        "fondoPensione": round(fondo, 2), "impegnato": round(impegnato, 2), "liquiditaLibera": round(libera, 2),
        "speseMedieMensili": round(spese_medie, 2),
        "mesiAutonomia": round(libera / spese_medie, 1) if spese_medie > 0 else None,
        "anniDiSpese": round(totale / (spese_medie * 12), 1) if spese_medie > 0 else None,
    }


def allocazione(cruscotto: list[dict], oggi: date) -> dict[str, float]:
    """Pesi azioni/obbligazioni/monetari dall'ultimo anno del Cruscotto."""
    righe = [r for r in cruscotto or [] if 0 < numero(r.get("anno")) <= oggi.year]
    if righe:
        ultima = max(righe, key=lambda r: numero(r.get("anno")))
        pesi = {k: max(0.0, numero(ultima.get(f"{k}InvestitoCum"))) for k in ("azioni", "obbligazioni", "monetari")}
        somma = sum(pesi.values())
        if somma > 0:
            return {k: v / somma for k, v in pesi.items()}
    return {"azioni": 0.8, "obbligazioni": 0.2, "monetari": 0.0}


# --- 3. Proiezione ---------------------------------------------------------------

def _rendimenti_mensili(r: Rendimento, rng, forma) -> np.ndarray:
    """Rendimenti mensili casuali (log-normali) con media e volatilità annue date."""
    mu, sigma = np.log1p(r.medio / 100), r.volatilita / 100
    mensile_mu = mu / 12 - sigma ** 2 / 24
    return np.expm1(rng.normal(mensile_mu, sigma / np.sqrt(12), forma))


def proiezione(oggi_patrimonio: dict, pesi: dict[str, float], pac_mensile: float, fondo_mensile: float,
               previsione_avanzo: dict | None, entrate_medie: float, avanzo_medio: float,
               ipotesi: Ipotesi, primo_mese: int) -> dict:
    mesi = ipotesi.anni * 12
    rng = np.random.default_rng(SEME)
    fondo_oggi = oggi_patrimonio["fondoPensione"] if ipotesi.includi_fondo else 0.0
    versamento_fondo = fondo_mensile if ipotesi.includi_fondo else 0.0
    partenza = oggi_patrimonio["totale"] - oggi_patrimonio["fondoPensione"] + fondo_oggi
    forma = (SCENARI, mesi)

    # Avanzo atteso dei prossimi 12 mesi (con la stagionalità), poi ripetuto.
    t = np.arange(mesi)
    if previsione_avanzo is not None:
        # 12 mesi consecutivi a partire da previsione_avanzo["mesi"][0]. Nei
        # mesi coperti si usa la previsione; dopo, lo stesso mese di calendario
        # "a regime" (tredicesima e quattordicesima intere).
        centrale = np.asarray(previsione_avanzo["centrale"], dtype=float)[:12]
        a_regime = np.asarray(previsione_avanzo.get("centraleARegime", centrale), dtype=float)[:12]
        posizione = primo_mese + t - previsione_avanzo["mesi"][0]
        anno_tipo = np.where(posizione < len(centrale), centrale[np.minimum(posizione, len(centrale) - 1)],
                             a_regime[posizione % 12])
        deviazione = previsione_avanzo["deviazione"]
    else:
        anno_tipo, deviazione = np.full(mesi, avanzo_medio), abs(avanzo_medio) * 0.3
    crescita = (1 + ipotesi.crescita_entrate / 100) ** (t / 12) - 1
    avanzo = anno_tipo + entrate_medie * crescita + ipotesi.risparmio_extra
    avanzo = avanzo[None, :] + rng.normal(0, deviazione, forma)

    pac = pac_mensile + ipotesi.pac_extra
    rend_inv = sum(pesi[k] * _rendimenti_mensili(ipotesi.rendimenti[k], rng, forma) for k in pesi if pesi[k] > 0)
    rend_fondo = _rendimenti_mensili(ipotesi.rendimenti["fondoPensione"], rng, forma)

    liquidita = np.full(SCENARI, oggi_patrimonio["liquidita"])
    investimenti = np.full(SCENARI, oggi_patrimonio["investimenti"])
    fondo = np.full(SCENARI, fondo_oggi)
    totali = np.empty(forma)
    pac_ridotto = np.full(SCENARI, -1)  # primo mese in cui il PAC non è coperto
    mesi_punti = list(range(2, mesi, 3)) + ([mesi - 1] if (mesi - 1) % 3 != 2 else [])
    medie_parti: dict[int, tuple[float, float, float]] = {}  # mese → media di liquidità, investimenti, fondo
    for m in range(mesi):
        # Il PAC parte dai conti: se non bastano, si versa solo quello che c'è.
        disponibile = liquidita + avanzo[:, m]
        versato_ora = np.clip(disponibile, 0, pac)
        pac_ridotto[(versato_ora < pac - 0.01) & (pac_ridotto < 0)] = m
        liquidita = disponibile - versato_ora
        investimenti = investimenti * (1 + rend_inv[:, m]) + versato_ora
        # Conti in rosso: si coprono vendendo investimenti.
        scoperto = np.minimum(liquidita, 0)
        investimenti, liquidita = investimenti + scoperto, liquidita - scoperto
        fondo = fondo * (1 + rend_fondo[:, m]) + versamento_fondo
        totali[:, m] = liquidita + investimenti + fondo
        if m in mesi_punti:
            medie_parti[m] = (float(liquidita.mean()), float(investimenti.mean()), float(fondo.mean()))
    versato_mensile = float(np.mean(avanzo)) + versamento_fondo  # quanto metti tu, in media
    deflatore = (1 + ipotesi.inflazione / 100) ** ((t + 1) / 12)
    totali_reali = totali / deflatore[None, :]

    punti = []
    for m in mesi_punti:
        p10, p25, p50, p75, p90 = np.percentile(totali_reali[:, m], [10, 25, 50, 75, 90])
        versato = partenza + versato_mensile * (m + 1)
        punti.append({"mese": chiave_mese(primo_mese + m),
                      **{k: round(float(v), 2) for k, v in zip(("p10", "p25", "p50", "p75", "p90"), (p10, p25, p50, p75, p90))},
                      "soloVersamenti": round(float(versato / deflatore[m]), 2),
                      "ripartizione": _ripartizione(medie_parti[m], float(p50))})

    ridotti = pac_ridotto >= 0
    risultato = {"punti": punti, "scenari": SCENARI, "pacMensile": round(pac, 2),
                 "ripartizioneOggi": _ripartizione(
                     (oggi_patrimonio["liquidita"], oggi_patrimonio["investimenti"], fondo_oggi), partenza),
                 "partenza": round(partenza, 2), "fondoIncluso": ipotesi.includi_fondo,
                 "pacNonCoperto": {
                     "probabilita": round(float(ridotti.mean()), 3),
                     "meseProbabile": chiave_mese(primo_mese + int(np.median(pac_ridotto[ridotti])))
                     if ridotti.mean() >= 0.5 else None},
                 "fondoMensile": round(fondo_mensile, 2), "avanzoMedioMensile": round(float(np.mean(avanzo)), 2)}

    if ipotesi.obiettivo:
        raggiunto = totali_reali >= ipotesi.obiettivo
        # Raggiunto entro il mese m in uno scenario = almeno una volta fino a m.
        entro = np.maximum.accumulate(raggiunto, axis=1).mean(axis=0)
        per_anno = [{"anno": anno_e_mese_fine(primo_mese, a), "probabilita": round(float(entro[a * 12 - 1]), 3)}
                    for a in range(1, ipotesi.anni + 1)]
        mediana = next((m for m in range(mesi) if entro[m] >= 0.5), None)
        risultato["obiettivo"] = {
            "importo": ipotesi.obiettivo, "perAnno": per_anno,
            "meseProbabile": None if mediana is None else chiave_mese(primo_mese + mediana),
            "giaRaggiunto": partenza >= ipotesi.obiettivo,
        }
    return risultato


def _ripartizione(medie: tuple[float, float, float], totale: float) -> dict:
    """
    Come si divide `totale` tra liquidità, investimenti e fondo pensione. Le
    quote sono quelle delle medie dei futuri simulati, applicate al valore più
    probabile: così le tre parti sommano esattamente la cifra mostrata.
    """
    parti = [max(0.0, v) for v in medie]
    somma = sum(parti)
    quote = [v / somma if somma > 0 else 0.0 for v in parti]
    return {nome: {"quota": round(q, 4), "importo": round(q * totale, 2)}
            for nome, q in zip(("liquidita", "investimenti", "fondoPensione"), quote)}


def anno_e_mese_fine(primo_mese: int, anni: int) -> int:
    return (primo_mese + anni * 12 - 1) // 12


def previsioni_patrimonio(dati: dict, oggi: date, ipotesi: Ipotesi, flussi: dict) -> dict:
    righe = serie_risparmio(dati.get("risparmio"), oggi)
    corrente = indice_mese(oggi.year, oggi.month)
    chiusi = [r for r in righe if r["mese"] < corrente][-12:]
    if not dati.get("patrimonio"):
        return {"disponibile": False, "motivo": "Mancano i conti della scheda Patrimonio."}

    spese_medie = float(np.mean([r["spese"] for r in chiusi])) if chiusi else 0.0
    entrate_medie = float(np.mean([r["entrate"] for r in chiusi])) if chiusi else 0.0
    avanzo_medio = float(np.mean([r["entrate"] - r["spese"] for r in chiusi])) if chiusi else 0.0

    previsione_avanzo = flussi.get("_avanzo") if flussi.get("disponibile") else None
    if previsione_avanzo:
        entrate_medie = previsione_avanzo["entrateMedie"]
    if flussi.get("disponibile"):
        # Spese medie senza le voci straordinarie (l'auto), per autonomia e anni di spese.
        normali = [s["spese"] for s in flussi["storico"][-12:]]
        spese_medie = float(np.mean(normali)) if normali else spese_medie

    oggi_patrimonio = situazione(dati.get("patrimonio"), dati.get("capitaleImpegnato"), spese_medie)
    pesi = allocazione(dati.get("cruscottoInvestimenti"), oggi)

    pac = sum(numero(p.get("importo")) for p in dati.get("presetInvestimenti") or [])
    if not pac and chiusi:
        pac = float(np.mean([r["investito"] for r in chiusi]))
    fondo_mesi = serie_fondo_pensione(dati.get("fondoPensione"), oggi)
    fondo_mensile = float(np.mean(list(fondo_mesi.values())[-12:])) if fondo_mesi else 0.0

    # Il patrimonio di oggi contiene già il mese in corso: si parte dal prossimo.
    primo = corrente + 1

    return {
        "disponibile": True,
        "storico": storico(dati.get("risparmio"), dati.get("rendimentiInvestimenti"), dati.get("fondoPensione"), oggi),
        "oggi": oggi_patrimonio,
        "allocazione": {k: round(v, 4) for k, v in pesi.items()},
        "proiezione": proiezione(oggi_patrimonio, pesi, pac, fondo_mensile, previsione_avanzo,
                                 entrate_medie, avanzo_medio, ipotesi, primo),
        "ipotesi": ipotesi.come_dizionario(),
    }
