"""
Rotte /api/fogli/*: lettura dei fogli Google dell'utente, con il suo token.

  GET /api/fogli/dati?foglio=<id>        foglio principale (uscite, entrate,
                                         investimenti… e cruscotto calcolato)
  GET /api/fogli/dati-base?foglio=<id>   foglio di configurazione (conti,
                                         categorie, soglie, preset)

Il browser manda "Authorization: Bearer <token Google>". Se Google lo rifiuta
la risposta è 401 con un errore che inizia per "UNAUTHENTICATED": l'app lo
riconosce e rinnova la sessione.
"""
from datetime import datetime

from fastapi import APIRouter, Request

from backend.domain.lettura import dati_base, dati_principali, schede_presenti
from backend.models.foglio import SCHEDE, TITOLI_DATI_BASE
from backend.routes.comune import con_utente
from backend.services.google_sheets import GoogleSheets

router = APIRouter(prefix="/api/fogli")


@router.get("/dati")
def dati(request: Request, foglio: str):
    def lavoro(sheets: GoogleSheets):
        titoli = sheets.titoli_schede(foglio)
        intervalli = [s.intervallo for s in schede_presenti(SCHEDE, titoli)]
        return dati_principali(sheets.leggi_intervalli(foglio, intervalli), titoli, datetime.now().year)

    return con_utente(request, "Impossibile leggere il foglio Google", lavoro)


@router.get("/dati-base")
def dati_base_configurazione(request: Request, foglio: str):
    def lavoro(sheets: GoogleSheets):
        titoli = sheets.titoli_schede(foglio)
        schede = schede_presenti((s for s in SCHEDE if s.titolo in TITOLI_DATI_BASE), titoli)
        return dati_base(sheets.leggi_intervalli(foglio, [s.intervallo for s in schede]), titoli)

    return con_utente(request, "Impossibile leggere il foglio di configurazione", lavoro)
