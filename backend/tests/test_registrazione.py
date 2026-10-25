"""Piano di registrazione dei movimenti banca e "già inserito" (dai vecchi test del frontend)."""
from backend.domain.registrazione import pianifica_registrazioni, trova_gia_inseriti

PRESET_USCITE = [{"id": "p1", "nome": "Rata Bollo", "macroCategoria": "Tasse", "categoria": "Bollo", "conto": "Unicredit",
                  "importo": 23, "giornoDelMese": 1, "primaria": True}]
PRESET_TRASFERIMENTI = [{"id": "t1", "categoria": "Rata Bollo", "contoOrdinante": "", "contoBeneficiario": "Santander Impegnato",
                         "importo": 23}]
MACRO = [{"nome": "Tasse", "icon": "🏦", "categorie": ["Bollo"]}]


def cl(riga, id_, conto, data, importo, esito, proposta=None, abbinato_a=None):
    c = {"riga": riga, "movimento": {"id": id_, "conto": conto, "data": data, "importo": importo, "descrizione": ""},
         "esito": esito}
    if proposta:
        c["proposta"] = proposta
    if abbinato_a:
        c["abbinatoA"] = abbinato_a
    return c


def pianifica(classificati, uscite=(), trasferimenti=()):
    return pianifica_registrazioni(classificati, PRESET_USCITE, PRESET_TRASFERIMENTI, list(uscite), list(trasferimenti), MACRO)


def test_preset_uscita_con_trasferimento_collegato():
    [op] = pianifica([cl(5, "m1", "Unicredit", "2026-11-02", -23, "automatico", {"tipo": "preset", "nome": "Rata Bollo"})])
    assert op["tipo"] == "record" and op["righe"] == [5]
    assert {k: op["uscita"][k] for k in ("data", "mese", "descrizione", "macroCategoria", "categoria", "icon", "conto",
                                          "importo", "primaria")} == {
        "data": "02/11/2026", "mese": "Novembre", "descrizione": "Rata Bollo", "macroCategoria": "Tasse",
        "categoria": "Bollo", "icon": "🏦", "conto": "Unicredit", "importo": 23, "primaria": True}
    # Ordinante vuoto nel preset = il conto da cui è partito il bonifico.
    assert {k: op["trasferimento"][k] for k in ("mese", "anno", "categoria", "contoOrdinante", "contoBeneficiario", "importo")} == {
        "mese": "Novembre", "anno": 2026, "categoria": "Rata Bollo", "contoOrdinante": "Unicredit",
        "contoBeneficiario": "Santander Impegnato", "importo": 23}


def test_preset_gia_inserito_nel_mese_solo_da_segnare():
    gia = {"id": "x", "data": "01/11/2026", "mese": "Novembre", "descrizione": "Rata Bollo", "conto": "Unicredit", "importo": 23}
    [op] = pianifica([cl(5, "m1", "Unicredit", "2026-11-02", -23, "automatico", {"tipo": "preset", "nome": "Rata Bollo"})], uscite=[gia])
    assert (op["tipo"], op["righe"]) == ("gia-presente", [5])


def test_giro_tra_conti_un_trasferimento_e_due_righe():
    proposta = {"tipo": "trasferimento", "contoOrdinante": "Unicredit", "contoBeneficiario": "Trade Republic"}
    ops = pianifica([cl(7, "out", "Unicredit", "2026-11-11", -1600, "automatico", proposta, "in"),
                     cl(8, "in", "Trade Republic", "2026-11-11", 1600, "lato-trasferimento", proposta, "out")])
    assert len(ops) == 1
    assert ops[0]["righe"] == [7, 8]
    assert {k: ops[0]["trasferimento"][k] for k in ("mese", "anno", "categoria", "importo")} == \
        {"mese": "Novembre", "anno": 2026, "categoria": "Trasferimento", "importo": 1600}


def test_pac_una_sola_operazione_per_broker_e_mese():
    proposta = {"tipo": "investimento", "broker": "Trade Republic"}
    ops = pianifica([cl(1, "a", "Trade Republic", "2026-11-02", -40, "automatico", proposta),
                     cl(2, "b", "Trade Republic", "2026-11-02", -50, "automatico", proposta)])
    assert ops == [{"tipo": "investimenti", "righe": [1, 2], "broker": "Trade Republic", "meseLabel": "novembre 2026",
                    "descrizione": "Investimenti Trade Republic (novembre 2026)"}]


def test_movimenti_da_confermare_ignorati():
    assert pianifica([cl(1, "a", "Unicredit", "2026-11-11", 1600, "da-confermare", {"tipo": "entrata", "categoria": "Stipendio"})]) == []


def uscita(id_, data, importo, conto="Trade Republic"):
    return {"id": id_, "data": data, "mese": "Ottobre", "descrizione": f"Spesa {id_}", "conto": conto, "importo": importo}


def da_confermare(id_, data, importo, conto="Trade Republic"):
    return {"movimento": {"id": id_, "conto": conto, "data": data, "importo": importo, "descrizione": ""}, "esito": "da-confermare"}


def test_gia_inserito_stesso_conto_e_importo_a_pochi_giorni():
    trovati = trova_gia_inseriti([da_confermare("m1", "2026-10-11", -60.7), da_confermare("m2", "2026-10-11", -55)],
                                 [uscita("a", "10/10/2026", 60.7), uscita("b", "09/10/2026", 55)])
    assert trovati == {"m1": "Spesa a del 10/10", "m2": "Spesa b del 09/10"}


def test_niente_suggerimento_con_altro_conto_importo_o_data_lontana():
    assert trova_gia_inseriti([da_confermare("m1", "2026-10-11", -55)],
                              [uscita("a", "10/10/2026", 55, "Unicredit"), uscita("b", "10/10/2026", 54),
                               uscita("c", "01/10/2026", 55)]) == {}


def test_un_record_vale_per_un_solo_movimento():
    trovati = trova_gia_inseriti([da_confermare("m1", "2026-10-11", -55), da_confermare("m2", "2026-10-11", -55)],
                                 [uscita("a", "11/10/2026", 55)])
    assert len(trovati) == 1


def test_entrate_escluse():
    assert trova_gia_inseriti([da_confermare("m1", "2026-10-27", 1800, "Unicredit")],
                              [uscita("a", "27/10/2026", 1800, "Unicredit")]) == {}
