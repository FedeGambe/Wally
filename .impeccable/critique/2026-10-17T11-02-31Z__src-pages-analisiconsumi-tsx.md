---
target: AnalisiConsumi
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/federicogamberini/VS Code/Wally/src/pages/AnalisiConsumi.tsx"
target_fingerprint: "sha256:2d61c9a40c1b90dfdee99f53e957480e7ed49eab47758207e64572e47ba8636a"
target_path: /Users/federicogamberini/VS Code/Wally/src/pages/AnalisiConsumi.tsx
timestamp: 2026-10-17T11-02-31Z
slug: src-pages-analisiconsumi-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + browser su tutte le pagine)

## Analisi consumi: 20/40

- [P0] Tre riferimenti: badge "Buona" sulla mediana ma colorato da efficienza; Km persi e Costo extra sulla settimana migliore; nota "tutto sulla mediana"; sottotitoli "media consigliata". → clarify
- [P1] Numeri non esatti o non italiani: €/Km con assi duplicati (€0,02, €0,02…), decimali col punto, assi "€10,4". → harden
- [P1] Colori: cifra km blu (Panoramica), grafici arancio (Uscite) e ambra (warn), rosa = sezione e perdita. → colorize
- [P1] Testo soglia con kpiTextColor + brightness invece di kpiColorTesto; badge "Buona" bianco su lime 3,6:1; delta a 10px. → audit
- [P2] Sei grafici uguali, sette toggle, nessun segno sulla settimana scelta; selettori Anno/Mese senza effetto. → layout, distill
Bagliori rosa sui toggle (ConsumiChartHelpers.tsx:47). "Incurrenza", "💡 Analisi per Federico" anche nella demo. h1→h3.

Temi comuni (rapporto del 17/10/2026): cifre inventate o non riconciliate, mappa dei colori, telefono (tabelle che scorrono, grafici non toccabili), contrasto e etichette dei campi, formati (assi, decimali), salti di titolo h1→h3.
