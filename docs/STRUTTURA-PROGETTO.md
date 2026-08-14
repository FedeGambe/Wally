# Struttura del progetto, file per file

Prerequisito: leggi [ARCHITETTURA.md](./ARCHITETTURA.md) per il flusso dati generale. Qui trovi cosa fa ciascun file.

## `src/main.tsx` e `src/App.tsx` — avvio e guscio dell'app

- **`main.tsx`** — punto di ingresso: monta `<App />` nel DOM. Non toccare quasi mai.
- **`App.tsx`** — due componenti:
  - `App`: login/logout, tema chiaro/scuro, filtri anno/mese selezionati (stato deliberatamente **fuori** da `FinanceDataContext`, passato via props — vedi CLAUDE.md).
  - `DashboardShell`: la dashboard vera e propria una volta loggati (sidebar + header + pagina attiva + toast). Vive dentro `<FinanceDataProvider>` per poter leggere i dati con `useFinanceData()`.

## `src/lib/` — integrazioni esterne

- **`googleAuth.ts`** — login Google via Firebase, gestione del token OAuth per Sheets/Drive, "ricorda questo dispositivo". Il token OAuth scade sempre dopo ~1 ora (limite di Google): `silentTokenRefresh` lo rinnova senza popup usando Google Identity Services (script caricato in `index.html`, richiede `VITE_GOOGLE_OAUTH_CLIENT_ID` — vedi `.env.example`), ma **solo se agganciato a un vero click dell'utente** (verificato: un rinnovo tentato da un timer in background viene sempre bloccato dal browser). App.tsx lo richiama da un listener sui click quando sono passati >40 minuti dall'ultimo rinnovo, e come fallback prima di un logout forzato su 401. Se il dispositivo resta inattivo/la scheda è chiusa per più di ~50 minuti, al ritorno serve comunque un nuovo click di login.
- **`sheetsService.tsx`** — parla con l'API di Google Sheets. File più critico del progetto. Funzioni principali:
  - `fetchSpreadsheetData` / `pushSpreadsheetData` — pull/push sul foglio principale (18 tab, `SHEETS_CONFIG`). `pushSpreadsheetData` sovrascrive intere tab: usata solo dai bottoni manuali di `SheetsModal.tsx` (dietro `WRITE_TO_SHEETS_DISABLED`) e dal push scoped dei Preset in `useDatiBase.ts`.
  - `appendRowToSheet` — scrittura sicura riga-per-riga (non sovrascrive mai altre righe/tab), usata da tutti i form "Aggiungi..." tramite `appendAndPush` (`useSaveAndPush.ts`). Gestisce crescita automatica della griglia, formattazione date (`dateFields`/`monthDateFields`), e preserva le colonne-formula del foglio (`formulaFields`) copiando e shiftando la formula della riga sopra invece di scrivere un valore statico. Gate indipendente `APPEND_TO_SHEETS_DISABLED` (oggi `false`, attivo in produzione).
  - `fetchDatiBaseFromConfigSheet` / `pushDatiBaseToConfigSheet` — pull/push del foglio di **configurazione** separato (Conti, Categorie Entrate/Uscite, Soglie, Preset Uscite/Trasferimenti Ricorrenti — tab che non esistono sul foglio principale). ID salvato in `sf_config_spreadsheet_id` (Impostazioni → "Foglio di configurazione"): se non è collegato, questi dati restano ai valori di default/vuoti anche se il resto dell'app funziona.
  - `parseLocalizedNumber` / `parseDateString` — parsing robusto di numeri (formato IT `1.234,56` e US `1,234.56`) e date. Bug qui corrompono silenziosamente i dati finanziari: trattare con cura.

## `src/config/` — configurazione statica

- **`sheetsConfig.ts`** (`SHEETS_CONFIG`) — mappatura di ogni tab del foglio Google verso campi/intestazioni/tipi. Modificare qui per aggiungere/cambiare colonne o schede. Ogni voce può avere `dateFields`/`monthDateFields` (colonne data) e `formulaFields` (colonne che sul foglio reale sono formule live, mai sovrascritte con valori — vedi `appendRowToSheet`).
- **`targets.ts`** — le percentuali obiettivo del piano di risparmio (35% spese primarie, 15% secondarie, 25% investimenti, il resto risparmio) usate per colorare/etichettare KPI in più pagine.
- **`datiBaseSeed.ts`** — valori di default (Conti/Categorie/Preset Uscite e Trasferimenti Ricorrenti/Soglie) usati solo al primo avvio, prima che l'utente li modifichi da Impostazioni o li importi dal foglio di configurazione. `PresetUscita` include `giornoDelMese` (1-31): usato da "Uscite Ricorrenti" per datare ogni uscita aggiunta in blocco sul giorno giusto del mese, non sulla data odierna.

## `src/data/` — dati e persistenza

- **`mockData.ts`** — cache locale + stato in-memory (livello 2 dell'architettura). Contiene tutti i tipi (`Transaction`, `RisparmioMese`, `ContoPatrimonio`, ...), gli array esportati, `saveToLocalStorage` (unico punto di scrittura, usato anche dai form "Aggiungi...") e `getExportableData` (assembla l'oggetto dati completo).
- **`demoData.ts`** — dati interamente fittizi usati in modalità incognito. Deve rispecchiare le stesse forme (tipi) di `mockData.ts`.
- **`datiBase.ts`** — solo re-export di comodo da `mockData.ts`/`config/datiBaseSeed.ts`, per non dover aggiornare gli import esistenti nei componenti di Impostazioni. Nessuna logica propria.

## `src/context/` — ponte dati ↔ UI

- **`FinanceDataContext.tsx`** — `FinanceDataProvider` + hook `useFinanceData()`. Unico punto di lettura dati per la UI (livello 3 dell'architettura), più stato di sincronizzazione/incognito.

## `src/hooks/` — logica per singola pagina

Ogni hook prende `useFinanceData()` e ne deriva aggregati/filtri/KPI specifici di UNA pagina, tenendo la logica numerica separata dal JSX:

- **`usePanoramicaData.ts`** — aggregati mensili/annuali, trend, dati per i drawer di dettaglio della pagina Panoramica.
- **`useEntrateData.ts`** — filtri e aggregazioni per la pagina Entrate.
- **`useUsciteData.ts`** — filtri e aggregazioni per la pagina Uscite.
- **`usePatrimonioData.ts`** — calcoli per la pagina Patrimonio (conti, capitale disponibile/investito/impegnato, soglie di allarme).
- **`useInvestimentiData.ts`** — dati per le 4 schede (subviews) della pagina Investimenti.

Due hook a parte, per il percorso di **scrittura** invece che lettura/aggregazione (usati dai form "Aggiungi..." e da Impostazioni → Dati Base):

- **`useSaveAndPush.ts`** — `saveAndPush` (salva in locale poi fa un push completo, usato solo dal percorso storico di `SheetsModal.tsx`) e `appendAndPush` (salva in locale poi chiama `appendRowToSheet` una volta per ogni `{tabTitle, record}` passato — il percorso usato da tutti i form "Aggiungi..."). Entrambi salvano sempre in locale per primi, poi propagano l'errore di push senza disfare il salvataggio locale.
- **`useDatiBase.ts`** — letto/scritto da Impostazioni → Dati Base (Conti, Categorie Entrate/Uscite, Soglie, Preset Uscite/Trasferimenti Ricorrenti) e dai form che leggono i preset. Il push va **sempre** verso il foglio di configurazione (`pushDatiBaseToConfigSheet`), mai verso il foglio principale — altrimenti la sync automatica di `fetchDatiBaseFromConfigSheet` ad ogni refresh sovrascriverebbe la modifica al giro dopo.

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

### `panoramica/` — sezioni della pagina Panoramica

`pages/Panoramica.tsx` compone solo queste sezioni (dati e calcoli restano nell'hook `usePanoramicaData`):

- **`PanoramicaWealthCards.tsx`** — le 4 card patrimonio in cima (Disponibile/Investito/Accantonato/Totale).
- **`PanoramicaRendicontoWidget.tsx`** — box "Disponibilità Netta", renderizzato due volte (mobile in alto, desktop accanto al grafico) a seconda del breakpoint, non due componenti diversi.
- **`PanoramicaMeseCorrenteStrip.tsx`** — spendibile residuo, i 4 mini-widget Risparmio/Investito/Spese con scostamento dalla soglia dinamica, delta % vs mese precedente. Solo desktop.
- **`PanoramicaTrendChart.tsx`** — grafico ad area Risparmio/Investito, toggle Mensile/Cumulato, punti cliccabili per aprire il drawer di dettaglio mese.
- **`PanoramicaBilancioStorico.tsx`** — tabella storica mensile, colori calcolati da `kpiColorScale.ts`.
- **`RiepilogoMesePopup.tsx`** — popup "riepilogo mese precedente" mostrato nei primi giorni del mese (montato da `App.tsx`, non da `Panoramica.tsx`).

### `entrate/` — sezioni della pagina Entrate

`pages/Entrate.tsx` compone solo queste sezioni (dati e calcoli restano nell'hook `useEntrateData`):

- **`EntrateBentoCards.tsx`** — i 2 box "bento" in cima (Entrate Mensili con delta vs mese precedente, Entrate Anno Corrente + media mensile).
- **`EntrateTrendChart.tsx`** — grafico ad area storico, cliccabile (punti e bottone "Vedi Transazioni") per aprire il drawer di dettaglio mese.
- **`EntratePieCard.tsx`** — torta + legenda riusabile, montata due volte (categoria ricavi, canale di accredito). A differenza di `uscite/CategoryPieCard.tsx` non ha selezione/evidenziazione: le entrate non hanno quel filtro.
- **`EntrateMovimentiTable.tsx`** — tabella dei singoli movimenti del mese selezionato.
- **`AggiungiEntrataForm.tsx`** — vedi sezione "Inserimento dati" sotto.

### Inserimento dati ("Aggiungi...")

Popup di inserimento manuale, raggiungibili sia dal bottone contestuale di ogni pagina sia dal bottone generale "Aggiungi Dato" in Panoramica (`AggiungiDatoModal.tsx`). Scrivono sempre prima in locale poi sul foglio via `appendAndPush` (`useSaveAndPush.ts` → `appendRowToSheet`), mai un push completo.

- **`AggiungiDatoModal.tsx`** — punto d'ingresso generale: chiede il tipo di dato, poi monta lo stesso form usato dal bottone di pagina (nessuna logica duplicata).
- **`uscite/AggiungiUscitaForm.tsx`** — form Uscita. Conto predefinito "Trade Republic". Applica un preset ricorrente su richiesta (precompila i campi, l'utente conferma/modifica prima di salvare) e, se il preset ha un trasferimento collegato, offre di aggiungerlo insieme nello stesso salvataggio.
- **`entrate/AggiungiEntrataForm.tsx`** — form Entrata. Conto predefinito "Unicredit".
- **`consumi/AggiungiConsumoForm.tsx`** — form Consumo/rifornimento carburante. Costo sempre obbligatorio; Litri e €/Lt si autocalcolano a vicenda dal Costo; i campi opzionali (es. Km/lt da bordo auto) restano vuoti se non compilati, mai forzati a 0; niente più campo "Efficienza" (rimosso).
- **`trasferimenti/AggiungiTrasferimentoForm.tsx`** — form Trasferimento tra conti, con Categoria libera (default "Trasferimento").
- **`uscite/AggiungiUsciteRicorrentiForm.tsx`** — aggiunta in blocco dei preset "Uscite Ricorrenti" ancora mancanti nel mese corrente (lista con conferma, selezione singola o "Seleziona tutte"), inclusi i trasferimenti collegati. Ogni uscita viene datata sul proprio `giornoDelMese` (preset), non sulla data odierna.

### Impostazioni → Dati Base

Sotto `impostazioni/`, editor per i dati che alimentano i form sopra — letti/scritti tramite `useDatiBase.ts`, sempre verso il foglio di configurazione:

- **`DatiBaseSettings.tsx`** — contenitore dei pulsanti/pannelli sottostanti.
- **`ContiEditor.tsx`**, **`CategorieEntrateEditor.tsx`**, **`CategorieUsciteEditor.tsx`**, **`SoglieEditor.tsx`** — liste semplici (conti, categorie, soglie percentuali).
- **`UsciteRicorrentiEditor.tsx`** / **`TrasferimentiRicorrentiEditor.tsx`** — preset usati da `AggiungiUscitaForm`/`AggiungiUsciteRicorrentiForm`. Il preset uscita include `giornoDelMese`; un trasferimento si "aggancia" a un'uscita quando la sua `categoria` combacia col `nome` del preset uscita.
- **`PresetRicorrentiSettings.tsx`** — wrapper che monta i due editor sopra dentro Impostazioni.

## `src/utils/` — funzioni pure di supporto

- **`date.ts`** — costanti e helper sulle date (es. `MESI_ITALIANI`, l'elenco dei mesi in italiano usato per ordinare/confrontare).
- **`format.ts`** — formattazione di numeri/valute per la visualizzazione.
- **`kpiColorScale.ts`** — calcola un colore interpolato (rosso→verde) per un KPI in base a dove si posiziona tra il minimo, la mediana e il massimo storico.
- **`thresholds.ts`** — soglie/percentuali obiettivo (basate su `config/targets.ts`) usate per giudicare se un valore è "in target".
- **`sheetsUtils.ts`** — helper di supporto a `sheetsConfig.ts` (es. `toValidFieldName`, `parseSheetColumns`).
- **`esitoSettimanale.ts`** — calcola il giudizio (Ottima/Buona/Nella media/...) di una settimana di consumi auto.
- **`cruscottoInvestimenti.ts`** — combina i dati di Scalable, Trade Republic e Rendimenti per calcolare le metriche aggregate del Cruscotto Investimenti, anno per anno.
- **`formulaShift.ts`** — `shiftFormulaRows`: sposta di N righe i riferimenti relativi (non ancorati con `$`) in una stringa-formula di Google Sheets. Usata da `appendRowToSheet` per copiare la formula della riga sopra su una nuova riga inserita, invece di scrivere un valore statico nelle colonne-formula (`formulaFields`).

## File di configurazione a livello di progetto (fuori da `src/`)

- **`vite.config.ts`** — configurazione del bundler Vite.
- **`tsconfig*.json`** — configurazione TypeScript.
- **`package.json`** — dipendenze e script (`npm run dev/build/lint`). Nota: `@google/genai`, `express` e le variabili `GEMINI_API_KEY`/`APP_URL` sono residui dello scaffolding iniziale (Google AI Studio) e non sono usati da nessuna funzionalità dell'app.
