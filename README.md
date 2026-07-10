# StarFinance

Dashboard di finanza personale (single-user), tutta in italiano. Nessun backend/database proprio: legge e scrive i dati direttamente su un **Google Sheet** di proprietà dell'utente.

React 19 + TypeScript + Vite 6, Tailwind CSS 4, grafici con Recharts, animazioni con Motion, login Google via Firebase.

## Avvio rapido

```bash
npm install
npm run dev      # http://localhost:3000
```

Serve un file `.env.local` (non committato) con le variabili Firebase — copia `.env.example` e compila i valori presi da Firebase Console > Project Settings > General > Your apps > SDK config.

## Script disponibili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo (porta 3000) |
| `npm run build` | build di produzione |
| `npm run preview` | serve la build di produzione in locale |
| `npm run lint` | controllo tipi TypeScript (`tsc --noEmit`) — non c'è una suite di test, questo è l'unico controllo automatico |

## Documentazione

La cartella [`docs/`](./docs/README.md) spiega architettura, struttura del progetto e i concetti base di React/TSX/TypeScript usati qui, pensata per chi non conosce bene questi strumenti:

- [docs/GUIDA-REACT-TS.md](./docs/GUIDA-REACT-TS.md) — concetti React/TSX/TS con esempi dal codice reale
- [docs/ARCHITETTURA.md](./docs/ARCHITETTURA.md) — come si muovono i dati (Google Sheet ↔ localStorage ↔ React)
- [docs/STRUTTURA-PROGETTO.md](./docs/STRUTTURA-PROGETTO.md) — mappa file per file

Dettagli operativi aggiuntivi (convenzioni, gotcha noti) sono in [`CLAUDE.md`](./CLAUDE.md).

## Deploy

Target: **Vercel**, deploy automatico da `main`. Le variabili `VITE_FIREBASE_*` vanno impostate come Environment Variables del progetto Vercel (equivalenti a quelle di `.env.local` in locale).
