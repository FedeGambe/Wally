/**
 * Google Sheets Service
 * Gestisce la lettura e la scrittura dei dati finanziari allineandosi perfettamente
 * con la struttura reale del tuo foglio Google (Uscite, Risparmio, Patrimonio, Rendimenti, Analisi consumi, Entrate).
 */

export interface SheetsData {
  transactions: any[];
  risparmioData: any[];
  contiPatrimonio: any[];
  historicalCarMeasurements: any[];
  rendimentiMensili: any[];
  entrateList?: any[];
  capitaleImpegnato?: any[];
  risparmioHeaders?: string[];
  cruscottoData?: any[];
  scalableInstruments?: any[];
  tradeRepublicInstruments?: any[];
}

// Convert arrays of objects to row arrays for Google Sheets
const mapToRows = (header: string[], items: any[], fieldsOnObject: string[]) => {
  const rows = [header];
  items.forEach(item => {
    const row = fieldsOnObject.map(field => {
      const val = item[field];
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return val;
    });
    rows.push(row);
  });
  return rows;
};

// Helper to safely parse numbers supporting both Italian/European (1.234,56 or 123,45) and US (1,234.56 or 123.45) formatting
const parseLocalizedNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null) return 0;
  
  let str = String(val).trim().replace(/[^0-9.,-]/g, ''); // Keep only numbers, dot, comma, minus
  if (!str) return 0;

  const firstComma = str.indexOf(',');
  const lastComma = str.lastIndexOf(',');
  const firstDot = str.indexOf('.');
  const lastDot = str.lastIndexOf('.');

  if (firstComma !== -1 && firstDot !== -1) {
    if (lastComma > lastDot) {
      // European style: e.g. 1.234,56 -> remove dots, replace comma with dot
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // US style: e.g. 1,234.56 -> remove commas, keep dot
      str = str.replace(/,/g, '');
    }
  } else if (firstComma !== -1) {
    // Only comma(s) exist
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount === 1) {
      // Single comma is a decimal separator in European/Italian locale (e.g. 123,45)
      str = str.replace(/,/g, '.');
    } else {
      // Multiple commas are thousands separators in US style (e.g. 1,234,567)
      str = str.replace(/,/g, '');
    }
  } else if (firstDot !== -1) {
    // Only dot(s) exist
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots are thousands separators (e.g. 1.234.567) -> remove them
      str = str.replace(/\./g, '');
    } else {
      // Single dot: e.g. 1.234 or 123.45
      // If there are exactly 3 digits after the dot, treat as thousands separator in European/Italian locale (e.g. 1.500)
      const parts = str.split('.');
      if (parts[1] && parts[1].length === 3) {
        str = str.replace(/\./g, '');
      }
    }
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper to parse date strings in DD/MM/YYYY, YYYY-MM-DD or Google Sheets serial formats
const parseDateString = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  // 1. If it's a pure number (Google Sheets serial date representation)
  if (/^\d+(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str);
    const baseDate = new Date(1899, 11, 30);
    const date = new Date(baseDate.getTime() + Math.floor(serial) * 24 * 60 * 60 * 1000);
    return date;
  }

  // 2. Try simple regex splits for DD/MM/YYYY or YYYY-MM-DD or other dash/slash delimiters
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (p0 > 1000) {
        // format: YYYY/MM/DD
        return new Date(p0, p1 - 1, p2);
      } else if (p2 > 1000) {
        // format: DD/MM/YYYY
        return new Date(p2, p1 - 1, p0);
      } else {
        // format: YY/MM/DD or DD/MM/YY
        const year = p2 < 50 ? 2000 + p2 : 1900 + p2;
        return new Date(year, p1 - 1, p0);
      }
    }
  }

  // 3. Last fallback: Javascript native Date parse
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Convert sheet rows back to arrays of objects using dynamic header column lookup
const mapFromRowsWithHeaders = (
  rows: any[][],
  fieldsOnObject: string[],
  headersList: string[],
  booleanFields: string[] = [],
  numberFields: string[] = []
) => {
  if (!rows || rows.length <= 1) return [];
  const actualHeaders = rows[0].map(h => String(h || '').trim().toLowerCase());
  
  // Map fields to sheet column indices dynamically based on expected headers
  const fieldToColIdx = fieldsOnObject.map((field, idx) => {
    const expectedHeader = headersList[idx].toLowerCase().trim();
    
    // 1. Exact match with expected header name
    let colIdx = actualHeaders.indexOf(expectedHeader);
    
    // 2. Fallback: match with field name
    if (colIdx === -1) {
      colIdx = actualHeaders.indexOf(field.toLowerCase().trim());
    }
    
    // 3. Fallback: loose case-insensitive contains match
    if (colIdx === -1) {
      colIdx = actualHeaders.findIndex(h => {
        let cleanH = h.replace(/[^a-z0-9]/g, '').toLowerCase().replace(/comulativo/g, 'cumulativo');
        let cleanExpected = expectedHeader.replace(/[^a-z0-9]/g, '').toLowerCase().replace(/comulativo/g, 'cumulativo');
        let cleanField = field.toLowerCase().replace(/[^a-z0-9]/g, '').toLowerCase().replace(/comulativo/g, 'cumulativo');
        
        // Exact normalized match is safe and preferred
        if (cleanH === cleanExpected || cleanH === cleanField) {
          return true;
        }
        
        // Prevent confusion between 'risparmio' and 'andamento risparmio'
        const isRisparmioField = cleanExpected === 'risparmio' || cleanField === 'risparmio';
        const isAndamentoField = cleanExpected.includes('andamento') || cleanField.includes('andamento');
        const isHAndamento = cleanH.includes('andamento');
        
        if (isRisparmioField && isHAndamento) {
          return false;
        }
        if (isAndamentoField && !isHAndamento) {
          return false;
        }

        return cleanH.includes(cleanExpected) || cleanExpected.includes(cleanH);
      });
    }
    
    return colIdx;
  });

  const items: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: any = {};
    fieldsOnObject.forEach((field, fieldIdx) => {
      const colIdx = fieldToColIdx[fieldIdx];
      const val = colIdx !== -1 ? row[colIdx] : undefined;
      
      if (val === undefined || val === null || val === '') {
        obj[field] = numberFields.includes(field) ? 0 : booleanFields.includes(field) ? false : '';
        return;
      }
      
      if (booleanFields.includes(field)) {
        const uVal = String(val).toUpperCase();
        obj[field] = uVal === 'TRUE' || uVal === 'SI' || uVal === 'SÌ';
      } else if (numberFields.includes(field)) {
        obj[field] = parseLocalizedNumber(val);
      } else {
        obj[field] = val;
      }
    });
    items.push(obj);
  }
  return items;
};

// 3.1 Foglio: Uscite
const TX_FIELDS = ['data', 'mese', 'descrizione', 'macroCategoria', 'categoria', 'icon', 'conto', 'importo', 'primaria'];
const TX_HEADERS = ['Data', 'Mese', 'Descrizione della transazione', 'Macro categoria', 'Categoria della transazione', 'Icon', 'Conto utilizzato', 'Importo', 'Primarie'];

// 3.2 Foglio: Entrate (6 colonne reali)
const ENTRATE_FIELDS = ['mese', 'anno', 'categoria', 'conto', 'importo', 'dettagli'];
const ENTRATE_HEADERS = ['Mese', 'Anno', 'Categoria', 'Conto', 'Importo', 'Dettagli'];

// 3.3 Foglio: Risparmio (Tutte le 14 colonne reali!)
const RISPARMIO_FIELDS = ['mese', 'entrate', 'speseTotali', 'spesePrimarie', 'prim35', 'speseSecondarie', 'sec15', 'spendibile', 'investiti', 'inv15', 'risparmio', 'risp35', 'nettoTotale', 'netto50', 'andamentoRisparmio'];
const RISPARMIO_HEADERS = ['Mese', 'Entrate', 'Spese Totali', 'Spese Primarie', '35%', 'Spese Secondarie', '15%', 'Spendibile', 'Investiti', '15% Inv', 'Risparmio', '35% Risp', 'Netto Totale', 'Netto 50%', 'Andamento Risparmio'];

// 3.4 Foglio: Patrimonio
const PATRIMONIO_FIELDS = ['categoria', 'capitaleTotale', 'capitaleDisponibile', 'capitaleInvestito', 'capitaleImpegnato', 'allarmeSoglia', 'rimanenteSoglia'];
const PATRIMONIO_HEADERS = ['Categoria', 'Capitale totale', 'Capitale disponibile', 'Capitale Investito', 'Capitale Impegnato', 'Allarme soglia 5000', 'Rimanente soglia'];

// 3.5 Foglio: Capitale Impegnato (Debiti e scadenze)
const CAPITALE_IMPEGNATO_FIELDS = ['categoria', 'capitaleImpegnato'];
const CAPITALE_IMPEGNATO_HEADERS = ['Categoria', 'Capitale Impegnato'];

// 3.6 Foglio: Rendimenti
const RENDIMENTI_FIELDS = ['mese', 'rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestito', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'importoInvestitoCumulato', 'valoreAttualePortafoglio'];
const RENDIMENTI_HEADERS = ['Mese', 'Rendimento mensile €', 'Rendimento mensile %', 'Importo Mensile investito', 'Rendimento comulativo €', 'Rendimento comulativo %', 'Importo Investito', 'Somma attuale'];

// 3.6.1 Foglio: Cruscotto
const CRUSCOTTO_FIELDS = [
  'anno', 
  'azioniInvestitoCum', 
  'azioniInvestitoAnno', 
  'obbligazioniInvestitoCum', 
  'obbligazioniInvestitoAnno', 
  'investitoCumulativo', 
  'investitoAnnuale', 
  'rendimentoCumulativoEuro', 
  'rendimentoAnnualeEuro', 
  'rendimentoMedioMensilePerc', 
  'rendimentoAnnuoStimatoPerc'
];
const CRUSCOTTO_HEADERS = [
  'Anno', 
  'Azioni comulativo', 
  'Azioni annuale', 
  'Obbligazioni cumulativo', 
  'Obbligazioni annuale', 
  'Investito cumulativo', 
  'Investito annuale', 
  'Rendimento cumulativo', 
  'Rendimento annuale', 
  'Rendimento % medio', 
  'Rendimento % annuale'
];

// 3.7 Foglio: Analisi consumi (Fino alla colonna P!)
const CONSUMI_FIELDS = [
  'data', 'costo', 'quantitaLitri', 'prezzoAlLitro', 'kmFinali', 'kmEffettuati', 
  'litriPrecedenti', 'kmAlLitro', 'kmAlLitroAuto', 'euroPer100Km', 'litriPer100Km', 
  'kmPersi', 'kmPersiMediani', 'costoExtra', 'esitoSettimana', 'efficienzaPercentuale'
];
const CONSUMI_HEADERS = [
  'Data', 'Costo', 'Quantità (Lt)', '€/Lt', 'Km finali', 'Km effettuati', 
  'Litri precedenti', 'Km/lt', 'Km/lt (auto)', '€/100km', 'Lt/100km', 
  'Km persi', 'km persi mediani', 'Costo extra', 'Esito settimana', 'Efficenza'
];





//

export const createSpreadsheet = async (accessToken: string): Promise<string> => {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'StarFinance - Dashboard Economica'
      },
      sheets: [
        { properties: { title: 'Uscite' } },
        { properties: { title: 'Risparmio' } },
        { properties: { title: 'Patrimonio' } },
        { properties: { title: 'Rendimenti' } },
        { properties: { title: 'Analisi consumi' } },
        { properties: { title: 'Entrate' } },
        { properties: { title: 'Capitale Impegnato' } },
        { properties: { title: 'Cruscotto' } }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to create spreadsheet:', errorBody);
    throw new Error(`Failed to create Google Sheet: ${response.statusText}`);
  }

  const result = await response.json();
  return result.spreadsheetId;
};

export const ensureSheetsExist = async (accessToken: string, spreadsheetId: string): Promise<void> => {
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const getResponse = await fetch(getUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!getResponse.ok) {
    const errorBody = await getResponse.text();
    console.error('Failed to fetch spreadsheet metadata:', errorBody);
    if (getResponse.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    throw new Error(`Impossibile accedere al file: ${getResponse.statusText}`);
  }

  const metadata = await getResponse.json();
  
  // Normalizzazione dei nomi delle schede esistenti per fare confronti sicuri al 100%
  // (Rimuove spazi finali e trasforma tutto in minuscolo)
  const existingSheetsNormalized = (metadata.sheets || []).map((s: any) => 
    String(s.properties?.title || '').trim().toLowerCase()
  );
  
  const REQUIRED_SHEETS = ['Uscite', 'Risparmio', 'Patrimonio', 'Rendimenti', 'Analisi consumi', 'Entrate', 'Capitale Impegnato', 'Cruscotto'];
  
  // Trova solo i fogli che mancano realmente (evitando collisioni case-insensitive)
  const missingSheets = REQUIRED_SHEETS.filter(title => {
    const targetNormalized = title.trim().toLowerCase();
    return !existingSheetsNormalized.includes(targetNormalized);
  });

  if (missingSheets.length > 0) {
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const requests = missingSheets.map(title => ({
      addSheet: {
        properties: {
          title
        }
      }
    }));

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text();
      console.error('ERRORE GOOGLE SHEETS API DETTAGLIATO:', errorBody);
      throw new Error(`Errore durante l'aggiunta delle schede mancanti: ${updateResponse.statusText}`);
    }
  }
};

export const fetchSpreadsheetData = async (accessToken: string, spreadsheetId: string): Promise<SheetsData> => {
  await ensureSheetsExist(accessToken, spreadsheetId);

  // Range corretti ed estesi per coprire tutte le colonne reali
  const ranges = [
    'Uscite!A:I',
    'Risparmio!A:O',
    'Patrimonio!A:H',
    'Rendimenti!A:H',
    'Analisi consumi!A:P',
    'Entrate!A:F',
    'Capitale Impegnato!A:C',
    'Cruscotto!A:L'
  ];

  // Dynamic sheets metadata retrieval to check if Scalable / Trade Republic exist
  let actualSheets: string[] = [];
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaResponse = await fetch(metaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (metaResponse.ok) {
      const metadata = await metaResponse.json();
      actualSheets = (metadata.sheets || []).map((s: any) => String(s.properties?.title || ''));
    }
  } catch (err) {
    console.error('Error fetching spreadsheet metadata titles:', err);
  }

  const hasScalable = actualSheets.some(s => s.toLowerCase() === 'scalable');
  const hasTradeRepublic = actualSheets.some(s => s.toLowerCase() === 'trade republic');

  if (hasScalable) {
    ranges.push('Scalable');
  }
  if (hasTradeRepublic) {
    ranges.push('Trade Republic');
  }
  
  const rangesParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to fetch spreadsheet data:', errorBody);
    if (response.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    throw new Error(`Failed to read from Google Sheet: ${response.statusText}`);
  }

  const result = await response.json();
  const valueRanges = result.valueRanges || [];
  
  // Dynamic lookup of ranges by checking their range name rather than array order
  const getValueRangeForSheet = (sheetName: string): any[][] => {
    const targetLower = sheetName.toLowerCase() + '!';
    const found = valueRanges.find((vr: any) => {
      const vrRange = String(vr?.range || '').replace(/'/g, '').toLowerCase();
      return vrRange.startsWith(targetLower);
    });
    return found?.values || [];
  };

  const txRows = getValueRangeForSheet('Uscite');
  const risparmioRows = getValueRangeForSheet('Risparmio');
  const patrimonioRows = getValueRangeForSheet('Patrimonio');
  const rendimentiRows = getValueRangeForSheet('Rendimenti');
  const consumiRows = getValueRangeForSheet('Analisi consumi');
  const entrateRows = getValueRangeForSheet('Entrate');
  const capitaleImpegnatoRows = getValueRangeForSheet('Capitale Impegnato');

  const transactions = mapFromRowsWithHeaders(txRows, TX_FIELDS, TX_HEADERS, ['primaria'], ['importo']);
  
  // Vediamo come mapFromRowsWithHeaders accoppia i campi
  const actualHeadersLower = (risparmioRows && risparmioRows[0]) ? risparmioRows[0].map(h => String(h || '').trim().toLowerCase()) : [];
  const debugMapping = RISPARMIO_FIELDS.map((field, idx) => {
    const expectedHeader = RISPARMIO_HEADERS[idx].toLowerCase().trim();
    let colIdx = actualHeadersLower.indexOf(expectedHeader);
    if (colIdx === -1) {
      colIdx = actualHeadersLower.indexOf(field.toLowerCase().trim());
    }
    if (colIdx === -1) {
      colIdx = actualHeadersLower.findIndex(h => {
        const cleanH = h.replace(/[^a-z0-9]/g, '').toLowerCase();
        const cleanExpected = expectedHeader.replace(/[^a-z0-9]/g, '').toLowerCase();
        const cleanField = field.toLowerCase().replace(/[^a-z0-9]/g, '').toLowerCase();
        if (cleanH === cleanExpected || cleanH === cleanField) return true;
        const isRisparmioField = cleanExpected === 'risparmio' || cleanField === 'risparmio';
        const isAndamentoField = cleanExpected.includes('andamento') || cleanField.includes('andamento');
        const isHAndamento = cleanH.includes('andamento');
        if (isRisparmioField && isHAndamento) return false;
        if (isAndamentoField && !isHAndamento) return false;
        return cleanH.includes(cleanExpected) || cleanExpected.includes(cleanH);
      });
    }
    return {
      CampoOggetto: field,
      IntestazioneAttesa: RISPARMIO_HEADERS[idx],
      ColonnaAssegnataIndice: colIdx,
      IntestazioneRealeNelFoglio: colIdx !== -1 && risparmioRows[0] ? risparmioRows[0][colIdx] : "NON TROVATO"
    };
  });

  const rawRisparmio = mapFromRowsWithHeaders(risparmioRows, RISPARMIO_FIELDS, RISPARMIO_HEADERS, [], ['entrate', 'speseTotali', 'spesePrimarie', 'speseSecondarie', 'investiti', 'risparmio', 'andamentoRisparmio']);

  const risparmioData = rawRisparmio.map(r => {
    const obj = { ...r };
    const meseStr = String(obj.mese || '').trim();
    if (!meseStr) {
      obj.anno = obj.anno || new Date().getFullYear();
      obj.investito = Number(obj.investiti !== undefined ? obj.investiti : 0);
      obj.risparmioNetto = Number(obj.risparmio !== undefined ? obj.risparmio : 0);
      obj.andamentoRisparmio = Number(obj.andamentoRisparmio !== undefined ? obj.andamentoRisparmio : 0);
      return obj;
    }
    
    const parts = meseStr.split(/\s+/);
    const firstWord = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    
    let parsedYear = obj.anno ? Number(obj.anno) : undefined;
    if (parts.length === 2) {
      const yrPart = parseInt(parts[1], 10);
      if (!isNaN(yrPart)) {
        parsedYear = yrPart < 100 ? 2000 + yrPart : yrPart;
      }
    }
    
    obj.mese = firstWord;
    obj.anno = parsedYear || new Date().getFullYear();
    obj.investito = Number(obj.investiti !== undefined ? obj.investiti : 0);
    obj.risparmioNetto = Number(obj.risparmio !== undefined ? obj.risparmio : 0);
    obj.andamentoRisparmio = Number(obj.andamentoRisparmio !== undefined ? obj.andamentoRisparmio : 0);
    return obj;
  });



  const contiPatrimonio = mapFromRowsWithHeaders(patrimonioRows, PATRIMONIO_FIELDS, PATRIMONIO_HEADERS, [], ['capitaleTotale', 'capitaleDisponibile', 'capitaleInvestito', 'capitaleImpegnato']);
  const rendimentiMensili = mapFromRowsWithHeaders(rendimentiRows, RENDIMENTI_FIELDS, RENDIMENTI_HEADERS, [], ['rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestito', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'importoInvestitoCumulato', 'valoreAttualePortafoglio']);
  const historicalCarMeasurements = mapFromRowsWithHeaders(consumiRows, CONSUMI_FIELDS, CONSUMI_HEADERS, [], ['costo', 'quantitaLitri', 'prezzoAlLitro', 'kmFinali', 'kmEffettuati', 'litriPrecedenti', 'kmAlLitro', 'kmAlLitroAuto', 'euroPer100Km', 'litriPer100Km', 'kmPersi', 'kmPersiMediani', 'costoExtra', 'efficienzaPercentuale']);
  
  const rawEntrate = mapFromRowsWithHeaders(entrateRows, ENTRATE_FIELDS, ENTRATE_HEADERS, [], ['anno', 'importo']);
  const capitaleImpegnato = mapFromRowsWithHeaders(capitaleImpegnatoRows, CAPITALE_IMPEGNATO_FIELDS, CAPITALE_IMPEGNATO_HEADERS, [], ['capitaleImpegnato']);

  // Post-process Entrate to ensure month, year, and ID are consistently calculated
  const entrateList = rawEntrate.map((e, idx) => {
    const obj = { ...e };
    obj.id = `e-dyn-${idx + 1}`;
    
    // Normalize month name capitalization
    if (obj.mese) {
      obj.mese = obj.mese.charAt(0).toUpperCase() + obj.mese.slice(1).toLowerCase();
    }
    
    // Normalizzazione anno a 4 cifre
    if (obj.anno) {
      const yr = Number(obj.anno);
      if (yr < 100) obj.anno = 2000 + yr;
    } else {
      obj.anno = new Date().getFullYear();
    }
    
    return obj;
  });

  const cruscottoRows = getValueRangeForSheet('Cruscotto');
  const cruscottoData = mapFromRowsWithHeaders(
    cruscottoRows,
    CRUSCOTTO_FIELDS,
    CRUSCOTTO_HEADERS,
    [],
    [
      'anno',
      'azioniInvestitoCum',
      'azioniInvestitoAnno',
      'obbligazioniInvestitoCum',
      'obbligazioniInvestitoAnno',
      'investitoCumulativo',
      'investitoAnnuale',
      'rendimentoCumulativoEuro',
      'rendimentoAnnualeEuro',
      'rendimentoMedioMensilePerc',
      'rendimentoAnnuoStimatoPerc'
    ]
  );

  const parseInstrumentsFromSheet = (rows: any[][]): any[] => {
    if (!rows || rows.length < 2) return [];
    
    // Find the latest row that has a non-empty date/value in column 0
    let latestRowIdx = -1;
    for (let r = rows.length - 1; r >= 2; r--) {
      const dateCell = rows[r]?.[0];
      if (dateCell !== undefined && dateCell !== null && String(dateCell).trim() !== '') {
        latestRowIdx = r;
        break;
      }
    }
    
    // If no row with a date is found, default to the last row
    if (latestRowIdx === -1) {
      latestRowIdx = rows.length - 1;
    }
    
    const instruments: any[] = [];
    const maxCols = rows[0].length;
    
    for (let colIdx = 1; colIdx < maxCols; colIdx++) {
      const headerName = String(rows[0][colIdx] || '').trim();
      const assetClass = String(rows[1][colIdx] || '').trim();
      
      if (!headerName || !assetClass) continue;
      
      const assetClassLower = assetClass.toLowerCase();
      // Skip cash/liquidità
      if (assetClassLower.includes('liquidit') || assetClassLower.includes('cash') || assetClassLower.includes('conto')) {
        continue;
      }
      
      const isAzioni = assetClassLower.includes('azioni') || assetClassLower.includes('equity') || assetClassLower.includes('stocks') || assetClassLower.includes('stock') || assetClassLower.includes('azion');
      const isObbligazioni = assetClassLower.includes('obbligazioni') || assetClassLower.includes('bond') || assetClassLower.includes('obbligazion');
      
      if (!isAzioni && !isObbligazioni) continue;
      
      const rawVal = rows[latestRowIdx]?.[colIdx];
      const value = rawVal !== undefined && rawVal !== null ? parseLocalizedNumber(rawVal) : 0;
      
      // Include only active instruments with positive balance
      if (value > 0) {
        instruments.push({
          nome: headerName,
          tipo: isAzioni ? 'Azioni' : 'Obbligazioni',
          importoInvestito: value,
          rendimentoMensileEuro: 0,
          rendimentoMensilePerc: 0,
          rendimentoCumulativoEuro: 0,
          rendimentoCumulativoPerc: 0,
          saldoConto: value
        });
      }
    }
    return instruments;
  };

  const scalableRows = hasScalable ? getValueRangeForSheet('Scalable') : [];
  const tradeRepublicRows = hasTradeRepublic ? getValueRangeForSheet('Trade Republic') : [];

  const scalableInstruments = parseInstrumentsFromSheet(scalableRows);
  const tradeRepublicInstruments = parseInstrumentsFromSheet(tradeRepublicRows);

  return {
    transactions,
    risparmioData,
    contiPatrimonio,
    rendimentiMensili,
    historicalCarMeasurements,
    entrateList,
    capitaleImpegnato,
    risparmioHeaders: (risparmioRows && risparmioRows.length > 0) ? risparmioRows[0] : [],
    cruscottoData,
    scalableInstruments,
    tradeRepublicInstruments
  };
};

export const pushSpreadsheetData = async (
  accessToken: string,
  spreadsheetId: string,
  data: SheetsData
): Promise<void> => {
  await ensureSheetsExist(accessToken, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const txRows = mapToRows(TX_HEADERS, data.transactions, TX_FIELDS);
  
  const preparedRisparmio = (data.risparmioData || []).map(r => {
    const obj = { ...r };
    if (obj.investito !== undefined) {
      obj.investiti = obj.investito;
    }
    if (obj.risparmioNetto !== undefined) {
      obj.risparmio = obj.risparmioNetto;
    }
    return obj;
  });
  const risparmioRows = mapToRows(RISPARMIO_HEADERS, preparedRisparmio, RISPARMIO_FIELDS);
  const patrimonioRows = mapToRows(PATRIMONIO_HEADERS, data.contiPatrimonio, PATRIMONIO_FIELDS);
  const rendimentiRows = mapToRows(RENDIMENTI_HEADERS, data.rendimentiMensili, RENDIMENTI_FIELDS);
  const consumiRows = mapToRows(CONSUMI_HEADERS, data.historicalCarMeasurements, CONSUMI_FIELDS);
  const entrateRows = mapToRows(ENTRATE_HEADERS, data.entrateList || [], ENTRATE_FIELDS);
  const capitaleImpegnatoRows = mapToRows(CAPITALE_IMPEGNATO_HEADERS, data.capitaleImpegnato || [], CAPITALE_IMPEGNATO_FIELDS);
  const cruscottoRows = mapToRows(CRUSCOTTO_HEADERS, data.cruscottoData || [], CRUSCOTTO_FIELDS);

  const requestBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Uscite!A1', values: txRows },
      { range: 'Risparmio!A1', values: risparmioRows },
      { range: 'Patrimonio!A1', values: patrimonioRows },
      { range: 'Rendimenti!A1', values: rendimentiRows },
      { range: 'Analisi consumi!A1', values: consumiRows },
      { range: 'Entrate!A1', values: entrateRows },
      { range: 'Capitale Impegnato!A1', values: capitaleImpegnatoRows },
      { range: 'Cruscotto!A1', values: cruscottoRows }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to push spreadsheet data:', errorBody);
    throw new Error(`Failed to save to Google Sheet: ${response.statusText}`);
  }
};