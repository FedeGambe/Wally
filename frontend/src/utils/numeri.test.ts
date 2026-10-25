import { describe, it, expect } from 'vitest';
import { parseLocalizedNumber } from './numeri';

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
