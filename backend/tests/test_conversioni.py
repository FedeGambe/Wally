import pytest

from backend.domain.conversioni import come_testo_js, intero_iniziale, numero_localizzato


@pytest.mark.parametrize("cella, atteso", [
    (123.45, 123.45),
    ("123,45", 123.45),          # decimale italiano
    ("1.234,56", 1234.56),       # migliaia italiane
    ("1,234.56", 1234.56),       # formato americano
    ("1,234,567", 1234567),      # più virgole = migliaia
    ("1.234.567", 1234567),      # più punti = migliaia
    ("1.500", 1500),             # un punto con tre cifre dopo = migliaia
    ("123.45", 123.45),
    ("-1.234,56", -1234.56),
    (" € 1.234,56 ", 1234.56),   # simboli e spazi ignorati
    (None, 0),
    ("", 0),
    ("n/d", 0),
    (True, 0),                   # come JavaScript: "true" non è un numero
])
def test_numero_localizzato(cella, atteso):
    assert numero_localizzato(cella) == pytest.approx(atteso)


def test_intero_iniziale_come_parseint():
    assert intero_iniziale("26") == 26
    assert intero_iniziale("25abc") == 25
    assert intero_iniziale("") is None
    assert intero_iniziale("abc") is None


def test_numeri_scritti_come_javascript():
    assert come_testo_js(23.0) == "23"
    assert come_testo_js(-4.5) == "-4.5"
    assert come_testo_js("Spesa") == "Spesa"
