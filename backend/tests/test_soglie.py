from backend.domain.soglie import dal_da_testo, matrice_soglie, soglie_da_righe, soglie_del_mese


def test_dal_da_testo_nei_formati_del_foglio():
    assert dal_da_testo("2026-11") == "2026-11"
    assert dal_da_testo("2026-11-01") == "2026-11"
    assert dal_da_testo("01/11/2026") == "2026-11"
    assert dal_da_testo("1/3/26") == "2026-03"
    assert dal_da_testo("Novembre 2026") == "2026-11"
    assert dal_da_testo("11/2026") == "2026-11"
    assert dal_da_testo("") == ""
    assert dal_da_testo("boh") == ""


SOGLIE = [
    {"categoria": "Spese Primarie", "percentuale": 35},
    {"categoria": "Spese Primarie", "percentuale": 40, "dal": "2026-11"},
    {"categoria": "Risparmio", "percentuale": 20, "dal": "2026-06"},
    {"categoria": "Risparmio", "percentuale": 25, "dal": "2026-01"},
]


def _perc(soglie, nome):
    return next(s["percentuale"] for s in soglie if s["categoria"] == nome)


def test_ogni_mese_prende_la_versione_valida_allora():
    assert _perc(soglie_del_mese(SOGLIE, 2026, 10), "Spese Primarie") == 35
    assert _perc(soglie_del_mese(SOGLIE, 2026, 11), "Spese Primarie") == 40
    assert _perc(soglie_del_mese(SOGLIE, 2027, 2), "Spese Primarie") == 40
    assert _perc(soglie_del_mese(SOGLIE, 2026, 3), "Risparmio") == 25
    assert _perc(soglie_del_mese(SOGLIE, 2026, 7), "Risparmio") == 20


def test_prima_di_tutte_le_versioni_vale_la_piu_vecchia():
    assert _perc(soglie_del_mese(SOGLIE, 2025, 5), "Risparmio") == 25
    assert len(soglie_del_mese(SOGLIE, 2025, 5)) == 2


def test_matrice_una_riga_per_periodo_con_tutte_le_categorie():
    assert matrice_soglie(SOGLIE) == [
        ["Dal", "Spese Primarie", "Risparmio"],
        ["", 0.35, 0.25],
        ["2026-01-01", 0.35, 0.25],
        ["2026-06-01", 0.35, 0.2],
        ["2026-11-01", 0.4, 0.2],
    ]


def test_matrice_e_lettura_tornano_alle_stesse_soglie_per_ogni_mese():
    letto = soglie_da_righe([[str(c) for c in r] for r in matrice_soglie(SOGLIE)])
    for anno, mese in [(2025, 5), (2026, 1), (2026, 7), (2026, 11), (2027, 3)]:
        attese = {s["categoria"]: s["percentuale"] for s in soglie_del_mese(SOGLIE, anno, mese)}
        ottenute = {s["categoria"]: s["percentuale"] for s in soglie_del_mese(letto, anno, mese)}
        assert ottenute == attese
