/**
 * Converts a raw Google Sheets column header name to a valid, clean camelCase field name for TypeScript/JavaScript objects.
 * Handles spaces, special characters (&, %, -, +), accents, and ensures it doesn't start with a number.
 */
export function toValidFieldName(str: string): string {
  if (!str) return 'column';

  // Replace common characters with words or clean equivalents
  let cleaned = str
    .replace(/&/g, 'And')
    .replace(/%/g, 'Pct')
    .replace(/\+/g, 'Plus')
    .normalize('NFD') // remove accents/diacritics
    .replace(/[\u0300-\u036f]/g, '');

  // Keep only alphanumeric, spaces, hyphens, and underscores
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s-_]/g, '');

  const words = cleaned.trim().split(/[\s-_]+/);
  const camelCased = words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');

  // Ensure it doesn't start with a number. If it does, prepend 'col'
  if (/^[0-9]/.test(camelCased)) {
    return 'col' + camelCased;
  }

  return camelCased || 'column';
}

export interface DetectedColumns {
  fields: string[];
  headers: string[];
  numberFields: string[];
  dynamicFields: string[];
  dynamicHeaders: string[];
}

/**
 * Reads row 1 and row 2 of a sheet and extracts fixed and dynamic columns.
 * Dynamic columns are identified when row 2 contains "Azioni", "Obbligazioni", or "Monetari" (case-insensitive).
 */
export function parseSheetColumns(row1: any[], row2: any[]): DetectedColumns {
  const fields: string[] = [];
  const headers: string[] = [];
  const numberFields: string[] = [];
  const dynamicFields: string[] = [];
  const dynamicHeaders: string[] = [];

  if (!row1 || row1.length === 0) {
    return { fields, headers, numberFields, dynamicFields, dynamicHeaders };
  }

  const maxCols = row1.length;
  for (let colIdx = 0; colIdx < maxCols; colIdx++) {
    const headerName = String(row1[colIdx] || '').trim();
    if (!headerName) continue;

    const row2Val = row2 && row2[colIdx] ? String(row2[colIdx]).trim() : '';
    const row2Lower = row2Val.toLowerCase();

    // Check if it's a dynamic column
    const isDynamic = 
      row2Lower.includes('azioni') || 
      row2Lower.includes('obbligazione') || 
      row2Lower.includes('obbligazioni') || 
      row2Lower.includes('bond') || 
      row2Lower.includes('monetari');

    const fieldName = toValidFieldName(headerName);

    fields.push(fieldName);
    headers.push(headerName);

    // If it's not the first column (which is typically date/ID), and has a category, treat it as a number field
    // (e.g. Liquidità, Azioni, Obbligazioni, Monetari are all numerical balances/values)
    if (colIdx > 0) {
      numberFields.push(fieldName);
    }

    if (isDynamic) {
      dynamicFields.push(fieldName);
      dynamicHeaders.push(headerName);
    }
  }

  return {
    fields,
    headers,
    numberFields,
    dynamicFields,
    dynamicHeaders
  };
}
