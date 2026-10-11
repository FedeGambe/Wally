/**
 * Regole con cui la sincronizzazione bancaria (src/utils/movimentiBanca.ts)
 * registra da sola i movimenti ricorrenti. L'ordine conta: vale la prima
 * regola che combacia. Tutto ciò che nessuna regola riconosce (e che non è un
 * giro tra conti collegati) finisce nella lista "Da confermare".
 *
 * Ricavate dai movimenti reali di ago–ott 2026.
 */
import type { RegolaBanca } from '../utils/movimentiBanca';

// Bonifici fissi del 1° del mese da UniCredit verso Santander Vincolato
// (accantonamenti per l'auto). Santander non è collegato: questi bonifici
// sono l'unico modo in cui i suoi movimenti entrano in Wally.
const ACCANTONAMENTI_SANTANDER: [causale: string, categoria: string][] = [
  ['RATA ASSICURAZIONE', 'Assicurazione'],
  ['CONTRIBUTO MANUTENZIONE', 'Manutenzione'],
  ['RATA TAGLIANDO', 'Tagliando'],
  ['RATA GOMME', 'Gomme'],
  ['RATA BOLLO', 'Bollo Auto'],
  ['RATA REVISIONE', 'Revisione']
];

export const REGOLE_BANCA: RegolaBanca[] = [
  ...ACCANTONAMENTI_SANTANDER.map(([causale, categoria]): RegolaBanca => ({
    nome: `Accantonamento ${categoria}`,
    conto: 'Unicredit',
    verso: 'uscita',
    descrizioneContiene: ['BONIFICO', causale],
    proposta: { tipo: 'trasferimento', contoOrdinante: 'Unicredit', contoBeneficiario: 'Santander Vincolato', categoria }
  })),
  {
    nome: 'Stipendio',
    conto: 'Unicredit',
    verso: 'entrata',
    descrizioneContiene: ['STIPENDIO'],
    proposta: { tipo: 'entrata', categoria: 'Stipendio' }
  },
  // PAC Scalable: arriva come addebito diretto (SDD) di Scalable Capital o,
  // in alcuni mesi, come bonifico con causale "Accredito Scalable - PAC". La
  // commissione da 0,50 € dello stesso SDD inizia con "COMMISSIONI" e resta
  // da confermare.
  {
    nome: 'PAC Scalable (addebito)',
    conto: 'Unicredit',
    verso: 'uscita',
    descrizioneContiene: ['ADDEBITO SEPA DD', 'SCALABLE CAPITAL'],
    proposta: { tipo: 'trasferimento', contoOrdinante: 'Unicredit', contoBeneficiario: 'Scalable', categoria: 'PAC' }
  },
  {
    nome: 'PAC Scalable (bonifico)',
    conto: 'Unicredit',
    verso: 'uscita',
    descrizioneContiene: ['ACCREDITO SCALABLE'],
    proposta: { tipo: 'trasferimento', contoOrdinante: 'Unicredit', contoBeneficiario: 'Scalable', categoria: 'PAC' }
  },
  // Piani di accumulo Trade Republic: tre importi fissi a inizio mese. Trade
  // Republic non manda la causale, quindi si riconoscono solo da importo e
  // giorno: se cambi gli importi dei piani, vanno aggiornati qui.
  {
    nome: 'Piani di accumulo Trade Republic',
    conto: 'Trade Republic',
    verso: 'uscita',
    importi: [40, 50, 25],
    giorni: [1, 3],
    proposta: { tipo: 'investimento', broker: 'Trade Republic' }
  }
];
