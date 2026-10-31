# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Un solo utente: il proprietario (Federico), che tiene traccia delle proprie finanze personali. Ogni giorno usa Wally dal telefono per registrare movimenti e dare un'occhiata ai numeri; al computer fa le sessioni di analisi (andamenti, patrimonio, investimenti, consumi).

Pubblico secondario: chi guarda la **demo vetrina** (build `npm run build:demo`, `demo.html`), cioè l'app con dati interamente finti mostrata nel sito dei progetti/portfolio. Non usa l'app per sé: la valuta.

## Product Purpose

Dashboard di finanza personale, tutta in italiano, che tiene insieme in un unico posto entrate, uscite, trasferimenti, patrimonio per conto, investimenti (broker, rendimenti, fondo pensione) e consumi dell'auto. Successo: sapere in ogni momento dove sono i soldi e come stanno andando, con numeri di cui ci si può fidare, e registrare i movimenti senza attrito dal telefono.

## Positioning

Non è un'app di budgeting generica: è costruita sui conti, i broker e le abitudini reali di una persona, e legge/scrive tutto in un Google Sheet di sua proprietà invece che in un database proprio. Unisce in una sola vista cose che le app commerciali tengono separate (patrimonio, investimenti per asset class, fondo pensione, consumi auto).

## Operating Context

- **Telefono, quotidiano:** barra in basso (Home, Transazioni, Patrimonio, Investimenti, Impostazioni), "+" della Home per aggiungere un dato manuale (Entrate, Uscite una tantum/ricorrenti, Trasferimenti, Investimenti, Consumi), form a tutto schermo; conferma dei movimenti arrivati dalla banca.
- **Computer, analisi:** Panoramica con andamenti e rendiconto, Entrate/Uscite con grafici e tabelle, Patrimonio per conto, Investimenti (Cruscotto, Rendimenti, Conti, Fondo pensione), Analisi consumi, Previsioni (solo computer: chiusura del mese, prossimi 12 mesi, crescita e proiezione del patrimonio).
- **Dati:** Google Sheet dell'utente come fonte definitiva, cache in `localStorage`; il salvataggio locale non spinge automaticamente sul foglio. Login Google via Firebase; il token Google dura circa un'ora.
- **Banca:** sincronizzazione movimenti via Enable Banking (UniCredit, Trade Republic), con un cron notturno e "Sincronizza ora"; i movimenti non riconosciuti dalle regole restano da confermare a mano.
- **Condivisione schermo:** la modalità incognito sostituisce tutta la dashboard con dati finti (`frontend/src/data/demoData.ts`).

## Capabilities and Constraints

- React 19 + TypeScript + Vite 6, Tailwind CSS 4, Recharts, Motion, lucide-react. Deploy su Vercel da `main`; backend Python (FastAPI) in `backend/`, servito da `api/index.py`.
- Lingua dell'interfaccia: solo italiano (`lang="it"`), cifre in euro con formato italiano.
- Terminologia in uso: Panoramica/Home, Entrate, Uscite, Trasferimenti, Patrimonio, Conti, Investimenti, Cruscotto, Rendimenti, Fondo pensione, Analisi consumi, Dati Base, Movimenti Banca, una tantum / ricorrente.
- La demo non deve mai poter scrivere sul foglio reale; l'incognito non legge né modifica i dati reali.
- Lavori decisi e non ancora fatti: `docs/PROSSIMI-AGGIORNAMENTI.md` (es. categorizzazione dei movimenti Trade Republic da Telegram).

## Brand Commitments

- Nome: **Wally**. Colore della scheda progetto: `#0d8a6f` (`docs/progetto.json`), descrizione: "App di finanza personale: entrate, spese e consumi sempre sotto controllo."
- Testi in italiano, diretti e concreti.

## Evidence on Hand

- Dati demo completi in `frontend/src/data/demoData.ts` (stessa forma dei dati reali), usati da incognito e dalla demo vetrina.
- Copertine e immagini del progetto in `docs/img/`, icona in `public/icon`.
- Nessun altro utente, testimonianza o metrica d'uso: non vanno inventati. Le cifre reali dell'utente non vanno mai mostrate fuori dall'app.

## Product Principles

1. **Cifre sempre esatte.** La precisione dei numeri viene prima di tutto: niente arrotondamenti, stime o visualizzazioni che possano far leggere un valore diverso da quello vero. Nel dubbio si mostra la cifra, non l'impressione. Unica eccezione, la pagina Previsioni: lì una stima non si presenta mai come una cifra esatta (arrotondata, sempre con la sua fascia, etichetta "stima", linea tratteggiata), e le cifre vere accanto restano esatte.
2. **Privacy in pubblico.** In ogni schermata nuova l'incognito deve poter nascondere tutti i dati reali; nessuna cifra vera può sfuggire durante una condivisione schermo o nella demo.
3. **Telefono per il giorno, computer per l'analisi.** Le azioni quotidiane vanno pensate prima per il telefono; le viste di analisi possono essere dense sul computer purché restino leggibili su telefono.
4. **Un solo utente, nessuna generalizzazione prematura.** Le scelte seguono i conti e le abitudini reali del proprietario; la demo mostra lo stesso prodotto con dati finti, non una versione diversa.
