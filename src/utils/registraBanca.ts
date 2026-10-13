/**
 * Dai movimenti bancari classificati come "automatico" (movimentiBanca.ts) ai
 * record di Wally da scrivere, come li scriverebbero i moduli "Aggiungi ..."
 * a mano: un'uscita da preset con il suo trasferimento collegato, un
 * trasferimento per i giri tra conti, i Preset Investimenti Ricorrenti del
 * mese per un PAC. Funzione pura: l'esecuzione (scrittura sul foglio, stato
 * dei movimenti) è in useMovimentiBanca.
 *
 * Se il record c'è già (inserito a mano, o con "Uscite Ricorrenti") non se ne
 * crea un secondo: il movimento viene solo segnato come registrato.
 */
import type { Transaction, Trasferimento } from '../data/mockData';
import type { PresetUscita, PresetTrasferimento } from '../config/datiBaseSeed';
import type { MovimentoClassificato } from './movimentiBanca';
import { MESI_ITALIANI } from './date';
import { meseLabelBroker } from './investimentiRicorrenti';

export type OperazioneBanca =
  | { tipo: 'record'; righe: number[]; uscita?: Transaction; trasferimento?: Trasferimento; descrizione: string }
  | { tipo: 'investimenti'; righe: number[]; broker: string; meseLabel: string; descrizione: string }
  | { tipo: 'gia-presente'; righe: number[]; descrizione: string };

export interface ContestoRegistrazione {
  presetUscite: PresetUscita[];
  presetTrasferimenti: PresetTrasferimento[];
  uscite: Transaction[];
  trasferimenti: Trasferimento[];
  iconPerMacroCategoria: (macro: string) => string;
}

type Classificato = MovimentoClassificato & { riga: number };

const meseAnno = (dataIso: string) => {
  const [anno, mese, giorno] = dataIso.split('-');
  return { anno: Number(anno), mese: MESI_ITALIANI[Number(mese) - 1], dataIt: `${giorno}/${mese}/${anno}` };
};

const stessoImporto = (a: number, b: number) => Math.abs(a - b) < 0.005;

export function pianificaRegistrazioni(classificati: Classificato[], ctx: ContestoRegistrazione): OperazioneBanca[] {
  const operazioni: OperazioneBanca[] = [];
  const perRiga = new Map(classificati.map(c => [c.movimento.id, c.riga]));
  const investimenti = new Map<string, Extract<OperazioneBanca, { tipo: 'investimenti' }>>();

  for (const c of classificati) {
    if (c.esito !== 'automatico' || !c.proposta) continue;
    const m = c.movimento;
    const importo = Math.abs(m.importo);
    const { anno, mese, dataIt } = meseAnno(m.data);

    if (c.proposta.tipo === 'preset') {
      const nome = c.proposta.nome;
      const preset = ctx.presetUscite.find(p => p.nome === nome);
      if (!preset) continue;
      // Stesso controllo di AggiungiUscitaForm per i "preset mancanti" del mese.
      const giaInserita = ctx.uscite.some(t => t.mese === mese && t.data.split('/')[2] === String(anno) && t.descrizione === preset.nome);
      if (giaInserita) {
        operazioni.push({ tipo: 'gia-presente', righe: [c.riga], descrizione: `${preset.nome} (${mese})` });
        continue;
      }
      const uscita: Transaction = {
        id: `banca-${m.id}`,
        data: dataIt,
        mese,
        descrizione: preset.nome,
        macroCategoria: preset.macroCategoria,
        categoria: preset.categoria,
        icon: ctx.iconPerMacroCategoria(preset.macroCategoria),
        conto: m.conto,
        importo,
        primaria: preset.primaria
      };
      const presetTrasf = ctx.presetTrasferimenti.find(pt => pt.categoria === preset.nome);
      const trasferimento: Trasferimento | undefined = presetTrasf ? {
        id: `banca-${m.id}-t`,
        mese,
        anno,
        categoria: presetTrasf.categoria,
        // Ordinante vuoto nel preset = "Qualsiasi": è il conto da cui è partito il bonifico.
        contoOrdinante: presetTrasf.contoOrdinante || m.conto,
        contoBeneficiario: presetTrasf.contoBeneficiario,
        importo: presetTrasf.importo
      } : undefined;
      operazioni.push({ tipo: 'record', righe: [c.riga], uscita, trasferimento, descrizione: preset.nome });
    } else if (c.proposta.tipo === 'trasferimento') {
      const { contoOrdinante, contoBeneficiario } = c.proposta;
      const categoria = c.proposta.categoria || 'Trasferimento';
      const altraRiga = c.abbinatoA ? perRiga.get(c.abbinatoA) : undefined;
      const righe = altraRiga ? [c.riga, altraRiga] : [c.riga];
      const descrizione = `${contoOrdinante} → ${contoBeneficiario}`;
      const giaPresente = ctx.trasferimenti.some(t => t.mese === mese && t.anno === anno
        && t.contoOrdinante === contoOrdinante && t.contoBeneficiario === contoBeneficiario && stessoImporto(t.importo, importo));
      if (giaPresente) {
        operazioni.push({ tipo: 'gia-presente', righe, descrizione });
        continue;
      }
      operazioni.push({
        tipo: 'record',
        righe,
        trasferimento: { id: `banca-${m.id}`, mese, anno, categoria, contoOrdinante, contoBeneficiario, importo },
        descrizione
      });
    } else if (c.proposta.tipo === 'investimento') {
      // Un'operazione per broker e mese: scrive tutti i Preset Investimenti
      // Ricorrenti ancora mancanti, come il modulo "Investimenti Ricorrenti".
      const meseLabel = meseLabelBroker(new Date(anno, MESI_ITALIANI.indexOf(mese), 1));
      const chiave = `${c.proposta.broker}|${meseLabel}`;
      const esistente = investimenti.get(chiave);
      if (esistente) {
        esistente.righe.push(c.riga);
      } else {
        const op = { tipo: 'investimenti' as const, righe: [c.riga], broker: c.proposta.broker, meseLabel, descrizione: `Investimenti ${c.proposta.broker} (${meseLabel})` };
        investimenti.set(chiave, op);
        operazioni.push(op);
      }
    }
  }
  return operazioni;
}

// Giorni di scarto tra la data della banca e quella scritta a mano: le spese
// con carta arrivano contabilizzate qualche giorno dopo il pagamento.
const SCARTO_GIORNI = 4;

const giornoDaIt = (dataIt: string) => {
  const [g, m, a] = dataIt.split('/').map(Number);
  return g && m && a ? Date.UTC(a, m - 1, g) / 86_400_000 : NaN;
};
const giornoDaIso = (dataIso: string) => Date.parse(`${dataIso}T00:00:00Z`) / 86_400_000;

/**
 * Per le uscite da confermare, la spesa inserita a mano che sembra già
 * corrispondere: stesso conto, stesso importo e data entro SCARTO_GIORNI. Ogni
 * spesa vale per un solo movimento, così due spese uguali con un solo record
 * lasciano l'altra da confermare. È solo un suggerimento: lo conferma l'utente.
 * Le entrate restano fuori.
 */
export function trovaGiaInseriti(
  classificati: MovimentoClassificato[],
  uscite: Transaction[]
): Map<string, string> {
  const trovati = new Map<string, string>();
  const usati = new Set<string>();
  for (const c of classificati) {
    if (c.esito !== 'da-confermare') continue;
    const m = c.movimento;
    const importo = Math.abs(m.importo);
    if (m.importo >= 0) continue;
    const giorno = giornoDaIso(m.data);
    const candidati = uscite
      .filter(t => !usati.has(t.id) && t.conto === m.conto && stessoImporto(t.importo, importo)
        && Math.abs(giornoDaIt(t.data) - giorno) <= SCARTO_GIORNI)
      .sort((a, b) => Math.abs(giornoDaIt(a.data) - giorno) - Math.abs(giornoDaIt(b.data) - giorno));
    if (candidati[0]) {
      usati.add(candidati[0].id);
      trovati.set(m.id, `${candidati[0].descrizione} del ${candidati[0].data.slice(0, 5)}`);
    }
  }
  return trovati;
}
