"""
Client dell'API di Google Sheets.

Lavora con un token di accesso:
 - quello dell'utente, che il browser manda a ogni chiamata (rotte /api/fogli):
   il backend vede solo i fogli che l'utente stesso può aprire;
 - quello del service account `wally-sync` (chiave in GOOGLE_SA_KEY), per il
   lavoro senza utente davanti, come la sincronizzazione notturna della banca.
   I due fogli sono condivisi con la sua email come Editor.
"""
import json
from urllib.parse import quote

import requests
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import service_account

from backend.config import chiave_pem, env

API = "https://sheets.googleapis.com/v4/spreadsheets"


class ErroreSheets(Exception):
    """Errore dell'API di Google, con lo stato HTTP (401 = token scaduto o non valido)."""

    def __init__(self, messaggio: str, stato: int):
        super().__init__(messaggio)
        self.stato = stato


_credenziali_service_account = None


def _token_service_account() -> str:
    """Token del service account, riusato finché è valido."""
    global _credenziali_service_account
    if _credenziali_service_account is None:
        info = json.loads(env("GOOGLE_SA_KEY"))
        info["private_key"] = chiave_pem(info["private_key"])
        _credenziali_service_account = service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
    if not _credenziali_service_account.valid:
        _credenziali_service_account.refresh(GoogleRequest())
    return _credenziali_service_account.token


def _intervallo(titolo: str, celle: str = "") -> str:
    return quote(f"'{titolo}'{celle}", safe="")


def _messaggio_google(res: requests.Response) -> str:
    try:
        return res.json()["error"]["message"]
    except (ValueError, KeyError, TypeError):
        return res.text or res.reason


class GoogleSheets:
    def __init__(self, token: str):
        self._token = token

    @classmethod
    def service_account(cls) -> "GoogleSheets":
        return cls(_token_service_account())

    def _chiama(self, metodo: str, foglio: str, percorso: str, body=None, params=None) -> dict:
        res = requests.request(
            metodo,
            f"{API}/{foglio}{percorso}",
            params=params,
            json=body,
            headers={"Authorization": f"Bearer {self._token}"},
            timeout=30,
        )
        if not res.ok:
            raise ErroreSheets(_messaggio_google(res), res.status_code)
        return res.json() if res.text else {}

    # --- Lettura ------------------------------------------------------------

    def titoli_schede(self, foglio: str) -> list[str]:
        meta = self._chiama("GET", foglio, "", params={"fields": "sheets.properties.title"})
        return [str(s.get("properties", {}).get("title", "")) for s in meta.get("sheets", [])]

    def proprieta_schede(self, foglio: str) -> list[dict]:
        """sheetId, titolo e numero di righe della griglia di ogni scheda."""
        meta = self._chiama("GET", foglio, "", params={"fields": "sheets.properties(sheetId,title,gridProperties.rowCount)"})
        return [s.get("properties", {}) for s in meta.get("sheets", [])]

    def leggi_valori(self, foglio: str, intervallo: str, render: str | None = None) -> list[list]:
        """Celle di un intervallo ("Uscite!A:A"). render="FORMULA" per leggere le
        formule invece dei valori calcolati."""
        params = {"valueRenderOption": render} if render else None
        return self._chiama("GET", foglio, f"/values/{quote(intervallo, safe='')}", params=params).get("values", [])

    def leggi_intervalli(self, foglio: str, intervalli: list[str], render: str | None = None) -> list[dict]:
        """Più intervalli in una chiamata sola: la lista valueRanges di Google."""
        if not intervalli:
            return []
        params = [("ranges", i) for i in intervalli] + ([("valueRenderOption", render)] if render else [])
        return self._chiama("GET", foglio, "/values:batchGet", params=params).get("valueRanges", [])

    def leggi_scheda(self, foglio: str, titolo: str) -> list[dict[str, str]]:
        """Righe della scheda come dizionari, con le intestazioni di riga 1 come chiavi."""
        valori = self._chiama("GET", foglio, f"/values/{_intervallo(titolo)}").get("values", [])
        if not valori:
            return []
        intestazioni, *righe = valori
        return [{h: (r[i] if i < len(r) else "") for i, h in enumerate(intestazioni)} for r in righe]

    # --- Scrittura ----------------------------------------------------------

    def scrivi_celle(self, foglio: str, celle: list[dict], modo: str = "USER_ENTERED") -> None:
        """Scrive solo le celle indicate ([{range, values}]). USER_ENTERED: come
        se l'utente le digitasse (formule e date interpretate da Sheets)."""
        if celle:
            self._chiama("POST", foglio, "/values:batchUpdate", {"valueInputOption": modo, "data": celle})

    def modifica_struttura(self, foglio: str, richieste: list[dict]) -> None:
        """Righe o colonne aggiunte, formati delle celle (batchUpdate)."""
        if richieste:
            self._chiama("POST", foglio, ":batchUpdate", {"requests": richieste})

    def svuota(self, foglio: str, intervallo: str) -> None:
        self._chiama("POST", foglio, f"/values/{quote(intervallo, safe='')}:clear")

    def crea_foglio(self, titolo: str, schede: list[str]) -> str:
        """Nuovo foglio Google con le schede indicate; restituisce il suo ID."""
        res = requests.post(API, json={"properties": {"title": titolo},
                                       "sheets": [{"properties": {"title": t}} for t in schede]},
                            headers={"Authorization": f"Bearer {self._token}"}, timeout=30)
        if not res.ok:
            raise ErroreSheets(_messaggio_google(res), res.status_code)
        return res.json()["spreadsheetId"]

    def assicura_scheda(self, foglio: str, titolo: str, intestazioni: list[str]) -> None:
        """Crea la scheda con le intestazioni in riga 1, se non esiste già."""
        if titolo in self.titoli_schede(foglio):
            return
        self._chiama("POST", foglio, ":batchUpdate", {"requests": [{"addSheet": {"properties": {"title": titolo}}}]})
        self.aggiungi_righe(foglio, titolo, [intestazioni])

    def aggiungi_righe(self, foglio: str, titolo: str, righe: list[list]) -> None:
        """
        RAW: il testo resta testo (niente date o numeri reinterpretati dal locale
        del foglio). Gli importi li scriviamo come numeri, che restano numeri.
        """
        if not righe:
            return
        self._chiama(
            "POST",
            foglio,
            f"/values/{_intervallo(titolo, '!A1')}:append",
            {"values": righe},
            params={"valueInputOption": "RAW", "insertDataOption": "INSERT_ROWS"},
        )

    def riscrivi_scheda(self, foglio: str, titolo: str, intestazioni: list[str], righe: list[list]) -> None:
        """Riscrive tutte le righe di una scheda piccola, intestazioni comprese."""
        self._chiama("POST", foglio, f"/values/{_intervallo(titolo)}:clear", {})
        self.aggiungi_righe(foglio, titolo, [intestazioni, *righe])
