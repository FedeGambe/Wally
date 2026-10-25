"""Le rotte /api/banca/* con Enable Banking e Google Sheets finti."""
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.models.banca import COLLEGAMENTI_INTESTAZIONI, COLLEGAMENTI_TITOLO, MOVIMENTI_INTESTAZIONI, MOVIMENTI_TITOLO
from backend.routes import banca
from backend.security import accesso
from backend.services.enable_banking import ErroreEB

client = TestClient(app)


class FogliFinti:
    """Le schede dei due fogli in memoria, come liste di righe."""

    def __init__(self):
        self.schede: dict[tuple[str, str], list[list]] = {}

    def assicura_scheda(self, foglio, titolo, intestazioni):
        self.schede.setdefault((foglio, titolo), [intestazioni])

    def leggi_scheda(self, foglio, titolo):
        if (foglio, titolo) not in self.schede:
            raise RuntimeError("scheda inesistente")
        intestazioni, *righe = self.schede[(foglio, titolo)]
        return [{h: (str(r[i]) if i < len(r) else "") for i, h in enumerate(intestazioni)} for r in righe]

    def aggiungi_righe(self, foglio, titolo, righe):
        self.schede[(foglio, titolo)].extend(righe)

    def riscrivi_scheda(self, foglio, titolo, intestazioni, righe):
        self.schede[(foglio, titolo)] = [intestazioni, *righe]


@pytest.fixture
def fogli(monkeypatch):
    for nome, valore in {
        "CRON_SECRET": "segreto",
        "VITE_DEFAULT_SPREADSHEET_ID": "finanza",
        "VITE_DEFAULT_CONFIG_SPREADSHEET_ID": "config",
        "EB_REDIRECT_URL": "https://wally.example/api/banca/callback",
    }.items():
        monkeypatch.setenv(nome, valore)
    finti = FogliFinti()
    monkeypatch.setattr(banca, "_fogli", lambda: finti)
    monkeypatch.setattr(banca, "_oggi", lambda: "2026-10-25")
    return finti


@pytest.fixture
def proprietario(monkeypatch):
    monkeypatch.setattr(banca, "da_proprietario", lambda request: request.headers.get("authorization") == "Bearer buono")


CRON = {"Authorization": "Bearer segreto"}


# --- Accesso ----------------------------------------------------------------

def test_sincronizza_senza_segreto_del_cron_rifiutata(fogli):
    assert client.get("/api/banca/sincronizza").status_code == 401
    assert client.get("/api/banca/sincronizza", headers={"Authorization": "Bearer sbagliato"}).status_code == 401


def test_collega_e_sincronizza_ora_solo_per_il_proprietario(fogli, proprietario):
    assert client.post("/api/banca/collega", json={"banca": "UniCredit"}).status_code == 401
    assert client.post("/api/banca/sincronizza", json={}).status_code == 401


# --- Collegamento -----------------------------------------------------------

def test_collega_chiede_il_consenso_massimo_meno_un_giorno(fogli, proprietario, monkeypatch):
    chiamate = []

    def eb(metodo, percorso, body=None, params=None, extra=None):
        chiamate.append((metodo, percorso, body, params))
        if percorso == "/aspsps":
            return {"aspsps": [{"name": "UniCredit", "maximum_consent_validity": 180 * 86400}]}
        return {"url": "https://banca.example/autorizza"}

    monkeypatch.setattr(banca, "chiama_eb", eb)
    res = client.post("/api/banca/collega", json={"banca": "UniCredit"}, headers={"Authorization": "Bearer buono"})
    assert res.json() == {"url": "https://banca.example/autorizza"}
    _, _, body, _ = chiamate[1]
    assert body["aspsp"] == {"name": "UniCredit", "country": "IT"}
    assert body["redirect_url"] == "https://wally.example/api/banca/callback"
    assert accesso.leggi_state(body["state"]) == {"banca": "UniCredit", "paese": "IT"}
    assert body["access"]["valid_until"].endswith("Z")


def test_collega_banca_sconosciuta(fogli, proprietario, monkeypatch):
    monkeypatch.setattr(banca, "chiama_eb", lambda *a, **k: {"aspsps": []})
    res = client.post("/api/banca/collega", json={"banca": "Inesistente"}, headers={"Authorization": "Bearer buono"})
    assert res.status_code == 400
    assert "non disponibile" in res.json()["errore"]


def _ritorno(res):
    assert res.status_code == 302
    return {k: v[0] for k, v in parse_qs(urlparse(res.headers["location"]).query).items()}


def test_callback_con_state_falso_torna_con_errore(fogli):
    res = client.get("/api/banca/callback?state=falso&code=x", follow_redirects=False)
    assert _ritorno(res) == {"banca": "errore", "motivo": "Collegamento scaduto o non partito da Wally"}


def test_callback_rinnovo_tiene_le_correzioni_a_mano(fogli, monkeypatch):
    # Riga vecchia di UniCredit corretta a mano, e un'altra banca che resta.
    fogli.schede[("config", COLLEGAMENTI_TITOLO)] = [
        COLLEGAMENTI_INTESTAZIONI,
        ["UniCredit", "IT", "s-vecchia", "2026-10-01", "acc-vecchio", "IT00U", "Conto Casa", "2026-09-01"],
        ["Trade Republic", "IT", "s-tr", "2027-01-01", "acc-tr", "DE00T", "Trade Republic", "2026-09-15"],
    ]
    sessione = {
        "session_id": "s-nuova",
        "access": {"valid_until": "2027-04-20T10:00:00.000Z"},
        "accounts": [{"uid": "acc-nuovo", "account_id": {"iban": "IT00U"}}],
    }
    monkeypatch.setattr(banca, "chiama_eb", lambda *a, **k: sessione)
    state = accesso.crea_state("UniCredit", "IT")
    res = client.get("/api/banca/callback", params={"state": state, "code": "c"},
                     headers={"x-forwarded-proto": "https", "x-forwarded-host": "wally.example"}, follow_redirects=False)

    assert res.headers["location"].startswith("https://wally.example/?")
    assert _ritorno(res) == {"banca": "collegata", "nome": "UniCredit"}
    assert fogli.schede[("config", COLLEGAMENTI_TITOLO)][1:] == [
        ["Trade Republic", "IT", "s-tr", "2027-01-01", "acc-tr", "DE00T", "Trade Republic", "2026-09-15"],
        ["UniCredit", "IT", "s-nuova", "2027-04-20", "acc-nuovo", "IT00U", "Conto Casa", "2026-09-01"],
    ]


def test_callback_primo_collegamento_parte_da_oggi(fogli, monkeypatch):
    sessione = {"session_id": "s1", "access": {"valid_until": "2027-04-20T10:00:00Z"},
                "accounts": [{"uid": "acc-1", "account_id": {"iban": "IT11"}}]}
    monkeypatch.setattr(banca, "chiama_eb", lambda *a, **k: sessione)
    client.get("/api/banca/callback", params={"state": accesso.crea_state("UniCredit", "IT"), "code": "c"},
               follow_redirects=False)
    assert fogli.schede[("config", COLLEGAMENTI_TITOLO)][1] == \
        ["UniCredit", "IT", "s1", "2027-04-20", "acc-1", "IT11", "Unicredit", "2026-10-25"]


# --- Sincronizzazione -------------------------------------------------------

def _collegamento(banca_nome, account, conto, scadenza="2027-01-01", dal="2026-10-01"):
    return [banca_nome, "IT", "s", scadenza, account, "", conto, dal]


def test_sincronizza_accoda_solo_i_movimenti_nuovi_in_ordine_di_data(fogli, monkeypatch):
    fogli.schede[("config", COLLEGAMENTI_TITOLO)] = [
        COLLEGAMENTI_INTESTAZIONI,
        _collegamento("UniCredit", "acc-u", "Unicredit"),
        _collegamento("Trade Republic", "acc-t", "Trade Republic"),
    ]
    fogli.schede[("finanza", MOVIMENTI_TITOLO)] = [
        MOVIMENTI_INTESTAZIONI,
        ["Unicredit|R1", "2026-10-20", "Unicredit", -10, "GIÀ SCARICATO", "", "2026-10-21"],
    ]
    movimenti = {
        "acc-u": [
            {"entry_reference": "R1", "transaction_amount": {"amount": "10"}, "credit_debit_indicator": "DBIT", "booking_date": "2026-10-20"},
            {"entry_reference": "R2", "transaction_amount": {"amount": "5"}, "credit_debit_indicator": "DBIT", "booking_date": "2026-10-23"},
        ],
        # Trade Republic ignora date_from: quello del 10 ottobre va scartato qui.
        "acc-t": [
            {"transaction_amount": {"amount": "-3"}, "credit_debit_indicator": "DBIT", "booking_date": "2026-10-22"},
            {"transaction_amount": {"amount": "-7"}, "credit_debit_indicator": "DBIT", "booking_date": "2026-10-10"},
        ],
    }
    monkeypatch.setattr(banca, "scarica_movimenti", lambda uid, dal, psu=None: movimenti[uid])

    esito = client.get("/api/banca/sincronizza", headers=CRON).json()

    assert esito == {
        "aggiunti": 2,
        "perConto": {"UniCredit → Unicredit": 1, "Trade Republic → Trade Republic": 1},
        "scaduti": [],
        "errori": [],
    }
    assert fogli.schede[("finanza", MOVIMENTI_TITOLO)][2:] == [
        ["Trade Republic|2026-10-22|-3.00|0", "2026-10-22", "Trade Republic", -3.0, "", "", "2026-10-25"],
        ["Unicredit|R2", "2026-10-23", "Unicredit", -5.0, "", "", "2026-10-25"],
    ]


def test_sincronizza_segnala_consensi_scaduti_e_limite_della_banca(fogli, monkeypatch):
    fogli.schede[("config", COLLEGAMENTI_TITOLO)] = [
        COLLEGAMENTI_INTESTAZIONI,
        _collegamento("UniCredit", "acc-u", "Unicredit", scadenza="2026-10-01"),
        _collegamento("Trade Republic", "acc-t", "Trade Republic"),
    ]

    def scarica(uid, dal, psu=None):
        raise ErroreEB("troppe richieste", 429)

    monkeypatch.setattr(banca, "scarica_movimenti", scarica)
    esito = client.get("/api/banca/sincronizza", headers=CRON).json()
    assert esito["scaduti"] == ["UniCredit → Unicredit"]
    assert esito["errori"] == ["Trade Republic → Trade Republic: la banca ha raggiunto il limite di letture per oggi, riprova domani"]


def test_sincronizza_senza_banche_collegate(fogli):
    esito = client.get("/api/banca/sincronizza", headers=CRON).json()
    assert esito == {"aggiunti": 0, "perConto": {}, "scaduti": [], "errori": []}
    assert fogli.schede[("finanza", MOVIMENTI_TITOLO)] == [MOVIMENTI_INTESTAZIONI]


def test_sincronizza_ora_manda_le_intestazioni_psu(fogli, proprietario, monkeypatch):
    fogli.schede[("config", COLLEGAMENTI_TITOLO)] = [COLLEGAMENTI_INTESTAZIONI, _collegamento("UniCredit", "acc-u", "Unicredit")]
    ricevute = {}

    def scarica(uid, dal, psu=None):
        ricevute.update(psu)
        return []

    monkeypatch.setattr(banca, "scarica_movimenti", scarica)
    client.post("/api/banca/sincronizza", json={}, headers={
        "Authorization": "Bearer buono", "x-forwarded-for": "1.2.3.4, 10.0.0.1", "user-agent": "Safari",
    })
    assert ricevute["Psu-Ip-Address"] == "1.2.3.4"
    assert ricevute["Psu-User-Agent"] == "Safari"
