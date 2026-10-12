/**
 * Regole fisse con cui la sincronizzazione bancaria (src/utils/movimentiBanca.ts)
 * riconosce i movimenti ricorrenti. Si aggiungono a quelle generate dai preset
 * del foglio (regoleDaPresetUscite: le rate verso Santander;
 * regoleDaPresetInvestimenti: i piani di accumulo Trade Republic), che
 * vengono prima. L'ordine conta: vale la prima regola che combacia. Tutto ciò
 * che nessuna regola riconosce (e che non è un giro tra conti collegati)
 * finisce nella lista "Da confermare".
 *
 * Categorie e conti sono quelli del foglio di configurazione (Categorie
 * Entrate, Conti): una regola non deve inventarne di nuovi.
 *
 * Ricavate dai movimenti reali di ago–ott 2026.
 */
import type { RegolaBanca } from '../utils/movimentiBanca';

// Intestatario dei conti, come compare nelle causali dei bonifici a sé stessi.
const TITOLARE = 'FEDERICO GAMBERINI';

export const REGOLE_BANCA: RegolaBanca[] = [
  {
    nome: 'Stipendio',
    conto: 'Unicredit',
    verso: 'entrata',
    descrizioneContiene: ['STIPENDIO'],
    proposta: { tipo: 'entrata', categoria: 'Stipendio' },
    // Da confermare: il modulo Entrata con categoria Stipendio aggiunge anche
    // la riga del Fondo Pensione, e il mese a cui imputarlo lo decidi tu.
    conferma: true
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
    proposta: { tipo: 'investimento', broker: 'Scalable' }
  },
  {
    nome: 'PAC Scalable (bonifico)',
    conto: 'Unicredit',
    verso: 'uscita',
    descrizioneContiene: ['ACCREDITO SCALABLE'],
    proposta: { tipo: 'investimento', broker: 'Scalable' }
  },
  // Bonifici a sé stessi, da o verso qualunque conto (Trade Republic,
  // Santander, Scalable, ...): sono trasferimenti, non spese o entrate. Se
  // l'altro lato è un conto collegato e il suo movimento arriva, è un giro e
  // si registra da solo; altrimenti la banca non dice l'altro conto e resta
  // da confermare (il modulo lo propone se la causale lo nomina). Lati vuoti:
  // quello noto è il conto del movimento.
  {
    nome: 'Bonifico a te stesso',
    verso: 'uscita',
    descrizioneContiene: [`A ${TITOLARE}`],
    proposta: { tipo: 'trasferimento', contoOrdinante: '', contoBeneficiario: '' },
    conferma: true
  },
  {
    nome: 'Bonifico da te stesso',
    verso: 'entrata',
    descrizioneContiene: [`DA ${TITOLARE}`],
    proposta: { tipo: 'trasferimento', contoOrdinante: '', contoBeneficiario: '' },
    conferma: true
  }
];
