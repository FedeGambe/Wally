/**
 * Nome di campo dell'app da un'intestazione del foglio (colonne strumento dei
 * broker). Deve dare lo stesso risultato di nome_campo in backend/domain/righe.py,
 * che crea i campi in lettura: investimentiRicorrenti.ts li ritrova con questa.
 */

/**
 * Converts a raw Google Sheets column header name to a valid, clean camelCase field name for TypeScript/JavaScript objects.
 * Handles spaces, special characters (&, %, -, +), accents, and ensures it doesn't start with a number.
 */
export function toValidFieldName(str: string): string {
  if (!str) return 'column';

  // Sostituisce simboli comuni con parole equivalenti, poi rimuove gli accenti:
  // .normalize('NFD') scompone es. "\u00e0" in "a" + accento separato, e la regex successiva
  // elimina il carattere di accento (categoria unicode combining diacritical marks).
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
