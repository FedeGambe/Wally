import { describe, it, expect } from 'vitest';
import { parseNumeroInserito } from './numeri';

describe('parseNumeroInserito', () => {
  it('accetta la virgola come decimale', () => {
    expect(parseNumeroInserito('52080,5')).toBe(52080.5);
    expect(parseNumeroInserito('15,35')).toBe(15.35);
  });
  it('accetta il punto come decimale, anche con 3 cifre dopo', () => {
    expect(parseNumeroInserito('52080.5')).toBe(52080.5);
    expect(parseNumeroInserito('1.789')).toBe(1.789);
  });
  it('con punto e virgola insieme, l\'ultimo è il decimale', () => {
    expect(parseNumeroInserito('52.080,5')).toBe(52080.5);
    expect(parseNumeroInserito('52,080.5')).toBe(52080.5);
  });
  it('interi e casi limite', () => {
    expect(parseNumeroInserito('52080')).toBe(52080);
    expect(parseNumeroInserito('0,5')).toBe(0.5);
    expect(parseNumeroInserito(',5')).toBe(0.5);
    expect(parseNumeroInserito('12,')).toBe(12);
    expect(parseNumeroInserito('')).toBeNaN();
    expect(parseNumeroInserito('abc')).toBeNaN();
    expect(parseNumeroInserito('1,2,3')).toBeNaN();
  });
});
