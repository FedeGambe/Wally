---
target: Patrimonio
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/federicogamberini/VS Code/Wally/src/pages/Patrimonio.tsx"
target_fingerprint: "sha256:5079bba7fbac14a37ff5370fbeb7a8133ddf1785b5bde9920c2eaae52af440af"
target_path: /Users/federicogamberini/VS Code/Wally/src/pages/Patrimonio.tsx
timestamp: 2026-10-17T11-02-31Z
slug: src-pages-patrimonio-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + browser su tutte le pagine)

## Patrimonio: 18/40

- [P0] Grafico a due assi: Investito (asse destro) passa sopra il Netto pur essendo minore. → clarify, colorize
- [P1] "Capitale Totale" = tre cose (35.500 card, saldo con vincolato per conto, 38.500 ciambella); Home ora dice "Totale libero". → clarify
- [P1] "Sotto Soglia" verde o ambra a seconda del caso; soglia 5.000 € fissa nel codice; classi rose/amber/emerald invece dei token. → clarify, harden
- [P2] Nessun giallo di Patrimonio; palette accantonati parte dal rosso; divisori quasi bianchi in scuro. → colorize, polish
- [P2] Su telefono: legende troncate, riquadri che scorrono dentro la pagina, pannello espanso che ripete i dati. → adapt, distill
Contrasto: "Inv:" sky-600 4,4:1 su ogni mese. Pallini pulsanti (Patrimonio.tsx:66,81,96,111; ContoCard 92,189). 17 card annidate. h1→h3.

Temi comuni (rapporto del 17/10/2026): cifre inventate o non riconciliate, mappa dei colori, telefono (tabelle che scorrono, grafici non toccabili), contrasto e etichette dei campi, formati (assi, decimali), salti di titolo h1→h3.
