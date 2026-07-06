import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  ArrowDownLeft,
  Filter,
  Search,
  Calendar,
  Grid,
  CreditCard,
  CheckCircle,
  XCircle,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { Transaction } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import Drawer from '../components/Drawer';
import {SHEETS_CONFIG} from '../config/sheetsConfig';

interface UsciteProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

const DEFAULT_RISPARMIO_HEADERS = SHEETS_CONFIG.find(s => s.dataKey === 'risparmio')?.headers || [];

const MONTH_MAP: { [key: string]: number } = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11
};

const getMonthIndex = (monthName: string): number => {
  const m = String(monthName || '').toLowerCase().trim();
  return MONTH_MAP[m] !== undefined ? MONTH_MAP[m] : 0;
};

const getTransactionYear = (t: Transaction): number => {
  if (!t.data) return new Date().getFullYear();
  const parts = t.data.split(/[\/\-]/);
  if (parts.length === 3) {
    const yearPart = parts[2].length === 4 ? parts[2] : parts[0].length === 4 ? parts[0] : parts[2];
    const parsedYear = parseInt(yearPart, 10);
    if (!isNaN(parsedYear)) {
      if (parsedYear < 100) return 2000 + parsedYear;
      return parsedYear;
    }
  }
  const match = t.data.match(/\b(20\d{2})\b/);
  if (match) return parseInt(match[1], 10);
  
  const match2 = t.data.match(/\/(\d{2})$/);
  if (match2) return 2000 + parseInt(match2[1], 10);
  
  return new Date().getFullYear();
};

export default function Uscite({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: UsciteProps) {
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

  const formatEuro = (value: any) => {
    if (value === undefined || value === null || isNaN(Number(value)) || value === '') {
      return '***';
    }
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: true }).format(Number(value));
  };

  const formatPercent = (value: any) => {
    if (value === undefined || value === null || isNaN(Number(value)) || value === '') {
      return '***%';
    }
    const num = Number(value);
    return num.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  };

  // Color allocations
  const SECTOR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#06b6d4'];
  const TYPE_COLORS = ['#2563eb', '#f59e0b']; // Primary, Secondary

  // Sort raw savings data chronologically
  const chronologicalData = useMemo(() => {
    return [...localRisparmio].sort((a, b) => {
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

  const parseThreshold = (headerString: string, fallback: number): number => {
    if (!headerString) return fallback;
    const pctMatch = headerString.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (pctMatch) {
      return parseFloat(pctMatch[1].replace(',', '.'));
    }
    const numMatch = headerString.match(/(\d+(?:[.,]\d+)?)/);
    if (numMatch) {
      return parseFloat(numMatch[1].replace(',', '.'));
    }
    return fallback;
  };

  const dynamicThresholds = useMemo(() => {
    const headers = data.risparmioHeaders?.length
      ? data.risparmioHeaders
      : DEFAULT_RISPARMIO_HEADERS;

    const primarie = parseThreshold(headers[4], 35);
    const secondarie = parseThreshold(headers[6], 15);
    const investiti = parseThreshold(headers[9], 15);
    
    let risparmio = 35;
    if (headers[11]) {
      risparmio = parseThreshold(headers[11], 35);
    } else if (headers[10]) {
      risparmio = parseThreshold(headers[10], 35);
    }
    
    const totali = parseThreshold(headers[13] || headers[12] || '', 50);

    return {
      primarie,
      secondarie,
      investiti,
      risparmio,
      totali
    };
  }, [data.risparmioHeaders]);

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
      const label = key;
      return {
        name: label,
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

    const entrateSoglia = record ? record.entrate : 2300;

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

  const renderDeltaBadge = (current: number, previous?: number, isDark = false) => {
    if (previous === undefined || previous === 0) return null;
    const isPreviousHigher = previous > current; // spending decreased -> Green (good)
    const percentDiff = Math.abs(((current - previous) / previous) * 100);
    const formattedPct = percentDiff.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

    if (isDark) {
      if (isPreviousHigher) {
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0 align-middle">
            ↓ {formattedPct}
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded-md shrink-0 align-middle">
            ↑ {formattedPct}
          </span>
        );
      }
    } else {
      if (isPreviousHigher) {
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0 align-middle">
            ↓ {formattedPct}
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md shrink-0 align-middle">
            ↑ {formattedPct}
          </span>
        );
      }
    }
  };

  const renderDeltaLabel = (current: number, previous?: number, isDark = false) => {
    if (previous === undefined || previous === 0) return null;
    return (
      <div className={`text-[10px] mt-1 ${isDark ? 'text-orange-200' : 'text-slate-400'} font-normal`}>
        rispetto al mese prec.
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Overviews row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cumulative Monthly Expenses - Orange card */}
        <div 
          onClick={() => setActiveChartFilter('all')}
          className={`cursor-pointer text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden min-h-[15.5rem] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
            activeChartFilter === 'all' 
              ? 'bg-orange-600 border-orange-400 ring-4 ring-orange-500/20' 
              : 'bg-orange-700/80 border-orange-800 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-orange-100 backdrop-blur-xs">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div className="z-10 text-left">
            <span className="text-xs text-orange-100 font-bold uppercase tracking-wider block">
              Spese Totali
            </span>
            <span className="text-[10px] text-orange-200 font-normal block mt-0.5 lowercase">
              ({selectedRecord.mese} {selectedRecord.anno})
            </span>
            <div className="mt-3 text-left">
              <div className="flex items-center gap-2.5">
                <h3 className="text-3xl font-extrabold font-display text-white leading-none">
                  {formatEuro(selectedRecord.speseTotali)}
                </h3>
                {prevRecord?.speseTotali && (
                  <div className="flex flex-col items-start leading-none mt-1">
                    {renderDeltaBadge(selectedRecord.speseTotali, prevRecord?.speseTotali, true)}
                    <span className="text-[10px] text-orange-200 mt-1 whitespace-nowrap">rispetto al mese prec.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress bar compared to Entrate */}
          <div className="mt-4 pt-3 border-t border-white/15 w-full z-10">
            <div className="flex justify-between items-center text-[10px] text-orange-100 font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={totalPctOfIncome > dynamicThresholds.totali ? 'text-red-300 font-bold' : 'text-orange-100 font-bold'}>
                {totalPctOfIncome.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden relative">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-200 to-amber-200" 
                  style={{ width: `${Math.min((totalPctOfIncome / (dynamicThresholds.totali + 5)) * 100, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/40" style={{ left: `${(dynamicThresholds.totali / (dynamicThresholds.totali + 5)) * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-orange-200 mt-1">
              <span>Soglia: {dynamicThresholds.totali}% delle entrate</span>
              <span className={totalPctOfIncome > dynamicThresholds.totali ? 'text-red-300 font-semibold' : 'text-orange-100 font-semibold'}>
                {totalPctOfIncome > dynamicThresholds.totali ? 'Soglia superata' : 'Nei limiti'}
              </span>
            </div>
          </div>

          <div className="absolute -right-4 -bottom-4 opacity-10">
            <ArrowDownLeft className="w-32 h-32" />
          </div>
        </div>

        {/* Spese primarie - White Card */}
        <div 
          onClick={() => setActiveChartFilter('primarie')}
          className={`cursor-pointer p-6 rounded-3xl border text-left relative overflow-hidden flex flex-col justify-between min-h-[15.5rem] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
            activeChartFilter === 'primarie'
              ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/15'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`absolute right-4 top-4 w-12 h-12 rounded-xl flex items-center justify-center transition-colors border ${
            activeChartFilter === 'primarie'
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-indigo-50 border-indigo-100 text-indigo-600'
          }`}>
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="z-10 text-left">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Spese Primarie
            </span>
            <span className="text-[10px] text-slate-400 font-normal block mt-0.5 lowercase">
              (essenziali)
            </span>
            <div className="mt-3 text-left">
              <div className="flex items-center gap-2.5">
                <h3 className="text-3xl font-extrabold font-display leading-none text-slate-800">
                  {formatEuro(selectedRecord.spesePrimarie)}
                </h3>
                {prevRecord?.spesePrimarie && (
                  <div className="flex flex-col items-start leading-none mt-1">
                    {renderDeltaBadge(selectedRecord.spesePrimarie, prevRecord?.spesePrimarie, false)}
                    <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">rispetto al mese prec.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar compared to Entrate */}
          <div className="mt-4 pt-3 border-t border-slate-100 w-full z-10">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={primaryPctOfIncome > dynamicThresholds.primarie ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                {primaryPctOfIncome.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-400 to-indigo-600`} 
                  style={{ width: `${Math.min((primaryPctOfIncome / (dynamicThresholds.primarie + 5)) * 100, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300" style={{ left: `${(dynamicThresholds.primarie / (dynamicThresholds.primarie + 5)) * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1">
              <span>Soglia: {dynamicThresholds.primarie}% delle entrate</span>
              <span className={primaryPctOfIncome > dynamicThresholds.primarie ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                {primaryPctOfIncome > dynamicThresholds.primarie ? 'Soglia superata' : 'Nei limiti'}
              </span>
            </div>
          </div>
        </div>

        {/* Spese Secondarie - White Card */}
        <div 
          onClick={() => setActiveChartFilter('secondarie')}
          className={`cursor-pointer p-6 rounded-3xl border text-left relative overflow-hidden flex flex-col justify-between min-h-[15.5rem] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
            activeChartFilter === 'secondarie'
              ? 'bg-amber-50 border-amber-500 ring-4 ring-amber-500/15'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`absolute right-4 top-4 w-12 h-12 rounded-xl flex items-center justify-center transition-colors border ${
            activeChartFilter === 'secondarie'
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'bg-amber-50 border-amber-100 text-amber-600'
          }`}>
            <XCircle className="w-6 h-6" />
          </div>
          <div className="z-10 text-left">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Spese Secondarie
            </span>
            <span className="text-[10px] text-slate-400 font-normal block mt-0.5 lowercase">
              (discrezionali)
            </span>
            <div className="mt-3 text-left">
              <div className="flex items-center gap-2.5">
                <h3 className="text-3xl font-extrabold font-display leading-none text-slate-800">
                  {formatEuro(selectedRecord.speseSecondarie)}
                </h3>
                {prevRecord?.speseSecondarie && (
                  <div className="flex flex-col items-start leading-none mt-1">
                    {renderDeltaBadge(selectedRecord.speseSecondarie, prevRecord?.speseSecondarie, false)}
                    <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">rispetto al mese prec.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar compared to Entrate */}
          <div className="mt-4 pt-3 border-t border-slate-100 w-full z-10">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                {secondaryPctOfIncome.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 to-amber-600`} 
                  style={{ width: `${Math.min((secondaryPctOfIncome / (dynamicThresholds.secondarie + 5)) * 100, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300" style={{ left: `${(dynamicThresholds.secondarie / (dynamicThresholds.secondarie + 5)) * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1">
              <span>Soglia: {dynamicThresholds.secondarie}% delle entrate</span>
              <span className={secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                {secondaryPctOfIncome > dynamicThresholds.secondarie ? 'Soglia superata' : 'Nei limiti'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly expense distribution stacked lines */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-800 font-display text-base">
                Andamento Spese {selectedMacroCat !== 'Tutte' ? `: ${selectedMacroCat}` : ''} {selectedMicroCat !== 'Tutte' ? `> ${selectedMicroCat}` : ''} (Ultimi 12 Mesi)
              </h3>
              {(selectedMacroCat !== 'Tutte' || selectedMicroCat !== 'Tutte') && (
                <button
                  onClick={() => {
                    setSelectedMacroCat('Tutte');
                    setSelectedMicroCat('Tutte');
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Azzera filtri categoria"
                >
                  <span>Ripristina Totale</span>
                  <span className="font-extrabold">×</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {selectedMacroCat !== 'Tutte' || selectedMicroCat !== 'Tutte' 
                ? `Mostrato il dettaglio storico per ${selectedMacroCat !== 'Tutte' ? `Macro: ${selectedMacroCat}` : ''} ${selectedMicroCat !== 'Tutte' ? `• Micro: ${selectedMicroCat}` : ''}.`
                : "Confronto temporale tra primarie e secondarie."
              } Clicca sul grafico per selezionare il mese di <strong className="text-orange-600 uppercase font-bold">{localSelectedMonth}</strong>.
            </p>
          </div>
          {/* Action button to open details */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline bg-orange-50 px-3 py-1.5 rounded-full text-xs font-bold text-orange-700 capitalize">
              Attivo: {localSelectedMonth} {selectedRecord.anno}
            </span>
            <button
              onClick={() => handleOpenMonthDetail(localSelectedMonth, selectedRecord.anno)}
              className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition hover:bg-indigo-700 cursor-pointer text-center"
            >
              Vedi Transazioni
            </button>
          </div>
        </div>
        <div className="h-72 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rolling12MonthsData}
              margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
              onClick={handleChartClick}
            >
              <defs>
                <linearGradient id="colorUscitePrimarie" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                </linearGradient>
                <linearGradient id="colorUsciteSecondarie" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="mese" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => {
                  const match = rolling12MonthsData.find(d => d.mese === val);
                  return match ? `${val} '${String(match.anno).slice(2)}` : val;
                }}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
              <Tooltip
                formatter={(value: any, name: any) => [formatEuro(Number(value)), name]}
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }} 
              />
              {(activeChartFilter === 'all' || activeChartFilter === 'primarie') && (
                <Area
                  type="monotone"
                  dataKey="spesePrimarie"
                  name="Spese Primarie"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorUscitePrimarie)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-primary'}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#4f46e5' : '#fff'}
                        stroke="#4f46e5"
                        strokeWidth={isSelected ? 3 : 2}
                        className="cursor-pointer transition-all"
                      />
                    );
                  }}
                />
              )}
              {(activeChartFilter === 'all' || activeChartFilter === 'secondarie') && (
                <Area
                  type="monotone"
                  dataKey="speseSecondarie"
                  name="Spese Secondarie"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorUsciteSecondarie)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-secondary'}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#f59e0b' : '#fff'}
                        stroke="#f59e0b"
                        strokeWidth={isSelected ? 3 : 2}
                        className="cursor-pointer transition-all"
                      />
                    );
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Split grid of distributions (Macro Categories & Icons Used) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenditure per Macro Categoria */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-600" />
            Spese per Macro Categoria
          </h3>
          <p className="text-xs text-slate-400 mt-1">Sottodivisione in base alle voci principali in euro</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroCategoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={0}
                    stroke="none"
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {macroCategoryDistribution.map((entry, index) => {
                      const name = entry.name || 'Altro';
                      const isSelected = selectedMacroCat === name;
                      const isAnyMacroSelected = selectedMacroCat !== 'Tutte';
                      const cellOpacity = isAnyMacroSelected ? (isSelected ? 1.0 : 0.35) : 1.0;
                      const cellStroke = isSelected ? '#1e293b' : 'none';
                      const cellStrokeWidth = isSelected ? 2 : 0;

                      return (
                        <Cell 
                          key={`macro-cell-${index}-${entry.name}`} 
                          fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} 
                          opacity={cellOpacity}
                          stroke={cellStroke}
                          strokeWidth={cellStrokeWidth}
                          style={{ cursor: 'pointer', outline: 'none' }}
                          onClick={() => {
                            if (selectedMacroCat === name) {
                              setSelectedMacroCat('Tutte');
                            } else {
                              setSelectedMacroCat(name);
                            }
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatEuro(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 text-xs w-full max-w-xs overflow-y-auto max-h-48 pr-2">
              {macroCategoryDistribution.map((m, idx) => {
                const name = m.name || 'Altro';
                const isSelected = selectedMacroCat === name;
                return (
                  <div 
                    key={`macro-list-${idx}-${m.name}`} 
                    onClick={() => {
                      if (selectedMacroCat === name) {
                        setSelectedMacroCat('Tutte');
                      } else {
                        setSelectedMacroCat(name);
                      }
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-indigo-50/70 border border-indigo-200/50 shadow-xs' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
                      <span className={`text-slate-600 truncate ${isSelected ? 'font-bold text-indigo-700' : 'font-semibold'}`}>{name}</span>
                    </div>
                    <span className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{formatEuro(m.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Expenditure per Micro Category */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Spese per Micro Categoria
          </h3>
          <p className="text-xs text-slate-400 mt-1">Sottodivisione in base alle categorie delle transazioni del mese</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={microCategoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={0}
                    stroke="none"
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {microCategoryDistribution.map((entry, index) => {
                      const name = entry.name || 'Altro';
                      const isSelected = selectedMicroCat === name;
                      const isAnyMicroSelected = selectedMicroCat !== 'Tutte';
                      const cellOpacity = isAnyMicroSelected ? (isSelected ? 1.0 : 0.35) : 1.0;
                      const cellStroke = isSelected ? '#1e293b' : 'none';
                      const cellStrokeWidth = isSelected ? 2 : 0;

                      return (
                        <Cell 
                          key={`micro-cell-${index}-${entry.name}`} 
                          fill={SECTOR_COLORS[(index + 3) % SECTOR_COLORS.length]} 
                          opacity={cellOpacity}
                          stroke={cellStroke}
                          strokeWidth={cellStrokeWidth}
                          style={{ cursor: 'pointer', outline: 'none' }}
                          onClick={() => {
                            if (selectedMicroCat === name) {
                              setSelectedMicroCat('Tutte');
                            } else {
                              setSelectedMicroCat(name);
                            }
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatEuro(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 text-xs w-full max-w-xs overflow-y-auto max-h-48 pr-2">
              {microCategoryDistribution.map((a, idx) => {
                const name = a.name || 'Altro';
                const isSelected = selectedMicroCat === name;
                return (
                  <div 
                    key={`micro-list-${idx}-${a.name}`} 
                    onClick={() => {
                      if (selectedMicroCat === name) {
                        setSelectedMicroCat('Tutte');
                      } else {
                        setSelectedMicroCat(name);
                      }
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-indigo-50/70 border border-indigo-200/50 shadow-xs' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[(idx + 3) % SECTOR_COLORS.length] }} />
                      <span className={`text-slate-600 truncate ${isSelected ? 'font-bold text-indigo-700' : 'font-semibold'}`}>{name}</span>
                    </div>
                    <span className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{formatEuro(a.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive table list filtering federico's real inputs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 intense-search-bar">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">Archivio Transazioni Uscite</h3>
            <p className="text-xs text-slate-400 mt-1">Cerca, filtra e analizza i flussi in tempo reale</p>
          </div>

          {/* Quick search input */}
          <div className="flex items-center gap-2.5 relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              placeholder="Cerca transazione, desc, cat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table filters strip */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-500 mb-4 font-medium select-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtri attivi:</span>
          </div>

           {/* macro category selector */}
           <select
             value={selectedMacroCat}
             onChange={(e) => {
               setSelectedMacroCat(e.target.value);
               setSelectedMicroCat('Tutte');
             }}
             className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold shrink-0 cursor-pointer"
           >
             {macroCategoriesList.map((m, idx) => (
               <option key={`macro-opt-${idx}-${m}`} value={m}>{m === 'Tutte' ? 'Macro Categorie (Tutte)' : m}</option>
             ))}
           </select>

          {/* payment account selector */}
          <select
            value={selectedConto}
            onChange={(e) => setSelectedConto(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold shrink-0 cursor-pointer"
          >
            {accountsList.map((a, idx) => (
              <option key={`acct-opt-${idx}-${a}`} value={a}>{a === 'Tutti' ? 'Conto Utilizzato (Tutti)' : a}</option>
            ))}
          </select>

          {/* primary / secondary checklist switcher */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold shrink-0 cursor-pointer"
          >
            <option value="Tutte font-semibold">Tipologia Spesa (Tutte)</option>
            <option value="Primarie font-semibold">Solo Spese Primarie (Target 35%)</option>
            <option value="Secondarie font-semibold">Solo Spese Secondarie (Target 15%)</option>
          </select>

          {/* Micro category selection indicator */}
          {selectedMicroCat !== 'Tutte' && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-lg font-bold shrink-0">
              <span>Micro: {selectedMicroCat}</span>
              <button 
                onClick={() => setSelectedMicroCat('Tutte')} 
                className="hover:text-indigo-900 font-extrabold ml-1.5 cursor-pointer text-sm leading-none"
                title="Rimuovi filtro micro categoria"
              >
                ×
              </button>
            </span>
          )}

          <span className="text-[10px] text-slate-450 ml-auto font-mono">
            Mostrati: <strong className="font-bold text-slate-700">{finalFilteredTransactions.length}</strong> record
          </span>
        </div>

        {/* Transactions list layout table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-150">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Data</th>
                <th className="px-6 py-4">Descrizione</th>
                <th className="px-6 py-4">Macro</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Importo</th>
                <th className="px-6 py-4">Conto utilizzato</th>
                <th className="px-6 py-4 text-center rounded-tr-2xl">Primaria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
              {finalFilteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-mono">
                    Nessuna transazione soddisfa i filtri selezionati.
                  </td>
                </tr>
              ) : (
                finalFilteredTransactions.map((tx, idx) => (
                  <tr key={tx.id || `tx-${idx}`} className="hover:bg-slate-50/20 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                      {tx.data}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{tx.icon || '🍕'}</span>
                        <span className="font-semibold text-slate-800 text-xs truncate max-w-xs">{tx.descrizione}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="bg-slate-100 border border-slate-200/50 text-[10px] text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        {tx.macroCategoria}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {tx.categoria}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-800">
                      {formatEuro(tx.importo)}
                    </td>
                    <td className="px-6 py-3.5 text-xs">
                      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {tx.conto}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {tx.primaria ? (
                        <span className="inline-flex items-center bg-blue-50 text-blue-600 text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm">
                          Sì (35%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-fuchsia-50 text-fuchsia-600 text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm">
                          No (15%)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        transactions={drawerTransactions}
        stats={drawerStats}
      />
    </div>
  );
}
