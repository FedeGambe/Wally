import { describe, it, expect } from 'vitest';
import { scomponi, totali } from './useAnalisiConsumiPeriodo';
import type { Rifornimento } from './useAnalisiConsumiData';

const rif = (costo: number, litri: number, km: number): Rifornimento => ({
  date: new Date(2026, 0, 1), costo, quantitaLitri: litri, prezzoAlLitro: costo / litri,
  kmFinali: 0, kmEffettuati: km, kmAlLitroAuto: null, efficienzaPercentuale: 0
});

describe('totali', () => {
  it('calcola prezzo, km/litro e €/100 km come rapporti tra somme', () => {
    const t = totali([rif(36, 20, 400), rif(18, 10, 100)]);
    expect(t).toMatchObject({ spesa: 54, litri: 30, km: 500, rifornimenti: 2 });
    expect(t.prezzo).toBeCloseTo(1.8);
    expect(t.kmAlLitro).toBeCloseTo(500 / 30);
    expect(t.euroPer100Km).toBeCloseTo(10.8);
  });
});

describe('scomponi', () => {
  it('km, prezzo e consumo sommati danno esattamente la differenza di spesa', () => {
    const prima = totali([rif(36, 20, 400)]);   // 1,80 €/l, 20 km/l
    const dopo = totali([rif(57, 30, 540)]);    // 1,90 €/l, 18 km/l
    const s = scomponi(prima, dopo)!;
    expect(s.differenza).toBeCloseTo(21);
    expect(s.km + s.prezzo + s.consumo).toBeCloseTo(s.differenza, 10);
    expect(s.km).toBeCloseTo(140 * 1.8 / 20);        // più km
    expect(s.prezzo).toBeCloseTo(540 * 0.1 / 20);    // carburante più caro
    expect(s.consumo).toBeGreaterThan(0);            // meno km con un litro
  });
  it('null se un periodo non ha km o litri', () => {
    expect(scomponi(totali([]), totali([rif(36, 20, 400)]))).toBeNull();
  });
});
