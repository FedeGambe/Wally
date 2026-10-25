/**
 * Numeri scritti nelle celle, in formato italiano (1.234,56) o americano
 * (1,234.56). La lettura del foglio la fa il backend (backend/domain/
 * conversioni.py, stessa regola): qui serve solo per i valori che il
 * frontend rielabora (investimentiRicorrenti.ts).
 */
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
