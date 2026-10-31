"""
Lo stipendio, stimato a parte dalle altre entrate.

Lo stipendio non "oscilla" come le spese: cambia a scatti (tirocinio,
assunzione, aumenti). Mescolarlo con gli anni prima darebbe una media che non
esiste più. Quindi:

  stipendio previsto = stipendio tipico del periodo attuale
                       + tredicesima / quattordicesima nei loro mesi

 - periodo attuale: dal mese dopo l'ultimo cambio di CAMBI_STIPENDIO;
 - stipendio tipico: la mediana dei mesi del periodo, tolti quelli con una
   mensilità extra (la mediana non si fa spostare da un mese strano);
 - mensilità extra: lo stipendio tipico per la parte di anno lavorata
   (assunto a marzo → a dicembre 10/12 di tredicesima), per la "resa netta"
   osservata: le mensilità extra sono tassate di più, e a luglio 2026 in busta
   è arrivato circa il 74% di quanto ci si aspettava. Finché non c'è una
   mensilità extra già pagata nel periodo, la resa è 1.
"""
import numpy as np

from backend.domain.previsioni.serie import chiave_mese, mese_da_testo, numero
from backend.models.previsioni import CAMBI_STIPENDIO, CATEGORIA_STIPENDIO, MENSILITA_EXTRA

MESI_MINIMI = 2           # mesi "normali" del periodo per fidarsi della mediana
DEVIAZIONE_MINIMA = 0.03  # 3% dello stipendio, se i mesi sono troppo pochi o tutti uguali


def serie_stipendio(entrate: list[dict]) -> dict[int, float]:
    per_mese: dict[int, float] = {}
    for e in entrate or []:
        if str(e.get("categoria") or "").strip().lower() != CATEGORIA_STIPENDIO.lower():
            continue
        m = mese_da_testo(e.get("mese"), e.get("anno"))
        if m is not None:
            per_mese[m] = per_mese.get(m, 0.0) + numero(e.get("importo"))
    return per_mese


def periodo(ultimo_mese: int) -> dict | None:
    """L'ultimo cambio di lavoro il cui primo stipendio è entro `ultimo_mese`."""
    attivo = None
    for c in CAMBI_STIPENDIO:
        evento = mese_da_testo(c["mese"])
        if evento is not None and evento + 1 <= ultimo_mese:
            attivo = {**c, "evento": evento, "dal": evento + 1}
    return attivo


def quota_extra(mese: int, inizio: int) -> tuple[str, float] | None:
    """Nome e frazione della mensilità extra pagata in `mese`, per chi ha iniziato in `inizio`."""
    regola = MENSILITA_EXTRA.get(mese % 12 + 1)
    if not regola:
        return None
    nome, primo, ultimo = regola
    maturati = max(0, (mese - ultimo) - max(mese - primo, inizio) + 1)
    return (nome, min(12, maturati) / 12) if maturati else None


def prevedi_stipendio(stipendi: dict[int, float], ultimo_chiuso: int, mesi_futuri: list[int]) -> dict | None:
    """Stipendio dei mesi futuri, o None se il periodo attuale ha troppo pochi mesi."""
    p = periodo(ultimo_chiuso)
    if not p:
        return None
    nel_periodo = [m for m in range(p["dal"], ultimo_chiuso + 1)]
    extra_passati = {m for m in nel_periodo if p["mensilita_extra"] and quota_extra(m, p["evento"])}
    normali = [stipendi.get(m, 0.0) for m in nel_periodo if m not in extra_passati]
    if len(normali) < MESI_MINIMI:
        return None

    tipico = float(np.median(normali))
    if tipico <= 0:  # nessuno stipendio registrato nel periodo
        return None
    rese = []
    for m in extra_passati:
        _, frazione = quota_extra(m, p["evento"])
        rese.append((stipendi.get(m, 0.0) - tipico) / (tipico * frazione))
    resa = float(np.clip(np.median(rese), 0.3, 1.2)) if rese else 1.0
    deviazione = float(np.std(normali, ddof=1)) if len(normali) >= 3 else 0.0
    deviazione = max(deviazione, tipico * DEVIAZIONE_MINIMA)

    centrale, pieno, extra = [], [], []
    for m in mesi_futuri:
        valore = tipico
        # "pieno": la mensilità extra intera, come sarà dal secondo anno in poi.
        pieno.append(tipico * (1 + resa if p["mensilita_extra"] and MENSILITA_EXTRA.get(m % 12 + 1) else 1))
        q = quota_extra(m, p["evento"]) if p["mensilita_extra"] else None
        if q:
            nome, frazione = q
            valore += tipico * frazione * resa
            extra.append({"mese": chiave_mese(m), "nome": nome, "importo": round(tipico * frazione * resa, 2),
                          "frazione": round(frazione, 3)})
        centrale.append(valore)
    return {
        "centrale": np.array(centrale),
        "pieno": np.array(pieno),
        "deviazione": deviazione,
        "tipico": tipico,
        "resa": resa,
        "periodo": {"nome": p["nome"], "dal": chiave_mese(p["dal"]), "mesi": len(normali)},
        "extra": extra,
    }
