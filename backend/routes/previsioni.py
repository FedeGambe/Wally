"""
Rotta della pagina Previsioni:

  POST /api/previsioni   stime di fine mese, prossimi 12 mesi e patrimonio

L'app manda i dati che ha già in memoria (gli stessi che mostra): così non si
rilegge il foglio a ogni cursore spostato, e in modalità incognito arrivano i
dati finti, quindi anche le previsioni sono finte.
"""
import time
from datetime import date

from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.domain.previsioni import calcola_previsioni
from backend.security.accesso import da_proprietario, non_autorizzato, token_bearer

router = APIRouter(prefix="/api")

# Il controllo del proprietario costa una chiamata a Google: per non rifarlo a
# ogni cursore spostato, un token già controllato vale 10 minuti.
VALIDITA_CONTROLLO_S = 600
_token_controllati: dict[str, float] = {}


class RichiestaPrevisioni(BaseModel):
    dati: dict
    ipotesi: dict | None = None
    oggi: str | None = None  # "AAAA-MM-GG"; di solito manca e vale la data del server


def _autorizzato(request: Request) -> bool:
    token = token_bearer(request)
    adesso = time.time()
    if token and _token_controllati.get(token, 0) > adesso:
        return True
    if not da_proprietario(request):
        return False
    for vecchio in [t for t, scadenza in _token_controllati.items() if scadenza <= adesso]:
        del _token_controllati[vecchio]
    _token_controllati[token] = adesso + VALIDITA_CONTROLLO_S
    return True


@router.post("/previsioni")
def previsioni(request: Request, r: RichiestaPrevisioni):
    if not _autorizzato(request):
        return non_autorizzato()
    oggi = date.fromisoformat(r.oggi) if r.oggi else date.today()
    return calcola_previsioni(r.dati, oggi, r.ipotesi)
