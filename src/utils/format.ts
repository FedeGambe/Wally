/**
 * Formattatori condivisi per valori monetari e percentuali (locale it-IT).
 * Centralizzati qui perché erano duplicati (con piccole differenze) in 8 file:
 * un fix di formattazione va fatto in un solo posto, non in otto.
 * formatEuro/formatPercent sono usati da quasi tutte le pagine (Entrate, Uscite,
 * Patrimonio, Panoramica, Drawer, FinanceKpiCard...). rendColor/rendColorAlpha
 * sono usati solo dalle viste Investimenti (Conti.tsx, Rendimenti.tsx) per colorare
 * i rendimenti % in base a quanto sono positivi o negativi.
 */

export function formatEuro(value: unknown): string {
  // Valore mancante/non numerico: mostriamo "***" invece di un numero errato tipo "0€" o "NaN".
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
  // Stessa logica di formatEuro: valore non valido -> placeholder "***%" invece di un numero fasullo.
  if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
    return '***%';
  }
  const num = Number(value);
  const sign = signed && num >= 0 ? '+' : '';
  return sign + num.toLocaleString('it-IT', { minimumFractionDigits: minDecimals, maximumFractionDigits: 1 }) + '%';
}

// ponytail: scala colore graduata rosso->arancione->giallo->verde, satura a ±maxAbs
const REND_COLOR_STOPS: { pos: number; rgb: [number, number, number] }[] = [
  { pos: -1, rgb: [244, 63, 94] },     // rose-500
  { pos: -1 / 3, rgb: [249, 115, 22] }, // orange-500
  { pos: 1 / 3, rgb: [234, 179, 8] },   // yellow-500
  { pos: 1, rgb: [16, 185, 129] },     // emerald-500 (verde già usato nell'app)
];
function rendColorRGB(perc: number, maxAbs = 4): [number, number, number] {
  const t = Math.max(-1, Math.min(1, perc / maxAbs));
  for (let i = 0; i < REND_COLOR_STOPS.length - 1; i++) {
    const a = REND_COLOR_STOPS[i], b = REND_COLOR_STOPS[i + 1];
    if (t >= a.pos && t <= b.pos) {
      const f = (t - a.pos) / (b.pos - a.pos);
      return a.rgb.map((c, idx) => Math.round(c + f * (b.rgb[idx] - c))) as [number, number, number];
    }
  }
  return REND_COLOR_STOPS[REND_COLOR_STOPS.length - 1].rgb;
}
export function rendColor(perc: number, maxAbs = 4): string {
  const [r, g, b] = rendColorRGB(perc, maxAbs);
  return `rgb(${r} ${g} ${b})`;
}
/** Stessa scala di rendColor ma con alpha, per badge a sfondo opacizzato e bordo pieno. */
export function rendColorAlpha(perc: number, alpha: number, maxAbs = 4): string {
  const [r, g, b] = rendColorRGB(perc, maxAbs);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
