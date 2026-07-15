/**
 * Sposta i riferimenti di riga in una formula Google Sheets, replicando la
 * stessa regola che usa Sheets quando trascini/copi una formula in basso:
 * i riferimenti SENZA $ davanti al numero di riga avanzano di `deltaRows`,
 * quelli ancorati (es. $B$2, o la parte riga di B$2) restano fermi. Gestisce
 * anche riferimenti con nome foglio (Foglio1!B12) e range (B2:B12), perché
 * ogni riferimento cella viene trattato indipendentemente dal regex.
 *
 * Usato da Analisi Consumi (Fase 3 del piano, docs/PIANO-INSERIMENTO-DATI.md):
 * per i campi calcolati dal foglio Google (Km effettuati, €/100km, ecc.) non
 * proviamo a reimplementare la formula — copiamo quella della riga sopra e la
 * shiftiamo, così il valore vero lo calcola sempre Sheets, non noi.
 *
 * Limite noto: regge riferimenti relativi/ancorati "normali". Non gestisce
 * INDIRECT() o range con nome — in quel caso la formula esce invariata (non
 * è detto sia corretta per la nuova riga, va verificata a mano).
 */
const CELL_REF_REGEX = /(\$?)([A-Z]{1,3})(\$?)(\d+)/g;

export function shiftFormulaRows(formula: string, deltaRows: number): string {
  if (!formula || !formula.startsWith('=')) return formula;
  return formula.replace(CELL_REF_REGEX, (match, colAnchor, col, rowAnchor, row) => {
    if (rowAnchor === '$') return match;
    const newRow = parseInt(row, 10) + deltaRows;
    return `${colAnchor}${col}${rowAnchor}${newRow}`;
  });
}
