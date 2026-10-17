---
target: Investimenti
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/federicogamberini/VS Code/Wally/src/pages/Investimenti.tsx"
target_fingerprint: "sha256:ed9dc153b359c66020bcc4b95be34da06b14943a310bf50bc112c96d4a994f3c"
target_path: /Users/federicogamberini/VS Code/Wally/src/pages/Investimenti.tsx
timestamp: 2026-10-17T11-02-31Z
slug: src-pages-investimenti-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + browser su tutte le pagine)

## Investimenti: 19/40

- [P0] Investito 17.090 / 16.200 / 19.220 €; Valutazione 15.370 vs portafoglio 19.460; '***' e '+***' per dati mancanti (CruscottoAssetClassTable.tsx:47-56) uguali all'incognito; ripiego 'SToxx 600' in Conti; Fondo pensione "versato" non confrontabile. → harden
- [P1] Colori: asset class blu/arancio/verde, Fondo pensione indaco/viola (#4f46e5, #8b5cf6 fuori palette), card smeraldo decorative, pill teal/ambra. → colorize
- [P1] Testo con kpiColor/rendColor puri (Rendimenti.tsx:362,378-379,635-645); −40 € arancio, +75 € giallo; linea cumulata rossa sui guadagni. → colorize, audit
- [P2] Rendimenti ripete il blocco del Cruscotto; inspector doppio; tante didascalie. → distill
- [P2] Tabelle: Conti 14 colonne (scorre anche a 1300px), Asset Class 8 e Fondo 7 su telefono; etichette troncate; Saveback a zero in sei righe. → adapt
Contrasto: bianco su sky-600 4,0:1 (linguette, toggle). Linguette senza role=tab. Percentuali col punto, assi "€20k". h1→h3.

Temi comuni (rapporto del 17/10/2026): cifre inventate o non riconciliate, mappa dei colori, telefono (tabelle che scorrono, grafici non toccabili), contrasto e etichette dei campi, formati (assi, decimali), salti di titolo h1→h3.
