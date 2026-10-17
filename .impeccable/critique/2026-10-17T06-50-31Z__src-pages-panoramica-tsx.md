---
target: Home (Panoramica)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/federicogamberini/VS Code/Wally/src/pages/Panoramica.tsx"
target_fingerprint: "sha256:2e937b9e7ff041819168d2d0baefd7771f54418ad46aee8c3d73ecf42e279df8"
target_path: /Users/federicogamberini/VS Code/Wally/src/pages/Panoramica.tsx
timestamp: 2026-10-17T06-50-31Z
slug: src-pages-panoramica-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + browser)

## Punteggio: 23/40 (Accettabile)
| # | Euristica | Punti | Problema chiave |
|---|---|---|---|
| 1 | Stato del sistema | 2 | Etichette "corrente" fisse su computer; nessuna ora di aggiornamento |
| 2 | Mondo reale | 3 | "Capitale Totale" esclude l'accantonato; "18.0" col punto |
| 3 | Controllo | 3 | Grafico non toccabile su telefono |
| 4 | Coerenza | 1 | Spesa del mese con tre valori; colori a soglia contro colori del segno |
| 5 | Prevenzione errori | 3 | "Ignora" banca senza annulla accanto al tocco della riga |
| 6 | Riconoscimento | 3 | Soglia target senza esito |
| 7 | Efficienza | 2 | Niente mese prec./succ. nel dettaglio |
| 8 | Essenzialità | 2 | Mese ripetuto 3 volte su computer; pallini pulsanti |
| 9 | Recupero errori | 2 | "errore sconosciuto", "***%" |
| 10 | Aiuto | 2 | Quota Invest.+Risp. e colori a soglia non spiegati |

## Specificità
Telefono su misura; computer da modello generico. Rilevatore: CLI pulito (2 colori torta non in DESIGN.md), overlay 29 (19 testo <12px, 5 contrasto, 4 pallini pulsanti, 2 card annidate, 1 padding, 1 dark-glow falso positivo, 1 Inter falso positivo, 1 titolo saltato).

## Problemi prioritari
- [P1] Spesa del mese con tre valori (590 / 860 / Sankey 357,70; Risparmiato 1.742,30 vs Risparmio Netto 920) → clarify, harden
- [P1] Colori a soglia contro Segno Semantico: Investito rosso, spese verdi → colorize
- [P1] Computer senza punto focale, mese ripetuto 3 volte, "Disponibilità Netta" senza cifra → distill, layout
- [P2] Contrasto rosso a soglia su scuro 2,9–4,0:1 (PanoramicaBilancioStorico.tsx:166) → colorize
- [P2] Etichette "corrente" fisse e nessuna ora di aggiornamento → clarify

## Persone
Casey: 6 righe sotto la cifra, soglia senza esito, X Ignora ~28px senza annulla, "+" copre cifre.
Sam: rosso su blu notte, 10px, stato solo a colore, pallini senza reduced-motion, torta senza valori, grafico non toccabile.
Alex: niente mese successivo nel dettaglio, cifre in conflitto, tabella che scorre a 1300px, 6 "Analizza".

## Minori
Trattino nel titolo del dettaglio; "risp.+inv."; "Capitale Investito" ambiguo; "filone"; font/formati cifre misti; "€1.000"; h1→h3; icone in filigrana; emoji 💸.

## Domande
1. Home da computer = Home da telefono più larga?
2. Una frase "obiettivo raggiunto/mancato" al posto della scala a soglia?
3. Mostrare la differenza tra movimenti registrati e foglio come informazione?
