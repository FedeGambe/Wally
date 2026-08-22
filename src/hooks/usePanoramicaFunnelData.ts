import { useMemo } from 'react';
import { computeRealAssetAllocation } from '../utils/cruscottoInvestimenti';
import { MESI_ITALIANI } from '../utils/date';

export interface FunnelNode {
  name: string;
  color: string;
  showLabel: boolean;
}

export interface FunnelLink {
  source: number;
  target: number;
  value: number;
}

export interface FunnelData {
  nodes: FunnelNode[];
  links: FunnelLink[];
}

const COLOR_ENTRATE = '#089B3C';
const COLOR_INVESTIMENTI = '#0ea5e9';
const COLOR_AZIONI = '#3b82f6';
const COLOR_OBBLIGAZIONI = '#f59e0b';
const COLOR_MONETARI = '#10b981';
const COLOR_PRIMARIE = '#e11d48';
const COLOR_SECONDARIE = '#fb7185';
const COLOR_RISPARMIATO = '#94a3b8';

const TIPO_COLOR: Record<string, string> = {
  Azioni: COLOR_AZIONI,
  Obbligazioni: COLOR_OBBLIGAZIONI,
  Monetari: COLOR_MONETARI
};

/**
 * Costruisce nodi e collegamenti per il Sankey "Flusso del Mese" di Panoramica
 * (renderizzato da PanoramicaFunnelChart, inserito prima di PanoramicaBilancioStorico):
 * Entrate del mese selezionato che si dividono in Investimenti (per asset class,
 * poi per singolo strumento — dati mensili "esatti" dai broker, non cumulati) e
 * Uscite Primarie/Secondarie (a loro volta divise per macro categoria). L'eventuale
 * residuo non investito né speso è mostrato come "Risparmiato".
 *
 * Tutti i totali vengono ricalcolati dalle transazioni/righe broker grezze (non dal
 * foglio Risparmio, che è una fonte indipendente): un Sankey richiede che ogni nodo
 * padre valga esattamente la somma dei suoi figli, altrimenti la larghezza dei nodi
 * non torna e il grafico sembra rotto.
 */
export function usePanoramicaFunnelData(data: any, mese: string, anno: number): FunnelData | null {
  return useMemo(() => {
    const annoStr = String(anno);
    const meseNorm = mese.toLowerCase().trim();
    const sameMese = (m: string) => String(m || '').toLowerCase().trim() === meseNorm;

    const entrateMese = (data.entrate || []).filter((e: any) => sameMese(e.mese) && Number(e.anno) === anno);
    const entrateTotale = entrateMese.reduce((sum: number, e: any) => sum + Number(e.importo || 0), 0);
    if (entrateTotale <= 0) return null;

    const usciteMese = (data.uscite || []).filter((t: any) => sameMese(t.mese) && String(t.data).split('/')[2] === annoStr);
    const spesePrimarieTx = usciteMese.filter((t: any) => t.primaria);
    const speseSecondarieTx = usciteMese.filter((t: any) => !t.primaria);
    const spesePrimarieTotale = spesePrimarieTx.reduce((sum: number, t: any) => sum + Number(t.importo || 0), 0);
    const speseSecondarieTotale = speseSecondarieTx.reduce((sum: number, t: any) => sum + Number(t.importo || 0), 0);

    const meseIdx = MESI_ITALIANI.findIndex(m => m.toLowerCase() === mese.toLowerCase().trim());
    const targetMonth = meseIdx !== -1 ? meseIdx + 1 : undefined;
    const { detailData } = computeRealAssetAllocation(data, targetMonth, anno, 'exact');
    const investimentiTotale = detailData.reduce((sum, d) => sum + d.importoInvestito, 0);

    const risparmiato = Math.max(0, entrateTotale - investimentiTotale - spesePrimarieTotale - speseSecondarieTotale);

    const nodes: FunnelNode[] = [];
    const links: FunnelLink[] = [];
    const pushNode = (node: FunnelNode) => nodes.push(node) - 1;

    const entrateIdx = pushNode({ name: 'Entrate', color: COLOR_ENTRATE, showLabel: true });

    if (investimentiTotale > 0) {
      const investIdx = pushNode({ name: 'Investimenti', color: COLOR_INVESTIMENTI, showLabel: true });
      links.push({ source: entrateIdx, target: investIdx, value: investimentiTotale });

      const byTipo: Record<string, typeof detailData> = {};
      detailData.forEach(d => {
        (byTipo[d.tipo] = byTipo[d.tipo] || []).push(d);
      });

      Object.entries(byTipo).forEach(([tipo, items]) => {
        const tipoTotale = items.reduce((sum, i) => sum + i.importoInvestito, 0);
        if (tipoTotale <= 0) return;
        const color = TIPO_COLOR[tipo] || COLOR_INVESTIMENTI;
        const tipoIdx = pushNode({ name: tipo, color, showLabel: true });
        links.push({ source: investIdx, target: tipoIdx, value: tipoTotale });

        items.filter(i => i.importoInvestito > 0).forEach(i => {
          const strumentoIdx = pushNode({ name: i.nome, color, showLabel: false });
          links.push({ source: tipoIdx, target: strumentoIdx, value: i.importoInvestito });
        });
      });
    }

    const buildSpeseBranch = (label: string, color: string, txs: any[], totale: number) => {
      if (totale <= 0) return;
      const branchIdx = pushNode({ name: label, color, showLabel: true });
      links.push({ source: entrateIdx, target: branchIdx, value: totale });

      const byMacro: Record<string, number> = {};
      txs.forEach(t => {
        byMacro[t.macroCategoria] = (byMacro[t.macroCategoria] || 0) + Number(t.importo || 0);
      });
      Object.entries(byMacro).forEach(([macro, val]) => {
        if (val <= 0) return;
        const macroIdx = pushNode({ name: macro, color, showLabel: true });
        links.push({ source: branchIdx, target: macroIdx, value: val });
      });
    };

    buildSpeseBranch('Spese Primarie', COLOR_PRIMARIE, spesePrimarieTx, spesePrimarieTotale);
    buildSpeseBranch('Spese Secondarie', COLOR_SECONDARIE, speseSecondarieTx, speseSecondarieTotale);

    if (risparmiato > 0) {
      const rispIdx = pushNode({ name: 'Risparmiato', color: COLOR_RISPARMIATO, showLabel: true });
      links.push({ source: entrateIdx, target: rispIdx, value: risparmiato });
    }

    if (links.length === 0) return null;

    return { nodes, links };
  }, [data, mese, anno]);
}
