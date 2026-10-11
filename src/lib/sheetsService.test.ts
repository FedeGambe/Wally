import { describe, it, expect } from 'vitest';
import { parseLocalizedNumber, parseDateString, valoreAccodato, intervalloSomma, parsePresetInvestimentiMatrix, buildPresetInvestimentiMatrix } from './sheetsService';

describe('parseLocalizedNumber', () => {
  it('parses plain numbers unchanged', () => {
    expect(parseLocalizedNumber(123.45)).toBe(123.45);
  });

  it('parses Italian decimal comma', () => {
    expect(parseLocalizedNumber('123,45')).toBe(123.45);
  });

  it('parses Italian thousands + decimal (1.234,56)', () => {
    expect(parseLocalizedNumber('1.234,56')).toBe(1234.56);
  });

  it('parses US thousands + decimal (1,234.56)', () => {
    expect(parseLocalizedNumber('1,234.56')).toBe(1234.56);
  });

  it('parses US-style multiple comma thousands (1,234,567)', () => {
    expect(parseLocalizedNumber('1,234,567')).toBe(1234567);
  });

  it('parses Italian-style multiple dot thousands (1.234.567)', () => {
    expect(parseLocalizedNumber('1.234.567')).toBe(1234567);
  });

  it('treats a single dot with 3 trailing digits as Italian thousands (1.500)', () => {
    expect(parseLocalizedNumber('1.500')).toBe(1500);
  });

  it('treats a single dot with 2 trailing digits as decimal (123.45)', () => {
    expect(parseLocalizedNumber('123.45')).toBe(123.45);
  });

  it('handles negative values', () => {
    expect(parseLocalizedNumber('-1.234,56')).toBe(-1234.56);
  });

  it('strips currency symbols and whitespace', () => {
    expect(parseLocalizedNumber(' € 1.234,56 ')).toBe(1234.56);
  });

  it('returns 0 for null/undefined/empty', () => {
    expect(parseLocalizedNumber(null)).toBe(0);
    expect(parseLocalizedNumber(undefined)).toBe(0);
    expect(parseLocalizedNumber('')).toBe(0);
  });

  it('returns 0 for unparseable garbage', () => {
    expect(parseLocalizedNumber('n/d')).toBe(0);
  });
});

describe('parseDateString', () => {
  it('parses DD/MM/YYYY', () => {
    const d = parseDateString('25/12/2026');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(11);
    expect(d?.getDate()).toBe(25);
  });

  it('parses YYYY-MM-DD', () => {
    const d = parseDateString('2026-03-05');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(5);
  });

  it('parses two-digit year DD/MM/YY as 20xx when < 50', () => {
    const d = parseDateString('05/03/26');
    expect(d?.getFullYear()).toBe(2026);
  });

  it('parses two-digit year DD/MM/YY as 19xx when >= 50', () => {
    const d = parseDateString('05/03/85');
    expect(d?.getFullYear()).toBe(1985);
  });

  it('parses Google Sheets serial date numbers', () => {
    // Serial 1 = 1899-12-31 in the Sheets epoch (base 1899-12-30 + 1 day)
    const d = parseDateString('1');
    expect(d?.getFullYear()).toBe(1899);
    expect(d?.getMonth()).toBe(11);
    expect(d?.getDate()).toBe(31);
  });

  it('returns null for empty/falsy input', () => {
    expect(parseDateString('')).toBeNull();
    expect(parseDateString(null)).toBeNull();
    expect(parseDateString(undefined)).toBeNull();
  });

  it('returns null for unparseable strings', () => {
    expect(parseDateString('not-a-date')).toBeNull();
  });
});

describe('valoreAccodato (investimento una tantum)', () => {
  it('accoda a una formula esistente', () => {
    expect(valoreAccodato('=40*2', 50)).toBe('=40*2+50');
    expect(valoreAccodato('=R23', 12.5)).toBe('=R23+12.5');
  });

  it('trasforma un numero esistente in formula', () => {
    expect(valoreAccodato(40, 50)).toBe('=40+50');
    expect(valoreAccodato('135', 20)).toBe('=135+20');
  });

  it('scrive solo l\'importo su cella vuota o a zero', () => {
    expect(valoreAccodato(undefined, 50)).toBe(50);
    expect(valoreAccodato('', 50)).toBe(50);
    expect(valoreAccodato(0, 50)).toBe(50);
  });
});

describe('intervalloSomma (colonna nuova dentro "Importo investito Mensile")', () => {
  it('Trade Republic: SUM(B:I) dentro IF/COUNTA', () => {
    expect(intervalloSomma('=IF(COUNTA(B23:I23)>0,SUM(B23:I23)+S23,"")')).toEqual({ inizio: 1, fine: 8 });
  });

  it('Scalable: SUM(B:H) più colonne singole', () => {
    expect(intervalloSomma('=SUM(B30:H30)+J30+L30+N30+(Z30)')).toEqual({ inizio: 1, fine: 7 });
  });

  it('accetta la sintassi italiana', () => {
    expect(intervalloSomma('=SE(CONTA.VALORI(B22:I22)>0;SOMMA(B22:I22)+S22;"")')).toEqual({ inizio: 1, fine: 8 });
  });

  it('null senza un intervallo sommato', () => {
    expect(intervalloSomma('=B3+C3')).toBeNull();
    expect(intervalloSomma('')).toBeNull();
  });
});

describe('matrice Preset Investimenti Ricorrenti', () => {
  const righe = [
    ['Conto', 'Europe 600', 'MSCI World Value Factor', 'FTSE All-World', 'MSCI World Small Cap', 'FTSE Dev Asia', '2036 Corp Bonds', '2028 Euro Gov Bonds'],
    ['Scalable', '40', '70', '135'],
    ['Trade Republic', '', '', '', '80', '50', '50', '52']
  ];

  it('legge una voce per cella valorizzata', () => {
    const preset = parsePresetInvestimentiMatrix(righe);
    expect(preset.map(p => [p.broker, p.strumento, p.importo])).toEqual([
      ['Scalable', 'Europe 600', 40],
      ['Scalable', 'MSCI World Value Factor', 70],
      ['Scalable', 'FTSE All-World', 135],
      ['Trade Republic', 'MSCI World Small Cap', 80],
      ['Trade Republic', 'FTSE Dev Asia', 50],
      ['Trade Republic', '2036 Corp Bonds', 50],
      ['Trade Republic', '2028 Euro Gov Bonds', 52]
    ]);
  });

  it('riscrive la stessa matrice', () => {
    const ricostruita = buildPresetInvestimentiMatrix(parsePresetInvestimentiMatrix(righe));
    expect(ricostruita[0]).toEqual(righe[0]);
    expect(ricostruita[1]).toEqual(['Scalable', 40, 70, 135, '', '', '', '']);
    expect(ricostruita[2]).toEqual(['Trade Republic', '', '', '', 80, 50, 50, 52]);
  });

  it('accetta importi in formato italiano e ignora le celle vuote', () => {
    const preset = parsePresetInvestimentiMatrix([['Conto', 'A', 'B'], ['Scalable', '€139,22', '']]);
    expect(preset).toHaveLength(1);
    expect(preset[0].importo).toBe(139.22);
  });
});
