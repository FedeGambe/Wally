import { describe, it, expect } from 'vitest';
import { consumoGiaRegistrato, isUscitaRifornimento } from './rifornimenti';

const consumi = [
  { data: '20/11/2026', costo: 40 },
  { data: '05/11/2026', costo: 35.5 },
];

describe('consumoGiaRegistrato', () => {
  it('stesso giorno: già registrato, qualunque sia il costo', () => {
    expect(consumoGiaRegistrato(consumi, '20/11/2026', 12)).toBe(true);
  });
  it('pochi giorni dopo con lo stesso costo: già registrato', () => {
    expect(consumoGiaRegistrato(consumi, '22/11/2026', 40.2)).toBe(true);
  });
  it('pochi giorni dopo con un costo diverso: manca', () => {
    expect(consumoGiaRegistrato(consumi, '22/11/2026', 30)).toBe(false);
  });
  it('troppo lontano: manca', () => {
    expect(consumoGiaRegistrato(consumi, '25/11/2026', 40)).toBe(false);
  });
  it('nessun consumo o data illeggibile', () => {
    expect(consumoGiaRegistrato([], '20/11/2026', 40)).toBe(false);
    expect(consumoGiaRegistrato(consumi, '', 40)).toBe(false);
  });
});

describe('isUscitaRifornimento', () => {
  it('riconosce la categoria senza badare alle maiuscole', () => {
    expect(isUscitaRifornimento('Rifornimento')).toBe(true);
    expect(isUscitaRifornimento(' rifornimento ')).toBe(true);
    expect(isUscitaRifornimento('Assicurazione')).toBe(false);
  });
});
