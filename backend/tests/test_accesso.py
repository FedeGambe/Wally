import pytest

from backend.security import accesso


@pytest.fixture(autouse=True)
def segreto(monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "segreto-di-prova")


def test_state_valido_restituisce_banca_e_paese():
    state = accesso.crea_state("Trade Republic", "IT")
    assert accesso.leggi_state(state) == {"banca": "Trade Republic", "paese": "IT"}


def test_state_manomesso_rifiutato():
    state = accesso.crea_state("UniCredit", "IT")
    assert accesso.leggi_state(state.replace("UniCredit", "Intesa")) is None
    assert accesso.leggi_state("") is None
    assert accesso.leggi_state("senza-firma") is None


def test_state_scaduto_rifiutato(monkeypatch):
    state = accesso.crea_state("UniCredit", "IT")
    adesso = accesso._adesso_ms()
    monkeypatch.setattr(accesso, "_adesso_ms", lambda: adesso + accesso.VALIDITA_STATE_MS + 1)
    assert accesso.leggi_state(state) is None


def test_state_firmato_con_altro_segreto_rifiutato(monkeypatch):
    state = accesso.crea_state("UniCredit", "IT")
    monkeypatch.setenv("CRON_SECRET", "un-altro")
    assert accesso.leggi_state(state) is None
