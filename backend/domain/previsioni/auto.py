"""
D. Auto: quanti km nei prossimi 12 mesi e quanto costeranno.

Dati: la scheda "Analisi Consumi" (un rifornimento per riga, con i km del
contachilometri) e le uscite ricorrenti dell'auto (preset).

Come si stima, dopo averlo provato sui dati veri (ott 2025 → nov 2026):
- Km: il ritmo dell'ultimo anno, dal contachilometri (km fatti negli ultimi
  365 giorni, o in quelli che ci sono se meno). Finestre più corte sbagliavano
  di più: sui 3 mesi dopo, 1 mese di ritmo ~10%, 3 mesi ~8%, 6 mesi ~8%; sui
  6 mesi dopo, 6 mesi di ritmo ~4%. Niente stagionalità: c'è un anno solo.
- Fascia dei km: quanto variano i km da un mese all'altro nell'ultimo anno
  (10°-90° percentile di una normale; sull'anno lo scarto cresce come √12).
- Consumo: km/litro di tutti i rifornimenti dell'ultimo anno.
- Prezzo: la mediana degli ultimi 4 rifornimenti. Sul passato l'ultimo prezzo
  sbagliava meno della media dei 3 o 12 mesi (0,08 €/l a un mese, 0,15 a tre,
  0,29 a sei): il prezzo non si prevede, quindi nell'app è un cursore.
  Il costo del carburante lo calcola l'app (km / km al litro × prezzo).
- Rate fisse: i preset delle uscite dell'auto (macro Automobile, bollo,
  revisione), ogni mese uguali.
"""
from datetime import date, timedelta

import numpy as np

from backend.domain.previsioni.serie import anno_e_mese, chiave_mese, data_da_testo, indice_mese, numero

GIORNI_ANNO = 365
GIORNI_MINIMI = 90
RIFORNIMENTI_MINIMI = 3
RIFORNIMENTI_PREZZO = 4
Z_80 = 1.2816  # 10°-90° percentile di una normale
CATEGORIE_AUTO_FUORI_MACRO = {"bollo auto", "bollo", "revisione"}


def _rifornimenti(righe: list[dict] | None, oggi: date) -> list[dict]:
    """Le righe di Analisi Consumi pulite e in ordine di data.

    Restano fuori le righe senza data, nel futuro o senza km del contachilometri.
    Ogni rifornimento ha: data, km (contachilometri), costo, litri, prezzo,
    kmFatti (km dal rifornimento prima).
    """
    puliti = []
    for r in righe or []:
        d = data_da_testo(r.get("data"))
        km = numero(r.get("kmFinali"))
        if not d or d > oggi or km <= 0:
            continue
        puliti.append({"data": d, "km": km, "costo": numero(r.get("costo")), "litri": numero(r.get("quantitaLitri")),
                       "prezzo": numero(r.get("prezzoAlLitro")), "kmFatti": numero(r.get("kmEffettuati"))})
    puliti.sort(key=lambda r: (r["data"], r["km"]))
    return puliti


class _Contachilometri:
    """Km a una data qualsiasi, interpolando fra i rifornimenti."""

    def __init__(self, rifornimenti: list[dict]):
        """Prepara i punti noti: per ogni rifornimento, giorni dal primo e km."""
        self.inizio = rifornimenti[0]["data"]
        self.giorni = np.array([(r["data"] - self.inizio).days for r in rifornimenti], dtype=float)
        self.km = np.maximum.accumulate(np.array([r["km"] for r in rifornimenti], dtype=float))

    def __call__(self, giorno: date) -> float:
        """I km del contachilometri a una data qualsiasi.

        Fra due rifornimenti si traccia una linea dritta.
        Esempio: 50.000 km il 1° marzo e 51.000 il 31 marzo → il 16 marzo 50.500.
        Si usa così: conta = _Contachilometri(rif); conta(date(2026, 3, 16)).
        """
        return float(np.interp((giorno - self.inizio).days, self.giorni, self.km))


def _primo_del_mese(indice: int) -> date:
    """Il primo giorno del mese. Esempio: 24322 → date(2026, 11, 1)."""
    anno, mese = anno_e_mese(indice)
    return date(anno, mese, 1)


def _affidabilita_km(conta: _Contachilometri, ultimo: date, orizzonte: int = 90) -> dict:
    """Prova sul passato dello stesso metodo: a ogni partenza (ogni 15 giorni), il ritmo
    dei giorni prima (fino a un anno, almeno GIORNI_MINIMI) contro i km veri dei
    `orizzonte` giorni dopo. Errore medio in % dei km veri."""
    errori = []
    origine = conta.inizio + timedelta(days=GIORNI_MINIMI)
    while origine + timedelta(days=orizzonte) <= ultimo:
        finestra = min(GIORNI_ANNO, (origine - conta.inizio).days)
        ritmo = (conta(origine) - conta(origine - timedelta(days=finestra))) / finestra
        veri = conta(origine + timedelta(days=orizzonte)) - conta(origine)
        if veri > 0:
            errori.append(abs(ritmo * orizzonte - veri) / veri)
        origine += timedelta(days=15)
    return {"erroreMedio": float(np.mean(errori)) if errori else None, "prove": len(errori), "giorni": orizzonte}


def _rate_fisse(preset: list[dict] | None) -> list[dict]:
    """Le uscite ricorrenti dell'auto, prese dai preset.

    Sono dell'auto i preset con macro "Automobile" o categoria bollo/revisione.
    Esempio: Rata Assicurazione 80 €, Rata Bollo 23 € … → una voce ciascuna.
    """
    voci = []
    for p in preset or []:
        macro = str(p.get("macroCategoria") or "").strip().lower()
        categoria = str(p.get("categoria") or "").strip().lower()
        importo = numero(p.get("importo"))
        if importo > 0 and (macro == "automobile" or categoria in CATEGORIE_AUTO_FUORI_MACRO):
            voci.append({"nome": str(p.get("nome") or p.get("categoria") or "").strip(), "importo": round(importo, 2)})
    return voci


def previsione_auto(consumi: list[dict] | None, preset_uscite: list[dict] | None, oggi: date) -> dict:
    """Km e costi dell'auto dei prossimi 12 mesi (scheda "Auto").

    Riceve: le righe di Analisi Consumi, i preset delle uscite e la data di oggi.
    Restituisce, fra l'altro:
      kmAlGiorno, kmAnno   il ritmo dell'ultimo anno e i km attesi in 12 mesi
      kmAlLitro            consumo dell'ultimo anno
      prezzo               prezzo di partenza del cursore (mediana degli ultimi
                           4 rifornimenti) e minimo/medio/massimo dell'anno
      rateFisse            le rate dell'auto al mese
      storico, previsti    km e carburante mese per mese, veri e stimati
    Il costo del carburante lo calcola l'app, perché dipende dal cursore del prezzo.
    """
    rif = _rifornimenti(consumi, oggi)
    if len(rif) < RIFORNIMENTI_MINIMI:
        return {"disponibile": False, "motivo": "Servono almeno 3 rifornimenti in Analisi Consumi."}
    ultimo = rif[-1]["data"]
    durata = (ultimo - rif[0]["data"]).days
    if durata < GIORNI_MINIMI:
        return {"disponibile": False, "motivo": f"Servono almeno {GIORNI_MINIMI} giorni di rifornimenti (ora {durata})."}

    conta = _Contachilometri(rif)
    finestra = min(GIORNI_ANNO, durata)
    dal = ultimo - timedelta(days=finestra)
    ritmo = (conta(ultimo) - conta(dal)) / finestra  # km al giorno

    # Mesi veri: quelli interi coperti dal contachilometri, al massimo gli ultimi 12.
    mese_oggi = indice_mese(oggi.year, oggi.month)
    primo = indice_mese(rif[0]["data"].year, rif[0]["data"].month) + 1  # il primo mese è quasi sempre a metà
    costo_mese: dict[int, float] = {}
    for r in rif:
        k = indice_mese(r["data"].year, r["data"].month)
        costo_mese[k] = costo_mese.get(k, 0.0) + r["costo"]
    storico = []
    for k in range(max(primo, mese_oggi - 12), mese_oggi):
        fine = _primo_del_mese(k + 1)
        if fine - timedelta(days=1) > ultimo:
            break
        storico.append({"mese": chiave_mese(k), "km": round(conta(fine) - conta(_primo_del_mese(k)), 1),
                        "carburante": round(costo_mese.get(k, 0.0), 2)})

    km_mesi = [s["km"] for s in storico]
    scarto_mese = float(np.std(km_mesi, ddof=1)) if len(km_mesi) >= 3 else ritmo * 30 * 0.2

    previsti = []
    for k in range(mese_oggi + 1, mese_oggi + 13):
        giorni = (_primo_del_mese(k + 1) - _primo_del_mese(k)).days
        centrale = ritmo * giorni
        previsti.append({"mese": chiave_mese(k), "km": {"centrale": round(centrale, 1),
                                                         "basso": round(max(0.0, centrale - Z_80 * scarto_mese), 1),
                                                         "alto": round(centrale + Z_80 * scarto_mese, 1)}})
    km_anno = sum(p["km"]["centrale"] for p in previsti)
    scarto_anno = Z_80 * scarto_mese * np.sqrt(len(previsti))

    nell_anno = [r for r in rif if r["data"] > dal and r["kmFatti"] > 0 and r["litri"] > 0]
    km_al_litro = (sum(r["kmFatti"] for r in nell_anno) / sum(r["litri"] for r in nell_anno)) if nell_anno else None
    prezzi_anno = [r["prezzo"] for r in rif if r["data"] > dal and r["prezzo"] > 0]
    prezzi_recenti = [r["prezzo"] for r in rif if r["prezzo"] > 0][-RIFORNIMENTI_PREZZO:]
    if not km_al_litro or not prezzi_recenti:
        return {"disponibile": False, "motivo": "Mancano litri o prezzi nei rifornimenti."}

    # Inizio del mese in corso: per i km "finora" del mese.
    inizio_mese = date(oggi.year, oggi.month, 1)
    km_mese_finora = conta(ultimo) - conta(inizio_mese) if ultimo >= inizio_mese else 0.0

    rate = _rate_fisse(preset_uscite)
    return {
        "disponibile": True,
        "ultimoRifornimento": ultimo.isoformat(),
        "giorniUsati": finestra,
        "kmAlGiorno": round(ritmo, 2),
        "kmAnno": {"centrale": round(km_anno), "basso": round(max(0.0, km_anno - scarto_anno)), "alto": round(km_anno + scarto_anno)},
        "contachilometri": {"oggi": round(conta(ultimo)), "traUnAnno": round(conta(ultimo) + km_anno)},
        "kmMeseFinora": round(km_mese_finora),
        "kmAlLitro": round(km_al_litro, 2),
        "prezzo": {"attuale": round(float(np.median(prezzi_recenti)), 3),
                   "minimoAnno": round(min(prezzi_anno), 3) if prezzi_anno else None,
                   "massimoAnno": round(max(prezzi_anno), 3) if prezzi_anno else None,
                   "medioAnno": round(float(np.mean(prezzi_anno)), 3) if prezzi_anno else None},
        "rateFisse": {"mensile": round(sum(v["importo"] for v in rate), 2), "voci": rate},
        "storico": storico,
        "previsti": previsti,
        "affidabilita": _affidabilita_km(conta, ultimo),
        "rifornimenti": len(rif),
    }
