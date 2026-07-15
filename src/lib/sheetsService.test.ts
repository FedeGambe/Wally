import { describe, it, expect } from 'vitest';
import { parseLocalizedNumber, parseDateString } from './sheetsService';

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
