"""Righe grezze del foglio (liste di celle) trasformate negli oggetti dell'app."""
import re
import unicodedata

from backend.domain.conversioni import come_testo_js, numero_localizzato


def nome_campo(intestazione: str) -> str:
    """
    Nome di campo camelCase da un'intestazione del foglio, per le colonne degli
    strumenti dei broker: "Vanguard FTSE All-World" → "vanguardFtseAllWorld",
    "Azioni & Bond" → "azioniAndBond", accenti tolti, mai una cifra in testa.
    """
    if not intestazione:
        return "column"
    testo = intestazione.replace("&", "And").replace("%", "Pct").replace("+", "Plus")
    testo = re.sub("[̀-ͯ]", "", unicodedata.normalize("NFD", testo))
    testo = re.sub(r"[^a-zA-Z0-9\s\-_]", "", testo)

    parole = re.split(r"[\s\-_]+", testo.strip())
    camel = "".join(p.lower() if i == 0 else p[:1].upper() + p[1:].lower() for i, p in enumerate(parole))
    if re.match(r"[0-9]", camel):
        return "col" + camel
    return camel or "column"


def _semplifica(testo: str) -> str:
    # "comulativ..." copre sia "comulativo" che "comulative": i fogli Scalable e
    # Trade Republic hanno lo stesso refuso con desinenze diverse.
    return re.sub(r"[^a-z0-9]", "", testo.lower()).replace("comulativ", "cumulativ")


def _colonna_del_campo(campo: str, intestazione_attesa: str, intestazioni_foglio: list[str]) -> int:
    """
    Colonna del foglio per un campo: prima per intestazione esatta, poi per nome
    del campo, poi per somiglianza. Così l'app regge se nel foglio le colonne
    vengono riordinate, purché le intestazioni restino riconoscibili.
    """
    attesa = intestazione_attesa.lower().strip()
    if attesa in intestazioni_foglio:
        return intestazioni_foglio.index(attesa)
    if campo.lower().strip() in intestazioni_foglio:
        return intestazioni_foglio.index(campo.lower().strip())

    attesa_s, campo_s = _semplifica(attesa), _semplifica(campo)
    for indice, intestazione in enumerate(intestazioni_foglio):
        intestazione_s = _semplifica(intestazione)
        if intestazione_s in (attesa_s, campo_s):
            return indice
        # Non confondere "Risparmio" con "Andamento Risparmio".
        cerca_risparmio = "risparmio" in (attesa_s, campo_s)
        cerca_andamento = "andamento" in attesa_s or "andamento" in campo_s
        if cerca_risparmio and "andamento" in intestazione_s:
            continue
        if cerca_andamento and "andamento" not in intestazione_s:
            continue
        if attesa_s in intestazione_s or intestazione_s in attesa_s:
            return indice
    return -1


def righe_in_oggetti(righe: list[list], campi: list[str], intestazioni: list[str],
                     booleani: list[str] = (), numerici: list[str] = ()) -> list[dict]:
    """
    Dalla riga 2 in giù, un dizionario per riga con i `campi` come chiavi.
    Celle vuote: 0 per i campi numerici, False per i booleani, "" per gli altri.
    Ogni oggetto riceve un id stabile costruito dai suoi valori.
    """
    if not righe or len(righe) <= 1:
        return []
    intestazioni_foglio = [str(h or "").strip().lower() for h in righe[0]]
    colonne = [_colonna_del_campo(c, intestazioni[i], intestazioni_foglio) for i, c in enumerate(campi)]

    oggetti = []
    for numero_riga, riga in enumerate(righe[1:], start=1):
        oggetto = {}
        for campo, colonna in zip(campi, colonne):
            valore = riga[colonna] if 0 <= colonna < len(riga) else None
            if valore is None or valore == "":
                oggetto[campo] = 0 if campo in numerici else False if campo in booleani else ""
            elif campo in booleani:
                oggetto[campo] = str(valore).upper() in ("TRUE", "SI", "SÌ")
            elif campo in numerici:
                oggetto[campo] = numero_localizzato(valore)
            else:
                oggetto[campo] = valore

        parti = [oggetto.get(k) for k in ("data", "descrizione", "importo", "mese", "categoria")]
        base = "-".join(come_testo_js(p) for p in parti if p)
        oggetto["id"] = f"{base}-{numero_riga}" if base else f"row-{numero_riga}"
        oggetti.append(oggetto)
    return oggetti
