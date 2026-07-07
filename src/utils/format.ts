/**
 * Formattatori condivisi per valori monetari e percentuali (locale it-IT).
 * Centralizzati qui perché erano duplicati (con piccole differenze) in 8 file:
 * un fix di formattazione va fatto in un solo posto, non in otto.
 */

export function formatEuro(value: unknown): string {
  if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
    return '***';
  }
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: true }).format(Number(value));
}

interface FormatPercentOptions {
  /** Cifre decimali minime (default 1). AnalisiConsumi usa 0 per non forzare ".0". */
  minDecimals?: number;
  /** Antepone "+" ai valori positivi (usato per i rendimenti in Investimenti). */
  signed?: boolean;
}

export function formatPercent(value: unknown, { minDecimals = 1, signed = false }: FormatPercentOptions = {}): string {
  if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
    return '***%';
  }
  const num = Number(value);
  const sign = signed && num >= 0 ? '+' : '';
  return sign + num.toLocaleString('it-IT', { minimumFractionDigits: minDecimals, maximumFractionDigits: 1 }) + '%';
}
