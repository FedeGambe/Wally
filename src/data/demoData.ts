import type {
  Transaction,
  RisparmioMese,
  ContoPatrimonio,
  CapitaleImpegnato,
  RendimentoInvestimenti,
  ConsumoAutoWeek,
  EntrataRecord,
  InstrumentDetail,
  PensionRecord
} from './mockData';

// ----------------------------------------------------
// DATI DIMOSTRATIVI (MODALITA' INCOGNITO)
// Interamente fittizi: nessun collegamento con conti, importi o
// movimenti reali. Servono solo a mostrare l'interfaccia con
// numeri plausibili quando l'utente vuole nascondere i dati reali.
// ----------------------------------------------------

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 'demo-t-06-01', data: '18/06/2026', mese: 'giugno', descrizione: 'Spesa supermercato', macroCategoria: 'Cibo', categoria: 'Spesa', icon: '🍕', conto: 'Conto Corrente Demo', importo: 64.30, primaria: true },
  { id: 'demo-t-06-02', data: '14/06/2026', mese: 'giugno', descrizione: 'Rifornimento carburante', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Conto Corrente Demo', importo: 45.00, primaria: true },
  { id: 'demo-t-06-03', data: '10/06/2026', mese: 'giugno', descrizione: 'Cena con amici', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Carta Prepagata Demo', importo: 28.50, primaria: false },
  { id: 'demo-t-06-04', data: '07/06/2026', mese: 'giugno', descrizione: 'Abbonamento palestra', macroCategoria: 'Sport', categoria: 'Abbonamento', icon: '🚴', conto: 'Conto Corrente Demo', importo: 39.90, primaria: false },
  { id: 'demo-t-06-05', data: '03/06/2026', mese: 'giugno', descrizione: 'Rata finanziamento auto', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Conto Corrente Demo', importo: 180.00, primaria: true },
  { id: 'demo-t-05-01', data: '27/05/2026', mese: 'maggio', descrizione: 'Visita medica', macroCategoria: 'Salute', categoria: 'Visita Medica', icon: '🩺', conto: 'Conto Corrente Demo', importo: 45.00, primaria: true },
  { id: 'demo-t-05-02', data: '20/05/2026', mese: 'maggio', descrizione: 'Abbonamento streaming', macroCategoria: 'Abbonamenti', categoria: 'Streaming', icon: '🔁', conto: 'Carta Prepagata Demo', importo: 12.99, primaria: false },
  { id: 'demo-t-05-03', data: '12/05/2026', mese: 'maggio', descrizione: 'Rifornimento carburante', macroCategoria: 'Automobile', categoria: 'Rifornimento', icon: '🚘', conto: 'Conto Corrente Demo', importo: 41.20, primaria: true },
  { id: 'demo-t-05-04', data: '05/05/2026', mese: 'maggio', descrizione: 'Rata finanziamento auto', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Conto Corrente Demo', importo: 180.00, primaria: true },
  { id: 'demo-t-05-05', data: '02/05/2026', mese: 'maggio', descrizione: 'Scarpe da corsa', macroCategoria: 'Shopping', categoria: 'Beni Personali', icon: '🛍️', conto: 'Carta Prepagata Demo', importo: 59.90, primaria: false },
  { id: 'demo-t-04-01', data: '28/04/2026', mese: 'aprile', descrizione: 'Weekend fuori porta', macroCategoria: 'Vacanze', categoria: 'Viaggio', icon: '🏝️', conto: 'Conto Corrente Demo', importo: 120.00, primaria: false },
  { id: 'demo-t-04-02', data: '15/04/2026', mese: 'aprile', descrizione: 'Tagliando auto', macroCategoria: 'Automobile', categoria: 'Manutenzione', icon: '🚘', conto: 'Conto Corrente Demo', importo: 160.00, primaria: true },
  { id: 'demo-t-04-03', data: '08/04/2026', mese: 'aprile', descrizione: 'Cinema', macroCategoria: 'Svago', categoria: 'Cinema', icon: '🕺', conto: 'Carta Prepagata Demo', importo: 18.00, primaria: false },
  { id: 'demo-t-04-04', data: '03/04/2026', mese: 'aprile', descrizione: 'Rata finanziamento auto', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Conto Corrente Demo', importo: 180.00, primaria: true },
  { id: 'demo-t-03-01', data: '22/03/2026', mese: 'marzo', descrizione: 'Farmacia', macroCategoria: 'Salute', categoria: 'Medicine', icon: '🩺', conto: 'Conto Corrente Demo', importo: 22.40, primaria: true },
  { id: 'demo-t-03-02', data: '14/03/2026', mese: 'marzo', descrizione: 'Pizza con colleghi', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Carta Prepagata Demo', importo: 16.00, primaria: false },
  { id: 'demo-t-03-03', data: '06/03/2026', mese: 'marzo', descrizione: 'Rata finanziamento auto', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Conto Corrente Demo', importo: 180.00, primaria: true },
  { id: 'demo-t-02-01', data: '19/02/2026', mese: 'febbraio', descrizione: 'Bollo auto', macroCategoria: 'Tasse', categoria: 'Bollo', icon: '🏦', conto: 'Conto Corrente Demo', importo: 78.00, primaria: true },
  { id: 'demo-t-02-02', data: '11/02/2026', mese: 'febbraio', descrizione: 'Regalo compleanno', macroCategoria: 'Shopping', categoria: 'Regalo', icon: '🎁', conto: 'Carta Prepagata Demo', importo: 35.00, primaria: false },
  { id: 'demo-t-02-03', data: '04/02/2026', mese: 'febbraio', descrizione: 'Rata finanziamento auto', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Conto Corrente Demo', importo: 180.00, primaria: true },
  { id: 'demo-t-01-01', data: '24/01/2026', mese: 'gennaio', descrizione: 'Abbonamento palestra annuale', macroCategoria: 'Sport', categoria: 'Abbonamento', icon: '🚴', conto: 'Conto Corrente Demo', importo: 250.00, primaria: false },
  { id: 'demo-t-01-02', data: '16/01/2026', mese: 'gennaio', descrizione: 'Cena di compleanno', macroCategoria: 'Cibo', categoria: 'Ristorante', icon: '🍕', conto: 'Carta Prepagata Demo', importo: 42.00, primaria: false },
  { id: 'demo-t-01-03', data: '05/01/2026', mese: 'gennaio', descrizione: 'Rata finanziamento auto', macroCategoria: 'Automobile', categoria: 'Automobile', icon: '🚘', conto: 'Conto Corrente Demo', importo: 180.00, primaria: true }
];

export const DEMO_ENTRATE_LIST: EntrataRecord[] = [
  { id: 'demo-e1', data: '27/01/2026', mese: 'Gennaio', anno: 2026, descrizione: 'Stipendio Gennaio', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 2000 },
  { id: 'demo-e2', data: '27/02/2026', mese: 'Febbraio', anno: 2026, descrizione: 'Stipendio Febbraio', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 2000 },
  { id: 'demo-e3', data: '27/03/2026', mese: 'Marzo', anno: 2026, descrizione: 'Stipendio Marzo', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 2050 },
  { id: 'demo-e4', data: '27/04/2026', mese: 'Aprile', anno: 2026, descrizione: 'Stipendio Aprile', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 2050 },
  { id: 'demo-e5', data: '27/05/2026', mese: 'Maggio', anno: 2026, descrizione: 'Stipendio Maggio', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 2100 },
  { id: 'demo-e6', data: '27/06/2026', mese: 'Giugno', anno: 2026, descrizione: 'Stipendio Giugno', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 2100 },
  { id: 'demo-e7', data: '27/07/2025', mese: 'Luglio', anno: 2025, descrizione: 'Stipendio Luglio', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 1900 },
  { id: 'demo-e8', data: '27/08/2025', mese: 'Agosto', anno: 2025, descrizione: 'Stipendio Agosto', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 1900 },
  { id: 'demo-e9', data: '27/09/2025', mese: 'Settembre', anno: 2025, descrizione: 'Stipendio Settembre', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 1950 },
  { id: 'demo-e10', data: '27/10/2025', mese: 'Ottobre', anno: 2025, descrizione: 'Stipendio Ottobre', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 1950 },
  { id: 'demo-e11', data: '27/11/2025', mese: 'Novembre', anno: 2025, descrizione: 'Stipendio Novembre', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 1950 },
  { id: 'demo-e12', data: '27/12/2025', mese: 'Dicembre', anno: 2025, descrizione: 'Stipendio Dicembre', categoria: 'Stipendio', conto: 'Conto Corrente Demo', importo: 2200 }
];

export const DEMO_RISPARMIO_DATA: RisparmioMese[] = [
  { mese: 'Gennaio', anno: 2026, entrate: 2000, speseTotali: 850, spesePrimarie: 420, speseSecondarie: 160, investito: 300, risparmioNetto: 850, andamentoRisparmio: 4200 },
  { mese: 'Febbraio', anno: 2026, entrate: 2000, speseTotali: 920, spesePrimarie: 480, speseSecondarie: 180, investito: 280, risparmioNetto: 800, andamentoRisparmio: 5000 },
  { mese: 'Marzo', anno: 2026, entrate: 2050, speseTotali: 780, spesePrimarie: 400, speseSecondarie: 150, investito: 350, risparmioNetto: 920, andamentoRisparmio: 5920 },
  { mese: 'Aprile', anno: 2026, entrate: 2050, speseTotali: 830, spesePrimarie: 410, speseSecondarie: 170, investito: 330, risparmioNetto: 890, andamentoRisparmio: 6810 },
  { mese: 'Maggio', anno: 2026, entrate: 2100, speseTotali: 900, spesePrimarie: 440, speseSecondarie: 190, investito: 350, risparmioNetto: 850, andamentoRisparmio: 7660 },
  { mese: 'Giugno', anno: 2026, entrate: 2100, speseTotali: 860, spesePrimarie: 420, speseSecondarie: 170, investito: 320, risparmioNetto: 920, andamentoRisparmio: 8580 },
  { mese: 'Luglio', anno: 2025, entrate: 1900, speseTotali: 780, spesePrimarie: 380, speseSecondarie: 160, investito: 250, risparmioNetto: 870, andamentoRisparmio: 1450 },
  { mese: 'Agosto', anno: 2025, entrate: 1900, speseTotali: 810, spesePrimarie: 390, speseSecondarie: 170, investito: 250, risparmioNetto: 840, andamentoRisparmio: 2290 },
  { mese: 'Settembre', anno: 2025, entrate: 1950, speseTotali: 850, spesePrimarie: 410, speseSecondarie: 180, investito: 260, risparmioNetto: 840, andamentoRisparmio: 3130 },
  { mese: 'Ottobre', anno: 2025, entrate: 1950, speseTotali: 800, spesePrimarie: 400, speseSecondarie: 150, investito: 270, risparmioNetto: 880, andamentoRisparmio: 4010 },
  { mese: 'Novembre', anno: 2025, entrate: 1950, speseTotali: 870, spesePrimarie: 430, speseSecondarie: 190, investito: 280, risparmioNetto: 800, andamentoRisparmio: 4810 },
  { mese: 'Dicembre', anno: 2025, entrate: 2200, speseTotali: 980, spesePrimarie: 480, speseSecondarie: 220, investito: 300, risparmioNetto: 920, andamentoRisparmio: 5730 }
];

export const DEMO_CONTI_PATRIMONIO: ContoPatrimonio[] = [
  { id: 'demo-1', categoria: 'Conto Corrente Demo', capitaleTotale: 8200.00, capitaleDisponibile: 5200.00, capitaleInvestito: 0, capitaleImpegnato: 3000.00, sogliaAllarme: 4000, allarmeSoglia: 60, rimanenteSoglia: 1200.00 },
  { id: 'demo-2', categoria: 'Conto Deposito Demo', capitaleTotale: 9000.00, capitaleDisponibile: 9000.00, capitaleInvestito: 0, capitaleImpegnato: 0, sogliaAllarme: 4000 },
  { id: 'demo-3', categoria: 'Broker Alpha Demo', capitaleTotale: 15000.00, capitaleDisponibile: 2000.00, capitaleInvestito: 13000.00, capitaleImpegnato: 0, sogliaAllarme: 4000 },
  { id: 'demo-4', categoria: 'Broker Beta Demo', capitaleTotale: 6000.00, capitaleDisponibile: 800.00, capitaleInvestito: 5200.00, capitaleImpegnato: 0, sogliaAllarme: 4000 },
  { id: 'demo-5', categoria: 'Contanti Demo', capitaleTotale: 300.00, capitaleDisponibile: 300.00, capitaleInvestito: 0, capitaleImpegnato: 0, sogliaAllarme: 4000 }
];

export const DEMO_CAPITALE_IMPEGNATO: CapitaleImpegnato[] = [
  { categoria: 'Rata Finanziamento Auto (Demo)', capitaleImpegnato: 2200.00 },
  { categoria: 'Assicurazione Annuale Accantonata (Demo)', capitaleImpegnato: 500.00 },
  { categoria: 'Altri impegni finanziari (Demo)', capitaleImpegnato: 300.00 }
];

export const DEMO_RENDIMENTI_MENSILI: RendimentoInvestimenti[] = [
  { mese: 'Lug 25', rendimentoMensileEuro: 150, rendimentoMensilePerc: 0.9, importoMensileInvestito: 250, rendimentoCumulativoEuro: 900, rendimentoCumulativoPerc: 6.5, importoInvestitoCumulato: 13800, valoreAttualePortafoglio: 14700 },
  { mese: 'Ago 25', rendimentoMensileEuro: -90, rendimentoMensilePerc: -0.55, importoMensileInvestito: 250, rendimentoCumulativoEuro: 810, rendimentoCumulativoPerc: 5.9, importoInvestitoCumulato: 14050, valoreAttualePortafoglio: 14860 },
  { mese: 'Set 25', rendimentoMensileEuro: 200, rendimentoMensilePerc: 1.3, importoMensileInvestito: 260, rendimentoCumulativoEuro: 1010, rendimentoCumulativoPerc: 6.9, importoInvestitoCumulato: 14310, valoreAttualePortafoglio: 15320 },
  { mese: 'Ott 25', rendimentoMensileEuro: 120, rendimentoMensilePerc: 0.75, importoMensileInvestito: 270, rendimentoCumulativoEuro: 1130, rendimentoCumulativoPerc: 7.5, importoInvestitoCumulato: 14580, valoreAttualePortafoglio: 15710 },
  { mese: 'Nov 25', rendimentoMensileEuro: 180, rendimentoMensilePerc: 1.1, importoMensileInvestito: 280, rendimentoCumulativoEuro: 1310, rendimentoCumulativoPerc: 8.4, importoInvestitoCumulato: 14860, valoreAttualePortafoglio: 16170 },
  { mese: 'Dic 25', rendimentoMensileEuro: 260, rendimentoMensilePerc: 1.5, importoMensileInvestito: 300, rendimentoCumulativoEuro: 1570, rendimentoCumulativoPerc: 9.6, importoInvestitoCumulato: 15160, valoreAttualePortafoglio: 16730 },
  { mese: 'Gen 26', rendimentoMensileEuro: -60, rendimentoMensilePerc: -0.35, importoMensileInvestito: 300, rendimentoCumulativoEuro: 1510, rendimentoCumulativoPerc: 9.1, importoInvestitoCumulato: 15460, valoreAttualePortafoglio: 16970 },
  { mese: 'Feb 26', rendimentoMensileEuro: 140, rendimentoMensilePerc: 0.8, importoMensileInvestito: 280, rendimentoCumulativoEuro: 1650, rendimentoCumulativoPerc: 9.7, importoInvestitoCumulato: 15740, valoreAttualePortafoglio: 17390 },
  { mese: 'Mar 26', rendimentoMensileEuro: 230, rendimentoMensilePerc: 1.3, importoMensileInvestito: 350, rendimentoCumulativoEuro: 1880, rendimentoCumulativoPerc: 10.6, importoInvestitoCumulato: 16090, valoreAttualePortafoglio: 17970 },
  { mese: 'Apr 26', rendimentoMensileEuro: 270, rendimentoMensilePerc: 1.5, importoMensileInvestito: 330, rendimentoCumulativoEuro: 2150, rendimentoCumulativoPerc: 11.7, importoInvestitoCumulato: 16420, valoreAttualePortafoglio: 18570 },
  { mese: 'Mag 26', rendimentoMensileEuro: -80, rendimentoMensilePerc: -0.4, importoMensileInvestito: 350, rendimentoCumulativoEuro: 2070, rendimentoCumulativoPerc: 11.1, importoInvestitoCumulato: 16770, valoreAttualePortafoglio: 18840 },
  { mese: 'Giu 26', rendimentoMensileEuro: 300, rendimentoMensilePerc: 1.6, importoMensileInvestito: 320, rendimentoCumulativoEuro: 2370, rendimentoCumulativoPerc: 12.6, importoInvestitoCumulato: 17090, valoreAttualePortafoglio: 19460 }
];

export const DEMO_HISTORICAL_CAR_MEASUREMENTS: ConsumoAutoWeek[] = [
  { settimana: 'Gen W1', data: '02/01/2026', mese: 'gennaio', costo: 24.00, quantitaLitri: 14.0, prezzoAlLitro: 1.714, kmFinali: 50200, kmEffettuati: 300, kmAlLitro: 21.4, kmAlLitroAuto: 21.0, euroPer100Km: 8.00, kmPersi: 0, esitoSettimana: 'Ottima', efficienzaPercentuale: 0.95, costoExtra: 0 },
  { settimana: 'Gen W2', data: '16/01/2026', mese: 'gennaio', costo: 33.00, quantitaLitri: 19.0, prezzoAlLitro: 1.737, kmFinali: 50520, kmEffettuati: 320, kmAlLitro: 16.8, kmAlLitroAuto: 16.5, euroPer100Km: 10.31, kmPersi: 3.2, esitoSettimana: 'Buona', efficienzaPercentuale: 0.85, costoExtra: 0.5 },
  { settimana: 'Feb W1', data: '06/02/2026', mese: 'febbraio', costo: 25.00, quantitaLitri: 14.5, prezzoAlLitro: 1.724, kmFinali: 50820, kmEffettuati: 300, kmAlLitro: 20.7, kmAlLitroAuto: 20.3, euroPer100Km: 8.33, kmPersi: 0, esitoSettimana: 'Ottima', efficienzaPercentuale: 0.93, costoExtra: 0 },
  { settimana: 'Mar W1', data: '06/03/2026', mese: 'marzo', costo: 30.00, quantitaLitri: 17.1, prezzoAlLitro: 1.754, kmFinali: 51140, kmEffettuati: 320, kmAlLitro: 18.7, kmAlLitroAuto: 18.4, euroPer100Km: 9.38, kmPersi: 0, esitoSettimana: 'Buona', efficienzaPercentuale: 0.88, costoExtra: 0 },
  { settimana: 'Apr W1', data: '07/04/2026', mese: 'aprile', costo: 34.00, quantitaLitri: 19.0, prezzoAlLitro: 1.789, kmFinali: 51470, kmEffettuati: 330, kmAlLitro: 17.4, kmAlLitroAuto: 17.1, euroPer100Km: 10.30, kmPersi: 5.1, esitoSettimana: 'Nella media', efficienzaPercentuale: 0.81, costoExtra: 1.10 },
  { settimana: 'Mag W1', data: '01/05/2026', mese: 'maggio', costo: 21.00, quantitaLitri: 11.7, prezzoAlLitro: 1.795, kmFinali: 51680, kmEffettuati: 210, kmAlLitro: 17.9, kmAlLitroAuto: 17.6, euroPer100Km: 10.00, kmPersi: 0, esitoSettimana: 'Buona', efficienzaPercentuale: 0.85, costoExtra: 0 },
  { settimana: 'Giu W1', data: '05/06/2026', mese: 'giugno', costo: 40.00, quantitaLitri: 22.2, prezzoAlLitro: 1.802, kmFinali: 52080, kmEffettuati: 400, kmAlLitro: 18.0, kmAlLitroAuto: 17.7, euroPer100Km: 10.00, kmPersi: 0, esitoSettimana: 'Buona', efficienzaPercentuale: 0.86, costoExtra: 0 }
];

export const DEMO_SCALABLE_INSTRUMENTS: InstrumentDetail[] = [
  { nome: 'Indice Azionario Europa Demo', tipo: 'ETF', importoInvestito: 1800, rendimentoMensileEuro: 32, rendimentoMensilePerc: 1.8, rendimentoCumulativoEuro: 190, rendimentoCumulativoPerc: 10.5, saldoConto: 1990 },
  { nome: 'Indice Globale Value Demo', tipo: 'ETF', importoInvestito: 2200, rendimentoMensileEuro: -12, rendimentoMensilePerc: -0.5, rendimentoCumulativoEuro: 230, rendimentoCumulativoPerc: 10.4, saldoConto: 2430 },
  { nome: 'Azienda Demo Alpha S.p.A.', tipo: 'Azioni', importoInvestito: 400, rendimentoMensileEuro: 28, rendimentoMensilePerc: 7.0, rendimentoCumulativoEuro: 70, rendimentoCumulativoPerc: 17.5, saldoConto: 470 },
  { nome: 'Liquidità Broker Alpha Demo', tipo: 'Liquidita', importoInvestito: 200, rendimentoMensileEuro: 0.8, rendimentoMensilePerc: 0.4, rendimentoCumulativoEuro: 3.6, rendimentoCumulativoPerc: 1.8, saldoConto: 203.6 }
];

export const DEMO_TRADE_REPUBLIC_INSTRUMENTS: InstrumentDetail[] = [
  { nome: 'Indice Mondiale Sostenibile Demo', tipo: 'ETF', importoInvestito: 4200, rendimentoMensileEuro: 85, rendimentoMensilePerc: 2.0, rendimentoCumulativoEuro: 780, rendimentoCumulativoPerc: 18.6, saldoConto: 4980 },
  { nome: 'Indice Tecnologico USA Demo', tipo: 'ETF', importoInvestito: 5200, rendimentoMensileEuro: 140, rendimentoMensilePerc: 2.7, rendimentoCumulativoEuro: 900, rendimentoCumulativoPerc: 17.3, saldoConto: 6100 },
  { nome: 'Obbligazionario Governativo Demo', tipo: 'ETF', importoInvestito: 1400, rendimentoMensileEuro: 10, rendimentoMensilePerc: 0.7, rendimentoCumulativoEuro: 45, rendimentoCumulativoPerc: 3.2, saldoConto: 1445 },
  { nome: 'Interessi Conto Broker Beta Demo', tipo: 'Liquidita', importoInvestito: 800, rendimentoMensileEuro: 2.6, rendimentoMensilePerc: 0.3, rendimentoCumulativoEuro: 28, rendimentoCumulativoPerc: 3.5, saldoConto: 828 }
];

export const DEMO_FONDO_PENSIONE_DATA: PensionRecord[] = [
  { mese: 'Gen 26', tfr: 100, contrBase: 40, contrVolont: 15, contrAzienda: 40, totMensile: 195, totCumulativo: 3200 },
  { mese: 'Feb 26', tfr: 100, contrBase: 40, contrVolont: 15, contrAzienda: 40, totMensile: 195, totCumulativo: 3395 },
  { mese: 'Mar 26', tfr: 100, contrBase: 40, contrVolont: 15, contrAzienda: 40, totMensile: 195, totCumulativo: 3590 },
  { mese: 'Apr 26', tfr: 101, contrBase: 40, contrVolont: 20, contrAzienda: 40, totMensile: 201, totCumulativo: 3791 },
  { mese: 'Mag 26', tfr: 101, contrBase: 40, contrVolont: 20, contrAzienda: 40, totMensile: 201, totCumulativo: 3992 },
  { mese: 'Giu 26', tfr: 102, contrBase: 40, contrVolont: 20, contrAzienda: 40, totMensile: 202, totCumulativo: 4194 }
];

// Formato allineato a SHEETS_CONFIG (dataKey 'cruscottoInvestimenti')
export const DEMO_CRUSCOTTO_DATA: any[] = [
  {
    anno: 2026,
    azioniInvestitoCum: 8600,
    azioniInvestitoAnno: 1700,
    obbligazioniInvestitoCum: 4400,
    obbligazioniInvestitoAnno: 800,
    investitoCumulativo: 17090,
    investitoAnnuale: 1930,
    rendimentoCumulativoEuro: 2370,
    rendimentoAnnualeEuro: 1930,
    rendimentoMedioMensilePerc: 1.05,
    rendimentoAnnuoStimatoPerc: 6.8
  },
  {
    anno: 2025,
    azioniInvestitoCum: 6900,
    azioniInvestitoAnno: 6900,
    obbligazioniInvestitoCum: 3600,
    obbligazioniInvestitoAnno: 3600,
    investitoCumulativo: 15160,
    investitoAnnuale: 15160,
    rendimentoCumulativoEuro: 1570,
    rendimentoAnnualeEuro: 1570,
    rendimentoMedioMensilePerc: 0.95,
    rendimentoAnnuoStimatoPerc: 6.2
  }
];

export const DEMO_RISPARMIO_HEADERS: string[] = [
  'Mese', 'Entrate', 'Spese Totali', 'Spese Primarie', '35%', 'Spese Secondarie', '15%',
  'Spendibile', 'Investiti', '15% Inv', 'Risparmio', '35% Risp', 'Netto Totale', 'Netto 50%'
];
