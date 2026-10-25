# Struttura del progetto, file per file

Prerequisito: leggi [ARCHITETTURA.md](./ARCHITETTURA.md) per il flusso dati generale. Qui trovi cosa fa ciascun file.

## In cima al progetto

```
Wally/
├── frontend/          l'app React (src/, public/, index.html, demo.html, vite.config.ts, package.json)
├── backend/           il backend Python (FastAPI)
├── api/index.py       unica funzione Vercel: serve backend/app.py (deve stare in api/ in cima)
├── scripts/           dev.sh (npm run dev), solo in locale: non è in git
├── docs/              documentazione e demo pubblicata (docs/demo/)
├── package.json       solo comandi (npm run dev, api, test…), nessuna dipendenza
├── requirements.txt   dipendenze Python usate su Vercel (requirements-dev.txt: in più quelle locali)
├── vercel.json        build del frontend, rotte /api → api/index.py, cron notturno
└── .env.local         variabili locali, condivise da frontend e backend (mai su git)
```

## `backend/` — il backend Python

Le cartelle dividono il codice per il lavoro che fa:

- **`app.py`** — crea l'app FastAPI e registra le rotte.
- **`config.py`** — lettura delle variabili d'ambiente.
- **`routes/`** — gli indirizzi `/api/...` che chiama il frontend. Controllano chi chiama e passano il lavoro agli altri.
  - `fogli.py` — lettura del foglio principale (`/api/fogli/dati`) e di quello di configurazione (`/api/fogli/dati-base`).
  - `scritture.py` — riga nuova, portafoglio, investimenti, nuovo strumento, verifica mensile, Dati Base, foglio nuovo.
  - `banca.py` — collega, callback, sincronizza (service account), più movimenti, collegamenti, "Stato" ed `elabora` (token dell'utente): classificazione, registrazione automatica e lista "Da confermare".
  - `comune.py` — `con_utente`: token dell'utente ed errori tradotti per l'app (401 sessione scaduta, 400 scrittura rifiutata, 502 errore di Google).
- **`services/`** — chiamate all'esterno: `enable_banking.py` (banca, PSD2) e `google_sheets.py` (classe `GoogleSheets`: con il token dell'utente, o con il service account `wally-sync` per il cron).
- **`domain/`** — logica pura, senza rete né foglio, la parte più testata:
  - `conversioni.py` — numeri delle celle in formato italiano o americano (`numero_localizzato`). Un bug qui corrompe le cifre in silenzio.
  - `righe.py` — righe del foglio in oggetti (`righe_in_oggetti`), riconoscendo le colonne dall'intestazione anche se riordinate.
  - `lettura.py` — monta l'oggetto dati dell'app: colonne strumenti dei broker, liste dei Dati Base, preset, sistemazione di Risparmio ed Entrate.
  - `cruscotto.py` — Cruscotto Investimenti anno per anno.
  - `scrittura.py` — quali celle scrivere e con che valore: riga nuova con le formule copiate dalla riga sopra (`sposta_formula`), date (`data_da_testo`), contatori del portafoglio, investimenti accodati (`valore_accodato`), dove inserire un nuovo strumento, controlli per non sovrascrivere.
  - `movimenti.py` — movimenti delle banche resi uniformi.
  - `classificazione.py` — regole dai preset, giri tra conti, esiti (automatico / da confermare), suggerimenti per il modulo (data probabile, descrizione breve, conto nella causale).
  - `regole_banca.py` — regole fisse (stipendio, PAC Scalable, bonifici a sé stessi).
  - `registrazione.py` — dai movimenti riconosciuti ai record da scrivere, e il "già inserito a mano?".
- **`models/`** — forma dei dati: `foglio.py` (la mappa delle schede del foglio, unica per letture e scritture: campi, intestazioni, numeri, date, mesi, formule) e `banca.py` (schede "Banca Collegamenti" e "Movimenti Banca").
- **`security/`** — `accesso.py`: chi può chiamare le rotte (proprietario del foglio, cron di Vercel) e lo `state` firmato del collegamento banca.
- **`tests/`** — test pytest, uno per modulo (`npm run test:py`). `test_allineamento_frontend.py` controlla le due piccole cose rimaste anche nel frontend (nome di campo degli strumenti, intestazioni del Risparmio).

## `frontend/` — l'app React

Da qui in giù i percorsi sono dentro `frontend/`.

## `frontend/src/main.tsx` e `frontend/src/App.tsx` — avvio e guscio dell'app

- **`main.tsx`** — punto di ingresso: monta `<App />` nel DOM. Non toccare quasi mai.
- **`App.tsx`** — due componenti:
  - `App`: login/logout, tema chiaro/scuro, filtri anno/mese selezionati (stato deliberatamente **fuori** da `FinanceDataContext`, passato via props — vedi CLAUDE.md).
  - `DashboardShell`: la dashboard vera e propria una volta loggati (sidebar + header + pagina attiva + toast). Vive dentro `<FinanceDataProvider>` per poter leggere i dati con `useFinanceData()`.

## `frontend/src/lib/` — integrazioni esterne

- **`googleAuth.ts`** — login Google via Firebase, gestione del token OAuth per Sheets/Drive, "ricorda questo dispositivo". Il token OAuth scade sempre dopo ~1 ora (limite di Google): `silentTokenRefresh` lo rinnova senza popup usando Google Identity Services (script caricato in `index.html`, richiede `VITE_GOOGLE_OAUTH_CLIENT_ID` — vedi `.env.example`), ma **solo se agganciato a un vero click dell'utente** (verificato: un rinnovo tentato da un timer in background viene sempre bloccato dal browser). App.tsx lo richiama da un listener sui click quando sono passati >40 minuti dall'ultimo rinnovo, e come fallback prima di un logout forzato su 401. Se il dispositivo resta inattivo/la scheda è chiusa per più di ~50 minuti, al ritorno serve comunque un nuovo click di login.
- **`backend.ts`** — `chiamaBackend`: chiama le rotte `/api/*` del backend con il token Google dell'utente; un 401 diventa un errore "UNAUTHENTICATED" (rinnovo del login), gli altri errori portano il messaggio del backend.
- **`sheetsService.tsx`** — le funzioni che l'app usa per il foglio, ognuna una chiamata al backend: `fetchSpreadsheetData`, `fetchDatiBaseFromConfigSheet`, `appendRowToSheet` (usata da tutti i form "Aggiungi..." tramite `appendAndPush` in `useSaveAndPush.ts`), `updatePortafoglioRawCounts`, `writeInvestimentiRicorrentiToSheet`, `addStrumentoBrokerColumn`, `writeVerificaMensileToSheet`, `pushDatiBaseToConfigSheet` (foglio di configurazione, ID in `sf_config_spreadsheet_id`), `createSpreadsheet`. `pushSpreadsheetData` (riscrittura completa) è spento e dà sempre l'errore "scrittura disattivata".
- **`bancaService.ts`** — lato app della banca, tutto tramite il backend: `elaboraMovimentiBanca` (lista da confermare ed eventuale registrazione automatica), collegamenti, "Stato", collega e sincronizza. Qui ci sono anche i tipi dei movimenti.

## `frontend/src/config/` — configurazione statica

- **`sheetsConfig.ts`** — solo `INTESTAZIONI_RISPARMIO`, le intestazioni predefinite della scheda Risparmio. La mappa delle schede è nel backend (`backend/models/foglio.py`).
- **`targets.ts`** — le percentuali obiettivo del piano di risparmio (35% spese primarie, 15% secondarie, 25% investimenti, il resto risparmio) usate per colorare/etichettare KPI in più pagine.
- **`datiBaseSeed.ts`** — valori di default (Conti/Categorie/Preset Uscite e Trasferimenti Ricorrenti/Soglie) usati solo al primo avvio, prima che l'utente li modifichi da Impostazioni o li importi dal foglio di configurazione. `PresetUscita` include `giornoDelMese` (1-31): usato da "Uscite Ricorrenti" per datare ogni uscita aggiunta in blocco sul giorno giusto del mese, non sulla data odierna.

## `frontend/src/data/` — dati e persistenza

- **`mockData.ts`** — cache locale + stato in-memory (livello 2 dell'architettura). Contiene tutti i tipi (`Transaction`, `RisparmioMese`, `ContoPatrimonio`, ...), gli array esportati, `saveToLocalStorage` (unico punto di scrittura, usato anche dai form "Aggiungi...") e `getExportableData` (assembla l'oggetto dati completo).
- **`demoData.ts`** — dati interamente fittizi usati in modalità incognito. Deve rispecchiare le stesse forme (tipi) di `mockData.ts`.
- **`datiBase.ts`** — solo re-export di comodo da `mockData.ts`/`config/datiBaseSeed.ts`, per non dover aggiornare gli import esistenti nei componenti di Impostazioni. Nessuna logica propria.

## `frontend/src/context/` — ponte dati ↔ UI

- **`FinanceDataContext.tsx`** — `FinanceDataProvider` + hook `useFinanceData()`. Unico punto di lettura dati per la UI (livello 3 dell'architettura), più stato di sincronizzazione/incognito.

## `frontend/src/hooks/` — logica per singola pagina

Ogni hook prende `useFinanceData()` e ne deriva aggregati/filtri/KPI specifici di UNA pagina, tenendo la logica numerica separata dal JSX:

- **`usePanoramicaData.ts`** — aggregati mensili/annuali, trend, dati per i drawer di dettaglio della pagina Panoramica.
- **`useEntrateData.ts`** — filtri e aggregazioni per la pagina Entrate.
- **`useUsciteData.ts`** — filtri e aggregazioni per la pagina Uscite.
- **`usePatrimonioData.ts`** — calcoli per la pagina Patrimonio (conti, capitale disponibile/investito/impegnato, soglie di allarme).
- **`useInvestimentiData.ts`** — dati per le 4 schede (subviews) della pagina Investimenti.

Due hook a parte, per il percorso di **scrittura** invece che lettura/aggregazione (usati dai form "Aggiungi..." e da Impostazioni → Dati Base):

- **`useSaveAndPush.ts`** — `saveAndPush` (salva in locale poi fa un push completo, oggi spento: usato solo dal percorso storico di `SheetsModal.tsx`) e `appendAndPush` (salva in locale poi chiama `appendRowToSheet` una volta per ogni `{tabTitle, record}` passato — il percorso usato da tutti i form "Aggiungi..."). Entrambi salvano sempre in locale per primi, poi propagano l'errore di push senza disfare il salvataggio locale.
- **`useDatiBase.ts`** — letto/scritto da Impostazioni → Dati Base (Conti, Categorie Entrate/Uscite, Soglie, Preset Uscite/Trasferimenti Ricorrenti) e dai form che leggono i preset. Il push va **sempre** verso il foglio di configurazione (`pushDatiBaseToConfigSheet`), mai verso il foglio principale — altrimenti la sync automatica di `fetchDatiBaseFromConfigSheet` ad ogni refresh sovrascriverebbe la modifica al giro dopo.

## `frontend/src/pages/` — una per voce di menu

- **`Panoramica.tsx`** — home page con la situazione economica d'insieme (bilancio storico mensile, KPI principali).
- **`Entrate.tsx`** / **`Uscite.tsx`** — elenco e gestione (aggiungi/modifica/elimina) di entrate/spese, con filtri per anno/mese.
- **`Patrimonio.tsx`** — conti e capitale (disponibile, investito, impegnato) per categoria.
- **`Investimenti.tsx`** — guscio sottile che monta le 4 `frontend/src/subviews/*` in base al tab selezionato; la logica vera è in `useInvestimentiData`.
- **`AnalisiConsumi.tsx`** — tracking consumi carburante dell'auto (km/litro, costo, efficienza settimanale).
- **`Impostazioni.tsx`** — tema, ID del foglio Google collegato, sincronizzazione manuale, logout.
- **`Login.tsx`** — schermata di accesso con Google.

## `frontend/src/subviews/` — le 4 schede dentro "Investimenti"

- **`CruscottoGenerale.tsx`** — vista aggregata investito/rendimento per anno.
- **`Conti.tsx`** — dettaglio dei due broker (Scalable, Trade Republic): strumenti posseduti, saldo, rendimento.
- **`Rendimenti.tsx`** — andamento mensile/cumulativo dei rendimenti nel tempo.
- **`FondoPensione.tsx`** — versamenti e accumulo del fondo pensione.

## `frontend/src/components/` — pezzi riusabili di UI

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

## `frontend/src/utils/` — funzioni pure di supporto

- **`date.ts`** — costanti e helper sulle date (es. `MESI_ITALIANI`, l'elenco dei mesi in italiano usato per ordinare/confrontare).
- **`format.ts`** — formattazione di numeri/valute per la visualizzazione.
- **`kpiColorScale.ts`** — calcola un colore interpolato (rosso→verde) per un KPI in base a dove si posiziona tra il minimo, la mediana e il massimo storico.
- **`thresholds.ts`** — soglie/percentuali obiettivo (basate su `config/targets.ts`) usate per giudicare se un valore è "in target".
- **`sheetsUtils.ts`** — `toValidFieldName`: nome di campo da un'intestazione strumento, uguale a `nome_campo` del backend.
- **`numeri.ts`** — `parseLocalizedNumber`: numeri in formato italiano o americano, per i valori che il frontend rielabora.
- **`esitoSettimanale.ts`** — calcola il giudizio (Ottima/Buona/Nella media/...) di una settimana di consumi auto.
- **`cruscottoInvestimenti.ts`** — combina i dati di Scalable, Trade Republic e Rendimenti per calcolare le metriche aggregate del Cruscotto Investimenti, anno per anno.

## File di configurazione a livello di progetto (fuori da `frontend/src/`)

- **`vite.config.ts`** — configurazione del bundler Vite.
- **`tsconfig*.json`** — configurazione TypeScript.
- **`package.json`** — dipendenze e script (`npm run dev/build/lint`). Nota: `@google/genai`, `express` e le variabili `GEMINI_API_KEY`/`APP_URL` sono residui dello scaffolding iniziale (Google AI Studio) e non sono usati da nessuna funzionalità dell'app.
