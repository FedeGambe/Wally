from backend.domain.movimenti import MovimentoBanca, normalizza_movimenti


# Forme dei movimenti come le restituisce Enable Banking (dati reali anonimizzati).
def grezzo_unicredit(ref, data, segno, importo, causale):
    return {
        "entry_reference": ref,
        "transaction_amount": {"currency": "EUR", "amount": importo},
        "credit_debit_indicator": segno,
        "status": "BOOK",
        "booking_date": data,
        "value_date": data,
        "remittance_information": [causale],
    }


def grezzo_trade_republic(data, segno, importo):
    return {
        "transaction_amount": {"currency": "EUR", "amount": importo},
        "credit_debit_indicator": segno,
        "status": "BOOK",
        "booking_date": data,
    }


def test_unicredit_id_dalla_banca_segno_dal_dbit_causale_senza_commissioni():
    [m] = normalizza_movimenti([grezzo_unicredit(
        "R1", "2026-10-01", "DBIT", "23.000",
        "DISPOSIZIONE DI BONIFICO BONIFICO SEPA A  MARIO ROSSI PER  RATA BOLLO COMM              0,00 SPESE              0,00",
    )], "Unicredit")
    assert m == MovimentoBanca(
        id="Unicredit|R1", conto="Unicredit", data="2026-10-01", importo=-23,
        descrizione="DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER RATA BOLLO",
    )


def test_trade_republic_id_costruito_e_stabile_per_movimenti_identici():
    grezzi = [
        grezzo_trade_republic("2026-10-05", "DBIT", "-4.500000"),
        grezzo_trade_republic("2026-10-05", "DBIT", "-4.500000"),
        grezzo_trade_republic("2026-10-05", "CRDT", "4.480000"),
    ]
    movimenti = normalizza_movimenti(grezzi, "Trade Republic")
    assert [m.importo for m in movimenti] == [-4.5, -4.5, 4.48]
    assert [m.id for m in movimenti] == [
        "Trade Republic|2026-10-05|-4.50|0",
        "Trade Republic|2026-10-05|-4.50|1",
        "Trade Republic|2026-10-05|4.48|0",
    ]
    # Riscaricando gli stessi movimenti gli id non cambiano: niente doppioni.
    assert [m.id for m in normalizza_movimenti(grezzi, "Trade Republic")] == [m.id for m in movimenti]


def test_scarta_movimenti_in_attesa_e_a_zero():
    in_attesa = {**grezzo_trade_republic("2026-10-05", "DBIT", "-1"), "status": "PDNG"}
    assert normalizza_movimenti([in_attesa], "Trade Republic") == []
    a_zero = grezzo_unicredit("R0", "2026-09-30", "CRDT", "0.000", "COMPETENZE (INTERESSI/ONERI)")
    assert normalizza_movimenti([a_zero], "Unicredit") == []


def test_id_arrotondati_come_javascript():
    # 0,125 è esatto in binario: toFixed(2) dà "0.13", l'arrotondamento
    # predefinito di Python darebbe "0.12" e l'id cambierebbe.
    [m] = normalizza_movimenti([grezzo_trade_republic("2026-10-05", "DBIT", "-0.125")], "Trade Republic")
    assert m.id == "Trade Republic|2026-10-05|-0.13|0"


def test_controparte_aggiunta_alla_descrizione():
    grezzo = {**grezzo_unicredit("R2", "2026-10-02", "CRDT", "100", "BONIFICO"), "debtor": {"name": "ACME SPA"}}
    [m] = normalizza_movimenti([grezzo], "Unicredit")
    assert m.descrizione == "BONIFICO ACME SPA"
