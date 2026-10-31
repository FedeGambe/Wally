# Guida al backend

Il backend è un'app **Python + FastAPI** nella cartella `backend/`. Fa tutto il lavoro con il foglio Google e con le banche: il browser non parla mai direttamente con Google Sheets, chiama le rotte `/api/...` del backend.

Per il flusso dei dati da un capo all'altro leggi [ARCHITETTURA.md](./ARCHITETTURA.md). Per il frontend c'è [FRONTEND.md](./FRONTEND.md).

## Come si avvia

| Comando (dalla cartella principale) | Cosa fa |
|---|---|
| `npm run dev` | backend (porta 8000) e frontend (porta 3000) insieme |
| `npm run api` | solo il backend, con ricarica automatica quando salvi un file. Legge le variabili da `.env.local` |
| `npm run test:py` | tutti i test del backend (pytest) |

Serve [uv](https://docs.astral.sh/uv/): installa da solo Python e le librerie di `requirements-dev.txt` alla prima esecuzione.

Con il backend acceso, `http://localhost:8000/api/docs` mostra tutte le rotte e permette di provarle dal browser.

## Come viaggia una richiesta

```
browser ──/api/fogli/dati──> api/index.py ──> backend/app.py ──> routes/fogli.py
                                                                    │
                          services/google_sheets.py  <──────────────┤  (legge il foglio)
                          domain/lettura.py          <──────────────┘  (trasforma i dati)
```

1. Il browser chiama `/api/...` mandando il token Google dell'utente (`Authorization: Bearer ...`).
2. Su Vercel, `vercel.json` manda ogni `/api/...` a `api/index.py`. In locale lo fa Vite (`frontend/vite.config.ts`, voce `proxy`).
3. `routes/` riceve la richiesta, controlla chi chiama e passa il lavoro.
4. `services/` parla con l'esterno (Google Sheets, Enable Banking).
5. `domain/` fa i calcoli e decide cosa scrivere, senza rete.
6. La risposta torna al browser come JSON.

**Dove mettere il codice nuovo:** la logica pura va in `domain/`, le chiamate a servizi esterni in `services/`, i nuovi indirizzi `/api/...` in `routes/`.

---

## File nella cartella principale

| File / cartella | A cosa serve |
|---|---|
| `api/index.py` | **Necessario.** È l'unica funzione Vercel: carica l'app di `backend/app.py`. Vercel cerca le funzioni Python nella cartella `api/` in cima al progetto, quindi deve stare lì. Sono 10 righe e non va quasi mai toccato |
| `vercel.json` | Configurazione di Vercel: come costruire il frontend, `/api/*` → `api/index.py`, inoltro del login Firebase (`/__/auth`), quali file includere nella funzione (`backend/**`, senza i test) e il cron notturno della banca (`/api/banca/sincronizza` alle 4:00 UTC) |
| `requirements.txt` | Librerie Python usate in produzione: `fastapi`, `requests`, `google-auth`, `PyJWT`. Vercel le installa da qui |
| `requirements-dev.txt` | In più, solo in locale: `pytest`, `uvicorn` (server di sviluppo), `python-dotenv`, `httpx` (per i test delle rotte) |
| `pytest.ini` | Dice a pytest dove sono i test (`backend/tests`) e da dove importare (`backend`) |
| `.env.example` | Elenco di tutte le variabili d'ambiente, con spiegazione. Va copiato in `.env.local` e compilato |
| `.env.local` | Variabili vere, condivise da frontend e backend. **Mai su git** |
| `.banca/` | Chiavi `.pem` scaricate da Enable Banking. Solo in locale, mai su git |

### Variabili d'ambiente usate dal backend

| Variabile | A cosa serve |
|---|---|
| `VITE_DEFAULT_SPREADSHEET_ID` | ID del foglio principale ("Finanza"). Usato dalla banca e per capire se chi chiama è il proprietario |
| `VITE_DEFAULT_CONFIG_SPREADSHEET_ID` | ID del foglio di configurazione (Dati Base, "Banca Collegamenti") |
| `EB_APP_ID`, `EB_PRIVATE_KEY` | Credenziali di Enable Banking (ID applicazione e chiave privata `.pem`) |
| `EB_REDIRECT_URL` | Dove la banca rimanda l'utente dopo il consenso (`.../api/banca/callback`) |
| `GOOGLE_SA_KEY` | Chiave JSON del service account `wally-sync`, per scrivere sul foglio senza un utente collegato (cron notturno) |
| `CRON_SECRET` | Password del cron di Vercel. Firma anche il collegamento con la banca |

Il prefisso `VITE_` serve solo a Vite per passarle anche al browser. Su Vercel il backend le vede comunque.

---

## `backend/` — file principali

| File | A cosa serve |
|---|---|
| `__init__.py` | Rende `backend` un pacchetto Python. Contiene una mappa delle cartelle |
| `app.py` | Crea l'app FastAPI e registra i quattro gruppi di rotte (`banca`, `fogli`, `scritture`, `previsioni`). Imposta la pagina di prova su `/api/docs` |
| `config.py` | `env(nome)`: legge una variabile d'ambiente e si ferma con un errore chiaro se manca. `chiave_pem`: ripristina gli a capo di una chiave incollata su Vercel |

## `backend/routes/` — gli indirizzi `/api/...`

Ogni file è un gruppo di rotte. Controllano chi chiama, leggono i parametri e passano il lavoro a `services/` e `domain/`.

### `fogli.py` — lettura dei fogli

| Rotta | Cosa fa |
|---|---|
| `GET /api/fogli/dati?foglio=<id>` | Legge tutte le schede del foglio principale in una sola chiamata a Google e restituisce l'oggetto dati dell'app (uscite, entrate, investimenti, cruscotto calcolato, ...) |
| `GET /api/fogli/dati-base?foglio=<id>` | Legge il foglio di configurazione: conti, categorie, soglie, preset |

### `scritture.py` — scritture sul foglio

Ogni rotta ha un modello (`Richiesta...`) che descrive i dati attesi. Il lavoro vero è in `services/scritture.py`.

| Rotta | Cosa fa |
|---|---|
| `POST /api/fogli/riga` | Aggiunge una riga (Uscite, Entrate, Trasferimenti, Analisi consumi, Fondo Pensione, ...) |
| `POST /api/fogli/portafoglio` | Aggiorna i contatori delle banconote (scheda "Portafoglio Raw") |
| `POST /api/fogli/investimenti` | Scrive gli importi mese × strumento su Scalable / Trade Republic |
| `POST /api/fogli/strumento` | Aggiunge la colonna di uno strumento nuovo su un broker |
| `POST /api/fogli/verifica-mensile` | Saldi, interessi, saveback di fine mese, solo in celle vuote |
| `PUT /api/fogli/dati-base` | Riscrive conti, categorie, soglie e preset sul foglio di configurazione |
| `POST /api/fogli/nuovo` | Crea un foglio Google nuovo con tutte le schede dell'app |

Se qualcosa non torna (colonna o mese mancante, cella già piena) la risposta è **400** e sul foglio non è stato scritto niente.

### `banca.py` — sincronizzazione bancaria

| Rotta | Chi la chiama | Cosa fa |
|---|---|---|
| `POST /api/banca/collega` | Impostazioni → Banche collegate | Avvia il collegamento (o rinnovo) di una banca: restituisce l'indirizzo della banca dove dare il consenso |
| `GET /api/banca/callback` | La banca, dopo il consenso | Apre la sessione, salva i conti in "Banca Collegamenti" e rimanda su Wally con `?banca=collegata` o `?banca=errore` |
| `GET /api/banca/sincronizza` | Il cron di Vercel (ogni notte) | Scarica i movimenti nuovi in "Movimenti Banca", con il service account |
| `POST /api/banca/sincronizza` | Il pulsante "Sincronizza ora" | Come sopra, ma solo per il proprietario del foglio |
| `GET /api/banca/movimenti` | L'app | Righe di "Movimenti Banca" |
| `GET /api/banca/collegamenti` | L'app | Banche collegate, con le scadenze dei consensi |
| `POST /api/banca/movimenti/stato` | L'app | Segna i movimenti come registrati o scartati (colonna "Stato") |
| `POST /api/banca/elabora` | L'app, all'apertura | Classifica i movimenti, registra da solo quelli sicuri e restituisce la lista "Da confermare" con i suggerimenti |

La sincronizzazione **scarica e basta**: la classificazione la fa `elabora` quando apri Wally, con i preset aggiornati. Ogni volta si riscaricano gli ultimi 10 giorni (`GIORNI_INDIETRO`), perché le banche contabilizzano in ritardo; i doppioni si scartano con l'ID.

### `previsioni.py` — pagina Previsioni

| Rotta | Cosa fa |
|---|---|
| `POST /api/previsioni` | Riceve dall'app i dati che ha già in memoria (`dati`) e le ipotesi dei cursori (`ipotesi`), risponde con fine mese, prossimi 12 mesi e patrimonio. Non legge il foglio |

Il controllo del proprietario (`da_proprietario`) costa una chiamata a Google: un token già controllato vale 10 minuti, così spostare i cursori non consuma la quota. In incognito l'app manda i dati finti, quindi le previsioni sono finte anche loro.

### `comune.py` — parti in comune

`con_utente(request, cosa, lavoro)` è usata da quasi tutte le rotte: prende il token dell'utente, esegue il lavoro e traduce gli errori in risposte che l'app sa mostrare:

| Codice | Quando |
|---|---|
| 401 | Token mancante o scaduto. Il messaggio inizia con `UNAUTHENTICATED` e l'app rinnova il login |
| 400 | Scrittura rifiutata prima di toccare il foglio |
| 502 | Errore di Google (foglio non condiviso, ID sbagliato, ...) |

## `backend/services/` — chiamate all'esterno

| File | A cosa serve |
|---|---|
| `google_sheets.py` | Classe `GoogleSheets`: tutte le chiamate all'API di Google Sheets (leggere intervalli, scrivere celle, aggiungere righe, creare schede e fogli). Funziona con il token dell'utente oppure con il service account (`GoogleSheets.service_account()`). Gli errori di Google diventano `ErroreSheets` con lo stato HTTP |
| `scritture.py` | Le procedure di scrittura: leggono dal foglio quello che serve, chiedono a `domain/scrittura.py` quali celle scrivere e scrivono solo quelle. Le usano le rotte di `routes/scritture.py` e la registrazione automatica della banca |
| `enable_banking.py` | Client di Enable Banking (open banking PSD2): firma ogni chiamata con un JWT, scarica i movimenti seguendo le pagine, passa alla banca le intestazioni "utente presente" (`intestazioni_psu`) per evitare il limite di 4 letture al giorno |

## `backend/domain/` — logica pura

Niente rete e niente foglio: ricevono dati, restituiscono dati. Sono la parte più testata. **Un bug qui può corrompere le cifre in silenzio**, quindi dopo ogni modifica lancia `npm run test:py`.

| File | A cosa serve |
|---|---|
| `conversioni.py` | Testo delle celle → numeri. `numero_localizzato` capisce sia `1.234,56` sia `1,234.56`. Alcune funzioni imitano JavaScript di proposito, perché gli ID delle righe devono restare identici a quelli di prima |
| `righe.py` | Righe del foglio → oggetti dell'app (`righe_in_oggetti`). Riconosce le colonne dall'intestazione anche se le sposti. `nome_campo` crea i nomi dei campi degli strumenti |
| `lettura.py` | Monta l'oggetto dati completo per l'app (`dati_principali`, `dati_base`): colonne degli strumenti dei broker, liste dei Dati Base, preset, sistemazione di Risparmio ed Entrate |
| `cruscotto.py` | Cruscotto Investimenti anno per anno: quanto investito per asset class e quanto ha reso |
| `scrittura.py` | Quali celle scrivere e con che valore: riga nuova con le formule copiate dalla riga sopra (`sposta_formula`), date (`data_da_testo`), banconote, investimenti che si sommano a quelli già presenti (`valore_accodato`), posizione di un nuovo strumento, controlli per non sovrascrivere. `ErroreScrittura` è l'errore che diventa un 400 |
| `movimenti.py` | Movimenti delle banche resi uniformi (`normalizza_movimenti`). UniCredit dà la causale completa; Trade Republic solo data e importo, quindi l'ID va costruito |
| `classificazione.py` | Il motore delle regole: per ogni movimento decide se si registra da solo (`automatico`), va confermato (`da-confermare`) o è l'altro lato di un giro tra conti. Suggerisce anche data probabile, descrizione breve e conto nominato nella causale |
| `regole_banca.py` | Regole fisse (stipendio, PAC Scalable, bonifici a sé stessi). Si aggiungono a quelle generate dai preset. L'ordine conta: vince la prima che combacia |
| `registrazione.py` | Dai movimenti "automatico" ai record da scrivere (uscita da preset con il suo trasferimento, giro tra conti, PAC). Controlla anche se la spesa era già stata inserita a mano, per non duplicarla |

### `backend/domain/previsioni/` — le stime della pagina Previsioni

Ogni stima ha una fascia (8 volte su 10 il valore vero ci cade dentro) e, dove si può, l'errore medio misurato rifacendola sui mesi passati. Con gli stessi dati esce sempre lo stesso risultato (seme casuale fisso).

| File | A cosa serve |
|---|---|
| `__init__.py` | `calcola_previsioni(dati, oggi, ipotesi)`: mette insieme le tre analisi |
| `serie.py` | Dati dell'app → serie mensili pulite. Toglie le righe dei mesi futuri che il foglio ha già pronte (Rendimenti fino al 2045, broker fino al 2028-2031). Nel fondo pensione il mese è solo il nome: l'anno si ricava a ritroso da oggi |
| `modello_mensile.py` | Il modello delle serie mensili: livello degli ultimi 12 mesi + stagionalità del mese di calendario. La fascia viene dalla variabilità dell'ultimo anno (non degli anni prima: da ottobre 2025 entrate e spese sono più che raddoppiate) |
| `fine_mese.py` | A. Chiusura del mese: già speso + preset non ancora registrati + quanto si è speso dopo il giorno di oggi negli ultimi 12 mesi (uno scenario per mese). Probabilità di superare le soglie |
| `flussi.py` | B. Entrate, spese e avanzo (entrate - spese) dei prossimi 12 mesi, dai mesi chiusi della scheda Risparmio. Stima a parte stipendio, altre entrate e spese, tutto senza le voci straordinarie |
| `stipendio.py` | Lo stipendio del periodo di lavoro attuale (mediana dei mesi dall'ultimo cambio) più tredicesima e quattordicesima, per i mesi lavorati e alla "resa netta" osservata in busta |
| `straordinarie.py` | Spese ed entrate una tantum (singole voci da 1.000 € in su, più quelle con la stessa descrizione nello stesso mese): escluse dalle stime e restituite in un elenco |
| `patrimonio.py` | C. Storico della crescita diviso per origine (risparmio sui conti, versamenti, mercato, fondo pensione: cifre del foglio, nessuna stima), situazione di oggi (il conto con "fondo" nel nome è il fondo pensione), e proiezione Monte Carlo con le ipotesi dei cursori. Se i conti si svuotano il PAC si riduce e la risposta lo segnala (`pacNonCoperto`). Il fondo pensione (TFR) resta fuori dalla proiezione, a meno che l'app mandi `includiFondoPensione` |

I fatti che i numeri non dicono (inizio del tirocinio, assunzione, mensilità extra, soglia delle voci straordinarie) stanno in `backend/models/previsioni.py`: per un nuovo lavoro o un aumento si aggiunge una riga a `CAMBI_STIPENDIO`.

`backend/strumenti/previsioni_demo.py` rigenera le previsioni della demo pubblicata (`npm run previsioni:demo`).

## `backend/models/` — forma dei dati

| File | A cosa serve |
|---|---|
| `foglio.py` | **La mappa del foglio Google**, l'unica: per ogni scheda dice nome, celle da leggere, campi, intestazioni, quali colonne sono numeri, date, mesi o formule. Per aggiungere o cambiare una colonna si modifica **solo qui**. Contiene anche le soglie di default e l'elenco dei broker |
| `banca.py` | Le due schede della banca: "Banca Collegamenti" (foglio di configurazione, un conto per riga) e "Movimenti Banca" (foglio principale, un movimento per riga). La classe `Collegamento` legge e scrive una riga |

## `backend/security/` — chi può chiamare

| File | A cosa serve |
|---|---|
| `accesso.py` | `token_bearer`: legge il token dalla richiesta. `da_proprietario`: è autorizzato chi riesce ad aprire il foglio principale con il suo token (niente elenco di email). `da_cron`: controlla `CRON_SECRET`. `crea_state` / `leggi_state`: firmano il collegamento con la banca, valido un'ora, così il ritorno dalla banca accetta solo collegamenti partiti da Wally |

## `backend/tests/` — test

Un file di test per modulo. Le rotte si provano con Google Sheets ed Enable Banking finti: nessun test tocca il foglio vero.

| File | Cosa controlla |
|---|---|
| `test_conversioni.py` | Numeri italiani/americani e conversioni "alla JavaScript" |
| `test_righe.py` | Righe del foglio → oggetti, colonne riordinate |
| `test_lettura.py` | Oggetto dati completo, strumenti, Dati Base |
| `test_cruscotto.py` | Calcoli del Cruscotto Investimenti |
| `test_scrittura.py` | Logica pura delle scritture (formule, date, celle già piene) |
| `test_scritture.py` | Rotte di scrittura con un foglio finto che registra cosa viene scritto |
| `test_fogli.py` | Rotte di lettura `/api/fogli/*` |
| `test_movimenti.py` | Normalizzazione dei movimenti delle banche |
| `test_classificazione.py` | Regole e classificazione dei movimenti |
| `test_registrazione.py` | Piano di registrazione e controllo "già inserito" |
| `test_elabora.py` | `POST /api/banca/elabora` completo |
| `test_banca.py` | Le altre rotte `/api/banca/*` |
| `test_accesso.py` | Firma e scadenza dello `state` della banca |
| `test_previsioni.py` | Serie pulite, modello mensile, fine mese, storico e proiezione del patrimonio (con conti fatti a mano), rotta `/api/previsioni` |
| `test_allineamento_frontend.py` | Le due cose che esistono sia nel frontend sia nel backend (nome dei campi degli strumenti, intestazioni del Risparmio) restano uguali |

## Cose da sapere

- **Le formule del foglio non si sovrascrivono.** Una riga nuova copia la formula della riga sopra nelle colonne-formula (`formule` in `models/foglio.py`). In passato due scritture avevano cancellato formule con valori fissi.
- **La riscrittura completa del foglio è spenta** e nel backend non esiste: aveva corrotto il foglio due volte.
- **Limite di Google:** 60 letture al minuto per utente. Per questo `/api/fogli/dati` legge tutte le schede in una sola chiamata.
- **Limite delle banche:** senza l'utente presente la PSD2 permette circa 4 letture al giorno per conto. Il piano Hobby di Vercel permette un solo cron al giorno.
- **Il collegamento di una banca funziona solo in produzione**, perché il ritorno dalla banca punta al dominio vero.
