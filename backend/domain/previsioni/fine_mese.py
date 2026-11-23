"""
A. Come chiude il mese in corso.

  spesa finale = già speso + uscite fisse non ancora arrivate + parte variabile

 - già speso: le uscite registrate questo mese;
 - uscite fisse: i Preset Uscite Ricorrenti che questo mese non ci sono
   ancora (stesso criterio dell'app: descrizione = nome del preset);
 - parte variabile: quanto hai speso, negli ultimi 12 mesi chiusi, DOPO il
   giorno di oggi, togliendo le uscite fisse. Ogni mese passato è uno
   scenario: la fascia va dal 10° al 90° percentile degli scenari.
   Le primarie frequenti (in media almeno 2 uscite al mese, es. il
   rifornimento, quasi sempre nel weekend) non seguono il giorno del mese ma
   il giorno della settimana: per ogni mese passato si prende quanto si è
   speso in media per ogni lunedì, martedì… e lo si moltiplica per i lunedì,
   martedì… che restano in questo mese. Così conta quanti weekend mancano, non
   se il 25 di un anno fa era sabato. Provato sui dati veri: l'errore sulle
   primarie scende del 7% sul mese intero e del 24% nella seconda metà; sulle
   secondarie non migliora, lì resta il giorno del mese.

La probabilità di superare una soglia è la quota di scenari che la superano.
Le soglie sono in % delle entrate del mese: finché lo stipendio non è
registrato (arriva verso metà mese) si aggiunge quello mediano degli ultimi 6
mesi, come fa la Home. Le spese totali hanno per soglia primarie + secondarie.
Le voci straordinarie dei mesi passati (straordinarie.py, es. il saldo
dell'auto) non entrano negli scenari: non si ripetono ogni mese. Quelle del
mese in corso invece contano, perché sono già state spese.
"""
import calendar
from datetime import date, timedelta

import numpy as np

from backend.domain.previsioni.giorni_settimana import (categorie_frequenti, giorni_della_settimana, nomi_preset,
                                                        primarie_variabili)
from backend.domain.previsioni.serie import chiave_mese, data_da_testo, indice_mese, mese_da_testo, numero
from backend.domain.previsioni.stipendio import serie_stipendio
from backend.domain.previsioni.straordinarie import uscite_straordinarie
from backend.domain.soglie import soglie_del_mese

MESI_INDIETRO = 12
SCENARI_MINIMI = 3
SOGLIE_PREDEFINITE = {"Spese Primarie": 35.0, "Spese Secondarie": 15.0}
GIORNI_SETTIMANA = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
MESI_STIPENDIO_MEDIANO = 6


def stipendio_mediano(entrate: list[dict], corrente: int) -> float | None:
    """Mediana degli ultimi 6 mesi con uno stipendio, o None se quello del
    mese in corso è già registrato (stessa regola di stipendioStimato.ts)."""
    stipendi = serie_stipendio(entrate or [])
    if stipendi.get(corrente, 0) > 0:
        return None
    passati = [v for m, v in sorted(stipendi.items(), reverse=True) if m < corrente and v > 0][:MESI_STIPENDIO_MEDIANO]
    return float(np.median(passati)) if passati else None


def _uscite_per_mese(uscite: list[dict]) -> dict[int, list[dict]]:
    """Le uscite divise per mese, con solo quello che serve alla stima.

    Restituisce: {indice del mese: [uscite]}, ogni uscita con giorno del mese,
    giorno della settimana (0 = lunedì), categoria, importo, primaria,
    descrizione e se è straordinaria.
    """
    per_mese: dict[int, list[dict]] = {}
    straordinarie = uscite_straordinarie(uscite or [])
    for i, t in enumerate(uscite or []):
        d = data_da_testo(t.get("data"))
        if not d:
            continue
        per_mese.setdefault(indice_mese(d.year, d.month), []).append({
            "giorno": d.day,
            "settimana": d.weekday(),
            "categoria": str(t.get("categoria") or "").strip(),
            "importo": numero(t.get("importo")),
            "primaria": bool(t.get("primaria")),
            "descrizione": str(t.get("descrizione") or "").strip(),
            "straordinaria": i in straordinarie,
        })
    return per_mese


def _soglia(soglie: list[dict], nome: str) -> float:
    """La percentuale della soglia `nome` ("Spese Primarie"…), o quella di default.

    Esempio: senza soglie sul foglio, "Spese Primarie" → 35.0 (35% delle entrate).
    """
    for s in soglie or []:
        if str(s.get("categoria", "")).strip().lower() == nome.lower():
            return numero(s.get("percentuale"))
    return SOGLIE_PREDEFINITE[nome]


def _quantili(valori: np.ndarray) -> dict:
    """Basso, centrale e alto di un gruppo di scenari: 10°, 50° e 90° percentile.

    Esempio: 12 scenari da 700 a 900 € → circa {"basso": 720, "centrale": 800,
    "alto": 880}: 8 volte su 10 il mese chiude fra 720 e 880.
    """
    basso, centrale, alto = np.percentile(valori, [10, 50, 90])
    return {"basso": round(float(basso), 2), "centrale": round(float(centrale), 2), "alto": round(float(alto), 2)}


def previsione_fine_mese(uscite: list[dict], preset_uscite: list[dict], entrate: list[dict], soglie: list[dict],
                         oggi: date, entrate_previste: float | None = None) -> dict:
    """Come chiuderà il mese in corso (scheda "Questo mese" di Previsioni).

    Riceve: uscite, preset delle uscite ricorrenti, entrate, soglie, la data di
    oggi e (se non c'è nessuno stipendio passato) le entrate stimate da flussi.py.
    Restituisce un dizionario con, fra l'altro:
      spesoFinora      quanto è già uscito (primarie, secondarie, totale)
      fissiInArrivo    i preset non ancora registrati
      stima            spesa a fine mese: basso, centrale, alto
      soglie           ogni soglia in euro e la probabilità di superarla
      curve            la stima giorno per giorno, per il grafico
      affidabilita     di quanto sbagliava, provata sui mesi passati
      perGiornoSettimana  le primarie stimate sui giorni della settimana
    Oppure {"disponibile": False, "motivo": ...} se mancano i dati.
    """
    corrente = indice_mese(oggi.year, oggi.month)
    giorno = oggi.day
    giorni_mese = calendar.monthrange(oggi.year, oggi.month)[1]
    per_mese = _uscite_per_mese(uscite)
    preset = nomi_preset(preset_uscite)  # in minuscolo

    passati = [m for m in range(corrente - MESI_INDIETRO, corrente) if per_mese.get(m)]
    if len(passati) < SCENARI_MINIMI:
        return {"disponibile": False, "motivo": f"Servono almeno {SCENARI_MINIMI} mesi passati con le uscite registrate."}

    # --- Mese in corso ---------------------------------------------------------
    di_questo_mese = per_mese.get(corrente, [])
    speso = {"primarie": sum(t["importo"] for t in di_questo_mese if t["primaria"]),
             "secondarie": sum(t["importo"] for t in di_questo_mese if not t["primaria"])}
    registrati = {t["descrizione"].lower() for t in di_questo_mese}
    fissi = []
    for p in preset_uscite or []:
        nome = str(p.get("nome") or "").strip()
        if nome and nome.lower() not in registrati:
            fissi.append({"nome": nome, "importo": numero(p.get("importo")), "primaria": bool(p.get("primaria")),
                          "giorno": max(giorno + 1, min(giorni_mese, int(numero(p.get("giornoDelMese")) or giorno + 1)))})
    fissi_tipo = {"primarie": sum(f["importo"] for f in fissi if f["primaria"]),
                  "secondarie": sum(f["importo"] for f in fissi if not f["primaria"])}

    # --- Scenari dai mesi passati: spesa variabile dopo il giorno di oggi -----
    def variabili(mese: int, primaria: bool | None = None) -> list[dict]:
        """Le uscite "variabili" di un mese passato: senza preset né straordinarie.
        `primaria`: True solo primarie, False solo secondarie, None tutte.
        """
        return [t for t in per_mese[mese]
                if t["descrizione"].lower() not in preset and not t["straordinaria"]
                and (primaria is None or t["primaria"] == primaria)]

    # Primarie frequenti (giorni_settimana.py): in media almeno 2 uscite al mese.
    frequenti = categorie_frequenti(primarie_variabili(uscite, preset_uscite), passati)

    def per_settimana(t: dict) -> bool:
        """True se l'uscita va stimata sul giorno della settimana
        (primaria di una categoria frequente, es. il rifornimento).
        """
        return t["primaria"] and t["categoria"] in frequenti

    # Per ogni mese passato: spesa media di ogni giorno della settimana (lunedì…
    # domenica) nelle categorie frequenti = spesa di quel giorno / quante volte c'era.
    giorno_medio: dict[int, list[float]] = {}
    for m in passati:
        n = giorni_della_settimana(m)
        spesa = [0.0] * 7
        for t in variabili(m, True):
            if per_settimana(t):
                spesa[t["settimana"]] += t["importo"]
        giorno_medio[m] = [s / k for s, k in zip(spesa, n)]
    settimana_di = [None] + [date(oggi.year, oggi.month, g).weekday() for g in range(1, giorni_mese + 1)]

    def variabile_tra(mese: int, da_giorno: int, a_giorno: int, primaria: bool | None = None) -> float:
        """Spesa variabile di questo mese fra il giorno dopo `da_giorno` e `a_giorno`
        compreso, nello scenario del mese passato `mese`. Le voci normali per giorno
        del mese (fino alla fine del mese: a_giorno >= giorni_mese prende anche il
        31 di un mese più lungo), le primarie frequenti per giorno della settimana."""
        fine = a_giorno if a_giorno < giorni_mese else 99
        totale = sum(t["importo"] for t in variabili(mese, primaria)
                     if da_giorno < t["giorno"] <= fine and not per_settimana(t))
        if primaria is not False:
            totale += sum(giorno_medio[mese][settimana_di[g]] for g in range(da_giorno + 1, min(a_giorno, giorni_mese) + 1))
        return totale

    def variabile_dopo(mese: int, da_giorno: int, primaria: bool | None = None) -> float:
        """Spesa variabile da dopo `da_giorno` a fine mese, nello scenario
        del mese passato `mese`.

        Esempio: oggi è il 23 e lo scenario è ottobre 2025 → quanto si stima di
        spendere dal 24 a fine mese se questo mese andasse come quello.
        """
        return variabile_tra(mese, da_giorno, giorni_mese, primaria)

    var_prim = np.array([variabile_dopo(m, giorno, True) for m in passati])
    var_sec = np.array([variabile_dopo(m, giorno, False) for m in passati])
    finale_prim = speso["primarie"] + fissi_tipo["primarie"] + var_prim
    finale_sec = speso["secondarie"] + fissi_tipo["secondarie"] + var_sec
    finale = finale_prim + finale_sec

    # --- Soglie (in % delle entrate del mese) ---------------------------------
    entrate_mese = sum(numero(e.get("importo")) for e in entrate or []
                       if mese_da_testo(e.get("mese"), e.get("anno")) == corrente)
    mediana = stipendio_mediano(entrate, corrente)
    entrate_stimate = mediana is not None
    if mediana is not None:
        entrate_mese += mediana
    elif not entrate_mese and entrate_previste:  # nessuno stipendio passato: la stima dei flussi
        entrate_mese, entrate_stimate = float(entrate_previste), True

    # Le soglie valide nel mese in corso (possono cambiare nel tempo).
    soglie = soglie_del_mese(soglie, oggi.year, oggi.month)
    perc = {nome: _soglia(soglie, nome) for nome in SOGLIE_PREDEFINITE}
    soglie_esito = []
    for nome, scenari, percentuale in (
        ("Spese Totali", finale, perc["Spese Primarie"] + perc["Spese Secondarie"]),
        ("Spese Primarie", finale_prim, perc["Spese Primarie"]),
        ("Spese Secondarie", finale_sec, perc["Spese Secondarie"]),
    ):
        limite = entrate_mese * percentuale / 100 if entrate_mese else None
        soglie_esito.append({
            "nome": nome, "percentuale": percentuale,
            "limite": None if limite is None else round(limite, 2),
            "probabilitaSforamento": None if limite is None else round(float(np.mean(scenari > limite)), 3),
        })

    # --- Curva giorno per giorno (totale, primarie, secondarie) ---------------
    def curva_di(primaria: bool | None) -> list[dict]:
        """La stima giorno per giorno per il grafico.

        Fino a oggi: "speso" (quello vero). Da oggi in poi: basso, centrale e alto
        di già registrato + fissi arrivati entro quel giorno + variabile stimata.
        """
        def del_tipo(x) -> bool:
            """True se l'uscita è del tipo mostrato (primarie, secondarie o tutte)."""
            return primaria is None or x["primaria"] == primaria
        curva = []
        gia = 0.0
        registrato = sum(t["importo"] for t in di_questo_mese if del_tipo(t))
        for g in range(1, giorni_mese + 1):
            gia += sum(t["importo"] for t in di_questo_mese if t["giorno"] == g and del_tipo(t))
            punto: dict = {"giorno": g}
            if g <= giorno:
                punto["speso"] = round(gia, 2)
            if g >= giorno:
                fissi_fino = sum(f["importo"] for f in fissi if f["giorno"] <= g and del_tipo(f))
                var_fino = np.array([variabile_tra(m, giorno, g, primaria) for m in passati])
                punto.update(_quantili(registrato + fissi_fino + var_fino))
            curva.append(punto)
        return curva

    curve = {"totale": curva_di(None), "primarie": curva_di(True), "secondarie": curva_di(False)}

    # --- Prova sul passato: per ogni mese passato, stima fatta con gli altri --
    errori = []
    for j, m in enumerate(passati):
        altri = np.delete(var_prim + var_sec, j)
        normali = [t for t in per_mese[m] if not t["straordinaria"]]
        fino_a_oggi = sum(t["importo"] for t in normali if t["giorno"] <= giorno)
        fissi_dopo = sum(t["importo"] for t in normali if t["giorno"] > giorno and t["descrizione"].lower() in preset)
        vero = sum(t["importo"] for t in normali)
        errori.append(abs(vero - (fino_a_oggi + fissi_dopo + float(np.median(altri)))))

    return {
        "disponibile": True,
        "mese": chiave_mese(corrente),
        "giorno": giorno,
        "giorniMese": giorni_mese,
        "spesoFinora": {k: round(v, 2) for k, v in {**speso, "totale": speso["primarie"] + speso["secondarie"]}.items()},
        "fissiInArrivo": [{"nome": f["nome"], "importo": f["importo"], "giorno": f["giorno"], "primaria": f["primaria"]}
                          for f in fissi],
        "stima": {"totale": _quantili(finale), "primarie": _quantili(finale_prim), "secondarie": _quantili(finale_sec)},
        "entrateMese": round(entrate_mese, 2),
        "entrateStimate": entrate_stimate,
        "stipendioMediano": None if mediana is None else round(mediana, 2),
        "soglie": soglie_esito,
        "curva": curve["totale"],
        "curve": curve,
        "affidabilita": {"erroreMedio": round(float(np.mean(errori)), 2), "mesiProvati": len(errori)},
        "mesiUsati": len(passati),
        "perGiornoSettimana": _per_giorno_settimana(frequenti, per_mese, passati, preset, oggi, giorni_mese),
    }


def _per_giorno_settimana(frequenti: set[str], per_mese: dict[int, list[dict]], passati: list[int],
                          preset: set[str], oggi: date, giorni_mese: int) -> list[dict]:
    """Le categorie primarie stimate per giorno della settimana, con i giorni in
    cui di solito si spende (quelli sopra la media, 1/7 della spesa) e quanti ne
    restano in questo mese dopo oggi."""
    restanti = [0] * 7
    for g in range(oggi.day + 1, giorni_mese + 1):
        restanti[(oggi + timedelta(days=g - oggi.day)).weekday()] += 1
    voci = []
    for categoria in sorted(frequenti):
        spesa = [0.0] * 7
        for m in passati:
            for t in per_mese[m]:
                if (t["primaria"] and t["categoria"] == categoria and not t["straordinaria"]
                        and t["descrizione"].lower() not in preset):
                    spesa[t["settimana"]] += t["importo"]
        totale = sum(spesa)
        if not categoria or totale <= 0:
            continue
        giorni = [w for w in range(7) if spesa[w] > totale / 7]
        voci.append({
            "categoria": categoria,
            "giorni": [GIORNI_SETTIMANA[w] for w in giorni],
            "quotaNeiGiorni": round(sum(spesa[w] for w in giorni) / totale, 2),
            "giorniRestanti": sum(restanti[w] for w in giorni),
        })
    return voci
