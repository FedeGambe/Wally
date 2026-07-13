# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Wally** — a personal-finance dashboard (single-user) that reads and writes all its data from a user-owned **Google Sheet**. React 19 + TypeScript + Vite 6, styled with Tailwind CSS 4, charts via Recharts, animations via Motion, auth via Firebase (Google Sign-In). Originally scaffolded from Google AI Studio. The entire UI is in **Italian** — keep it that way (labels, toasts, comments are Italian).

## Commands

- `npm run dev` — Vite dev server on port 3000 (`--host=0.0.0.0`)
- `npm run build` — production build
- `npm run preview` — serve the production build
- `npm run lint` — **this is the typecheck** (`tsc --noEmit`), the only automated verification in the repo. Run it after any change.

There is **no test framework**. "Verifying" a change means `npm run lint`, then `npm run build`, then driving the running app.

## Data architecture (the core concept)

There is no backend or database. Data lives in **three layers** and flows Google Sheet ↔ `localStorage` ↔ React state:

1. **`src/lib/sheetsService.tsx`** — talks to the Google Sheets API. `fetchSpreadsheetData` (pull) and `pushSpreadsheetData` (push). Contains the most delicate logic in the codebase: `parseLocalizedNumber` (handles both Italian `1.234,56` and US `1,234.56`) and `parseDateString`. Bugs here corrupt financial figures silently — treat with care.
2. **`src/data/mockData.ts`** — the local cache + in-memory state. Exports arrays (`TRANSACTIONS`, `RISPARMIO_DATA`, `CONTI_PATRIMONIO`, etc.) hydrated once from `localStorage` at module load. **`saveToLocalStorage(data)` is the single write path** — it persists to `localStorage` AND mutates the in-memory arrays in place (`arr.length = 0; arr.push(...)`). No page should write finance data to `localStorage` directly.
3. **`src/context/FinanceDataContext.tsx`** — the single **read** path for the UI. `FinanceDataProvider` owns incognito state, refresh/sync state, and a `refreshVersion` counter; it computes `data = useMemo(() => getExportableData(isIncognito), [isIncognito, refreshVersion])`. Pages call `useFinanceData()` — they must **not** import the raw `mockData` arrays for display (only import *types* like `Transaction`, `ContoPatrimonio`). After any `saveToLocalStorage`, call `bumpVersion()` so the dashboard re-reads.

`getExportableData(incognito = false)` assembles the one shaped object every consumer reads. The `incognito` default is `false` **on purpose**: `SheetsModal.tsx` calls `getExportableData()` with no args when pushing to the real sheet, so demo data can never be pushed. Do not change this default or make it auto-detect the incognito flag.

### Config-driven sheet mapping

`src/config/sheetsConfig.tsx` (`SHEETS_CONFIG`) is the source of truth mapping each sheet tab → field names, headers, and number/boolean columns. `fetchSpreadsheetData` and `pushSpreadsheetData` **iterate this config dynamically** — to add or change a sheet mapping, edit `SHEETS_CONFIG`, not the service functions. The "Scalable" and "Trade Republic" broker tabs additionally get their columns detected at runtime from rows 1–2 (asset-class keywords like `azioni`/`obbligazioni`/`monetari`). `src/utils/cruscottoInvestimenti.ts` derives the aggregated investment dashboard (`computeCruscottoData`, `computeRealAssetAllocation`) from those broker tabs.

## Incognito mode

A header toggle (`toggleIncognito` from the context) swaps the entire dashboard to **fully fictional** data from `src/data/demoData.ts` (persisted flag `sf_incognito_mode`). Purpose: hide real finances during screen-sharing. `demoData.ts` mirrors the real data shapes — when you add a field to a real data type, add it to the demo data too. The real data must never appear while incognito is on, and demo data must never reach Google Sheets.

## Conventions & gotchas

- **localStorage keys are all prefixed `sf_`** (`sf_transactions`, `sf_spreadsheet_id`, `sf_theme`, `sf_incognito_mode`, `sf_device_remembered_*`, …).
- **UI-filter state** (`selectedYear`, `selectedMonth`, `theme`, sidebar collapse, active view) lives in `App.tsx` and is passed as props — it is deliberately *not* in `FinanceDataContext`, which holds only finance data + sync state.
- **Firebase config comes from `VITE_FIREBASE_*` env vars** (see `src/lib/googleAuth.ts`, typed in `src/vite-env.d.ts`). Locally use `.env.local` (gitignored); on Vercel set them as Environment Variables. `firebase-applet-config.json` is a placeholder-only leftover and is no longer read.
- **Google OAuth access tokens expire after ~1h**; `googleAuth.ts` treats them as valid within a 50-minute window and forces re-login otherwise.
- A recurring class of bug: pages reading a **wrong/stale key** off the data object and silently falling back to hardcoded values (e.g. `contiPatrimonio` vs the real key `patrimonio`). When wiring a page to `useFinanceData()`, confirm the key names against what `getExportableData` actually returns.
- Deployment target is **Vercel** (auto-deploy from GitHub `main`). Vercel blocks deploys when the commit-author email isn't a verified email on the pushing GitHub account.
- `@google/genai`, `express`, and `GEMINI_API_KEY`/`APP_URL` are unused AI Studio scaffolding — no Gemini/AI code exists in the app.
