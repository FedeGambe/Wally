"""
Rotte di scrittura sul foglio Google dell'utente, con il suo token. Il lavoro
lo fanno le procedure di services/scritture.py.

  POST /api/fogli/riga               aggiunge una riga (Uscite, Entrate, Trasferimenti, Analisi consumi…)
  POST /api/fogli/portafoglio        aggiorna i contatori delle banconote (Portafoglio Raw)
  POST /api/fogli/investimenti       importi mese × strumento su Scalable / Trade Republic
  POST /api/fogli/strumento          nuova colonna strumento su un broker
  POST /api/fogli/verifica-mensile   saldi, interessi, saveback… in celle vuote dei broker
  GET  /api/fogli/saveback           strumenti in cui investire il saveback e l'ultimo usato
  PUT  /api/fogli/dati-base          conti, categorie, soglie e preset sul foglio di configurazione
  POST /api/fogli/nuovo              crea un foglio nuovo con le schede dell'app

Se qualcosa non torna (colonna o mese mancante, cella già piena) la risposta è
400 e sul foglio non è stato scritto niente.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.routes.comune import con_utente
from backend.services import scritture

router = APIRouter(prefix="/api/fogli")


class RichiestaRiga(BaseModel):
    """Una riga da aggiungere: foglio, nome della scheda e i valori ({campo: valore})."""
    foglio: str
    scheda: str
    record: dict


@router.post("/riga")
def aggiungi_riga(request: Request, r: RichiestaRiga):
    """Aggiunge una riga in fondo a una scheda (Uscite, Entrate, Trasferimenti,
    Analisi consumi…). Le colonne con formula copiano la formula della riga sopra.
    """
    return con_utente(request, f'Impossibile aggiungere la riga su "{r.scheda}"',
                      lambda sheets: scritture.aggiungi_riga(sheets, r.foglio, r.scheda, r.record))


class RichiestaPortafoglio(BaseModel):
    """Le banconote da aggiungere (positivi) o togliere (negativi), per taglio:
    {20: 2, 50: -1}.
    """
    foglio: str
    variazioni: dict[int, int]


@router.post("/portafoglio")
def aggiorna_portafoglio(request: Request, r: RichiestaPortafoglio):
    """Aggiorna i contatori delle banconote nel "Portafoglio Raw". Errore se un
    contatore andrebbe sotto zero.
    """
    return con_utente(request, "Impossibile aggiornare il Portafoglio Raw",
                      lambda sheets: scritture.aggiorna_portafoglio(sheets, r.foglio, r.variazioni))


class Voce(BaseModel):
    """Un importo da scrivere su uno strumento."""
    strumento: str
    importo: float | int


class RichiestaInvestimenti(BaseModel):
    """Importi da scrivere nella riga di un mese di una scheda broker.
    `somma` = True: si accodano a quelli presenti (investimento extra).
    """
    foglio: str
    scheda: str
    mese: str          # come in colonna A, es. "ottobre 2026"
    voci: list[Voce]
    somma: bool = False


@router.post("/investimenti")
def scrivi_investimenti(request: Request, r: RichiestaInvestimenti):
    """Scrive gli importi mese × strumento su Scalable o Trade Republic.

    Contributi ricorrenti: solo in celle vuote (o con il solo saveback).
    Investimento extra (somma): l'importo si accoda a quello presente.
    """
    voci = [v.model_dump() for v in r.voci]
    return con_utente(request, f'Impossibile scrivere su "{r.scheda}"',
                      lambda sheets: scritture.scrivi_investimenti(sheets, r.foglio, r.scheda, r.mese, voci, r.somma))


class RichiestaStrumento(BaseModel):
    """Uno strumento nuovo: nome, asset class (riga 2), mese e importo facoltativo."""
    foglio: str
    scheda: str
    nome: str
    assetClass: str     # "Azioni" | "Obbligazioni" | "Monetario" (riga 2)
    mese: str
    importo: float | int | None = None   # None = solo la colonna, cella del mese vuota


@router.post("/strumento")
def aggiungi_strumento(request: Request, r: RichiestaStrumento):
    """Aggiunge la colonna di uno strumento nuovo su una scheda broker."""
    return con_utente(request, f'Impossibile aggiungere la colonna su "{r.scheda}"',
                      lambda sheets: scritture.aggiungi_strumento(sheets, r.foglio, r.scheda, r.nome, r.assetClass,
                                                                  r.mese, r.importo))


class VoceVerifica(BaseModel):
    """Un valore della verifica mensile: colonna, mese e valore (più lo strumento
    in cui investire, solo per i Savebacks).
    """
    intestazione: str
    meseLabel: str
    valore: float | int
    prodotto: str | None = None   # solo per Savebacks: lo strumento in cui va investito


class RichiestaVerifica(BaseModel):
    """Le voci della verifica mensile di una scheda broker."""
    foglio: str
    scheda: str
    voci: list[VoceVerifica]


@router.post("/verifica-mensile")
def verifica_mensile(request: Request, r: RichiestaVerifica):
    """Scrive saldi, interessi, saveback… del mese in celle VUOTE dei broker. Se
    anche una sola è già piena non scrive niente.
    """
    voci = [v.model_dump() for v in r.voci]
    return con_utente(request, f'Impossibile scrivere su "{r.scheda}"',
                      lambda sheets: scritture.verifica_mensile(sheets, r.foglio, r.scheda, voci))


@router.get("/saveback")
def prodotti_saveback(request: Request, foglio: str, scheda: str = "Trade Republic"):
    """Gli strumenti in cui può andare il saveback e quello usato l'ultima volta
    (ricavato dalle formule del foglio).
    """
    return con_utente(request, f'Impossibile leggere gli strumenti di "{scheda}"',
                      lambda sheets: scritture.prodotti_saveback(sheets, foglio, scheda))


class RichiestaDatiBase(BaseModel):
    """I Dati Base da salvare (conti, categorie, soglie, preset) e il foglio."""
    foglio: str
    dati: dict


@router.put("/dati-base")
def salva_dati_base(request: Request, r: RichiestaDatiBase):
    """Riscrive le schede dei Dati Base sul foglio di configurazione."""
    return con_utente(request, "Impossibile scrivere sul foglio di configurazione",
                      lambda sheets: scritture.salva_dati_base(sheets, r.foglio, r.dati))


@router.post("/nuovo")
def nuovo_foglio(request: Request):
    """Crea un foglio Google nuovo con le schede dell'app e ne restituisce l'id."""
    return con_utente(request, "Impossibile creare il foglio Google",
                      lambda sheets: {"spreadsheetId": scritture.crea_foglio(sheets)})
