export interface Transaction {
  id: string;
  data: string;
  mese: string;
  descrizione: string;
  macroCategoria: string;
  categoria: string;
  icon: string;
  conto: string;
  importo: number;
  primaria: boolean;
}

export interface RisparmioMese {
  mese: string;
  anno: number;
  entrate: number;
  speseTotali: number;
  spesePrimarie: number;
  speseSecondarie: number;
  investito: number;
  risparmioNetto: number;
  investiti?: number;
  risparmio?: number;
  andamentoRisparmio?: number;
  andamentoNetto?: number;
}

export interface ContoPatrimonio {
  id: string;
  categoria: string; // nome del conto
  capitaleTotale: number;
  capitaleDisponibile: number;
  capitaleInvestito: number;
  capitaleImpegnato: number;
  sogliaAllarme: number;
  allarmeSoglia?: number;
  rimanenteSoglia?: number;
}

export interface CapitaleImpegnato {
  categoria: string;
  capitaleImpegnato: number;
}

export interface RendimentoInvestimenti {
  mese: string;
  rendimentoMensileEuro: number;
  rendimentoMensilePerc: number;
  importoMensileInvestito: number;
  rendimentoCumulativoEuro: number;
  rendimentoCumulativoPerc: number;
  importoInvestitoCumulato: number;
  valoreAttualePortafoglio: number;
}

export interface ConsumoAutoWeek {
  settimana: string;
  data: string;
  mese?: string;
  costo: number;
  quantitaLitri: number;
  prezzoAlLitro: number;
  kmFinali: number;
  kmEffettuati: number;
  kmAlLitro: number;
  efficienzaPercentuale: number;
  esitoSettimana: 'Ottima' | 'Buona' | 'Nella media' | 'Sopra media' | 'Scarsa';
  costoExtra: number;
}

// ----------------------------------------------------
// TRANSACTIONS (extracted from Federico's CSV)
// ----------------------------------------------------
const INITIAL_TRANSACTIONS: Transaction[] = [
  // 2026 Transactions
  { id: 't-2026-06-01', data: '17/06/2026', mese: 'giugno', descrizione: 'Spesa pranzo lavoro', macroCategoria: 'Cibo', categoria: 'Spesa', icon: '🍕', conto: 'Trade Republic', importo: 0.20, primaria: false },
  { id: 't-2026-06-02', data: '12/06/2026', mese: 'giugno', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 31.17, primaria: true },
  { id: 't-2026-06-03', data: '12/06/2026', mese: 'giugno', descrizione: 'Spesa pranzo lavoro', macroCategoria: 'Cibo', categoria: 'Spesa', icon: '🍕', conto: 'Trade Republic', importo: 0.06, primaria: false },
  { id: 't-2026-06-04', data: '10/06/2026', mese: 'giugno', descrizione: 'Spesa pranzo lavoro', macroCategoria: 'Cibo', categoria: 'Spesa', icon: '🍕', conto: 'Trade Republic', importo: 0.16, primaria: false },
  { id: 't-2026-06-05', data: '10/06/2026', mese: 'giugno', descrizione: 'Profumi', macroCategoria: 'Shopping', categoria: 'Beni Personali', icon: '🛍️', conto: 'Trade Republic', importo: 22.55, primaria: false },
  { id: 't-2026-06-06', data: '06/06/2026', mese: 'giugno', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 29.52, primaria: true },
  { id: 't-2026-06-07', data: '06/06/2026', mese: 'giugno', descrizione: 'Burger doppio malto', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Trade Republic', importo: 19.60, primaria: false },
  { id: 't-2026-06-08', data: '05/06/2026', mese: 'giugno', descrizione: 'Spesa pranzo lavoro', macroCategoria: 'Cibo', categoria: 'Spesa', icon: '🍕', conto: 'Trade Republic', importo: 3.17, primaria: false },
  { id: 't-2026-06-09', data: '03/06/2026', mese: 'giugno', descrizione: 'Melatonia', macroCategoria: 'Salute', categoria: 'Medicine', icon: '🩺', conto: 'Trade Republic', importo: 23.35, primaria: true },
  { id: 't-2026-06-10', data: '03/06/2026', mese: 'giugno', descrizione: 'Parcheggio ospedale', macroCategoria: 'Salute', categoria: 'Parcheggio', icon: '🏥', conto: 'Trade Republic', importo: 6.30, primaria: true },
  { id: 't-2026-06-11', data: '03/06/2026', mese: 'giugno', descrizione: 'Rata auto Ford Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 167.50, primaria: true },
  { id: 't-2026-06-12', data: '02/06/2026', mese: 'giugno', descrizione: 'Ristorante cattolica', macroCategoria: 'Vacanze', categoria: 'Ristorante', icon: '🏝️', conto: 'Trade Republic', importo: 32.00, primaria: false },
  { id: 't-2026-06-13', data: '02/06/2026', mese: 'giugno', descrizione: 'Benzina Viaggio', macroCategoria: 'Vacanze', categoria: 'Viaggio', icon: '🏝️', conto: 'Trade Republic', importo: 13.00, primaria: false },
  { id: 't-2026-06-14', data: '02/06/2026', mese: 'giugno', descrizione: 'Panino spiaggia', macroCategoria: 'Vacanze', categoria: 'Bar', icon: '🏝️', conto: 'Trade Republic', importo: 9.00, primaria: false },
  { id: 't-2026-06-15', data: '02/06/2026', mese: 'giugno', descrizione: 'Discoteca rimini', macroCategoria: 'Vacanze', categoria: 'Eventi', icon: '🏝️', conto: 'Trade Republic', importo: 21.00, primaria: false },
  { id: 't-2026-06-16', data: '01/06/2026', mese: 'giugno', descrizione: 'Rata assicurazione auto', macroCategoria: 'Automobile', categoria: 'Assicurazione', icon: '🚘', conto: 'Unicredit', importo: 80.00, primaria: true },
  { id: 't-2026-06-17', data: '01/06/2026', mese: 'giugno', descrizione: 'Rata bollo auto', macroCategoria: 'Tasse', categoria: 'Bollo', icon: '🏦', conto: 'Unicredit', importo: 23.00, primaria: true },
  { id: 't-2026-06-18', data: '01/06/2026', mese: 'giugno', descrizione: 'Rata Gomme Auto', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 25.00, primaria: true },

  // 2026 Maggio
  { id: 't-2026-05-01', data: '29/05/2026', mese: 'maggio', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 31.45, primaria: true },
  { id: 't-2026-05-02', data: '28/05/2026', mese: 'maggio', descrizione: 'Magliette Calliope', macroCategoria: 'Shopping', categoria: 'Vestiti', icon: '🛍️', conto: 'Trade Republic', importo: 32.95, primaria: false },
  { id: 't-2026-05-03', data: '25/05/2026', mese: 'maggio', descrizione: 'Ecografia Reni', macroCategoria: 'Salute', categoria: 'Visita Medica', icon: '🩺', conto: 'Unicredit', importo: 36.50, primaria: true },
  { id: 't-2026-05-04', data: '24/05/2026', mese: 'maggio', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 36.79, primaria: true },
  { id: 't-2026-05-05', data: '18/05/2026', mese: 'maggio', descrizione: 'Abbonamento Spotify Family', macroCategoria: 'Abbonamenti', categoria: 'Spotify', icon: '🔁', conto: 'Unicredit', importo: 42.00, primaria: false },
  { id: 't-2026-05-06', data: '11/05/2026', mese: 'maggio', descrizione: 'Bollo auto Ford', macroCategoria: 'Tasse', categoria: 'Bollo', icon: '🏦', conto: 'Trade Republic', importo: 87.78, primaria: true },
  { id: 't-2026-05-07', data: '03/05/2026', mese: 'maggio', descrizione: 'Rata auto Ford Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 167.50, primaria: true },
  { id: 't-2026-05-08', data: '02/05/2026', mese: 'maggio', descrizione: 'Pizza casalecchio', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Trade Republic', importo: 24.95, primaria: false },
  { id: 't-2026-05-09', data: '01/05/2026', mese: 'maggio', descrizione: 'Pellicola fari estetica', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Trade Republic', importo: 20.45, primaria: false },
  { id: 't-2026-05-10', data: '01/05/2026', mese: 'maggio', descrizione: 'Lampadine led Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Trade Republic', importo: 16.99, primaria: false },

  // 2026 Aprile
  { id: 't-2026-04-01', data: '30/04/2026', mese: 'aprile', descrizione: 'Scarpe Reebok Run', macroCategoria: 'Shopping', categoria: 'Beni Personali', icon: '🛍️', conto: 'Trade Republic', importo: 65.99, primaria: false },
  { id: 't-2026-04-02', data: '26/04/2026', mese: 'aprile', descrizione: 'Sigillante e tacchette gravel', macroCategoria: 'Sport', categoria: 'Bici', icon: '🚴', conto: 'Trade Republic', importo: 38.98, primaria: false },
  { id: 't-2026-04-03', data: '25/04/2026', mese: 'aprile', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 28.93, primaria: true },
  { id: 't-2026-04-04', data: '18/04/2026', mese: 'aprile', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 28.15, primaria: true },
  { id: 't-2026-04-05', data: '13/04/2026', mese: 'aprile', descrizione: 'Tagliando annuale auto', macroCategoria: 'Automobile', categoria: 'Manutenzione', icon: '🚘', conto: 'Trade Republic', importo: 190.00, primaria: true },
  { id: 't-2026-04-06', data: '06/04/2026', mese: 'aprile', descrizione: 'Decathlon occhiali e copertone', macroCategoria: 'Sport', categoria: 'Bici', icon: '🚴', conto: 'Trade Republic', importo: 80.98, primaria: false },
  { id: 't-2026-04-07', data: '04/04/2026', mese: 'aprile', descrizione: 'Antico Vinaio Bologna', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Trade Republic', importo: 13.00, primaria: false },
  { id: 't-2026-04-08', data: '03/04/2026', mese: 'aprile', descrizione: 'Rata auto Ford Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 167.50, primaria: true },

  // 2026 Marzo
  { id: 't-2026-03-01', data: '27/03/2026', mese: 'marzo', descrizione: 'Salopette Decathlon e catena', macroCategoria: 'Sport', categoria: 'Bici', icon: '🚴', conto: 'Trade Republic', importo: 67.88, primaria: false },
  { id: 't-2026-03-02', data: '21/03/2026', mese: 'marzo', descrizione: 'Profumo auto', macroCategoria: 'Shopping', categoria: 'Beni Personali', icon: '🛍️', conto: 'Trade Republic', importo: 8.95, primaria: false },
  { id: 't-2026-03-03', data: '21/03/2026', mese: 'marzo', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 30.55, primaria: true },
  { id: 't-2026-03-04', data: '13/03/2026', mese: 'marzo', descrizione: 'Pizza con gli amici', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Unicredit', importo: 10.00, primaria: false },
  { id: 't-2026-03-05', data: '13/03/2026', mese: 'marzo', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 31.91, primaria: true },
  { id: 't-2026-03-06', data: '10/03/2026', mese: 'marzo', descrizione: 'Medicine addormentamento', macroCategoria: 'Salute', categoria: 'Medicine', icon: '🩺', conto: 'Trade Republic', importo: 20.50, primaria: true },
  { id: 't-2026-03-07', data: '05/03/2026', mese: 'marzo', descrizione: 'Abbonamento Dominio Web', macroCategoria: 'Abbonamenti', categoria: 'Sito web', icon: '🔁', conto: 'Unicredit', importo: 23.13, primaria: false },
  { id: 't-2026-03-08', data: '03/03/2026', mese: 'marzo', descrizione: 'Rata auto Ford Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 167.50, primaria: true },
  { id: 't-2026-03-09', data: '03/03/2026', mese: 'marzo', descrizione: 'Abbonamento Zwift Bici', macroCategoria: 'Abbonamenti', categoria: 'Bici', icon: '🔁', conto: 'Trade Republic', importo: 19.99, primaria: false },

  // 2026 Febbraio
  { id: 't-2026-02-01', data: '28/02/2026', mese: 'febbraio', descrizione: 'Pizza casalecchio', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Trade Republic', importo: 20.90, primaria: false },
  { id: 't-2026-02-02', data: '28/02/2026', mese: 'febbraio', descrizione: 'Cinema UCI (2 ingressi)', macroCategoria: 'Svago', categoria: 'Cinema', icon: '🕺', conto: 'Trade Republic', importo: 9.80, primaria: false },
  { id: 't-2026-02-03', data: '21/02/2026', mese: 'febbraio', descrizione: 'Lavaggio auto completo', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Trade Republic', importo: 17.00, primaria: false },
  { id: 't-2026-02-04', data: '16/02/2026', mese: 'febbraio', descrizione: 'Benzina Focus', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 29.74, primaria: true },
  { id: 't-2026-02-05', data: '06/02/2026', mese: 'febbraio', descrizione: 'Cambio gomme anteriori', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Trade Republic', importo: 282.02, primaria: true },
  { id: 't-2026-02-06', data: '03/02/2026', mese: 'febbraio', descrizione: 'Rata auto Ford Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 167.50, primaria: true },

  // 2026 Gennaio
  { id: 't-2026-01-01', data: '23/01/2026', mese: 'gennaio', descrizione: 'Benzina', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Trade Republic', importo: 37.00, primaria: true },
  { id: 't-2026-01-02', data: '19/01/2026', mese: 'gennaio', descrizione: 'Abbonamento Zwift', macroCategoria: 'Abbonamenti', categoria: 'Bici', icon: '🔁', conto: 'Trade Republic', importo: 19.99, primaria: false },
  { id: 't-2026-01-03', data: '17/01/2026', mese: 'gennaio', descrizione: 'Tigelle Dispensa Emilia', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Trade Republic', importo: 15.00, primaria: false },
  { id: 't-2026-01-04', data: '09/01/2026', mese: 'gennaio', descrizione: 'Casco Bici strada speciale', macroCategoria: 'Sport', categoria: 'Bici', icon: '🚴', conto: 'Trade Republic', importo: 99.99, primaria: false },
  { id: 't-2026-01-05', data: '03/01/2026', mese: 'gennaio', descrizione: 'Rata auto Ford Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 167.50, primaria: true },

  // 2025 Highlights
  { id: 't-2025-12-01', data: '18/12/2025', mese: 'dicembre', descrizione: 'Regalo Secret Santa', macroCategoria: 'Shopping', categoria: 'Regalo', icon: '🎁', conto: 'Trade Republic', importo: 27.23, primaria: false },
  { id: 't-2025-12-02', data: '03/12/2025', mese: 'dicembre', descrizione: 'Rata Auto Ford Focus', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 167.50, primaria: true },
  { id: 't-2025-11-01', data: '07/11/2025', mese: 'novembre', descrizione: 'Scarpe invernali', macroCategoria: 'Shopping', categoria: 'Scarpe', icon: '🛍️', conto: 'Trade Republic', importo: 69.99, primaria: false },
  { id: 't-2025-10-01', data: '06/10/2025', mese: 'ottobre', descrizione: 'Concerto Bresh Bologna', macroCategoria: 'Svago', categoria: 'Eventi', icon: '🕺', conto: 'Trade Republic', importo: 50.60, primaria: false },
  { id: 't-2025-10-02', data: '06/10/2025', mese: 'ottobre', descrizione: 'Treno per Roma A/R', macroCategoria: 'Vacanze', categoria: 'Treni', icon: '🏝️', conto: 'Unicredit', importo: 76.60, primaria: false },
  { id: 't-2025-09-01', data: '10/09/2025', mese: 'settembre', descrizione: 'Assicurazione Auto Annuale', macroCategoria: 'Automobile', categoria: 'Assicurazione', icon: '🚘', conto: 'Trade Republic', importo: 447.00, primaria: true },
  { id: 't-2025-09-02', data: '03/09/2025', mese: 'settembre', descrizione: 'Acquisto auto Ford Focus (Acconto/Saldo)', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Unicredit', importo: 5000.00, primaria: true },
  { id: 't-2025-07-01', data: '08/07/2025', mese: 'luglio', descrizione: 'Orologio e cinturino', macroCategoria: 'Shopping', categoria: 'Beni Personali', icon: '🛍️', conto: 'Trade Republic', importo: 126.49, primaria: false },
  { id: 't-2025-02-01', data: '22/02/2025', mese: 'febbraio', descrizione: 'Tessera ETF Trade Republic S&P500', macroCategoria: 'Movimenti', categoria: 'ETF', icon: '📈', conto: 'Trade Republic', importo: 121.00, primaria: false }
];

// ----------------------------------------------------
// RATINGS & SUMMARY PER MONTH (Risparmio Sheet Data)
// ----------------------------------------------------
const INITIAL_RISPARMIO_DATA: RisparmioMese[] = [
  { mese: 'Gennaio', anno: 2026, entrate: 2200, speseTotali: 980, spesePrimarie: 450, speseSecondarie: 180, investito: 350, risparmioNetto: 870, andamentoRisparmio: 6130.86 },
  { mese: 'Febbraio', anno: 2026, entrate: 2150, speseTotali: 1140, spesePrimarie: 610, speseSecondarie: 230, investito: 310, risparmioNetto: 700, andamentoRisparmio: 6830.86 },
  { mese: 'Marzo', anno: 2026, entrate: 2300, speseTotali: 1040, spesePrimarie: 480, speseSecondarie: 210, investito: 450, risparmioNetto: 810, andamentoRisparmio: 7640.86 },
  { mese: 'Aprile', anno: 2026, entrate: 2250, speseTotali: 890, spesePrimarie: 410, speseSecondarie: 180, investito: 410, risparmioNetto: 950, andamentoRisparmio: 8590.86 },
  { mese: 'Maggio', anno: 2026, entrate: 2400, speseTotali: 1220, spesePrimarie: 510, speseSecondarie: 260, investito: 450, risparmioNetto: 730, andamentoRisparmio: 9320.86 },
  { mese: 'Giugno', anno: 2026, entrate: 2350, speseTotali: 1010, spesePrimarie: 470, speseSecondarie: 190, investito: 400, risparmioNetto: 940, andamentoRisparmio: 10260.86 },
  // 2025
  { mese: 'Luglio', anno: 2025, entrate: 2100, speseTotali: 1350, spesePrimarie: 320, speseSecondarie: 450, investito: 300, risparmioNetto: 450, andamentoRisparmio: 6010.86 },
  { mese: 'Agosto', anno: 2025, entrate: 2050, speseTotali: 1100, spesePrimarie: 280, speseSecondarie: 380, investito: 250, risparmioNetto: 700, andamentoRisparmio: 6710.86 },
  { mese: 'Settembre', anno: 2025, entrate: 2500, speseTotali: 6150, spesePrimarie: 5500, speseSecondarie: 250, investito: 400, risparmioNetto: -3250, andamentoRisparmio: 3460.86 }, // Auto purchase
  { mese: 'Ottobre', anno: 2025, entrate: 2300, speseTotali: 1420, spesePrimarie: 540, speseSecondarie: 480, investito: 350, risparmioNetto: 530, andamentoRisparmio: 3990.86 },
  { mese: 'Novembre', anno: 2025, entrate: 2250, speseTotali: 1250, spesePrimarie: 490, speseSecondarie: 360, investito: 300, risparmioNetto: 700, andamentoRisparmio: 4690.86 },
  { mese: 'Dicembre', anno: 2025, entrate: 2600, speseTotali: 1530, spesePrimarie: 610, speseSecondarie: 420, investito: 500, risparmioNetto: 570, andamentoRisparmio: 5260.86 }
];

// ----------------------------------------------------
// NET WORTH ACCOUNTS (Patrimonio Sheet)
// ----------------------------------------------------
const INITIAL_CONTI_PATRIMONIO: ContoPatrimonio[] = [
  { id: '1', categoria: 'Unicredit Corrente', capitaleTotale: 12450.50, capitaleDisponibile: 8450.50, capitaleInvestito: 0, capitaleImpegnato: 4000.00, sogliaAllarme: 5000, allarmeSoglia: 65, rimanenteSoglia: 3450.50 },
  { id: '2', categoria: 'BBVA Deposito', capitaleTotale: 15200.00, capitaleDisponibile: 15200.00, capitaleInvestito: 0, capitaleImpegnato: 0, sogliaAllarme: 5000, allarmeSoglia: 92, rimanenteSoglia: 1200.00 },
  { id: '3', categoria: 'Trade Republic', capitaleTotale: 24890.30, capitaleDisponibile: 4390.30, capitaleInvestito: 20500.00, capitaleImpegnato: 0, sogliaAllarme: 5000, allarmeSoglia: 105, rimanenteSoglia: -609.70 },
  { id: '4', categoria: 'Scalable Capital', capitaleTotale: 8900.00, capitaleDisponibile: 900.00, capitaleInvestito: 8000.00, capitaleImpegnato: 0, sogliaAllarme: 5000 },
  { id: '5', categoria: 'Unicredit Prepagata', capitaleTotale: 340.00, capitaleDisponibile: 340.00, capitaleInvestito: 0, capitaleImpegnato: 0, sogliaAllarme: 5000 },
  { id: '6', categoria: 'Libretto di Risparmio', capitaleTotale: 2500.00, capitaleDisponibile: 2500.00, capitaleInvestito: 0, capitaleImpegnato: 0, sogliaAllarme: 5000 },
  { id: '7', categoria: 'Contanti Fisici', capitaleTotale: 450.00, capitaleDisponibile: 450.00, capitaleInvestito: 0, capitaleImpegnato: 0, sogliaAllarme: 5000 }
];

// ----------------------------------------------------
// LOCKED CAPITAL DEBTS (Capitale Impegnato)
// ----------------------------------------------------
const INITIAL_CAPITALE_IMPEGNATO: CapitaleImpegnato[] = [
  { categoria: 'Rata Auto Ford Focus (Finanziamento)', capitaleImpegnato: 3350.00 },
  { categoria: 'Rata Assicurazione Auto Estesa', capitaleImpegnato: 320.00 },
  { categoria: 'Rata Bollo & Contributo Manutenzione Accantonato', capitaleImpegnato: 180.00 },
  { categoria: 'Altri impegni finanziari', capitaleImpegnato: 150.00 }
];

export const CAPITALE_IMPEGNATO: CapitaleImpegnato[] = (() => {
  try {
    const val = localStorage.getItem('sf_capitale_impegnato');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
})();

// ----------------------------------------------------
// INVESTMENTS - PERFORMANCE & METRICS
// ----------------------------------------------------
export const CRUSCOTTO_GENERALE = {
  azioniInvestitoCum: 18500,
  azioniInvestitoAnno: 2400,
  obbligazioniInvestitoCum: 10000,
  obbligazioniInvestitoAnno: 1200,
  rendimentoCumulativoEuro: 3450.80,
  rendimentoCumulativoPerc: 13.8,
  rendimentoMedioMensilePerc: 1.15,
  rendimentoAnnuoStimatoPerc: 7.8,
  liquidiConto: 5290.30
};

const INITIAL_CRUSCOTTO_DATA = [
  {
    anno: 2026,
    azioniInvestitoCum: 18500,
    azioniInvestitoAnno: 2400,
    obbligazioniInvestitoCum: 10000,
    obbligazioniInvestitoAnno: 1200,
    investitoCumulativo: 28500,
    investitoAnnuale: 3600,
    rendimentoCumulativoEuro: 3450.80,
    rendimentoAnnualeEuro: 3600,
    rendimentoMedioMensilePerc: 1.15,
    rendimentoAnnuoStimatoPerc: 7.8
  }
];

export const CRUSCOTTO_DATA: any[] = (() => {
  try {
    const val = localStorage.getItem('sf_cruscotto_data');
    return val ? JSON.parse(val) : INITIAL_CRUSCOTTO_DATA;
  } catch {
    return INITIAL_CRUSCOTTO_DATA;
  }
})();

const INITIAL_RENDIMENTI_MENSILI: RendimentoInvestimenti[] = [
  { mese: 'Lug 25', rendimentoMensileEuro: 210, rendimentoMensilePerc: 0.95, importoMensileInvestito: 300, rendimentoCumulativoEuro: 1450, rendimentoCumulativoPerc: 7.1, importoInvestitoCumulato: 20400, valoreAttualePortafoglio: 21850 },
  { mese: 'Ago 25', rendimentoMensileEuro: -140, rendimentoMensilePerc: -0.62, importoMensileInvestito: 250, rendimentoCumulativoEuro: 1310, rendimentoCumulativoPerc: 6.3, importoInvestitoCumulato: 20650, valoreAttualePortafoglio: 21960 },
  { mese: 'Set 25', rendimentoMensileEuro: 310, rendimentoMensilePerc: 1.41, importoMensileInvestito: 400, rendimentoCumulativoEuro: 1620, rendimentoCumulativoPerc: 7.7, importoInvestitoCumulato: 21050, valoreAttualePortafoglio: 22670 },
  { mese: 'Ott 25', rendimentoMensileEuro: 180, rendimentoMensilePerc: 0.82, importoMensileInvestito: 350, rendimentoCumulativoEuro: 1800, rendimentoCumulativoPerc: 8.4, importoInvestitoCumulato: 21400, valoreAttualePortafoglio: 23200 },
  { mese: 'Nov 25', rendimentoMensileEuro: 290, rendimentoMensilePerc: 1.25, importoMensileInvestito: 300, rendimentoCumulativoEuro: 2090, rendimentoCumulativoPerc: 9.6, importoInvestitoCumulato: 21700, valoreAttualePortafoglio: 23790 },
  { mese: 'Dic 25', rendimentoMensileEuro: 420, rendimentoMensilePerc: 1.76, importoMensileInvestito: 500, rendimentoCumulativoEuro: 2510, rendimentoCumulativoPerc: 11.3, importoInvestitoCumulato: 22200, valoreAttualePortafoglio: 24710 },
  { mese: 'Gen 26', rendimentoMensileEuro: -80, rendimentoMensilePerc: -0.32, importoMensileInvestito: 350, rendimentoCumulativoEuro: 2430, rendimentoCumulativoPerc: 10.7, importoInvestitoCumulato: 22550, valoreAttualePortafoglio: 24980 },
  { mese: 'Feb 26', rendimentoMensileEuro: 190, rendimentoMensilePerc: 0.76, importoMensileInvestito: 310, rendimentoCumulativoEuro: 2620, rendimentoCumulativoPerc: 11.4, importoInvestitoCumulato: 22860, valoreAttualePortafoglio: 25480 },
  { mese: 'Mar 26', rendimentoMensileEuro: 340, rendimentoMensilePerc: 1.33, importoMensileInvestito: 450, rendimentoCumulativoEuro: 2960, rendimentoCumulativoPerc: 12.7, importoInvestitoCumulato: 23310, valoreAttualePortafoglio: 26270 },
  { mese: 'Apr 26', rendimentoMensileEuro: 410, rendimentoMensilePerc: 1.56, importoMensileInvestito: 410, rendimentoCumulativoEuro: 3370, rendimentoCumulativoPerc: 14.2, importoInvestitoCumulato: 23720, valoreAttualePortafoglio: 27090 },
  { mese: 'Mag 26', rendimentoMensileEuro: -120, rendimentoMensilePerc: -0.44, importoMensileInvestito: 450, rendimentoCumulativoEuro: 3250, rendimentoCumulativoPerc: 13.5, importoInvestitoCumulato: 24170, valoreAttualePortafoglio: 27420 },
  { mese: 'Giu 26', rendimentoMensileEuro: 450, rendimentoMensilePerc: 1.64, importoMensileInvestito: 400, rendimentoCumulativoEuro: 3700, rendimentoCumulativoPerc: 15.0, importoInvestitoCumulato: 24570, valoreAttualePortafoglio: 28270 }
];

export interface InstrumentDetail {
  nome: string;
  tipo: 'ETF' | 'Azioni' | 'Liquidita';
  importoInvestito: number;
  rendimentoMensileEuro: number;
  rendimentoMensilePerc: number;
  rendimentoCumulativoEuro: number;
  rendimentoCumulativoPerc: number;
  saldoConto: number;
}

export const SCALABLE_INSTRUMENTS: InstrumentDetail[] = [
  { nome: 'STOXX Europe 600 ETF', tipo: 'ETF', importoInvestito: 2500, rendimentoMensileEuro: 45, rendimentoMensilePerc: 1.8, rendimentoCumulativoEuro: 280, rendimentoCumulativoPerc: 11.2, saldoConto: 2780 },
  { nome: 'MSCI World Value Factor', tipo: 'ETF', importoInvestito: 3000, rendimentoMensileEuro: -15, rendimentoMensilePerc: -0.5, rendimentoCumulativoEuro: 340, rendimentoCumulativoPerc: 11.3, saldoConto: 3340 },
  { nome: 'MSCI ACW (All Country World)', tipo: 'ETF', importoInvestito: 1500, rendimentoMensileEuro: 25, rendimentoMensilePerc: 1.6, rendimentoCumulativoEuro: 120, rendimentoCumulativoPerc: 8.0, saldoConto: 1620 },
  { nome: 'BPER Banca S.p.A.', tipo: 'Azioni', importoInvestito: 500, rendimentoMensileEuro: 40, rendimentoMensilePerc: 8.0, rendimentoCumulativoEuro: 110, rendimentoCumulativoPerc: 22.0, saldoConto: 610 },
  { nome: 'Opthea Limited', tipo: 'Azioni', importoInvestito: 300, rendimentoMensileEuro: -10, rendimentoMensilePerc: -3.3, rendimentoCumulativoEuro: -45, rendimentoCumulativoPerc: -15.0, saldoConto: 255 },
  { nome: 'Liquidità Conto Scalable', tipo: 'Liquidita', importoInvestito: 300, rendimentoMensileEuro: 1.2, rendimentoMensilePerc: 0.4, rendimentoCumulativoEuro: 5.4, rendimentoCumulativoPerc: 1.8, saldoConto: 305.4 }
];

export const TRADE_REPUBLIC_INSTRUMENTS: InstrumentDetail[] = [
  { nome: 'MSCI World SRI EUR ETF', tipo: 'ETF', importoInvestito: 6000, rendimentoMensileEuro: 120, rendimentoMensilePerc: 2.0, rendimentoCumulativoEuro: 1120, rendimentoCumulativoPerc: 18.6, saldoConto: 7120 },
  { nome: 'S&P 500 Information Tech', tipo: 'ETF', importoInvestito: 8000, rendimentoMensileEuro: 220, rendimentoMensilePerc: 2.75, rendimentoCumulativoEuro: 1450, rendimentoCumulativoPerc: 18.1, saldoConto: 9450 },
  { nome: 'MSCI World Small Cap', tipo: 'ETF', importoInvestito: 3500, rendimentoMensileEuro: -30, rendimentoMensilePerc: -0.85, rendimentoCumulativoEuro: 280, rendimentoCumulativoPerc: 8.0, saldoConto: 3780 },
  { nome: 'iBond Dec 2030 Eur Gov', tipo: 'ETF', importoInvestito: 2000, rendimentoMensileEuro: 15, rendimentoMensilePerc: 0.75, rendimentoCumulativoEuro: 65, rendimentoCumulativoPerc: 3.25, saldoConto: 2065 },
  { nome: 'Eur Overnight Rate Swap', tipo: 'ETF', importoInvestito: 1000, rendimentoMensileEuro: 3.2, rendimentoMensilePerc: 0.32, rendimentoCumulativoEuro: 24, rendimentoCumulativoPerc: 2.4, saldoConto: 1024 },
  { nome: 'Interessi Conto TR (4%)', tipo: 'Liquidita', importoInvestito: 4390, rendimentoMensileEuro: 14.63, rendimentoMensilePerc: 0.33, rendimentoCumulativoEuro: 152.10, rendimentoCumulativoPerc: 3.46, saldoConto: 4542.10 }
];

export interface PensionRecord {
  mese: string;
  tfr: number;
  contrBase: number;
  contrVolont: number;
  contrAzienda: number;
  totMensile: number;
  totCumulativo: number;
}

export const FONDO_PENSIONE_DATA: PensionRecord[] = [
  { mese: 'Gen 26', tfr: 120, contrBase: 44, contrVolont: 20, contrAzienda: 44, totMensile: 228, totCumulativo: 5200 },
  { mese: 'Feb 26', tfr: 120, contrBase: 44, contrVolont: 20, contrAzienda: 44, totMensile: 228, totCumulativo: 5428 },
  { mese: 'Mar 26', tfr: 120, contrBase: 44, contrVolont: 20, contrAzienda: 44, totMensile: 228, totCumulativo: 5656 },
  { mese: 'Apr 26', tfr: 121, contrBase: 44, contrVolont: 20, contrAzienda: 44, totMensile: 229, totCumulativo: 5885 },
  { mese: 'Mag 26', tfr: 121, contrBase: 44, contrVolont: 30, contrAzienda: 44, totMensile: 239, totCumulativo: 6124 },
  { mese: 'Giu 26', tfr: 122, contrBase: 44, contrVolont: 30, contrAzienda: 44, totMensile: 240, totCumulativo: 6364 }
];

// ----------------------------------------------------
// FUEL & WEEKLY CAR EFFICIENCY LOGS (Analisi Consumi)
// ----------------------------------------------------
const INITIAL_HISTORICAL_CAR_MEASUREMENTS: ConsumoAutoWeek[] = [
  { settimana: 'Set W1', data: '05/09/2025', costo: 114.65, quantitaLitri: 64, prezzoAlLitro: 1.791, kmFinali: 124500, kmEffettuati: 950, kmAlLitro: 14.8, esitoSettimana: 'Sopra media', efficienzaPercentuale: 74, costoExtra: 15.42 },
  { settimana: 'Set W2', data: '15/09/2025', costo: 28.66, quantitaLitri: 16.5, prezzoAlLitro: 1.737, kmFinali: 124850, kmEffettuati: 350, kmAlLitro: 21.2, esitoSettimana: 'Ottima', efficienzaPercentuale: 94, costoExtra: 0 },
  { settimana: 'Set W3', data: '19/09/2025', costo: 67.94, quantitaLitri: 38.8, prezzoAlLitro: 1.751, kmFinali: 125510, kmEffettuati: 660, kmAlLitro: 17.0, esitoSettimana: 'Nella media', efficienzaPercentuale: 81, costoExtra: 4.80 },
  { settimana: 'Ott W1', data: '03/10/2025', costo: 54.41, quantitaLitri: 31.4, prezzoAlLitro: 1.733, kmFinali: 126030, kmEffettuati: 520, kmAlLitro: 16.5, esitoSettimana: 'Buona', efficienzaPercentuale: 85, costoExtra: 1.20 },
  { settimana: 'Ott W2', data: '11/10/2025', costo: 22.70, quantitaLitri: 13.1, prezzoAlLitro: 1.732, kmFinali: 126250, kmEffettuati: 220, kmAlLitro: 16.8, esitoSettimana: 'Nella media', efficienzaPercentuale: 83, costoExtra: 0.90 },
  { settimana: 'Ott W3', data: '17/10/2025', costo: 34.04, quantitaLitri: 19.8, prezzoAlLitro: 1.719, kmFinali: 126580, kmEffettuati: 330, kmAlLitro: 16.6, esitoSettimana: 'Nella media', efficienzaPercentuale: 82, costoExtra: 1.05 },
  { settimana: 'Ott W4', data: '25/10/2025', costo: 51.65, quantitaLitri: 30.2, prezzoAlLitro: 1.710, kmFinali: 127160, kmEffettuati: 580, kmAlLitro: 19.2, esitoSettimana: 'Ottima', efficienzaPercentuale: 91, costoExtra: 0 },
  { settimana: 'Nov W1', data: '02/11/2025', costo: 31.37, quantitaLitri: 18.5, prezzoAlLitro: 1.696, kmFinali: 127450, kmEffettuati: 290, kmAlLitro: 15.6, esitoSettimana: 'Sopra media', efficienzaPercentuale: 78, costoExtra: 2.10 },
  { settimana: 'Nov W2', data: '07/11/2025', costo: 29.01, quantitaLitri: 17.2, prezzoAlLitro: 1.687, kmFinali: 127710, kmEffettuati: 260, kmAlLitro: 15.1, esitoSettimana: 'Scarsa', efficienzaPercentuale: 71, costoExtra: 3.50 },
  { settimana: 'Nov W3', data: '22/11/2025', costo: 33.61, quantitaLitri: 19.9, prezzoAlLitro: 1.689, kmFinali: 128030, kmEffettuati: 320, kmAlLitro: 16.1, esitoSettimana: 'Nella media', efficienzaPercentuale: 80, costoExtra: 1.80 },
  { settimana: 'Dic W1', data: '05/12/2025', costo: 34.53, quantitaLitri: 20.6, prezzoAlLitro: 1.676, kmFinali: 128390, kmEffettuati: 360, kmAlLitro: 17.4, esitoSettimana: 'Buona', efficienzaPercentuale: 86, costoExtra: 0 },
  { settimana: 'Dic W2', data: '12/12/2025', costo: 31.28, quantitaLitri: 18.8, prezzoAlLitro: 1.664, kmFinali: 128710, kmEffettuati: 320, kmAlLitro: 17.0, esitoSettimana: 'Nella media', efficienzaPercentuale: 84, costoExtra: 0.50 },
  { settimana: 'Gen W1', data: '02/01/2026', mese: 'gennaio', costo: 21.13, quantitaLitri: 12.5, prezzoAlLitro: 1.690, kmFinali: 129020, kmEffettuati: 310, kmAlLitro: 24.8, esitoSettimana: 'Ottima', efficienzaPercentuale: 98, costoExtra: 0 },
  { settimana: 'Gen W2', data: '16/01/2026', mese: 'gennaio', costo: 31.68, quantitaLitri: 18.5, prezzoAlLitro: 1.712, kmFinali: 129350, kmEffettuati: 330, kmAlLitro: 17.8, esitoSettimana: 'Buona', efficienzaPercentuale: 87, costoExtra: 0.00 },
  { settimana: 'Feb W1', data: '06/02/2026', mese: 'febbraio', costo: 23.54, quantitaLitri: 13.8, prezzoAlLitro: 1.706, kmFinali: 129650, kmEffettuati: 300, kmAlLitro: 21.7, esitoSettimana: 'Ottima', efficienzaPercentuale: 96, costoExtra: 0 },
  { settimana: 'Feb W2', data: '16/02/2026', mese: 'febbraio', costo: 29.74, quantitaLitri: 17.1, prezzoAlLitro: 1.739, kmFinali: 129990, kmEffettuati: 340, kmAlLitro: 19.8, esitoSettimana: 'Ottima', efficienzaPercentuale: 93, costoExtra: 0 },
  { settimana: 'Mar W1', data: '07/03/2026', mese: 'marzo', costo: 31.92, quantitaLitri: 18.2, prezzoAlLitro: 1.754, kmFinali: 130310, kmEffettuati: 320, kmAlLitro: 17.5, esitoSettimana: 'Buona', efficienzaPercentuale: 86, costoExtra: 0 },
  { settimana: 'Mar W2', data: '13/03/2026', mese: 'marzo', costo: 31.91, quantitaLitri: 18.1, prezzoAlLitro: 1.763, kmFinali: 130630, kmEffettuati: 320, kmAlLitro: 17.6, esitoSettimana: 'Buona', efficienzaPercentuale: 86, costoExtra: 0 },
  { settimana: 'Apr W1', data: '07/04/2026', mese: 'aprile', costo: 35.90, quantitaLitri: 20.1, prezzoAlLitro: 1.786, kmFinali: 130980, kmEffettuati: 350, kmAlLitro: 17.4, esitoSettimana: 'Nella media', efficienzaPercentuale: 81, costoExtra: 1.10 },
  { settimana: 'Maggio W1', data: '01/05/2026', mese: 'maggio', costo: 22.06, quantitaLitri: 12.3, prezzoAlLitro: 1.793, kmFinali: 131200, kmEffettuati: 220, kmAlLitro: 17.8, esitoSettimana: 'Buona', efficienzaPercentuale: 85, costoExtra: 0.00 },
  { settimana: 'Maggio W2', data: '09/05/2026', mese: 'maggio', costo: 42.00, quantitaLitri: 23.3, prezzoAlLitro: 1.802, kmFinali: 131610, kmEffettuati: 410, kmAlLitro: 17.5, esitoSettimana: 'Nella media', efficienzaPercentuale: 82, costoExtra: 1.25 },
  { settimana: 'Maggio W3', data: '16/05/2026', mese: 'maggio', costo: 30.00, quantitaLitri: 16.5, prezzoAlLitro: 1.818, kmFinali: 131900, kmEffettuati: 290, kmAlLitro: 17.5, esitoSettimana: 'Nella media', efficienzaPercentuale: 82, costoExtra: 0.90 }
];

export interface EntrataRecord {
  id: string;
  data: string;
  mese: string;
  anno: number;
  descrizione: string;
  categoria: string;
  conto: string;
  importo: number;
}

const INITIAL_ENTRATE_LIST: EntrataRecord[] = [
  { id: 'e1', data: '27/01/2026', mese: 'Gennaio', anno: 2026, descrizione: 'Stipendio Gennaio', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2200 },
  { id: 'e2', data: '27/02/2026', mese: 'Febbraio', anno: 2026, descrizione: 'Stipendio Febbraio', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2150 },
  { id: 'e3', data: '27/03/2026', mese: 'Marzo', anno: 2026, descrizione: 'Stipendio Marzo', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2300 },
  { id: 'e4', data: '27/04/2026', mese: 'Aprile', anno: 2026, descrizione: 'Stipendio Aprile', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2250 },
  { id: 'e5', data: '27/05/2026', mese: 'Maggio', anno: 2026, descrizione: 'Stipendio Maggio', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2400 },
  { id: 'e6', data: '27/06/2026', mese: 'Giugno', anno: 2026, descrizione: 'Stipendio Giugno', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2350 },
  
  { id: 'e7', data: '27/07/2025', mese: 'Luglio', anno: 2025, descrizione: 'Stipendio Luglio', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2100 },
  { id: 'e8', data: '27/08/2025', mese: 'Agosto', anno: 2025, descrizione: 'Stipendio Agosto', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2050 },
  { id: 'e9', data: '27/09/2025', mese: 'Settembre', anno: 2025, descrizione: 'Stipendio Settembre', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2500 },
  { id: 'e10', data: '27/10/2025', mese: 'Ottobre', anno: 2025, descrizione: 'Stipendio Ottobre', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2300 },
  { id: 'e11', data: '27/11/2025', mese: 'Novembre', anno: 2025, descrizione: 'Stipendio Novembre', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2250 },
  { id: 'e12', data: '27/12/2025', mese: 'Dicembre', anno: 2025, descrizione: 'Stipendio Dicembre', categoria: 'Stipendio', conto: 'Unicredit Corrente', importo: 2600 }
];

export const ENTRATE_LIST: EntrataRecord[] = (() => {
  try {
    const val = localStorage.getItem('sf_entrate_list');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
})();

// Helper to aggregate Entrate records into Risparmio monthly records
const applyEntrateAggregation = (baseRisparmio: RisparmioMese[], currentEntrate: EntrataRecord[]): RisparmioMese[] => {
  const aggregated: { [key: string]: number } = {};
  if (currentEntrate && currentEntrate.length > 0) {
    currentEntrate.forEach((e: any) => {
      const m = (e.mese || '').toLowerCase().trim();
      if (!m) return;
      const key = `${m}_${e.anno}`;
      aggregated[key] = (aggregated[key] || 0) + (e.importo || 0);
    });
  }

  return baseRisparmio.map(r => {
    let anno = r.anno;
    let meseClean = (r.mese || '').trim();
    
    const parts = meseClean.split(/\s+/);
    if (parts.length === 2) {
      const yrPart = parseInt(parts[1], 10);
      if (!isNaN(yrPart)) {
        anno = yrPart < 100 ? 2000 + yrPart : yrPart;
      }
      meseClean = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    } else {
      meseClean = meseClean.charAt(0).toUpperCase() + meseClean.slice(1).toLowerCase();
    }
    
    if (!anno) {
      anno = new Date().getFullYear();
    }

    const m = meseClean.toLowerCase();
    const key = `${m}_${anno}`;
    const entrateVal = aggregated[key] !== undefined ? aggregated[key] : (r.entrate || 0);
    const investitoVal = Number(r.investito !== undefined ? r.investito : (r.investiti !== undefined ? r.investiti : 0));
    
    // Se l'oggetto ha già 'risparmioNetto' o 'risparmio' definito (es. importato dal foglio Google o mock locale), lo usiamo direttamente.
    // Altrimenti calcoliamo dinamicamente il risparmio per i dati simulati/locali.
    const risparmioVal = (r.risparmioNetto !== undefined && r.risparmioNetto !== null)
      ? r.risparmioNetto
      : (r.risparmio !== undefined && r.risparmio !== null)
        ? r.risparmio
        : (entrateVal - r.speseTotali - investitoVal);
    
    return {
      ...r,
      mese: meseClean,
      anno: anno,
      entrate: entrateVal,
      investito: investitoVal,
      investiti: investitoVal,
      risparmioNetto: risparmioVal,
      risparmio: risparmioVal,
      andamentoNetto: r.andamentoNetto !== undefined ? Number(r.andamentoNetto) : (r.andamentoRisparmio !== undefined ? (Number(r.andamentoRisparmio) + investitoVal) : undefined)
    };
  });
};

// Initialize exports from localStorage if present
export const TRANSACTIONS: Transaction[] = (() => {
  try {
    const val = localStorage.getItem('sf_transactions');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
})();

export const RISPARMIO_DATA: RisparmioMese[] = (() => {
  let baseData: RisparmioMese[] = [];
  try {
    const val = localStorage.getItem('sf_risparmio_data');
    if (val) baseData = JSON.parse(val);
  } catch {
    baseData = [];
  }
  return applyEntrateAggregation(baseData, ENTRATE_LIST);
})();

export const CONTI_PATRIMONIO: ContoPatrimonio[] = (() => {
  try {
    const val = localStorage.getItem('sf_conti_patrimonio');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
})();

export const RENDIMENTI_MENSILI: RendimentoInvestimenti[] = (() => {
  try {
    const val = localStorage.getItem('sf_rendimenti_mensili');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
})();

export const HISTORICAL_CAR_MEASUREMENTS: ConsumoAutoWeek[] = (() => {
  try {
    const val = localStorage.getItem('sf_historical_car_measurements');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
})();

export const RISPARMIO_HEADERS_STATE: string[] = (() => {
  try {
    const val = localStorage.getItem('sf_risparmio_headers');
    return val ? JSON.parse(val) : ['Mese', 'Entrate', 'Spese Totali', 'Spese Primarie', '35%', 'Spese Secondarie', '15%', 'Spendibile', 'Investiti', '15% Inv', 'Risparmio', '35% Risp', 'Netto Totale', 'Netto 50%'];
  } catch {
    return ['Mese', 'Entrate', 'Spese Totali', 'Spese Primarie', '35%', 'Spese Secondarie', '15%', 'Spendibile', 'Investiti', '15% Inv', 'Risparmio', '35% Risp', 'Netto Totale', 'Netto 50%'];
  }
})();

// Helper to save all data back to localStorage and update in-memory arrays in-place
export const saveToLocalStorage = (data: {
  uscite?: Transaction[];
  risparmio?: RisparmioMese[];
  patrimonio?: ContoPatrimonio[];
  rendimentiInvestimenti?: RendimentoInvestimenti[];
  analisiConsumi?: ConsumoAutoWeek[];
  entrate?: EntrataRecord[];
  capitaleImpegnato?: CapitaleImpegnato[];
  risparmioHeaders?: string[];
  cruscottoInvestimenti?: any[];
  scalable?: any[];
  tradeRepublic?: any[];
  scalableFields?: string[];
  scalableHeaders?: string[];
  tradeRepublicFields?: string[];
  tradeRepublicHeaders?: string[];
  scalableColumnCategories?: Record<string, string>;
  tradeRepublicColumnCategories?: Record<string, string>;
  fondoPensione?: any[];
}) => {
  if (data.cruscottoInvestimenti) {
    localStorage.setItem('sf_cruscotto_data', JSON.stringify(data.cruscottoInvestimenti));
    CRUSCOTTO_DATA.length = 0;
    CRUSCOTTO_DATA.push(...data.cruscottoInvestimenti);
  }
  if (data.risparmioHeaders) {
    localStorage.setItem('sf_risparmio_headers', JSON.stringify(data.risparmioHeaders));
    RISPARMIO_HEADERS_STATE.length = 0;
    RISPARMIO_HEADERS_STATE.push(...data.risparmioHeaders);
  }
  if (data.capitaleImpegnato) {
    localStorage.setItem('sf_capitale_impegnato', JSON.stringify(data.capitaleImpegnato));
    CAPITALE_IMPEGNATO.length = 0;
    CAPITALE_IMPEGNATO.push(...data.capitaleImpegnato);
  }
  if (data.entrate) {
    localStorage.setItem('sf_entrate_list', JSON.stringify(data.entrate));
    ENTRATE_LIST.length = 0;
    ENTRATE_LIST.push(...data.entrate);
  }
  if (data.uscite) {
    localStorage.setItem('sf_transactions', JSON.stringify(data.uscite));
    TRANSACTIONS.length = 0;
    TRANSACTIONS.push(...data.uscite);
  }
  if (data.risparmio) {
    // Override raw 'entrate' values with the dynamic aggregate before saving/pushing memory state
    const processedRisparmio = applyEntrateAggregation(data.risparmio, data.entrate || ENTRATE_LIST);
    localStorage.setItem('sf_risparmio_data', JSON.stringify(processedRisparmio));
    RISPARMIO_DATA.length = 0;
    RISPARMIO_DATA.push(...processedRisparmio);
  }
  if (data.patrimonio) {
    localStorage.setItem('sf_conti_patrimonio', JSON.stringify(data.patrimonio));
    CONTI_PATRIMONIO.length = 0;
    CONTI_PATRIMONIO.push(...data.patrimonio);
  }
  if (data.rendimentiInvestimenti) {
    localStorage.setItem('sf_rendimenti_mensili', JSON.stringify(data.rendimentiInvestimenti));
    RENDIMENTI_MENSILI.length = 0;
    RENDIMENTI_MENSILI.push(...data.rendimentiInvestimenti);
  }
  if (data.analisiConsumi) {
    localStorage.setItem('sf_historical_car_measurements', JSON.stringify(data.analisiConsumi));
    HISTORICAL_CAR_MEASUREMENTS.length = 0;
    HISTORICAL_CAR_MEASUREMENTS.push(...data.analisiConsumi);
  }
  if (data.scalable) {
    localStorage.setItem('sf_scalable', JSON.stringify(data.scalable));
  }
  if (data.tradeRepublic) {
    localStorage.setItem('sf_trade_republic', JSON.stringify(data.tradeRepublic));
  }
  if (data.scalableFields) {
    localStorage.setItem('sf_scalable_fields', JSON.stringify(data.scalableFields));
  }
  if (data.scalableHeaders) {
    localStorage.setItem('sf_scalable_headers', JSON.stringify(data.scalableHeaders));
  }
  if (data.tradeRepublicFields) {
    localStorage.setItem('sf_trade_republic_fields', JSON.stringify(data.tradeRepublicFields));
  }
  if (data.tradeRepublicHeaders) {
    localStorage.setItem('sf_trade_republic_headers', JSON.stringify(data.tradeRepublicHeaders));
  }
  if (data.scalableColumnCategories) {
    localStorage.setItem('sf_scalable_column_categories', JSON.stringify(data.scalableColumnCategories));
  }
  if (data.tradeRepublicColumnCategories) {
    localStorage.setItem('sf_trade_republic_column_categories', JSON.stringify(data.tradeRepublicColumnCategories));
  }
  if (data.fondoPensione) {
    localStorage.setItem('sf_fondo_pensione', JSON.stringify(data.fondoPensione));
  }
};

export const getExportableData = () => {
  let scalable: any[] = [];
  try {
    const val = localStorage.getItem('sf_scalable');
    scalable = val ? JSON.parse(val) : [];
  } catch {}

  let tradeRepublic: any[] = [];
  try {
    const val = localStorage.getItem('sf_trade_republic');
    tradeRepublic = val ? JSON.parse(val) : [];
  } catch {}

  let scalableFields: string[] = [];
  try {
    const val = localStorage.getItem('sf_scalable_fields');
    scalableFields = val ? JSON.parse(val) : [];
  } catch {}

  let scalableHeaders: string[] = [];
  try {
    const val = localStorage.getItem('sf_scalable_headers');
    scalableHeaders = val ? JSON.parse(val) : [];
  } catch {}

  let tradeRepublicFields: string[] = [];
  try {
    const val = localStorage.getItem('sf_trade_republic_fields');
    tradeRepublicFields = val ? JSON.parse(val) : [];
  } catch {}

  let tradeRepublicHeaders: string[] = [];
  try {
    const val = localStorage.getItem('sf_trade_republic_headers');
    tradeRepublicHeaders = val ? JSON.parse(val) : [];
  } catch {}

  let scalableColumnCategories: Record<string, string> = {};
  try {
    const val = localStorage.getItem('sf_scalable_column_categories');
    scalableColumnCategories = val ? JSON.parse(val) : {};
  } catch {}

  let tradeRepublicColumnCategories: Record<string, string> = {};
  try {
    const val = localStorage.getItem('sf_trade_republic_column_categories');
    tradeRepublicColumnCategories = val ? JSON.parse(val) : {};
  } catch {}

  let fondoPensione: any[] = [];
  try {
    const val = localStorage.getItem('sf_fondo_pensione');
    fondoPensione = val ? JSON.parse(val) : FONDO_PENSIONE_DATA;
  } catch {
    fondoPensione = FONDO_PENSIONE_DATA;
  }

  return {
    uscite: TRANSACTIONS,
    risparmio: RISPARMIO_DATA,
    patrimonio: CONTI_PATRIMONIO,
    rendimentiInvestimenti: RENDIMENTI_MENSILI,
    analisiConsumi: HISTORICAL_CAR_MEASUREMENTS,
    entrate: ENTRATE_LIST,
    capitaleImpegnato: CAPITALE_IMPEGNATO,
    risparmioHeaders: RISPARMIO_HEADERS_STATE,
    cruscottoInvestimenti: CRUSCOTTO_DATA,
    cruscottoData: CRUSCOTTO_DATA,
    scalable,
    tradeRepublic,
    scalableFields,
    scalableHeaders,
    tradeRepublicFields,
    tradeRepublicHeaders,
    scalableColumnCategories,
    tradeRepublicColumnCategories,
    fondoPensione,
    scalableInstruments: [],
    tradeRepublicInstruments: []
  };
};

