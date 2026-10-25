from backend.domain.righe import nome_campo, righe_in_oggetti


def test_nome_campo_dalle_intestazioni_dei_broker():
    assert nome_campo(" 2029 Corp Bond".strip()) == "col2029CorpBond"
    assert nome_campo("Vanguard FTSE All-World") == "vanguardFtseAllWorld"
    assert nome_campo("Azioni & Bond") == "azioniAndBond"
    assert nome_campo("Liquidità") == "liquidita"
    assert nome_campo("") == "column"


def test_righe_con_colonne_in_ordine_diverso_e_celle_vuote():
    righe = [
        ["Importo", "Data", "Primarie", "Descrizione della transazione"],
        ["1.234,56", "01/10/2026", "SI", "Spesa"],
        ["", "02/10/2026", "", ""],
    ]
    oggetti = righe_in_oggetti(righe, ["data", "descrizione", "importo", "primaria"],
                               ["Data", "Descrizione della transazione", "Importo", "Primarie"],
                               booleani=["primaria"], numerici=["importo"])
    assert oggetti[0] == {"data": "01/10/2026", "descrizione": "Spesa", "importo": 1234.56,
                          "primaria": True, "id": "01/10/2026-Spesa-1234.56-1"}
    assert oggetti[1] == {"data": "02/10/2026", "descrizione": "", "importo": 0,
                          "primaria": False, "id": "02/10/2026-2"}


def test_id_con_importo_intero_come_javascript():
    [oggetto] = righe_in_oggetti([["Importo"], ["23"]], ["importo"], ["Importo"], numerici=["importo"])
    assert oggetto["id"] == "23-1"


def test_risparmio_non_confuso_con_andamento_risparmio():
    righe = [["Mese", "Andamento Risparmio", "Risparmio totale"], ["Gen", "10", "500"]]
    [oggetto] = righe_in_oggetti(righe, ["mese", "risparmio", "andamentoRisparmio"],
                                 ["Mese", "Risparmio", "Andamento Risparmio"],
                                 numerici=["risparmio", "andamentoRisparmio"])
    assert oggetto["risparmio"] == 500
    assert oggetto["andamentoRisparmio"] == 10


def test_refuso_comulativo_riconosciuto():
    righe = [["Mese", "Rendimento cumulativo"], ["Gen", "7"]]
    [oggetto] = righe_in_oggetti(righe, ["mese", "rendimentoCumulativoEuro"], ["Mese", "Rendimento comulativo"],
                                 numerici=["rendimentoCumulativoEuro"])
    assert oggetto["rendimentoCumulativoEuro"] == 7


def test_foglio_senza_righe_dati():
    assert righe_in_oggetti([["Data"]], ["data"], ["Data"]) == []
    assert righe_in_oggetti([], ["data"], ["Data"]) == []
