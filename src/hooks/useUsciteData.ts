import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import { SHEETS_CONFIG } from '../config/sheetsConfig';
import { formatEuro } from '../utils/format';
import { getMonthIndex, getTransactionYear, isMeseAnnoFuturo } from '../utils/date';
import { getThresholds } from '../utils/thresholds';

const DEFAULT_RISPARMIO_HEADERS = SHEETS_CONFIG.find(s => s.dataKey === 'risparmio')?.headers || [];

/**
 * Hook usato dalla pagina Uscite (src/pages/Uscite.tsx). Prende in input
 * l'anno/mese selezionati (stato condiviso con l'header, passato come props)
 * e legge da useFinanceData() le transazioni di spesa e il foglio Risparmio.
 * Restituisce i filtri di ricerca/categoria, i dati aggregati per i grafici
 * (trend mensile, ripartizione per categoria), le soglie di spesa "sane"
 * (es. non oltre il 35% del reddito) e lo stato/i gestori del drawer di dettaglio.
 * Tutto il calcolo dietro la pagina Uscite: filtri, aggregazioni per i grafici,
 * soglie dinamiche e stato del drawer di dettaglio. Separato dal JSX (Uscite.tsx)
 * cosi un bug nei numeri si debugga senza scorrere 700 righe di markup.
 */
export function useUsciteData(
  selectedYear: string,
  setSelectedYear: (year: string) => void,
  selectedMonth: string,
  setSelectedMonth: (month: string) => void
) {
  const { data } = useFinanceData();
  const localTransactions = data.uscite;
  const localRisparmio = data.risparmio;

  // Local month state synced with parent selectedMonth
  const [localSelectedMonth, setLocalSelectedMonth] = useState(selectedMonth);

  useEffect(() => {
    setLocalSelectedMonth(selectedMonth);
  }, [selectedMonth]);

  // Filters on state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMacroCat, setSelectedMacroCat] = useState('Tutte');
  const [selectedMicroCat, setSelectedMicroCat] = useState('Tutte');
  const [selectedConto, setSelectedConto] = useState('Tutti');
  const [selectedType, setSelectedType] = useState('Tutte'); // Tutte, Primarie, Secondarie
  const [activeChartFilter, setActiveChartFilter] = useState<'all' | 'primarie' | 'secondarie'>('all');

  // Drawer details state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerSubtitle, setDrawerSubtitle] = useState('');
  const [drawerTransactions, setDrawerTransactions] = useState<Transaction[]>([]);
  const [drawerStats, setDrawerStats] = useState<any>(undefined);

  // Color allocations
  const SECTOR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#06b6d4'];

  // Sort raw savings data chronologically
  const chronologicalData = useMemo(() => {
    return [...localRisparmio]
      .filter(r => !isMeseAnnoFuturo(r.mese, r.anno))
      .sort((a, b) => {
        if (a.anno !== b.anno) return a.anno - b.anno;
        return getMonthIndex(a.mese) - getMonthIndex(b.mese);
      });
  }, [localRisparmio]);

  // Retrieve selected month record and previous month record for delta calculations
  const selectedRecord = useMemo(() => {
    const targetYearNum = parseInt(selectedYear, 10);
    const exactMatch = chronologicalData.find(
      (r) => r.mese.toLowerCase() === localSelectedMonth.toLowerCase() && r.anno === targetYearNum
    );
    if (exactMatch) return exactMatch;

    const monthMatch = chronologicalData.find(
      (r) => r.mese.toLowerCase() === localSelectedMonth.toLowerCase()
    );
    if (monthMatch) return monthMatch;

    return chronologicalData[chronologicalData.length - 1] || { mese: 'Giugno', anno: 2026, entrate: 0, speseTotali: 0, spesePrimarie: 0, speseSecondarie: 0 };
  }, [chronologicalData, localSelectedMonth, selectedYear]);

  const prevRecord = useMemo(() => {
    if (!selectedRecord) return undefined;
    const idx = chronologicalData.findIndex(
      (r) => r.mese.toLowerCase() === selectedRecord.mese.toLowerCase() && r.anno === selectedRecord.anno
    );
    return idx > 0 ? chronologicalData[idx - 1] : undefined;
  }, [chronologicalData, selectedRecord]);

  const entrateVal = useMemo(() => Number(selectedRecord?.entrate || 0), [selectedRecord]);

  const totalPctOfIncome = useMemo(() => {
    return entrateVal > 0 ? (selectedRecord.speseTotali / entrateVal) * 100 : 0;
  }, [selectedRecord.speseTotali, entrateVal]);

  const primaryPctOfIncome = useMemo(() => {
    return entrateVal > 0 ? (selectedRecord.spesePrimarie / entrateVal) * 100 : 0;
  }, [selectedRecord.spesePrimarie, entrateVal]);

  const secondaryPctOfIncome = useMemo(() => {
    return entrateVal > 0 ? (selectedRecord.speseSecondarie / entrateVal) * 100 : 0;
  }, [selectedRecord.speseSecondarie, entrateVal]);

  // Soglie di spesa "sane" (es. non oltre il 35% del reddito in primarie). Stessa
  // fonte/priorità di Panoramica (src/utils/thresholds.tsx): Soglie di Dati Base
  // prima, poi le intestazioni del foglio Risparmio, poi i default hardcoded.
  const dynamicThresholds = useMemo(() => {
    const headers = data.risparmioHeaders?.length
      ? data.risparmioHeaders
      : DEFAULT_RISPARMIO_HEADERS;
    return getThresholds(headers, data.soglie);
  }, [data.risparmioHeaders, data.soglie]);

  // Rolling last 12 months data for trend chart (dynamic detail based on selection)
  // Utilizza una finestra mobile dinamica: 9 mesi indietro e 2 mesi in avanti in base alla selezione.
  const rolling12MonthsData = useMemo(() => {
    if (chronologicalData.length === 0) return [];

    const index = chronologicalData.findIndex(
      (r) => r.mese.toLowerCase() === localSelectedMonth.toLowerCase() &&
             (selectedYear === 'Tutti' || r.anno.toString() === selectedYear)
    );

    // Se non trovato, facciamo fallback all'ultimo elemento
    const targetIdx = index !== -1 ? index : chronologicalData.length - 1;

    const goForward = Math.min(2, chronologicalData.length - 1 - targetIdx);
    const goBackward = 11 - goForward;

    const startIdx = Math.max(0, targetIdx - goBackward);
    const endIdx = Math.min(chronologicalData.length - 1, targetIdx + goForward);

    const base12Months = chronologicalData.slice(startIdx, endIdx + 1);

    // If no specific category filters are active, return the standard record data
    if (selectedMacroCat === 'Tutte' && selectedMicroCat === 'Tutte') {
      return base12Months;
    }

    // Otherwise, dynamically calculate the monthly primary/secondary breakdown
    // for the selected macro-category or micro-category across those 12 months
    return base12Months.map((monthRecord) => {
      const monthLower = monthRecord.mese.toLowerCase().trim();
      const yearVal = monthRecord.anno;

      // Filter uscite for this specific month and year
      const monthlyTxs = localTransactions.filter((t) => {
        const tMonth = (t.mese || '').toLowerCase().trim();
        const tYear = getTransactionYear(t);
        if (tMonth !== monthLower || tYear !== yearVal) return false;

        // Filter by macro-category if selected
        if (selectedMacroCat !== 'Tutte') {
          const transMacro = t.macroCategoria || 'Altro';
          if (transMacro !== selectedMacroCat) return false;
        }

        // Filter by micro-category if selected
        if (selectedMicroCat !== 'Tutte') {
          const transMicro = t.categoria || 'Altro';
          if (transMicro !== selectedMicroCat) return false;
        }

        return true;
      });

      // Sum primary and secondary expenses for this filtered set of uscite
      let primarieSum = 0;
      let secondarieSum = 0;

      monthlyTxs.forEach((t) => {
        if (t.primaria) {
          primarieSum += t.importo;
        } else {
          secondarieSum += t.importo;
        }
      });

      return {
        ...monthRecord,
        spesePrimarie: primarieSum,
        speseSecondarie: secondarieSum,
        speseTotali: primarieSum + secondarieSum,
      };
    });
  }, [chronologicalData, localTransactions, selectedMacroCat, selectedMicroCat, localSelectedMonth, selectedYear]);

  // Base pool of uscite for the selected month and year
  const activeMonthAllTransactions = useMemo(() => {
    if (!selectedRecord) return [];
    return localTransactions.filter((t) => {
      const tYear = getTransactionYear(t);
      const tMonth = (t.mese || '').toLowerCase().trim();
      return tMonth === selectedRecord.mese.toLowerCase().trim() && tYear === selectedRecord.anno;
    });
  }, [localTransactions, selectedRecord]);

  // Dynamic Macro categories extracted right from localTransactions
  const macroCategoriesList = useMemo(() => {
    const list = new Set(localTransactions.map(t => t.macroCategoria).filter(Boolean));
    return ['Tutte', ...Array.from(list)];
  }, [localTransactions]);

  // Dynamic Payment accounts listings
  const accountsList = useMemo(() => {
    const list = new Set(localTransactions.map(t => t.conto).filter(Boolean));
    return ['Tutti', ...Array.from(list)];
  }, [localTransactions]);

  // Filter uscite table based on multi criteria
  const finalFilteredTransactions = useMemo(() => {
    return activeMonthAllTransactions.filter((t) => {
      // Text search match
      const textMatches =
        searchTerm === '' ||
        t.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.macroCategoria.toLowerCase().includes(searchTerm.toLowerCase());
      if (!textMatches) return false;

      // Macro category selection
      if (selectedMacroCat !== 'Tutte') {
        const transMacro = t.macroCategoria || 'Altro';
        if (transMacro !== selectedMacroCat) return false;
      }

      // Micro category selection
      if (selectedMicroCat !== 'Tutte') {
        const transMicro = t.categoria || 'Altro';
        if (transMicro !== selectedMicroCat) return false;
      }

      // Conto utilized selection
      if (selectedConto !== 'Tutti' && t.conto !== selectedConto) return false;

      // Primary vs Secondary selection
      if (selectedType === 'Primarie' && !t.primaria) return false;
      if (selectedType === 'Secondarie' && t.primaria) return false;

      return true;
    });
  }, [activeMonthAllTransactions, searchTerm, selectedMacroCat, selectedMicroCat, selectedConto, selectedType]);

  // Breakdown expenditure per Macro Category matching selected month and year
  const macroCategoryDistribution = useMemo(() => {
    const counts: { [key: string]: number } = {};
    activeMonthAllTransactions.forEach((t) => {
      const cat = t.macroCategoria || 'Altro';
      counts[cat] = (counts[cat] || 0) + Number(t.importo || 0);
    });

    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key]
    })).sort((a, b) => b.value - a.value);
  }, [activeMonthAllTransactions]);

  // Breakdown expenditure per Categoria (Micro Category) matching selected month and year
  const microCategoryDistribution = useMemo(() => {
    const counts: { [key: string]: number } = {};
    activeMonthAllTransactions.forEach((t) => {
      if (selectedMacroCat !== 'Tutte') {
        const transMacro = t.macroCategoria || 'Altro';
        if (transMacro !== selectedMacroCat) return;
      }
      const catKey = t.categoria || 'Altro';
      counts[catKey] = (counts[catKey] || 0) + Number(t.importo || 0);
    });

    return Object.keys(counts).map((key) => {
      return {
        name: key,
        categoria: key,
        value: counts[key]
      };
    }).sort((a, b) => b.value - a.value);
  }, [activeMonthAllTransactions, selectedMacroCat]);

  // Selezione mese cliccabile dal grafico storico, sincronizzata col selettore globale in header.
  // Recharts v3 non passa più `activePayload` all'onClick del chart: usiamo `activeLabel`,
  // la label dell'asse X (qui: mese), per risalire al record cliccato.
  const handleChartClick = (chartEvent: any) => {
    if (!chartEvent || !chartEvent.activeLabel) return;
    const matched = rolling12MonthsData.find(r => r.mese === chartEvent.activeLabel);
    if (matched) {
      setLocalSelectedMonth(matched.mese);
      setSelectedMonth(matched.mese);
      setSelectedYear(matched.anno.toString());
    }
  };

  // Click handler to open detailed panel per Month
  const handleOpenMonthDetail = (monthName: string, yearValue: number) => {
    setLocalSelectedMonth(monthName);
    const formattedMonth = monthName.toLowerCase();
    const matchedTx = localTransactions.filter(t => {
      const tYear = getTransactionYear(t);
      const tMonth = (t.mese || '').toLowerCase().trim();
      return tMonth === formattedMonth && tYear === yearValue;
    });
    const record = localRisparmio.find(r => r.mese.toLowerCase() === formattedMonth && r.anno === yearValue);

    setDrawerTitle(`Analisi Completa Uscite - ${monthName} ${yearValue}`);
    setDrawerSubtitle(`Spesa totale: ${formatEuro(record ? record.speseTotali : 1100)}`);
    setDrawerTransactions(matchedTx);
    setDrawerStats({
      total: record ? record.speseTotali : matchedTx.reduce((sum, t) => sum + t.importo, 0),
      count: matchedTx.length,
      primaryTotal: record ? record.spesePrimarie : undefined,
      secondaryTotal: record ? record.speseSecondarie : undefined
    });
    setDrawerOpen(true);
  };

  return {
    localSelectedMonth,
    searchTerm, setSearchTerm,
    selectedMacroCat, setSelectedMacroCat,
    selectedMicroCat, setSelectedMicroCat,
    selectedConto, setSelectedConto,
    selectedType, setSelectedType,
    activeChartFilter, setActiveChartFilter,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerSubtitle, drawerTransactions, drawerStats,
    SECTOR_COLORS,
    selectedRecord, prevRecord,
    totalPctOfIncome, primaryPctOfIncome, secondaryPctOfIncome,
    dynamicThresholds,
    rolling12MonthsData,
    macroCategoriesList, accountsList,
    finalFilteredTransactions,
    macroCategoryDistribution, microCategoryDistribution,
    handleChartClick, handleOpenMonthDetail
  };
}
