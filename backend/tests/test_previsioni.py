"""Previsioni: serie pulite, modello mensile, fine mese, patrimonio e rotta."""
from datetime import date

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.domain.previsioni import calcola_previsioni
from backend.domain.previsioni.fine_mese import previsione_fine_mese
from backend.domain.previsioni.modello_mensile import prevedi_serie, stima
from backend.domain.previsioni.patrimonio import Ipotesi, Rendimento, proiezione, situazione, storico
from backend.domain.previsioni.serie import chiave_mese, indice_mese, serie_fondo_pensione, serie_risparmio
from backend.routes import previsioni as rotta

MESI_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre",
           "Ottobre", "Novembre", "Dicembre"]
OGGI = date(2026, 10, 15)


def righe_risparmio(n_mesi: int, entrate=2000.0, spese=1200.0, investito=300.0, fino_a=(2026, 9)):
    """n_mesi righe consecutive che finiscono a `fino_a`, più 3 righe future a zero come sul foglio."""
    fine = indice_mese(*fino_a)
    righe = []
    for m in range(fine - n_mesi + 1, fine + 4):
        anno, mese = divmod(m, 12)
        futuro = m > fine
        righe.append({"mese": MESI_IT[mese], "anno": anno, "entrate": 0 if futuro else entrate,
                      "speseTotali": 0 if futuro else spese, "spesePrimarie": 0 if futuro else spese * 0.6,
                      "speseSecondarie": 0 if futuro else spese * 0.4, "investito": 0 if futuro else investito,
                      "risparmioNetto": 0 if futuro else entrate - spese - investito})
    return righe


# --- serie ---------------------------------------------------------------------

def test_serie_risparmio_toglie_i_mesi_futuri():
    righe = serie_risparmio(righe_risparmio(12), OGGI)
    assert len(righe) == 12
    assert chiave_mese(righe[-1]["mese"]) == "2026-09"


def test_fondo_pensione_anno_ricavato_a_ritroso():
    righe = [{"mese": " Percentuale"}, {"mese": "novembre", "totMensile": 1}, {"mese": "dicembre", "totMensile": 2},
             {"mese": "gennaio", "totMensile": 3}]
    fondo = serie_fondo_pensione(righe, date(2026, 3, 10))
    assert {chiave_mese(k): v for k, v in fondo.items()} == {"2025-11": 1, "2025-12": 2, "2026-01": 3}


def test_fondo_pensione_con_anno_nel_mese():
    fondo = serie_fondo_pensione([{"mese": "Gen 26", "totMensile": 195}], OGGI)
    assert fondo == {indice_mese(2026, 1): 195}


# --- modello mensile ---------------------------------------------------------------

def test_serie_costante_previsione_esatta_e_fascia_nulla():
    mesi = list(range(indice_mese(2024, 1), indice_mese(2026, 1)))
    p = prevedi_serie([1000.0] * len(mesi), mesi, 3)
    assert np.allclose(p["centrale"], 1000)
    assert np.allclose(p["basso"], 1000) and np.allclose(p["alto"], 1000)
    assert p["erroreMedio"] == 0


def test_stagionalita_imparata():
    # Dicembre sempre +600 (tredicesima): con 4 anni l'effetto si vede quasi tutto.
    mesi = list(range(indice_mese(2022, 1), indice_mese(2026, 1)))
    valori = np.array([2000.0 + (600 if m % 12 == 11 else 0) for m in mesi])
    modello = stima(valori, mesi)
    dicembre, giugno = modello.prevedi([indice_mese(2026, 12), indice_mese(2026, 6)])
    assert dicembre - giugno > 400


def test_fascia_bassa_tagliata_a_zero():
    mesi = list(range(indice_mese(2025, 1), indice_mese(2026, 1)))
    valori = [100.0, 900.0] * 6
    p = prevedi_serie(valori, mesi, 2, minimo=0.0)
    assert (p["basso"] >= 0).all()


# --- A. fine mese ----------------------------------------------------------------

def uscita(g, m, a, importo, primaria=False, descrizione="spesa"):
    return {"data": f"{g:02d}/{m:02d}/{a}", "importo": importo, "primaria": primaria, "descrizione": descrizione}


def test_fine_mese_somma_speso_fissi_e_variabile():
    uscite = []
    for m in range(4, 10):  # aprile-settembre: 100 prima del 15, 200 dopo, affitto fisso il 20
        uscite += [uscita(5, m, 2026, 100), uscita(25, m, 2026, 200), uscita(20, m, 2026, 500, True, "Affitto")]
    uscite.append(uscita(3, 10, 2026, 80))
    preset = [{"nome": "Affitto", "importo": 500, "primaria": True, "giornoDelMese": 20}]
    entrate = [{"mese": "Ottobre", "anno": 2026, "importo": 2000}]
    r = previsione_fine_mese(uscite, preset, entrate, [], OGGI)
    assert r["disponibile"]
    assert r["spesoFinora"]["totale"] == 80
    assert r["fissiInArrivo"] == [{"nome": "Affitto", "importo": 500, "giorno": 20}]
    # 80 già spesi + 500 di affitto + 200 variabili dopo il 15 (sempre uguali)
    assert r["stima"]["totale"] == {"basso": 780, "centrale": 780, "alto": 780}
    primarie = next(s for s in r["soglie"] if s["nome"] == "Spese Primarie")
    assert primarie["limite"] == 700 and primarie["probabilitaSforamento"] == 0
    secondarie = next(s for s in r["soglie"] if s["nome"] == "Spese Secondarie")
    assert secondarie["limite"] == 300 and secondarie["probabilitaSforamento"] == 0
    assert r["affidabilita"]["erroreMedio"] == 0
    assert r["curva"][-1]["centrale"] == 780


def test_fine_mese_preset_gia_registrato_non_conta_due_volte():
    uscite = [uscita(5, m, 2026, 100) for m in range(6, 10)] + [uscita(1, 10, 2026, 500, True, "Affitto")]
    preset = [{"nome": "Affitto", "importo": 500, "primaria": True, "giornoDelMese": 1}]
    r = previsione_fine_mese(uscite, preset, [], [], OGGI)
    assert r["fissiInArrivo"] == []
    assert r["stima"]["totale"]["centrale"] == 500


def test_fine_mese_senza_storia():
    assert not previsione_fine_mese([uscita(1, 10, 2026, 5)], [], [], [], OGGI)["disponibile"]


# --- C. patrimonio -----------------------------------------------------------------

def test_storico_divide_la_crescita():
    risparmio = righe_risparmio(3)
    rendimenti = [{"mese": "Settembre 2026", "rendimentoMensileEuro": 50}]
    fondo = [{"mese": "settembre", "totMensile": 100}]
    s = storico(risparmio, rendimenti, fondo, OGGI)
    ultimo = s["mesi"][-1]
    assert ultimo["cumulato"] == {"risparmio": 1500, "versamenti": 900, "mercato": 50, "fondoPensione": 100}
    assert ultimo["tassoRisparmio"] == 0.4
    assert s["ultimi12"]["totale"] == 2550


def test_situazione_riconosce_il_fondo_pensione():
    conti = [{"categoria": "Conto", "capitaleTotale": 5000, "capitaleInvestito": 0},
             {"categoria": "Broker", "capitaleTotale": 3000, "capitaleInvestito": 2500},
             {"categoria": "Fondo Unicredit", "capitaleTotale": 1000, "capitaleInvestito": 1000}]
    s = situazione(conti, [{"categoria": "Auto", "capitaleImpegnato": 500}], spese_medie=1000)
    assert (s["totale"], s["liquidita"], s["investimenti"], s["fondoPensione"]) == (9000, 5500, 2500, 1000)
    assert s["liquiditaLibera"] == 5000 and s["mesiAutonomia"] == 5.0 and s["anniDiSpese"] == 0.8


def test_proiezione_senza_incertezza_e_conto_esatto():
    # Volatilità zero e avanzo fisso: un solo futuro possibile, calcolabile a mano.
    ipotesi = Ipotesi(anni=1, includi_fondo=True, rendimenti={k: Rendimento(0, 0) for k in
                                          ("azioni", "obbligazioni", "monetari", "fondoPensione")})
    oggi = {"totale": 10000, "liquidita": 6000, "investimenti": 4000, "fondoPensione": 0}
    previsione = {"mesi": [indice_mese(2026, 10)], "centrale": np.full(12, 500.0), "deviazione": 0.0}
    r = proiezione(oggi, {"azioni": 1, "obbligazioni": 0, "monetari": 0}, 300, 100, previsione, 2000, 500,
                   ipotesi, indice_mese(2026, 11))
    ultimo = r["punti"][-1]
    assert ultimo["mese"] == "2027-10"
    assert ultimo["p10"] == ultimo["p90"] == 10000 + 12 * (500 + 100)
    assert r["pacNonCoperto"]["probabilita"] == 0
    # Ripartizione: PAC 300 al mese negli investimenti, il resto (200 + fondo 100) dove deve andare.
    finale = r["punti"][-1]["ripartizione"]
    assert finale["investimenti"]["importo"] == pytest.approx(4000 + 12 * 300)
    assert finale["liquidita"]["importo"] == pytest.approx(6000 + 12 * 200)
    assert finale["fondoPensione"]["importo"] == pytest.approx(12 * 100)
    assert r["ripartizioneOggi"]["liquidita"]["quota"] == 0.6


def test_fondo_pensione_escluso_di_default():
    # Fondo da 1000 oggi e 100 al mese: di default non entra nella proiezione.
    ipotesi = Ipotesi(anni=1, rendimenti={k: Rendimento(0, 0) for k in
                                          ("azioni", "obbligazioni", "monetari", "fondoPensione")})
    oggi = {"totale": 11000, "liquidita": 6000, "investimenti": 4000, "fondoPensione": 1000}
    previsione = {"mesi": [indice_mese(2026, 10)], "centrale": np.full(12, 500.0), "deviazione": 0.0}
    r = proiezione(oggi, {"azioni": 1, "obbligazioni": 0, "monetari": 0}, 300, 100, previsione, 2000, 500,
                   ipotesi, indice_mese(2026, 11))
    assert r["partenza"] == 10000 and not r["fondoIncluso"]
    assert r["punti"][-1]["p50"] == r["punti"][-1]["soloVersamenti"] == 10000 + 12 * 500
    assert Ipotesi.da_dizionario({"includiFondoPensione": True}).includi_fondo


def test_pac_ridotto_quando_i_conti_si_svuotano():
    ipotesi = Ipotesi(anni=1, rendimenti={k: Rendimento(0, 0) for k in
                                          ("azioni", "obbligazioni", "monetari", "fondoPensione")})
    oggi = {"totale": 1000, "liquidita": 1000, "investimenti": 0, "fondoPensione": 0}
    previsione = {"mesi": [indice_mese(2026, 10)], "centrale": np.full(12, 100.0), "deviazione": 0.0}
    r = proiezione(oggi, {"azioni": 1, "obbligazioni": 0, "monetari": 0}, 600, 0, previsione, 2000, 100,
                   ipotesi, indice_mese(2026, 11))
    # 1000 + 100 al mese, 600 di PAC: al terzo mese (gennaio) i conti non bastano.
    assert r["pacNonCoperto"] == {"probabilita": 1.0, "meseProbabile": "2027-01"}
    assert r["punti"][-1]["p50"] == 1000 + 12 * 100  # il patrimonio non cambia: i soldi passano solo di conto


def test_obiettivo_probabilita_cresce_nel_tempo():
    risparmio = righe_risparmio(36)
    dati = {"risparmio": risparmio, "patrimonio": [{"categoria": "Conto", "capitaleTotale": 20000}]}
    r = calcola_previsioni(dati, OGGI, {"obiettivo": 40000, "anni": 10})
    per_anno = [a["probabilita"] for a in r["patrimonio"]["proiezione"]["obiettivo"]["perAnno"]]
    assert per_anno == sorted(per_anno) and per_anno[-1] > 0.9


def test_stessi_dati_stesso_risultato():
    dati = {"risparmio": righe_risparmio(30), "patrimonio": [{"categoria": "Conto", "capitaleTotale": 5000}]}
    assert calcola_previsioni(dati, OGGI) == calcola_previsioni(dati, OGGI)


def test_dati_vuoti_non_si_rompe():
    r = calcola_previsioni({}, OGGI)
    assert not r["fineMese"]["disponibile"] and not r["flussi"]["disponibile"]
    assert not r["patrimonio"]["disponibile"]


# --- rotta -------------------------------------------------------------------------

client = TestClient(app)


def test_rotta_senza_token():
    assert client.post("/api/previsioni", json={"dati": {}}).status_code == 401


def test_rotta_controlla_il_proprietario_una_volta(monkeypatch):
    chiamate = []
    monkeypatch.setattr(rotta, "da_proprietario", lambda request: chiamate.append(1) or True)
    rotta._token_controllati.clear()
    corpo = {"dati": {"risparmio": righe_risparmio(24)}, "oggi": "2026-10-15"}
    for _ in range(3):
        res = client.post("/api/previsioni", json=corpo, headers={"Authorization": "Bearer t"})
        assert res.status_code == 200
    assert len(chiamate) == 1
    assert res.json()["flussi"]["disponibile"]


@pytest.fixture(autouse=True)
def _pulisci_cache():
    yield
    rotta._token_controllati.clear()


# --- stipendio e voci straordinarie --------------------------------------------------

from backend.domain.previsioni import stipendio as modulo_stipendio
from backend.domain.previsioni.flussi import previsioni_flussi
from backend.domain.previsioni.stipendio import prevedi_stipendio, quota_extra
from backend.domain.previsioni.straordinarie import straordinarie_per_mese, uscite_straordinarie

CAMBI_PROVA = [{"mese": "2025-09", "nome": "Tirocinio", "mensilita_extra": False},
               {"mese": "2026-03", "nome": "Assunzione", "mensilita_extra": True}]


@pytest.fixture
def cambi(monkeypatch):
    monkeypatch.setattr(modulo_stipendio, "CAMBI_STIPENDIO", CAMBI_PROVA)


def test_mensilita_extra_per_i_mesi_lavorati():
    assunzione = indice_mese(2026, 3)
    assert quota_extra(indice_mese(2026, 7), assunzione) == ("Quattordicesima", 4 / 12)   # marzo-giugno
    assert quota_extra(indice_mese(2026, 12), assunzione) == ("Tredicesima", 10 / 12)     # marzo-dicembre
    assert quota_extra(indice_mese(2027, 7), assunzione) == ("Quattordicesima", 1.0)
    assert quota_extra(indice_mese(2026, 10), assunzione) is None


def test_stipendio_dal_periodo_attuale_con_resa_delle_extra(cambi):
    stipendi = {indice_mese(2025, m): 900 for m in range(10, 13)}
    stipendi |= {indice_mese(2026, m): 900 for m in (1, 2, 3)}                # tirocinio
    stipendi |= {indice_mese(2026, m): 1600 for m in (4, 5, 6, 8, 9)}        # assunto
    stipendi[indice_mese(2026, 7)] = 1600 + 1600 * 4 / 12 * 0.75             # quattordicesima al 75%
    futuri = [indice_mese(2026, 10), indice_mese(2026, 12)]
    p = prevedi_stipendio(stipendi, indice_mese(2026, 9), futuri)
    assert p["tipico"] == 1600 and p["periodo"]["dal"] == "2026-04"
    assert p["resa"] == pytest.approx(0.75)
    assert p["centrale"][0] == 1600
    assert p["centrale"][1] == pytest.approx(1600 + 1600 * 10 / 12 * 0.75)


def test_stipendio_periodo_troppo_corto(cambi):
    assert prevedi_stipendio({indice_mese(2026, 4): 1600}, indice_mese(2026, 4), [indice_mese(2026, 5)]) is None


def test_uscite_straordinarie_anche_la_seconda_rata_con_stessa_descrizione():
    uscite = [uscita(3, 9, 2025, 5000, descrizione="Saldo auto"), uscita(5, 9, 2025, 900, descrizione="Saldo auto"),
              uscita(10, 9, 2025, 447, descrizione="Assicurazione"), uscita(5, 10, 2025, 900, descrizione="Saldo auto")]
    assert uscite_straordinarie(uscite) == {0, 1}


def test_entrate_straordinarie_ma_mai_lo_stipendio():
    entrate = [{"mese": "Settembre", "anno": 2025, "categoria": "Nonna", "importo": 2350},
               {"mese": "Dicembre", "anno": 2026, "categoria": "Stipendio", "importo": 3000},
               {"mese": "Ottobre", "anno": 2025, "categoria": "Nonna", "importo": 100}]
    _, per_entrate, elenco = straordinarie_per_mese([], entrate)
    assert per_entrate == {indice_mese(2025, 9): 2350}
    assert [e["descrizione"] for e in elenco] == ["Nonna"]


def test_flussi_senza_auto_e_con_stipendio_nuovo(cambi):
    # 24 mesi a 900 di spese; a settembre 2026 l'auto (+5000). Stipendio 900 poi 1600 da aprile 2026.
    risparmio, uscite, entrate = [], [], []
    for m in range(indice_mese(2024, 10), indice_mese(2026, 10)):
        anno, mese = divmod(m, 12)
        stip = 1600 if m >= indice_mese(2026, 4) else 900
        if m == indice_mese(2026, 7):
            stip += 1600 * 4 / 12  # quattordicesima per marzo-giugno, netta piena
        auto = 5000 if m == indice_mese(2026, 9) else 0
        risparmio.append({"mese": MESI_IT[mese], "anno": anno, "entrate": stip + 100, "speseTotali": 900 + auto})
        entrate += [{"mese": MESI_IT[mese], "anno": anno, "categoria": "Stipendio", "importo": stip},
                    {"mese": MESI_IT[mese], "anno": anno, "categoria": "Nonna", "importo": 100}]
        uscite.append(uscita(5, mese + 1, anno, 900))
        if auto:
            uscite.append(uscita(10, mese + 1, anno, auto, descrizione="Restante auto"))
    f = previsioni_flussi(risparmio, OGGI, uscite, entrate)
    ottobre = f["previsti"][0]
    assert ottobre["mese"] == "2026-10"
    assert ottobre["entrate"]["centrale"] == pytest.approx(1700, abs=1)
    assert ottobre["spese"]["centrale"] == pytest.approx(900, abs=1)
    assert f["straordinarie"][0]["descrizione"] == "Restante auto"
    assert f["storico"][-1]["straordinarieUscite"] == 5000 and f["storico"][-1]["spese"] == 900
    dicembre = f["previsti"][2]
    assert dicembre["entrate"]["centrale"] == pytest.approx(1700 + 1600 * 10 / 12, abs=1)


def test_fine_mese_non_ripete_l_auto_dei_mesi_passati():
    uscite = [uscita(20, m, 2026, 100) for m in range(4, 10)] + [uscita(25, 9, 2026, 4500, descrizione="Restante auto")]
    r = previsione_fine_mese(uscite, [], [], [], OGGI)
    assert r["stima"]["totale"]["alto"] == 100
