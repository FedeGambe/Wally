# Wally

Dashboard di finanza personale (single-user), tutta in italiano. Nessun database proprio: i dati stanno in un **Google Sheet** di proprietà dell'utente.

- **Frontend**: React 19 + TypeScript + Vite 6, Tailwind CSS 4, grafici con Recharts, animazioni con Motion, login Google via Firebase.
- **Backend**: Python 3 + FastAPI in [`backend/`](./backend), servito da Vercel come unica funzione (`api/index.py`). Legge e scrive i fogli Google con il token dell'utente (rotte `/api/fogli/*`) e fa la sincronizzazione bancaria (`/api/banca/*`). Il frontend non parla più direttamente con Google Sheets.

## Struttura

```
frontend/   app React (TypeScript + Vite)
backend/    backend Python (FastAPI): routes/, services/, domain/, models/, security/, tests/
api/        index.py, l'unica funzione Vercel, che serve il backend
docs/       documentazione
```

Dettagli file per file in [docs/STRUTTURA-PROGETTO.md](./docs/STRUTTURA-PROGETTO.md).

## Avvio rapido

```bash
npm install      # installa anche le dipendenze di frontend/
npm run dev      # frontend (http://localhost:3000) + backend Python (porta 8000)
```

Serve un file `.env.local` (non committato) con le variabili Firebase — copia `.env.example` e compila i valori presi da Firebase Console > Project Settings > General > Your apps > SDK config.

## Script disponibili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | frontend (porta 3000) e backend Python (porta 8000) insieme; Ctrl+C li ferma tutti e due. Senza backend l'app non legge i dati |
| `npm run dev:frontend` | solo il frontend |
| `npm run build` | build di produzione |
| `npm run preview` | serve la build di produzione in locale |
| `npm run lint` | controllo tipi TypeScript (`tsc --noEmit`) |
| `npm test` | test del frontend (Vitest) |
| `npm run api` | solo il backend Python (porta 8000); il frontend gli inoltra le chiamate `/api/*`. Serve [uv](https://docs.astral.sh/uv/), che installa da solo le dipendenze di `requirements-dev.txt` |
| `npm run test:py` | test del backend (pytest, cartella `backend/tests/`) |

## Documentazione

La cartella [`docs/`](./docs/README.md) spiega architettura, struttura del progetto e i concetti base di React/TSX/TypeScript usati qui, pensata per chi non conosce bene questi strumenti:

- [docs/GUIDA-REACT-TS.md](./docs/GUIDA-REACT-TS.md) — concetti React/TSX/TS con esempi dal codice reale
- [docs/ARCHITETTURA.md](./docs/ARCHITETTURA.md) — come si muovono i dati (Google Sheet ↔ localStorage ↔ React)
- [docs/STRUTTURA-PROGETTO.md](./docs/STRUTTURA-PROGETTO.md) — mappa file per file

Dettagli operativi aggiuntivi (convenzioni, gotcha noti) sono in [`CLAUDE.md`](./CLAUDE.md).

## Deploy

Target: **Vercel**, deploy automatico da `main`. Le variabili `VITE_FIREBASE_*` vanno impostate come Environment Variables del progetto Vercel (equivalenti a quelle di `.env.local` in locale). Vercel installa le dipendenze Python da `requirements.txt` e costruisce il frontend da `frontend/` (vedi `vercel.json`, che manda anche ogni `/api/...` a `api/index.py`).
