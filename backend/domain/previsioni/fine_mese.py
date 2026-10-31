"""
A. Come chiude il mese in corso.

  spesa finale = già speso + uscite fisse non ancora arrivate + parte variabile

 - già speso: le uscite registrate questo mese;
 - uscite fisse: i Preset Uscite Ricorrenti che questo mese non ci sono
   ancora (stesso criterio dell'app: descrizione = nome del preset);
 - parte variabile: quanto hai speso, negli ultimi 12 mesi chiusi, DOPO il
   giorno di oggi, togliendo le uscite fisse. Ogni mese passato è uno
   scenario: la fascia va dal 10° al 90° percentile degli scenari.

La probabilità di superare una soglia è la quota di scenari che la superano.
Le voci straordinarie dei mesi passati (straordinarie.py, es. il saldo
dell'auto) non entrano negli scenari: non si ripetono ogni mese. Quelle del
mese in corso invece contano, perché sono già state spese.
"""
import calendar
from datetime import date

import numpy as np

from backend.domain.previsioni.serie import chiave_mese, data_da_testo, indice_mese, mese_da_testo, numero
from backend.domain.previsioni.straordinarie import uscite_straordinarie

MESI_INDIETRO = 12
SCENARI_MINIMI = 3
SOGLIE_PREDEFINITE = {"Spese Primarie": 35.0, "Spese Secondarie": 15.0}


def _uscite_per_mese(uscite: list[dict]) -> dict[int, list[dict]]:
    per_mese: dict[int, list[dict]] = {}
    straordinarie = uscite_straordinarie(uscite or [])
    for i, t in enumerate(uscite or []):
        d = data_da_testo(t.get("data"))
        if not d:
            continue
        per_mese.setdefault(indice_mese(d.year, d.month), []).append({
            "giorno": d.day,
            "importo": numero(t.get("importo")),
            "primaria": bool(t.get("primaria")),
            "descrizione": str(t.get("descrizione") or "").strip(),
            "straordinaria": i in straordinarie,
        })
    return per_mese


def _soglia(soglie: list[dict], nome: str) -> float:
    for s in soglie or []:
        if str(s.get("categoria", "")).strip().lower() == nome.lower():
            return numero(s.get("percentuale"))
    return SOGLIE_PREDEFINITE[nome]


def _quantili(valori: np.ndarray) -> dict:
    basso, centrale, alto = np.percentile(valori, [10, 50, 90])
    return {"basso": round(float(basso), 2), "centrale": round(float(centrale), 2), "alto": round(float(alto), 2)}


def previsione_fine_mese(uscite: list[dict], preset_uscite: list[dict], entrate: list[dict], soglie: list[dict],
                         oggi: date, entrate_previste: float | None = None) -> dict:
    corrente = indice_mese(oggi.year, oggi.month)
    giorno = oggi.day
    giorni_mese = calendar.monthrange(oggi.year, oggi.month)[1]
    per_mese = _uscite_per_mese(uscite)
    nomi_preset = {str(p.get("nome") or "").strip() for p in preset_uscite or []} - {""}

    passati = [m for m in range(corrente - MESI_INDIETRO, corrente) if per_mese.get(m)]
    if len(passati) < SCENARI_MINIMI:
        return {"disponibile": False, "motivo": f"Servono almeno {SCENARI_MINIMI} mesi passati con le uscite registrate."}

    # --- Mese in corso ---------------------------------------------------------
    di_questo_mese = per_mese.get(corrente, [])
    speso = {"primarie": sum(t["importo"] for t in di_questo_mese if t["primaria"]),
             "secondarie": sum(t["importo"] for t in di_questo_mese if not t["primaria"])}
    registrati = {t["descrizione"] for t in di_questo_mese}
    fissi = []
    for p in preset_uscite or []:
        nome = str(p.get("nome") or "").strip()
        if nome and nome not in registrati:
            fissi.append({"nome": nome, "importo": numero(p.get("importo")), "primaria": bool(p.get("primaria")),
                          "giorno": max(giorno + 1, min(giorni_mese, int(numero(p.get("giornoDelMese")) or giorno + 1)))})
    fissi_tipo = {"primarie": sum(f["importo"] for f in fissi if f["primaria"]),
                  "secondarie": sum(f["importo"] for f in fissi if not f["primaria"])}

    # --- Scenari dai mesi passati: spesa variabile dopo il giorno di oggi -----
    def variabile_dopo(mese: int, da_giorno: int, primaria: bool | None = None) -> float:
        return sum(t["importo"] for t in per_mese[mese]
                   if t["giorno"] > da_giorno and t["descrizione"] not in nomi_preset and not t["straordinaria"]
                   and (primaria is None or t["primaria"] == primaria))

    var_prim = np.array([variabile_dopo(m, giorno, True) for m in passati])
    var_sec = np.array([variabile_dopo(m, giorno, False) for m in passati])
    finale_prim = speso["primarie"] + fissi_tipo["primarie"] + var_prim
    finale_sec = speso["secondarie"] + fissi_tipo["secondarie"] + var_sec
    finale = finale_prim + finale_sec

    # --- Soglie (in % delle entrate del mese) ---------------------------------
    entrate_mese = sum(numero(e.get("importo")) for e in entrate or []
                       if mese_da_testo(e.get("mese"), e.get("anno")) == corrente)
    entrate_stimate = False
    if not entrate_mese and entrate_previste:
        entrate_mese, entrate_stimate = float(entrate_previste), True

    soglie_esito = []
    for nome, scenari in (("Spese Primarie", finale_prim), ("Spese Secondarie", finale_sec)):
        percentuale = _soglia(soglie, nome)
        limite = entrate_mese * percentuale / 100 if entrate_mese else None
        soglie_esito.append({
            "nome": nome, "percentuale": percentuale,
            "limite": None if limite is None else round(limite, 2),
            "probabilitaSforamento": None if limite is None else round(float(np.mean(scenari > limite)), 3),
        })

    # --- Curva giorno per giorno ----------------------------------------------
    curva = []
    gia = 0.0
    for g in range(1, giorni_mese + 1):
        gia += sum(t["importo"] for t in di_questo_mese if t["giorno"] == g)
        punto: dict = {"giorno": g}
        if g <= giorno:
            punto["speso"] = round(gia, 2)
        if g >= giorno:
            totale_registrato = speso["primarie"] + speso["secondarie"]
            fissi_fino = sum(f["importo"] for f in fissi if f["giorno"] <= g)
            var_fino = np.array([variabile_dopo(m, giorno) - variabile_dopo(m, g) for m in passati])
            punto.update(_quantili(totale_registrato + fissi_fino + var_fino))
        curva.append(punto)

    # --- Prova sul passato: per ogni mese passato, stima fatta con gli altri --
    errori = []
    for j, m in enumerate(passati):
        altri = np.delete(var_prim + var_sec, j)
        normali = [t for t in per_mese[m] if not t["straordinaria"]]
        fino_a_oggi = sum(t["importo"] for t in normali if t["giorno"] <= giorno)
        fissi_dopo = sum(t["importo"] for t in normali if t["giorno"] > giorno and t["descrizione"] in nomi_preset)
        vero = sum(t["importo"] for t in normali)
        errori.append(abs(vero - (fino_a_oggi + fissi_dopo + float(np.median(altri)))))

    return {
        "disponibile": True,
        "mese": chiave_mese(corrente),
        "giorno": giorno,
        "giorniMese": giorni_mese,
        "spesoFinora": {k: round(v, 2) for k, v in {**speso, "totale": speso["primarie"] + speso["secondarie"]}.items()},
        "fissiInArrivo": [{"nome": f["nome"], "importo": f["importo"], "giorno": f["giorno"]} for f in fissi],
        "stima": {"totale": _quantili(finale), "primarie": _quantili(finale_prim), "secondarie": _quantili(finale_sec)},
        "entrateMese": round(entrate_mese, 2),
        "entrateStimate": entrate_stimate,
        "soglie": soglie_esito,
        "curva": curva,
        "affidabilita": {"erroreMedio": round(float(np.mean(errori)), 2), "mesiProvati": len(errori)},
        "mesiUsati": len(passati),
    }
