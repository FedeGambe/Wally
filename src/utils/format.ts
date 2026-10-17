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

// Scala dei rendimenti per segno (regola Segno Semantico di docs/DESIGN.md): negativi
// sempre rosa-rosso, positivi sempre verdi, più intensi quanto più ci si avvicina a
// ±maxAbs. Prima c'era una scala unica rosso->arancio->giallo->verde, e un -40 €
// risultava arancio e un +75 € giallo, cioè una perdita non rossa e un guadagno "avviso".
const REND_NEG: [[number, number, number], [number, number, number]] = [[253, 164, 175], [225, 29, 72]];   // rose-300 -> rose-600
const REND_POS: [[number, number, number], [number, number, number]] = [[110, 231, 183], [5, 150, 105]];  // emerald-300 -> emerald-600
function rendColorRGB(perc: number, maxAbs = 4): [number, number, number] {
  const t = Math.min(1, Math.abs(perc) / maxAbs);
  const [da, a] = perc < 0 ? REND_NEG : REND_POS;
  return da.map((c, idx) => Math.round(c + t * (a[idx] - c))) as [number, number, number];
}
export function rendColor(perc: number, maxAbs = 4): string {
  const [r, g, b] = rendColorRGB(perc, maxAbs);
  return `rgb(${r} ${g} ${b})`;
}
/** rendColor per il TESTO: mescolato con --kpi-testo-mix (index.css) per stare sopra
 * 4,5:1 in entrambi i temi, come kpiColorTesto. rendColor puro solo per bordi e fondi. */
export function rendColorTesto(perc: number, maxAbs = 4): string {
  const [r, g, b] = rendColorRGB(perc, maxAbs);
  return `color-mix(in srgb, rgb(${r} ${g} ${b}), var(--kpi-testo-mix))`;
}
/** Stessa scala di rendColor ma con alpha, per badge a sfondo opacizzato e bordo pieno. */
export function rendColorAlpha(perc: number, alpha: number, maxAbs = 4): string {
  const [r, g, b] = rendColorRGB(perc, maxAbs);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

// Stesso algoritmo "nice number" usato da d3/Recharts per scegliere lo step tra un
// tick e l'altro di un asse numerico (1/2/5 * potenza di 10): serve a prevedere,
// senza aspettare il rendering, se i tick generati saranno tutti multipli di mille.
function niceAxisStep(maxAbs: number, tickCount = 5): number {
  if (!isFinite(maxAbs) || maxAbs <= 0) return 1;
  const rawStep = maxAbs / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  if (residual > 5) return 10 * magnitude;
  if (residual > 2) return 5 * magnitude;
  if (residual > 1) return 2 * magnitude;
  return magnitude;
}

/**
 * Formatta un tick di un asse Y in versione compatta "k" (2000 -> "2k") su mobile,
 * ma SOLO se tutti i tick non-zero dell'asse cadono in scala di migliaia (step tra
 * un tick e l'altro >= 1000). Se la scala mescola centinaia e migliaia (es. step 250
 * su un massimo di 1200), i numeri restano per intero: altrimenti "500" letto come
 * "0,5k" confonderebbe più di quanto risparmi spazio.
 */
export function formatAxisCompact(value: unknown, maxAbsValue: number, prefix = '€'): string {
  const num = Number(value);
  if (isNaN(num)) return '';
  if (niceAxisStep(Math.abs(maxAbsValue)) >= 1000) {
    return `${prefix}${(num / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k`;
  }
  return `${prefix}${num.toLocaleString('it-IT', { useGrouping: true })}`;
}
