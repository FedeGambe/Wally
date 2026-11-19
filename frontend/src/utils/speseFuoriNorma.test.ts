import { describe, expect, it } from 'vitest';
import type { Transaction } from '../data/mockData';
import { speseFuoriNorma } from './speseFuoriNorma';

let n = 0;
const tx = (anno: number, mese: number, importo: number, categoria = 'Bar', macroCategoria = 'Cibo'): Transaction => ({
  id: String(n++), data: `10/${String(mese).padStart(2, '0')}/${anno}`, mese: '', descrizione: '', macroCategoria,
  categoria, icon: '', conto: 'Conto', importo, primaria: false
});
/** Dicembre 2026 come mese da guardare; i 12 mesi prima sono dic 2025 → nov 2026. */
const DIC_2026 = 2026 * 12 + 11;
const anno = (importo: number, categoria?: string, macro?: string) =>
  [[2025, 12], ...Array.from({ length: 11 }, (_, i) => [2026, i + 1])].map(([a, m]) => tx(a, m, importo, categoria, macro));

describe('speseFuoriNorma', () => {
  it('ricorrente: segnala solo ben sopra la mediana', () => {
    const storia = anno(20);
    expect(speseFuoriNorma([...storia, tx(2026, 12, 55)], DIC_2026)).toEqual([]); // +35 €: sotto i 40 € minimi
    const [s] = speseFuoriNorma([...storia, tx(2026, 12, 50), tx(2026, 12, 25)], DIC_2026);
    expect(s).toMatchObject({ categoria: 'Bar', tipo: 'ricorrente', importo: 75, riferimento: 20, differenza: 55, mesiConSpesa: 12 });
    expect(s.movimenti.map(t => t.importo)).toEqual([50, 25]);
  });

  it('ricorrente: tiene conto di quanto varia di solito', () => {
    const storia = anno(100).map((t, i) => ({ ...t, importo: i % 2 ? 40 : 160 }));
    expect(speseFuoriNorma([...storia, tx(2026, 12, 250)], DIC_2026)).toEqual([]);
    expect(speseFuoriNorma([...storia, tx(2026, 12, 400)], DIC_2026)).toHaveLength(1);
  });

  it('occasionale: da 100 € e oltre 1,25 × il mese più alto', () => {
    const storia = [tx(2026, 3, 70, 'Scarpe', 'Shopping')];
    expect(speseFuoriNorma([...storia, tx(2026, 12, 70, 'Scarpe', 'Shopping')], DIC_2026)).toEqual([]);
    expect(speseFuoriNorma([tx(2026, 12, 204, 'Alloggio', 'Vacanze')], DIC_2026)[0])
      .toMatchObject({ tipo: 'occasionale', riferimento: 0, differenza: 204 });
    expect(speseFuoriNorma([tx(2026, 4, 180, 'Pneumatici'), tx(2026, 12, 200, 'Pneumatici')], DIC_2026)).toEqual([]);
  });

  it('esclude PAC, trasferimenti e correttivi, e i mesi fuori finestra', () => {
    expect(speseFuoriNorma([tx(2026, 12, 500, 'PAC', 'Movimenti'), tx(2026, 12, 500, 'Correttivo', 'correttivo')], DIC_2026)).toEqual([]);
    // Spesa di 13 mesi fa: non entra nella storia, quindi 300 € restano "la prima volta".
    expect(speseFuoriNorma([tx(2025, 11, 1000, 'Auto'), tx(2026, 12, 300, 'Auto')], DIC_2026)).toHaveLength(1);
  });

  it('stessa categoria in macro diverse resta separata', () => {
    const r = speseFuoriNorma([...anno(20, 'Bar', 'Cibo'), tx(2026, 12, 150, 'Bar', 'Vacanze')], DIC_2026);
    expect(r.map(s => `${s.macroCategoria}/${s.categoria}`)).toEqual(['Vacanze/Bar']);
  });
});
