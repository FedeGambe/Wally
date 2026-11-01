"""
Procedure di scrittura sul foglio: leggono quello che serve, decidono le celle
con le funzioni pure di domain/scrittura.py e scrivono solo quelle. Le usano
le rotte /api/fogli/* (routes/scritture.py) e la registrazione automatica dei
movimenti banca (routes/banca.py).

Se qualcosa non torna (colonna o mese mancante, cella già piena) sollevano
ErroreScrittura senza aver scritto niente.
"""
from backend.domain.lettura import schede_presenti
from backend.domain.scrittura import (
    PORTAFOGLIO_COLONNE,
    PORTAFOGLIO_INTERVALLO,
    ErroreScrittura,
    celle_investimenti,
    celle_portafoglio,
    celle_riga_nuova,
    cella_con_saveback,
    celle_verifica_mensile,
    colonna_importo_mensile,
    colonna_nuovo_strumento,
    colonne_degli_strumenti,
    colonne_prodotti,
    controlla_celle_vuote,
    controlla_strumento_nuovo,
    lettera_colonna,
    normalizza_intestazione,
    matrice_preset_investimenti,
    oggetti_dati_base,
    richieste_preparazione_riga,
    riga_del_mese,
    righe_scheda,
    ultimo_prodotto_saveback,
)
from backend.models.foglio import SCHEDE, SCHEDE_DA_CREARE, TITOLI_DATI_BASE, scheda
from backend.services.google_sheets import ErroreSheets, GoogleSheets

SCHEDA_PRESET_INVESTIMENTI = "Preset Investimenti Ricorrenti"


def _proprieta(sheets: GoogleSheets, foglio: str, titolo: str) -> dict:
    # Confronto senza maiuscole: "Analisi consumi" nella mappa, "Analisi Consumi" sul foglio.
    trovata = next((p for p in sheets.proprieta_schede(foglio) if str(p.get("title", "")).lower() == titolo.lower()), None)
    if trovata is None:
        raise ErroreScrittura(f'Tab "{titolo}" non trovata sul foglio Google.')
    return trovata


def _prima_riga(sheets: GoogleSheets, foglio: str, titolo: str) -> list:
    valori = sheets.leggi_valori(foglio, f"{titolo}!1:1", "FORMATTED_VALUE")
    return valori[0] if valori else []


def _riga_mese(sheets: GoogleSheets, foglio: str, titolo: str, mese: str) -> int:
    riga = riga_del_mese(sheets.leggi_valori(foglio, f"{titolo}!A:A", "FORMATTED_VALUE"), mese)
    if riga is None:
        raise ErroreScrittura(f'Riga "{mese}" non trovata nella colonna A di "{titolo}".')
    return riga


def aggiungi_riga(sheets: GoogleSheets, foglio: str, titolo: str, record: dict) -> None:
    """
    Una riga in fondo alla scheda, cella per cella. La riga di destinazione è la
    prima libera sotto l'ultima con un valore in colonna A (le righe con solo
    formule in attesa non contano).
    """
    definizione = scheda(titolo)
    if definizione is None:
        raise ErroreScrittura(f'Tab "{titolo}" non configurata nella mappa delle schede.')
    riga = len(sheets.leggi_valori(foglio, f"{titolo}!A:A")) + 1

    proprieta = _proprieta(sheets, foglio, titolo)
    righe_griglia = proprieta.get("gridProperties", {}).get("rowCount", 0)
    sheets.modifica_struttura(foglio, richieste_preparazione_riga(definizione, proprieta["sheetId"], riga, righe_griglia))

    formule_sopra = []
    if definizione.formule and riga > 2:
        ultima = lettera_colonna(len(definizione.campi) - 1)
        valori = sheets.leggi_valori(foglio, f"{titolo}!A{riga - 1}:{ultima}{riga - 1}", "FORMULA")
        formule_sopra = valori[0] if valori else []

    sheets.scrivi_celle(foglio, celle_riga_nuova(definizione, record, riga, formule_sopra))


def aggiorna_portafoglio(sheets: GoogleSheets, foglio: str, variazioni: dict[int, int]) -> None:
    if not any(variazioni.get(t) for t in PORTAFOGLIO_COLONNE):
        return
    valori = sheets.leggi_valori(foglio, PORTAFOGLIO_INTERVALLO)
    sheets.scrivi_celle(foglio, celle_portafoglio(valori[0] if valori else [], variazioni))


def scrivi_investimenti(sheets: GoogleSheets, foglio: str, titolo: str, mese: str, voci: list[dict], somma: bool) -> None:
    """Contributi ricorrenti (celle vuote) o investimento extra (somma=True,
    l'importo si accoda a quello presente)."""
    if not voci:
        return
    intestazioni = _prima_riga(sheets, foglio, titolo)
    colonne = colonne_degli_strumenti(intestazioni, [v["strumento"] for v in voci], titolo)
    riga = _riga_mese(sheets, foglio, titolo, mese)
    valori = sheets.leggi_valori(foglio, f"{titolo}!A{riga}:{lettera_colonna(max(colonne))}{riga}", "FORMULA")
    sheets.scrivi_celle(foglio, celle_investimenti(titolo, mese, riga, voci, colonne, valori[0] if valori else [], somma,
                                                   _colonna_saveback(intestazioni)))


def aggiungi_strumento(sheets: GoogleSheets, foglio: str, titolo: str, nome: str, asset_class: str,
                       mese: str, importo) -> None:
    intestazioni = _prima_riga(sheets, foglio, titolo)
    controlla_strumento_nuovo(titolo, intestazioni, nome)
    colonna_importo = colonna_importo_mensile(intestazioni, titolo)
    riga = _riga_mese(sheets, foglio, titolo, mese)
    valori = sheets.leggi_valori(foglio, f"{titolo}!{lettera_colonna(colonna_importo)}{riga}", "FORMULA")
    formula = str((valori[0][0] if valori and valori[0] else "") or "")
    colonna = colonna_nuovo_strumento(mese, formula, colonna_importo)

    sheet_id = _proprieta(sheets, foglio, titolo)["sheetId"]
    # La colonna eredita il formato di quella a sinistra.
    sheets.modifica_struttura(foglio, [{"insertDimension": {
        "range": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": colonna, "endIndex": colonna + 1},
        "inheritFromBefore": True,
    }}])

    lettera = lettera_colonna(colonna)
    try:
        sheets.scrivi_celle(foglio, [
            {"range": f"{titolo}!{lettera}1", "values": [[nome.strip()]]},
            {"range": f"{titolo}!{lettera}2", "values": [[asset_class]]},
            {"range": f"{titolo}!{lettera}{riga}", "values": [[importo if importo is not None else ""]]},
        ])
    except ErroreSheets as e:
        raise ErroreScrittura(f'Colonna aggiunta su "{titolo}" ({lettera}) ma scrittura non riuscita: {e}. '
                              f"Completa a mano nome, asset class e importo.") from e


def verifica_mensile(sheets: GoogleSheets, foglio: str, titolo: str, voci: list[dict]) -> None:
    """Valori singoli in celle già esistenti e VUOTE: se anche una sola è piena
    non si scrive niente."""
    if not voci:
        return
    intestazioni = _prima_riga(sheets, foglio, titolo)
    celle = celle_verifica_mensile(titolo, voci, intestazioni, sheets.leggi_valori(foglio, f"{titolo}!A:A"))
    attuali = [((vr.get("values") or [[None]])[0] or [None])[0] for vr in sheets.leggi_intervalli(foglio, celle, "FORMULA")]
    controlla_celle_vuote(titolo, voci, attuali)
    scritture = [{"range": c, "values": [[v["valore"]]]} for c, v in zip(celle, voci)]

    # Saveback: la cella dello strumento scelto, nella stessa riga, prende il
    # riferimento alla cella Savebacks (vedi cella_con_saveback).
    colonna_saveback = _colonna_saveback(intestazioni)
    for cella, v in zip(celle, voci):
        prodotto = (v.get("prodotto") or "").strip()
        if not prodotto or colonna_saveback is None:
            continue
        if normalizza_intestazione(v["intestazione"]) != normalizza_intestazione(intestazioni[colonna_saveback]):
            continue
        colonna = colonne_degli_strumenti(intestazioni, [prodotto], titolo)[0]
        riga = int(cella.rsplit("!", 1)[1].lstrip("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
        destinazione = f"{titolo}!{lettera_colonna(colonna)}{riga}"
        valori = sheets.leggi_valori(foglio, destinazione, "FORMULA")
        nuovo = cella_con_saveback((valori[0][0] if valori and valori[0] else None), colonna_saveback, riga)
        if nuovo is not None:
            scritture.append({"range": destinazione, "values": [[nuovo]]})
    sheets.scrivi_celle(foglio, scritture)


def _colonna_saveback(intestazioni: list) -> int | None:
    normalizzate = [normalizza_intestazione(h) for h in intestazioni]
    cercata = normalizza_intestazione("Savebacks")
    return normalizzate.index(cercata) if cercata in normalizzate else None


def prodotti_saveback(sheets: GoogleSheets, foglio: str, titolo: str) -> dict:
    """Strumenti in cui può andare il saveback e quello usato l'ultima volta
    (ricavato dalle formule del foglio, così vale da ogni dispositivo)."""
    intestazioni = _prima_riga(sheets, foglio, titolo)
    colonna_saveback = _colonna_saveback(intestazioni)
    if colonna_saveback is None:
        raise ErroreScrittura(f'Colonna "Savebacks" non trovata nella riga 1 di "{titolo}".')
    formule = sheets.leggi_valori(foglio, f"{titolo}!A:{lettera_colonna(len(intestazioni) - 1)}", "FORMULA")
    colonna_importo = colonna_importo_mensile(intestazioni, titolo)
    formula_importo = next((str(r[colonna_importo]) for r in reversed(formule)
                            if colonna_importo < len(r) and str(r[colonna_importo]).startswith("=")), "")
    colonne = colonne_prodotti(intestazioni, formula_importo, titolo)
    ultimo = ultimo_prodotto_saveback(formule, colonne, colonna_saveback)
    return {
        "prodotti": [str(intestazioni[c]).strip() for c in colonne],
        "ultimo": None if ultimo is None else str(intestazioni[ultimo]).strip(),
    }


def salva_dati_base(sheets: GoogleSheets, foglio: str, dati: dict) -> None:
    """
    Riscrive dalla cella A1 le schede dei Dati Base che esistono sul foglio di
    configurazione. La matrice dei preset investimenti, che può restringersi, si
    svuota prima, ma solo se i preset investimenti sono tra i dati inviati.
    """
    presenti = schede_presenti((s for s in SCHEDE if s.titolo in TITOLI_DATI_BASE), sheets.titoli_schede(foglio))
    if not presenti:
        return
    oggetti = oggetti_dati_base(dati)
    con_investimenti = "presetInvestimenti" in dati and any(s.titolo == SCHEDA_PRESET_INVESTIMENTI for s in presenti)
    presenti = [s for s in presenti if s.titolo != SCHEDA_PRESET_INVESTIMENTI]
    if con_investimenti:
        sheets.svuota(foglio, f"{SCHEDA_PRESET_INVESTIMENTI}!A:ZZ")

    celle = [{"range": f"{s.titolo}!A1", "values": righe_scheda(s, oggetti.get(s.chiave, []))} for s in presenti]
    if con_investimenti:
        celle.append({"range": f"{SCHEDA_PRESET_INVESTIMENTI}!A1",
                      "values": matrice_preset_investimenti(dati.get("presetInvestimenti") or [])})
    sheets.scrivi_celle(foglio, celle)


def crea_foglio(sheets: GoogleSheets) -> str:
    return sheets.crea_foglio("Wally - Dashboard Economica", SCHEDE_DA_CREARE)
