# Guida al frontend

Il frontend è l'app che vedi nel browser: **React 19 + TypeScript**, costruita con **Vite 6**. Stile con **Tailwind CSS 4**, grafici con **Recharts**, animazioni con **Motion**, icone **lucide-react**, login Google con **Firebase**. Sta tutto nella cartella `frontend/`.

Il frontend **mostra** i dati e li fa **modificare**: leggere e scrivere il foglio Google lo fa il backend (vedi [BACKEND.md](./BACKEND.md)). Il giro completo dei dati è in [ARCHITETTURA.md](./ARCHITETTURA.md). Se termini come "componente", "hook" o "props" non ti sono familiari parti da [GUIDA-REACT-TS.md](./GUIDA-REACT-TS.md).

## Come si avvia

| Comando (dalla cartella principale) | Cosa fa |
|---|---|
| `npm run dev` | frontend (http://localhost:3000) e backend insieme. **Senza backend l'app non legge i dati** |
| `npm run dev:frontend` | solo il frontend |
| `npm run build` | build di produzione in `frontend/dist/` (la usa Vercel) |
| `npm run build:demo` | build della demo con dati finti in `docs/demo/` |
| `npm run preview` | apre in locale la build di produzione |
| `npm run lint` | controllo dei tipi TypeScript (`tsc --noEmit`) |
| `npm test` | test del frontend (Vitest) |

Dopo ogni modifica: `npm run lint`, `npm test`, e poi prova l'app a mano nel browser (i test coprono solo una piccola parte).

## Le tre regole da non rompere

1. **Si legge solo da `useFinanceData()`.** Le pagine non importano gli array di `data/mockData.ts` (solo i *tipi*, come `Transaction`).
2. **Si scrive in locale solo con `saveToLocalStorage()`**, e subito dopo si chiama `bumpVersion()`, altrimenti lo schermo non si aggiorna.
3. **`getExportableData()` senza argomenti dà sempre i dati veri**, mai quelli della modalità incognito. Non cambiare questo comportamento: impedisce che dati finti finiscano sul foglio.

Anno e mese selezionati **non** stanno nel contesto dei dati: li tiene `App.tsx` e li passa alle pagine come props.

---

## File in `frontend/`

| File / cartella | A cosa serve |
|---|---|
| `package.json` | Librerie del frontend e comandi (`dev`, `build`, `build:demo`, `lint`, `test`) |
| `package-lock.json` | Versioni esatte delle librerie installate. Non si modifica a mano |
| `index.html` | Pagina di partenza dell'app: carica `src/main.tsx`, le icone e lo script di Google Identity Services (per rinnovare il login senza popup) |
| `demo.html` | Pagina di partenza della demo: carica `src/demo/main.tsx` |
| `vite.config.ts` | Configurazione di Vite per l'app: plugin React e Tailwind, legge `.env.local` dalla cartella principale (`envDir: '..'`), inoltra `/api` al backend sulla porta 8000, toglie i `console.log` dalla build |
| `vite.demo.config.ts` | Configurazione della build della demo: un solo file che si apre anche da disco, uscita in `docs/demo/`. Non legge le variabili `VITE_` così nessuna chiave finisce online |
| `tsconfig.json` | Regole di TypeScript (modalità `strict`, alias `@/` per la cartella `frontend/`) |
| `public/icon/` | Icone dell'app (`app-icon-solo.png` per il browser, `app-icon-wordmark.png` per la schermata Home del telefono) |
| `dist/` | Build generata da `npm run build`. Non è su git |
| `node_modules/` | Librerie installate. Non è su git |

---

## `frontend/src/` — file principali

| File | A cosa serve |
|---|---|
| `main.tsx` | Punto di ingresso: monta `<App />` nella pagina. Non si tocca quasi mai |
| `App.tsx` | Il guscio dell'app, in due parti. `App`: login/logout, tema chiaro/scuro, anno e mese selezionati, rinnovo del token quando l'utente clicca. `DashboardShell`: la dashboard dopo il login (barra laterale, intestazione, pagina attiva, barra in basso su telefono, avvisi). Carica le pagine solo quando servono (`lazy`) |
| `index.css` | Stili globali: configurazione di Tailwind, colori, tema scuro "vetro" (`.glass-theme`) |
| `vite-env.d.ts` | Elenco e tipi delle variabili `VITE_*` lette dal browser |

## `src/lib/` — collegamenti con l'esterno

| File | A cosa serve |
|---|---|
| `googleAuth.ts` | Login con Google tramite Firebase e gestione del token per Google Sheets. Il token scade dopo circa un'ora: `silentTokenRefresh` lo rinnova senza popup, ma funziona solo dopo un vero clic dell'utente. "Ricorda questo dispositivo" lo salva in `localStorage` |
| `backend.ts` | `chiamaBackend`: chiama le rotte `/api/*` mandando il token dell'utente. Un 401 diventa un errore `UNAUTHENTICATED` (l'app rinnova il login) |
| `sheetsService.tsx` | Le funzioni che l'app usa per il foglio, ognuna una chiamata al backend: `fetchSpreadsheetData` (legge tutto), `fetchDatiBaseFromConfigSheet`, `appendRowToSheet` (aggiunge una riga), `updatePortafoglioRawCounts`, `writeInvestimentiRicorrentiToSheet`, `addStrumentoBrokerColumn`, `writeVerificaMensileToSheet`, `pushDatiBaseToConfigSheet`, `createSpreadsheet`. `pushSpreadsheetData` (riscrittura completa) è spenta e dà sempre errore |
| `previsioniService.ts` | Tipi della risposta di `POST /api/previsioni`, ipotesi predefinite dei cursori e la chiamata |
| `bancaService.ts` | Lato app della banca: elabora i movimenti, legge le banche collegate, segna i movimenti registrati o scartati, avvia il collegamento e "Sincronizza ora". Contiene anche i tipi dei movimenti |

## `src/context/` — il ponte tra dati e schermo

| File | A cosa serve |
|---|---|
| `FinanceDataContext.tsx` | `FinanceDataProvider` e l'hook `useFinanceData()`: l'**unico punto di lettura** dei dati per tutte le pagine. Espone i dati (veri o finti in incognito), `refreshData` (rilegge il foglio, anche in automatico al login), `bumpVersion`, lo stato della sincronizzazione e degli errori, la modalità incognito |

## `src/data/` — dati salvati sul dispositivo

| File | A cosa serve |
|---|---|
| `mockData.ts` | Copia locale dei dati e stato in memoria. Definisce tutti i tipi (`Transaction`, `RisparmioMese`, `ContoPatrimonio`, ...), gli array caricati da `localStorage` (chiavi `sf_...`), `saveToLocalStorage` (l'unico punto di scrittura) e `getExportableData` (monta l'oggetto dati completo). Nonostante il nome, contiene i dati veri |
| `demoData.ts` | Dati inventati per la modalità incognito e per la demo. Devono avere la stessa forma dei dati veri: se aggiungi un campo a un tipo, aggiungilo anche qui |
| `datiBase.ts` | Solo ri-esportazioni di comodo da `mockData.ts` e `config/datiBaseSeed.ts`, usate dagli editor di Impostazioni. Nessuna logica |

## `src/config/` — valori fissi

| File | A cosa serve |
|---|---|
| `datiBaseSeed.ts` | Valori iniziali di conti, categorie, preset e soglie, usati solo al primo avvio prima di leggere il foglio di configurazione |
| `sheetsConfig.ts` | Solo `INTESTAZIONI_RISPARMIO`, le intestazioni predefinite della scheda Risparmio. La mappa completa del foglio è nel backend (`backend/models/foglio.py`) |
| `targets.ts` | Percentuali obiettivo di default (35% spese primarie, 15% secondarie, 25% investimenti, il resto risparmio). Se il foglio ha le sue soglie vincono quelle |

## `src/hooks/` — logica separata dalla grafica

Un hook prende i dati da `useFinanceData()` e prepara i numeri per una pagina: così un errore nei calcoli si cerca qui e non in mezzo al codice grafico.

**Calcoli per le pagine**

| File | Pagina | Cosa prepara |
|---|---|---|
| `usePanoramicaData.ts` | Panoramica | KPI del mese, andamento, soglie dinamiche, dettaglio mese |
| `usePanoramicaFunnelData.ts` | Panoramica | Nodi e collegamenti del grafico "Flusso del Mese" |
| `useEntrateData.ts` | Entrate | Filtri, andamento, ripartizione per categoria e conto, confronto col mese prima |
| `useUsciteData.ts` | Uscite | Filtri, andamento, ripartizione per categoria, soglie di spesa |
| `usePatrimonioData.ts` | Patrimonio | Totali per conto, capitale disponibile/investito/accantonato, andamento con stime |
| `useInvestimentiData.ts` | Investimenti | Dati delle 4 schede (Cruscotto, Rendimenti, Conti, Fondo pensione). `parseMeseStringToMonthYear` legge mesi scritti in modi diversi |
| `useAnalisiConsumiData.ts` | Analisi consumi | Settimane (da martedì a lunedì), km/litro, costi, settimana selezionata |
| `usePrevisioni.ts` | Previsioni | Manda al backend i dati in memoria e le ipotesi (con un attimo di attesa dopo l'ultimo cursore), ricorda le ipotesi sul dispositivo. Nella demo usa `data/demoPrevisioni.json` |
| `useMovimentiBanca.ts` | Card "Dalla banca" | Chiede al backend di elaborare i movimenti, tiene la lista "Da confermare", evita due registrazioni automatiche in contemporanea |

**Scrittura dei dati**

| File | A cosa serve |
|---|---|
| `useSaveAndPush.ts` | Usato da tutti i moduli "Aggiungi...". `appendAndPush` salva in locale e poi aggiunge la riga sul foglio (più le banconote se il conto è Contanti). Se il foglio fallisce il dato resta in locale e compare un avviso. `saveAndPush` passa dalla riscrittura completa, oggi spenta |
| `useDatiBase.ts` | Legge e modifica conti, categorie, soglie e preset. Scrive **sempre** sul foglio di configurazione, mai sul principale |

**Comportamento dell'interfaccia**

| File | A cosa serve |
|---|---|
| `useIsMobile.ts` | Dice se lo schermo è da telefono, per le cose che il CSS non può fare (es. etichette dei grafici) |
| `useFocusTrap.ts` | Nei popup tiene il tasto Tab dentro il popup, chiude con Esc e riporta il cursore dov'era |
| `useBolleAperte.ts` | Quale menu a pallini è aperto (barra in basso o "+" della Home): uno solo per volta. Nasconde il "+" mentre è aperto un pannello |
| `usePullToRefresh.ts` | "Tira giù per aggiornare" su telefono |

## `src/pages/` — una pagina per voce di menu

| File | Cosa mostra |
|---|---|
| `Login.tsx` | Schermata di accesso con Google |
| `Panoramica.tsx` | La Home: "Questo mese", patrimonio, card "Dalla banca", andamento, flusso del mese, storico mensile |
| `Entrate.tsx` | Entrate del mese e dell'anno, andamento, ripartizioni, elenco movimenti |
| `Uscite.tsx` | Spese primarie e secondarie, soglie, andamento, ripartizione per categoria, elenco filtrabile |
| `Patrimonio.tsx` | Tutti i conti e il capitale, sempre su tutto lo storico (senza filtro mese) |
| `Investimenti.tsx` | Guscio con 4 schede (le `subviews/`) e il "+" per aggiungere investimenti |
| `AnalisiConsumi.tsx` | Consumi dell'auto settimana per settimana |
| `Previsioni.tsx` | Solo computer (su telefono un avviso): chiusura del mese, prossimi 12 mesi, da dove viene la crescita del patrimonio, dove può arrivare con i cursori "E se…" |
| `Impostazioni.tsx` | Foglio Google collegato, sincronizzazione, tema, Dati Base, preset, banche collegate, logout |

## `src/subviews/` — le 4 schede di Investimenti

| File | Cosa mostra |
|---|---|
| `CruscottoGenerale.tsx` | Riepilogo di tutto il portafoglio (Scalable + Trade Republic): KPI, ripartizione, andamento, tabella per anno |
| `Rendimenti.tsx` | Andamento del rendimento in euro o in percentuale, grafici e registro mensile |
| `Conti.tsx` | Dettaglio di ciascun broker: saldo, investito, plusvalenza, interessi e saveback (Trade Republic), registro mensile |
| `FondoPensione.tsx` | Fondo pensione: valore accumulato, ripartizione TFR/azienda/dipendente, andamento, registro versamenti |

## `src/components/` — pezzi dell'interfaccia

### Componenti generali (cartella principale)

| File | A cosa serve |
|---|---|
| `Sidebar.tsx` | Menu laterale (da tablet in su), con profilo, logout e aggiornamento dati |
| `MobileBottomNav.tsx` | Barra in basso su telefono, con i menu a pallini di Transazioni e Investimenti |
| `Header.tsx` | Barra in alto: saluto, modalità incognito, scelta di anno e mese |
| `ErrorBoundary.tsx` | Se una pagina va in errore mostra un messaggio invece della pagina bianca |
| `Modal.tsx` | Popup centrato, usato dai moduli di inserimento |
| `SlideOverPanel.tsx` | Guscio dei pannelli che scorrono da destra |
| `Drawer.tsx` | Pannello di dettaglio di un mese o di una categoria (usa `SlideOverPanel`) |
| `DropdownMenu.tsx` | Menu a tendina usato ovunque al posto di quello del browser |
| `DataTable.tsx` | Tabella generica: chi la usa decide le colonne |
| `RigheTelefono.tsx` | Versione da telefono delle tabelle larghe: una riga per mese con le cifre principali |
| `BarreCategorie.tsx` | Versione da telefono delle ciambelle: una barra per categoria |
| `FinanceKpiCard.tsx` | Card con un indicatore (titolo, cifra, icona, dettaglio) |
| `EuroAmount.tsx` | Cifra in euro con i decimali più piccoli |
| `AmountHero.tsx` | Campo importo grande in cima ai moduli di inserimento |
| `ContantiBreakdown.tsx` | Scelta di quante banconote per taglio quando il conto è Contanti |
| `FloatingAddButton.tsx` | Bottone "+" fisso in basso a destra |
| `AggiungiDatoBubbles.tsx` | Il "+" a pallini della Home e di Investimenti: si sceglie il tipo di dato da aggiungere |
| `AggiungiDatoModal.tsx` | Popup "Aggiungi Dato": apre il modulo giusto per il tipo scelto |
| `SheetsModal.tsx` | Collegamento del foglio Google (crea foglio, imposta ID, sincronizza). Delicato: tocca la sincronizzazione |

### Sottocartelle

| Cartella | File | A cosa serve |
|---|---|---|
| `panoramica/` | `PanoramicaRendicontoWidget.tsx` | Card "Questo mese" con lo spendibile residuo |
| | `PanoramicaWealthCards.tsx` | Le 4 card patrimonio (Disponibile, Investito, Accantonato, Totale libero) |
| | `PanoramicaMeseCorrenteStrip.tsx` | Riepilogo del mese con scostamenti dalle soglie (solo computer) |
| | `PanoramicaTrendChart.tsx` | Grafico Risparmio/Investito, mensile o cumulato |
| | `PanoramicaFunnelChart.tsx` | Grafico "Flusso del Mese": dalle entrate a investimenti e spese |
| | `PanoramicaBilancioStorico.tsx` | Tabella storica mese per mese, colorata rispetto alle soglie |
| | `PanoramicaConsumiCard.tsx` | Card consumi auto nella Home (solo telefono) |
| | `RiepilogoMesePopup.tsx` | Popup di riepilogo del mese precedente, nei primi 5 giorni del mese |
| `entrate/` | `EntrateBentoCards.tsx` | Le due card in cima (mese e anno) |
| | `EntrateTrendChart.tsx` | Andamento mensile, cliccabile |
| | `EntratePieCard.tsx` | Ciambella per categoria o per conto |
| | `EntrateMovimentiTable.tsx` | Elenco delle entrate del mese |
| | `AggiungiEntrataForm.tsx` | Modulo "Aggiungi Entrata". Con lo stipendio propone anche la riga del fondo pensione |
| `uscite/` | `UsciteKpiCards.tsx` | Le 3 card (totali, primarie, secondarie) con barra della soglia |
| | `UsciteTrendChart.tsx` | Andamento ultimi 12 mesi, cliccabile |
| | `CategoryPieCard.tsx` | Ciambella per categoria, cliccabile per filtrare |
| | `AggiungiUscitaForm.tsx` | Modulo "Aggiungi Uscita", con preset e trasferimento collegato |
| | `AggiungiUsciteRicorrentiForm.tsx` | Aggiunge in blocco le uscite ricorrenti mancanti del mese |
| `trasferimenti/` | `AggiungiTrasferimentoForm.tsx` | Modulo "Aggiungi Trasferimento" tra conti (non cambia i saldi di Patrimonio) |
| `consumi/` | `AggiungiConsumoForm.tsx` | Modulo rifornimento: costo, litri, km. Le altre colonne sono formule del foglio |
| | `ConsumiRiepilogoSettimanale.tsx` | Esito della settimana e i 3 indicatori |
| | `ConsumiEfficienzaMarcia.tsx` | Grafici km/litro e costo per 100 km |
| | `ConsumiPercorrenzaPrezzo.tsx` | Grafici km percorsi e prezzo del carburante |
| | `ConsumiCostoExtraKmPersi.tsx` | Grafici costo extra e km persi per guida poco efficiente |
| | `ConsumiChartHelpers.tsx` | Pezzi comuni dei grafici consumi (assi, tooltip, interruttori) |
| `patrimonio/` | `PatrimonioContoCard.tsx` | Riga di un conto, con dettaglio che si apre al clic |
| | `PatrimonioCapitalSplitCard.tsx` | Ciambella del capitale diviso per tipo e per conto |
| | `PatrimonioEngagedCapitalCard.tsx` | Ciambella del capitale accantonato |
| | `PatrimonioTrendChart.tsx` | Grafico "Andamento Finanziario" con zoom e stime |
| `investimenti/` | `CruscottoKpiGroups.tsx` | Le 4 card KPI del Cruscotto |
| | `CruscottoInspectorWidget.tsx` | Dettaglio del mese selezionato |
| | `CruscottoAssetAllocationCard.tsx` | Ciambella di asset class e strumenti, con legenda |
| | `CruscottoInvestmentTrendChart.tsx` | Grafico "Andamento Investimenti" |
| | `CruscottoAssetClassTable.tsx` | Tabella asset class per anno |
| | `AggiungiInvestimentoModal.tsx` | Popup del "+" di Investimenti |
| | `AggiungiInvestimentiRicorrentiForm.tsx` | Scrive i PAC del mese dai preset |
| | `AggiungiInvestimentoUnaTantumForm.tsx` | Investimento singolo, anche su uno strumento nuovo |
| | `VerificaMensileForm.tsx` | Valori di fine mese da riportare dai broker |
| `banca/` | `MovimentiBancaCard.tsx` | Card "Dalla banca" in Panoramica: registrati in automatico, da confermare, consensi in scadenza |
| | `RegistraMovimentoModal.tsx` | Registra un movimento da confermare con i moduli di "Aggiungi Dato" già compilati |
| `previsioni/` | `comune.tsx` | Pezzi comuni e la regola della pagina: una stima si arrotonda, ha la fascia, l'etichetta "stima" ed è tratteggiata; le cifre vere restano esatte |
| | `PrevisioniFineMese.tsx` | Chiusura del mese: stima, soglie con probabilità di superarle, curva giorno per giorno |
| | `PrevisioniProssimiMesi.tsx` | Avanzo, entrate o spese dei prossimi 12 mesi, con fascia |
| | `PrevisioniCrescita.tsx` | Crescita cumulata per origine, tasso di risparmio, mesi di autonomia |
| | `PrevisioniProiezione.tsx` | Proiezione del patrimonio a ventaglio; sotto, le torte liquidità/investimenti (oggi e il momento cliccato sul grafico) e l'obiettivo; a destra i cursori "E se…", il fondo pensione e i rendimenti ipotizzati |
| `impostazioni/` | `DatiBaseSettings.tsx` | Menu "Dati Base" (Conti, Categorie, Soglie) |
| | `ContiEditor.tsx` | Modifica dei conti |
| | `CategorieEntrateEditor.tsx` | Modifica delle categorie entrate |
| | `CategorieUsciteEditor.tsx` | Modifica delle macro categorie uscite e delle loro sotto-categorie |
| | `SoglieEditor.tsx` | Modifica delle percentuali obiettivo |
| | `PresetRicorrentiSettings.tsx` | Menu "Preset Ricorrenti" |
| | `UsciteRicorrentiEditor.tsx` | Preset delle uscite che si ripetono ogni mese |
| | `TrasferimentiRicorrentiEditor.tsx` | Preset dei trasferimenti, collegati per nome a un'uscita ricorrente |
| | `InvestimentiRicorrentiEditor.tsx` | Importo mensile per ogni strumento dei broker (PAC) |
| | `FondoPensioneQuotaEditor.tsx` | Quota TFR mensile |
| | `BancheCollegateSettings.tsx` | Stato dei consensi bancari, collega o rinnova |
| | `editorUI.tsx` | Pezzi comuni a tutti gli editor (lista, scheda di modifica, pulsanti) |

## `src/utils/` — funzioni di supporto

Funzioni senza grafica, riusate in più punti.

| File | A cosa serve |
|---|---|
| `date.ts` | Nomi dei mesi in italiano e funzioni per leggere mesi e anni scritti in modi diversi |
| `format.ts` | Formattazione di euro e percentuali (`formatEuro`, `formatPercent`) e colori dei rendimenti |
| `kpiColorScale.ts` | Colore da rosso a verde di un valore rispetto al suo storico (minimo, mediana, massimo) |
| `thresholds.ts` | Soglie obiettivo, in ordine di priorità: Dati Base → intestazioni del Risparmio → `config/targets.ts` |
| `chartScale.ts` | Minimo dell'asse Y dei grafici di Entrate e Uscite, per far leggere meglio le variazioni |
| `cruscottoInvestimenti.ts` | Cruscotto Investimenti anno per anno (serve anche alla demo, che non ha backend) e ripartizione per asset class e strumenti, ricalcolata a ogni cambio di mese |
| `investimentiRicorrenti.ts` | Funzioni comuni a editor e modulo dei PAC (strumenti dei broker, etichetta del mese, importo già inserito) |
| `esitoSettimanale.ts` | Voto di una settimana di consumi (da "Migliore" a "Peggiore"), sempre rispetto alle altre |
| `consumiSettimane.ts` | Divide per due i valori quando il rifornimento copre due settimane |
| `numeri.ts` | `parseLocalizedNumber`: numeri italiani o americani. Stessa regola di `backend/domain/conversioni.py` |
| `sheetsUtils.ts` | `toValidFieldName`: nome del campo di uno strumento. Deve dare lo stesso risultato del backend (lo controlla `test_allineamento_frontend.py`) |
| `*.test.ts` | Test Vitest di `numeri`, `investimentiRicorrenti` e `consumiSettimane` |

## `src/demo/` — demo per la documentazione

| File | A cosa serve |
|---|---|
| `main.tsx` | Mostra le pagine vere dell'app con i dati di `demoData.ts`, senza login né Firebase. La pagina si sceglie con `?vista=panoramica`, `entrate`, ..., `previsioni`. Le previsioni della demo sono già calcolate in `data/demoPrevisioni.json`: dopo aver cambiato i dati demo si rigenerano con `npm run previsioni:demo` (lo script `frontend/scripts/esporta-dati-demo.ts` passa i dati finti al backend) La build (`npm run build:demo`) finisce in `docs/demo/` ed è incorporata in `docs/documentazione.html` |

---

## Variabili d'ambiente del frontend

Stanno in `.env.local` nella cartella principale (su Vercel: Environment Variables). Solo quelle che iniziano per `VITE_` arrivano al browser.

| Variabile | A cosa serve |
|---|---|
| `VITE_FIREBASE_*` | Configurazione di Firebase per il login |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | Rinnovo del token senza popup. Senza, in locale il login scade dopo un'ora |
| `VITE_DEFAULT_SPREADSHEET_ID` | Foglio principale proposto al primo avvio |
| `VITE_DEFAULT_CONFIG_SPREADSHEET_ID` | Foglio di configurazione proposto al primo avvio |
