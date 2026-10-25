"""
Le due schede che la sincronizzazione bancaria aggiunge ai fogli.

"Banca Collegamenti" (foglio di configurazione): un conto bancario per riga.
"Conto Wally" e "Sincronizza dal" si possono correggere a mano nel foglio e
sopravvivono al rinnovo del consenso (la riga si riconosce dall'IBAN).

I due fogli sono gli stessi dell'app: gli ID arrivano dalle variabili
VITE_DEFAULT_SPREADSHEET_ID e VITE_DEFAULT_CONFIG_SPREADSHEET_ID, che su
Vercel sono visibili anche alle funzioni (il prefisso VITE_ serve solo a
Vite per esporle anche al browser).

"Movimenti Banca" (foglio Finanza): i movimenti scaricati, uno per riga, mai
modificati dal server. "Stato" lo scrive Wally quando un movimento è stato
registrato o scartato; vuoto = ancora da gestire.
"""
from dataclasses import astuple, dataclass

COLLEGAMENTI_TITOLO = "Banca Collegamenti"
COLLEGAMENTI_INTESTAZIONI = ["Banca", "Paese", "Sessione", "Scadenza", "Account", "IBAN", "Conto Wally", "Sincronizza dal"]

MOVIMENTI_TITOLO = "Movimenti Banca"
MOVIMENTI_INTESTAZIONI = ["ID", "Data", "Conto", "Importo", "Descrizione", "Stato", "Scaricato il"]


@dataclass
class Collegamento:
    # Stesso ordine delle colonne di COLLEGAMENTI_INTESTAZIONI.
    banca: str
    paese: str
    sessione: str
    scadenza: str
    account: str
    iban: str
    conto_wally: str
    sincronizza_dal: str

    @classmethod
    def da_riga(cls, riga: dict[str, str]) -> "Collegamento":
        return cls(*(riga.get(colonna, "") for colonna in COLLEGAMENTI_INTESTAZIONI))

    def a_riga(self) -> list[str]:
        return list(astuple(self))
