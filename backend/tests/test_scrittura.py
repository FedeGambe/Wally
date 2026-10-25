"""Logica pura delle scritture (domain/scrittura.py), compresi i casi dei vecchi
test TypeScript di sheetsService e formulaShift."""
from datetime import date

import pytest

from backend.domain.scrittura import (
    ErroreScrittura,
    celle_investimenti,
    celle_portafoglio,
    celle_riga_nuova,
    colonna_nuovo_strumento,
    data_da_testo,
    data_del_mese,
    data_italiana,
    intervallo_somma,
    lettera_colonna,
    matrice_preset_investimenti,
    normalizza_intestazione,
    oggetti_dati_base,
    richieste_preparazione_riga,
    righe_scheda,
    sposta_formula,
    valore_accodato,
)
from backend.models.foglio import scheda


# --- Formule della riga sopra -------------------------------------------------

@pytest.mark.parametrize("formula, righe, attesa", [
    ("=E15-E14", 1, "=E16-E15"),
    ("=B12-B$2", 1, "=B13-B$2"),               # riga ancorata ferma
    ("=$A$1*2", 1, "=$A$1*2"),
    ("=MEDIAN($B$2:B12)", 1, "=MEDIAN($B$2:B13)"),
    ("=Rendimenti!B12", 1, "=Rendimenti!B13"),
    ("=AA5+AB5", 2, "=AA7+AB7"),
    ("=C10/D10", -1, "=C9/D9"),
    ("12.5", 1, "12.5"),                        # non è una formula
    ("", 1, ""),
    ("=IF(B12>0, C12/B12, 0)", 1, "=IF(B13>0, C13/B13, 0)"),
])
def test_sposta_formula(formula, righe, attesa):
    assert sposta_formula(formula, righe) == attesa


# --- Date -----------------------------------------------------------------------

@pytest.mark.parametrize("testo, attesa", [
    ("25/12/2026", date(2026, 12, 25)),
    ("2026-03-05", date(2026, 3, 5)),
    ("05/03/26", date(2026, 3, 5)),        # anno a due cifre < 50 → 20xx
    ("05/03/85", date(1985, 3, 5)),        # ≥ 50 → 19xx
    ("1", date(1899, 12, 31)),             # numero seriale di Sheets
    ("31/02/2026", date(2026, 3, 3)),      # come JavaScript: il giorno in più scivola
    ("", None), (None, None), ("not-a-date", None),
])
def test_data_da_testo(testo, attesa):
    assert data_da_testo(testo) == attesa


def test_date_per_il_foglio():
    assert data_italiana("2026-10-05") == "05/10/2026"
    assert data_italiana("boh") == "boh"
    assert data_del_mese("agosto", 2026) == "01/08/2026"
    assert data_del_mese("Agosto", None) == ""
    assert data_del_mese("Pippo", 2026) == ""


# --- Riga nuova -------------------------------------------------------------------

def test_riga_uscita_copia_le_formule_e_formatta_data_e_booleani():
    uscite = scheda("Uscite")
    record = {"data": "2026-10-25", "descrizione": "Spesa", "macroCategoria": "Casa", "categoria": "Cibo",
              "conto": "Unicredit", "importo": 12.5, "primaria": True}
    formule_sopra = ["01/10/2026", "=TEXT(A41;\"mmmm\")", "x", "", "", "=VLOOKUP(E41;X;2)", "", "", ""]
    celle = {c["range"]: c["values"][0][0] for c in celle_riga_nuova(uscite, record, 42, formule_sopra)}
    assert celle == {
        "Uscite!A42": "25/10/2026",
        "Uscite!B42": "=TEXT(A42;\"mmmm\")",
        "Uscite!C42": "Spesa",
        "Uscite!D42": "Casa",
        "Uscite!E42": "Cibo",
        "Uscite!F42": "=VLOOKUP(E42;X;2)",
        "Uscite!G42": "Unicredit",
        "Uscite!H42": 12.5,
        "Uscite!I42": "Si",
    }


def test_colonna_formula_senza_formula_sopra_resta_intatta():
    celle = celle_riga_nuova(scheda("Entrate"), {"mese": "Ottobre", "anno": 2026, "importo": 5}, 2, [])
    intervalli = [c["range"] for c in celle]
    assert "Entrate!B2" not in intervalli          # Anno è una formula
    assert celle[0] == {"range": "Entrate!A2", "values": [["01/10/2026"]]}


def test_preparazione_riga_allunga_la_griglia_e_formatta_le_date():
    richieste = richieste_preparazione_riga(scheda("Uscite"), sheet_id=7, riga=101, righe_griglia=100)
    assert richieste[0] == {"appendDimension": {"sheetId": 7, "dimension": "ROWS", "length": 1}}
    assert richieste[1]["repeatCell"]["cell"]["userEnteredFormat"]["numberFormat"]["pattern"] == "dd/mm/yyyy"
    assert len(richieste_preparazione_riga(scheda("Rendimenti"), 7, 5, 100)) == 0


# --- Portafoglio --------------------------------------------------------------------

def test_portafoglio_scrive_solo_i_tagli_che_cambiano():
    assert celle_portafoglio(["0", "1", "1", "3", "0"], {20: 1, 50: -1, 5: 0}) == [
        {"range": "Portafoglio Raw!D3", "values": [[2]]},
        {"range": "Portafoglio Raw!E3", "values": [[2]]},
    ]


def test_portafoglio_non_va_sotto_zero():
    with pytest.raises(ErroreScrittura, match=r"100€ \(disponibili 0, richieste 2\)"):
        celle_portafoglio(["0", "1", "1", "3", "0"], {100: -2})


# --- Broker ---------------------------------------------------------------------------

def test_valore_accodato():
    assert valore_accodato("=40*2", 50) == "=40*2+50"
    assert valore_accodato("=R23", 12.5) == "=R23+12.5"
    assert valore_accodato(40, 50) == "=40+50"
    assert valore_accodato("135", 20) == "=135+20"
    assert valore_accodato(None, 50) == 50
    assert valore_accodato("", 50) == 50
    assert valore_accodato(0, 50) == 50


def test_intervallo_somma():
    assert intervallo_somma('=IF(COUNTA(B23:I23)>0,SUM(B23:I23)+S23,"")') == (1, 8)
    assert intervallo_somma("=SUM(B30:H30)+J30+L30+N30+(Z30)") == (1, 7)
    assert intervallo_somma('=SE(CONTA.VALORI(B22:I22)>0;SOMMA(B22:I22)+S22;"")') == (1, 8)
    assert intervallo_somma("=B3+C3") is None
    assert intervallo_somma("") is None


def test_colonna_nuovo_strumento_prima_dell_ultima_dell_intervallo():
    assert colonna_nuovo_strumento("ottobre 2026", "=SUM(B23:I23)+S23", colonna_importo=10) == 8
    with pytest.raises(ErroreScrittura, match="inatteso"):
        colonna_nuovo_strumento("ottobre 2026", "=SUM(B23:I23)", colonna_importo=5)


def test_contributi_ricorrenti_non_sovrascrivono():
    voci = [{"strumento": "A", "importo": 50}, {"strumento": "B", "importo": 30}]
    with pytest.raises(ErroreScrittura, match=r"A \(contiene una formula\), B \(già 40\)"):
        celle_investimenti("Scalable", "ottobre 2026", 23, voci, [1, 2], ["ott", "=X1", 40], somma=False)
    assert celle_investimenti("Scalable", "ottobre 2026", 23, voci, [1, 2], ["ott", "", 0], somma=False) == [
        {"range": "Scalable!B23", "values": [[50]]}, {"range": "Scalable!C23", "values": [[30]]}]
    assert celle_investimenti("Scalable", "ottobre 2026", 23, voci, [1, 2], ["ott", "=X1", 40], somma=True) == [
        {"range": "Scalable!B23", "values": [["=X1+50"]]}, {"range": "Scalable!C23", "values": [["=40+30"]]}]


def test_lettere_colonna():
    assert [lettera_colonna(i) for i in (0, 25, 26, 27, 51)] == ["A", "Z", "AA", "AB", "AZ"]


def test_normalizza_intestazione():
    assert normalizza_intestazione(" Rendimento comulativo") == normalizza_intestazione("Rendimento comulativo")
    assert normalizza_intestazione(" Saldo Conto Completo") == "saldocontocompleto"
    assert normalizza_intestazione("Rendimento comulativo %") != normalizza_intestazione("Rendimento comulativo")
    assert normalizza_intestazione("Saldo Conto") != normalizza_intestazione("Saldo Conto Completo")


# --- Dati Base ------------------------------------------------------------------------

def test_matrice_preset_investimenti():
    preset = [
        {"broker": "Scalable", "strumento": "Europe 600", "importo": 40},
        {"broker": "Scalable", "strumento": "FTSE All-World", "importo": 135},
        {"broker": "Trade Republic", "strumento": "MSCI World Small Cap", "importo": 80},
        {"broker": "Trade Republic", "strumento": "2036 Corp Bonds", "importo": 50},
    ]
    assert matrice_preset_investimenti(preset) == [
        ["Conto", "Europe 600", "FTSE All-World", "MSCI World Small Cap", "2036 Corp Bonds"],
        ["Scalable", 40, 135, "", ""],
        ["Trade Republic", "", "", 80, 50],
    ]


def test_dati_base_in_righe_piatte():
    oggetti = oggetti_dati_base({
        "macroCategorieUscite": [{"nome": "Casa", "icon": "🏠", "categorie": ["Affitto", "Bollette"]},
                                 {"nome": "Svago", "icon": "💸", "categorie": []}],
        "soglie": [{"categoria": "Primarie", "percentuale": 35}],
        "presetUscite": [{"nome": "Affitto", "importo": 700, "primaria": True, "giornoDelMese": 1}],
    })
    assert oggetti["categorieUsciteRows"] == [
        {"macro": "Casa", "icon": "🏠", "categoria": "Affitto"},
        {"macro": "Casa", "icon": "🏠", "categoria": "Bollette"},
        {"macro": "Svago", "icon": "💸", "categoria": ""},
    ]
    assert oggetti["soglieRows"] == [{"categoria": "Primarie", "percentuale": 0.35}]
    assert oggetti["presetFondoPensioneRows"] == []           # quota non inviata: scheda non toccata
    assert righe_scheda(scheda("Preset Uscite Ricorrenti"), oggetti["presetUsciteRows"])[1] == \
        [1, "Affitto", "", "", "", 700, "Si"]
