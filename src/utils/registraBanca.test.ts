import { describe, it, expect } from 'vitest';
import { pianificaRegistrazioni, trovaGiaInseriti, type ContestoRegistrazione } from './registraBanca';
import type { MovimentoClassificato } from './movimentiBanca';

const ctx = (extra: Partial<ContestoRegistrazione> = {}): ContestoRegistrazione => ({
  presetUscite: [{ id: 'p1', nome: 'Rata Bollo', macroCategoria: 'Tasse', categoria: 'Bollo', conto: 'Unicredit', importo: 23, giornoDelMese: 1, primaria: true }],
  presetTrasferimenti: [{ id: 't1', categoria: 'Rata Bollo', contoOrdinante: '', contoBeneficiario: 'Santander Impegnato', importo: 23 }],
  uscite: [],
  trasferimenti: [],
  iconPerMacroCategoria: () => '🏦',
  ...extra
});

const cl = (riga: number, c: Omit<MovimentoClassificato, 'movimento'> & { id: string; conto: string; data: string; importo: number }) => ({
  riga,
  movimento: { id: c.id, conto: c.conto, data: c.data, importo: c.importo, descrizione: '' },
  esito: c.esito,
  proposta: c.proposta,
  abbinatoA: c.abbinatoA
});

describe('pianificaRegistrazioni', () => {
  it('preset: uscita come da AggiungiUscitaForm, con il trasferimento collegato', () => {
    const [op] = pianificaRegistrazioni([
      cl(5, { id: 'm1', conto: 'Unicredit', data: '2026-11-02', importo: -23, esito: 'automatico', proposta: { tipo: 'preset', nome: 'Rata Bollo' } })
    ], ctx());
    expect(op).toMatchObject({
      tipo: 'record',
      righe: [5],
      uscita: { data: '02/11/2026', mese: 'Novembre', descrizione: 'Rata Bollo', macroCategoria: 'Tasse', categoria: 'Bollo', icon: '🏦', conto: 'Unicredit', importo: 23, primaria: true },
      trasferimento: { mese: 'Novembre', anno: 2026, categoria: 'Rata Bollo', contoOrdinante: 'Unicredit', contoBeneficiario: 'Santander Impegnato', importo: 23 }
    });
  });

  it('preset già inserito nel mese: solo da segnare', () => {
    const [op] = pianificaRegistrazioni([
      cl(5, { id: 'm1', conto: 'Unicredit', data: '2026-11-02', importo: -23, esito: 'automatico', proposta: { tipo: 'preset', nome: 'Rata Bollo' } })
    ], ctx({ uscite: [{ id: 'x', data: '01/11/2026', mese: 'Novembre', descrizione: 'Rata Bollo', macroCategoria: 'Tasse', categoria: 'Bollo', icon: '', conto: 'Unicredit', importo: 23, primaria: true }] }));
    expect(op).toMatchObject({ tipo: 'gia-presente', righe: [5] });
  });

  it('giro tra conti: un trasferimento, entrambe le righe da segnare; le righe "lato" non generano nulla', () => {
    const proposta = { tipo: 'trasferimento' as const, contoOrdinante: 'Unicredit', contoBeneficiario: 'Trade Republic' };
    const ops = pianificaRegistrazioni([
      cl(7, { id: 'out', conto: 'Unicredit', data: '2026-11-11', importo: -1600, esito: 'automatico', proposta, abbinatoA: 'in' }),
      cl(8, { id: 'in', conto: 'Trade Republic', data: '2026-11-11', importo: 1600, esito: 'lato-trasferimento', proposta, abbinatoA: 'out' })
    ], ctx());
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ tipo: 'record', righe: [7, 8], trasferimento: { mese: 'Novembre', anno: 2026, categoria: 'Trasferimento', importo: 1600 } });
  });

  it('PAC: una sola operazione per broker e mese', () => {
    const proposta = { tipo: 'investimento' as const, broker: 'Trade Republic' };
    const ops = pianificaRegistrazioni([
      cl(1, { id: 'a', conto: 'Trade Republic', data: '2026-11-02', importo: -40, esito: 'automatico', proposta }),
      cl(2, { id: 'b', conto: 'Trade Republic', data: '2026-11-02', importo: -50, esito: 'automatico', proposta })
    ], ctx());
    expect(ops).toEqual([{ tipo: 'investimenti', righe: [1, 2], broker: 'Trade Republic', meseLabel: 'novembre 2026', descrizione: 'Investimenti Trade Republic (novembre 2026)' }]);
  });

  it('ignora i movimenti da confermare', () => {
    expect(pianificaRegistrazioni([
      cl(1, { id: 'a', conto: 'Unicredit', data: '2026-11-11', importo: 1600, esito: 'da-confermare', proposta: { tipo: 'entrata', categoria: 'Stipendio' } })
    ], ctx())).toEqual([]);
  });
});

describe('trovaGiaInseriti', () => {
  const uscita = (id: string, data: string, importo: number, conto = 'Trade Republic') =>
    ({ id, data, mese: 'Ottobre', descrizione: `Spesa ${id}`, macroCategoria: 'Casa', categoria: 'Spesa', icon: '', conto, importo, primaria: false });
  const mov = (id: string, data: string, importo: number, conto = 'Trade Republic') =>
    ({ movimento: { id, conto, data, importo, descrizione: '' }, esito: 'da-confermare' as const });

  it('uscita a mano con stesso conto e importo a pochi giorni: suggerita', () => {
    const trovati = trovaGiaInseriti([mov('m1', '2026-10-11', -60.7), mov('m2', '2026-10-11', -55)], [uscita('a', '10/10/2026', 60.7), uscita('b', '09/10/2026', 55)]);
    expect(trovati.get('m1')).toBe('Spesa a del 10/10');
    expect(trovati.get('m2')).toBe('Spesa b del 09/10');
  });

  it('niente suggerimento con altro conto, altro importo o data lontana', () => {
    const trovati = trovaGiaInseriti([mov('m1', '2026-10-11', -55)], [uscita('a', '10/10/2026', 55, 'Unicredit'), uscita('b', '10/10/2026', 54), uscita('c', '01/10/2026', 55)]);
    expect(trovati.size).toBe(0);
  });

  it('un record vale per un solo movimento', () => {
    const trovati = trovaGiaInseriti([mov('m1', '2026-10-11', -55), mov('m2', '2026-10-11', -55)], [uscita('a', '11/10/2026', 55)]);
    expect(trovati.size).toBe(1);
  });

  it('entrate escluse', () => {
    expect(trovaGiaInseriti([mov('m1', '2026-10-27', 1800, 'Unicredit')], [uscita('a', '27/10/2026', 1800, 'Unicredit')]).size).toBe(0);
  });
});
