"""
Cruscotto Investimenti: riepilogo anno per anno di quanto è stato investito
(per asset class) e di quanto ha reso, dai dati di Scalable, Trade Republic e
Rendimenti.

Ogni riga dei broker è il versamento del SOLO quel mese, per strumento (non un
cumulato): il totale dell'anno è la somma delle sue righe, il cumulato di fine
anno quel totale più il cumulato dell'anno prima.
"""
import re

from backend.domain.conversioni import e_un_numero, intero_iniziale

MESI = {
    "gen": 1, "jan": 1, "feb": 2, "mar": 3, "apr": 4, "mag": 5, "may": 5, "giu": 6, "jun": 6,
    "lug": 7, "jul": 7, "ago": 8, "aug": 8, "set": 9, "sep": 9, "ott": 10, "oct": 10, "nov": 11,
    "dic": 12, "dec": 12,
}


def leggi_mese(testo) -> tuple[int, int] | None:
    """(anno, mese) da "Lug 25", "Giugno 2026", "2026-06"…; None se non si capisce."""
    if not testo:
        return None
    parti = re.split(r"[\s/.\-]+", str(testo).strip().lower())
    if len(parti) < 2:
        return None
    parte_mese, parte_anno = parti[0], parti[1]
    if len(parti[0]) == 4 and e_un_numero(parti[0]):  # formato YYYY-MM
        parte_anno, parte_mese = parti[0], parti[1]

    anno = intero_iniziale(parte_anno)
    if anno is None:
        return None
    if anno < 100:
        anno += 2000
    mese = MESI.get(parte_mese[:3]) or intero_iniziale(parte_mese)
    if mese is None or not 1 <= mese <= 12:
        return None
    return anno, mese


def _categoria(campo: str, categorie: dict[str, str]) -> str | None:
    """Categoria di una colonna strumento, corretta dal nome quando è evidente."""
    nome = campo.lower()
    if "bond" in nome or "obbligazion" in nome or "ibond" in nome:
        return "obbligazioni"
    if any(p in nome for p in ("monetar", "liqui", "cash", "swap", "overnight")):
        return "monetari"
    return categorie.get(campo)


def _con_data(righe: list[dict]) -> list[dict]:
    """Le righe con un mese leggibile, con in più `year` e `month`."""
    risultato = []
    for r in righe:
        data = leggi_mese(r.get("mese"))
        if data:
            risultato.append({**r, "year": data[0], "month": data[1]})
    return risultato


def _cronologico(righe: list[dict]) -> list[dict]:
    return sorted(righe, key=lambda r: (r["year"], r["month"]))


def _numero(valore) -> float:
    return float(valore or 0)


def _somma_categoria(righe: list[dict], categorie: dict[str, str], categoria: str) -> float:
    totale = 0
    for r in righe:
        somma_riga = 0
        for campo in categorie:
            if _categoria(campo, categorie) == categoria:
                somma_riga += _numero(r.get(campo))
        totale += somma_riga
    return totale


def _ultime_commissioni_cumulate(righe_cronologiche: list[dict], anno: int) -> float:
    """Commissioni cumulate a fine anno: se l'ultima riga ha la cella vuota (mese
    non ancora aggiornato) si risale fino all'ultimo valore scritto."""
    for r in reversed(righe_cronologiche):
        if r["year"] > anno:
            continue
        valore = r.get("commissioniomulative")
        if valore not in (None, "") and _numero(valore) != 0:
            return _numero(valore)
    return 0


def calcola_cruscotto(dati: dict) -> list[dict]:
    """Un elemento per anno, dal più recente al più vecchio."""
    scalable = _con_data(dati.get("scalable") or [])
    trade_republic = _con_data(dati.get("tradeRepublic") or [])
    rendimenti = _con_data(dati.get("rendimentiInvestimenti") or dati.get("rendimenti") or [])
    categorie_scalable = dati.get("scalableColumnCategories") or {}
    categorie_tr = dati.get("tradeRepublicColumnCategories") or {}

    anni = sorted({r["year"] for r in scalable + trade_republic + rendimenti})
    rendimenti_cronologici = _cronologico(rendimenti)
    scalable_cronologico = _cronologico(scalable)
    tr_cronologico = _cronologico(trade_republic)

    risultato = []
    cum_prec = {"azioni": 0, "obbligazioni": 0, "monetari": 0}
    commissioni_prec = 0

    for indice, anno in enumerate(anni):
        scalable_anno = [r for r in scalable if r["year"] == anno]
        tr_anno = [r for r in trade_republic if r["year"] == anno]

        per_anno, cumulati = {}, {}
        for categoria in ("azioni", "obbligazioni", "monetari"):
            per_anno[categoria] = (_somma_categoria(scalable_anno, categorie_scalable, categoria)
                                   + _somma_categoria(tr_anno, categorie_tr, categoria))
            cumulati[categoria] = cum_prec[categoria] + per_anno[categoria]

        # Le commissioni sono soldi usciti ma non allocati in nessuna asset class:
        # si sommano solo all'investito, non al rendimento (già al netto nel foglio).
        commissioni_cum = (_ultime_commissioni_cumulate(scalable_cronologico, anno)
                           + _ultime_commissioni_cumulate(tr_cronologico, anno))
        commissioni_anno = commissioni_cum if indice == 0 else max(0, commissioni_cum - commissioni_prec)
        cum_prec, commissioni_prec = cumulati, commissioni_cum

        rendimento = _rendimenti_anno(rendimenti, rendimenti_cronologici, anno)
        risultato.append({
            "anno": anno,
            "azioniInvestitoCum": cumulati["azioni"],
            "azioniInvestitoAnno": per_anno["azioni"],
            "obbligazioniInvestitoCum": cumulati["obbligazioni"],
            "obbligazioniInvestitoAnno": per_anno["obbligazioni"],
            "monetariInvestitoCum": cumulati["monetari"],
            "monetariInvestitoAnno": per_anno["monetari"],
            "commissioniInvestitoCum": commissioni_cum,
            "commissioniInvestitoAnno": commissioni_anno,
            "investitoCumulativo": cumulati["azioni"] + cumulati["obbligazioni"] + cumulati["monetari"] + commissioni_cum,
            "investitoAnnuale": per_anno["azioni"] + per_anno["obbligazioni"] + per_anno["monetari"] + commissioni_anno,
            **rendimento,
        })

    return sorted(risultato, key=lambda r: r["anno"], reverse=True)


def _rendimenti_anno(rendimenti: list[dict], cronologici: list[dict], anno: int) -> dict:
    vuoto = {"rendimentoCumulativoEuro": 0, "rendimentoAnnualeEuro": 0,
             "rendimentoMedioMensilePerc": 0, "rendimentoAnnuoStimatoPerc": 0}
    dell_anno = sorted((r for r in rendimenti if r["year"] == anno), key=lambda r: r["month"])
    if not dell_anno:
        return vuoto

    # Rendimento cumulato a fine anno: se l'ultimo mese è vuoto o a zero si
    # prende quello del mese precedente con un valore.
    ultimo = dell_anno[-1]
    scelto = ultimo
    posizione = next((i for i, r in enumerate(cronologici) if r["year"] == anno and r["month"] == ultimo["month"]), -1)
    for r in reversed(cronologici[:posizione + 1] if posizione >= 0 else []):
        valore = r.get("rendimentoCumulativoEuro")
        if valore not in (None, "") and _numero(valore) != 0:
            scelto = r
            break

    # Media mensile solo sui mesi già registrati (rendimento mensile non vuoto).
    registrati = [r for r in dell_anno if r.get("rendimentoMensileEuro") not in (None, "")
                  and _numero(r.get("rendimentoMensileEuro")) != 0]
    da_mediare = registrati or dell_anno
    media = sum(_numero(r.get("rendimentoMensilePerc")) for r in da_mediare) / len(da_mediare)

    return {
        "rendimentoCumulativoEuro": _numero(scelto.get("rendimentoCumulativoEuro")),
        "rendimentoAnnualeEuro": sum(_numero(r.get("rendimentoMensileEuro")) for r in dell_anno),
        "rendimentoMedioMensilePerc": media,
        # Stima annua: media mensile × 12, anche per l'anno in corso.
        "rendimentoAnnuoStimatoPerc": media * 12,
    }
