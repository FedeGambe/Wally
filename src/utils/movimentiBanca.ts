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

import type { PresetUscita, PresetInvestimento } from '../config/datiBaseSeed';

export type PropostaBanca =
  // Applica il Preset Uscite Ricorrenti con questo nome (macro, categoria,
  // conto, primaria dal preset; importo e data dal movimento), con il suo
  // Preset Trasferimento collegato se c'è — come "Aggiungi Uscita" da preset.
  | { tipo: 'preset'; nome: string }
  // Un lato può restare '' quando la banca non dice dove sono andati i soldi
  // (bonifico a sé stessi verso un conto non collegato): lo sceglie l'utente.
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
  giorni?: [number, number][];     // finestre di giorni del mese (estremi compresi), es. [[2, 4], [16, 18]]
  proposta: PropostaBanca;
  // Riconosciuto ma non registrato da solo: finisce in "Da confermare" con il
  // modulo già precompilato (es. lo stipendio, che porta con sé il fondo pensione).
  conferma?: boolean;
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

/**
 * Descrizione breve di un movimento: dalla causale UniCredit ("... A MARIO
 * ROSSI PER Cena da Gino") la parte dopo "PER", cioè quella scritta da chi ha
 * fatto il bonifico. '' se non c'è (es. Trade Republic, che non manda causale).
 */
export const descrizioneBreve = (causale: string): string => {
  const i = causale.lastIndexOf(' PER ');
  return i >= 0 ? causale.slice(i + 5).trim() : '';
};

const regolaVale = (r: RegolaBanca, m: MovimentoBanca): boolean => {
  if (r.conto && r.conto !== m.conto) return false;
  if ((r.verso === 'uscita') !== (m.importo < 0)) return false;
  const testo = m.descrizione.toUpperCase();
  if (r.descrizioneContiene && !r.descrizioneContiene.every(p => testo.includes(p.toUpperCase()))) return false;
  if (r.importi && !r.importi.some(i => Math.abs(Math.abs(m.importo) - i) < 0.005)) return false;
  if (r.giorni) {
    const giorno = Number(m.data.slice(8, 10));
    if (!r.giorni.some(([da, a]) => giorno >= da && giorno <= a)) return false;
  }
  return true;
};

/**
 * Una regola per ogni Preset Uscite Ricorrenti: un bonifico in uscita dal
 * conto del preset la cui causale contiene il nome del preset (es. preset
 * "Rata Bollo" ↔ causale "... PER RATA BOLLO") applica quel preset. Così i
 * nomi di categorie e conti restano quelli del foglio, e un preset nuovo
 * viene riconosciuto senza toccare il codice, purché il nome sia nella causale.
 * L'importo non è vincolato: se la rata cambia, vale quello della banca.
 */
export function regoleDaPresetUscite(preset: PresetUscita[]): RegolaBanca[] {
  return preset
    .filter(p => p.nome.trim())
    .map(p => ({
      nome: `Preset ${p.nome}`,
      conto: p.conto || undefined,
      verso: 'uscita',
      descrizioneContiene: ['BONIFICO', p.nome.trim()],
      proposta: { tipo: 'preset', nome: p.nome }
    }));
}

// Trade Republic esegue i piani di accumulo il 2 e il 16 del mese (o il
// primo giorno lavorativo dopo, se cadono nel weekend).
const FINESTRE_PAC: [number, number][] = [[2, 4], [16, 18]];

/**
 * Piani di accumulo dei Preset Investimenti Ricorrenti sui broker collegati
 * come conto (Trade Republic): il broker non manda la causale, quindi si
 * riconoscono da importo e giorno. I preset hanno l'importo MENSILE, che il
 * broker può eseguire in due metà (es. Small Cap 80 = 40 il 2 + 40 il 16):
 * valgono sia l'importo pieno sia la metà. Se cambi un piano nel foglio, la
 * regola si aggiorna da sola.
 */
export function regoleDaPresetInvestimenti(preset: PresetInvestimento[], brokerCollegati: string[]): RegolaBanca[] {
  return brokerCollegati.flatMap(broker => {
    const mensili = preset.filter(p => p.broker === broker && p.importo > 0).map(p => p.importo);
    const importi = [...new Set(mensili.flatMap(i => [i, Math.round(i * 50) / 100]))];
    return importi.length === 0 ? [] : [{
      nome: `Piani di accumulo ${broker}`,
      conto: broker,
      verso: 'uscita' as const,
      importi,
      giorni: FINESTRE_PAC,
      proposta: { tipo: 'investimento' as const, broker }
    }];
  });
}

/**
 * Bonifici la cui causale nomina un altro dei tuoi conti (es. "Accredito
 * Scalable - PAC", "Giroconto Santander"): sono trasferimenti tra conti tuoi.
 * Da confermare, con il conto nominato già proposto come l'altro lato. Una
 * regola per ogni conto collegato e ogni altro conto di Wally.
 */
export function regoleTrasferimentiTraConti(contiCollegati: string[], conti: string[]): RegolaBanca[] {
  // Nomi più lunghi prima: "Santander Vincolato" deve vincere su "Santander".
  const perLunghezza = [...conti].sort((a, b) => b.length - a.length);
  return [...new Set(contiCollegati)].flatMap(collegato => perLunghezza
    .filter(altro => altro !== collegato && altro.trim())
    .flatMap(altro => (['uscita', 'entrata'] as const).map(verso => ({
      nome: `Trasferimento ${verso === 'uscita' ? 'verso' : 'da'} ${altro}`,
      conto: collegato,
      verso,
      descrizioneContiene: ['BONIFICO', altro],
      proposta: verso === 'uscita'
        ? { tipo: 'trasferimento' as const, contoOrdinante: collegato, contoBeneficiario: altro }
        : { tipo: 'trasferimento' as const, contoOrdinante: altro, contoBeneficiario: collegato },
      conferma: true
    }))));
}

/**
 * Il conto di Wally nominato nella causale, se c'è (il più lungo vince:
 * "Santander Vincolato" prima di "Santander"). Serve a proporre l'altro lato
 * di un bonifico a sé stessi, che la banca non indica.
 */
export function contoNellaCausale(causale: string, conti: string[], escludi: string): string | undefined {
  const testo = causale.toUpperCase();
  return [...conti]
    .filter(c => c.trim() && c !== escludi)
    .sort((a, b) => b.length - a.length)
    .find(c => testo.includes(c.toUpperCase()));
}

const giorniTra = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400_000;

/**
 * Classifica i movimenti di tutti i conti collegati:
 *  1. regole, nell'ordine dato: la prima che vale decide (automatico, o da
 *     confermare con una proposta se la regola ha `conferma`);
 *  2. giri tra conti: un'uscita e un'entrata dello stesso importo su due conti
 *     diversi entro `finestraGiorni` (un bonifico istantaneo il venerdì sera
 *     può arrivare il lunedì) diventano un trasferimento automatico;
 *  3. tutto il resto è da confermare.
 * Le regole automatiche vengono prima dei giri perché sono più precise: il PAC
 * da 50 € su Trade Republic non deve essere abbinato a un rimborso da 50 € su
 * UniCredit. Quelle da confermare no: un "bonifico a te stesso" verso Trade
 * Republic, se l'altro lato arriva, è un giro e si registra da solo.
 */
export function classificaMovimenti(
  movimenti: MovimentoBanca[],
  regole: RegolaBanca[],
  { finestraGiorni = 3 }: { finestraGiorni?: number } = {}
): MovimentoClassificato[] {
  const esiti = new Map<string, MovimentoClassificato>();

  for (const m of movimenti) {
    const regola = regole.find(r => regolaVale(r, m));
    if (regola) esiti.set(m.id, { movimento: m, esito: regola.conferma ? 'da-confermare' : 'automatico', proposta: regola.proposta, regola: regola.nome });
  }

  const abbinabile = (m: MovimentoBanca) => esiti.get(m.id)?.esito !== 'automatico' && !esiti.get(m.id)?.abbinatoA;
  const liberi = movimenti.filter(abbinabile);
  const entrateLibere = liberi.filter(m => m.importo > 0);
  for (const uscita of liberi.filter(m => m.importo < 0)) {
    const candidate = entrateLibere
      .filter(e => abbinabile(e) && e.conto !== uscita.conto
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
