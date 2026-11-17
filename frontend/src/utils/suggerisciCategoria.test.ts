import { describe, expect, it } from 'vitest';
import { creaSuggeritore, pezziDiParola, type UscitaNota } from './suggerisciCategoria';

const uscita = (data: string, descrizione: string, macroCategoria: string, categoria: string, importo: number, conto = 'Trade Republic'): UscitaNota =>
  ({ data, descrizione, macroCategoria, categoria, importo, conto });

const storico: UscitaNota[] = [
  uscita('03/10/2026', 'Benzina', 'Automobile', 'Rifornimento', 38.4),
  uscita('17/10/2026', 'Benzina Esso', 'Automobile', 'Rifornimento', 41.1),
  uscita('01/11/2026', 'Rifornimento', 'Automobile', 'Rifornimento', 35),
  uscita('05/10/2026', 'Caffè', 'Cibo', 'Bar', 1.2),
  uscita('06/10/2026', 'Caffe e brioche', 'Cibo', 'Bar', 2.5),
  uscita('07/10/2026', 'Caffè', 'Cibo', 'Bar', 1.2),
  uscita('08/10/2026', 'Pranzo Lavoro', 'Cibo', 'Spesa', 0.62),
  uscita('09/10/2026', 'Pranzo Lavoro', 'Cibo', 'Spesa', 0.51),
  uscita('10/10/2026', 'Cena pizzeria', 'Cibo', 'Ristorante', 28),
  uscita('02/10/2026', 'pac Trade Republic', 'Movimenti', 'PAC', 280),
];
const oggi = new Date(2026, 10, 17);

describe('pezziDiParola', () => {
  it('toglie accenti e punteggiatura e spezza in pezzi da 2 a 4 lettere', () => {
    const pezzi = pezziDiParola('Caffè!');
    expect(pezzi).toContain(' c');
    expect(pezzi).toContain('caff');
    expect(pezzi).toContain('fe ');
    expect(pezzi.some(p => /[è!]/.test(p))).toBe(false);
  });
});

describe('creaSuggeritore', () => {
  const suggerisci = creaSuggeritore(storico, oggi);

  it('con la descrizione propone la categoria di descrizioni simili', () => {
    const [primo] = suggerisci({ descrizione: 'benzina', importo: 40, conto: 'Trade Republic', data: oggi });
    expect(primo).toMatchObject({ macroCategoria: 'Automobile', categoria: 'Rifornimento' });
  });

  it('riconosce anche parole scritte un po\' diverse', () => {
    const [primo] = suggerisci({ descrizione: 'caffe', importo: 1.2, conto: 'Trade Republic', data: oggi });
    expect(primo.categoria).toBe('Bar');
  });

  it('senza descrizione usa importo e conto (i movimenti Trade Republic)', () => {
    expect(suggerisci({ descrizione: '', importo: 0.58, conto: 'Trade Republic', data: oggi })[0].categoria).toBe('Spesa');
    expect(suggerisci({ descrizione: '', importo: 39, conto: 'Trade Republic', data: oggi })[0].categoria).toBe('Rifornimento');
  });

  it('una descrizione mai vista non decide: valgono importo e conto', () => {
    const [primo] = suggerisci({ descrizione: 'xyzw qkj', importo: 0.6, conto: 'Trade Republic', data: oggi });
    expect(primo.categoria).toBe('Spesa');
    expect(suggerisci({ descrizione: 'xyzw qkj', importo: 0, conto: 'Trade Republic', data: oggi })).toEqual([]);
  });

  it('non propone PAC, trasferimenti e correttivi', () => {
    const tutti = suggerisci({ descrizione: 'pac', importo: 280, conto: 'Trade Republic', data: oggi }, 10);
    expect(tutti.some(s => s.macroCategoria === 'Movimenti')).toBe(false);
  });

  it('scarta le categorie che non esistono più e restituisce al massimo quelle chieste', () => {
    const s = suggerisci({ descrizione: 'caffe', importo: 1.2, conto: 'Trade Republic', data: oggi }, 2, (_m, c) => c !== 'Bar');
    expect(s.length).toBeLessThanOrEqual(2);
    expect(s.some(x => x.categoria === 'Bar')).toBe(false);
  });

  it('senza descrizione né importo, o senza storico, non propone niente', () => {
    expect(suggerisci({ descrizione: '', importo: 0, conto: 'Trade Republic', data: oggi })).toEqual([]);
    expect(creaSuggeritore([], oggi)({ descrizione: 'benzina', importo: 40, conto: 'X', data: oggi })).toEqual([]);
  });
});
