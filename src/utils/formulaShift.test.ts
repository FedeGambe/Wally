import { describe, it, expect } from 'vitest';
import { shiftFormulaRows } from './formulaShift';

describe('shiftFormulaRows', () => {
  it('shifts a simple relative reference', () => {
    expect(shiftFormulaRows('=E15-E14', 1)).toBe('=E16-E15');
  });

  it('does not shift an absolute row reference ($)', () => {
    expect(shiftFormulaRows('=B12-B$2', 1)).toBe('=B13-B$2');
  });

  it('does not shift a fully anchored reference', () => {
    expect(shiftFormulaRows('=$A$1*2', 1)).toBe('=$A$1*2');
  });

  it('keeps an anchored range start while extending the relative end (growing median)', () => {
    expect(shiftFormulaRows('=MEDIAN($B$2:B12)', 1)).toBe('=MEDIAN($B$2:B13)');
  });

  it('shifts a cross-sheet reference, leaving the sheet name untouched', () => {
    expect(shiftFormulaRows("=Rendimenti!B12", 1)).toBe("=Rendimenti!B13");
  });

  it('shifts multi-letter columns', () => {
    expect(shiftFormulaRows('=AA5+AB5', 2)).toBe('=AA7+AB7');
  });

  it('handles a negative delta (shifting up)', () => {
    expect(shiftFormulaRows('=C10/D10', -1)).toBe('=C9/D9');
  });

  it('returns non-formula strings unchanged', () => {
    expect(shiftFormulaRows('12.5', 1)).toBe('12.5');
    expect(shiftFormulaRows('', 1)).toBe('');
  });

  it('shifts multiple references independently in the same formula', () => {
    expect(shiftFormulaRows('=IF(B12>0, C12/B12, 0)', 1)).toBe('=IF(B13>0, C13/B13, 0)');
  });
});
