import { describe, expect, it } from 'vitest';
import type { EntrataRecord } from '../data/mockData';
import { spendibileDaFormula, stipendioMediano } from './stipendioStimato';

const stipendio = (mese: string, anno: number, importo: number, categoria = 'Stipendio'): EntrataRecord =>
  ({ id: `${mese}${anno}${importo}`, data: '', mese, anno, descrizione: '', categoria, conto: 'Unicredit', importo });

// Gli stipendi veri del 2026 (luglio con la quattordicesima).
const entrate = [
  stipendio('aprile', 2026, 1653.48), stipendio('maggio', 2026, 1653.48), stipendio('giugno', 2026, 1621.6),
  stipendio('luglio', 2026, 2030.37), stipendio('agosto', 2026, 1627.97), stipendio('settembre', 2026, 1627.97),
  stipendio('ottobre', 2026, 1620.53), stipendio('novembre', 2026, 4.25, 'Interessi')
];

describe('stipendioMediano', () => {
  it('usa la mediana degli ultimi 6 mesi finché lo stipendio del mese manca', () => {
    expect(stipendioMediano(entrate, new Date(2026, 10, 1))).toBe(1627.97);
  });
  it('non stima niente quando lo stipendio del mese è registrato', () => {
    expect(stipendioMediano([...entrate, stipendio('novembre', 2026, 1630)], new Date(2026, 10, 20))).toBeNull();
  });
  it('senza stipendi passati non stima niente', () => {
    expect(stipendioMediano([], new Date(2026, 10, 1))).toBeNull();
  });
});

describe('spendibileDaFormula', () => {
  it('primarie sotto il 35%: il 15% delle entrate', () => {
    expect(spendibileDaFormula(1632.22, 212)).toBeCloseTo(244.83, 2);
  });
  it('primarie dal 35% in su: entrate meno primarie meno il 50%', () => {
    expect(spendibileDaFormula(1000, 400)).toBeCloseTo(100, 2);
  });
});
