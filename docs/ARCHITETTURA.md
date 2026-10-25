# Architettura: come si muovono i dati

Wally **non ha un database proprio**: i dati stanno nei fogli Google dell'utente. Il browser non parla con Google Sheets: passa sempre dal **backend Python**, che legge e scrive con il token Google dell'utente (quindi vede solo i fogli che l'utente può aprire).

```
Foglio Google  <──>  backend Python  <──/api──>  cache locale     <──>  stato React (schermo)
                     (backend/)                  (localStorage,         (FinanceDataContext
                                                 data/mockData.ts)      + pagine e hook)
```

I file uno per uno sono descritti in [FRONTEND.md](./FRONTEND.md) e [BACKEND.md](./BACKEND.md).

## I due fogli Google

- **Foglio principale ("Finanza")**: uscite, entrate, risparmio, patrimonio, investimenti, consumi, fondo pensione, e la scheda "Movimenti Banca". ID in `localStorage['sf_spreadsheet_id']`.
- **Foglio di configurazione ("finanza_data_config")**: i Dati Base (conti, categorie, soglie, preset ricorrenti) e la scheda "Banca Collegamenti". ID in `localStorage['sf_config_spreadsheet_id']`.

## Livello 1 — foglio Google, tramite il backend

Nel frontend `frontend/src/lib/sheetsService.tsx` contiene solo le chiamate al backend.

- **Lettura** → `GET /api/fogli/dati` (`backend/routes/fogli.py`): legge tutte le schede in una sola chiamata, le converte in oggetti (`backend/domain/lettura.py`) e calcola il Cruscotto Investimenti. `GET /api/fogli/dati-base` fa lo stesso per il foglio di configurazione.
- **Scritture** → `backend/routes/scritture.py`, logica in `backend/domain/scrittura.py`: riga nuova (copiando le formule della riga sopra nelle colonne-formula), banconote, investimenti, nuovo strumento, verifica mensile, Dati Base. Scrivono solo celle precise e rifiutano di scrivere su celle già piene quando non è previsto.
- **La riscrittura completa del foglio è spenta** (`pushSpreadsheetData` dà sempre errore): aveva corrotto il foglio due volte. Nel backend non esiste.

La **mappa** tra colonne del foglio e campi dell'app è una sola: `SCHEDE` in `backend/models/foglio.py`. Per aggiungere o modificare una colonna o una scheda si modifica solo lì.

Le schede "Scalable" e "Trade Republic" sono un'eccezione: hanno una colonna per strumento, che cambia nel tempo, quindi vengono "scoperte" leggendo le righe 1-2 del foglio.

Due funzioni del backend vanno toccate con cura, perché **un bug qui corrompe le cifre in silenzio** (hanno i loro test):

- `numero_localizzato` (`backend/domain/conversioni.py`): un numero può essere scritto all'italiana (`1.234,56`) o all'americana (`1,234.56`).
- `data_da_testo` (`backend/domain/scrittura.py`): le date arrivano come testo (`31/12/2026`), come `AAAA-MM-GG` o come numero seriale di Google Sheets.

## Livello 2 — cache locale (`frontend/src/data/mockData.ts`)

Copia locale dei dati più stato in memoria. Non parla mai con il backend: legge e scrive solo `localStorage` (chiavi che iniziano per `sf_`, es. `sf_transactions`). Così l'app si apre subito con gli ultimi dati, prima che arrivi la risposta del backend.

Ogni array esportato (`TRANSACTIONS`, `RISPARMIO_DATA`, `CONTI_PATRIMONIO`, ...) viene caricato **una sola volta**, all'avvio, dalla sua chiave di `localStorage`.

**Regola fondamentale: `saveToLocalStorage(data)` è l'UNICO punto di scrittura.** Per ogni chiave passata:

1. scrive il valore in `localStorage`;
2. svuota e riempie l'array in memoria sul posto (`arr.length = 0; arr.push(...)`), così chi l'aveva già importato vede i dati nuovi.

`getExportableData(incognito = false)` monta l'**unico oggetto dati** che le pagine leggono. Il default `false` è voluto: chi lo chiama senza argomenti (es. `SheetsModal.tsx` quando crea un foglio nuovo) ottiene sempre i dati veri, così i dati della modalità incognito non possono finire sul foglio. **Non cambiare questo default e non farlo dipendere dalla modalità incognito.**

## Livello 3 — stato React (`frontend/src/context/FinanceDataContext.tsx`)

L'unico punto di **lettura** per l'interfaccia. `FinanceDataProvider`, montato una volta in `App.tsx`, espone con `useFinanceData()`:

- `data`: l'oggetto dati completo, ricalcolato con `useMemo(() => getExportableData(isIncognito), [isIncognito, refreshVersion])`;
- `refreshData` / `isRefreshing` / `syncError`: rilettura dal foglio (anche automatica appena c'è il token);
- `bumpVersion()`: incrementa `refreshVersion`, che fa ricalcolare `data`;
- `isIncognito` / `toggleIncognito`: modalità incognito.

Le pagine **non** importano direttamente gli array di `mockData.ts` (solo i *tipi*, come `Transaction`).

### Perché serve `bumpVersion()`

Gli array di `mockData.ts` vengono modificati sul posto, non ricreati, e React non se ne accorge da solo. Per questo **dopo ogni `saveToLocalStorage(...)` va chiamato `bumpVersion()`**. Se lo dimentichi i dati sono salvati, ma lo schermo resta vecchio fino al ricaricamento della pagina.

## Un giro completo

### Apertura dell'app

1. Dopo il login `FinanceDataContext` chiama `refreshData`.
2. `fetchSpreadsheetData` → `GET /api/fogli/dati`; poi, se c'è il foglio di configurazione, `fetchDatiBaseFromConfigSheet` → `GET /api/fogli/dati-base`.
3. Le risposte finiscono in `saveToLocalStorage`, poi `bumpVersion()`: tutte le pagine si ridisegnano.

### L'utente aggiunge una spesa

1. Il modulo "Aggiungi Uscita" costruisce il record e chiama `appendAndPush` (`hooks/useSaveAndPush.ts`).
2. Prima salva in locale (`saveToLocalStorage`) e chiama `bumpVersion()`: la spesa compare subito.
3. Poi `appendRowToSheet` → `POST /api/fogli/riga` aggiunge **solo quella riga** sul foglio (più l'eventuale trasferimento collegato e le banconote se il conto è Contanti).
4. Se il foglio fallisce, la spesa resta in locale e compare un avviso. Al prossimo aggiornamento dal foglio, una riga mai arrivata sul foglio sparisce.

Le modifiche ai Dati Base (Impostazioni) vanno **sempre** sul foglio di configurazione (`PUT /api/fogli/dati-base`), mai sul principale: altrimenti la rilettura automatica le sovrascriverebbe.

## Sincronizzazione bancaria

1. **Collegamento**: da Impostazioni → Banche collegate, `POST /api/banca/collega` manda l'utente sulla banca (Enable Banking, PSD2). Al ritorno `GET /api/banca/callback` salva i conti in "Banca Collegamenti".
2. **Scaricamento**: ogni notte il cron di Vercel (`GET /api/banca/sincronizza`, con il service account `wally-sync`) o il pulsante "Sincronizza ora" accodano i movimenti nuovi in "Movimenti Banca". Non classificano niente.
3. **Elaborazione**: quando si apre Wally, `useMovimentiBanca` chiama `POST /api/banca/elabora`. Il backend classifica i movimenti con regole e preset, registra da solo quelli sicuri (uscite da preset, giri tra conti, PAC) e restituisce la lista "Da confermare", che compare nella card "Dalla banca" in Panoramica.
4. Un movimento registrato o scartato viene segnato nella colonna "Stato" (`POST /api/banca/movimenti/stato`).

## Modalità incognito

Un interruttore nell'intestazione (`toggleIncognito`) sostituisce **tutta** la dashboard con dati inventati da `frontend/src/data/demoData.ts` (stato salvato in `sf_incognito_mode`). Serve a nascondere le cifre vere durante una condivisione dello schermo. Non legge né modifica i dati veri. Quando aggiungi un campo a un tipo di dato vero, aggiungilo anche in `demoData.ts`.

La stessa base serve la **demo** pubblicata (`frontend/src/demo/main.tsx` → `docs/demo/`), che non ha né login né backend.

## Autenticazione (`frontend/src/lib/googleAuth.ts`)

Firebase Auth (Google) serve **solo per l'identità**. Il token per Google Sheets è un dato separato, ottenuto dallo stesso popup di login. Il browser lo manda al backend a ogni chiamata (`Authorization: Bearer ...`), e il backend lo usa per leggere e scrivere il foglio.

Il token scade dopo circa un'ora. Prima di chiedere di nuovo il login, l'app prova un **rinnovo silenzioso** con Google Identity Services (`silentTokenRefresh`, script in `frontend/index.html`, richiede `VITE_GOOGLE_OAUTH_CLIENT_ID`). Funziona **solo dopo un vero clic dell'utente**: un tentativo da un timer viene bloccato dal browser. Per questo `App.tsx` lo aggancia ai clic (se sono passati più di 40 minuti dall'ultimo rinnovo) e lo riprova quando il backend risponde 401.

Risultato: mentre usi l'app la sessione non scade; se la scheda resta chiusa più di circa 50 minuti, al ritorno serve un clic di login (veloce, senza password). Per restare collegati per giorni servirebbe un refresh token, che Google dà solo con un flusso lato server: con il backend si potrebbe fare, ma non è stato fatto.

## Configurazione

Tutte le variabili stanno in `.env.local` nella cartella principale (mai su git), condiviso da frontend e backend. Su Vercel si impostano come Environment Variables. L'elenco completo con spiegazione è in `.env.example`.
