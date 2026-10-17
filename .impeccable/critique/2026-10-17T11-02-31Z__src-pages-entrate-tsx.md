---
target: Entrate
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/federicogamberini/VS Code/Wally/src/pages/Entrate.tsx"
target_fingerprint: "sha256:fb1774a3a4a3f8b217b6d7197e7d7c5638d72044c90bfcb5a7d45eca904f0fb9"
target_path: /Users/federicogamberini/VS Code/Wally/src/pages/Entrate.tsx
timestamp: 2026-10-17T11-02-31Z
slug: src-pages-entrate-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + browser su tutte le pagine)

## Entrate: 21/40

- [P0] Il dettaglio inventa le date dei movimenti senza data (useEntrateData.ts handlePointClick: '01/06' o '01/05'); il form salva data ''. → harden
- [P1] Trend: asse tagliato a 1.800 con area piena (esagera); mese selezionato evidenziato su più anni; "Clicca" su telefono dove il grafico non si tocca; asse "€2.100". → harden, layout
- [P1] Due ciambelle al 100% su telefono; palette con blu Panoramica e indaco. → distill, colorize
- [P2] Form: mese di default = oggi, non il mese visto; categoria di default = prima della lista; chip +5..+50 tarati sulle spese; etichette non collegate. → adapt, clarify
- [P2] Testi: "Canali di Accredito", "Media stimata", "Anno Corrente" sugli anni passati, delta 0,0% verde, emoji 💼/💵. → clarify
Contrasto: "↑ 0,0%" 2,4:1, "Totale flussi…" 3,6:1, titolo card 4,2:1 sulla card verde. h1→h3.

Temi comuni (rapporto del 17/10/2026): cifre inventate o non riconciliate, mappa dei colori, telefono (tabelle che scorrono, grafici non toccabili), contrasto e etichette dei campi, formati (assi, decimali), salti di titolo h1→h3.
