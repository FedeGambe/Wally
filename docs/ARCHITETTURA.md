# Architettura: come si muovono i dati

Assetta **non ha un backend/database proprio**. I dati vivono in tre livelli, e passano dall'uno all'altro così:

```
Google Sheet  <──pull/push──>  localStorage  <──lettura/scrittura──>  Stato React (schermo)
 (src/lib/            (src/data/               (src/context/FinanceDataContext.tsx
 sheetsService.tsx)    mockData.ts)              + pagine/hook)
```

## Livello 1 — Google Sheet (`src/lib/sheetsService.tsx`)

Il foglio Google è la fonte "definitiva" dei dati, di proprietà dell'utente. L'app ci parla solo tramite due funzioni:

- **`fetchSpreadsheetData(accessToken, spreadsheetId)`** — PULL. Legge tutte le schede (tab) del foglio in un'unica chiamata e le converte in oggetti JavaScript.
- **`pushSpreadsheetData(accessToken, spreadsheetId, data)`** — PUSH. Scrive lo stato attuale dell'app nel foglio, sovrascrivendo ogni tab per intero.

Il *mapping* tra colonne del foglio e campi JS non è scritto qui: è tutto in **`src/config/sheetsConfig.tsx`** (`SHEETS_CONFIG`), un array dove ogni voce dice: nome del tab, quali campi/intestazioni ha, quali vanno letti come numero o booleano. Per aggiungere o modificare una colonna/scheda del foglio Google **si modifica solo `SHEETS_CONFIG`**, non `sheetsService.tsx` (che ci cicla sopra dinamicamente).

Le schede "Scalable" e "Trade Republic" (i due broker di investimento) sono un'eccezione: hanno colonne che cambiano nel tempo (nuovi ETF/azioni), quindi vengono "scoperte" leggendo a runtime le righe 1-2 del foglio, cercando parole chiave come `azioni`, `obbligazioni`, `monetari`.

Due funzioni di parsing meritano attenzione perché **un bug qui corrompe silenziosamente le cifre**:

- `parseLocalizedNumber` — un numero scritto nel foglio può essere in formato italiano (`1.234,56`) o americano (`1,234.56`). La funzione indovina il formato guardando l'ultima virgola/punto.
- `parseDateString` — le date possono arrivare come testo (`31/12/2026`), come `YYYY-MM-DD`, o come "numero seriale" (il modo interno con cui Google Sheets rappresenta le date).

## Livello 2 — cache locale (`src/data/mockData.ts`)

Questo file è la cache locale + stato in-memory. Non parla mai direttamente con Google: legge/scrive solo `localStorage` (tutte le chiavi iniziano per `sf_`, es. `sf_transactions`, `sf_conti_patrimonio`).

Ogni array esportato (`TRANSACTIONS`, `RISPARMIO_DATA`, `CONTI_PATRIMONIO`, ecc.) viene popolato **una sola volta**, al caricamento del modulo, leggendo la chiave localStorage corrispondente.

**Regola fondamentale: `saveToLocalStorage(data)` è l'UNICO punto di scrittura.** Fa due cose insieme per ogni chiave passata:

1. Scrive il valore in `localStorage` (persistenza tra sessioni/riavvii del browser).
2. Svuota e ripopola l'array in-memory corrispondente sul posto (`arr.length = 0; arr.push(...)`), così i moduli che avevano già importato quell'array vedono i nuovi dati senza dover reimportare nulla.

Nessuna pagina deve scrivere su `localStorage` direttamente per i dati finanza: deve sempre passare da qui.

`getExportableData(incognito = false)` è la funzione che assembla l'**unico oggetto dati** che ogni consumatore legge (uscite, entrate, patrimonio, rendimenti, ecc. tutti in un solo oggetto). Il parametro `incognito` di default è **`false`** apposta: `SheetsModal.tsx` chiama `getExportableData()` senza argomenti quando fa il push verso il foglio reale, così i dati demo non possono mai finire per errore su Google Sheets. **Non cambiare questo default e non farlo auto-rilevare la modalità incognito.**

## Livello 3 — stato React (`src/context/FinanceDataContext.tsx`)

Questo è l'unico punto di **lettura** per la UI. `FinanceDataProvider` (montato una volta in `App.tsx`, avvolge tutta la dashboard) espone tramite React Context:

- `data` — l'oggetto dati completo, ricalcolato con `useMemo(() => getExportableData(isIncognito), [isIncognito, refreshVersion])`
- `isIncognito` / `toggleIncognito` — stato e switch della modalità incognito
- `refreshData` / `isRefreshing` / `syncError` — sincronizzazione con Google Sheets
- `bumpVersion()` — incrementa `refreshVersion`, che è ciò che fa ricalcolare `data`

Ogni pagina legge i dati con l'hook `useFinanceData()`. **Le pagine non devono importare direttamente gli array grezzi di `mockData.ts`** (solo i *tipi* come `Transaction`, `ContoPatrimonio` sono importabili ovunque).

### Perché serve `bumpVersion()`

Gli array in `mockData.ts` vengono mutati "sul posto" (`arr.push(...)`), non ricreati. React non si accorge da solo che un array è cambiato se il riferimento all'array è lo stesso. Per questo, **dopo ogni `saveToLocalStorage(...)` va sempre chiamato `bumpVersion()`**: è il segnale che dice al `useMemo` di ricalcolare `data`, e quindi a tutta la dashboard di ridisegnarsi con i dati nuovi. Se dimentichi `bumpVersion()`, i dati sono salvati correttamente ma lo schermo resta "vecchio" finché non si ricarica la pagina.

## Un giro completo: cosa succede quando l'utente modifica una spesa

1. L'utente modifica/aggiunge una riga nella pagina Uscite → il componente costruisce il nuovo array `Transaction[]`.
2. Chiama `saveToLocalStorage({ uscite: nuovoArray })` → questo scrive su `localStorage['sf_transactions']` e aggiorna `TRANSACTIONS` in-memory.
3. Chiama `bumpVersion()` (di solito tramite `useFinanceData()`) → `refreshVersion` cambia.
4. Il `useMemo` in `FinanceDataContext` rileva la dipendenza cambiata e richiama `getExportableData()` → nuovo oggetto `data`.
5. Tutte le pagine che leggono `useFinanceData().data` si ridisegnano con i numeri aggiornati.
6. Se l'utente vuole persistere anche su Google, deve premere "sincronizza/salva" da qualche parte nell'UI (`SheetsModal.tsx` / pulsante refresh), che chiama `pushSpreadsheetData` esplicitamente — **il salvataggio in `localStorage` NON invia automaticamente nulla a Google Sheets**.

## Modalità incognito

Un toggle nell'Header (`toggleIncognito`) sostituisce **tutta** la dashboard con dati interamente fittizi da `src/data/demoData.ts` (flag persistito in `sf_incognito_mode`). Serve a nascondere le cifre reali durante una condivisione schermo. Non modifica né legge mai i dati reali: è sicuro tenerla attiva anche mentre si lavora sull'app. Quando aggiungi un campo a un tipo di dato reale, aggiungilo anche in `demoData.ts` (deve rispecchiare la stessa forma).

## Autenticazione (`src/lib/googleAuth.ts`)

Il login usa Firebase Auth (Google Sign-In) **solo per l'identità**. L'`accessToken` OAuth usato per chiamare l'API di Google Sheets è un dato separato, ottenuto dallo stesso popup di login, tenuto in memoria (si perde al reload) e — se l'utente sceglie "ricorda questo dispositivo" — salvato in `localStorage` per 7 giorni. Il token Google però scade sempre dopo ~1 ora: per questo il codice considera valido un token salvato solo entro una finestra di 50 minuti, forzando un nuovo login altrimenti.

## Configurazione ambiente

Le credenziali Firebase arrivano da variabili d'ambiente `VITE_FIREBASE_*` (vedi `src/vite-env.d.ts` per i tipi). In locale vanno messe in un file `.env.local` (non committato); su Vercel si impostano come Environment Variables del progetto.
