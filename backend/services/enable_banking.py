"""
Client minimo di Enable Banking (open banking PSD2).
La chiave privata arriva dalla variabile d'ambiente EB_PRIVATE_KEY
(contenuto del .pem).
"""
import time

import jwt
import requests
from fastapi import Request

from backend.config import chiave_pem, env

API = "https://api.enablebanking.com"


class ErroreEB(Exception):
    """Errore di una chiamata a Enable Banking, con lo stato HTTP (429 = limite di richieste della banca)."""

    def __init__(self, messaggio: str, stato: int):
        super().__init__(messaggio)
        self.stato = stato


def _jwt() -> str:
    """JWT RS256 richiesto su ogni chiamata (iss/aud fissi, durata massima 1 ora)."""
    adesso = int(time.time())
    return jwt.encode(
        {"iss": "enablebanking.com", "aud": "api.enablebanking.com", "iat": adesso, "exp": adesso + 3600},
        chiave_pem(env("EB_PRIVATE_KEY")),
        algorithm="RS256",
        headers={"kid": env("EB_APP_ID")},
    )


def chiama_eb(metodo: str, percorso: str, body=None, params=None, extra: dict[str, str] | None = None):
    res = requests.request(
        metodo,
        f"{API}{percorso}",
        params=params,
        json=body,
        headers={"Authorization": f"Bearer {_jwt()}", **(extra or {})},
        timeout=30,
    )
    if not res.ok:
        raise ErroreEB(f"Enable Banking {metodo} {percorso} → {res.status_code}: {res.text}", res.status_code)
    return res.json()


def intestazioni_psu(request: Request) -> dict[str, str]:
    """
    Intestazioni PSU ricavate dalla richiesta del browser: dicono alla banca che
    il titolare è presente. Senza, la PSD2 consente alla banca di limitare le
    letture a 4 al giorno per conto (UniCredit lo fa, con un 429). Il cron non
    le manda, perché di notte non c'è nessuno davanti.
    """
    h = request.headers
    ip = h.get("x-forwarded-for", "").split(",")[0].strip() or h.get("x-real-ip", "")
    psu = {"Psu-Ip-Address": ip} if ip else {}
    for da, a in [
        ("user-agent", "Psu-User-Agent"),
        ("referer", "Psu-Referer"),
        ("accept", "Psu-Accept"),
        ("accept-language", "Psu-Accept-Language"),
    ]:
        if h.get(da):
            psu[a] = h[da]
    return psu


def scarica_movimenti(uid: str, dal: str, psu: dict[str, str] | None = None) -> list[dict]:
    """Tutti i movimenti contabilizzati di un conto dal giorno indicato, seguendo la paginazione."""
    tutti: list[dict] = []
    continuation = None
    while True:
        params = {"date_from": dal}
        if continuation:
            params["continuation_key"] = continuation
        pagina = chiama_eb("GET", f"/accounts/{uid}/transactions", params=params, extra=psu)
        tutti.extend(pagina.get("transactions") or [])
        continuation = pagina.get("continuation_key")
        if not continuation:
            return tutti
