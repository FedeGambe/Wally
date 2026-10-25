import { describe, it, expect } from 'vitest';
import { dividiSeBisettimanale } from './consumiSettimane';

const W = 7 * 24 * 3600 * 1000;
const sett = (n: number) => ({ anchorTime: n * W, costo: 60, quantitaLitri: 30, kmEffettuati: 400 });

describe('dividiSeBisettimanale', () => {
  it('lascia invariate le settimane consecutive e la prima', () => {
    expect(dividiSeBisettimanale([sett(0), sett(1), sett(2)])).toEqual([sett(0), sett(1), sett(2)]);
  });
  it('dimezza costo, litri e km con gap di 2 settimane', () => {
    const [, b] = dividiSeBisettimanale([sett(0), sett(2)]);
    expect(b).toMatchObject({ costo: 30, quantitaLitri: 15, kmEffettuati: 200 });
  });
  it('non tocca gap di 3 settimane', () => {
    expect(dividiSeBisettimanale([sett(0), sett(3)])[1]).toEqual(sett(3));
  });
});
