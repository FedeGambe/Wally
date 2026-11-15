import { describe, expect, it } from 'vitest';
import { getThresholdsDelMese, sogliePerMese } from './thresholds';

const SOGLIE = [
  { categoria: 'Spese Primarie', percentuale: 35 },
  { categoria: 'Spese Primarie', percentuale: 40, dal: '2026-11' },
  { categoria: 'Risparmio', percentuale: 20, dal: '2026-06' },
  { categoria: 'Risparmio', percentuale: 25, dal: '2026-01' },
];

const perc = (anno: number, mese: number, nome: string) =>
  sogliePerMese(SOGLIE, anno, mese).find(s => s.categoria === nome)?.percentuale;

describe('sogliePerMese', () => {
  it('ogni mese prende la versione valida allora (mesi 0-11)', () => {
    expect(perc(2026, 9, 'Spese Primarie')).toBe(35);  // ottobre
    expect(perc(2026, 10, 'Spese Primarie')).toBe(40); // novembre
    expect(perc(2027, 1, 'Spese Primarie')).toBe(40);
    expect(perc(2026, 2, 'Risparmio')).toBe(25);
    expect(perc(2026, 6, 'Risparmio')).toBe(20);
  });

  it('prima di tutte le versioni vale la più vecchia', () => {
    expect(perc(2025, 4, 'Risparmio')).toBe(25);
    expect(sogliePerMese(SOGLIE, 2025, 4)).toHaveLength(2);
  });

  it('senza soglie non dà niente', () => {
    expect(sogliePerMese(undefined, 2026, 0)).toEqual([]);
  });
});

describe('getThresholdsDelMese', () => {
  it('le soglie del mese arrivano nei target', () => {
    expect(getThresholdsDelMese([], SOGLIE, 2026, 9).primarie).toBe(35);
    expect(getThresholdsDelMese([], SOGLIE, 2026, 10).primarie).toBe(40);
  });
});
