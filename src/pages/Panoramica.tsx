import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  ArrowDownRight,
  TrendingDown,
  ArrowUpRight,
  Coins,
  ShieldAlert,
  PiggyBank,
  ChevronRight,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Transaction } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import Drawer from '../components/Drawer';
import { SHEETS_CONFIG } from '../config/sheetsConfig';
import {getThresholds} from '../utils/thresholds'

interface PanoramicaProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

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

const DEFAULT_RISPARMIO_HEADERS = SHEETS_CONFIG.find(s => s.dataKey === 'risparmio')?.headers || [];

export default function Panoramica({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: PanoramicaProps) {
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
    const calendarOrder = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    const localRisparmio = data.risparmio;
    const baseSorted = [...localRisparmio].sort((a, b) => {
      const idxA = calendarOrder.indexOf(a.mese);
      const idxB = calendarOrder.indexOf(b.mese);
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

      return {
        ...r,
        uniqueKey: `${r.mese} ${r.anno}`,
        entrate,
        spesePrimarie,
        speseSecondarie,
        speseTotali,
        investito,
        risparmioNetto
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
    const isLatest = targetIdx === chronologicalData.length - 1;

    const goBackward = isLatest ? 5 : 4;
    const goForward = isLatest ? 0 : 2;

    const startIdx = Math.max(0, targetIdx - goBackward);
    const endIdx = Math.min(chronologicalData.length - 1, targetIdx + goForward);

    return chronologicalData.slice(startIdx, endIdx + 1);
  }, [chronologicalData, localSelectedMonth, selectedYear]);

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
    return getThresholds(headers);
  }, [data.risparmioHeaders]);


  // Retrieve current month record and previous month record for delta calculations (year-aware)
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
  const investitoImpegnato = capitaleInvestito + capitaleImpegnato;

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

  // Click handler to show details in the drawer
  const handleOpenMonthDetail = (monthName: string, yearValue: number) => {
    const formattedMonth = monthName.toLowerCase();
    setLocalSelectedMonth(monthName);
    
    const matchedTx = data.uscite.filter((t: Transaction) => t.mese.toLowerCase() === formattedMonth && (selectedYear === 'Tutti' || t.data.includes(yearValue.toString())));
    
    const savingRecord = chronologicalData.find(r => r.mese.toLowerCase() === formattedMonth && r.anno === yearValue);
    
    setDrawerTitle(`Dettaglio Finanziario - ${monthName} ${yearValue}`);
    setDrawerSubtitle(`Analisi dei flussi e delle transazioni registrate`);
    setDrawerTransactions(matchedTx);
    setDrawerStats({
      total: savingRecord ? savingRecord.speseTotali : matchedTx.reduce((sum, t) => sum + t.importo, 0),
      count: matchedTx.length,
      primaryTotal: savingRecord ? savingRecord.spesePrimarie : undefined
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

  return (
    <div className="space-y-6">
      {/* Top row Wealth widget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Wealth card 1 - Capitale Disponibile (Indigo) */}
        <div className="bg-indigo-600 text-white rounded-3xl p-6 flex flex-col justify-between shadow-xs relative overflow-hidden h-40 border border-indigo-700 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div className="z-10">
            <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider block">Capitale Disponibile</span>
            <h3 className="text-[28px] font-extrabold font-display text-white mt-1 block leading-none">
              {formatEuro(capitaleDisponibile)}
            </h3>
          </div>
          <p className="text-[10px] text-indigo-100/90 flex items-center gap-2 mt-auto z-10 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Liquidità pronta all'uso ({formatPercent((capitaleDisponibile / patrimonioTotale) * 100)})</span>
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <PiggyBank className="w-32 h-32" />
          </div>
        </div>

        {/* Wealth card 2 - Capitale Investito (Emerald) */}
        <div className="bg-emerald-600 text-white rounded-3xl p-6 flex flex-col justify-between shadow-xs relative overflow-hidden h-40 border border-emerald-700 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="z-10">
            <span className="text-xs text-emerald-200 font-bold uppercase tracking-wider block">Capitale Investito</span>
            <h3 className="text-[28px] font-extrabold font-display text-white mt-1 block leading-none">
              {formatEuro(capitaleInvestito)}
            </h3>
          </div>
          <p className="text-[10px] text-emerald-100/90 flex items-center gap-2 mt-auto z-10 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>Strumenti finanziari attivi ({formatPercent((capitaleInvestito / patrimonioTotale) * 100)})</span>
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <TrendingUp className="w-32 h-32" />
          </div>
        </div>

        {/* Wealth card 3 - Capitale Impegnato (Amber) */}
        <div className="bg-amber-600 text-white rounded-3xl p-6 flex flex-col justify-between shadow-xs relative overflow-hidden h-40 border border-amber-700 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
            <Coins className="w-6 h-6" />
          </div>
          <div className="z-10">
            <span className="text-xs text-amber-200 font-bold uppercase tracking-wider block">Capitale Impegnato</span>
            <h3 className="text-[28px] font-extrabold font-display text-white mt-1 block leading-none">
              {formatEuro(capitaleImpegnato)}
            </h3>
          </div>
          <p className="text-[10px] text-amber-100/90 flex items-center gap-2 mt-auto z-10 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>Fondi vincolati o prenotati ({formatPercent((capitaleImpegnato / patrimonioTotale) * 100)})</span>
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Coins className="w-32 h-32" />
          </div>
        </div>

        {/* Wealth card 4 - Capitale Totale (Slate-900) */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-xs relative overflow-hidden h-40 border border-slate-950 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="z-10">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Capitale Totale (Disp. + Inv.)</span>
            <h3 className="text-[28px] font-extrabold font-display text-white mt-1 block leading-none">
              {formatEuro(capitaleDisponibile + capitaleInvestito)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-300 flex items-center gap-2 mt-auto z-10 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            <span>Incluso Impegnato: <strong className="font-bold text-white">{formatEuro(capitaleDisponibile + capitaleInvestito + capitaleImpegnato)}</strong></span>
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <BarChart3 className="w-32 h-32" />
          </div>
        </div>
      </div>

      {/* Main KPI Month Strip & Indicators */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <h3 className="text-base font-bold text-slate-800 font-display mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-605 text-indigo-600" />
          Mese Corrente in Evidenza: <span className="text-indigo-600 font-extrabold capitalize">{currentMonthData.mese} {currentMonthData.anno}</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Risparmio */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risparmio</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.risparmioNetto)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(rispPerc)}</strong></span>
              {rispPerc >= dynamicThresholds.risparmio ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Target {dynamicThresholds.risparmio}% OK ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Target {dynamicThresholds.risparmio}% ✗
                </span>
              )}
            </div>
          </div>

          {/* Investito */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Capitale Investito</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.investito)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(invPerc)}</strong></span>
              {invPerc >= dynamicThresholds.investiti ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Target {dynamicThresholds.investiti}% OK ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Target {dynamicThresholds.investiti}% ✗
                </span>
              )}
            </div>
          </div>

          {/* Spese Primarie */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spese Primarie</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.spesePrimarie)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(primPerc)}</strong></span>
              {primPerc <= dynamicThresholds.primarie ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Soglia {dynamicThresholds.primarie}% ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sopra Soglia {dynamicThresholds.primarie}% ✗
                </span>
              )}
            </div>
          </div>

          {/* Spese Secondarie */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spese Secondarie</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.speseSecondarie)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(secPerc)}</strong></span>
              {secPerc <= dynamicThresholds.secondarie ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Soglia {dynamicThresholds.secondarie}% ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sopra Soglia {dynamicThresholds.secondarie}% ✗
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delta change vs previous month */}
        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
              Delta vs {prevMonthData ? `${prevMonthData.mese} ${prevMonthData.anno}` : 'Mese Precedente'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Entrate:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${entrateDelta >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {entrateDelta >= 0 ? '+' : ''}{formatPercent(entrateDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Uscite Totali:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {speseDelta >= 0 ? '+' : ''}{formatPercent(speseDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Spese Primarie:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${spesePrimDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {spesePrimDelta >= 0 ? '+' : ''}{formatPercent(spesePrimDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Spese Secondarie:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseSecDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {speseSecDelta >= 0 ? '+' : ''}{formatPercent(speseSecDelta)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Chart & General Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Trend monthly Line Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left lg:col-span-2 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 font-display text-base">Trend Consumi & Risparmio Mensile</h3>
              <p className="text-xs text-slate-400 mt-1">Confronto tra flussi di risparmio e quota investimenti</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <span className="w-3 h-1.5 bg-indigo-600 rounded-full" /> Risparmio
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <span className="w-3 h-1.5 bg-fuchsia-500 rounded-full" /> Investito
              </span>
            </div>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const clickedElement = data.activePayload[0].payload;
                    setLocalSelectedMonth(clickedElement.mese);
                  }
                }}
              >
                <defs>
                  <linearGradient id="colorRisparmio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInvestito" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="uniqueKey"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    const parts = String(val).split(' ');
                    if (parts.length === 2) {
                      const m = parts[0].slice(0, 3);
                      const y = parts[1].slice(2);
                      return selectedYear === 'Tutti' ? `${m} '${y}` : m;
                    }
                    return val;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatEuro(value), '']}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  name="Risparmio Netto"
                  dataKey="risparmioNetto"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRisparmio)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-risparmio'}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 3}
                        fill={isSelected ? '#4f46e5' : '#fff'}
                        stroke="#4f46e5"
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="cursor-pointer transition-all"
                      />
                    );
                  }}
                  activeDot={{ r: 6, onClick: (e, payload: any) => handleOpenMonthDetail(payload.payload.mese, payload.payload.anno) }}
                />
                <Area
                  type="monotone"
                  name="Quota Investita"
                  dataKey="investito"
                  stroke="#d946ef"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorInvestito)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-investito'}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 3}
                        fill={isSelected ? '#d946ef' : '#fff'}
                        stroke="#d946ef"
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="cursor-pointer transition-all"
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Summary Widget */}
        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md">
          <div>
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Rendiconto Mese Corrente</span>
            <h3 className="text-2.5xl font-black font-display mt-2 text-white leading-none">Disponibilità Netta</h3>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Sintesi dei flussi di questo mese ricavati direttamente dal foglio Risparmio.
            </p>
          </div>

          <div className="my-5 space-y-3 px-1 border-t border-b border-slate-800 py-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Entrate registrate:</span>
              <span className="font-bold font-display text-white">{formatEuro(currentMonthData.entrate)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Spese Primarie:</span>
              <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.spesePrimarie)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Spese Secondarie:</span>
              <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseSecondarie)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Uscite totali:</span>
              <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseTotali)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Capitale Investito:</span>
              <span className="font-bold font-display text-indigo-300">{formatEuro(currentMonthData.investito)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
              <span className="text-slate-200 font-bold">Risparmio Netto:</span>
              <span className="text-base font-black font-display text-emerald-400">{formatEuro(currentMonthData.risparmioNetto)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Soglia Target ({dynamicThresholds.risparmio}%)
            </span>
            <span className="font-extrabold text-emerald-400">{formatEuro(currentMonthData.entrate * (dynamicThresholds.risparmio / 100))}</span>
          </div>
        </div>
      </div>

      {/* Balancing table for N Months */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">Bilancio Storico Mensile</h3>
            <p className="text-xs text-slate-400 mt-1">Sintesi consolidata ricavata dal foglio Risparmio</p>
          </div>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Storico: {filteredRisparmio.length} mesi
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-100">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Mese / Anno</th>
                <th className="px-6 py-4 text-right">Entrate</th>
                <th className="px-6 py-4 text-right">Spese Primarie</th>
                <th className="px-6 py-4 text-right">Spese Secondarie</th>
                <th className="px-6 py-4 text-right">Investito</th>
                <th className="px-6 py-4 text-right">Risparmio Netto</th>
                <th className="px-6 py-4 text-right">Quota Netto %</th>
                <th className="px-6 py-4 text-right rounded-tr-2xl">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
              {[...filteredRisparmio].reverse().map((r, idx) => {
                const savingQuota = (r.risparmioNetto / r.entrate) * 100;
                return (
                  <tr key={idx} className="hover:bg-slate-55/40 hover:bg-slate-50/50 transition-colors duration-155">
                    <td className="px-6 py-3.5 font-bold text-slate-850 capitalize">
                      {r.mese} {r.anno}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                      {formatEuro(r.entrate)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-600">
                      {formatEuro(r.spesePrimarie)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-600">
                      {formatEuro(r.speseSecondarie)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-indigo-650 text-indigo-600 font-semibold">
                      {formatEuro(r.investito)}
                    </td>
                    <td className={`px-6 py-3.5 text-right font-extrabold ${
                      r.risparmioNetto >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}>
                      {formatEuro(r.risparmioNetto)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        savingQuota >= 35
                          ? "bg-emerald-100 text-emerald-800"
                          : savingQuota >= 10
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {formatPercent(savingQuota)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenMonthDetail(r.mese, r.anno)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-xl border border-indigo-200 hover:border-transparent transition-all duration-150 cursor-pointer"
                      >
                        Analizza
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer detailed details */}
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
