import { describe, it, expect } from 'vitest';
import { strumentiBroker, meseLabelBroker, importoGiaInserito } from './investimentiRicorrenti';

// Forma dei dati come la produce fetchSpreadsheetData per il tab Trade Republic.
const data = {
  tradeRepublic: [
    { mese: 'settembre 2026', msciWorldSmallCap: 80, ftseDevAsia: 50 },
    { mese: 'ottobre 2026', msciWorldSmallCap: '€ 80,00', ftseDevAsia: 0 }
  ],
  tradeRepublicFields: ['mese', 'msciWorldSmallCap', 'ftseDevAsia', 'saldoConto'],
  tradeRepublicHeaders: ['Mese', 'MSCI World Small Cap', 'FTSE Dev Asia', 'Saldo Conto'],
  tradeRepublicColumnCategories: { msciWorldSmallCap: 'azioni', ftseDevAsia: 'azioni' }
};

describe('investimentiRicorrenti', () => {
  it('strumenti = solo colonne con asset class', () => {
    expect(strumentiBroker(data, 'Trade Republic')).toEqual(['MSCI World Small Cap', 'FTSE Dev Asia']);
    expect(strumentiBroker(data, 'Scalable')).toEqual([]);
  });

  it('etichetta del mese come in colonna A', () => {
    expect(meseLabelBroker(new Date(2026, 9, 11))).toBe('ottobre 2026');
  });

  it('importo già inserito nella cella mese×strumento', () => {
    expect(importoGiaInserito(data, 'Trade Republic', 'MSCI World Small Cap', 'ottobre 2026')).toBe(80);
    expect(importoGiaInserito(data, 'Trade Republic', 'FTSE Dev Asia', 'ottobre 2026')).toBe(0);
    expect(importoGiaInserito(data, 'Trade Republic', 'FTSE Dev Asia', 'novembre 2026')).toBe(0);
  });
});
