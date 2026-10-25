"""
Rotte di scrittura sul foglio Google dell'utente, con il suo token. Il lavoro
lo fanno le procedure di services/scritture.py.

  POST /api/fogli/riga               aggiunge una riga (Uscite, Entrate, Trasferimenti, Analisi consumi…)
  POST /api/fogli/portafoglio        aggiorna i contatori delle banconote (Portafoglio Raw)
  POST /api/fogli/investimenti       importi mese × strumento su Scalable / Trade Republic
  POST /api/fogli/strumento          nuova colonna strumento su un broker
  POST /api/fogli/verifica-mensile   saldi, interessi, saveback… in celle vuote dei broker
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
    foglio: str
    scheda: str
    record: dict


@router.post("/riga")
def aggiungi_riga(request: Request, r: RichiestaRiga):
    return con_utente(request, f'Impossibile aggiungere la riga su "{r.scheda}"',
                      lambda sheets: scritture.aggiungi_riga(sheets, r.foglio, r.scheda, r.record))


class RichiestaPortafoglio(BaseModel):
    foglio: str
    variazioni: dict[int, int]


@router.post("/portafoglio")
def aggiorna_portafoglio(request: Request, r: RichiestaPortafoglio):
    return con_utente(request, "Impossibile aggiornare il Portafoglio Raw",
                      lambda sheets: scritture.aggiorna_portafoglio(sheets, r.foglio, r.variazioni))


class Voce(BaseModel):
    strumento: str
    importo: float | int


class RichiestaInvestimenti(BaseModel):
    foglio: str
    scheda: str
    mese: str          # come in colonna A, es. "ottobre 2026"
    voci: list[Voce]
    somma: bool = False


@router.post("/investimenti")
def scrivi_investimenti(request: Request, r: RichiestaInvestimenti):
    voci = [v.model_dump() for v in r.voci]
    return con_utente(request, f'Impossibile scrivere su "{r.scheda}"',
                      lambda sheets: scritture.scrivi_investimenti(sheets, r.foglio, r.scheda, r.mese, voci, r.somma))


class RichiestaStrumento(BaseModel):
    foglio: str
    scheda: str
    nome: str
    assetClass: str     # "Azioni" | "Obbligazioni" | "Monetario" (riga 2)
    mese: str
    importo: float | int | None = None   # None = solo la colonna, cella del mese vuota


@router.post("/strumento")
def aggiungi_strumento(request: Request, r: RichiestaStrumento):
    return con_utente(request, f'Impossibile aggiungere la colonna su "{r.scheda}"',
                      lambda sheets: scritture.aggiungi_strumento(sheets, r.foglio, r.scheda, r.nome, r.assetClass,
                                                                  r.mese, r.importo))


class VoceVerifica(BaseModel):
    intestazione: str
    meseLabel: str
    valore: float | int


class RichiestaVerifica(BaseModel):
    foglio: str
    scheda: str
    voci: list[VoceVerifica]


@router.post("/verifica-mensile")
def verifica_mensile(request: Request, r: RichiestaVerifica):
    voci = [v.model_dump() for v in r.voci]
    return con_utente(request, f'Impossibile scrivere su "{r.scheda}"',
                      lambda sheets: scritture.verifica_mensile(sheets, r.foglio, r.scheda, voci))


class RichiestaDatiBase(BaseModel):
    foglio: str
    dati: dict


@router.put("/dati-base")
def salva_dati_base(request: Request, r: RichiestaDatiBase):
    return con_utente(request, "Impossibile scrivere sul foglio di configurazione",
                      lambda sheets: scritture.salva_dati_base(sheets, r.foglio, r.dati))


@router.post("/nuovo")
def nuovo_foglio(request: Request):
    return con_utente(request, "Impossibile creare il foglio Google",
                      lambda sheets: {"spreadsheetId": scritture.crea_foglio(sheets)})
