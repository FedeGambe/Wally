# Struttura del progetto, file per file

Prerequisito: leggi [ARCHITETTURA.md](./ARCHITETTURA.md) per il flusso dati generale. Qui trovi cosa fa ciascun file.

## `src/main.tsx` e `src/App.tsx` — avvio e guscio dell'app

- **`main.tsx`** — punto di ingresso: monta `<App />` nel DOM. Non toccare quasi mai.
- **`App.tsx`** — due componenti:
  - `App`: login/logout, tema chiaro/scuro, filtri anno/mese selezionati (stato deliberatamente **fuori** da `FinanceDataContext`, passato via props — vedi CLAUDE.md).
  - `DashboardShell`: la dashboard vera e propria una volta loggati (sidebar + header + pagina attiva + toast). Vive dentro `<FinanceDataProvider>` per poter leggere i dati con `useFinanceData()`.

## `src/lib/` — integrazioni esterne

- **`googleAuth.ts`** — login Google via Firebase, gestione del token OAuth per Sheets/Drive, "ricorda questo dispositivo".
- **`sheetsService.tsx`** — parla con l'API di Google Sheets: `fetchSpreadsheetData` (pull), `pushSpreadsheetData` (push), più i parser delicati di numeri/date. File più critico del progetto.

## `src/config/` — configurazione statica

- **`sheetsConfig.tsx`** (`SHEETS_CONFIG`) — mappatura di ogni tab del foglio Google verso campi/intestazioni/tipi. Modificare qui per aggiungere/cambiare colonne o schede.
- **`targets.tsx`** — le percentuali obiettivo del piano di risparmio (35% spese primarie, 15% secondarie, 25% investimenti, il resto risparmio) usate per colorare/etichettare KPI in più pagine.

## `src/data/` — dati e persistenza

- **`mockData.ts`** — cache locale + stato in-memory (livello 2 dell'architettura). Contiene tutti i tipi (`Transaction`, `RisparmioMese`, `ContoPatrimonio`, ...), gli array esportati, `saveToLocalStorage` (unico punto di scrittura) e `getExportableData` (assembla l'oggetto dati completo).
- **`demoData.ts`** — dati interamente fittizi usati in modalità incognito. Deve rispecchiare le stesse forme (tipi) di `mockData.ts`.

## `src/context/` — ponte dati ↔ UI

- **`FinanceDataContext.tsx`** — `FinanceDataProvider` + hook `useFinanceData()`. Unico punto di lettura dati per la UI (livello 3 dell'architettura), più stato di sincronizzazione/incognito.

## `src/hooks/` — logica per singola pagina

Ogni hook prende `useFinanceData()` e ne deriva aggregati/filtri/KPI specifici di UNA pagina, tenendo la logica numerica separata dal JSX:

- **`usePanoramicaData.ts`** — aggregati mensili/annuali, trend, dati per i drawer di dettaglio della pagina Panoramica.
- **`useEntrateData.ts`** — filtri e aggregazioni per la pagina Entrate.
- **`useUsciteData.ts`** — filtri e aggregazioni per la pagina Uscite.
- **`usePatrimonioData.ts`** — calcoli per la pagina Patrimonio (conti, capitale disponibile/investito/impegnato, soglie di allarme).
- **`useInvestimentiData.ts`** — dati per le 4 schede (subviews) della pagina Investimenti.

## `src/pages/` — una per voce di menu

- **`Panoramica.tsx`** — home page con la situazione economica d'insieme (bilancio storico mensile, KPI principali).
- **`Entrate.tsx`** / **`Uscite.tsx`** — elenco e gestione (aggiungi/modifica/elimina) di entrate/spese, con filtri per anno/mese.
- **`Patrimonio.tsx`** — conti e capitale (disponibile, investito, impegnato) per categoria.
- **`Investimenti.tsx`** — guscio sottile che monta le 4 `src/subviews/*` in base al tab selezionato; la logica vera è in `useInvestimentiData`.
- **`AnalisiConsumi.tsx`** — tracking consumi carburante dell'auto (km/litro, costo, efficienza settimanale).
- **`Impostazioni.tsx`** — tema, ID del foglio Google collegato, sincronizzazione manuale, logout.
- **`Login.tsx`** — schermata di accesso con Google.

## `src/subviews/` — le 4 schede dentro "Investimenti"

- **`CruscottoGenerale.tsx`** — vista aggregata investito/rendimento per anno.
- **`Conti.tsx`** — dettaglio dei due broker (Scalable, Trade Republic): strumenti posseduti, saldo, rendimento.
- **`Rendimenti.tsx`** — andamento mensile/cumulativo dei rendimenti nel tempo.
- **`FondoPensione.tsx`** — versamenti e accumulo del fondo pensione.

## `src/components/` — pezzi riusabili di UI

- **`Sidebar.tsx`** — menu di navigazione laterale (desktop) / a scomparsa.
- **`Header.tsx`** — barra in alto: selettore anno/mese, toggle incognito, refresh.
- **`Drawer.tsx`** — pannello laterale scorrevole per mostrare dettagli (es. transazioni di un mese).
- **`DataTable.tsx`** — tabella generica riusata in più pagine.
- **`DropdownMenu.tsx`** — menu a tendina generico.
- **`FinanceKpiCard.tsx`** — riquadro KPI colorato (usa `kpiColorScale.ts` per il colore in base a min/mediana/max storici).
- **`SheetsModal.tsx`** — modale di configurazione/collegamento del Google Sheet (crea foglio, imposta ID, sincronizza). Componente delicato: tocca `sheetsService.tsx`.

## `src/utils/` — funzioni pure di supporto

- **`date.ts`** — costanti e helper sulle date (es. `MESI_ITALIANI`, l'elenco dei mesi in italiano usato per ordinare/confrontare).
- **`format.ts`** — formattazione di numeri/valute per la visualizzazione.
- **`kpiColorScale.ts`** — calcola un colore interpolato (rosso→verde) per un KPI in base a dove si posiziona tra il minimo, la mediana e il massimo storico.
- **`thresholds.tsx`** — soglie/percentuali obiettivo (basate su `config/targets.tsx`) usate per giudicare se un valore è "in target".
- **`sheetsUtils.ts`** — helper di supporto a `sheetsConfig.tsx` (es. `toValidFieldName`, `parseSheetColumns`).
- **`esitoSettimanale.ts`** — calcola il giudizio (Ottima/Buona/Nella media/...) di una settimana di consumi auto.
- **`cruscottoInvestimenti.ts`** — combina i dati di Scalable, Trade Republic e Rendimenti per calcolare le metriche aggregate del Cruscotto Investimenti, anno per anno.

## File di configurazione a livello di progetto (fuori da `src/`)

- **`vite.config.ts`** — configurazione del bundler Vite.
- **`tsconfig*.json`** — configurazione TypeScript.
- **`package.json`** — dipendenze e script (`npm run dev/build/lint`). Nota: `@google/genai`, `express` e le variabili `GEMINI_API_KEY`/`APP_URL` sono residui dello scaffolding iniziale (Google AI Studio) e non sono usati da nessuna funzionalità dell'app.
