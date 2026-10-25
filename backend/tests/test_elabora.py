"""POST /api/banca/elabora: registrazione automatica e lista "Da confermare", con foglio finto."""
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.domain.scrittura import ErroreScrittura
from backend.routes import banca, comune

client = TestClient(app)
AUTH = {"Authorization": "Bearer token-utente"}

PRESET = [{"nome": "Rata Bollo", "macroCategoria": "Tasse", "categoria": "Bollo", "conto": "Unicredit", "importo": 23,
           "primaria": True}]
CORPO = {"foglio": "f", "conti": ["Unicredit", "Trade Republic"], "contiCollegati": ["Unicredit", "Trade Republic"],
         "presetUscite": PRESET, "presetInvestimenti": [{"broker": "Trade Republic", "strumento": "MSCI World", "importo": 40}]}


def riga(n, id_, conto, data, importo, descrizione="", stato=""):
    return {"riga": n, "id": id_, "data": data, "conto": conto, "importo": importo, "descrizione": descrizione, "stato": stato}


class Foglio:
    def __init__(self, righe):
        self.righe, self.stati, self.scritte = righe, [], []

    def titoli_schede(self, foglio):
        return ["Uscite", "Trade Republic"]

    def scrivi_celle(self, foglio, celle, modo="USER_ENTERED"):
        self.stati += celle


@pytest.fixture
def foglio(monkeypatch):
    f = Foglio([
        riga(2, "bollo", "Unicredit", "2026-10-01", -23, "BONIFICO SEPA A MARIO ROSSI PER RATA BOLLO"),
        riga(3, "pac", "Trade Republic", "2026-10-02", -40),
        riga(4, "spesa", "Trade Republic", "2026-10-06", -12.5),
        riga(5, "vecchio", "Unicredit", "2026-09-01", -9, stato="Ignorato"),
    ])
    monkeypatch.setattr(comune, "GoogleSheets", lambda token: f)
    monkeypatch.setattr(banca, "_righe_movimenti", lambda sheets, foglio: f.righe)
    monkeypatch.setattr(banca, "_dati_del_foglio", lambda sheets, foglio, titoli: {
        "uscite": [{"id": "u", "data": "05/10/2026", "conto": "Trade Republic", "importo": 12.5, "descrizione": "Pizza"}],
        "trasferimenti": [], "tradeRepublic": [{"mese": "ottobre 2026", "msciWorld": 0}]})
    monkeypatch.setattr(banca.scritture, "aggiungi_riga", lambda s, fo, scheda, record: f.scritte.append((scheda, record["descrizione"])))
    monkeypatch.setattr(banca.scritture, "scrivi_investimenti",
                        lambda s, fo, scheda, mese, voci, somma: f.scritte.append((scheda, mese, voci)))
    return f


def test_senza_registra_solo_la_lista(foglio):
    risposta = client.post("/api/banca/elabora", headers=AUTH, json=CORPO).json()
    assert foglio.scritte == [] and foglio.stati == []
    assert risposta["registrati"] == []
    [voce] = risposta["daConfermare"]
    assert voce["movimento"]["id"] == "spesa"
    # Suggerimenti per il modulo: spesa già inserita e data probabile (Trade Republic: il giorno prima).
    assert voce["giaInserito"] == "Pizza del 05/10"
    assert voce["dataProbabile"] == "2026-10-05"


def test_registra_preset_e_pac_e_segna_le_righe(foglio):
    risposta = client.post("/api/banca/elabora", headers=AUTH, json={**CORPO, "registra": True}).json()
    assert foglio.scritte == [("Uscite", "Rata Bollo"),
                              ("Trade Republic", "ottobre 2026", [{"strumento": "MSCI World", "importo": 40}])]
    assert [c["range"] for c in foglio.stati] == ["'Movimenti Banca'!F2", "'Movimenti Banca'!F3"]
    assert risposta["registrati"] == ["Rata Bollo", "Investimenti Trade Republic (ottobre 2026)"]
    assert risposta["errore"] is None


def test_errore_a_meta_segna_quello_gia_fatto(foglio, monkeypatch):
    def rifiuta(*a, **k):
        raise ErroreScrittura('Nessun dato scritto su "Trade Republic": celle già valorizzate')
    monkeypatch.setattr(banca.scritture, "scrivi_investimenti", rifiuta)
    risposta = client.post("/api/banca/elabora", headers=AUTH, json={**CORPO, "registra": True}).json()
    assert [c["range"] for c in foglio.stati] == ["'Movimenti Banca'!F2"]
    assert risposta["registrati"] == ["Rata Bollo"]
    assert "celle già valorizzate" in risposta["errore"]
