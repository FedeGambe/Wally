"""Regole e classificazione dei movimenti banca (dai vecchi test del frontend)."""
from backend.domain.classificazione import (
    classifica,
    conto_nella_causale,
    data_probabile,
    descrizione_breve,
    tutte_le_regole,
)


def mov(id_, conto, data, importo, descrizione=""):
    return {"id": id_, "conto": conto, "data": data, "importo": importo, "descrizione": descrizione}


def preset(nome, macro, categoria, importo):
    # Come nel tab "Preset Uscite Ricorrenti" del foglio di configurazione.
    return {"id": nome, "nome": nome, "macroCategoria": macro, "categoria": categoria, "conto": "Unicredit",
            "importo": importo, "giornoDelMese": 1, "primaria": True}


PRESET = [preset("Rata Assicurazione", "Automobile", "Assicurazione", 80),
          preset("Rata Bollo", "Tasse", "Bollo", 23),
          preset("Contributo Manutenzione", "Automobile", "Automobile", 50)]

# Importi MENSILI, eseguiti da Trade Republic anche in due metà (il 2 e il 16).
PRESET_INVESTIMENTI = [
    {"id": "a", "broker": "Trade Republic", "strumento": "MSCI World Small Cap", "importo": 80},
    {"id": "b", "broker": "Trade Republic", "strumento": "2036 Corp Bonds", "importo": 50},
    {"id": "c", "broker": "Trade Republic", "strumento": "2028 Euro Gov Bonds", "importo": 52},
    {"id": "d", "broker": "Trade Republic", "strumento": "FTSE Dev Asia", "importo": 50},
    {"id": "e", "broker": "Scalable", "strumento": "FTSE All-World", "importo": 135},
]

REGOLE = tutte_le_regole(PRESET, PRESET_INVESTIMENTI, ["Unicredit", "Trade Republic"],
                         ["Unicredit", "Trade Republic", "Scalable", "Santander", "Santander Vincolato"])


def classifica_per_id(movimenti):
    return {c["movimento"]["id"]: c for c in classifica(movimenti, REGOLE)}


def test_rate_dai_preset_stipendio_e_pac():
    r = classifica_per_id([
        mov("bollo", "Unicredit", "2026-10-01", -23, "DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER RATA BOLLO"),
        mov("manut", "Unicredit", "2026-10-01", -55, "DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER CONTRIBUTO MANUTENZIONE"),
        mov("stip", "Unicredit", "2026-09-11", 1627.97, "BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA ACME SRL PER STIPENDIO 08/2026"),
        mov("pac", "Unicredit", "2026-10-01", -245, "ADDEBITO SEPA DD PER FATTURA A VOSTRO CARICO Incasso SDD da DE00 Scalable Capital GmbH"),
        mov("comm", "Unicredit", "2026-09-30", -0.5, "COMMISSIONI - PROVVIGIONI - SPESE Incasso SDD da DE00 Scalable Capital GmbH"),
        mov("tr40", "Trade Republic", "2026-10-02", -40),
    ])
    assert r["bollo"]["proposta"] == {"tipo": "preset", "nome": "Rata Bollo"}
    # L'importo non vincola: se la rata cambia vale quello della banca.
    assert r["manut"]["proposta"] == {"tipo": "preset", "nome": "Contributo Manutenzione"}
    # Riconosciuto ma da confermare: il modulo Entrata aggiunge il fondo pensione.
    assert r["stip"]["esito"] == "da-confermare"
    assert r["stip"]["proposta"] == {"tipo": "entrata", "categoria": "Stipendio"}
    assert r["pac"]["proposta"] == {"tipo": "investimento", "broker": "Scalable"}
    assert r["comm"]["esito"] == "da-confermare"
    assert (r["tr40"]["esito"], r["tr40"]["proposta"]) == ("automatico", {"tipo": "investimento", "broker": "Trade Republic"})


def test_piani_trade_republic_importo_pieno_o_meta_nei_giorni_giusti():
    r = classifica_per_id([
        mov("d2-40", "Trade Republic", "2026-09-02", -40),
        mov("d2-25", "Trade Republic", "2026-09-02", -25),
        mov("d16-52", "Trade Republic", "2026-09-16", -52),
        mov("d18-40", "Trade Republic", "2026-08-18", -40),
        mov("d10-40", "Trade Republic", "2026-09-10", -40),
        mov("d2-30", "Trade Republic", "2026-09-02", -30),
    ])
    assert [r[k]["esito"] for k in ("d2-40", "d2-25", "d16-52", "d18-40")] == ["automatico"] * 4
    assert r["d10-40"]["esito"] == "da-confermare"
    assert r["d2-30"]["esito"] == "da-confermare"


def test_bonifico_a_te_stesso_verso_conto_non_collegato_da_confermare():
    r = classifica_per_id([
        mov("self", "Unicredit", "2026-08-13", -140, "DISPOSIZIONE DI BONIFICO BONIFICO ISTANTANEO A Federico Gamberini"),
        mov("selfin", "Unicredit", "2026-09-30", 500, "BONIFICO A VOSTRO FAVORE BONIFICO ISTANTANEO DA Federico Gamberini"),
    ])
    for k in ("self", "selfin"):
        assert r[k]["esito"] == "da-confermare" and r[k]["proposta"]["tipo"] == "trasferimento"


def test_bonifico_che_nomina_un_altro_conto():
    r = classifica_per_id([
        mov("sc", "Unicredit", "2026-10-05", -300, "DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER Giroconto Santander Vincolato"),
        mov("comm", "Unicredit", "2026-09-30", -0.5, "COMMISSIONI - PROVVIGIONI - SPESE Incasso SDD da DE00 Scalable Capital GmbH"),
    ])
    assert r["sc"]["esito"] == "da-confermare"
    assert (r["sc"]["proposta"]["contoOrdinante"], r["sc"]["proposta"]["contoBeneficiario"]) == ("Unicredit", "Santander Vincolato")
    assert "proposta" not in r["comm"]   # non è un bonifico: nessuna proposta


def test_conto_nella_causale_il_piu_lungo_vince():
    conti = ["Unicredit", "Santander", "Santander Vincolato", "Scalable"]
    assert conto_nella_causale("BONIFICO PER giroconto santander vincolato", conti, "Unicredit") == "Santander Vincolato"
    assert conto_nella_causale("BONIFICO PER Accredito Scalable - PAC", conti, "Unicredit") == "Scalable"
    assert conto_nella_causale("BONIFICO DA UNICREDIT", conti, "Unicredit") is None


def test_bonifico_a_te_stesso_con_l_altro_lato_e_un_giro():
    r = classifica_per_id([
        mov("self", "Unicredit", "2026-09-11", -1600, "DISPOSIZIONE DI BONIFICO BONIFICO ISTANTANEO A Federico Gamberini"),
        mov("tr", "Trade Republic", "2026-09-11", 1600),
    ])
    assert (r["self"]["esito"], r["self"]["regola"], r["self"]["proposta"]["contoBeneficiario"]) == \
        ("automatico", "giro tra conti", "Trade Republic")
    assert r["tr"]["esito"] == "lato-trasferimento"


def test_giri_tra_conti_collegati():
    r = classifica_per_id([
        mov("uc-out", "Unicredit", "2026-09-11", -1600, "BONIFICO ISTANTANEO A MARIO ROSSI"),
        mov("tr-in", "Trade Republic", "2026-09-11", 1600),
        mov("tr-out", "Trade Republic", "2026-09-06", -2000),
        mov("uc-in", "Unicredit", "2026-09-07", 2000, "BONIFICO A VOSTRO FAVORE DA MARIO ROSSI PER Accredito auto"),
    ])
    assert r["uc-out"]["esito"] == "automatico" and r["uc-out"]["abbinatoA"] == "tr-in"
    assert r["uc-out"]["proposta"] == {"tipo": "trasferimento", "contoOrdinante": "Unicredit", "contoBeneficiario": "Trade Republic"}
    assert (r["tr-in"]["esito"], r["tr-in"]["abbinatoA"]) == ("lato-trasferimento", "uc-out")
    assert (r["tr-out"]["proposta"]["contoOrdinante"], r["tr-out"]["proposta"]["contoBeneficiario"]) == ("Trade Republic", "Unicredit")
    assert r["uc-in"]["esito"] == "lato-trasferimento"


def test_nessun_abbinamento_sullo_stesso_conto_o_lontano_nel_tempo():
    r = classifica_per_id([mov("a", "Trade Republic", "2026-09-01", -75), mov("b", "Trade Republic", "2026-09-01", 75),
                           mov("c", "Unicredit", "2026-09-20", 75)])
    assert [r[k]["esito"] for k in "abc"] == ["da-confermare"] * 3


def test_spesa_con_carta_trade_republic_da_confermare():
    assert classifica_per_id([mov("x", "Trade Republic", "2026-10-06", -97.47)])["x"]["esito"] == "da-confermare"


def test_data_probabile():
    # Spese Trade Republic: il giorno prima della contabilizzazione, anche a cavallo del mese.
    assert data_probabile(mov("a", "Trade Republic", "2026-10-11", -16.9)) == "2026-10-10"
    assert data_probabile(mov("b", "Trade Republic", "2026-11-01", -5)) == "2026-10-31"
    # Entrate Trade Republic e movimenti UniCredit: la data della banca.
    assert data_probabile(mov("c", "Trade Republic", "2026-10-11", 1600)) == "2026-10-11"
    assert data_probabile(mov("d", "Unicredit", "2026-10-11", -43.5)) == "2026-10-11"


def test_descrizione_breve():
    assert descrizione_breve("BONIFICO SEPA A MARIO ROSSI PER Cena da Gino ") == "Cena da Gino"
    assert descrizione_breve("") == ""
