/**
 * Nomi dei mesi in italiano, in ordine calendario. Era duplicato alla lettera
 * in 6 file (App, Header, Entrate, Investimenti, Panoramica, Patrimonio).
 */
export const MESI_ITALIANI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

/**
 * Riconosce il mese da una stringa libera (nome completo, abbreviato, IT o EN:
 * "Gennaio", "Gen", "Gen 26", "Jan"...). Ritorna -1 se non riconosciuto.
 * Versione unificata: prima esisteva anche una variante a match esatto che
 * falliva silenziosamente su abbreviazioni, con comportamento diverso da qui a lì.
 */
export function getMonthIndex(mese: string): number {
  const clean = String(mese || '').toLowerCase().trim();
  if (clean.includes('gen') || clean.includes('jan')) return 0;
  if (clean.includes('feb')) return 1;
  if (clean.includes('mar')) return 2;
  if (clean.includes('apr')) return 3;
  if (clean.includes('mag') || clean.includes('may')) return 4;
  if (clean.includes('giu') || clean.includes('jun')) return 5;
  if (clean.includes('lug') || clean.includes('jul')) return 6;
  if (clean.includes('ago') || clean.includes('aug')) return 7;
  if (clean.includes('set') || clean.includes('sep')) return 8;
  if (clean.includes('ott') || clean.includes('oct')) return 9;
  if (clean.includes('nov')) return 10;
  if (clean.includes('dic') || clean.includes('dec')) return 11;
  return -1;
}

/**
 * Estrae l'anno da una data transazione in formato gg/mm/aaaa o simili,
 * con fallback su pattern "20xx" nella stringa o anno corrente.
 */
export function getTransactionYear(t: { data?: string }): number {
  if (!t.data) return new Date().getFullYear();
  const parts = t.data.split(/[\/\-]/);
  if (parts.length === 3) {
    const yearPart = parts[2].length === 4 ? parts[2] : parts[0].length === 4 ? parts[0] : parts[2];
    const parsedYear = parseInt(yearPart, 10);
    if (!isNaN(parsedYear)) {
      if (parsedYear < 100) return 2000 + parsedYear;
      return parsedYear;
    }
  }
  const match = t.data.match(/\b(20\d{2})\b/);
  if (match) return parseInt(match[1], 10);

  const match2 = t.data.match(/\/(\d{2})$/);
  if (match2) return 2000 + parseInt(match2[1], 10);

  return new Date().getFullYear();
}
