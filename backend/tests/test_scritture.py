"""Le rotte di scrittura con un Google Sheets finto che registra le scritture."""
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.routes import comune
from backend.services.google_sheets import ErroreSheets

client = TestClient(app)
AUTH = {"Authorization": "Bearer token-utente"}


class SheetsFinto:
    """Valori per intervallo, schede con sheetId e righe; registra cosa si scrive."""

    def __init__(self, valori=None, formule=None, schede=None):
        self.valori, self.formule = valori or {}, formule or {}
        self.schede = schede or [{"sheetId": 1, "title": "Uscite", "gridProperties": {"rowCount": 1000}}]
        self.celle, self.struttura, self.svuotati = [], [], []

    def leggi_valori(self, foglio, intervallo, render=None):
        return (self.formule if render == "FORMULA" else self.valori).get(intervallo, [])

    def leggi_intervalli(self, foglio, intervalli, render=None):
        return [{"values": self.formule.get(i, [])} for i in intervalli]

    def proprieta_schede(self, foglio):
        return self.schede

    def titoli_schede(self, foglio):
        return [s["title"] for s in self.schede]

    def scrivi_celle(self, foglio, celle, modo="USER_ENTERED"):
        self.celle += celle

    def modifica_struttura(self, foglio, richieste):
        self.struttura += richieste

    def svuota(self, foglio, intervallo):
        self.svuotati.append(intervallo)


@pytest.fixture
def finto(monkeypatch):
    istanza = SheetsFinto()
    monkeypatch.setattr(comune, "GoogleSheets", lambda token: istanza)
    return istanza


def celle(finto):
    return {c["range"]: c["values"][0][0] if len(c["values"]) == 1 and len(c["values"][0]) == 1 else c["values"]
            for c in finto.celle}


def test_riga_uscita_nella_prima_riga_libera(finto):
    finto.valori["Uscite!A:A"] = [["Data"], ["01/10/2026"]]
    finto.formule["Uscite!A2:I2"] = [["01/10/2026", "=TEXT(A2)"]]
    res = client.post("/api/fogli/riga", headers=AUTH, json={"foglio": "f", "scheda": "Uscite", "record": {
        "data": "2026-10-25", "descrizione": "Pane", "importo": 2.5, "primaria": True}})
    assert res.status_code == 200
    scritte = celle(finto)
    assert scritte["Uscite!A3"] == "25/10/2026"
    assert scritte["Uscite!B3"] == "=TEXT(A3)"
    assert scritte["Uscite!I3"] == "Si"
    assert "Uscite!F3" not in scritte   # Icon è una formula, ma sopra non c'è: cella intatta


def test_scheda_non_in_mappa(finto):
    res = client.post("/api/fogli/riga", headers=AUTH, json={"foglio": "f", "scheda": "Pippo", "record": {}})
    assert res.status_code == 400
    assert finto.celle == []


def test_portafoglio_insufficiente_non_scrive(finto):
    finto.valori["Portafoglio Raw!B3:F3"] = [["0", "1", "1", "3", "0"]]
    res = client.post("/api/fogli/portafoglio", headers=AUTH, json={"foglio": "f", "variazioni": {"100": -1}})
    assert res.status_code == 400
    assert "Banconote insufficienti" in res.json()["errore"]
    assert finto.celle == []


def test_investimenti_ricorrenti_su_cella_piena_non_scrivono(finto):
    finto.valori["Scalable!1:1"] = [["Mese", "MSCI World"]]
    finto.valori["Scalable!A:A"] = [["Mese"], ["ottobre 2026"]]
    finto.formule["Scalable!A2:B2"] = [["ottobre 2026", 40]]
    corpo = {"foglio": "f", "scheda": "Scalable", "mese": "ottobre 2026", "voci": [{"strumento": "MSCI World", "importo": 50}]}
    res = client.post("/api/fogli/investimenti", headers=AUTH, json=corpo)
    assert res.status_code == 400 and "già 40" in res.json()["errore"]
    res = client.post("/api/fogli/investimenti", headers=AUTH, json={**corpo, "somma": True})
    assert res.status_code == 200
    assert celle(finto) == {"Scalable!B2": "=40+50"}


def test_verifica_mensile_su_celle_vuote(finto):
    finto.valori["Trade Republic!1:1"] = [["Mese", "Saldo Conto"]]
    finto.valori["Trade Republic!A:A"] = [["Mese"], ["ottobre 2026"]]
    res = client.post("/api/fogli/verifica-mensile", headers=AUTH, json={"foglio": "f", "scheda": "Trade Republic", "voci": [
        {"intestazione": "saldo conto", "meseLabel": "Ottobre 2026", "valore": 1234.5}]})
    assert res.status_code == 200
    assert celle(finto) == {"Trade Republic!B2": 1234.5}


def test_dati_base_svuota_la_matrice_solo_se_inviata(finto):
    finto.schede = [{"sheetId": 1, "title": t} for t in ("Conti", "Preset Investimenti Ricorrenti")]
    client.put("/api/fogli/dati-base", headers=AUTH, json={"foglio": "c", "dati": {"conti": ["Unicredit"]}})
    assert finto.svuotati == []
    assert celle(finto) == {"Conti!A1": [["Conto"], ["Unicredit"]]}

    finto.celle.clear()
    client.put("/api/fogli/dati-base", headers=AUTH, json={"foglio": "c", "dati": {"presetInvestimenti": []}})
    assert finto.svuotati == ["Preset Investimenti Ricorrenti!A:ZZ"]


def test_token_rifiutato_da_google(monkeypatch):
    class Scaduto(SheetsFinto):
        def leggi_valori(self, *a, **k):
            raise ErroreSheets("Invalid Credentials", 401)
    monkeypatch.setattr(comune, "GoogleSheets", lambda token: Scaduto())
    res = client.post("/api/fogli/riga", headers=AUTH, json={"foglio": "f", "scheda": "Uscite", "record": {}})
    assert res.status_code == 401
    assert res.json()["errore"].startswith("UNAUTHENTICATED")


def test_senza_token():
    assert client.post("/api/fogli/portafoglio", json={"foglio": "f", "variazioni": {}}).status_code == 401
