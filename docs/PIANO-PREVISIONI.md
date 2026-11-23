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
5. D. Auto (`auto.py`, scheda Auto): km dei prossimi 12 mesi dal ritmo del contachilometri dell'ultimo anno, consumo dell'ultimo anno, prezzo della benzina a cursore (di partenza la mediana degli ultimi 4 rifornimenti), rate fisse dai preset. Provato sui dati veri: sui 90 giorni dopo sbaglia in media ~9%.
6. A. Chiusura del mese, primarie frequenti per giorno della settimana: le categorie primarie con in media almeno 2 uscite al mese (il rifornimento, quasi tutto fra venerdì e domenica) si stimano dalla spesa media di ogni giorno della settimana per i giorni della settimana che restano nel mese, non più dal giorno del mese. Le altre voci (rate a giorno fisso, secondarie) restano sul giorno del mese. Provato sui dati veri (ott 2025 → ott 2026): errore sulle primarie -7% sul mese intero, -24% nella seconda metà (18,9 → 14,4 €); sulle secondarie nessun guadagno. I preset si riconoscono senza badare alle maiuscole.
7. B. Prossimi 12 mesi, stessa idea: le primarie frequenti si tolgono dalle spese e si stimano a parte dalla spesa media di ogni giorno della settimana (ultimi 12 mesi) per i giorni di ogni mese futuro (`giorni_settimana.py`, condiviso con la chiusura del mese). Un mese con 5 weekend ha ~144 € di carburante, uno con 4 ~117 €. Provato sui dati veri: errore sulle spese del mese dopo 301 → 297 €, sui 3 mesi 1.034 → 1.025 €; guadagno piccolo perché le spese ballano soprattutto per altro. Nel tooltip delle spese: "di cui rifornimento e spesa (5 weekend)".
8. Soglia delle spese nei grafici: nella chiusura del mese una linea a puntini alla soglia delle spese mostrate (totali, primarie o secondarie); nei prossimi 12 mesi, sulla serie Spese, una linea a gradini con la soglia di ogni mese (primarie + secondarie in % delle entrate di quel mese, con le soglie valide allora: `soglia_spese` in `flussi.py`, campo `sogliaSpese` di storico e previsti). Nei mesi futuri si misura sulle entrate stimate, quindi sale nei mesi di tredicesima e quattordicesima. La card "Spese a fine mese" dice "su soglia X €".

## Prossimi passi possibili

- Stagionalità per categoria, quando ci saranno almeno 2 anni di uscite dettagliate (da fine 2027).
- Fondo pensione: proiezione fino alla pensione con le regole di contribuzione.
