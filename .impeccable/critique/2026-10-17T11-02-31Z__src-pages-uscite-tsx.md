---
target: Uscite
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/federicogamberini/VS Code/Wally/src/pages/Uscite.tsx"
target_fingerprint: "sha256:ab2ac1e9f3352dfc440af8328445491839e67e9276dc697ffee846c0175de62c"
target_path: /Users/federicogamberini/VS Code/Wally/src/pages/Uscite.tsx
timestamp: 2026-10-17T11-02-31Z
slug: src-pages-uscite-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + browser su tutte le pagine)

## Uscite: 22/40

- [P0] Totale inventato 1.100,00 € se manca il mese nel foglio (useUsciteData.ts:309); totale dal foglio vs lista dai movimenti senza avviso. → harden
- [P1] Tabella a 7 colonne su telefono: a 390px non si vede l'importo; grafico e torte non toccabili ma "Clicca sul grafico". → adapt
- [P1] Colori: selezioni e focus teal, form ricorrente ambra, torta con blu/verde/rosa/rosso. → colorize
- [P2] Filtri sparsi (card KPI, torte, tendina tipologia con 35%/15% fissi), "Vedi Transazioni" ripete la tabella. → distill
- [P2] Secondaria selezionata bianco su orange-400 ~2,2:1; pulsante disabilitato senza motivo; macro di default "Automobile". → harden
Contrasto: scritte sul pulsante Spese Totali 3,5–4,2:1. Bagliore arancio. h1→h3.

Temi comuni (rapporto del 17/10/2026): cifre inventate o non riconciliate, mappa dei colori, telefono (tabelle che scorrono, grafici non toccabili), contrasto e etichette dei campi, formati (assi, decimali), salti di titolo h1→h3.
