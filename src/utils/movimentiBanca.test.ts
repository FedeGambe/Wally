import { describe, it, expect } from 'vitest';
import { normalizzaMovimenti, classificaMovimenti, regoleDaPresetUscite, regoleDaPresetInvestimenti, regoleTrasferimentiTraConti, contoNellaCausale, dataProbabile, type MovimentoBanca } from './movimentiBanca';
import type { PresetUscita, PresetInvestimento } from '../config/datiBaseSeed';
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

// Come nel tab "Preset Uscite Ricorrenti" del foglio di configurazione.
const preset = (nome: string, macroCategoria: string, categoria: string, importo: number): PresetUscita =>
  ({ id: nome, nome, macroCategoria, categoria, conto: 'Unicredit', importo, giornoDelMese: 1, primaria: true });
const PRESET: PresetUscita[] = [
  preset('Rata Assicurazione', 'Automobile', 'Assicurazione', 80),
  preset('Rata Bollo', 'Tasse', 'Bollo', 23),
  preset('Contributo Manutenzione', 'Automobile', 'Automobile', 50)
];

// Come nel tab "Preset Investimenti Ricorrenti".
// Importi MENSILI, eseguiti da Trade Republic anche in due metà (il 2 e il 16).
const PRESET_INVESTIMENTI: PresetInvestimento[] = [
  { id: 'a', broker: 'Trade Republic', strumento: 'MSCI World Small Cap', importo: 80 },
  { id: 'b', broker: 'Trade Republic', strumento: '2036 Corp Bonds', importo: 50 },
  { id: 'c', broker: 'Trade Republic', strumento: '2028 Euro Gov Bonds', importo: 52 },
  { id: 'd', broker: 'Trade Republic', strumento: 'FTSE Dev Asia', importo: 50 },
  { id: 'e', broker: 'Scalable', strumento: 'FTSE All-World', importo: 135 }
];

describe('classificaMovimenti con le regole reali', () => {
  const regole = [
    ...regoleDaPresetUscite(PRESET),
    ...regoleDaPresetInvestimenti(PRESET_INVESTIMENTI, ['Trade Republic']),
    ...REGOLE_BANCA,
    ...regoleTrasferimentiTraConti(['Unicredit', 'Trade Republic'], ['Unicredit', 'Trade Republic', 'Scalable', 'Santander', 'Santander Vincolato'])
  ];
  const classifica = (movimenti: MovimentoBanca[]) =>
    Object.fromEntries(classificaMovimenti(movimenti, regole).map(c => [c.movimento.id, c]));

  it('rate dai Preset Uscite Ricorrenti, stipendio e PAC', () => {
    const r = classifica([
      mov('bollo', 'Unicredit', '2026-10-01', -23, 'DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER RATA BOLLO'),
      mov('manut', 'Unicredit', '2026-10-01', -55, 'DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER CONTRIBUTO MANUTENZIONE'),
      mov('stip', 'Unicredit', '2026-09-11', 1627.97, 'BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA ACME SRL PER STIPENDIO 08/2026'),
      mov('pac', 'Unicredit', '2026-10-01', -245, 'ADDEBITO SEPA DD PER FATTURA A VOSTRO CARICO Incasso SDD da DE00 Scalable Capital GmbH'),
      mov('comm', 'Unicredit', '2026-09-30', -0.5, 'COMMISSIONI - PROVVIGIONI - SPESE Incasso SDD da DE00 Scalable Capital GmbH'),
      mov('tr40', 'Trade Republic', '2026-10-02', -40)
    ]);
    expect(r.bollo.proposta).toEqual({ tipo: 'preset', nome: 'Rata Bollo' });
    // L'importo non vincola: se la rata cambia vale quello della banca.
    expect(r.manut.proposta).toEqual({ tipo: 'preset', nome: 'Contributo Manutenzione' });
    // Riconosciuto ma da confermare: il modulo Entrata aggiunge il fondo pensione.
    expect(r.stip).toMatchObject({ esito: 'da-confermare', proposta: { tipo: 'entrata', categoria: 'Stipendio' } });
    expect(r.pac.proposta).toEqual({ tipo: 'investimento', broker: 'Scalable' });
    expect(r.comm.esito).toBe('da-confermare');
    expect(r.tr40).toMatchObject({ esito: 'automatico', proposta: { tipo: 'investimento', broker: 'Trade Republic' } });
  });

  it('piani Trade Republic: importo mensile o metà, il 2 e il 16 (o pochi giorni dopo)', () => {
    const r = classifica([
      mov('d2-40', 'Trade Republic', '2026-09-02', -40),
      mov('d2-25', 'Trade Republic', '2026-09-02', -25),
      mov('d16-52', 'Trade Republic', '2026-09-16', -52),
      mov('d18-40', 'Trade Republic', '2026-08-18', -40),
      mov('d10-40', 'Trade Republic', '2026-09-10', -40),
      mov('d2-30', 'Trade Republic', '2026-09-02', -30)
    ]);
    expect([r['d2-40'].esito, r['d2-25'].esito, r['d16-52'].esito, r['d18-40'].esito]).toEqual(['automatico', 'automatico', 'automatico', 'automatico']);
    expect(r['d10-40'].esito).toBe('da-confermare');
    expect(r['d2-30'].esito).toBe('da-confermare');
  });

  it('bonifico a te stesso verso un conto non collegato: trasferimento da confermare', () => {
    const r = classifica([
      mov('self', 'Unicredit', '2026-08-13', -140, 'DISPOSIZIONE DI BONIFICO BONIFICO ISTANTANEO A Federico Gamberini'),
      mov('selfin', 'Unicredit', '2026-09-30', 500, 'BONIFICO A VOSTRO FAVORE BONIFICO ISTANTANEO DA Federico Gamberini')
    ]);
    expect(r.self).toMatchObject({ esito: 'da-confermare', proposta: { tipo: 'trasferimento' } });
    expect(r.selfin).toMatchObject({ esito: 'da-confermare', proposta: { tipo: 'trasferimento' } });
  });

  it('bonifico che nomina un altro conto: trasferimento da confermare verso quel conto', () => {
    const r = classifica([
      mov('sc', 'Unicredit', '2026-10-05', -300, 'DISPOSIZIONE DI BONIFICO BONIFICO SEPA A MARIO ROSSI PER Giroconto Santander Vincolato'),
      mov('comm', 'Unicredit', '2026-09-30', -0.5, 'COMMISSIONI - PROVVIGIONI - SPESE Incasso SDD da DE00 Scalable Capital GmbH')
    ]);
    expect(r.sc).toMatchObject({ esito: 'da-confermare', proposta: { contoOrdinante: 'Unicredit', contoBeneficiario: 'Santander Vincolato' } });
    // Non è un bonifico: resta senza proposta.
    expect(r.comm.proposta).toBeUndefined();
  });

  it('il conto nominato nella causale: il nome più lungo vince, mai il conto stesso', () => {
    const conti = ['Unicredit', 'Santander', 'Santander Vincolato', 'Scalable'];
    expect(contoNellaCausale('BONIFICO PER giroconto santander vincolato', conti, 'Unicredit')).toBe('Santander Vincolato');
    expect(contoNellaCausale('BONIFICO PER Accredito Scalable - PAC', conti, 'Unicredit')).toBe('Scalable');
    expect(contoNellaCausale('BONIFICO DA UNICREDIT', conti, 'Unicredit')).toBeUndefined();
  });

  it('bonifico a te stesso verso Trade Republic: se arriva l\'altro lato è un giro automatico', () => {
    const r = classifica([
      mov('self', 'Unicredit', '2026-09-11', -1600, 'DISPOSIZIONE DI BONIFICO BONIFICO ISTANTANEO A Federico Gamberini'),
      mov('tr', 'Trade Republic', '2026-09-11', 1600)
    ]);
    expect(r.self).toMatchObject({ esito: 'automatico', regola: 'giro tra conti', proposta: { contoBeneficiario: 'Trade Republic' } });
    expect(r.tr.esito).toBe('lato-trasferimento');
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

describe('dataProbabile', () => {
  it('spese Trade Republic: il giorno prima della contabilizzazione, anche a cavallo del mese', () => {
    expect(dataProbabile(mov('a', 'Trade Republic', '2026-10-11', -16.9))).toBe('2026-10-10');
    expect(dataProbabile(mov('b', 'Trade Republic', '2026-11-01', -5))).toBe('2026-10-31');
  });

  it('entrate Trade Republic e movimenti UniCredit: la data della banca', () => {
    expect(dataProbabile(mov('c', 'Trade Republic', '2026-10-11', 1600))).toBe('2026-10-11');
    expect(dataProbabile(mov('d', 'Unicredit', '2026-10-11', -43.5))).toBe('2026-10-11');
  });
});
