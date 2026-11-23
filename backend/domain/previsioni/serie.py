"""
Serie mensili pulite per le previsioni, dai dati che l'app ha già in memoria.

Ogni mese è un numero intero (anno * 12 + mese - 1), così due mesi si
confrontano e si sottraggono come numeri. `chiave_mese` lo riporta a "2026-10".

Il foglio ha righe già pronte per i mesi futuri (Rendimenti fino al 2045,
broker fino al 2028-2031) con valori a zero o cumulati ricopiati: qui si
tengono solo i mesi fino a quello di oggi.
"""
from datetime import date

from backend.domain.conversioni import numero_localizzato
from backend.domain.cruscotto import MESI, leggi_mese


def indice_mese(anno: int, mese: int) -> int:
    """Trasforma anno e mese in un numero solo, per fare i conti con i mesi.

    Esempio: indice_mese(2026, 11) → 24322 (2026 × 12 + 11 - 1).
    Il mese dopo è 24323: per andare avanti di un mese basta +1, anche a
    cavallo d'anno (dicembre + 1 = gennaio dell'anno dopo).
    """
    return anno * 12 + mese - 1


def anno_e_mese(indice: int) -> tuple[int, int]:
    """Il contrario di indice_mese: dal numero torna ad anno e mese.

    Esempio: anno_e_mese(24322) → (2026, 11).
    """
    return indice // 12, indice % 12 + 1


def chiave_mese(indice: int) -> str:
    """Il mese come testo "AAAA-MM", il formato che riceve l'app.

    Esempio: chiave_mese(24322) → "2026-11".
    """
    anno, mese = anno_e_mese(indice)
    return f"{anno}-{mese:02d}"


def numero(valore) -> float:
    """Legge un numero da un campo del foglio, qualunque forma abbia.

    Riceve: un numero, un testo all'italiana o niente.
    Restituisce: sempre un float; 0.0 se il campo è vuoto o non è un numero.
    Esempi: numero("1.234,50") → 1234.5 · numero(7) → 7.0 · numero("") → 0.0
    """
    if isinstance(valore, bool) or valore is None:
        return 0.0
    if isinstance(valore, (int, float)):
        return float(valore)
    convertito = numero_localizzato(str(valore))
    return float(convertito) if isinstance(convertito, (int, float)) else 0.0


def mese_da_nome(nome) -> int | None:
    """Numero del mese (1-12) dal suo nome; bastano le prime 3 lettere.

    Esempi: mese_da_nome("ottobre") → 10 · mese_da_nome("Ott") → 10
    · mese_da_nome("xx") → None
    """
    testo = str(nome or "").strip().lower()
    return MESI.get(testo[:3]) if len(testo) >= 3 else None


def mese_da_testo(testo, anno=None) -> int | None:
    """Indice del mese (vedi indice_mese) da come è scritto sul foglio.

    Riceve: un testo con il mese, e se serve l'anno a parte.
    Restituisce: l'indice del mese, o None se non si capisce.
    Esempi, tutti → 24321 (ottobre 2026):
      mese_da_testo("ottobre 2026") · mese_da_testo("Ott 26")
      mese_da_testo("2026-10") · mese_da_testo("Ottobre", 2026)
    """
    letto = leggi_mese(testo)
    if letto:
        return indice_mese(*letto)
    mese = mese_da_nome(testo)
    anno = int(numero(anno)) if anno else 0
    if mese and anno:
        return indice_mese(2000 + anno if anno < 100 else anno, mese)
    return None


def data_da_testo(testo) -> date | None:
    """Data da come è scritta sul foglio.

    Esempi: "23/11/2026", "23/11/26" e "2026-11-23" → date(2026, 11, 23).
    Restituisce None se il testo non è una data ("ciao", vuoto).
    """
    t = str(testo or "").strip()
    try:
        if "/" in t:
            g, m, a = t.split("/")[:3]
            a = int(a)
            return date(2000 + a if a < 100 else a, int(m), int(g))
        if "-" in t:
            return date.fromisoformat(t[:10])
    except (ValueError, TypeError):
        return None
    return None


def serie_risparmio(righe: list[dict], oggi: date) -> list[dict]:
    """Le righe della scheda Risparmio pulite, un mese per riga.

    Riceve: le righe di Risparmio come le manda l'app, e la data di oggi.
    Restituisce: una lista in ordine di mese, ognuna con
      mese (indice), entrate, spese, primarie, secondarie, investito, risparmio.
    Restano fuori i mesi futuri e quelli tutti a zero (il foglio ha righe già
    pronte per gli anni dopo).
    """
    corrente = indice_mese(oggi.year, oggi.month)
    per_mese: dict[int, dict] = {}
    for r in righe or []:
        indice = mese_da_testo(r.get("mese"), r.get("anno"))
        if indice is None or indice > corrente:
            continue
        entrate, spese = numero(r.get("entrate")), numero(r.get("speseTotali"))
        if not entrate and not spese:
            continue
        investito = numero(r.get("investito", r.get("investiti")))
        per_mese[indice] = {
            "mese": indice,
            "entrate": entrate,
            "spese": spese,
            "primarie": numero(r.get("spesePrimarie")),
            "secondarie": numero(r.get("speseSecondarie")),
            "investito": investito,
            # Soldi rimasti sui conti: il foglio lo calcola già ("Risparmio").
            "risparmio": numero(r.get("risparmioNetto", r.get("risparmio"))),
        }
    return [per_mese[k] for k in sorted(per_mese)]


def serie_rendimenti(righe: list[dict], oggi: date) -> dict[int, dict]:
    """Rendimento di mercato e valore del portafoglio, mese per mese.

    Riceve: le righe della scheda Rendimenti e la data di oggi.
    Restituisce: {indice del mese: {"rendimento", "versato", "valore"}}, in euro,
    solo fino al mese di oggi.
    """
    corrente = indice_mese(oggi.year, oggi.month)
    risultato = {}
    for r in righe or []:
        indice = mese_da_testo(r.get("mese"))
        if indice is None or indice > corrente:
            continue
        risultato[indice] = {
            "rendimento": numero(r.get("rendimentoMensileEuro")),
            "versato": numero(r.get("importoMensileInvestito")),
            "valore": numero(r.get("valoreAttualePortafoglio")),
        }
    return risultato


def serie_fondo_pensione(righe: list[dict], oggi: date) -> dict[int, float]:
    """Versamento nel fondo pensione di ogni mese.

    Riceve: le righe della scheda Fondo Pensione e la data di oggi.
    Restituisce: {indice del mese: euro versati}.
    Sul foglio il mese è solo il nome ("maggio"): l'anno si ricava andando a
    ritroso da oggi, perché le righe sono in ordine e l'ultima non è nel futuro.
    Esempio: oggi novembre 2026, righe "...ottobre, novembre" → l'ultima è
    novembre 2026, quella prima ottobre 2026, e così via all'indietro.
    """
    corrente = indice_mese(oggi.year, oggi.month)
    con_mese = []
    for r in righe or []:
        totale = numero(r.get("totMensile"))
        indice = mese_da_testo(r.get("mese"))
        if indice is not None:
            con_mese.append((indice, totale))
            continue
        mese = mese_da_nome(r.get("mese"))
        if mese:  # la riga "Percentuale" in cima non è un mese e resta fuori
            con_mese.append((-mese, totale))  # anno da ricavare: segnato col meno

    risultato: dict[int, float] = {}
    successivo = corrente + 1
    for indice, totale in reversed(con_mese):
        if indice < 0:
            mese = -indice
            anno = anno_e_mese(successivo - 1)[0]
            indice = indice_mese(anno, mese)
            if indice >= successivo:
                indice -= 12
        if indice <= corrente:
            risultato[indice] = totale
        successivo = indice
    return risultato
