# StarFinance

Dashboard finanza personale (single-user), legge e scrive dati da un **Google Sheet** di proprietà dell'utente. React 19 + TypeScript + Vite 6, Tailwind CSS 4, grafici Recharts, animazioni Motion, login Google via Firebase.

Nessun backend, nessun database: i dati vivono in tre livelli (Google Sheet ↔ `localStorage` ↔ stato React), vedi `CLAUDE.md` per i dettagli architetturali.

## Requisiti

- Node.js
- Un progetto Firebase con Google Sign-In abilitato
- Un Google Sheet personale con i tab attesi da `src/config/sheetsConfig.tsx`

## Setup locale

1. Installa le dipendenze:
   ```
   npm install
   ```
2. Copia `.env.example` in `.env.local` e valorizza le chiavi Firebase (`VITE_FIREBASE_*`), prese da Firebase Console > Project Settings > General > SDK config.
3. Avvia l'app:
   ```
   npm run dev
   ```
   Disponibile su `http://localhost:3000`.

## Script

- `npm run dev` — dev server Vite (porta 3000)
- `npm run build` — build di produzione
- `npm run preview` — serve la build di produzione
- `npm run lint` — typecheck (`tsc --noEmit`), unica verifica automatica del repo

Non c'è una suite di test. Verificare una modifica significa: `npm run lint`, poi `npm run build`, poi provare l'app avviata.

## Pagine

Panoramica, Entrate, Uscite, Analisi Consumi, Patrimonio, Investimenti, Impostazioni, Login.

## Deploy

Target: Vercel, auto-deploy dal branch `main` su GitHub. Le variabili `VITE_FIREBASE_*` vanno impostate anche su Vercel (Project Settings > Environment Variables).
