import { describe, it, expect } from 'vitest';
import { pianificaRegistrazioni, type ContestoRegistrazione } from './registraBanca';
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
