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
import { MESI_ITALIANI } from '../utils/date';
import { shiftFormulaRows } from '../utils/formulaShift';

export interface SheetsData {
  uscite: any[];
  risparmio: any[];
  patrimonio: any[];
  analisiConsumi: any[];
  rendimentiInvestimenti: any[];
  entrate?: any[];
  trasferimenti?: any[];
  conti?: string[];
  categorieEntrate?: string[];
  macroCategorieUscite?: any[];
  presetUscite?: any[];
  presetTrasferimenti?: any[];
  soglie?: any[];
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

// Formatta una data in ISO YYYY-MM-DD: unico formato che Google Sheets legge
// allo stesso modo a prescindere dal locale del foglio (vedi commento su
// SheetDefinition.dateFields in sheetsConfig.ts). Se non è una data valida,
// lascia il valore originale invece di scriverci una stringa vuota.
const formatDateForSheet = (val: any): any => {
  const date = parseDateString(val);
  if (!date) return val;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Formatta UN singolo record secondo le stesse regole usate per il push completo
// (booleani -> 'Si'/'No', date -> ISO). Condivisa tra mapToRows (full push) e
// appendRowToSheet (append di una riga sola), unica fonte di verità per la
// serializzazione: vedi nota sul kill-switch WRITE_TO_SHEETS_DISABLED più sotto.
const formatRowValues = (fieldsOnObject: string[], dateFields: string[], item: any): any[] => {
  return fieldsOnObject.map(field => {
    const val = item[field];
    if (val === undefined || val === null) return '';
    if (typeof val === 'boolean') return val ? 'Si' : 'No';
    if (dateFields.includes(field)) return formatDateForSheet(val);
    return val;
  });
};

// Convert arrays of objects to row arrays for Google Sheets
const mapToRows = (header: string[], items: any[], fieldsOnObject: string[], dateFields: string[] = []) => {
  const rows = [header];
  items.forEach(item => {
    rows.push(formatRowValues(fieldsOnObject, dateFields, item));
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
export const mapFromRowsWithHeaders = (
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
// del foglio (Km effettuati, €/100km, ecc.) — vedi docs/archive/PIANO-INSERIMENTO-DATI.md.
export const fetchRowFormulas = async (accessToken: string, spreadsheetId: string, range: string): Promise<string[]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });

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

// Kill-switch per il foglio PRINCIPALE: blocca pushSpreadsheetData ed
// ensureSheetsExist (creazione tab mancanti). Corrotto il file principale una
// seconda volta nonostante i fix su booleani/colonne Trasferimenti — c'è
// ancora un bug non trovato nella serializzazione di push (altri tab non
// ancora verificati colonna per colonna). Non rimettere a `false` finché non
// si trova la causa reale. NON copre pushDatiBaseToConfigSheet (foglio di
// configurazione, gestito a parte): quello resta attivo.
export const WRITE_TO_SHEETS_DISABLED = true;

// Gate indipendente per il percorso di APPEND (una riga sola, via Sheets API
// values:append) usato dai form "Aggiungi Uscita/Entrata/Trasferimento/Consumo"
// al posto del push completo. A differenza di pushSpreadsheetData, l'append non
// tocca mai celle/righe esistenti né altre tab: è strutturalmente più sicuro
// (stesso principio dello script Python originale, che scriveva solo le celle
// della nuova riga). Va comunque validato contro un foglio di prova prima di
// portarlo a `false` sul foglio reale — vedi docs/archive/PIANO-INSERIMENTO-DATI.md.
export const APPEND_TO_SHEETS_DISABLED = false;

// Data in DD/MM/YYYY: usato SOLO dall'append (a differenza di
// formatDateForSheet/ISO usato dal push completo) perché qui scriviamo su un
// foglio di cui conosciamo il locale reale (italiano, verificato a mano) e
// vogliamo coerenza visiva con le righe esistenti, che sono già in questo
// formato. Se un giorno l'append dovesse girare su fogli di locale ignoto,
// tornare a formatDateForSheet (ISO) sarebbe la scelta sicura di default.
const formatDateIT = (val: any): any => {
  const date = parseDateString(val);
  if (!date) return val;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}/${m}/${y}`;
};

// Converte un nome di mese italiano ("Agosto") + anno in una data "01/MM/YYYY"
// (il giorno è sempre 1: sul foglio reale la colonna "Mese" di Entrate/
// Trasferimenti è una data vera che rappresenta il mese, non il nome del
// mese come stringa — vedi SheetDefinition.monthDateFields).
const monthNameToDateString = (meseNome: any, anno: any): string => {
  const idx = MESI_ITALIANI.findIndex(m => m.toLowerCase() === String(meseNome || '').trim().toLowerCase());
  if (idx === -1 || !anno) return '';
  return `01/${String(idx + 1).padStart(2, '0')}/${anno}`;
};

const columnLetterForIndex = (index: number): string => String.fromCharCode(65 + index);

// Scrive UNA riga in fondo a una singola tab, senza toccare nient'altro: cella
// per cella (una range per campo), MAI un blocco unico dell'intera riga.
// Motivo: colonne come "Mese"/"Icon" su Uscite o "Anno" su Entrate/
// Trasferimenti sono FORMULE già presenti sul foglio reale (vedi
// SheetDefinition.formulaFields) — scriverci sopra un valore statico le
// cancella. Trovata dopo che due push avevano già corrotto il foglio
// sovrascrivendo formule con valori letterali; verificata cella per cella sul
// foglio reale prima di questo fix. Stesso principio dello script Python
// originale dell'utente, che scriveva solo le colonne che gli servivano.
export const appendRowToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  record: Record<string, any>
): Promise<void> => {
  if (APPEND_TO_SHEETS_DISABLED) {
    throw new Error('Scrittura su Google Sheets temporaneamente disattivata (debug in corso). Nessun dato è stato inviato al foglio.');
  }
  const sheet = SHEETS_CONFIG.find(s => s.title === tabTitle);
  if (!sheet) {
    throw new Error(`Tab "${tabTitle}" non configurata in SHEETS_CONFIG.`);
  }

  const formulaFields = sheet.formulaFields || [];
  const monthDateFields = sheet.monthDateFields || [];
  const dateFields = sheet.dateFields || [];

  // Riga di destinazione: prima riga libera sotto l'ultima con contenuto
  // nella colonna "ancora" (il primo campo della tab, sempre valorizzato per
  // ogni riga reale e mai per le righe con solo formule in attesa) — stessa
  // tecnica di _prima_riga_libera nello script Python originale.
  const anchorCol = columnLetterForIndex(0);
  const lastCol = columnLetterForIndex(sheet.fields.length - 1);
  const anchorUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${tabTitle}!${anchorCol}:${anchorCol}`)}`;
  const anchorResponse = await fetch(anchorUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });
  if (!anchorResponse.ok) {
    if (anchorResponse.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    throw new Error(`Impossibile determinare la riga di destinazione su "${tabTitle}" (codice ${anchorResponse.status}).`);
  }
  const anchorResult = await anchorResponse.json();
  const targetRow = ((anchorResult.values || []).length) + 1;

  // La griglia del foglio può finire esattamente all'ultima riga con dati
  // (non è detto ci siano righe vuote "di scorta" sotto): se la riga di
  // destinazione non esiste ancora, la creiamo prima di scriverci, altrimenti
  // il write fallisce con "exceeds grid limits".
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title,gridProperties.rowCount)`;
  const metaResponse = await fetch(metaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });
  if (!metaResponse.ok) {
    throw new Error(`Impossibile leggere le proprietà del foglio "${tabTitle}" (codice ${metaResponse.status}).`);
  }
  const metadata = await metaResponse.json();
  // Confronto case-insensitive: SHEETS_CONFIG.title e il nome reale della tab sul foglio non
  // sempre coincidono esattamente (es. "Analisi consumi" in config vs "Analisi Consumi" sul
  // foglio) — con un confronto case-sensitive la tab non viene trovata e l'append fallisce
  // silenziosamente (l'errore finisce nel banner di useSaveAndPush, facile da non notare).
  const sheetMeta = (metadata.sheets || []).find((s: any) => String(s.properties?.title || '').toLowerCase() === tabTitle.toLowerCase());
  if (!sheetMeta) {
    throw new Error(`Tab "${tabTitle}" non trovata sul foglio Google.`);
  }
  const sheetId = sheetMeta.properties.sheetId;
  const rowCount = sheetMeta.properties.gridProperties?.rowCount || 0;
  // Formato data italiano esplicito sulle celle di dateFields: una riga
  // appena aggiunta (via appendDimension) non eredita alcuna formattazione,
  // quindi anche scrivendo "13/08/2026" Sheets la visualizzerebbe con il suo
  // formato data di default (spesso ISO) invece di dd/mm/yyyy come le righe
  // esistenti — bug scoperto testando questo stesso fix.
  const structuralRequests: any[] = [];
  if (targetRow > rowCount) {
    structuralRequests.push({ appendDimension: { sheetId, dimension: 'ROWS', length: targetRow - rowCount } });
  }
  dateFields.forEach(field => {
    const colIdx = sheet.fields.indexOf(field);
    if (colIdx === -1) return;
    structuralRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: targetRow - 1, endRowIndex: targetRow, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    });
  });
  // Stesso problema per monthDateFields (es. "Mese" di Entrate/Trasferimenti):
  // è una data vera ma visualizzata come nome del mese ("gennaio").
  monthDateFields.forEach(field => {
    const colIdx = sheet.fields.indexOf(field);
    if (colIdx === -1) return;
    structuralRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: targetRow - 1, endRowIndex: targetRow, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'mmmm' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    });
  });
  if (structuralRequests.length > 0) {
    const growResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: structuralRequests })
    });
    if (!growResponse.ok) {
      throw new Error(`Impossibile preparare la riga su "${tabTitle}" per la nuova riga (codice ${growResponse.status}).`);
    }
  }

  // Per le colonne-formula (formulaFields) non scriviamo un valore: copiamo la
  // formula della riga sopra e ne shiftiamo i riferimenti di riga (stessa
  // tecnica già usata per Analisi Consumi, vedi utils/formulaShift.ts) così
  // resta una formula viva calcolata da Sheets, non un valore statico.
  let formulasAbove: string[] = [];
  if (formulaFields.length > 0 && targetRow > 2) {
    const aboveRow = targetRow - 1;
    formulasAbove = await fetchRowFormulas(accessToken, spreadsheetId, `${tabTitle}!${anchorCol}${aboveRow}:${lastCol}${aboveRow}`);
  }

  const data = sheet.fields.reduce<{ range: string; values: any[][] }[]>((acc, field, index) => {
    const col = columnLetterForIndex(index);
    if (formulaFields.includes(field)) {
      const formulaAbove = formulasAbove[index];
      if (typeof formulaAbove === 'string' && formulaAbove.startsWith('=')) {
        acc.push({ range: `${tabTitle}!${col}${targetRow}`, values: [[shiftFormulaRows(formulaAbove, 1)]] });
      }
      // Nessuna formula da copiare (es. prima riga dati della tab): lasciamo
      // la cella intoccata invece di scriverci un valore statico a caso.
      return acc;
    }
    let val = record[field];
    if (monthDateFields.includes(field)) {
      val = monthNameToDateString(val, record.anno);
    } else if (val === undefined || val === null) {
      val = '';
    } else if (typeof val === 'boolean') {
      val = val ? 'Si' : 'No';
    } else if (dateFields.includes(field)) {
      val = formatDateIT(val);
    }
    acc.push({ range: `${tabTitle}!${col}${targetRow}`, values: [[val]] });
    return acc;
  }, []);

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
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
    throw new Error(`Impossibile aggiungere la riga su "${tabTitle}": ${errorMsg || response.statusText || `Codice ${response.status}`}`);
  }
};

export const ensureSheetsExist = async (accessToken: string, spreadsheetId: string): Promise<void> => {
  if (WRITE_TO_SHEETS_DISABLED) return;

  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const getResponse = await fetch(getUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });

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

  // Verifica quali tab esistono davvero sul foglio (serve sia per i broker opzionali
  // Scalable/Trade Republic, sia per non chiedere un range su un tab di SHEETS_CONFIG
  // che sul foglio reale è stato rinominato o cancellato: batchGet è UNA sola chiamata
  // con tutti i range, quindi un solo range invalido ("Unable to parse range: X!A:A")
  // fa fallire l'intera risposta 400, bloccando anche i tab che stavano andando bene.
  let actualSheets: string[] = [];
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaResponse = await fetch(metaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });
    if (metaResponse.ok) {
      const metadata = await metaResponse.json();
      actualSheets = (metadata.sheets || []).map((s: any) => String(s.properties?.title || '').toLowerCase());
    }
  } catch (err) {
    console.error('Error fetching metadata:', err);
  }

  // Genera i range in modo dinamico dalla configurazione, scartando i tab che non
  // esistono sul foglio reale (se la metadata è stata letta con successo: altrimenti,
  // ranges.length 0 noto, si prova comunque con tutti come prima).
  const ranges = actualSheets.length > 0
    ? SHEETS_CONFIG.filter(s => actualSheets.includes(s.title.toLowerCase())).map(s => s.range)
    : SHEETS_CONFIG.map(s => s.range);

  const hasScalable = actualSheets.includes('scalable');
  const hasTradeRepublic = actualSheets.includes('trade republic');
  if (hasScalable) ranges.push('Scalable');
  if (hasTradeRepublic) ranges.push('Trade Republic');
  
  const rangesParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });

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

  // Post-processing Dati Base (Conti, Categorie, Preset Uscite Ricorrenti):
  // le tab sono righe piatte, ma l'app se le aspetta in forma più comoda
  // (liste semplici, macro categorie raggruppate con le loro sotto-categorie).
  //
  // Tab appena creata da ensureSheetsExist = vuota (nessuna riga, nemmeno
  // l'header) finché l'utente non salva qualcosa da Impostazioni facendo
  // scattare il primo push. Se qui scrivessimo comunque un array vuoto,
  // saveToLocalStorage lo tratterebbe come dato vero (un array vuoto è
  // "presente" in JS) e cancellerebbe il seed di default già caricato —
  // per questo, a differenza di Uscite/Entrate, il valore letto dal foglio
  // sostituisce il locale SOLO se il foglio contiene davvero qualcosa.
  const contiDaSheet = (outputData.contiRows || [])
    .map((r: any) => String(r.nome || '').trim())
    .filter(Boolean);
  if (contiDaSheet.length > 0) outputData.conti = contiDaSheet;
  delete outputData.contiRows;

  const categorieEntrateDaSheet = (outputData.categorieEntrateRows || [])
    .map((r: any) => String(r.nome || '').trim())
    .filter(Boolean);
  if (categorieEntrateDaSheet.length > 0) outputData.categorieEntrate = categorieEntrateDaSheet;
  delete outputData.categorieEntrateRows;

  // Una riga per (macro, sotto-categoria); le macro "a inserimento libero"
  // (nessuna sotto-categoria) hanno una riga sola con categoria vuota, solo
  // per non perdere macro+icona.
  const macroMap = new Map<string, { nome: string; icon: string; categorie: string[] }>();
  (outputData.categorieUsciteRows || []).forEach((r: any) => {
    const macro = String(r.macro || '').trim();
    if (!macro) return;
    if (!macroMap.has(macro)) {
      macroMap.set(macro, { nome: macro, icon: String(r.icon || '').trim() || '💸', categorie: [] });
    }
    const categoria = String(r.categoria || '').trim();
    if (categoria) macroMap.get(macro)!.categorie.push(categoria);
  });
  if (macroMap.size > 0) outputData.macroCategorieUscite = Array.from(macroMap.values());
  delete outputData.categorieUsciteRows;

  // Preset Uscite/Trasferimenti Ricorrenti NON vivono più sul foglio principale
  // (SHEETS_CONFIG li elenca solo perché la config dei campi è condivisa con
  // fetchDatiBaseFromConfigSheet/pushDatiBaseToConfigSheet): sul foglio
  // principale queste tab non esistono, quindi presetUsciteRows/
  // presetTrasferimentiRows qui sono sempre vuoti. I valori veri arrivano da
  // fetchDatiBaseFromConfigSheet (foglio di configurazione), chiamato dopo
  // questa funzione in FinanceDataContext.refreshData.
  delete outputData.presetUsciteRows;

  // Soglie: il foglio le scrive come frazione (0.35 = 35%, formato percentuale
  // di Google Sheets), l'app le tiene invece come numero intero 0-100 per
  // l'editor — normalizziamo qui, un valore <=1 viene trattato come frazione.
  const soglieDaSheet = (outputData.soglieRows || [])
    .map((r: any) => {
      const raw = Number(r.percentuale || 0);
      return { categoria: String(r.categoria || '').trim(), percentuale: raw > 0 && raw <= 1 ? raw * 100 : raw };
    })
    .filter((s: any) => s.categoria);
  if (soglieDaSheet.length > 0) outputData.soglie = soglieDaSheet;
  delete outputData.soglieRows;

  delete outputData.presetTrasferimentiRows;

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
// `tabTitles`: se passato, limita il push a queste tab soltanto (scarta le
// altre da SHEETS_CONFIG prima di costruire il payload) — usato per non
// riscrivere l'intero workbook quando in realtà è cambiata una sola tab (es.
// i Preset Ricorrenti in Impostazioni). Omesso = tutte le tab, comportamento
// storico, usato solo dai bottoni manuali "Carica/Sincronizza" in SheetsModal.
export const pushSpreadsheetData = async (
  accessToken: string,
  spreadsheetId: string,
  data: SheetsData,
  tabTitles?: string[]
): Promise<void> => {
  if (WRITE_TO_SHEETS_DISABLED) {
    throw new Error('Scrittura su Google Sheets temporaneamente disattivata (debug in corso). Nessun dato è stato inviato al foglio.');
  }
  await ensureSheetsExist(accessToken, spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;

  // Alcuni tab di SHEETS_CONFIG non vengono auto-creati da ensureSheetsExist
  // (vedi TAB_NON_AUTOCREABILI in sheetsConfig.ts): se l'utente non li ha mai
  // creati sul foglio, un range su un tab inesistente farebbe fallire l'INTERO
  // batchUpdate (stesso problema di "Unable to parse range" del pull). Leggiamo
  // qui i tab realmente presenti e scartiamo quelli mancanti dal payload.
  let sheetConfigToPush = tabTitles ? SHEETS_CONFIG.filter(s => tabTitles.includes(s.title)) : SHEETS_CONFIG;
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaResponse = await fetch(metaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });
    if (metaResponse.ok) {
      const metadata = await metaResponse.json();
      const actualTitles = (metadata.sheets || []).map((s: any) => String(s.properties?.title || '').toLowerCase());
      sheetConfigToPush = sheetConfigToPush.filter(s => actualTitles.includes(s.title.toLowerCase()));
    }
  } catch (err) {
    console.error('Error fetching metadata before push:', err);
  }

  // Prepariamo i dati ad-hoc di Risparmio prima del ciclo automatico
  const preparedRisparmio = (data.risparmio || []).map(r => ({
    ...r,
    investiti: r.investito ?? r.investiti,
    risparmio: r.risparmioNetto ?? r.risparmio
  }));

  // Dati Base (Conti, Categorie, Preset Uscite Ricorrenti): l'app li tiene in
  // forma comoda (liste semplici, macro categorie raggruppate), le tab Sheet
  // vogliono righe piatte — stessa conversione fatta al contrario in
  // fetchSpreadsheetData.
  const contiRows = (data.conti || []).map(nome => ({ nome }));
  const categorieEntrateRows = (data.categorieEntrate || []).map(nome => ({ nome }));
  const categorieUsciteRows = (data.macroCategorieUscite || []).flatMap((m: any) =>
    m.categorie.length > 0
      ? m.categorie.map((categoria: string) => ({ macro: m.nome, icon: m.icon, categoria }))
      : [{ macro: m.nome, icon: m.icon, categoria: '' }]
  );
  const computedCruscotto = computeCruscottoData(data);
  const dataMapForPush: Record<string, any[]> = {
    uscite: data.uscite,
    risparmio: preparedRisparmio,
    patrimonio: data.patrimonio,
    rendimentiInvestimenti: data.rendimentiInvestimenti,
    analisiConsumi: data.analisiConsumi,
    entrate: data.entrate || [],
    trasferimenti: data.trasferimenti || [],
    contiRows,
    categorieEntrateRows,
    categorieUsciteRows,
    soglieRows: data.soglie || [],
    capitaleImpegnato: data.capitaleImpegnato || [],
    cruscottoInvestimenti: computedCruscotto.length > 0 ? computedCruscotto : (data.cruscottoInvestimenti || []),
    scalable: data.scalable || [],
    tradeRepublic: data.tradeRepublic || []
  };

  // Generiamo il body dinamicamente ciclando sulla configurazione (solo i tab
  // realmente presenti sul foglio, vedi sheetConfigToPush sopra)
  const valueData = sheetConfigToPush.map(sheet => {
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

    const rows = mapToRows(headers, targetData, fields, sheet.dateFields);
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

// Legge Conti/Categorie Entrate/Categorie Uscite/Soglie da un foglio Google SEPARATO
// (il "foglio di configurazione", vedi sf_config_spreadsheet_id in Impostazioni),
// per popolare i "Dati Base" con valori curati altrove invece del seed hardcoded.
// A differenza di fetchSpreadsheetData NON chiama ensureSheetsExist: non deve
// creare/alterare tab su un foglio che non è di proprietà esclusiva dell'app.
export const fetchDatiBaseFromConfigSheet = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{
  conti?: string[];
  categorieEntrate?: string[];
  macroCategorieUscite?: any[];
  soglie?: any[];
  presetUscite?: any[];
  presetTrasferimenti?: any[];
}> => {
  let sheets = SHEETS_CONFIG.filter(s =>
    ['Conti', 'Categorie Entrate', 'Categorie Uscite', 'Soglie', 'Preset Uscite Ricorrenti', 'Preset Trasferimenti Ricorrenti'].includes(s.title)
  );

  // Come in fetchSpreadsheetData: un solo range invalido fa fallire l'INTERO batchGet
  // con "Unable to parse range" (400). Scartiamo qui i tab che non esistono davvero
  // sul foglio di configurazione, cosi' un tab mancante non blocca gli altri tre.
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaResponse = await fetch(metaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });
    if (metaResponse.ok) {
      const metadata = await metaResponse.json();
      const actualTitles = (metadata.sheets || []).map((s: any) => String(s.properties?.title || '').toLowerCase());
      sheets = sheets.filter(s => actualTitles.includes(s.title.toLowerCase()));
    }
  } catch (err) {
    console.error('Error fetching config sheet metadata:', err);
  }

  if (sheets.length === 0) {
    return {};
  }

  const rangesParam = sheets.map(s => `ranges=${encodeURIComponent(s.range)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
    }
    let errorMsg = '';
    try {
      const errBody = await response.json();
      errorMsg = errBody?.error?.message;
    } catch (_) {}
    throw new Error(`Impossibile leggere il foglio di configurazione: ${errorMsg || response.statusText || `Codice ${response.status}`}`);
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

  const out: {
    conti?: string[]; categorieEntrate?: string[]; macroCategorieUscite?: any[]; soglie?: any[];
    presetUscite?: any[]; presetTrasferimenti?: any[];
  } = {};

  sheets.forEach(sheet => {
    const rows = getValueRangeForSheet(sheet.title);
    const items = mapFromRowsWithHeaders(rows, sheet.fields, sheet.headers, sheet.booleanFields || [], sheet.numberFields || []);

    if (sheet.title === 'Preset Uscite Ricorrenti') {
      out.presetUscite = items
        .map((r: any, i: number) => ({
          id: `preset-${i}`,
          nome: String(r.nome || '').trim(),
          macroCategoria: String(r.macroCategoria || '').trim(),
          categoria: String(r.categoria || '').trim(),
          conto: String(r.conto || '').trim(),
          importo: Number(r.importo || 0),
          giornoDelMese: Number(r.giornoDelMese || 1),
          primaria: Boolean(r.primaria)
        }))
        .filter((p: any) => p.nome);
    } else if (sheet.title === 'Preset Trasferimenti Ricorrenti') {
      out.presetTrasferimenti = items
        .map((r: any, i: number) => ({
          id: `preset-t-${i}`,
          categoria: String(r.categoria || '').trim(),
          contoOrdinante: String(r.contoOrdinante || '').trim(),
          contoBeneficiario: String(r.contoBeneficiario || '').trim(),
          importo: Number(r.importo || 0)
        }))
        .filter((p: any) => p.categoria);
    } else if (sheet.title === 'Conti') {
      out.conti = items.map((r: any) => String(r.nome || '').trim()).filter(Boolean);
    } else if (sheet.title === 'Categorie Entrate') {
      out.categorieEntrate = items.map((r: any) => String(r.nome || '').trim()).filter(Boolean);
    } else if (sheet.title === 'Categorie Uscite') {
      const macroMap = new Map<string, { nome: string; icon: string; categorie: string[] }>();
      items.forEach((r: any) => {
        const macro = String(r.macro || '').trim();
        if (!macro) return;
        if (!macroMap.has(macro)) {
          macroMap.set(macro, { nome: macro, icon: String(r.icon || '').trim() || '💸', categorie: [] });
        }
        const categoria = String(r.categoria || '').trim();
        if (categoria) macroMap.get(macro)!.categorie.push(categoria);
      });
      out.macroCategorieUscite = Array.from(macroMap.values());
    } else if (sheet.title === 'Soglie') {
      out.soglie = items
        .map((r: any) => {
          const raw = Number(r.percentuale || 0);
          return { categoria: String(r.categoria || '').trim(), percentuale: raw > 0 && raw <= 1 ? raw * 100 : raw };
        })
        .filter((s: any) => s.categoria);
    }
  });

  return out;
};

// PUSH di Conti/Categorie Entrate/Categorie Uscite/Soglie verso il foglio di
// configurazione (invece che verso il foglio principale): quei 4 tab sono
// curati lì, editarli dall'app (Dati Base in Impostazioni) deve scrivere sulla
// stessa fonte da cui fetchDatiBaseFromConfigSheet li importa ad ogni sync,
// altrimenti l'import automatico li sovrascriverebbe di nuovo al giro dopo.
// Come fetchDatiBaseFromConfigSheet, NON chiama ensureSheetsExist (non è un
// foglio di proprietà esclusiva dell'app) e scrive solo sui tab che esistono
// davvero, per non far fallire l'intero batchUpdate su un tab mancante.
export const pushDatiBaseToConfigSheet = async (
  accessToken: string,
  spreadsheetId: string,
  data: {
    conti?: string[];
    categorieEntrate?: string[];
    macroCategorieUscite?: any[];
    soglie?: any[];
    presetUscite?: any[];
    presetTrasferimenti?: any[];
  }
): Promise<void> => {
  // Nessun controllo su WRITE_TO_SHEETS_DISABLED qui: quel kill-switch copre solo
  // il foglio principale (vedi commento sopra la costante), questo scrive sul
  // foglio di configurazione, un percorso separato.
  let sheets = SHEETS_CONFIG.filter(s =>
    ['Conti', 'Categorie Entrate', 'Categorie Uscite', 'Soglie', 'Preset Uscite Ricorrenti', 'Preset Trasferimenti Ricorrenti'].includes(s.title)
  );

  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaResponse = await fetch(metaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' });
    if (metaResponse.ok) {
      const metadata = await metaResponse.json();
      const actualTitles = (metadata.sheets || []).map((s: any) => String(s.properties?.title || '').toLowerCase());
      sheets = sheets.filter(s => actualTitles.includes(s.title.toLowerCase()));
    }
  } catch (err) {
    console.error('Error fetching config sheet metadata before push:', err);
  }

  if (sheets.length === 0) return;

  const contiRows = (data.conti || []).map(nome => ({ nome }));
  const categorieEntrateRows = (data.categorieEntrate || []).map(nome => ({ nome }));
  const categorieUsciteRows = (data.macroCategorieUscite || []).flatMap((m: any) =>
    m.categorie.length > 0
      ? m.categorie.map((categoria: string) => ({ macro: m.nome, icon: m.icon, categoria }))
      : [{ macro: m.nome, icon: m.icon, categoria: '' }]
  );
  // Le soglie qui arrivano come 0-100 (formato editor app): il foglio le vuole come
  // frazione 0-1 (formato percentuale nativo di Google Sheets), stessa conversione
  // inversa fatta in fetchSpreadsheetData/fetchDatiBaseFromConfigSheet in lettura.
  const soglieRows = (data.soglie || []).map((s: any) => ({
    categoria: s.categoria,
    percentuale: Number(s.percentuale || 0) / 100
  }));

  const presetUsciteRows = (data.presetUscite || []).map((p: any) => ({
    giornoDelMese: p.giornoDelMese,
    nome: p.nome,
    macroCategoria: p.macroCategoria,
    categoria: p.categoria,
    conto: p.conto,
    importo: p.importo,
    primaria: p.primaria
  }));
  const presetTrasferimentiRows = (data.presetTrasferimenti || []).map((p: any) => ({
    categoria: p.categoria,
    contoOrdinante: p.contoOrdinante,
    contoBeneficiario: p.contoBeneficiario,
    importo: p.importo
  }));

  const dataMapForPush: Record<string, any[]> = {
    contiRows, categorieEntrateRows, categorieUsciteRows, soglieRows,
    presetUsciteRows, presetTrasferimentiRows
  };

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const valueData = sheets.map(sheet => {
    const targetData = dataMapForPush[sheet.dataKey] || [];
    const rows = mapToRows(sheet.headers, targetData, sheet.fields, sheet.dateFields);
    return { range: `${sheet.title}!A1`, values: rows };
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
    throw new Error(`Impossibile scrivere sul foglio di configurazione: ${errorMsg || response.statusText || `Codice ${response.status}`}`);
  }
};