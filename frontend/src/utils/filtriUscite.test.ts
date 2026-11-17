import { describe, expect, it } from 'vitest';
import type { Transaction } from '../data/mockData';
import { FILTRI_USCITE_VUOTI, ORDINAMENTO_USCITE_DEFAULT, filtraUscite, ordinaUscite } from './filtriUscite';
import { dataTransazioneMs } from './date';

const tx = (id: string, data: string, importo: number, extra: Partial<Transaction> = {}): Transaction => ({
  id, data, mese: '', descrizione: `Spesa ${id}`, macroCategoria: 'Automobile', categoria: 'Rifornimento',
  icon: '', conto: 'Conto A', importo, primaria: true, ...extra
});

const elenco = [
  tx('a', '05/03/2025', 40),
  tx('b', '28/12/2024', 60, { categoria: 'Assicurazione' }),
  tx('c', '2025-03-20', 10, { macroCategoria: 'Cibo', categoria: 'Spesa', primaria: false, conto: 'Conto B' }),
  tx('d', '01/01/2026', 55)
];

describe('dataTransazioneMs', () => {
  it('legge gg/mm/aaaa e aaaa-mm-gg', () => {
    expect(dataTransazioneMs('05/03/2025')).toBe(new Date(2025, 2, 5).getTime());
    expect(dataTransazioneMs('2025-03-20')).toBe(new Date(2025, 2, 20).getTime());
    expect(dataTransazioneMs('boh')).toBe(0);
  });
});

describe('ordinaUscite', () => {
  it('di default dalla più recente', () => {
    expect(ordinaUscite(elenco, ORDINAMENTO_USCITE_DEFAULT).map(t => t.id)).toEqual(['d', 'c', 'a', 'b']);
  });
  it('per importo crescente', () => {
    expect(ordinaUscite(elenco, { colonna: 'importo', verso: 'asc' }).map(t => t.id)).toEqual(['c', 'a', 'd', 'b']);
  });
});

describe('filtraUscite', () => {
  it('filtra per categoria, tipo, conto e importo', () => {
    expect(filtraUscite(elenco, { ...FILTRI_USCITE_VUOTI, categoria: 'Rifornimento' }).map(t => t.id)).toEqual(['a', 'd']);
    expect(filtraUscite(elenco, { ...FILTRI_USCITE_VUOTI, tipo: 'secondarie' }).map(t => t.id)).toEqual(['c']);
    expect(filtraUscite(elenco, { ...FILTRI_USCITE_VUOTI, conto: 'Conto B' }).map(t => t.id)).toEqual(['c']);
    expect(filtraUscite(elenco, { ...FILTRI_USCITE_VUOTI, importoMin: '40', importoMax: '55,5' }).map(t => t.id)).toEqual(['a', 'd']);
  });
  it('testo libero e data "contiene"', () => {
    expect(filtraUscite(elenco, { ...FILTRI_USCITE_VUOTI, testo: 'rifor' }).map(t => t.id)).toEqual(['a', 'd']);
    expect(filtraUscite(elenco, { ...FILTRI_USCITE_VUOTI, data: '/2024' }).map(t => t.id)).toEqual(['b']);
  });
  it('ignora i filtri indicati', () => {
    expect(filtraUscite(elenco, { ...FILTRI_USCITE_VUOTI, macro: 'Cibo' }, ['macro'])).toHaveLength(4);
  });
});
