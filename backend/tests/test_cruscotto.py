import pytest

from backend.domain.cruscotto import calcola_cruscotto, leggi_mese


@pytest.mark.parametrize("testo, atteso", [
    ("Lug 25", (2025, 7)),
    ("Giugno 2026", (2026, 6)),
    ("2026-06", (2026, 6)),
    ("12/2025", (2025, 12)),
    ("Lug", None),
    ("Pippo 2026", None),
    ("", None),
])
def test_leggi_mese(testo, atteso):
    assert leggi_mese(testo) == atteso


def test_cruscotto_somma_i_versamenti_e_cumula_gli_anni():
    dati = {
        # Ogni riga è il versamento del solo mese, per strumento.
        "scalable": [
            {"mese": "Dic 25", "vwce": 100, "bondEu": 50, "commissioniomulative": 1},
            {"mese": "Gen 26", "vwce": 200, "bondEu": 0, "commissioniomulative": 0},
        ],
        "scalableColumnCategories": {"vwce": "azioni", "bondEu": "azioni"},  # "bond" nel nome vince
        "tradeRepublic": [{"mese": "Gen 26", "msci": 30, "commissioniomulative": 2}],
        "tradeRepublicColumnCategories": {"msci": "azioni"},
        "rendimentiInvestimenti": [
            {"mese": "Nov 25", "rendimentoMensileEuro": 5, "rendimentoMensilePerc": 1, "rendimentoCumulativoEuro": 5},
            {"mese": "Dic 25", "rendimentoMensileEuro": 0, "rendimentoMensilePerc": 0, "rendimentoCumulativoEuro": 0},
            {"mese": "Gen 26", "rendimentoMensileEuro": 9, "rendimentoMensilePerc": 2, "rendimentoCumulativoEuro": 14},
        ],
    }
    anno_2026, anno_2025 = calcola_cruscotto(dati)

    assert anno_2025["anno"] == 2025
    assert anno_2025["azioniInvestitoAnno"] == 100
    assert anno_2025["obbligazioniInvestitoAnno"] == 50
    assert anno_2025["commissioniInvestitoCum"] == 1
    assert anno_2025["investitoCumulativo"] == 151
    # Dicembre vuoto: il cumulato è quello di novembre, la media solo sui mesi registrati.
    assert anno_2025["rendimentoCumulativoEuro"] == 5
    assert anno_2025["rendimentoMedioMensilePerc"] == 1
    assert anno_2025["rendimentoAnnuoStimatoPerc"] == 12

    assert anno_2026["azioniInvestitoAnno"] == 230
    assert anno_2026["azioniInvestitoCum"] == 330
    # Scalable a gennaio non ha commissioni: vale l'ultimo valore scritto (1).
    assert anno_2026["commissioniInvestitoCum"] == 3
    assert anno_2026["commissioniInvestitoAnno"] == 2
    assert anno_2026["rendimentoAnnualeEuro"] == 9


def test_cruscotto_vuoto_senza_dati():
    assert calcola_cruscotto({}) == []
