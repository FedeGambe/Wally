import { useState, useMemo } from 'react';
import { ContoPatrimonio } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import { MESI_ITALIANI, getMonthIndex, isMeseAnnoFuturo } from '../utils/date';

/**
 * Hook usato dalla pagina Patrimonio (src/pages/Patrimonio.tsx). Non riceve
 * filtri anno/mese come props: legge direttamente da useFinanceData() i fogli
 * Patrimonio, Risparmio, Rendimenti Investimenti e Capitale Impegnato.
 * Restituisce i totali per le card (capitale totale/disponibile/investito/
 * impegnato) e le serie storiche mensili usate dal grafico di andamento
 * (risparmio cumulato, investito, netto), incluse due proiezioni stimate
 * (ottimistica/pessimistica) per i mesi non ancora coperti dai dati reali.
 * Aggregati e serie storiche della pagina Patrimonio (conti, capitale impegnato,
 * andamento netto/risparmio/investito), separati dal JSX per isolare i bug numerici.
 */
export function usePatrimonioData() {
  const { data } = useFinanceData();
  const [selectedConto, setSelectedConto] = useState<ContoPatrimonio | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    netto: true,
    risparmio: true,
    investito: true,
  });

  const localConti = data.patrimonio;
  const localRisparmio = data.risparmio;
  const localRendimenti = data.rendimentiInvestimenti;
  const localCapitaleImpegnato = data.capitaleImpegnato;

  // Sum aggregates based on localConti
  const totalWealth = useMemo(() => localConti.reduce((sum, item) => sum + item.capitaleTotale, 0), [localConti]);
  const totalDisponibile = useMemo(() => localConti.reduce((sum, item) => sum + item.capitaleDisponibile, 0), [localConti]);
  const totalInvestito = useMemo(() => localConti.reduce((sum, item) => sum + item.capitaleInvestito, 0), [localConti]);
  const totalImpegnato = useMemo(() => {
    return localCapitaleImpegnato.reduce((sum, item) => sum + (item.capitaleImpegnato || 0), 0);
  }, [localCapitaleImpegnato]);

  // Locked commitments pie dataset
  const engagedCapitalData = useMemo(() => {
    return localCapitaleImpegnato.map((item) => ({
      name: item.categoria,
      value: item.capitaleImpegnato
    }));
  }, [localCapitaleImpegnato]);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];

  // Sort and process savings trend from localRisparmio
  const sortedRisparmio = useMemo(() => {
    return [...localRisparmio]
      .filter(r => !isMeseAnnoFuturo(r.mese, r.anno))
      .sort((a, b) => {
        const idxA = MESI_ITALIANI.indexOf(a.mese);
        const idxB = MESI_ITALIANI.indexOf(b.mese);
        const valA = a.anno * 12 + (idxA !== -1 ? idxA : 0);
        const valB = b.anno * 12 + (idxB !== -1 ? idxB : 0);
        return valA - valB;
      });
  }, [localRisparmio]);

  // Cumulative savings sum + monthly investments from Rendimenti (Somma attuale / valoreAttualePortafoglio)
  // Costruisce la serie mensile per il grafico "andamento patrimonio": per ogni
  // mese calcola il risparmio accumulato fino a quel punto (somma progressiva),
  // l'importo investito (preso dal foglio Rendimenti se c'e' un mese corrispondente,
  // altrimenti dal foglio Risparmio) e il "netto" come somma dei due + una costante.
  // Dove i dati reali finiscono (perche' lo sheet non e' ancora aggiornato), la
  // funzione prosegue la linea con due proiezioni tratteggiate ottimistica/
  // pessimistica, calcolate applicando il rendimento % migliore/peggiore osservato
  // nello storico.
  const cumulativeRisparmioData = useMemo(() => {
    // Estrae l'anno (a 2 o 4 cifre) da una stringa mese libera tipo "Ott 25" o "ottobre 2025".
    const getYearFromStr = (yStr: string): number => {
      const clean = yStr.toLowerCase().trim();
      const matches = clean.match(/\b\d{2,4}\b/g);
      if (matches && matches.length > 0) {
        const yrNum = parseInt(matches[matches.length - 1], 10);
        if (yrNum < 100) return 2000 + yrNum;
        return yrNum;
      }
      return -1;
    };
    // BASE e il +1500 piu' sotto sono offset fissi concordati con l'utente (es. saldi
    // di partenza non tracciati nello sheet) per far combaciare il grafico coi valori
    // reali dei conti; non sono derivati da alcun calcolo, sono costanti "a mano".
    const BASE = 5560.86;
    let runningSavings = 0;
    const rawData = sortedRisparmio.map(r => {
      runningSavings += (r.risparmioNetto || r.risparmio || 0);

      // Find matching record in localRendimenti
      const matchingRendimento = localRendimenti.find(rend => {
        const rMonthIdx = getMonthIndex(r.mese);
        const rendMonthIdx = getMonthIndex(rend.mese || '');
        if (rMonthIdx === -1 || rendMonthIdx === -1) return false;
        if (rMonthIdx !== rendMonthIdx) return false;

        const rendYear = getYearFromStr(rend.mese || '');
        if (rendYear !== -1 && rendYear !== r.anno) return false;

        return true;
      });

      const investitoValue = matchingRendimento
        ? (matchingRendimento.valoreAttualePortafoglio || null)
        : (r.investito || r.investiti || null);

      const risparmioCumulativo = (r.andamentoRisparmio !== undefined && r.andamentoRisparmio !== null && r.andamentoRisparmio !== 0)
        ? r.andamentoRisparmio
        : (runningSavings + BASE);

      const andamentoNettoValue = risparmioCumulativo + (investitoValue || 0) + 1500;

      return {
        mese: r.mese,
        anno: r.anno,
        uniqueKey: `${r.mese} ${r.anno}`,
        risparmioCumulativo,
        investito: investitoValue,
        andamentoNetto: andamentoNettoValue
      };
    });

    // Find the last index with a valid non-null, non-zero investito value
    let lastValidIndex = -1;
    for (let i = rawData.length - 1; i >= 0; i--) {
      if (rawData[i].investito !== null && rawData[i].investito !== undefined && rawData[i].investito !== 0) {
        lastValidIndex = i;
        break;
      }
    }

    // Range storico dei rendimenti mensili % (per stimare il mese/i mesi mancanti in due scenari tratteggiati)
    const storicoPerc = localRendimenti
      .map(r => r.rendimentoMensilePerc)
      .filter((p): p is number => typeof p === 'number' && isFinite(p));
    const percOttimistica = storicoPerc.length ? Math.max(0, ...storicoPerc) : 0;
    const percPessimistica = storicoPerc.length ? Math.min(0, ...storicoPerc) : 0;

    let runningOttimistica = lastValidIndex >= 0 ? (rawData[lastValidIndex].investito || 0) : 0;
    let runningPessimistica = runningOttimistica;

    // Oltre l'ultimo dato reale il valore investito (e quindi il netto, che lo somma) manca sempre (sheet non ancora aggiornato):
    // stimiamo due scenari tratteggiati (ottimistico/pessimistico) applicando il range storico dei rendimenti %
    return rawData.map((d, idx) => {
      if (idx < lastValidIndex) return d;
      if (idx === lastValidIndex) {
        // punto di raccordo: la stima parte esattamente dall'ultimo valore reale
        return {
          ...d,
          investitoStimaOttimistica: d.investito,
          investitoStimaPessimistica: d.investito,
          andamentoNettoStimaOttimistica: d.andamentoNetto,
          andamentoNettoStimaPessimistica: d.andamentoNetto
        };
      }
      runningOttimistica = runningOttimistica * (1 + percOttimistica / 100);
      runningPessimistica = runningPessimistica * (1 + percPessimistica / 100);
      return {
        ...d,
        investito: undefined,
        andamentoNetto: undefined,
        investitoStimaOttimistica: runningOttimistica,
        investitoStimaPessimistica: runningPessimistica,
        andamentoNettoStimaOttimistica: d.risparmioCumulativo + runningOttimistica + 1500,
        andamentoNettoStimaPessimistica: d.risparmioCumulativo + runningPessimistica + 1500
      };
    });
  }, [sortedRisparmio, localRendimenti]);

  return {
    selectedConto, setSelectedConto,
    visibleLines, setVisibleLines,
    localConti,
    totalWealth, totalDisponibile, totalInvestito, totalImpegnato,
    engagedCapitalData,
    COLORS,
    sortedRisparmio,
    cumulativeRisparmioData
  };
}
