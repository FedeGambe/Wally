---
name: Wally
description: Dashboard di finanza personale in cui ogni sezione ha il suo colore, su vetro scuro.
colors:
  sezione-panoramica: "#2563eb"
  sezione-entrate: "#059669"
  sezione-uscite: "#ea580c"
  sezione-patrimonio: "#facc15"
  sezione-investimenti: "#0ea5e9"
  sezione-consumi: "#e11d48"
  accent: "#00A19A"
  accent-dark: "#15B4B7"
  up: "#089B3C"
  up-dark: "#34d399"
  down: "#e11d48"
  down-dark: "#fb7185"
  warn: "#d97706"
  warn-dark: "#fbbf24"
  info: "#0284c7"
  info-dark: "#38bdf8"
  dato-risparmio: "#d946ef"
  dato-spese-secondarie: "#fb923c"
  ink: "#1D1D1B"
  ink-soft: "#6E6E6C"
  canvas: "#F7F7F6"
  hairline: "#E7E7E5"
  notte: "#060a13"
  notte-pannello: "#0b0f19"
  vetro-popup: "#0f172a"
  testo-notte: "#f8fafc"
  testo-notte-soft: "#cbd5e1"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1
  headline:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  body-small:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.05em"
  label-micro:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 800
    letterSpacing: "0.05em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary-uscite:
    backgroundColor: "#c2410c"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-icon-close:
    textColor: "{colors.down}"
    rounded: "{rounded.xl}"
    size: "36px"
  input-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  kpi-card:
    rounded: "{rounded.3xl}"
    padding: "24px"
    height: "160px"
  nav-item-active-entrate:
    backgroundColor: "{colors.sezione-entrate}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  nav-item-active-patrimonio:
    backgroundColor: "{colors.sezione-patrimonio}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  pallino-nav:
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    size: "56px"
  chip-delta:
    typography: "{typography.mono}"
    rounded: "{rounded.lg}"
    padding: "2px 6px"
---

# Design System: Wally

## Overview

**Creative North Star: "La Mappa a Colori"**

Wally si legge come una mappa: ogni sezione è un territorio con il suo colore, e ci si orienta prima col colore che con le parole. Panoramica è blu, Entrate verde, Uscite arancio, Patrimonio giallo, Investimenti azzurro, Analisi consumi rosa, Impostazioni teal. Quel colore torna nella voce attiva della barra laterale, nei pallini della barra in basso su telefono, nel pulsante di conferma del form, nell'anello di focus dei campi e nelle card KPI della sezione. Chi sta registrando un'uscita vede arancio dappertutto e sa dove si trova senza leggere il titolo.

Il tema di riferimento è quello **scuro "vetro"**: un fondo notte quasi nero con grandi macchie di colore sfocate che respirano lentamente dietro l'interfaccia, e sopra pannelli traslucidi con sfocatura dello sfondo e bordi di luce sottilissimi. Il tema chiaro (carta grigio-calda, testo quasi nero) deve funzionare ma è secondario. Il carattere è morbido e colorato: angoli molto arrotondati, riquadri tinti, pulsanti pieni. La densità di dati è alta, perché le cifre sono il prodotto: l'atmosfera sta dietro, le cifre stanno davanti e sono sempre esatte.

**Key Characteristics:**
- Un colore per sezione, usato con coerenza in navigazione, azioni, focus e card.
- Tema scuro vetro come riferimento: fondo notte, macchie sfocate, pannelli traslucidi.
- Angoli generosi (12–24px) e forme piene, mai spigoli vivi.
- Cifre in Space Grotesk molto nero, centesimi più piccoli ma sempre presenti.
- Etichette maiuscole minuscole e spaziate sopra ogni valore.

## Colors

Una tavolozza a mappa: sei colori di sezione saturi più un teal di marca, tre colori semantici per il segno dei numeri e neutri caldi in chiaro, notte blu-nera in scuro.

### Primary
- **Blu Panoramica** (sezione-panoramica): voce attiva e accenti della Home/Panoramica.
- **Verde Entrate** (sezione-entrate): voce attiva, pallino e focus dei form Entrate.
- **Arancio Uscite** (sezione-uscite): voce attiva e pallino Uscite; il pulsante di conferma del form usa il tono più scuro `orange-700` per il contrasto col testo bianco.
- **Giallo Patrimonio** (sezione-patrimonio): voce attiva di Patrimonio, l'unica con testo scuro (ink) invece che bianco.
- **Azzurro Investimenti** (sezione-investimenti): tutti i pallini e gli accenti di Cruscotto, Rendimenti, Conti, Fondo pensione.
- **Rosa Consumi** (sezione-consumi): Analisi consumi e i suoi form.

### Secondary
- **Teal Wally** (accent / accent-dark): il colore del logo. Impostazioni, azioni di marca e CTA non legate a una sezione. In scuro si schiarisce.

### Tertiary
- **Verde Crescita** (up / up-dark): entrate, crescita, esito positivo.
- **Rosa Perdita** (down / down-dark): uscite, perdita, errore, pulsante di chiusura dei popup.
- **Ambra Soglia** (warn / warn-dark): avvisi e soglie superate.
- **Azzurro Informativo** (info / info-dark): stati informativi secondari.

Questi quattro sono variabili CSS (`--color-up`, ecc.) che cambiano da sole col tema: si scrive `text-up`, mai `text-up dark:text-...`.

### Colori dei dati
- **Fucsia Risparmio** (dato-risparmio): la serie Risparmio nei grafici (Trend Risparmio, torta del Dettaglio Finanziario).
- **Arancio Chiaro Secondarie** (dato-spese-secondarie): lo spicchio Spese Secondarie nella torta, accanto all'arancio scuro delle primarie (`orange-700`).
- **Scala a soglia** (`src/utils/kpiColorScale.ts`): rosso → arancio → ambra → lime (la soglia) → smeraldo, interpolata sul valore. Dice quanto una quota è lontana dal suo target, non il segno.

### Neutral
- **Inchiostro** (ink): testo principale in chiaro.
- **Inchiostro Tenue** (ink-soft): etichette e testo secondario in chiaro.
- **Carta Calda** (canvas): fondo pagina in chiaro e fondo dei campi.
- **Filo** (hairline): bordi e divisori in chiaro.
- **Notte** (notte): fondo dell'app nel tema scuro, dietro le macchie di colore.
- **Notte Pannello** (notte-pannello): intestazione dei popup e pannelli opachi in scuro.
- **Vetro Popup** (vetro-popup): base dei popup in scuro, al 90% di opacità con sfocatura.
- **Testo Notte** (testo-notte / testo-notte-soft): titoli e testo secondario sul vetro.

### Named Rules
**The Un Colore per Territorio Rule.** Ogni sezione ha un solo colore e lo usa ovunque al suo interno (navigazione, pulsante principale, focus, KPI). Un elemento nuovo in una sezione prende il colore della sezione, non uno nuovo.

**The Segno Semantico Rule.** Il segno di un numero (positivo, negativo, soglia) si mostra solo con up / down / warn, mai col colore di sezione: il verde di Entrate e il verde Crescita sono due ruoli diversi anche se vicini.

**The Fuori Soglia Rosso Rule.** Fuori soglia è rosso per ogni voce, anche per Investito e Risparmio: la scala a soglia dice quanto si è lontani dal target, e lontano è rosso.

**The Testo a Soglia Leggibile Rule.** Il testo colorato con la scala a soglia passa da `kpiColorTesto`, che lo scurisce in chiaro e lo schiarisce in scuro (`--kpi-testo-mix`) sopra 4,5:1; `kpiColor` puro solo per fondi, bordi e grafici.

## Typography

**Display Font:** Space Grotesk (con sans-serif)
**Body Font:** Inter (con ui-sans-serif, system-ui)
**Label/Mono Font:** JetBrains Mono (con ui-monospace)

**Character:** Space Grotesk, geometrico e un po' tecnico, porta le cifre e i titoli; Inter tiene tutto il resto leggibile anche a 10–11px; JetBrains Mono compare nei piccoli dati tabellari (mesi, percentuali nei badge).

### Hierarchy
- **Display** (900, 1.5rem, line-height 1): le cifre principali delle card KPI, sempre tramite `EuroAmount`, che rimpicciolisce virgola, centesimi e "€" a 0.6em senza toglierli. Le cifre più grandi (fino a 3–5xl) sono riservate agli importi eroe.
- **Headline** (700, 1rem): titoli dei popup e delle card.
- **Body** (400–500, 0.875rem): testo dei form, voci di navigazione, tabelle.
- **Body Small** (500–700, 0.75rem): il testo più usato in assoluto: dettagli, righe secondarie, legende.
- **Label** (700, 0.6875rem, 0.05em, maiuscolo): etichette dei campi e intestazioni dei gruppi.
- **Label Micro** (800, 0.625rem, 0.05em, maiuscolo): titoli delle card KPI su telefono, badge, voci della barra in basso.

### Named Rules
**The Due Soli Micro Rule.** Sotto i 12px esistono solo `text-2xs` (11px) e `text-3xs` (10px). Nessuna taglia arbitraria `text-[9px]`.

**The Centesimi Sempre Rule.** Gli importi in euro mostrano sempre i centesimi; per risparmiare spazio si rimpiccioliscono, non si tolgono.

## Layout

Su computer: barra laterale fissa (larga, o ridotta a 80px di sole icone) più intestazione in alto con anno e mese, contenuto a griglie di card. Su telefono (sotto 768px): niente barra laterale, barra in basso con cinque voci (Home, Transazioni, Patrimonio, Investimenti, Impostazioni) e un "+" sulla Home; i popup di aggiunta diventano a tutto schermo. Le card KPI passano da 160px di altezza con padding 24px a 96px con padding 16px. Ritmo di spaziatura su multipli di 4px, con 12/16/20/24px come passi più usati. Su telefono ogni pulsante di pagina e di intestazione ha un'area minima di 36×36px, e i campi dei form salgono a 16px di testo per evitare lo zoom di Safari iOS.

## Elevation & Depth

Nel tema scuro la profondità viene dal vetro, non dalle ombre: macchie di colore sfocate (blur 100–140px, opacità 10–20%, pulsazione lenta 8–14s) sul fondo notte, pannelli traslucidi al 4% di bianco con sfocatura 24px e bordo all'8%, e un'ombra lunga e morbida che li stacca. I popup sono più opachi (90%) e più sfocati (30px). Nel tema chiaro i pannelli sono bianchi su carta calda con ombre piccole (`shadow-xs` / `shadow-sm`), e l'ombra cresce solo al passaggio.

### Shadow Vocabulary
- **Pannello vetro** (`box-shadow: 0 10px 40px -10px rgba(0,0,0,0.65)`): card e pannelli in scuro, a riposo.
- **Bagliore al passaggio** (`box-shadow: 0 12px 45px -8px rgba(99,102,241,0.2)`): stesse card al passaggio del puntatore.
- **Bagliore di sezione** (`box-shadow: 0 4px 15px rgba(<colore sezione>,0.3)`): voci attive e pulsanti pieni colorati in scuro, con sfumatura a 135° del colore di sezione al 75%.
- **Pallino attivo** (`box-shadow: 0 0 0 4px #fff, 0 4px 15px rgba(0,0,0,0.35)`): anello bianco sul pallino della pagina aperta nella barra in basso.

### Named Rules
**The Atmosfera Dietro Rule.** Il colore sfocato vive solo sullo sfondo; sopra le cifre il vetro resta neutro e leggibile.

## Shapes

Forme morbide e piene. Card principali e popup a 24px, card interne e pannelli a 16px, pulsanti, campi e voci di navigazione a 12px, chip e badge a 8px, pallini e avatar tondi. I bordi sono fili da 1px (hairline in chiaro, bianco 6–12% in scuro); il bordo tratteggiato indica un'azione secondaria come "Aggiorna Google Sheets".

## Components

### Buttons
- **Shape:** angoli morbidi (12px).
- **Primary:** pieno nel colore della sezione (es. Uscite `orange-700`, testo bianco, grassetto 14px, padding 12px, largo quanto il form); più scuro al passaggio; al 50% di opacità quando disabilitato.
- **Icona:** quadrati da 36px a 12px di raggio: indietro su fondo carta, chiudi su fondo `down` al 15% con icona rosa.
- **Secondario tratteggiato:** fondo carta al 50%, bordo tratteggiato, testo tenue.

### Chips
- **Style:** badge delta su fondo `up`/`down` al 15%, bordo dello stesso colore al 30%, testo mono nero, 8px di raggio.
- **State:** i filtri a segmenti (Mensile/Cumulato) evidenziano la voce scelta col colore della sezione.

### Cards / Containers
- **Corner Style:** 24px per le KPI e i widget principali, 16px per quelli annidati.
- **Background:** tinta della sezione in chiaro (`*-200` al 70%) e in scuro (`*-950` al 65%); vetro neutro per i widget generici.
- **Shadow Strategy:** vedi Elevation & Depth; al passaggio ombra più grande e ingrandimento dell'1%.
- **Border:** filo da 1px nella tinta della sezione.
- **Internal Padding:** 16px su telefono, 24px su computer.

### Inputs / Fields
- **Style:** fondo carta (bianco 5% in scuro), senza bordo, 12px di raggio, padding 10×12px, frecce dei numeri nascoste.
- **Focus:** anello da 2px nel colore della sezione del form.
- **Label:** sopra il campo, 11px maiuscolo spaziato in inchiostro tenue.

### Navigation
- **Barra laterale (computer):** voci a 12px di raggio, 14px medium; la voce attiva è piena nel colore della sezione con un puntino pulsante; le altre in inchiostro tenue e si scuriscono al passaggio.
- **Barra in basso (telefono):** vetro chiaro/scuro con sfocatura, cinque voci icona + etichetta da 10px; la voce attiva è in grassetto pieno.
- **Pallini:** Transazioni e Investimenti aprono a ventaglio pallini da 56px pieni nel colore della sezione, con anello bianco semitrasparente (pieno sulla pagina aperta) ed etichetta bianca sotto.

### Pallini del "+" (Signature Component)
Il "+" della Home apre un quarto di cerchio di pallini colorati, uno per tipo di dato (Entrate, Uscite, Trasferimenti, Investimenti, Consumi), con l'etichetta agganciata all'esterno di ogni pallino. Uscite e Investimenti aprono un secondo passaggio (Una tantum / Ricorrente) sullo stesso arco, col pallino scelto che si rimpicciolisce. È il gesto quotidiano di Wally su telefono: i pallini hanno l'effetto vetro e i colori della mappa.

## Do's and Don'ts

### Do:
- **Do** dare a ogni elemento nuovo il colore della sua sezione (navigazione, pulsante principale, focus, KPI).
- **Do** usare `text-up`, `text-down`, `text-warn` per il segno dei numeri, lasciando che il tema li cambi da solo.
- **Do** mostrare gli importi con `EuroAmount`: centesimi più piccoli, mai tolti.
- **Do** progettare prima nel tema scuro vetro e poi verificare il chiaro.
- **Do** mettere etichette maiuscole da 10–11px sopra ogni valore.

### Don't:
- **Don't** usare taglie di testo arbitrarie sotto i 12px oltre a `text-2xs` e `text-3xs`.
- **Don't** usare il colore di una sezione dentro un'altra sezione, né il colore di sezione per dire se un numero è positivo o negativo.
- **Don't** mettere colore sfocato o sfumature dietro le cifre: l'atmosfera sta solo sullo sfondo.
- **Don't** dare a un popup l'ombra/sfumatura gialla delle card annidate (`.bg-white .bg-white`): i pannelli dei menu usano `.dropdown-menu-panel`.
- **Don't** scendere sotto 36×36px per un pulsante toccabile su telefono.
