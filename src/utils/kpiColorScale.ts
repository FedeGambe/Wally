/**
 * Scala colore continua per confrontare un valore KPI contro il suo storico (min/mediana/max).
 * Rosso (peggio) -> arancio -> ambra -> giallo-verde (mediana) -> verde smeraldo (meglio).
 * Va oltre le 3 fasce discrete: il colore è interpolato punto per punto sul valore reale.
 */

interface ColorStop {
  pos: number;
  rgb: [number, number, number];
}

const KPI_COLOR_STOPS: ColorStop[] = [
  { pos: 0, rgb: [187, 27, 27] },    // red-800 schiarito/reso più vivido (stessa tinta, meno scuro)
  { pos: 0.25, rgb: [249, 115, 22] }, // orange-500
  { pos: 0.4, rgb: [251, 191, 36] },  // amber-400
  { pos: 0.5, rgb: [163, 230, 53] },  // lime-400, "giallino tendente al verde": la mediana
  { pos: 1, rgb: [7, 207, 150] },     // emerald-700 schiarito/reso più vivido (stessa tinta, meno scuro)
];

function interpolateStops(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < KPI_COLOR_STOPS.length - 1; i++) {
    const a = KPI_COLOR_STOPS[i];
    const b = KPI_COLOR_STOPS[i + 1];
    if (clamped >= a.pos && clamped <= b.pos) {
      const f = (clamped - a.pos) / (b.pos - a.pos);
      return a.rgb.map((c, idx) => Math.round(c + f * (b.rgb[idx] - c))) as [number, number, number];
    }
  }
  return KPI_COLOR_STOPS[KPI_COLOR_STOPS.length - 1].rgb;
}

export interface KpiRange {
  min: number;
  median: number;
  max: number;
  /** Se false, i valori più bassi sono "migliori" (es. un costo): la scala viene invertita. Default true. */
  higherIsBetter?: boolean;
}

export function kpiColorRGB(value: number, range: KpiRange): [number, number, number] {
  const { min, median, max, higherIsBetter = true } = range;
  const lo = higherIsBetter ? min : max;
  const mid = median;
  const hi = higherIsBetter ? max : min;

  let t: number;
  if ((higherIsBetter && value <= mid) || (!higherIsBetter && value >= mid)) {
    // metà "peggiore": [lo, mid] -> [0, 0.5]
    t = lo === mid ? 0.5 : ((value - lo) / (mid - lo)) * 0.5;
  } else {
    // metà "migliore": [mid, hi] -> [0.5, 1]
    t = hi === mid ? 1 : 0.5 + ((value - mid) / (hi - mid)) * 0.5;
  }
  return interpolateStops(t);
}

export function kpiColor(value: number, range: KpiRange): string {
  const [r, g, b] = kpiColorRGB(value, range);
  return `rgb(${r} ${g} ${b})`;
}

export function kpiColorAlpha(value: number, range: KpiRange, alpha: number): string {
  const [r, g, b] = kpiColorRGB(value, range);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

// Variante scurita: per testo su sfondo chiaro/tinta o per badge pieni con testo bianco sopra,
// dove il colore "puro" della scala (es. il giallo-verde della mediana) non basta come contrasto.
export function kpiTextColor(value: number, range: KpiRange): string {
  const [r, g, b] = kpiColorRGB(value, range);
  const darken = 0.65;
  return `rgb(${Math.round(r * darken)} ${Math.round(g * darken)} ${Math.round(b * darken)})`;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
