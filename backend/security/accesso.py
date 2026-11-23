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
    """Confronta due testi segreti in tempo costante (non si può indovinare un
    segreto misurando quanto ci mette il confronto).
    """
    return hmac.compare_digest(a.encode(), b.encode())


def da_cron(request: Request) -> bool:
    """True se la richiesta arriva dal cron di Vercel (porta il CRON_SECRET giusto)."""
    return _uguali(token_bearer(request), env("CRON_SECRET"))


def da_proprietario(request: Request) -> bool:
    """True se la richiesta arriva dal proprietario di Wally.

    Controllo: con il token Google della richiesta si prova ad aprire il foglio
    Finanza. Ci riesce solo chi ha accesso a quel foglio, quindi non serve
    tenere un elenco di email ammesse. Costa una chiamata a Google.
    """
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
    """La risposta 401 {"errore": "Non autorizzato"}."""
    return JSONResponse({"errore": "Non autorizzato"}, status_code=401)


def _firma(testo: str) -> str:
    """La firma di un testo con CRON_SECRET (HMAC-SHA256): chi non conosce il
    segreto non può creare una firma valida.
    """
    digest = hmac.new(env("CRON_SECRET").encode(), testo.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def _adesso_ms() -> int:
    """L'ora attuale in millisecondi (come Date.now() in JavaScript)."""
    return int(time.time() * 1000)


def crea_state(banca: str, paese: str) -> str:
    """Lo `state` da mandare alla banca quando parte un collegamento.

    È banca|paese|scadenza|codice casuale|firma, valido 1 ora. Quando la banca
    rimanda l'utente su Wally restituisce lo stesso state: leggi_state controlla
    che sia nostro e non scaduto.
    """
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
