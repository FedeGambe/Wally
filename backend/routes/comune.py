"""Parti comuni delle rotte che lavorano con il token Google dell'utente."""
from collections.abc import Callable

from fastapi import Request
from fastapi.responses import JSONResponse

from backend.domain.scrittura import ErroreScrittura
from backend.security.accesso import token_bearer
from backend.services.google_sheets import ErroreSheets, GoogleSheets

# L'app riconosce gli errori che iniziano per "UNAUTHENTICATED" e rinnova il login.
SESSIONE_SCADUTA = "UNAUTHENTICATED: La sessione di Google è scaduta."


def con_utente(request: Request, cosa: str, lavoro: Callable[[GoogleSheets], dict | None]):
    """
    Esegue `lavoro` con il token dell'utente e traduce gli errori in risposte
    che l'app sa mostrare:
      401  token mancante o rifiutato da Google ("UNAUTHENTICATED: …")
      400  scrittura rifiutata prima di toccare il foglio (cella già piena, mese mancante…)
      502  errore di Google (foglio non condiviso, ID sbagliato…), preceduto da `cosa`
    """
    token = token_bearer(request)
    if not token:
        return JSONResponse({"errore": SESSIONE_SCADUTA}, status_code=401)
    try:
        risultato = lavoro(GoogleSheets(token))
        return {"ok": True} if risultato is None else risultato
    except ErroreScrittura as e:
        return JSONResponse({"errore": str(e)}, status_code=400)
    except ErroreSheets as e:
        if e.stato == 401:
            return JSONResponse({"errore": SESSIONE_SCADUTA}, status_code=401)
        return JSONResponse({"errore": f"{cosa}: {e}"}, status_code=502)
