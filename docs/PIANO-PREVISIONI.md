# Piano: pagina Previsioni

Deciso il 31/10/2026. Pagina solo da computer con stime sui dati del foglio, calcolate dal backend Python. Come funziona oggi: [ARCHITETTURA.md](./ARCHITETTURA.md#previsioni), [BACKEND.md](./BACKEND.md) e [FRONTEND.md](./FRONTEND.md).

## Scelte

- **Patrimonio** = somma dei conti della scheda Patrimonio, come la pagina Patrimonio. Il conto con "fondo" nel nome è il fondo pensione. Il capitale impegnato (Santander) resta nel patrimonio ma esce dalla liquidità libera.
- **Rendimenti attesi**: ipotesi prudenti di lungo periodo, modificabili dalla pagina (azioni 6,5% ± 15%, obbligazioni 2,5% ± 5%, monetari 2% ± 0,5%, fondo pensione 3,5% ± 6%). I 39 mesi di storia sono troppo pochi per stimarli dai dati.
- **Modelli semplici** (livello + stagionalità, scenari dai mesi passati, Monte Carlo) e solo `numpy`: con 5 anni di mesi un modello complicato imparerebbe il rumore.
- **Cambi di lavoro**: tirocinio da settembre 2025, assunzione a marzo 2026 (stipendio il mese dopo). Lo stipendio si stima solo sul periodo attuale, con tredicesima e quattordicesima per i mesi lavorati. Le date sono in `backend/models/previsioni.py`.
- **Voci straordinarie** (auto: saldo a settembre 2025 e settembre 2026, regali dei nonni per l'auto): singole voci da 1.000 € in su, escluse dalle stime e mostrate a parte.
- **Stime riconoscibili**: arrotondate, sempre con la fascia, etichetta "stima", linea tratteggiata.

## Dati disponibili (controllati il 31/10/2026)

- Risparmio ed Entrate: da dicembre 2021, 59 mesi.
- Uscite: da dicembre 2021, ma dettagliate (30-40 righe al mese) solo da ottobre 2025. Da quel mese entrate e spese sono più che raddoppiate: il livello si stima sugli ultimi 12 mesi e la fascia sulla variabilità dell'ultimo anno.
- Rendimenti: da agosto 2023 (39 mesi). Trasferimenti da novembre 2025. Fondo pensione da maggio 2026.

## Fatto

1. Backend `backend/domain/previsioni/` + `POST /api/previsioni`, con i test.
2. A. Chiusura del mese, B. prossimi 12 mesi, C. crescita del patrimonio (storico per origine, tasso di risparmio, autonomia, proiezione, "E se…", obiettivo).
3. Pagina `Previsioni.tsx` nella barra laterale (solo computer).
4. Incognito (dati finti mandati al backend) e demo (`data/demoPrevisioni.json`, `npm run previsioni:demo`).

## Prossimi passi possibili

- Stagionalità per categoria, quando ci saranno almeno 2 anni di uscite dettagliate (da fine 2027).
- Spese fuori dal normale, per mese e categoria.
- Auto: km all'anno e costo carburante dei prossimi 12 mesi.
- Fondo pensione: proiezione fino alla pensione con le regole di contribuzione.
