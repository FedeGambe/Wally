// ============================================================================
// Pagina "Panoramica": è la dashboard riassuntiva mostrata come prima
// schermata, con la fotografia del patrimonio e l'andamento mensile di
// entrate/uscite/risparmio/investimenti per il mese/anno selezionati.
//
// Dati: tutti i calcoli (totali di patrimonio, percentuali sul mese, delta
// vs mese precedente, serie storica per il grafico) vengono dall'hook
// usePanoramicaData (src/hooks/usePanoramicaData.ts). Qui c'è solo il layout.
//
// Sotto-sezioni della pagina:
//  1. Quattro card di patrimonio (Disponibile / Investito / Accantonato / Totale)
//  2. Strip KPI del mese corrente (Risparmio, Investito, Spese Primarie/Secondarie)
//     con indicatori "sopra/sotto soglia" rispetto ai target dinamici
//  3. Riga con delta % vs mese precedente per Entrate/Uscite/Primarie/Secondarie
//  4. Grafico ad area con il trend mensile di Risparmio Netto e Quota Investita
//  5. Widget riepilogo "Disponibilità Netta" del mese corrente
//  6. Tabella storica mensile (Bilancio Storico) con colori in base alle soglie
//  7. Drawer laterale con il dettaglio movimenti quando si apre un mese
// ============================================================================
import React, { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  TrendingUp,
  Coins,
  PiggyBank,
  ChevronRight,
  BarChart3,
  Calendar,
  Plus
} from 'lucide-react';
import AggiungiDatoModal from '../components/AggiungiDatoModal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import Drawer from '../components/Drawer';
import FinanceKpiCard from '../components/FinanceKpiCard';
import DataTable from '../components/DataTable';
import EuroAmount from '../components/EuroAmount';
import { formatEuro, formatPercent } from '../utils/format';
import { kpiColor, thresholdRange } from '../utils/kpiColorScale';
import { usePanoramicaData } from '../hooks/usePanoramicaData';

interface PanoramicaProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  setActiveView?: (view: string) => void;
}

export default function Panoramica({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  setActiveView
}: PanoramicaProps) {
  const isMobile = useIsMobile();
  const {
    localSelectedMonth,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerSubtitle, drawerTransactions, drawerStats,
    filteredRisparmio,
    chartData,
    cumulativeChartData,
    dynamicThresholds,
    currentMonthData, prevMonthData,
    patrimonioTotale, capitaleDisponibile, capitaleInvestito, capitaleImpegnato,
    handleChartClick, handleOpenMonthDetail,
    entrateDelta, speseDelta, spesePrimDelta, speseSecDelta,
    primPerc, secPerc, invPerc, rispPerc, spendibileResiduo
  } = usePanoramicaData(selectedYear, setSelectedYear, selectedMonth, setSelectedMonth);

  // Vista del grafico "Trend Risparmio": mensile (aree separate, come sempre)
  // o cumulato (le stesse due aree impilate una sopra l'altra con stackId).
  const [trendChartMode, setTrendChartMode] = useState<'mensile' | 'cumulato'>('mensile');

  // Tooltip custom del grafico Trend Risparmio: nome della variabile in grassetto
  // col colore della linea, cifra in bianco (invece del default senza nome).
  const renderTrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div style={{ background: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px', padding: '10px 14px' }}>
        <div className="font-bold" style={{ marginBottom: 6 }}>{label}</div>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4" style={{ marginTop: idx > 0 ? 4 : 0 }}>
            <span className="font-bold" style={{ color: p.color }}>{p.name}</span>
            <span className="text-white font-mono">{formatEuro(Number(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };

  // Widget "Risparmio & Investito": somma i due sotto-widget, quota % sulle
  // entrate e soglia combinata (somma delle due soglie dinamiche).
  const rispInvTotale = (currentMonthData.risparmioNetto || 0) + (currentMonthData.investito || 0);
  const rispInvPerc = currentMonthData.entrate > 0 ? (rispInvTotale / currentMonthData.entrate) * 100 : undefined;
  const rispInvSoglia = dynamicThresholds.risparmio + dynamicThresholds.investiti;

  // Widget "Spese": somma Primarie + Secondarie, quota % e soglia combinata.
  const speseTotaleWidget = (currentMonthData.spesePrimarie || 0) + (currentMonthData.speseSecondarie || 0);
  const spesePerc = currentMonthData.entrate > 0 ? (speseTotaleWidget / currentMonthData.entrate) * 100 : undefined;
  const speseSoglia = dynamicThresholds.primarie + dynamicThresholds.secondarie;

  // Scostamento dalla soglia dei 4 mini-widget Risparmio/Investito/Spese Primarie/Secondarie,
  // sia in euro (accanto all'importo) che in punti percentuali (nel badge Sotto/Fuori Soglia,
  // che prima ripeteva la stessa quota già mostrata sopra invece di dire "di quanto").
  // Positivo = soglia rispettata (margine), negativo = soglia sforata. Per risparmio/investito
  // "di più è meglio" (quota - target); per le spese vale il contrario (target - quota).
  const entrateMese = currentMonthData.entrate;
  const rispDeltaEuro = (currentMonthData.risparmioNetto !== undefined && entrateMese)
    ? currentMonthData.risparmioNetto - (entrateMese * dynamicThresholds.risparmio / 100) : undefined;
  const invDeltaEuro = (currentMonthData.investito !== undefined && entrateMese)
    ? currentMonthData.investito - (entrateMese * dynamicThresholds.investiti / 100) : undefined;
  const primDeltaEuro = (currentMonthData.spesePrimarie !== undefined && entrateMese)
    ? (entrateMese * dynamicThresholds.primarie / 100) - currentMonthData.spesePrimarie : undefined;
  const secDeltaEuro = (currentMonthData.speseSecondarie !== undefined && entrateMese)
    ? (entrateMese * dynamicThresholds.secondarie / 100) - currentMonthData.speseSecondarie : undefined;
  const rispPercDelta = rispPerc !== undefined ? rispPerc - dynamicThresholds.risparmio : undefined;
  const invPercDelta = invPerc !== undefined ? invPerc - dynamicThresholds.investiti : undefined;
  const primPercDelta = primPerc !== undefined ? dynamicThresholds.primarie - primPerc : undefined;
  const secPercDelta = secPerc !== undefined ? dynamicThresholds.secondarie - secPerc : undefined;

  // Widget "Rendiconto Mese Corrente": renderizzato due volte, una sola volta
  // visibile a seconda del breakpoint (vedi sotto), per spostarlo subito dopo i 4
  // widget patrimonio su mobile (dove sostituisce anche il box "Mese Corrente",
  // che viene nascosto: il suo contenuto è già tutto qui + nel popup di dettaglio).
  // Su mobile l'intero widget è cliccabile e apre il drawer di dettaglio mensile
  // (stesso identico contenuto della sezione "Mese Corrente in Evidenza" rimossa,
  // più delta e torta di ripartizione), quindi qui non serve più tagliare nulla.
  const rendicontoWidget = (
    <div
      onClick={isMobile ? () => handleOpenMonthDetail(currentMonthData.mese, currentMonthData.anno) : undefined}
      className={`bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md ${isMobile ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div>
        <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Rendiconto Mese Corrente</span>
        <h3 className="text-2.5xl font-black font-display mt-2 text-white leading-none">Disponibilità Netta</h3>
        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          <span className="hidden md:inline">Sintesi dei flussi di questo mese ricavati direttamente dal foglio Risparmio.</span>
          <span className="md:hidden">Tocca per il dettaglio completo del mese.</span>
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
          <span className="text-base font-black font-display text-emerald-400"><EuroAmount value={currentMonthData.risparmioNetto} /></span>
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
  );

  const [showAddDataModal, setShowAddDataModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddDataModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Aggiungi Dato
        </button>
      </div>

      {/* Top row Wealth widget */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Wealth card 1 - Capitale Disponibile (Indigo) */}
        <FinanceKpiCard
          type="disponibile"
          title="Capitale Disponibile"
          value={capitaleDisponibile}
          icon={PiggyBank}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Liquidità pronta all'uso ({formatPercent((capitaleDisponibile / patrimonioTotale) * 100)})</span>
            </>
          }
        />

        {/* Wealth card 2 - Capitale Investito (Emerald) */}
        <FinanceKpiCard
          type="investito"
          title="Capitale Investito"
          value={capitaleInvestito}
          icon={TrendingUp}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Strumenti finanziari attivi ({formatPercent((capitaleInvestito / patrimonioTotale) * 100)})</span>
            </>
          }
        />

        {/* Wealth card 3 - Capitale Accantonato (Amber) */}
        <FinanceKpiCard
          type="impegnato"
          title="Capitale Accantonato"
          value={capitaleImpegnato}
          icon={Coins}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Fondi vincolati o prenotati ({formatPercent((capitaleImpegnato / patrimonioTotale) * 100)})</span>
            </>
          }
        />

        {/* Wealth card 4 - Capitale Totale (Slate-900) */}
        <FinanceKpiCard
          type="totale"
          title="Capitale Totale"
          value={capitaleDisponibile + capitaleInvestito}
          icon={BarChart3}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span>Incluso Accantonato: <strong className="text-xs sm:text-[13px] font-black font-mono text-slate-800 dark:text-slate-100 tracking-tight ml-1">{formatEuro(capitaleDisponibile + capitaleInvestito + capitaleImpegnato)}</strong></span>
            </>
          }
        />
      </div>

      {/* Rendiconto Mese Corrente: solo mobile, subito dopo i 4 widget patrimonio
          (su desktop resta nella sua posizione originale, vedi sotto) */}
      <div className="md:hidden">
        {rendicontoWidget}
      </div>

      {/* Main KPI Month Strip & Indicators: nascosto su mobile, il suo contenuto
          è già coperto dal widget "Rendiconto Mese Corrente" sopra e dal suo
          popup di dettaglio (tap sul widget -> drawer con lo stesso mese) */}
      <div className="hidden md:block bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left">
        <h3 className="text-base font-bold text-slate-800 font-display mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="hidden md:inline">Mese Corrente in Evidenza:</span>
          <span className="md:hidden">Mese Corrente:</span>
          <span className="text-blue-600 font-extrabold capitalize">
            {currentMonthData.mese} <span className="hidden md:inline">{currentMonthData.anno}</span><span className="md:hidden">{String(currentMonthData.anno).slice(2)}</span>
          </span>
        </h3>

        {/* Spendibile residuo: colonna "Spendibile" del foglio Risparmio meno
            le spese secondarie già sostenute nel mese, cioè quanto resta
            ancora da spendere ora. */}
        <div className="mb-5 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Ancora Spendibile questo Mese</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 block">Spendibile − Spese Secondarie</span>
          </div>
          <span className={`text-2xl font-black font-display shrink-0 ${spendibileResiduo !== undefined && spendibileResiduo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
            {formatEuro(spendibileResiduo)} <span className="text-sm text-slate-400 dark:text-slate-500 font-bold">/ {formatEuro(currentMonthData.spendibile)}</span>
          </span>
        </div>

        {/* Nota sul verso dei confronti con la soglia: per Risparmio e
            Investito "di più è meglio" quindi il confronto è >= (raggiunto
            o superato il target = verde). Per le Spese (Primarie/Secondarie)
            vale il contrario: "di meno è meglio", quindi il confronto è <=
            (sotto la soglia = verde, sopra = allerta rossa). */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          {/* Widget Risparmio & Investito */}
          <div className="p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-300 font-bold">Risparmio & Investito</span>
              <div className="text-right">
                <span className="font-extrabold font-display text-slate-800 block">{formatEuro(rispInvTotale)}</span>
                <span className={`text-[10px] font-bold ${rispInvPerc !== undefined && rispInvPerc >= rispInvSoglia ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatPercent(rispInvPerc)} / Soglia {rispInvSoglia}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              {/* Risparmio */}
              <div
                onClick={() => setActiveView?.('patrimonio')}
                className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risparmio</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold font-display text-slate-800 block">
                      <EuroAmount value={currentMonthData.risparmioNetto} />
                    </span>
                    {rispDeltaEuro !== undefined && (
                      <span className={`text-xs font-bold ${rispDeltaEuro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {rispDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(rispDeltaEuro))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(rispPerc)}</strong></span>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${rispPercDelta !== undefined && rispPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                    {rispPercDelta !== undefined && rispPercDelta >= 0 ? `Sopra Soglia ✓ ${formatPercent(rispPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(rispPercDelta, { signed: true })}`}
                  </span>
                </div>
              </div>

              {/* Investito */}
              <div
                onClick={() => setActiveView?.('investimenti')}
                className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Investito</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold font-display text-slate-800 block">
                      <EuroAmount value={currentMonthData.investito} />
                    </span>
                    {invDeltaEuro !== undefined && (
                      <span className={`text-xs font-bold ${invDeltaEuro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {invDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(invDeltaEuro))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(invPerc)}</strong></span>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${invPercDelta !== undefined && invPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                    {invPercDelta !== undefined && invPercDelta >= 0 ? `Sopra Soglia ✓ ${formatPercent(invPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(invPercDelta, { signed: true })}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Widget Spese */}
          <div className="p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-300 font-bold">Spese</span>
              <div className="text-right">
                <span className="font-extrabold font-display text-slate-800 block">{formatEuro(speseTotaleWidget)}</span>
                <span className={`text-[10px] font-bold ${spesePerc !== undefined && spesePerc <= speseSoglia ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatPercent(spesePerc)} / Soglia {speseSoglia}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              {/* Spese Primarie */}
              <div
                onClick={() => setActiveView?.('uscite')}
                className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spese Primarie</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold font-display text-slate-800 block">
                      <EuroAmount value={currentMonthData.spesePrimarie} />
                    </span>
                    {primDeltaEuro !== undefined && (
                      <span className={`text-xs font-bold ${primDeltaEuro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {primDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(primDeltaEuro))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(primPerc)}</strong></span>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${primPercDelta !== undefined && primPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                    {primPercDelta !== undefined && primPercDelta >= 0 ? `Sotto Soglia ✓ ${formatPercent(primPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(primPercDelta, { signed: true })}`}
                  </span>
                </div>
              </div>

              {/* Spese Secondarie */}
              <div
                onClick={() => setActiveView?.('uscite')}
                className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spese Secondarie</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold font-display text-slate-800 block">
                      <EuroAmount value={currentMonthData.speseSecondarie} />
                    </span>
                    {secDeltaEuro !== undefined && (
                      <span className={`text-xs font-bold ${secDeltaEuro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {secDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(secDeltaEuro))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(secPerc)}</strong></span>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${secPercDelta !== undefined && secPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                    {secPercDelta !== undefined && secPercDelta >= 0 ? `Sotto Soglia ✓ ${formatPercent(secPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(secPercDelta, { signed: true })}`}
                  </span>
                </div>
              </div>
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
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${entrateDelta !== undefined && entrateDelta >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {entrateDelta !== undefined && entrateDelta >= 0 ? '+' : ''}{formatPercent(entrateDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Uscite Totali:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseDelta !== undefined && speseDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {speseDelta !== undefined && speseDelta >= 0 ? '+' : ''}{formatPercent(speseDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Spese Primarie:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${spesePrimDelta !== undefined && spesePrimDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {spesePrimDelta !== undefined && spesePrimDelta >= 0 ? '+' : ''}{formatPercent(spesePrimDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Spese Secondarie:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseSecDelta !== undefined && speseSecDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {speseSecDelta !== undefined && speseSecDelta >= 0 ? '+' : ''}{formatPercent(speseSecDelta)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Chart & General Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Trend monthly Line Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left lg:col-span-2 transition-all duration-300 hover:shadow-md flex flex-col">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="md:hidden">Trend Risparmio</span>
                <span className="hidden md:inline">Trend Risparmio: investimenti e risparmi</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Confronto tra flussi di risparmio e quota investimenti</p>
            </div>

            {/* Toggle Mensile/Cumulato + legenda sotto: colore della pagina Panoramica (blue-600) */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 border border-slate-200 select-none">
                <button
                  onClick={() => setTrendChartMode('mensile')}
                  className={`text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                    trendChartMode === 'mensile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  Mensile
                </button>
                <button
                  onClick={() => setTrendChartMode('cumulato')}
                  className={`text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                    trendChartMode === 'cumulato' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  Cumulato
                </button>
              </div>

              {/* Legenda: colori allineati esattamente allo stroke delle due Area sotto */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <span className="w-3 h-1.5 bg-fuchsia-500 rounded-full" /> Risparmio
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <span className="w-3 h-1.5 bg-sky-500 rounded-full" /> Investito
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 pointer-events-none md:pointer-events-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendChartMode === 'cumulato' ? cumulativeChartData : chartData}
                margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                onClick={handleChartClick}
              >
                <defs>
                  <linearGradient id="colorRisparmio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvestito" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  {/* Gradienti più pieni per la vista Cumulato: le due aree impilate
                      con lo stesso riempimento tenue di prima si distinguevano poco. */}
                  <linearGradient id="colorRisparmioCumulato" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="colorInvestitoCumulato" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.25} />
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
                  width={isMobile ? 44 : 60}
                  tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`}
                />
                <Tooltip content={renderTrendTooltip} />
                <Area
                  type="monotone"
                  name={trendChartMode === 'cumulato' ? 'Risparmio Cumulato' : 'Risparmio Netto'}
                  dataKey={trendChartMode === 'cumulato' ? 'risparmioCumulato' : 'risparmioNetto'}
                  stroke="#d946ef"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={trendChartMode === 'cumulato' ? 'url(#colorRisparmioCumulato)' : 'url(#colorRisparmio)'}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-risparmio'}
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
                  activeDot={{ r: 6, onClick: (e, payload: any) => handleOpenMonthDetail(payload.payload.mese, payload.payload.anno) }}
                />
                <Area
                  type="monotone"
                  name={trendChartMode === 'cumulato' ? 'Investito Cumulato' : 'Quota Investita'}
                  dataKey={trendChartMode === 'cumulato' ? 'investitoCumulato' : 'investito'}
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={trendChartMode === 'cumulato' ? 'url(#colorInvestitoCumulato)' : 'url(#colorInvestito)'}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-investito'}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 3}
                        fill={isSelected ? '#0ea5e9' : '#fff'}
                        stroke="#0ea5e9"
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

        {/* Status Summary Widget: solo desktop qui, su mobile è duplicato subito dopo i 4 widget patrimonio in alto */}
        <div className="hidden md:block">
          {rendicontoWidget}
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

        {/* Colonne Spese/Investito/Risparmio Netto: il colore del testo non è
            fisso ma calcolato da kpiColor() in base a quanto la percentuale
            sul totale entrate (r.xxx / r.entrate * 100) si avvicina o supera
            la soglia target dinamica (dynamicThresholds.*), con una fascia di
            tolleranza di 10 punti (vedi src/utils/kpiColorScale.ts). L'ultimo
            parametro `false` di thresholdRange inverte la scala per le spese
            (dove superare la soglia è un male, non un bene). */}
        <DataTable
          data={[...filteredRisparmio].reverse()}
          keyExtractor={(r) => `${r.mese}-${r.anno}`}
          columns={[
            {
              header: 'Mese / Anno',
              className: 'w-40',
              render: (r) => (
                <span className="font-semibold text-slate-800 capitalize whitespace-nowrap">
                  <span className="hidden md:inline">{r.mese} {r.anno}</span>
                  <span className="md:hidden">{r.mese?.slice(0, 3)} '{String(r.anno).slice(2)}</span>
                </span>
              )
            },
            {
              header: 'Entrate',
              align: 'right',
              render: (r) => <span className="text-slate-600 font-medium font-mono">{formatEuro(r.entrate)}</span>
            },
            {
              header: 'Spese Primarie',
              align: 'right',
              render: (r) => (
                <span className="font-medium font-mono" style={{ color: kpiColor(r.entrate ? (r.spesePrimarie / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.primarie, 10, false)) }}>
                  {formatEuro(r.spesePrimarie)}
                </span>
              )
            },
            {
              header: 'Spese Secondarie',
              align: 'right',
              render: (r) => (
                <span className="font-medium font-mono" style={{ color: kpiColor(r.entrate ? (r.speseSecondarie / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.secondarie, 10, false)) }}>
                  {formatEuro(r.speseSecondarie)}
                </span>
              )
            },
            {
              header: 'Investito',
              align: 'right',
              render: (r) => (
                <span className="font-semibold font-mono" style={{ color: kpiColor(r.entrate ? (r.investito / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.investiti, 10)) }}>
                  {formatEuro(r.investito)}
                </span>
              )
            },
            {
              header: 'Risparmio Netto',
              align: 'right',
              render: (r) => (
                <span className="font-extrabold font-mono" style={{ color: kpiColor(r.entrate ? (r.risparmioNetto / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.risparmio, 10)) }}>
                  {formatEuro(r.risparmioNetto)}
                </span>
              )
            },
            {
              header: 'Quota Invest.+Risp. %',
              align: 'right',
              render: (r) => {
                const quota = r.entrate ? ((r.investito + r.risparmioNetto) / r.entrate) * 100 : 0;
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${quota >= 35
                    ? "bg-emerald-100 text-emerald-800"
                    : quota >= 10
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                    }`}>
                    {formatPercent(quota)}
                  </span>
                );
              }
            },
            {
              header: 'Dettagli',
              align: 'right',
              render: (r) => (
                <button
                  onClick={() => handleOpenMonthDetail(r.mese, r.anno)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl border border-blue-200 hover:border-transparent transition-all duration-150 cursor-pointer"
                >
                  Analizza
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              )
            }
          ]}
        />
      </div>

      {/* Drawer detailed details */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        transactions={drawerTransactions}
        stats={drawerStats}
        dynamicThresholds={dynamicThresholds}
      />

      <AggiungiDatoModal isOpen={showAddDataModal} onClose={() => setShowAddDataModal(false)} />
    </div>
  );
}
