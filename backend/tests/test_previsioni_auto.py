"""Previsioni dell'auto: km dei prossimi 12 mesi, consumo, prezzo e rate fisse."""
from datetime import date, timedelta

import pytest

from backend.domain.previsioni import calcola_previsioni
from backend.domain.previsioni.auto import previsione_auto

OGGI = date(2026, 11, 19)


def rifornimenti(giorni: int, km_al_giorno=50.0, ogni=7, prezzo=1.8, km_al_litro=20.0, fino_a=date(2026, 11, 15)):
    """Un rifornimento ogni `ogni` giorni per `giorni` giorni, a ritmo costante."""
    righe, km = [], 60000.0
    inizio = fino_a - timedelta(days=giorni)
    for g in range(0, giorni + 1, ogni):
        d = inizio + timedelta(days=g)
        fatti = 0 if g == 0 else km_al_giorno * ogni
        km += fatti
        litri = fatti / km_al_litro if fatti else 30
        righe.append({"data": d.strftime("%d/%m/%Y"), "kmFinali": km, "kmEffettuati": fatti, "quantitaLitri": litri,
                      "prezzoAlLitro": prezzo, "costo": round(litri * prezzo, 2)})
    return righe


PRESET = [
    {"nome": "Rata Assicurazione", "macroCategoria": "Automobile", "categoria": "Assicurazione", "importo": 80},
    {"nome": "Rata Bollo", "macroCategoria": "Tasse", "categoria": "Bollo", "importo": 23},
    {"nome": "Spotify", "macroCategoria": "Abbonamenti", "categoria": "Spotify", "importo": 11},
]


def test_ritmo_costante_da_i_km_giusti():
    r = previsione_auto(rifornimenti(400), PRESET, OGGI)
    assert r["disponibile"]
    assert r["kmAlGiorno"] == pytest.approx(50, rel=0.01)
    assert r["kmAnno"]["centrale"] == pytest.approx(50 * 365, rel=0.01)
    assert r["kmAnno"]["basso"] <= r["kmAnno"]["centrale"] <= r["kmAnno"]["alto"]
    assert r["kmAlLitro"] == pytest.approx(20)
    assert r["prezzo"]["attuale"] == pytest.approx(1.8)
    assert r["affidabilita"]["erroreMedio"] == pytest.approx(0, abs=0.01)
    # Dodici mesi previsti da dicembre; mesi veri interi fino a ottobre.
    assert [p["mese"] for p in r["previsti"]][:2] == ["2026-12", "2027-01"] and len(r["previsti"]) == 12
    assert r["storico"][-1]["mese"] == "2026-10" and len(r["storico"]) == 12


def test_usa_solo_l_ultimo_anno():
    vecchi = rifornimenti(300, km_al_giorno=100, fino_a=date(2025, 11, 1))
    nuovi = rifornimenti(380, km_al_giorno=40)
    for riga in nuovi:  # stesso contachilometri: riparte da dove era arrivato
        riga["kmFinali"] += vecchi[-1]["kmFinali"]
    r = previsione_auto(vecchi + nuovi, [], OGGI)
    assert r["giorniUsati"] == 365
    assert r["kmAlGiorno"] == pytest.approx(40, rel=0.02)


def test_prezzo_e_la_mediana_degli_ultimi_rifornimenti():
    righe = rifornimenti(200)
    for riga, prezzo in zip(righe[-4:], [1.9, 2.0, 2.1, 5.0]):
        riga["prezzoAlLitro"] = prezzo
    assert previsione_auto(righe, [], OGGI)["prezzo"]["attuale"] == pytest.approx(2.05)


def test_rate_fisse_solo_dell_auto():
    r = previsione_auto(rifornimenti(200), PRESET, OGGI)
    assert r["rateFisse"]["mensile"] == 103
    assert [v["nome"] for v in r["rateFisse"]["voci"]] == ["Rata Assicurazione", "Rata Bollo"]


@pytest.mark.parametrize("righe", [[], rifornimenti(14), rifornimenti(60)])
def test_pochi_dati_non_disponibile(righe):
    r = previsione_auto(righe, [], OGGI)
    assert not r["disponibile"] and r["motivo"]


def test_ignora_righe_future_e_vuote():
    righe = rifornimenti(200) + [{"data": "01/01/2027", "kmFinali": 999999}, {"data": "", "kmFinali": ""}]
    assert previsione_auto(righe, [], OGGI)["contachilometri"]["oggi"] < 999999


def test_dentro_calcola_previsioni():
    r = calcola_previsioni({"analisiConsumi": rifornimenti(200), "presetUscite": PRESET}, OGGI)
    assert r["auto"]["disponibile"]
