"""
Dai valori grezzi delle schede (risposta di values:batchGet) all'oggetto dati
che usa l'app. Funzioni pure: la lettura dal foglio sta in routes/fogli.py.

L'oggetto ha la stessa forma che produceva fetchSpreadsheetData nel frontend
(chiavi camelCase come uscite, entrate, scalableFields, cruscottoInvestimenti…).
"""
from collections.abc import Iterable

from backend.domain.conversioni import intero_iniziale, numero_localizzato
from backend.domain.cruscotto import calcola_cruscotto
from backend.domain.righe import nome_campo, righe_in_oggetti
from backend.models.foglio import BROKER, SCHEDE, TITOLI_DATI_BASE, SchedaFoglio


def valori_per_scheda(value_ranges: list[dict]):
    """Funzione che restituisce le righe di una scheda dato il titolo ([] se non letta)."""
    def valori(titolo: str) -> list[list]:
        prefisso = titolo.lower() + "!"
        for vr in value_ranges:
            if str(vr.get("range", "")).replace("'", "").lower().startswith(prefisso):
                return vr.get("values", [])
        return []
    return valori


def schede_presenti(schede: Iterable[SchedaFoglio], titoli_foglio: list[str]) -> list[SchedaFoglio]:
    """Solo le schede che esistono davvero: un intervallo su un tab mancante fa
    fallire l'intera lettura batchGet."""
    titoli = {t.lower() for t in titoli_foglio}
    return [s for s in schede if s.titolo.lower() in titoli]


def _maiuscola_iniziale(testo: str) -> str:
    return testo[:1].upper() + testo[1:].lower()


# --- Colonne degli strumenti dei broker ------------------------------------

def _categoria_da_riga2(testo: str) -> str | None:
    """Categoria di una colonna strumento dalla riga 2 (Azioni/Obbligazioni/Monetari)."""
    testo = testo.lower()
    # Prima le obbligazioni: "obbligazioni" contiene la parola "azioni".
    if "obbligazione" in testo or "obbligazioni" in testo or "bond" in testo:
        return "obbligazioni"
    if "azioni" in testo:
        return "azioni"
    if "monetari" in testo:
        return "monetari"
    return None


def colonne_strumenti(righe: list[list]) -> list[tuple[str, str, str]]:
    """(nome campo, intestazione, categoria) di ogni colonna strumento della scheda."""
    if len(righe) < 2:
        return []
    riga1, riga2 = righe[0], righe[1]
    colonne = []
    for i, cella in enumerate(riga1):
        intestazione = str(cella or "").strip()
        tipo = str(riga2[i]).strip() if i < len(riga2) and riga2[i] else ""
        categoria = _categoria_da_riga2(tipo)
        if categoria:
            colonne.append((nome_campo(intestazione), intestazione, categoria))
    return colonne


def strumenti_attivi(righe: list[list]) -> list[dict]:
    """
    Strumenti con saldo positivo nell'ultima riga con una data (colonna A),
    esclusa la liquidità: alimenta scalableInstruments / tradeRepublicInstruments.
    """
    if not righe or len(righe) < 2:
        return []
    def ha_data(riga: list) -> bool:
        return bool(riga) and riga[0] is not None and str(riga[0]).strip() != ""

    ultima = next((i for i in range(len(righe) - 1, 1, -1) if ha_data(righe[i])), len(righe) - 1)

    strumenti = []
    for colonna in range(1, len(righe[0])):
        nome = str(righe[0][colonna] or "").strip()
        cella_tipo = righe[1][colonna] if colonna < len(righe[1]) else None
        tipo = str(cella_tipo or "").strip()
        if not nome or not tipo:
            continue
        t = tipo.lower()
        if "liquidit" in t or "cash" in t or "conto" in t:
            continue
        obbligazioni = "obbligazioni" in t or "bond" in t or "obbligazion" in t
        monetari = not obbligazioni and any(p in t for p in ("monetar", "swap", "overnight"))
        azioni = not obbligazioni and not monetari and any(p in t for p in ("azioni", "equity", "stocks", "stock", "azion"))
        if not (azioni or obbligazioni or monetari):
            continue

        riga = righe[ultima]
        valore = numero_localizzato(riga[colonna]) if colonna < len(riga) and riga[colonna] is not None else 0
        if valore > 0:
            strumenti.append({
                "nome": nome,
                "tipo": "Azioni" if azioni else "Obbligazioni" if obbligazioni else "Monetari",
                "importoInvestito": valore,
                "rendimentoMensileEuro": 0,
                "rendimentoMensilePerc": 0,
                "rendimentoCumulativoEuro": 0,
                "rendimentoCumulativoPerc": 0,
                "saldoConto": valore,
            })
    return strumenti


# --- Dati Base (liste e preset) ---------------------------------------------

def _nomi(righe: list[dict]) -> list[str]:
    return [n for n in (str(r.get("nome") or "").strip() for r in righe) if n]


def _macro_categorie(righe: list[dict]) -> list[dict]:
    """Una riga per (macro, categoria) → una voce per macro con le sue categorie.
    Le macro senza categorie hanno una riga con categoria vuota."""
    macro: dict[str, dict] = {}
    for r in righe:
        nome = str(r.get("macro") or "").strip()
        if not nome:
            continue
        voce = macro.setdefault(nome, {"nome": nome, "icon": str(r.get("icon") or "").strip() or "💸", "categorie": []})
        categoria = str(r.get("categoria") or "").strip()
        if categoria:
            voce["categorie"].append(categoria)
    return list(macro.values())


def _soglie(righe: list[dict]) -> list[dict]:
    """Il foglio scrive le soglie come frazione (0,35 = 35%), l'app come 0-100."""
    soglie = []
    for r in righe:
        grezza = float(r.get("percentuale") or 0)
        categoria = str(r.get("categoria") or "").strip()
        if categoria:
            soglie.append({"categoria": categoria, "percentuale": grezza * 100 if 0 < grezza <= 1 else grezza})
    return soglie


def preset_investimenti_da_matrice(righe: list[list]) -> list[dict]:
    """Scheda "Preset Investimenti Ricorrenti": riga 1 = "Conto" + strumenti, una
    riga per broker, importo nella cella broker × strumento (vuota = niente)."""
    if not righe or len(righe) < 2:
        return []
    strumenti = [str(h or "").strip() for h in righe[0]]
    preset = []
    for riga in righe[1:]:
        broker = str((riga[0] if riga else "") or "").strip()
        if not broker:
            continue
        for colonna in range(1, len(strumenti)):
            importo = numero_localizzato(riga[colonna] if colonna < len(riga) else None)
            if strumenti[colonna] and importo > 0:
                preset.append({"id": f"preset-i-{broker}-{colonna}", "broker": broker,
                               "strumento": strumenti[colonna], "importo": importo})
    return preset


def _preset_uscite(righe: list[dict]) -> list[dict]:
    preset = [{
        "id": f"preset-{i}",
        "nome": str(r.get("nome") or "").strip(),
        "macroCategoria": str(r.get("macroCategoria") or "").strip(),
        "categoria": str(r.get("categoria") or "").strip(),
        "conto": str(r.get("conto") or "").strip(),
        "importo": float(r.get("importo") or 0),
        "giornoDelMese": float(r.get("giornoDelMese") or 1),
        "primaria": bool(r.get("primaria")),
    } for i, r in enumerate(righe)]
    return [p for p in preset if p["nome"]]


def _preset_trasferimenti(righe: list[dict]) -> list[dict]:
    preset = [{
        "id": f"preset-t-{i}",
        "categoria": str(r.get("categoria") or "").strip(),
        "contoOrdinante": str(r.get("contoOrdinante") or "").strip(),
        "contoBeneficiario": str(r.get("contoBeneficiario") or "").strip(),
        "importo": float(r.get("importo") or 0),
    } for i, r in enumerate(righe)]
    return [p for p in preset if p["categoria"]]


def _oggetti(scheda: SchedaFoglio, righe: list[list], campi=None, intestazioni=None, numerici=None) -> list[dict]:
    return righe_in_oggetti(righe, campi or scheda.campi, intestazioni or scheda.intestazioni,
                            scheda.booleani, numerici or scheda.numerici)


def dati_base(value_ranges: list[dict], titoli_foglio: list[str]) -> dict:
    """Conti, categorie, soglie e preset dal foglio di configurazione."""
    valori = valori_per_scheda(value_ranges)
    schede = schede_presenti((s for s in SCHEDE if s.titolo in TITOLI_DATI_BASE), titoli_foglio)
    dati: dict = {}
    for scheda in schede:
        righe = valori(scheda.titolo)
        if scheda.titolo == "Preset Investimenti Ricorrenti":
            dati["presetInvestimenti"] = preset_investimenti_da_matrice(righe)
            continue
        oggetti = _oggetti(scheda, righe)
        match scheda.titolo:
            case "Preset Uscite Ricorrenti":
                dati["presetUscite"] = _preset_uscite(oggetti)
            case "Preset Trasferimenti Ricorrenti":
                dati["presetTrasferimenti"] = _preset_trasferimenti(oggetti)
            case "Preset Fondo Pensione":
                quota = float((oggetti[0] if oggetti else {}).get("quota") or 0)
                if quota > 0:
                    dati["quotaFondoPensione"] = quota
            case "Conti":
                dati["conti"] = _nomi(oggetti)
            case "Categorie Entrate":
                dati["categorieEntrate"] = _nomi(oggetti)
            case "Categorie Uscite":
                dati["macroCategorieUscite"] = _macro_categorie(oggetti)
            case "Soglie":
                dati["soglie"] = _soglie(oggetti)
    return dati


# --- Foglio principale -------------------------------------------------------

def _sistema_risparmio(r: dict, anno_corrente: int) -> dict:
    """"ottobre 26" → mese "Ottobre", anno 2026; più i nomi usati dalle pagine."""
    r = dict(r)
    mese = str(r.get("mese") or "").strip()
    if mese:
        parti = mese.split()
        r["mese"] = _maiuscola_iniziale(parti[0])
        if len(parti) == 2:
            anno = intero_iniziale(parti[1])
            if anno is not None:
                r["anno"] = 2000 + anno if anno < 100 else anno
    r["anno"] = r.get("anno") or anno_corrente
    r["investito"] = float(r.get("investiti") or 0)
    r["risparmioNetto"] = float(r.get("risparmio") or 0)
    r["andamentoRisparmio"] = float(r.get("andamentoRisparmio") or 0)
    return r


def _sistema_entrata(r: dict, indice: int, anno_corrente: int) -> dict:
    r = {**r, "id": f"e-dyn-{indice + 1}"}
    if r.get("mese"):
        r["mese"] = _maiuscola_iniziale(str(r["mese"]))
    anno = r.get("anno")
    r["anno"] = (2000 + anno if anno < 100 else anno) if anno else anno_corrente
    return r


def dati_principali(value_ranges: list[dict], titoli_foglio: list[str], anno_corrente: int) -> dict:
    """Tutte le schede del foglio principale, più i campi calcolati."""
    valori = valori_per_scheda(value_ranges)
    titoli = {t.lower() for t in titoli_foglio}
    dati: dict = {}

    for scheda in SCHEDE:
        righe = valori(scheda.titolo)
        campi, intestazioni, numerici = list(scheda.campi), list(scheda.intestazioni), list(scheda.numerici)

        # Broker: alle colonne fisse si aggiungono quelle degli strumenti.
        prefisso = BROKER.get(scheda.titolo)
        if prefisso and len(righe) >= 2:
            categorie = {}
            for campo, intestazione, categoria in colonne_strumenti(righe):
                categorie[campo] = categoria
                if campo not in campi:
                    campi.append(campo)
                    intestazioni.append(intestazione)
                    numerici.append(campo)
            dati[f"{prefisso}Fields"] = campi
            dati[f"{prefisso}Headers"] = intestazioni
            dati[f"{prefisso}ColumnCategories"] = categorie

        dati[scheda.chiave] = _oggetti(scheda, righe, campi, intestazioni, numerici)

    dati["risparmio"] = [_sistema_risparmio(r, anno_corrente) for r in dati["risparmio"]]
    dati["entrate"] = [_sistema_entrata(r, i, anno_corrente) for i, r in enumerate(dati["entrate"])]

    # Dati Base anche dal foglio principale, se ci sono. Una scheda vuota NON
    # deve diventare una lista vuota: l'app la prenderebbe per un dato vero e
    # cancellerebbe i valori di default già caricati.
    conti = _nomi(dati.pop("contiRows"))
    if conti:
        dati["conti"] = conti
    categorie_entrate = _nomi(dati.pop("categorieEntrateRows"))
    if categorie_entrate:
        dati["categorieEntrate"] = categorie_entrate
    macro = _macro_categorie(dati.pop("categorieUsciteRows"))
    if macro:
        dati["macroCategorieUscite"] = macro
    soglie = _soglie(dati.pop("soglieRows"))
    if soglie:
        dati["soglie"] = soglie
    # I preset arrivano solo dal foglio di configurazione (dati_base).
    for chiave in ("presetUsciteRows", "presetTrasferimentiRows", "presetInvestimentiRows", "presetFondoPensioneRows"):
        dati.pop(chiave)

    righe_risparmio = valori("Risparmio")
    dati["risparmioHeaders"] = righe_risparmio[0] if righe_risparmio else []

    dati["scalableInstruments"] = strumenti_attivi(valori("Scalable")) if "scalable" in titoli else []
    dati["tradeRepublicInstruments"] = strumenti_attivi(valori("Trade Republic")) if "trade republic" in titoli else []

    cruscotto = calcola_cruscotto(dati)
    if cruscotto:
        dati["cruscottoInvestimenti"] = cruscotto
    return dati

