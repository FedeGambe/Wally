from backend.domain.lettura import (
    colonne_strumenti,
    dati_base,
    dati_principali,
    preset_investimenti_da_matrice,
    strumenti_attivi,
)


def vr(titolo, righe):
    """Un valueRange come lo restituisce batchGet."""
    return {"range": f"'{titolo}'!A1:Z100", "values": righe}


# --- Broker -----------------------------------------------------------------

BROKER = [
    ["Mese", "Saldo Conto", " 2029 Corp Bond", "FTSE All-World", "Liquidità"],
    ["", "", " Obbligazioni", "Azioni", "Conto"],
    ["Gen 26", "1000", "50", "100", "10"],
    ["Feb 26", "1100", "", "120", "5"],
    ["", "", "", "", ""],
]


def test_obbligazioni_non_scambiate_per_azioni():
    # "obbligazioni" contiene la parola "azioni": va riconosciuta per prima.
    assert colonne_strumenti(BROKER) == [
        ("col2029CorpBond", "2029 Corp Bond", "obbligazioni"),
        ("ftseAllWorld", "FTSE All-World", "azioni"),
    ]


def test_strumenti_attivi_dall_ultima_riga_con_data():
    strumenti = strumenti_attivi(BROKER)
    assert [(s["nome"], s["tipo"], s["importoInvestito"]) for s in strumenti] == [("FTSE All-World", "Azioni", 120)]


# --- Preset Investimenti (matrice) -------------------------------------------

MATRICE = [
    ["Conto", "Europe 600", "MSCI World Value Factor", "FTSE All-World", "MSCI World Small Cap", "FTSE Dev Asia",
     "2036 Corp Bonds", "2028 Euro Gov Bonds"],
    ["Scalable", "40", "70", "135"],
    ["Trade Republic", "", "", "", "80", "50", "50", "52"],
]


def test_preset_investimenti_una_voce_per_cella_valorizzata():
    assert [(p["broker"], p["strumento"], p["importo"]) for p in preset_investimenti_da_matrice(MATRICE)] == [
        ("Scalable", "Europe 600", 40),
        ("Scalable", "MSCI World Value Factor", 70),
        ("Scalable", "FTSE All-World", 135),
        ("Trade Republic", "MSCI World Small Cap", 80),
        ("Trade Republic", "FTSE Dev Asia", 50),
        ("Trade Republic", "2036 Corp Bonds", 50),
        ("Trade Republic", "2028 Euro Gov Bonds", 52),
    ]


def test_preset_investimenti_importi_italiani_e_celle_vuote():
    preset = preset_investimenti_da_matrice([["Conto", "A", "B"], ["Scalable", "€139,22", ""]])
    assert len(preset) == 1
    assert preset[0]["importo"] == 139.22


# --- Foglio di configurazione -------------------------------------------------

def test_dati_base_dal_foglio_di_configurazione():
    value_ranges = [
        vr("Conti", [["Conto"], ["Unicredit"], [""], ["Trade Republic"]]),
        vr("Categorie Uscite", [["Macro Categoria", "Icona", "Categoria"], ["Casa", "🏠", "Affitto"],
                                ["Casa", "", "Bollette"], ["Svago", "", ""]]),
        vr("Soglie", [["Categoria", "Percentuale"], ["Primarie", "0,35"], ["Extra", "40"]]),
        vr("Preset Fondo Pensione", [["Quota Fondo Pensione"], ["120,50"]]),
    ]
    titoli = ["Conti", "Categorie Uscite", "Soglie", "Preset Fondo Pensione"]
    dati = dati_base(value_ranges, titoli)
    assert dati["conti"] == ["Unicredit", "Trade Republic"]
    assert dati["macroCategorieUscite"] == [
        {"nome": "Casa", "icon": "🏠", "categorie": ["Affitto", "Bollette"]},
        {"nome": "Svago", "icon": "💸", "categorie": []},
    ]
    # Il foglio scrive le soglie come frazione (0,35 = 35%).
    assert [s["percentuale"] for s in dati["soglie"]] == [35, 40]
    assert dati["quotaFondoPensione"] == 120.5
    assert "presetUscite" not in dati  # scheda assente


def test_dati_base_senza_schede():
    assert dati_base([], ["Uscite"]) == {}


# --- Foglio principale -------------------------------------------------------

def test_dati_principali_risparmio_entrate_e_schede_vuote():
    value_ranges = [
        vr("Risparmio", [["Mese", "Investiti", "Risparmio"], ["ottobre 26", "300", "200"]]),
        vr("Entrate", [["Mese", "Anno", "Importo"], ["gennaio", "26", "1.500"], ["febbraio", "", "10"]]),
        vr("Conti", [["Conto"]]),
    ]
    dati = dati_principali(value_ranges, ["Risparmio", "Entrate", "Conti"], anno_corrente=2026)

    [risparmio] = dati["risparmio"]
    assert (risparmio["mese"], risparmio["anno"], risparmio["investito"], risparmio["risparmioNetto"]) == \
        ("Ottobre", 2026, 300, 200)
    assert [(e["id"], e["mese"], e["anno"], e["importo"]) for e in dati["entrate"]] == [
        ("e-dyn-1", "Gennaio", 2026, 1500), ("e-dyn-2", "Febbraio", 2026, 10)]
    # Una scheda Conti vuota non deve diventare una lista vuota (cancellerebbe i default).
    assert "conti" not in dati
    assert "contiRows" not in dati and "presetUsciteRows" not in dati
    assert dati["risparmioHeaders"] == ["Mese", "Investiti", "Risparmio"]
    assert dati["uscite"] == []


def test_dati_principali_broker_con_colonne_strumenti():
    dati = dati_principali([vr("Trade Republic", BROKER)], ["Trade Republic"], anno_corrente=2026)
    assert dati["tradeRepublicColumnCategories"] == {"col2029CorpBond": "obbligazioni", "ftseAllWorld": "azioni"}
    assert dati["tradeRepublicFields"][-2:] == ["col2029CorpBond", "ftseAllWorld"]
    # La riga 2 (asset class) diventa anch'essa un oggetto, senza mese: il cruscotto la salta.
    assert dati["tradeRepublic"][0]["mese"] == ""
    assert dati["tradeRepublic"][1]["ftseAllWorld"] == 100
    assert dati["tradeRepublicInstruments"][0]["nome"] == "FTSE All-World"
    assert dati["cruscottoInvestimenti"][0]["obbligazioniInvestitoAnno"] == 50
