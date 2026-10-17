---
target: Impostazioni
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/federicogamberini/VS Code/Wally/src/pages/Impostazioni.tsx"
target_fingerprint: "sha256:02f2747864a1379ea75d13fa3378bf83beb2e461b57d66d5c5ed1257593644be"
target_path: /Users/federicogamberini/VS Code/Wally/src/pages/Impostazioni.tsx
timestamp: 2026-10-17T11-02-31Z
slug: src-pages-impostazioni-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + browser su tutte le pagine)

## Impostazioni: 22/40

(revisione solo dal codice: pagina non nella demo, richiede login)
- [P1] Colori: smeraldo, blu, arancio, rosa, up/down come decorazione, tendine indaco invece di teal; SheetsModal verde e slate. → colorize
- [P1] Pulsanti principali teal con testo bianco 3,2:1 (chiaro) e 2,5:1 (scuro): Salva, Aggiungi, Collega, Rinnova; "ID salvato" emerald-500 2,5:1. → audit, colorize
- [P1] "Ripristina valori di default" accanto a "Importa" con lo stesso stile, window.confirm, sovrascrive anche le soglie; eliminazioni di conti/categorie usati dai preset senza avviso; nessun Annulla. → harden
- [P2] Etichette dei campi non collegate (Campo senza htmlFor), salvataggi solo icona senza nome, SheetsModal senza role=dialog/Esc/focus. → harden
- [P2] Bersagli < 36px su telefono (28–32px; ✕ chip 20px). → adapt
Altro: "Spreadsheet ID", "Glassmorphic", "Wally Engine v2"; "esporta i dati di esempio" falso; Banche collegate vuota in incognito; ID dei fogli visibili in incognito (da verificare).

Temi comuni (rapporto del 17/10/2026): cifre inventate o non riconciliate, mappa dei colori, telefono (tabelle che scorrono, grafici non toccabili), contrasto e etichette dei campi, formati (assi, decimali), salti di titolo h1→h3.
