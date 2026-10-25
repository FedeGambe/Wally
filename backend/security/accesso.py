"""
Chi può chiamare le rotte /api/banca/*:
 - Wally, con il token Google dell'utente loggato: è autorizzato chi riesce
   ad aprire il foglio Finanza con quel token (cioè il suo proprietario),
   senza dover tenere da qualche parte un elenco di email ammesse;
 - il cron di Vercel, che manda "Authorization: Bearer <CRON_SECRET>".
CRON_SECRET firma anche lo `state` del collegamento banca, così il ritorno
dalla banca (/api/banca/callback) accetta solo collegamenti partiti da Wally.
"""
import base64
import hashlib
import hmac
import re
import time
import uuid
from urllib.parse import quote, unquote

import requests
from fastapi import Request
from fastapi.responses import JSONResponse

from backend.config import env

VALIDITA_STATE_MS = 3600_000  # 1 ora


def token_bearer(request: Request) -> str:
    """Il token di "Authorization: Bearer ...", o "" se manca."""
    return re.sub(r"^Bearer\s+", "", request.headers.get("authorization", ""), flags=re.IGNORECASE)


def _uguali(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


def da_cron(request: Request) -> bool:
    return _uguali(token_bearer(request), env("CRON_SECRET"))


def da_proprietario(request: Request) -> bool:
    token = token_bearer(request)
    if not token:
        return False
    res = requests.get(
        f"https://sheets.googleapis.com/v4/spreadsheets/{env('VITE_DEFAULT_SPREADSHEET_ID')}",
        params={"fields": "spreadsheetId"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    return res.ok


def non_autorizzato() -> JSONResponse:
    return JSONResponse({"errore": "Non autorizzato"}, status_code=401)


def _firma(testo: str) -> str:
    digest = hmac.new(env("CRON_SECRET").encode(), testo.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def _adesso_ms() -> int:
    return int(time.time() * 1000)


def crea_state(banca: str, paese: str) -> str:
    """state = banca|paese|scadenza|nonce|firma: valido 1 ora."""
    parti = [banca, paese, _adesso_ms() + VALIDITA_STATE_MS, uuid.uuid4()]
    corpo = "|".join(quote(str(p), safe="") for p in parti)
    return f"{corpo}|{_firma(corpo)}"


def leggi_state(state: str) -> dict[str, str] | None:
    """Banca e paese del collegamento, o None se lo state è falso o scaduto."""
    corpo, sep, firma = state.rpartition("|")
    if not sep or not _uguali(firma, _firma(corpo)):
        return None
    parti = [unquote(p) for p in corpo.split("|")]
    if len(parti) != 4:
        return None
    banca, paese, scade, _nonce = parti
    try:
        valido = int(scade) > _adesso_ms()
    except ValueError:
        return None
    return {"banca": banca, "paese": paese} if valido else None
