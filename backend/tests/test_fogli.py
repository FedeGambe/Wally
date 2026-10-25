"""Le rotte /api/fogli/* con Google Sheets finto."""
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.routes import comune
from backend.services.google_sheets import ErroreSheets

client = TestClient(app)


class SheetsFinto:
    def __init__(self, token, schede=None, errore=None):
        self.token, self.schede, self.errore = token, schede or {}, errore
        self.intervalli_chiesti = []

    def titoli_schede(self, foglio):
        if self.errore:
            raise self.errore
        return list(self.schede)

    def leggi_intervalli(self, foglio, intervalli):
        self.intervalli_chiesti = intervalli
        return [{"range": f"'{i.split('!')[0]}'!A1:Z9", "values": self.schede[i.split("!")[0]]} for i in intervalli]


@pytest.fixture
def sheets(monkeypatch):
    finto = {}

    def crea(schede=None, errore=None):
        monkeypatch.setattr(comune, "GoogleSheets", lambda token: finto.setdefault("s", SheetsFinto(token, schede, errore)))
        return finto

    return crea


AUTH = {"Authorization": "Bearer token-utente"}


def test_senza_token_risponde_sessione_scaduta():
    res = client.get("/api/fogli/dati", params={"foglio": "f"})
    assert res.status_code == 401
    assert res.json()["errore"].startswith("UNAUTHENTICATED")


def test_token_rifiutato_da_google_diventa_401(sheets):
    sheets(errore=ErroreSheets("Request had invalid authentication credentials", 401))
    res = client.get("/api/fogli/dati", params={"foglio": "f"}, headers=AUTH)
    assert res.status_code == 401
    assert res.json()["errore"].startswith("UNAUTHENTICATED")


def test_foglio_non_accessibile(sheets):
    sheets(errore=ErroreSheets("The caller does not have permission", 403))
    res = client.get("/api/fogli/dati-base", params={"foglio": "f"}, headers=AUTH)
    assert res.status_code == 502
    assert res.json()["errore"] == "Impossibile leggere il foglio di configurazione: The caller does not have permission"


def test_legge_solo_le_schede_che_esistono_con_il_token_dell_utente(sheets):
    finto = sheets(schede={"Uscite": [["Data", "Importo"], ["01/10/2026", "5"]], "Altro": []})
    res = client.get("/api/fogli/dati", params={"foglio": "f"}, headers=AUTH)
    assert res.status_code == 200
    assert finto["s"].token == "token-utente"
    assert finto["s"].intervalli_chiesti == ["Uscite!A:I"]
    assert res.json()["uscite"][0]["importo"] == 5
