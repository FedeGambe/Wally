# Piano: inserimento dati via webapp (sostituzione editing manuale su Google Sheet)

Obiettivo: eliminare la necessità di aprire Google Sheets a mano per aggiungere movimenti.
Tutto l'inserimento passa dalla webapp — che poi scrive su Sheet come fa già oggi con `pushSpreadsheetData`.

Questo documento fissa lo scope e le decisioni prese, prima di scrivere codice. Vedi
[ARCHITETTURA.md](./ARCHITETTURA.md) per come funzionano oggi pull/push/localStorage.

## Principio di fondo: full-replace, non append

`pushSpreadsheetData` e `saveToLocalStorage` **sostituiscono sempre l'intero array/tab**, non
fanno merge riga per riga (vedi ARCHITETTURA.md). Quindi ogni form di inserimento deve:

1. prendere l'array esistente (es. `TRANSACTIONS`) dal contesto (`useFinanceData()`),
2. accodare il nuovo record,
3. chiamare `saveToLocalStorage({ uscite: [...TRANSACTIONS, nuovo] })` + `bumpVersion()`,
4. **pushare subito su Sheet** (deciso: push automatico, non manuale) — altrimenti un pull
   successivo cancellerebbe il record aggiunto in locale, perché non c'è merge.

## Punti di ingresso UI

- **Contestuale**: bottone dedicato nelle pagine Entrate e Uscite (il tipo di dato è già
  implicito dalla pagina).
- **Generale**: bottone in Panoramica → apre un **popup non fullscreen** (dialog centrato,
  non un drawer a tutta pagina) che prima chiede *che tipo* di dato inserire (Entrata / Uscita
  / Analisi Consumi / Trasferimento — Investimenti escluso per ora, vedi Fase 4), poi mostra
  lo stesso form usato dalla pagina dedicata (riuso del componente, non duplicazione).

## Impostazioni → nuova sezione "Dati Base"

Sezione editabile da UI in `Impostazioni`, per non dover toccare codice quando cambia un
conto o una categoria. I file di config (`src/config/...`) forniscono solo il **seed di
default**; da lì in poi sono dati come tutti gli altri (localStorage, `sf_...`).

- **Conti**: lista fissa (nome). Usata come dropdown ovunque serve un conto.
- **Categorie** (Entrate/Uscite): coppie macro → categorie, ciascuna con un'**icona** propria
  assegnata una volta qui. Risolve il campo "icon" di Uscite senza bisogno di formula: al
  salvataggio si guarda l'icona associata alla categoria scelta.
- **Valori ricorrenti / preset**: template per le due cose che si ripetono quasi identiche
  ogni mese — uscite verso conti di accantonamento, e contributi mensili investimento.
  Meccanica d'uso (precompila il form vs inserimento automatico) **da decidere in fase di
  implementazione**, non blocca il piano.

## Tecnica per i campi "formula sheet" (Analisi Consumi)

Alcuni campi (Km effettuati, Km/lt, €/100km, Costo extra, Km persi mediani, Esito settimana,
...) sono oggi calcolati da formule dentro il Google Sheet — l'app li legge già pronti, non li
ricalcola mai (vedi `useAnalisiConsumiData.ts`). Per un record creato ex-novo dalla webapp non
c'è nessuna formula già valutata da leggere.

Soluzione: **copiare la formula della riga sopra, shiftando i riferimenti di riga**, la stessa
regola che usa Sheets quando trascini una formula in basso:

1. Leggere la formula (non il valore) della cella nella riga precedente, via Sheets API con
   `valueRenderOption: FORMULA` (chiamata separata da quella che legge i valori).
2. Shiftare i riferimenti: quelli senza `$` avanzano di una riga (`B12` → `B13`), quelli
   ancorati (`$B$2`) restano fermi — copre da sola anche i range crescenti tipo mediana
   (`=MEDIAN($B$2:B12)` → `=MEDIAN($B$2:B13)`).
3. Scrivere la formula shiftata come valore della nuova cella — `pushSpreadsheetData` usa già
   `valueInputOption: USER_ENTERED`, quindi una stringa che inizia con `=` diventa
   automaticamente una formula viva, nessuna modifica al codice di push.
4. Dopo il push, **ripullare** (`fetchSpreadsheetData`) per leggere il valore vero calcolato
   da Sheets — zero calcolo approssimato lato client, zero rischio di numero sbagliato.

Limite noto: regge formule "normali" (riferimenti relativi/ancorati sullo stesso foglio). Non
regge `INDIRECT()`/range con nome — da gestire caso per caso se capita.

## Fasi

### Fase 1 — Entrate & Uscite (manuale libero)

**Uscite** — campi form:

| Campo | Sorgente |
|---|---|
| data | input utente, default oggi |
| descrizione | input utente |
| macro categoria | dropdown, da config Categorie |
| categoria | dropdown, da config Categorie (filtrata per macro) |
| conto utilizzato | dropdown, da config Conti |
| importo | input utente |
| primarie | toggle sì/no |
| mese | auto, derivato da `data` |
| icon | auto, dall'icona assegnata alla categoria in config |

**Entrate** — campi form (senza data/descrizione, confermato non servono):

| Campo | Sorgente |
|---|---|
| mese | default mese corrente, flag per sceglierne uno diverso |
| anno | auto, derivato dal mese scelto |
| categoria | dropdown, da config Categorie |
| conto | dropdown, da config Conti |
| importo | input utente |

Stipendio e voci variabili restano **sempre input manuale** — nessun preset applicato a
Entrate.

Salvataggio: append locale + push automatico su Sheet (vedi sopra).

### Fase 1b — Bottone generale in Panoramica

Popup con selezione tipo dato, poi il form della fase corrispondente (riuso componenti).

### Fase 2 — Valori ricorrenti (preset)

Due casi individuati, quasi fissi mese su mese:

1. Uscite verso conti di Accantonamento (stesso importo/categoria/conto sorgente+destinazione)
2. Contributi mensili investimento (stabili salvo ribilanciamento portafoglio)

> Nota: il caso 1 si sovrappone concettualmente a Fase 5 (Trasferimenti) — probabilmente sono
> la stessa feature vista da due lati, da unificare quando ci si arriva.

### Fase 3 — Analisi Consumi

Campi form:

| Campo | Sorgente |
|---|---|
| data | input utente |
| costo | input utente |
| quantità (Lt) | input utente |
| €/Lt | input utente |
| Km finali | input utente |
| Km/lt (auto — bordo cruscotto) | input utente |
| Efficienza | **da chiarire** — unico campo senza tag "formula sheet" nella lista originale, va confermato se manuale o calcolato |
| Km effettuati, Litri precedenti, Km/lt (calcolato), €/100km, Lt/100km, Km persi, Km persi mediani, Costo extra, Esito settimana | auto, via tecnica "copia formula riga sopra" |

### Fase 4 — Investimenti (rimandata)

Più delicata: le tabelle Scalable/Trade Republic hanno colonne dinamiche rilevate a runtime
(asset class per colonna), e il push oggi fa un replace pieno della tab con struttura
variabile. Userà i preset di Fase 2 per i contributi mensili una volta impostati. Da
progettare a parte quando le fasi precedenti sono chiuse.

### Fase 5 — Trasferimenti

Concetto nuovo, **da creare ex-novo**: nessuna interfaccia TS né tab sul foglio Google oggi.

Campi form:

| Campo | Sorgente |
|---|---|
| mese | default mese corrente, modificabile |
| anno | auto, derivato dal mese scelto |
| conto ordinante | dropdown, da config Conti |
| conto beneficiario | dropdown, da config Conti |
| importo | input utente |

Da decidere in fase di implementazione: un trasferimento aggiorna direttamente i saldi dei
conti in Patrimonio (che oggi è uno snapshot letto dal foglio, non derivato da movimenti), o
resta solo un log separato senza toccare Patrimonio.

## Ordine di implementazione

Fase 1 → 1b → 2 → 3 → 5 → (Fase 4 quando si è pronti). Ogni fase si chiude e si verifica prima
di aprire la successiva.

## Aperto / da confermare prima o durante l'implementazione

- Campo "Efficienza" in Analisi Consumi: manuale o calcolato?
- Meccanica d'uso dei preset (Fase 2): precompila form vs inserimento automatico.
- Fase 5: un trasferimento tocca i saldi Patrimonio o resta solo un log?
- Fase 2 / Fase 5: unificare "uscite verso accantonamento" con "trasferimenti"?
