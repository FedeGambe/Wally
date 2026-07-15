/**
 * PONTE tra l'app e l'API di Google Sheets (layer 1 dell'architettura dati).
 * File più delicato del progetto: un bug qui può corrompere silenziosamente
 * cifre finanziarie (numeri o date interpretati male). Ogni funzione qui
 * chiama direttamente `fetch()` verso `sheets.googleapis.com` usando
 * l'`accessToken` OAuth di Google (ottenuto in src/lib/googleAuth.ts).
 *
 * Le due funzioni pubbliche principali:
 *  - `fetchSpreadsheetData`: legge (PULL) tutte le schede del foglio Google e
 *    le converte in oggetti JS, secondo la mappatura di SHEETS_CONFIG.
 *  - `pushSpreadsheetData`: fa l'inverso (PUSH), scrive gli oggetti JS
 *    dell'app come righe nel foglio Google.
 *
 * `parseLocalizedNumber` e `parseDateString` meritano attenzione extra: il
 * foglio Google può contenere numeri in formato italiano (1.234,56) o
 * americano (1,234.56), e date in vari formati testuali o come "numero
 * seriale" di Google Sheets.
 */
import { SHEETS_CONFIG, REQUIRED_SHEETS_TITLES } from '../config/sheetsConfig';
import { toValidFieldName } from '../utils/sheetsUtils';
import { computeCruscottoData } from '../utils/cruscottoInvestimenti';

export interface SheetsData {
  uscite: any[];
  risparmio: any[];
  patrimonio: any[];
  analisiConsumi: any[];
  rendimentiInvestimenti: any[];
  entrate?: any[];
  capitaleImpegnato?: any[];
  risparmioHeaders?: string[];
  cruscottoInvestimenti?: any[];
  scalableInstruments?: any[];
  tradeRepublicInstruments?: any[];
  scalable?: any[];
  tradeRepublic?: any[];
  scalableFields?: string[];
  scalableHeaders?: string[];
  tradeRepublicFields?: string[];
  tradeRepublicHeaders?: string[];
  scalableColumnCategories?: Record<string, string>;
  tradeRepublicColumnCategories?: Record<string, string>;
  fondoPensione?: any[];
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
export const parseLocalizedNumber = (val: any): number => {
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
export const parseDateString = (dateStr: any): Date | null => {
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

// Converte le righe grezze del foglio (array di array) in array di oggetti JS.
// Non assume che le colonne del foglio siano nell'ordine di `fieldsOnObject`:
// cerca per ogni campo la colonna giusta guardando l'intestazione reale nella
// riga 1 del foglio (match esatto, poi per nome del campo, poi "contains"
// case-insensitive). Questo rende l'app tollerante se l'utente riordina le
// colonne nel foglio Google, a patto che le intestazioni restino riconoscibili.
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
        // "comulativ..." copre sia "comulativo" che "comulative" (i due fogli Scalable/Trade
        // Republic hanno lo stesso refuso scritto con desinenze diverse nell'header reale).
        let cleanH = h.replace(/[^a-z0-9]/g, '').toLowerCase().replace(/comulativ/g, 'cumulativ');
        let cleanExpected = expectedHeader.replace(/[^a-z0-9]/g, '').toLowerCase().replace(/comulativ/g, 'cumulativ');
        let cleanField = field.toLowerCase().replace(/[^a-z0-9]/g, '').toLowerCase().replace(/comulativ/g, 'cumulativ');
        
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
    // Ensure every object has a unique, stable id if not present
    if (!obj.id) {
      const baseString = [obj.data || '', obj.descrizione || '', obj.importo || '', obj.mese || '', obj.categoria || ''].filter(Boolean).join('-');
      obj.id = baseString ? `${baseString}-${i}` : `row-${i}`;
    }
    items.push(obj);
  }
  return items;
};

export const createSpreadsheet = async (accessToken: string): Promise<string> => {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: 'Wally - Dashboard Economica' },
      sheets: REQUIRED_SHEETS_TITLES.map(title => ({ properties: { title } })) // Dinamico!
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    let errorMsg = '';
    try {
      const errBody = await response.json();
      errorMsg = errBody?.error?.message;
    } catch (_) {}
    throw new Error(`Failed to create Google Sheet: ${errorMsg || response.statusText || `Codice ${response.status}`}`);
  }
  const result = await response.json();
  return result.spreadsheetId;
};

// Legge le FORMULE (non i valori calcolati) di una singola riga di un range,
// es. "Analisi consumi!A15:P15". Usata da Analisi Consumi per copiare e
// shiftare (src/utils/formulaShift.ts) la formula della riga precedente su un
// nuovo record aggiunto da webapp, invece di reimplementare da zero i calcoli
// del foglio (Km effettuati, €/100km, ecc.) — vedi docs/PIANO-INSERIMENTO-DATI.md.
export const fetchRowFormulas = async (accessToken: string, spreadsheetId: string, range: string): Promise<string[]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    let errorMsg = '';
    try {
      const errBody = await response.json();
      errorMsg = errBody?.error?.message;
    } catch (_) {}
    throw new Error(`Impossibile leggere le formule dal foglio: ${errorMsg || response.statusText || `Codice ${response.status}`}`);
  }
  const result = await response.json();
  return (result.values && result.values[0]) || [];
};

export const ensureSheetsExist = async (accessToken: string, spreadsheetId: string): Promise<void> => {
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const getResponse = await fetch(getUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });

  if (!getResponse.ok) {
    if (getResponse.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    let errorMsg = '';
    try {
      const errBody = await getResponse.json();
      errorMsg = errBody?.error?.message;
    } catch (_) {}
    throw new Error(`Impossibile accedere al file: ${errorMsg || getResponse.statusText || `Codice ${getResponse.status}`}`);
  }
  const metadata = await getResponse.json();
  
  const existingSheetsNormalized = (metadata.sheets || []).map((s: any) => 
    String(s.properties?.title || '').trim().toLowerCase()
  );
  
  const missingSheets = REQUIRED_SHEETS_TITLES.filter(title => !existingSheetsNormalized.includes(title.trim().toLowerCase()));

  if (missingSheets.length > 0) {
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const requests = missingSheets.map(title => ({ addSheet: { properties: { title } } }));
    await fetch(updateUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
  }
};

// PULL: legge tutte le schede del foglio Google in un'unica chiamata batch e
// restituisce un oggetto con una chiave per ogni `dataKey` di SHEETS_CONFIG
// (es. `uscite`, `entrate`, `patrimonio`, ...), più alcuni campi calcolati
// (es. `cruscottoInvestimenti`, `scalableInstruments`) che non vengono letti
// da un tab dedicato ma derivati dagli altri dati.
export const fetchSpreadsheetData = async (accessToken: string, spreadsheetId: string): Promise<SheetsData> => {
  await ensureSheetsExist(accessToken, spreadsheetId);

  // Genera i range in modo dinamico dalla configurazione
  const ranges = SHEETS_CONFIG.map(s => s.range);

  // Verifica Broker opzionali (Scalable / Trade Republic)
  let actualSheets: string[] = [];
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaResponse = await fetch(metaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (metaResponse.ok) {
      const metadata = await metaResponse.json();
      actualSheets = (metadata.sheets || []).map((s: any) => String(s.properties?.title || '').toLowerCase());
    }
  } catch (err) {
    console.error('Error fetching metadata:', err);
  }

  const hasScalable = actualSheets.includes('scalable');
  const hasTradeRepublic = actualSheets.includes('trade republic');
  if (hasScalable) ranges.push('Scalable');
  if (hasTradeRepublic) ranges.push('Trade Republic');
  
  const rangesParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    let errorMsg = '';
    try {
      const errBody = await response.json();
      errorMsg = errBody?.error?.message;
    } catch (_) {}
    throw new Error(`Failed to read from Google Sheet: ${errorMsg || response.statusText || `Codice ${response.status}`}`);
  }
  const result = await response.json();
  const valueRanges = result.valueRanges || [];
  
  const getValueRangeForSheet = (sheetName: string): any[][] => {
    const targetLower = sheetName.toLowerCase() + '!';
    const found = valueRanges.find((vr: any) => 
      String(vr?.range || '').replace(/'/g, '').toLowerCase().startsWith(targetLower)
    );
    return found?.values || [];
  };

  // Costruiamo l'oggetto finale iniettando ciclicamente i dati dei fogli standard
  const outputData: any = {};

  SHEETS_CONFIG.forEach(sheet => {
    const rows = getValueRangeForSheet(sheet.title);
    
    // Default to the config's fields/headers
    let fields = [...sheet.fields];
    let headers = [...sheet.headers];
    let numberFields = [...(sheet.numberFields || [])];

    // If it's "Scalable" or "Trade Republic", we dynamically scan row 1 and row 2 for additional columns!
    if ((sheet.title === 'Scalable' || sheet.title === 'Trade Republic') && rows.length >= 2) {
      const row1 = rows[0];
      const row2 = rows[1];
      const maxCols = row1.length;
      const detectedDynamic: Array<{ header: string; type: string }> = [];
      const colCategories: Record<string, string> = {};

      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        const headerName = String(row1[colIdx] || '').trim();
        const row2Val = row2 && row2[colIdx] ? String(row2[colIdx]).trim() : '';
        const row2Lower = row2Val.toLowerCase();

        // Check if it's a dynamic column (contains 'azioni', 'obbligazioni', or 'monetari' - or maybe 'obbligazione' singolare, 'bond', o altro?)
        const isDynamic = 
          row2Lower.includes('azioni') || 
          row2Lower.includes('obbligazione') || 
          row2Lower.includes('obbligazioni') || 
          row2Lower.includes('bond') || 
          row2Lower.includes('monetari');

        if (isDynamic) {
          const fieldName = toValidFieldName(headerName);
          detectedDynamic.push({ header: headerName, type: row2Val });
          
          let cat = '';
          if (row2Lower.includes('obbligazione') || row2Lower.includes('obbligazioni') || row2Lower.includes('bond')) cat = 'obbligazioni';
          else if (row2Lower.includes('azioni')) cat = 'azioni';
          else if (row2Lower.includes('monetari')) cat = 'monetari';
          
          if (cat) {
            colCategories[fieldName] = cat;
          }

          // Only add if not already in fields
          if (!fields.includes(fieldName)) {
            fields.push(fieldName);
            headers.push(headerName);
            numberFields.push(fieldName);
          }
        }
      }

      // Save the detected fields and headers to the outputData
      if (sheet.title === 'Scalable') {
        outputData.scalableFields = fields;
        outputData.scalableHeaders = headers;
        outputData.scalableColumnCategories = colCategories;
      } else if (sheet.title === 'Trade Republic') {
        outputData.tradeRepublicFields = fields;
        outputData.tradeRepublicHeaders = headers;
        outputData.tradeRepublicColumnCategories = colCategories;
      }
    }

    outputData[sheet.dataKey] = mapFromRowsWithHeaders(
      rows, 
      fields, 
      headers, 
      sheet.booleanFields || [], 
      numberFields
    );
  });

  // --- POST PROCESSING SPECIFICO (Solo dove la logica differisce) ---

  // Post-processing Risparmio
  outputData.risparmio = outputData.risparmio.map((r: any) => {
    const obj = { ...r };
    const meseStr = String(obj.mese || '').trim();
    if (meseStr) {
      const parts = meseStr.split(/\s+/);
      obj.mese = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      if (parts.length === 2) {
        const yrPart = parseInt(parts[1], 10);
        if (!isNaN(yrPart)) obj.anno = yrPart < 100 ? 2000 + yrPart : yrPart;
      }
    }
    obj.anno = obj.anno || new Date().getFullYear();
    obj.investito = Number(obj.investiti ?? 0);
    obj.risparmioNetto = Number(obj.risparmio ?? 0);
    obj.andamentoRisparmio = Number(obj.andamentoRisparmio ?? 0);
    return obj;
  });

  // Post-processing Entrate
  outputData.entrate = outputData.entrate.map((e: any, idx: number) => {
    const obj = { ...e, id: `e-dyn-${idx + 1}` };
    if (obj.mese) obj.mese = obj.mese.charAt(0).toUpperCase() + obj.mese.slice(1).toLowerCase();
    obj.anno = obj.anno ? (Number(obj.anno) < 100 ? 2000 + Number(obj.anno) : Number(obj.anno)) : new Date().getFullYear();
    return obj;
  });

  // Intestazioni per il Risparmio
  const risparmioRows = getValueRangeForSheet('Risparmio');
  outputData.risparmioHeaders = risparmioRows.length > 0 ? risparmioRows[0] : [];

  // Gestione Broker (Scalable e Trade Republic)
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
      
      const isObbligazioni = assetClassLower.includes('obbligazioni') || assetClassLower.includes('bond') || assetClassLower.includes('obbligazion');
      const isMonetari = !isObbligazioni && (assetClassLower.includes('monetar') || assetClassLower.includes('swap') || assetClassLower.includes('overnight'));
      const isAzioni = !isObbligazioni && !isMonetari && (assetClassLower.includes('azioni') || assetClassLower.includes('equity') || assetClassLower.includes('stocks') || assetClassLower.includes('stock') || assetClassLower.includes('azion'));
      
      if (!isAzioni && !isObbligazioni && !isMonetari) continue;
      
      const rawVal = rows[latestRowIdx]?.[colIdx];
      const value = rawVal !== undefined && rawVal !== null ? parseLocalizedNumber(rawVal) : 0;
      
      // Include only active instruments with positive balance
      if (value > 0) {
        instruments.push({
          nome: headerName,
          tipo: isAzioni ? 'Azioni' : (isObbligazioni ? 'Obbligazioni' : 'Monetari'),
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
  outputData.scalableInstruments = hasScalable ? parseInstrumentsFromSheet(getValueRangeForSheet('Scalable')) : [];
  outputData.tradeRepublicInstruments = hasTradeRepublic ? parseInstrumentsFromSheet(getValueRangeForSheet('Trade Republic')) : [];

  // Calcolo dinamico del Cruscotto Investimenti dai dati correnti
  const computedCruscotto = computeCruscottoData(outputData);
  if (computedCruscotto && computedCruscotto.length > 0) {
    outputData.cruscottoInvestimenti = computedCruscotto;
  }

  return outputData as SheetsData;
};

// PUSH: scrive lo stato attuale dell'app nel foglio Google, un tab alla
// volta, secondo la stessa mappatura fields/headers di SHEETS_CONFIG.
// Sovrascrive interamente il contenuto di ogni tab (values:batchUpdate con
// range "A1" e i dati completi) — non fa un merge riga per riga.
export const pushSpreadsheetData = async (
  accessToken: string,
  spreadsheetId: string,
  data: SheetsData
): Promise<void> => {
  await ensureSheetsExist(accessToken, spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  // Prepariamo i dati ad-hoc di Risparmio prima del ciclo automatico
  const preparedRisparmio = (data.risparmio || []).map(r => ({
    ...r,
    investiti: r.investito ?? r.investiti,
    risparmio: r.risparmioNetto ?? r.risparmio
  }));

  const computedCruscotto = computeCruscottoData(data);
  const dataMapForPush: Record<string, any[]> = {
    uscite: data.uscite,
    risparmio: preparedRisparmio,
    patrimonio: data.patrimonio,
    rendimentiInvestimenti: data.rendimentiInvestimenti,
    analisiConsumi: data.analisiConsumi,
    entrate: data.entrate || [],
    capitaleImpegnato: data.capitaleImpegnato || [],
    cruscottoInvestimenti: computedCruscotto.length > 0 ? computedCruscotto : (data.cruscottoInvestimenti || []),
    scalable: data.scalable || [],
    tradeRepublic: data.tradeRepublic || []
  };

  // Generiamo il body dinamicamente ciclando sulla configurazione
  const valueData = SHEETS_CONFIG.map(sheet => {
    const targetData = dataMapForPush[sheet.dataKey] || [];
    
    let fields = sheet.fields;
    let headers = sheet.headers;

    if (sheet.title === 'Scalable' && data.scalableFields && data.scalableHeaders) {
      fields = data.scalableFields;
      headers = data.scalableHeaders;
    } else if (sheet.title === 'Trade Republic' && data.tradeRepublicFields && data.tradeRepublicHeaders) {
      fields = data.tradeRepublicFields;
      headers = data.tradeRepublicHeaders;
    }

    const rows = mapToRows(headers, targetData, fields);
    return {
      range: `${sheet.title}!A1`,
      values: rows
    };
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: valueData })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    let errorMsg = '';
    try {
      const errBody = await response.json();
      errorMsg = errBody?.error?.message;
    } catch (_) {}
    throw new Error(`Failed to save to Google Sheet: ${errorMsg || response.statusText || `Codice ${response.status}`}`);
  }
};