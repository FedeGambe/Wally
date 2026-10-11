/**
 * Motore delle regole per i movimenti scaricati dalle banche (Enable Banking,
 * PSD2): trasforma i movimenti grezzi in proposte di record di Wally
 * (trasferimento, entrata, uscita, investimento) e decide quali possono essere
 * registrati in automatico e quali finiscono nella lista "Da confermare".
 *
 * Funzioni pure, senza rete né foglio: le usano sia la sincronizzazione su
 * Vercel sia l'app.
 *
 * Cosa arriva davvero dalle banche (verificato sui dati reali, ott 2026):
 *  - UniCredit: data, importo, segno, causale completa in remittance_information
 *    ed entry_reference univoco. NON c'è l'IBAN della controparte (creditor/
 *    debtor_account contengono il conto stesso), quindi le regole vanno sulla
 *    causale.
 *  - Trade Republic: SOLO data, importo e segno (importo già negativo sulle
 *    uscite). Niente causale, esercente né id: l'id va costruito.
 */

export interface MovimentoBanca {
  id: string;
  conto: string;        // nome del conto in Wally (es. 'Unicredit')
  data: string;         // YYYY-MM-DD (data di contabilizzazione)
  importo: number;      // con segno: negativo = uscita
  descrizione: string;  // causale ripulita, '' se la banca non la fornisce
}

export type PropostaBanca =
  | { tipo: 'trasferimento'; contoOrdinante: string; contoBeneficiario: string; categoria?: string }
  | { tipo: 'entrata'; categoria: string }
  | { tipo: 'uscita'; macroCategoria: string; categoria: string }
  | { tipo: 'investimento'; broker: string };

export interface RegolaBanca {
  nome: string;
  conto?: string;                  // vale solo per i movimenti di questo conto
  verso: 'uscita' | 'entrata';
  descrizioneContiene?: string[];  // tutte presenti, maiuscole/minuscole indifferenti
  importi?: number[];              // uno di questi (in valore assoluto)
  giorni?: [number, number];       // giorno del mese compreso, es. [1, 3]
  proposta: PropostaBanca;
}

export type EsitoBanca =
  | 'automatico'        // registrabile senza conferma
  | 'da-confermare'     // va nella lista "Da confermare"
  | 'lato-trasferimento'; // entrata già coperta dal trasferimento abbinato: non genera record

export interface MovimentoClassificato {
  movimento: MovimentoBanca;
  esito: EsitoBanca;
  proposta?: PropostaBanca;
  regola?: string;      // nome della regola applicata, o 'giro tra conti'
  abbinatoA?: string;   // id del movimento opposto nei giri tra conti
}

// La causale UniCredit finisce con un blocco fisso di commissioni e codici
// ("COMM 0,00 SPESE 0,00 COMM SERV 0,00 TRN ..."): non serve e allunga tutto.
const pulisciCausale = (testo: string): string =>
  testo.replace(/\s+/g, ' ').replace(/\s(COMM|TRN)\s.*$/, '').trim();

/**
 * Converte i movimenti grezzi di un conto (risposta di
 * GET /accounts/{uid}/transactions) in MovimentoBanca.
 *
 * Se la banca non dà un id (Trade Republic) l'id è data|importo|n, con n che
 * conta i movimenti identici dello stesso giorno: due caffè da 1,20 € lo
 * stesso giorno restano due movimenti distinti, e lo stesso movimento
 * riscaricato domani riottiene lo stesso id (niente doppioni).
 */
export function normalizzaMovimenti(grezzi: any[], conto: string): MovimentoBanca[] {
  const visti = new Map<string, number>();
  return grezzi
    // Esclusi i movimenti in attesa (cambiano o spariscono) e quelli a zero
    // (es. "COMPETENZE (INTERESSI/ONERI)" trimestrali di UniCredit a 0,00 €).
    .filter(t => t.status !== 'PDNG' && Number(t.transaction_amount?.amount))
    .map(t => {
      const assoluto = Math.abs(Number(t.transaction_amount.amount));
      const importo = t.credit_debit_indicator === 'DBIT' ? -assoluto : assoluto;
      const data = t.booking_date ?? t.value_date ?? t.transaction_date;
      const idBanca = t.entry_reference || t.transaction_id;
      let id: string;
      if (idBanca) {
        id = `${conto}|${idBanca}`;
      } else {
        const chiave = `${conto}|${data}|${importo.toFixed(2)}`;
        const n = visti.get(chiave) ?? 0;
        visti.set(chiave, n + 1);
        id = `${chiave}|${n}`;
      }
      const controparte = (importo < 0 ? t.creditor : t.debtor)?.name ?? '';
      const descrizione = pulisciCausale([...(t.remittance_information ?? []), controparte].join(' '));
      return { id, conto, data, importo, descrizione };
    });
}

const regolaVale = (r: RegolaBanca, m: MovimentoBanca): boolean => {
  if (r.conto && r.conto !== m.conto) return false;
  if ((r.verso === 'uscita') !== (m.importo < 0)) return false;
  const testo = m.descrizione.toUpperCase();
  if (r.descrizioneContiene && !r.descrizioneContiene.every(p => testo.includes(p.toUpperCase()))) return false;
  if (r.importi && !r.importi.some(i => Math.abs(Math.abs(m.importo) - i) < 0.005)) return false;
  if (r.giorni) {
    const giorno = Number(m.data.slice(8, 10));
    if (giorno < r.giorni[0] || giorno > r.giorni[1]) return false;
  }
  return true;
};

const giorniTra = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400_000;

/**
 * Classifica i movimenti di tutti i conti collegati:
 *  1. regole, nell'ordine dato: la prima che vale decide (automatico);
 *  2. giri tra conti: un'uscita e un'entrata dello stesso importo su due conti
 *     diversi entro `finestraGiorni` (un bonifico istantaneo il venerdì sera
 *     può arrivare il lunedì) diventano un trasferimento automatico;
 *  3. tutto il resto è da confermare.
 * Le regole vengono prima dei giri perché sono più precise: il PAC da 50 € su
 * Trade Republic non deve essere abbinato a un rimborso da 50 € su UniCredit.
 */
export function classificaMovimenti(
  movimenti: MovimentoBanca[],
  regole: RegolaBanca[],
  { finestraGiorni = 3 }: { finestraGiorni?: number } = {}
): MovimentoClassificato[] {
  const esiti = new Map<string, MovimentoClassificato>();

  for (const m of movimenti) {
    const regola = regole.find(r => regolaVale(r, m));
    if (regola) esiti.set(m.id, { movimento: m, esito: 'automatico', proposta: regola.proposta, regola: regola.nome });
  }

  const liberi = movimenti.filter(m => !esiti.has(m.id));
  const entrateLibere = liberi.filter(m => m.importo > 0);
  for (const uscita of liberi.filter(m => m.importo < 0)) {
    const candidate = entrateLibere
      .filter(e => !esiti.has(e.id) && e.conto !== uscita.conto
        && Math.abs(e.importo + uscita.importo) < 0.005
        && giorniTra(e.data, uscita.data) <= finestraGiorni)
      .sort((a, b) => giorniTra(a.data, uscita.data) - giorniTra(b.data, uscita.data));
    const entrata = candidate[0];
    if (!entrata) continue;
    const proposta: PropostaBanca = { tipo: 'trasferimento', contoOrdinante: uscita.conto, contoBeneficiario: entrata.conto };
    esiti.set(uscita.id, { movimento: uscita, esito: 'automatico', proposta, regola: 'giro tra conti', abbinatoA: entrata.id });
    esiti.set(entrata.id, { movimento: entrata, esito: 'lato-trasferimento', proposta, regola: 'giro tra conti', abbinatoA: uscita.id });
  }

  return movimenti.map(m => esiti.get(m.id) ?? { movimento: m, esito: 'da-confermare' });
}
