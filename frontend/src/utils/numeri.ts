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

/**
 * Numero digitato in un campo del form (litri, €/Lt, km...). Il separatore
 * dei decimali può essere il punto o la virgola: "15,4" e "15.4" valgono
 * 15,4. A differenza di parseLocalizedNumber un punto solo è SEMPRE il
 * decimale ("1.789" €/Lt è 1,789, non 1789). Se ci sono entrambi, l'ultimo è
 * il decimale e l'altro separa le migliaia ("52.080,5" → 52080,5).
 * Campo vuoto o non numerico → NaN, così il form lo tratta come mancante.
 *
 * Esempio: parseNumeroInserito("52080,5") → 52080.5
 */
export const parseNumeroInserito = (val: string): number => {
  let str = String(val ?? '').trim().replace(/\s/g, '');
  if (!str) return NaN;
  const ultimaVirgola = str.lastIndexOf(',');
  const ultimoPunto = str.lastIndexOf('.');
  if (ultimaVirgola !== -1 && ultimoPunto !== -1) {
    const decimale = ultimaVirgola > ultimoPunto ? ',' : '.';
    const migliaia = decimale === ',' ? /\./g : /,/g;
    str = str.replace(migliaia, '');
  }
  str = str.replace(',', '.');
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(str)) return NaN;
  return parseFloat(str);
};

/** Lascia nel campo solo cifre, punto e virgola (niente lettere o spazi). */
export const pulisciNumeroInserito = (val: string): string => val.replace(/[^0-9.,]/g, '');
