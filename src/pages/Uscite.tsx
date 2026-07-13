// ============================================================================
// Pagina "Uscite": mostra le spese (uscite) del mese/anno selezionati,
// distinte in "primarie" (essenziali) e "secondarie" (discrezionali), con
// filtri per categoria, conto e ricerca testuale sull'elenco transazioni.
//
// Dati: i calcoli (percentuali su entrate, soglie di allerta dinamiche,
// storico ultimi 12 mesi, distribuzione per macro/micro categoria, elenco
// filtrato) sono tutti nell'hook useUsciteData (src/hooks/useUsciteData.ts).
// Questo file gestisce solo la resa grafica e un piccolo stato locale di UI
// (scroll/evidenziazione del pannello Micro Categoria).
//
// Sotto-sezioni della pagina:
//  1. Tre card KPI: Spese Totali, Primarie, Secondarie (con barra soglia)
//  2. Grafico ad area con lo storico spese ultimi 12 mesi (cliccabile)
//  3. Due grafici a torta: distribuzione per Macro Categoria e Micro Categoria
//     (cliccare una fetta della Macro filtra la Micro, vedi useEffect sotto)
//  4. Tabella/archivio transazioni con ricerca e filtri (macro, conto, tipo)
//  5. Drawer laterale con il dettaglio movimenti quando si apre un mese
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatAxisCompact } from '../utils/format';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  ArrowDownLeft,
  Filter,
  Search,
  Grid,
  CreditCard,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Drawer from '../components/Drawer';
import DropdownMenu from '../components/DropdownMenu';
import EuroAmount from '../components/EuroAmount';
import { formatEuro, formatPercent } from '../utils/format';
import { useUsciteData } from '../hooks/useUsciteData';

interface UsciteProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

export default function Uscite({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: UsciteProps) {
  const isMobile = useIsMobile();
  const {
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
  } = useUsciteData(selectedYear, setSelectedYear, selectedMonth, setSelectedMonth);

  // Massimo assoluto delle serie effettivamente disegnate (dipende dal filtro
  // primarie/secondarie/all): decide se l'asse Y può usare la notazione compatta
  // "k" su mobile (vedi formatAxisCompact in utils/format.ts).
  const yAxisMaxAbs = rolling12MonthsData.reduce((m: number, r: any) => {
    const keys = activeChartFilter === 'all' ? ['spesePrimarie', 'speseSecondarie']
      : activeChartFilter === 'primarie' ? ['spesePrimarie'] : ['speseSecondarie'];
    return keys.reduce((mm, k) => Math.max(mm, Math.abs(Number(r[k]) || 0)), m);
  }, 0);

  // Selezionare una fetta nella torta Macro porta il focus (scroll + ring) sulla torta Micro,
  // che si aggiorna già filtrata sulla macro categoria scelta.
  const microPanelRef = useRef<HTMLDivElement>(null);
  const [microFocused, setMicroFocused] = useState(false);

  useEffect(() => {
    if (selectedMacroCat === 'Tutte') return;
    microPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setMicroFocused(true);
    const timer = setTimeout(() => setMicroFocused(false), 1400);
    return () => clearTimeout(timer);
  }, [selectedMacroCat]);

  // Badge con la variazione percentuale rispetto al mese precedente.
  // Qui la logica è invertita rispetto alle Entrate: per le SPESE "di meno" è
  // meglio. Se il mese precedente era più alto (isPreviousHigher) vuol dire
  // che la spesa è diminuita: mostriamo verde (buono), altrimenti rosso.
  // isDark sceglie la palette adatta a sfondi scuri (card arancione) o chiari.
  const renderDeltaBadge = (current: number, previous?: number, isDark = false) => {
    if (previous === undefined || previous === 0) return null;
    const isPreviousHigher = previous > current; // spending decreased -> Green (good)
    const percentDiff = Math.abs(((current - previous) / previous) * 100);
    const formattedPct = formatPercent(percentDiff);

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

  const renderPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0];
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.92), rgba(15,23,42,0.96))',
          backdropFilter: 'blur(4px)',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '12px',
          padding: '8px 12px'
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.payload.color || p.color }} />
          <span><strong>{p.name}</strong>: {formatEuro(Number(p.value))}</span>
        </div>
      </div>
    );
  };

  // Tooltip custom del grafico storico (Andamento Spese ultimi 12 mesi):
  // Recharts passa "label" = valore dell'asse X (il mese), qui lo cerchiamo
  // in rolling12MonthsData per recuperare anche l'anno da mostrare in testa.
  const renderAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const match = rolling12MonthsData.find(d => d.mese === label);
    const headerLabel = match ? `${label} ${match.anno}` : label;
    return (
      <div
        style={{
          background: '#1e293b',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '12px',
          padding: '8px 12px'
        }}
      >
        <div className="font-bold" style={{ marginBottom: 4 }}>{headerLabel}</div>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5" style={{ marginTop: idx > 0 ? 4 : 0 }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.name}: {formatEuro(Number(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };

  // Legenda custom sopra il grafico storico, per avere lo stile coerente col
  // resto della pagina invece della legenda di default di Recharts.
  const renderAreaLegend = ({ payload }: any) => (
    <div className="flex items-center justify-center gap-4" style={{ marginBottom: 12 }}>
      {payload.map((entry: any, idx: number) => (
        <span key={idx} className="flex items-center gap-1.5 text-slate-500" style={{ fontSize: 11, fontWeight: 600 }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        {/* Cumulative Monthly Expenses - Orange card */}
        <div
          onClick={() => setActiveChartFilter('all')}
          className={`cursor-pointer text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden md:min-h-[15.5rem] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
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
                  <EuroAmount value={selectedRecord.speseTotali} />
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
          
          {/* Progress bar compared to Entrate.
              La barra non è scalata sul 100%, ma su "soglia + 5 punti": così la
              tacca verticale (il marcatore della soglia) non finisce sempre
              appiccicata al bordo destro e si vede meglio quanto si è vicini
              o lontani dal limite. Stesso pattern ripetuto per Primarie e
              Secondarie qui sotto. */}
          <div className="mt-4 pt-3 border-t border-white/15 w-full z-10">
            <div className="flex justify-between items-center text-[10px] text-orange-100 font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={totalPctOfIncome > dynamicThresholds.totali ? 'text-red-300 font-bold' : 'text-orange-100 font-bold'}>
                {formatPercent(totalPctOfIncome)}
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

        {/* Spese Primarie + Secondarie: side by side on mobile, own grid columns on desktop */}
        <div className="grid grid-cols-2 gap-3 md:contents">
        {/* Spese primarie - White Card */}
        <div
          onClick={() => setActiveChartFilter('primarie')}
          className={`cursor-pointer p-4 sm:p-6 rounded-3xl border text-left relative overflow-hidden flex flex-col justify-between min-h-[11rem] md:min-h-[15.5rem] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
            activeChartFilter === 'primarie'
              ? 'bg-orange-50 border-orange-700 ring-4 ring-orange-700/15'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`absolute right-4 top-4 w-12 h-12 rounded-xl flex items-center justify-center transition-colors border ${
            activeChartFilter === 'primarie'
              ? 'bg-orange-700 border-orange-700 text-white'
              : 'bg-orange-50 border-orange-100 text-orange-700'
          }`}>
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="z-10 text-left pr-14 md:pr-0">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              <span className="md:hidden">Spese Prim.</span>
              <span className="hidden md:inline">Spese Primarie</span>
            </span>
            <span className="hidden md:block text-[10px] text-slate-400 font-normal mt-0.5 lowercase">
              (essenziali)
            </span>
            <div className="mt-3 text-left">
              <div className="flex items-center flex-wrap gap-2.5">
                <h3 className="text-3xl font-extrabold font-display leading-none text-slate-800">
                  <EuroAmount value={selectedRecord.spesePrimarie} />
                </h3>
                {prevRecord?.spesePrimarie && (
                  <div className="flex flex-col items-start leading-none mt-1">
                    {renderDeltaBadge(selectedRecord.spesePrimarie, prevRecord?.spesePrimarie, false)}
                    <span className="text-[10px] text-slate-400 mt-1">rispetto al mese prec.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar compared to Entrate */}
          <div className="mt-4 pt-3 border-t border-slate-100 w-full z-10">
            <div className="hidden md:flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={primaryPctOfIncome > dynamicThresholds.primarie ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                {formatPercent(primaryPctOfIncome)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-500 to-orange-700`}
                  style={{ width: `${Math.min((primaryPctOfIncome / (dynamicThresholds.primarie + 5)) * 100, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300" style={{ left: `${(dynamicThresholds.primarie / (dynamicThresholds.primarie + 5)) * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1">
              <span>Soglia: {dynamicThresholds.primarie}% delle entrate</span>
              <span className={`hidden md:inline ${primaryPctOfIncome > dynamicThresholds.primarie ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}`}>
                {primaryPctOfIncome > dynamicThresholds.primarie ? 'Soglia superata' : 'Nei limiti'}
              </span>
              <span className={`md:hidden ${primaryPctOfIncome > dynamicThresholds.primarie ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}`}>
                {primaryPctOfIncome > dynamicThresholds.primarie ? 'Non OK' : 'OK'}
              </span>
            </div>
          </div>
        </div>

        {/* Spese Secondarie - White Card */}
        <div
          onClick={() => setActiveChartFilter('secondarie')}
          className={`cursor-pointer p-4 sm:p-6 rounded-3xl border text-left relative overflow-hidden flex flex-col justify-between min-h-[11rem] md:min-h-[15.5rem] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
            activeChartFilter === 'secondarie'
              ? 'bg-orange-50 border-orange-400 ring-4 ring-orange-400/15'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`absolute right-4 top-4 w-12 h-12 rounded-xl flex items-center justify-center transition-colors border ${
            activeChartFilter === 'secondarie'
              ? 'bg-orange-400 border-orange-400 text-white'
              : 'bg-orange-50 border-orange-100 text-orange-400'
          }`}>
            <XCircle className="w-6 h-6" />
          </div>
          <div className="z-10 text-left pr-14 md:pr-0">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              <span className="md:hidden">Spese Sec.</span>
              <span className="hidden md:inline">Spese Secondarie</span>
            </span>
            <span className="hidden md:block text-[10px] text-slate-400 font-normal mt-0.5 lowercase">
              (discrezionali)
            </span>
            <div className="mt-3 text-left">
              <div className="flex items-center flex-wrap gap-2.5">
                <h3 className="text-3xl font-extrabold font-display leading-none text-slate-800">
                  <EuroAmount value={selectedRecord.speseSecondarie} />
                </h3>
                {prevRecord?.speseSecondarie && (
                  <div className="flex flex-col items-start leading-none mt-1">
                    {renderDeltaBadge(selectedRecord.speseSecondarie, prevRecord?.speseSecondarie, false)}
                    <span className="text-[10px] text-slate-400 mt-1">rispetto al mese prec.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar compared to Entrate */}
          <div className="mt-4 pt-3 border-t border-slate-100 w-full z-10">
            <div className="hidden md:flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                {formatPercent(secondaryPctOfIncome)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-300 to-orange-400`}
                  style={{ width: `${Math.min((secondaryPctOfIncome / (dynamicThresholds.secondarie + 5)) * 100, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300" style={{ left: `${(dynamicThresholds.secondarie / (dynamicThresholds.secondarie + 5)) * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1">
              <span>Soglia: {dynamicThresholds.secondarie}% delle entrate</span>
              <span className={`hidden md:inline ${secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}`}>
                {secondaryPctOfIncome > dynamicThresholds.secondarie ? 'Soglia superata' : 'Nei limiti'}
              </span>
              <span className={`md:hidden ${secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}`}>
                {secondaryPctOfIncome > dynamicThresholds.secondarie ? 'Non OK' : 'OK'}
              </span>
            </div>
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
              className="bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition hover:bg-orange-800 cursor-pointer text-center"
            >
              Vedi Transazioni
            </button>
          </div>
        </div>
        <div className="h-72 mt-6 pointer-events-none md:pointer-events-auto">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rolling12MonthsData}
              margin={{ top: 15, right: 15, left: isMobile ? 0 : 10, bottom: 0 }}
              onClick={handleChartClick}
            >
              <defs>
                <linearGradient id="colorUscitePrimarie" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c2410c" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#c2410c" stopOpacity={0.01}/>
                </linearGradient>
                <linearGradient id="colorUsciteSecondarie" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="mese"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={isMobile ? 2 : 0}
                tickFormatter={(val) => {
                  const match = rolling12MonthsData.find(d => d.mese === val);
                  return match ? `${val} '${String(match.anno).slice(2)}` : val;
                }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 44 : 60}
                tickFormatter={(val) => isMobile
                  ? formatAxisCompact(val, yAxisMaxAbs)
                  : `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`}
              />
              <Tooltip content={renderAreaTooltip} />
              <Legend verticalAlign="top" height={36} content={renderAreaLegend} />
              {(activeChartFilter === 'all' || activeChartFilter === 'primarie') && (
                <Area
                  type="monotone"
                  dataKey="spesePrimarie"
                  name="Spese Primarie"
                  stroke="#c2410c"
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
                        fill={isSelected ? '#c2410c' : '#fff'}
                        stroke="#c2410c"
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
                  stroke="#fb923c"
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
                        fill={isSelected ? '#fb923c' : '#fff'}
                        stroke="#fb923c"
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
            <Grid className="w-5 h-5 text-orange-600" />
            Spese per Macro Categoria
          </h3>
          <p className="text-xs text-slate-400 mt-1">Sottodivisione in base alle voci principali in euro</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            <div className="h-44 w-44 shrink-0 pointer-events-none md:pointer-events-auto">
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
                    {/* Ogni fetta è cliccabile: clic su una fetta già selezionata la
                        deseleziona (torna a 'Tutte'), altrimenti la seleziona e
                        le altre fette si "spengono" (opacity 0.35) per evidenziarla.
                        Il cambio di selectedMacroCat fa scattare l'useEffect sopra
                        che scrolla e mette in evidenza il pannello Micro Categoria. */}
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
                  <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderPieTooltip} />
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
                        ? 'bg-indigo-50/70 dark:bg-indigo-400/10 border border-indigo-200/50 dark:border-indigo-400/20 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
                      <span className={`text-slate-600 dark:text-slate-300 truncate ${isSelected ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'font-semibold'}`}>{name}</span>
                    </div>
                    <span className={`font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'}`}>{formatEuro(m.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Expenditure per Micro Category */}
        <div
          ref={microPanelRef}
          className={`bg-white p-6 rounded-3xl border shadow-sm text-left transition-all duration-300 hover:shadow-md ${
            microFocused ? 'border-orange-400 ring-4 ring-orange-400/30' : 'border-slate-200'
          }`}
        >
          <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-600" />
            Spese per Micro Categoria
          </h3>
          <p className="text-xs text-slate-400 mt-1">Sottodivisione in base alle categorie delle transazioni del mese</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            <div className="h-44 w-44 shrink-0 pointer-events-none md:pointer-events-auto">
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
                  <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderPieTooltip} />
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
                        ? 'bg-indigo-50/70 dark:bg-indigo-400/10 border border-indigo-200/50 dark:border-indigo-400/20 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[(idx + 3) % SECTOR_COLORS.length] }} />
                      <span className={`text-slate-600 dark:text-slate-300 truncate ${isSelected ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'font-semibold'}`}>{name}</span>
                    </div>
                    <span className={`font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'}`}>{formatEuro(a.value)}</span>
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
          <DropdownMenu
            icon={Grid}
            accent="orange"
            widthClass="w-56"
            label="Macro"
            value={selectedMacroCat}
            displayValue={selectedMacroCat}
            options={macroCategoriesList}
            onSelect={(m) => {
              setSelectedMacroCat(m);
              setSelectedMicroCat('Tutte');
            }}
            getOptionLabel={(m) => (m === 'Tutte' ? 'Macro Categorie (Tutte)' : m)}
          />

          {/* payment account selector */}
          <DropdownMenu
            icon={CreditCard}
            accent="orange"
            widthClass="w-56"
            label="Conto"
            value={selectedConto}
            displayValue={selectedConto}
            options={accountsList}
            onSelect={setSelectedConto}
            getOptionLabel={(a) => (a === 'Tutti' ? 'Conto Utilizzato (Tutti)' : a)}
          />

          {/* primary / secondary checklist switcher */}
          <DropdownMenu
            icon={Filter}
            accent="orange"
            widthClass="w-56"
            label="Tipologia"
            value={selectedType}
            displayValue={
              selectedType === 'Primarie'
                ? 'Primarie (35%)'
                : selectedType === 'Secondarie'
                ? 'Secondarie (15%)'
                : 'Tutte'
            }
            options={['Tutte', 'Primarie', 'Secondarie']}
            onSelect={setSelectedType}
            getOptionLabel={(v) =>
              v === 'Tutte'
                ? 'Tipologia Spesa (Tutte)'
                : v === 'Primarie'
                ? 'Solo Spese Primarie (Target 35%)'
                : 'Solo Spese Secondarie (Target 15%)'
            }
          />

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
        {finalFilteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Nessuna transazione soddisfa i filtri selezionati.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrizione</th>
                  <th className="py-3 px-4">Macro</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Importo</th>
                  <th className="py-3 px-4">Conto utilizzato</th>
                  <th className="py-3 px-4 text-center">Primaria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {finalFilteredTransactions.map((tx, idx) => (
                  <tr key={tx.id || `tx-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-normal font-mono">
                      {tx.data}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{tx.icon || '🍕'}</span>
                        <span className="font-semibold text-slate-800 truncate max-w-xs">{tx.descrizione}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 border border-slate-200/50 text-[10px] text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        {tx.macroCategoria}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-normal">
                      {tx.categoria}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-800 font-mono">
                      {formatEuro(tx.importo)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-mono">
                        {tx.conto}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {tx.primaria ? (
                        <span className="inline-flex items-center bg-orange-700 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm">
                          Sì (35%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-orange-100 text-orange-700 text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm">
                          No (15%)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
