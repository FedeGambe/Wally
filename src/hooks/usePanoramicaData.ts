import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import { SHEETS_CONFIG } from '../config/sheetsConfig';
import { getThresholds } from '../utils/thresholds';
import { MESI_ITALIANI } from '../utils/date';

const DEFAULT_RISPARMIO_HEADERS = SHEETS_CONFIG.find(s => s.dataKey === 'risparmio')?.headers || [];

/**
 * Hook usato dalla pagina Panoramica (src/pages/Panoramica.tsx), la dashboard
 * riassuntiva. Prende in input l'anno/mese selezionati (stato condiviso con
 * l'header, passato come props) e legge da useFinanceData() i fogli Risparmio
 * e Patrimonio. Restituisce i KPI generali, il trend mensile per il grafico,
 * le soglie di spesa dinamiche e lo stato/i gestori del drawer di dettaglio.
 * Aggregati, trend e drawer della pagina Panoramica, separati dal JSX per
 * isolare i bug numerici dal layout.
 */
export function usePanoramicaData(
  selectedYear: string,
  setSelectedYear: (year: string) => void,
  selectedMonth: string,
  setSelectedMonth: (month: string) => void
) {
  const { data } = useFinanceData();

  // Local month state synced with parent selectedMonth
  const [localSelectedMonth, setLocalSelectedMonth] = useState(selectedMonth);

  useEffect(() => {
    setLocalSelectedMonth(selectedMonth);
  }, [selectedMonth]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerSubtitle, setDrawerSubtitle] = useState('');
  const [drawerTransactions, setDrawerTransactions] = useState<Transaction[]>([]);
  const [drawerStats, setDrawerStats] = useState<any>(undefined);

  // Filter data based on selected year
  const chronologicalData = useMemo(() => {
    const localRisparmio = data.risparmio;
    const baseSorted = [...localRisparmio].sort((a, b) => {
      const idxA = MESI_ITALIANI.indexOf(a.mese);
      const idxB = MESI_ITALIANI.indexOf(b.mese);
      const valA = a.anno * 12 + (idxA !== -1 ? idxA : 0);
      const valB = b.anno * 12 + (idxB !== -1 ? idxB : 0);
      return valA - valB;
    });

    return baseSorted.map(r => {
      const entrate = Number(r.entrate || 0);
      const spesePrimarie = Number(r.spesePrimarie || 0);
      const speseSecondarie = Number(r.speseSecondarie || 0);
      const speseTotali = Number(r.speseTotali || (spesePrimarie + speseSecondarie));

      const investito = Number(r.investiti !== undefined ? r.investiti : (r.investito !== undefined ? r.investito : 0));
      const risparmioNetto = Number(r.risparmio !== undefined ? r.risparmio : (r.risparmioNetto !== undefined ? r.risparmioNetto : 0));
      const spendibile = Number(r.spendibile || 0);

      return {
        ...r,
        uniqueKey: `${r.mese} ${r.anno}`,
        entrate,
        spesePrimarie,
        speseSecondarie,
        speseTotali,
        investito,
        risparmioNetto,
        spendibile
      };
    });
  }, [data]);

  const filteredRisparmio = useMemo(() => {
    return chronologicalData.filter(
      (item) => selectedYear === 'Tutti' || item.anno.toString() === selectedYear
    );
  }, [chronologicalData, selectedYear]);

  // Chart data: defaults to 6 months backward, or 4 months backward and 2 forward if the global selector is changed (non-latest)
  const chartData = useMemo(() => {
    if (chronologicalData.length === 0) return [];

    // Find the index of the selected month and year in chronologicalData
    const index = chronologicalData.findIndex(
      (r) => r.mese.toLowerCase() === localSelectedMonth.toLowerCase() &&
        (selectedYear === 'Tutti' || r.anno.toString() === selectedYear)
    );

    // If not found, fallback to the latest month's index
    const targetIdx = index !== -1 ? index : chronologicalData.length - 1;

    // By default (or if the selected month is the latest month in chronologicalData), we show 6 months backward
    // Se il mese selezionato e' l'ultimo disponibile non ci sono mesi futuri da mostrare,
    // quindi la finestra si allarga all'indietro (6 mesi) invece di lasciare spazio vuoto
    // a destra del grafico; altrimenti si centra la selezione con 2 mesi in avanti.
    const isLatest = targetIdx === chronologicalData.length - 1;

    const goBackward = isLatest ? 5 : 4;
    const goForward = isLatest ? 0 : 2;

    const startIdx = Math.max(0, targetIdx - goBackward);
    const endIdx = Math.min(chronologicalData.length - 1, targetIdx + goForward);

    return chronologicalData.slice(startIdx, endIdx + 1);
  }, [chronologicalData, localSelectedMonth, selectedYear]);

  const dynamicThresholds = useMemo(() => {
    const headers = data.risparmioHeaders?.length
      ? data.risparmioHeaders
      : DEFAULT_RISPARMIO_HEADERS;
    return getThresholds(headers);
  }, [data.risparmioHeaders]);

  // Retrieve current month record and previous month record for delta calculations (year-aware)
  // Ricerca "a cascata": prova prima mese+anno esatti, poi solo il mese (in
  // qualunque anno), poi l'ultimo record disponibile, e come ultima risorsa
  // costruisce un record vuoto (tutti i valori undefined) cosi' la UI puo'
  // comunque renderizzare senza dover gestire `undefined` in ogni punto.
  const currentMonthData = useMemo(() => {
    const yearToFind = selectedYear !== 'Tutti' ? parseInt(selectedYear, 10) : undefined;

    // First try: match both month and selected year
    let found = chronologicalData.find(
      (r) => r.mese.toLowerCase() === localSelectedMonth.toLowerCase() && (yearToFind === undefined || r.anno === yearToFind)
    );

    // Fallback: match by month name only in any year
    if (!found) {
      found = chronologicalData.find(
        (r) => r.mese.toLowerCase() === localSelectedMonth.toLowerCase()
      );
    }

    return found || chronologicalData[chronologicalData.length - 1] || {
      mese: localSelectedMonth,
      anno: yearToFind || new Date().getFullYear(),
      entrate: undefined,
      speseTotali: undefined,
      spesePrimarie: undefined,
      speseSecondarie: undefined,
      investito: undefined,
      risparmioNetto: undefined,
      spendibile: undefined,
      andamentoRisparmio: undefined
    };
  }, [chronologicalData, localSelectedMonth, selectedYear]);

  const prevMonthData = useMemo(() => {
    if (!currentMonthData || currentMonthData.mese === undefined) return undefined;
    const idx = chronologicalData.findIndex(
      (r) => r.mese === currentMonthData.mese && r.anno === currentMonthData.anno
    );
    return idx > 0 ? chronologicalData[idx - 1] : undefined;
  }, [chronologicalData, currentMonthData]);

  // Patrimonio sum calculations
  const localConti = data.patrimonio;
  const patrimonioTotale = localConti.reduce((sum, item) => sum + (item.capitaleTotale || 0), 0);
  const capitaleDisponibile = localConti.reduce((sum, item) => sum + (item.capitaleDisponibile || 0), 0);
  const capitaleInvestito = localConti.reduce((sum, item) => sum + (item.capitaleInvestito || 0), 0);
  const capitaleImpegnato = localConti.reduce((sum, item) => sum + (item.capitaleImpegnato || 0), 0);

  // Selezione mese cliccabile dal grafico, sincronizzata col selettore globale in header.
  // Recharts v3 non passa più `activePayload` all'onClick del chart: usiamo `activeLabel`
  // (qui: uniqueKey, già univoco mese+anno) per risalire al record cliccato.
  const handleChartClick = (chartEvent: any) => {
    if (!chartEvent || !chartEvent.activeLabel) return;
    const matched = chartData.find(r => r.uniqueKey === chartEvent.activeLabel);
    if (matched) {
      setLocalSelectedMonth(matched.mese);
      setSelectedMonth(matched.mese);
      setSelectedYear(matched.anno.toString());
    }
  };

  // Click handler to show details in the drawer
  const handleOpenMonthDetail = (monthName: string, yearValue: number) => {
    const formattedMonth = monthName.toLowerCase();
    setLocalSelectedMonth(monthName);

    const matchedTx = data.uscite.filter((t: Transaction) => t.mese.toLowerCase() === formattedMonth && (selectedYear === 'Tutti' || t.data.includes(yearValue.toString())));

    const savingIdx = chronologicalData.findIndex(r => r.mese.toLowerCase() === formattedMonth && r.anno === yearValue);
    const savingRecord = savingIdx !== -1 ? chronologicalData[savingIdx] : undefined;
    const prevRecord = savingIdx > 0 ? chronologicalData[savingIdx - 1] : undefined;
    const delta = (curr?: number, prev?: number) =>
      (curr !== undefined && prev !== undefined && prev !== 0) ? ((curr - prev) / prev) * 100 : undefined;

    setDrawerTitle(`Dettaglio Finanziario - ${monthName} ${yearValue}`);
    setDrawerSubtitle(`Analisi dei flussi e delle transazioni registrate`);
    setDrawerTransactions(matchedTx);
    setDrawerStats({
      total: savingRecord ? savingRecord.speseTotali : matchedTx.reduce((sum, t) => sum + t.importo, 0),
      count: matchedTx.length,
      primaryTotal: savingRecord ? savingRecord.spesePrimarie : undefined,
      monthDetail: savingRecord ? {
        entrate: savingRecord.entrate,
        speseTotali: savingRecord.speseTotali,
        spesePrimarie: savingRecord.spesePrimarie,
        speseSecondarie: savingRecord.speseSecondarie,
        investito: savingRecord.investito,
        risparmioNetto: savingRecord.risparmioNetto,
        entrateDelta: delta(savingRecord.entrate, prevRecord?.entrate),
        speseTotaliDelta: delta(savingRecord.speseTotali, prevRecord?.speseTotali),
        spesePrimarieDelta: delta(savingRecord.spesePrimarie, prevRecord?.spesePrimarie),
        speseSecondarieDelta: delta(savingRecord.speseSecondarie, prevRecord?.speseSecondarie),
        investitoDelta: delta(savingRecord.investito, prevRecord?.investito),
        risparmioNettoDelta: delta(savingRecord.risparmioNetto, prevRecord?.risparmioNetto)
      } : undefined
    });
    setDrawerOpen(true);
  };

  // Deltas against previous month (using currentMonthData vs prevMonthData)
  const entrateDelta = (prevMonthData && prevMonthData.entrate > 0 && currentMonthData && currentMonthData.entrate !== undefined)
    ? ((currentMonthData.entrate - prevMonthData.entrate) / prevMonthData.entrate) * 100
    : undefined;
  const speseDelta = (prevMonthData && prevMonthData.speseTotali > 0 && currentMonthData && currentMonthData.speseTotali !== undefined)
    ? ((currentMonthData.speseTotali - prevMonthData.speseTotali) / prevMonthData.speseTotali) * 100
    : undefined;
  const spesePrimDelta = (prevMonthData && prevMonthData.spesePrimarie > 0 && currentMonthData && currentMonthData.spesePrimarie !== undefined)
    ? ((currentMonthData.spesePrimarie - prevMonthData.spesePrimarie) / prevMonthData.spesePrimarie) * 100
    : undefined;
  const speseSecDelta = (prevMonthData && prevMonthData.speseSecondarie > 0 && currentMonthData && currentMonthData.speseSecondarie !== undefined)
    ? ((currentMonthData.speseSecondarie - prevMonthData.speseSecondarie) / prevMonthData.speseSecondarie) * 100
    : undefined;

  // Percentage on income for selectedMonth
  const primPerc = (currentMonthData && currentMonthData.entrate > 0 && currentMonthData.spesePrimarie !== undefined)
    ? (currentMonthData.spesePrimarie / currentMonthData.entrate) * 100
    : undefined;
  const secPerc = (currentMonthData && currentMonthData.entrate > 0 && currentMonthData.speseSecondarie !== undefined)
    ? (currentMonthData.speseSecondarie / currentMonthData.entrate) * 100
    : undefined;
  const invPerc = (currentMonthData && currentMonthData.entrate > 0 && currentMonthData.investito !== undefined)
    ? (currentMonthData.investito / currentMonthData.entrate) * 100
    : undefined;
  const rispPerc = (currentMonthData && currentMonthData.entrate > 0 && currentMonthData.risparmioNetto !== undefined)
    ? (currentMonthData.risparmioNetto / currentMonthData.entrate) * 100
    : undefined;

  // Quanto resta ancora da spendere questo mese: colonna "Spendibile" del
  // foglio Risparmio (budget mensile per le spese secondarie) meno quanto
  // già speso in secondarie.
  const spendibileResiduo = (currentMonthData && currentMonthData.spendibile !== undefined && currentMonthData.speseSecondarie !== undefined)
    ? currentMonthData.spendibile - currentMonthData.speseSecondarie
    : undefined;

  return {
    localSelectedMonth,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerSubtitle, drawerTransactions, drawerStats,
    filteredRisparmio,
    chartData,
    dynamicThresholds,
    currentMonthData, prevMonthData,
    patrimonioTotale, capitaleDisponibile, capitaleInvestito, capitaleImpegnato,
    handleChartClick, handleOpenMonthDetail,
    entrateDelta, speseDelta, spesePrimDelta, speseSecDelta,
    primPerc, secPerc, invPerc, rispPerc, spendibileResiduo
  };
}
