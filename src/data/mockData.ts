import {
  DEMO_TRANSACTIONS,
  DEMO_ENTRATE_LIST,
  DEMO_RISPARMIO_DATA,
  DEMO_CONTI_PATRIMONIO,
  DEMO_CAPITALE_IMPEGNATO,
  DEMO_RENDIMENTI_MENSILI,
  DEMO_HISTORICAL_CAR_MEASUREMENTS,
  DEMO_CRUSCOTTO_DATA,
  DEMO_SCALABLE_INSTRUMENTS,
  DEMO_TRADE_REPUBLIC_INSTRUMENTS,
  DEMO_FONDO_PENSIONE_DATA,
  DEMO_RISPARMIO_HEADERS
} from './demoData';

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
  kmAlLitroAuto?: number;
  euroPer100Km?: number;
  kmPersi?: number;
  efficienzaPercentuale: number;
  esitoSettimana: 'Ottima' | 'Buona' | 'Nella media' | 'Sopra media' | 'Scarsa';
  costoExtra: number;
}

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

export interface EntrataRecord {
  id: string;
  data: string;
  mese: string;
  anno: number;
  descrizione: string;
  categoria: string;
  conto: string;
  importo: number;
  dettagli?: string;
}

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

// ----------------------------------------------------
// MODALITA' INCOGNITO
// Quando attiva, getExportableData() restituisce dati interamente
// fittizi (vedi demoData.ts) al posto dei dati reali salvati in
// localStorage. Non modifica né legge mai i dati reali: e' sicuro
// tenerla attiva anche mentre si lavora sull'app.
// ----------------------------------------------------
export const isIncognitoModeEnabled = (): boolean => {
  return localStorage.getItem('sf_incognito_mode') === 'true';
};

export const setIncognitoModeEnabled = (enabled: boolean): void => {
  localStorage.setItem('sf_incognito_mode', String(enabled));
};

const getDemoExportableData = () => ({
  uscite: DEMO_TRANSACTIONS,
  risparmio: applyEntrateAggregation(DEMO_RISPARMIO_DATA, DEMO_ENTRATE_LIST),
  patrimonio: DEMO_CONTI_PATRIMONIO,
  rendimentiInvestimenti: DEMO_RENDIMENTI_MENSILI,
  analisiConsumi: DEMO_HISTORICAL_CAR_MEASUREMENTS,
  entrate: DEMO_ENTRATE_LIST,
  capitaleImpegnato: DEMO_CAPITALE_IMPEGNATO,
  risparmioHeaders: DEMO_RISPARMIO_HEADERS,
  cruscottoInvestimenti: DEMO_CRUSCOTTO_DATA,
  cruscottoData: DEMO_CRUSCOTTO_DATA,
  scalable: [],
  tradeRepublic: [],
  scalableFields: [],
  scalableHeaders: [],
  tradeRepublicFields: [],
  tradeRepublicHeaders: [],
  scalableColumnCategories: {},
  tradeRepublicColumnCategories: {},
  fondoPensione: DEMO_FONDO_PENSIONE_DATA,
  scalableInstruments: DEMO_SCALABLE_INSTRUMENTS,
  tradeRepublicInstruments: DEMO_TRADE_REPUBLIC_INSTRUMENTS
});

// `incognito` va passato esplicitamente da chi mostra i dati a video.
// Di default e' `false`: i flussi di sincronizzazione con Google Sheets
// (push/pull) non devono MAI ricevere dati demo per errore.
export const getExportableData = (incognito: boolean = false) => {
  if (incognito) {
    return getDemoExportableData();
  }

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
    scalableInstruments: SCALABLE_INSTRUMENTS,
    tradeRepublicInstruments: TRADE_REPUBLIC_INSTRUMENTS
  };
};

