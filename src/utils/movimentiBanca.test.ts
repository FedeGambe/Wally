import { describe, it, expect } from 'vitest';
import { normalizzaMovimenti, classificaMovimenti, type MovimentoBanca } from './movimentiBanca';
import { REGOLE_BANCA } from '../config/regoleBanca';

// Forme dei movimenti come le restituisce Enable Banking (dati reali anonimizzati).
const grezzoUnicredit = (ref: string, data: string, segno: 'DBIT' | 'CRDT', importo: string, causale: string) => ({
  entry_reference: ref,
  transaction_amount: { currency: 'EUR', amount: importo },
  credit_debit_indicator: segno,
  status: 'BOOK',
  booking_date: data,
  value_date: data,
  remittance_information: [causale]
});

const grezzoTradeRepublic = (data: string, segno: 'DBIT' | 'CRDT', importo: string) => ({
  transaction_amount: { currency: 'EUR', amount: importo },
  credit_debit_indicator: segno,
  status: 'BOOK',
  booking_date: data
});

describe('normalizzaMovimenti', () => {
  it('UniCredit: id dalla banca, segno dal DBIT, causale senza il blocco commissioni', () => {
    const [m] = normalizzaMovimenti([grezzoUnicredit('R1', '2026-10-01', 'DBIT', '23.000',
      'DISPOSIZIONE DI BONIFICO BONIFICO SEPA A  MARIO ROSSI PER  RATA BOLLO COMM              0,00 SPESE              0,00')], 'Unicredit');
    expect(m).toEqual({ id: 'Unicredit|R1', conto: 'Unicredit', data: '2026-10-01', importo: -23,
      descrizione: 'DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER RATA BOLLO' });
  });

  it('Trade Republic: importo già negativo, id costruito e stabile per movimenti identici', () => {
    const grezzi = [
      grezzoTradeRepublic('2026-10-05', 'DBIT', '-4.500000'),
      grezzoTradeRepublic('2026-10-05', 'DBIT', '-4.500000'),
      grezzoTradeRepublic('2026-10-05', 'CRDT', '4.480000')
    ];
    const movimenti = normalizzaMovimenti(grezzi, 'Trade Republic');
    expect(movimenti.map(m => m.importo)).toEqual([-4.5, -4.5, 4.48]);
    expect(movimenti.map(m => m.id)).toEqual([
      'Trade Republic|2026-10-05|-4.50|0',
      'Trade Republic|2026-10-05|-4.50|1',
      'Trade Republic|2026-10-05|4.48|0'
    ]);
    // Riscaricando gli stessi movimenti gli id non cambiano: niente doppioni.
    expect(normalizzaMovimenti(grezzi, 'Trade Republic').map(m => m.id)).toEqual(movimenti.map(m => m.id));
  });

  it('scarta i movimenti in attesa e quelli a zero', () => {
    expect(normalizzaMovimenti([{ ...grezzoTradeRepublic('2026-10-05', 'DBIT', '-1'), status: 'PDNG' }], 'Trade Republic')).toEqual([]);
    expect(normalizzaMovimenti([grezzoUnicredit('R0', '2026-09-30', 'CRDT', '0.000', 'COMPETENZE (INTERESSI/ONERI)')], 'Unicredit')).toEqual([]);
  });
});

const mov = (id: string, conto: string, data: string, importo: number, descrizione = ''): MovimentoBanca =>
  ({ id, conto, data, importo, descrizione });

describe('classificaMovimenti con le regole reali', () => {
  const classifica = (movimenti: MovimentoBanca[]) =>
    Object.fromEntries(classificaMovimenti(movimenti, REGOLE_BANCA).map(c => [c.movimento.id, c]));

  it('accantonamenti verso Santander Vincolato, stipendio e PAC', () => {
    const r = classifica([
      mov('bollo', 'Unicredit', '2026-10-01', -23, 'DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER RATA BOLLO'),
      mov('stip', 'Unicredit', '2026-09-11', 1627.97, 'BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA ACME SRL PER STIPENDIO 08/2026'),
      mov('pac', 'Unicredit', '2026-10-01', -245, 'ADDEBITO SEPA DD PER FATTURA A VOSTRO CARICO Incasso SDD da DE00 Scalable Capital GmbH'),
      mov('comm', 'Unicredit', '2026-09-30', -0.5, 'COMMISSIONI - PROVVIGIONI - SPESE Incasso SDD da DE00 Scalable Capital GmbH'),
      mov('tr40', 'Trade Republic', '2026-10-02', -40)
    ]);
    expect(r.bollo.proposta).toEqual({ tipo: 'trasferimento', contoOrdinante: 'Unicredit', contoBeneficiario: 'Santander Vincolato', categoria: 'Bollo Auto' });
    expect(r.stip.proposta).toEqual({ tipo: 'entrata', categoria: 'Stipendio' });
    expect(r.pac.proposta).toMatchObject({ tipo: 'trasferimento', contoBeneficiario: 'Scalable' });
    expect(r.comm.esito).toBe('da-confermare');
    expect(r.tr40).toMatchObject({ esito: 'automatico', proposta: { tipo: 'investimento', broker: 'Trade Republic' } });
  });

  it('i piani Trade Republic valgono solo a inizio mese', () => {
    expect(classifica([mov('tr40', 'Trade Republic', '2026-09-16', -40)]).tr40.esito).toBe('da-confermare');
  });

  it('giri tra conti collegati: trasferimento automatico, l\'entrata non genera un secondo record', () => {
    const r = classifica([
      mov('uc-out', 'Unicredit', '2026-09-11', -1600, 'BONIFICO ISTANTANEO A MARIO ROSSI'),
      mov('tr-in', 'Trade Republic', '2026-09-11', 1600),
      mov('tr-out', 'Trade Republic', '2026-09-06', -2000),
      mov('uc-in', 'Unicredit', '2026-09-07', 2000, 'BONIFICO A VOSTRO FAVORE DA MARIO ROSSI PER Accredito auto')
    ]);
    expect(r['uc-out']).toMatchObject({ esito: 'automatico', abbinatoA: 'tr-in',
      proposta: { tipo: 'trasferimento', contoOrdinante: 'Unicredit', contoBeneficiario: 'Trade Republic' } });
    expect(r['tr-in']).toMatchObject({ esito: 'lato-trasferimento', abbinatoA: 'uc-out' });
    expect(r['tr-out'].proposta).toMatchObject({ contoOrdinante: 'Trade Republic', contoBeneficiario: 'Unicredit' });
    expect(r['uc-in'].esito).toBe('lato-trasferimento');
  });

  it('nessun abbinamento sullo stesso conto o troppo lontano nel tempo', () => {
    const r = classifica([
      mov('a', 'Trade Republic', '2026-09-01', -75),
      mov('b', 'Trade Republic', '2026-09-01', 75),
      mov('c', 'Unicredit', '2026-09-20', 75)
    ]);
    expect([r.a.esito, r.b.esito, r.c.esito]).toEqual(['da-confermare', 'da-confermare', 'da-confermare']);
  });

  it('una spesa con carta Trade Republic resta da confermare', () => {
    expect(classifica([mov('x', 'Trade Republic', '2026-10-06', -97.47)]).x.esito).toBe('da-confermare');
  });
});
