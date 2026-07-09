import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, BarChart3, Euro, Percent, Wallet, Award, ChevronUp, Database, ChevronDown, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { rendColor, rendColorAlpha } from '../utils/format';
import { parseMeseStringToMonthYear } from '../hooks/useInvestimentiData';

interface RendimentiProps {
  localRendimenti: any[];
  activeRendimenti: any[];
  CRUSCOTTO_GENERALE: any;
  CRUSCOTTO_ANNO: any;
  calculatedRendimentoAnnuo: number | undefined;
  globalSelectedYear: string;
  lastValidRendimento: any;
  cruscottoRows: any[];
  formatEuro: (val: any) => string;
  formatPercent: (val: any) => string;
}

type TimeRange = 'storico' | '12mesi';
type ValueMode = 'euro' | 'percent';

export default function Rendimenti({
  localRendimenti,
  activeRendimenti,
  CRUSCOTTO_GENERALE,
  CRUSCOTTO_ANNO,
  calculatedRendimentoAnnuo,
  globalSelectedYear,
  lastValidRendimento,
  cruscottoRows,
  formatEuro,
  formatPercent,
}: RendimentiProps) {
  const [crescitaRange, setCrescitaRange] = useState<TimeRange>('storico');
  const [mensileRange, setMensileRange] = useState<TimeRange>('12mesi');
  const [valueMode, setValueMode] = useState<ValueMode>('euro');
  const [tableYear, setTableYear] = useState(globalSelectedYear);
  const [isTableYearDropdownOpen, setIsTableYearDropdownOpen] = useState(false);

  useEffect(() => setTableYear(globalSelectedYear), [globalSelectedYear]);

  const crescitaData = useMemo(
    () => (crescitaRange === 'storico' ? activeRendimenti : activeRendimenti.slice(-12)),
    [crescitaRange, activeRendimenti]
  );
  const mensileData = useMemo(
    () => (mensileRange === 'storico' ? activeRendimenti : activeRendimenti.slice(-12)),
    [mensileRange, activeRendimenti]
  );

  const crescitaKey = valueMode === 'euro' ? 'rendimentoCumulativoEuro' : 'rendimentoCumulativoPerc';
  const crescitaSecondaryKey = valueMode === 'euro' ? 'rendimentoCumulativoPerc' : 'rendimentoCumulativoEuro';
  const mensileKey = valueMode === 'euro' ? 'rendimentoMensileEuro' : 'rendimentoMensilePerc';
  const axisFormatter = (val: any) => (valueMode === 'euro' ? `€${Number(val).toLocaleString('it-IT')}` : `${Number(val).toLocaleString('it-IT')}%`);
  const tooltipFormatter = (value: any) => (valueMode === 'euro' ? formatEuro(value) : formatPercent(value));
  const crescitaTooltipFormatter = (value: any, name: any) => {
    const isPercentSeries = name === 'Cumulato %';
    return [isPercentSeries ? formatPercent(value) : formatEuro(value), name];
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    localRendimenti.forEach((r: any) => {
      const p = parseMeseStringToMonthYear(r.mese);
      if (p) years.add(p.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [localRendimenti]);

  const previousYearRow = useMemo(
    () => cruscottoRows.find((r: any) => Number(r.anno) === Number(globalSelectedYear) - 1),
    [cruscottoRows, globalSelectedYear]
  );
  const annualUp = !previousYearRow || Number(CRUSCOTTO_ANNO.rendimentoAnnualeEuro || 0) >= Number(previousYearRow.rendimentoAnnualeEuro || 0);

  const previousMonthRecord = useMemo(() => {
    if (!lastValidRendimento) return null;
    const idx = localRendimenti.findIndex((r: any) => r.mese === lastValidRendimento.mese);
    return idx > 0 ? localRendimenti[idx - 1] : null;
  }, [localRendimenti, lastValidRendimento]);
  const monthlyUp = !previousMonthRecord || Number(lastValidRendimento?.rendimentoMensileEuro || 0) >= Number(previousMonthRecord.rendimentoMensileEuro || 0);
  const annualDelta = Number(CRUSCOTTO_ANNO.rendimentoAnnualeEuro || 0) - Number(previousYearRow?.rendimentoAnnualeEuro || 0);
  const monthlyDelta = Number(lastValidRendimento?.rendimentoMensileEuro || 0) - Number(previousMonthRecord?.rendimentoMensileEuro || 0);

  const tableRows = useMemo(() => {
    return localRendimenti
      .filter((r: any) => {
        const p = parseMeseStringToMonthYear(r.mese);
        return p ? String(p.year) === String(tableYear) : false;
      })
      .sort((a: any, b: any) => {
        const pA = parseMeseStringToMonthYear(a.mese);
        const pB = parseMeseStringToMonthYear(b.mese);
        if (pA && pB) return pB.month - pA.month;
        return 0;
      });
  }, [localRendimenti, tableYear]);

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Riepilogo Rendimenti: dati storici (sempre aggiornati) + performance anno/mese corrente (dinamici) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRUPPO 1: DATI CUMULATI STORICI (copiato identico dal Cruscotto) */}
        <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs flex flex-col gap-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-400 dark:text-slate-300" />
              Dati Cumulati Storici
            </span>
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
              Sempre Aggiornato
            </span>
          </div>
          <div className="grid grid-cols-2 auto-rows-fr gap-2 sm:gap-4 flex-1">
            {/* Portafoglio Attuale Box */}
            <div className="bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 text-white p-3 sm:p-5 rounded-2xl border border-sky-950 dark:border-sky-900 shadow-md flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-sky-300 font-extrabold uppercase tracking-wider block">Portafoglio Attuale</span>
                <div className="bg-sky-950/50 p-1 rounded-lg">
                  <Wallet className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-black font-display text-white block">
                  {formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + CRUSCOTTO_GENERALE.monetariInvestitoCum + CRUSCOTTO_GENERALE.rendimentoCumulativoEuro)}
                </span>
              </div>
              <div className="border-t border-sky-800/60 pt-2 mt-2">
                <p className="text-[10px] text-sky-300 font-medium">Investito:   <span className="text-[12px] font-bold text-white">{formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0))}</span></p>
              </div>
            </div>

            {/* Plusvalenza Cumulata Box */}
            <div className={`p-3 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:shadow-md ${CRUSCOTTO_GENERALE.rendimentoCumulativoEuro >= 0
              ? 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-500/30 dark:border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]'
              : 'bg-white dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/60 shadow-xs'
              }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Plusvalenza Cumulata</span>
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-1 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-extrabold font-display text-emerald-600 dark:text-emerald-400 block flex items-center gap-0.5">
                  <ChevronUp className="w-5 h-5 shrink-0" />
                  {formatEuro(CRUSCOTTO_GENERALE.rendimentoCumulativoEuro)}
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px]">
                <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Rendimento Totale</span>
                <span className="text-[12px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-extrabold font-mono">
                  {formatPercent(lastValidRendimento?.rendimentoCumulativoPerc)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRUPPO 2: PERFORMANCE DINAMICA (anno/mese selezionato) */}
        <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-300" />
              Performance Anno {globalSelectedYear}
            </span>
            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
              Anno Selezionato
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-[#0c1425]/90 p-3 sm:p-5 pb-2 sm:pb-3 rounded-2xl border border-sky-900/60 shadow-xs flex flex-col">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider">Rendimento {globalSelectedYear}</span>
                <div className="bg-sky-950/50 p-1 rounded-lg">
                  <Award className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-extrabold font-display flex items-center gap-1" style={{ color: rendColor(Number(calculatedRendimentoAnnuo || 0)) }}>
                  {annualUp ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                  {formatEuro(CRUSCOTTO_ANNO.rendimentoAnnualeEuro)}
                </span>
                {previousYearRow && (
                  <span className={`text-[10px] font-bold block mt-2 ${annualDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {annualDelta >= 0 ? '+' : ''}{formatEuro(annualDelta)} <span className="text-slate-500 font-medium">vs {previousYearRow.anno}</span>
                  </span>
                )}
              </div>
              <div className="border-t border-sky-900/60 pt-2 mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-500 tracking-wide">Variazione annuale</span>
                <span
                  className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-black border"
                  style={{
                    backgroundColor: rendColorAlpha(Number(calculatedRendimentoAnnuo || 0), 0.15),
                    borderColor: rendColor(Number(calculatedRendimentoAnnuo || 0)),
                    color: rendColor(Number(calculatedRendimentoAnnuo || 0)),
                    boxShadow: `0 0 10px ${rendColorAlpha(Number(calculatedRendimentoAnnuo || 0), 0.45)}`,
                  }}
                >
                  {formatPercent(calculatedRendimentoAnnuo)}
                </span>
              </div>
            </div>

            <div className="bg-[#0c1425]/90 p-3 sm:p-5 pb-2 sm:pb-3 rounded-2xl border border-sky-900/60 shadow-xs flex flex-col">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider truncate">Ultimo Mese ({lastValidRendimento?.mese || 'N/D'})</span>
                <div className="bg-sky-950/50 p-1 rounded-lg shrink-0">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-extrabold font-display flex items-center gap-1" style={{ color: rendColor(Number(lastValidRendimento?.rendimentoMensilePerc || 0)) }}>
                  {monthlyUp ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                  {formatEuro(lastValidRendimento?.rendimentoMensileEuro)}
                </span>
                {previousMonthRecord && (
                  <span className={`text-[9px] font-bold block mt-2 ${monthlyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {monthlyDelta >= 0 ? '+' : ''}{formatEuro(monthlyDelta)} <span className="text-slate-500 font-medium">vs {previousMonthRecord.mese}</span>
                  </span>
                )}
              </div>
              <div className="border-t border-sky-900/60 pt-2 mt-auto flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-500 tracking-wide">Variazione mensile</span>
                <span
                  className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-black border"
                  style={{
                    backgroundColor: rendColorAlpha(Number(lastValidRendimento?.rendimentoMensilePerc || 0), 0.15),
                    borderColor: rendColor(Number(lastValidRendimento?.rendimentoMensilePerc || 0)),
                    color: rendColor(Number(lastValidRendimento?.rendimentoMensilePerc || 0)),
                    boxShadow: `0 0 10px ${rendColorAlpha(Number(lastValidRendimento?.rendimentoMensilePerc || 0), 0.45)}`,
                  }}
                >
                  {formatPercent(lastValidRendimento?.rendimentoMensilePerc)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Widget unico: Andamento Rendimenti, con i due grafici affiancati dentro */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Andamento Rendimenti
          </h3>
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700/60 select-none">
            <button
              onClick={() => setValueMode('euro')}
              className={`flex items-center gap-1 text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${valueMode === 'euro' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-sky-700'
                }`}
            >
              <Euro className="w-3 h-3" /> Euro
            </button>
            <button
              onClick={() => setValueMode('percent')}
              className={`flex items-center gap-1 text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${valueMode === 'percent' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-sky-700'
                }`}
            >
              <Percent className="w-3 h-3" /> Percentuale
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium">
          Progressione cumulativa e dettaglio mese per mese del rendimento del portafoglio, in {valueMode === 'euro' ? 'euro' : 'percentuale'}.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col h-[440px] p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/20 border border-slate-200/70 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Crescita Rendimento
              </h4>
              <div className="flex bg-white dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700/60 select-none">
                <button
                  onClick={() => setCrescitaRange('storico')}
                  className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${crescitaRange === 'storico' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  Storico
                </button>
                <button
                  onClick={() => setCrescitaRange('12mesi')}
                  className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${crescitaRange === '12mesi' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  Ultimi 12 Mesi
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">
              Plusvalenza netta cumulata nel tempo (linea grigia: {valueMode === 'euro' ? 'percentuale' : 'euro'}).
            </p>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                {crescitaRange === '12mesi' ? 'Focus Periodo (Ultimi 12 Mesi)' : 'Storico Completo'}
              </span>
              <span className="text-[10px] text-slate-500">
                {crescitaData.length > 0 ? `${crescitaData[0]?.mese} - ${crescitaData[crescitaData.length - 1]?.mese}` : ''}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={crescitaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCrescitaLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="33%" stopColor="#eab308" />
                      <stop offset="66%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={axisFormatter} />
                  <YAxis yAxisId="right" orientation="right" hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={crescitaTooltipFormatter}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={crescitaKey}
                    name={valueMode === 'euro' ? 'Cumulato €' : 'Cumulato %'}
                    stroke="url(#colorCrescitaLine)"
                    strokeWidth={3}
                    dot={crescitaRange === '12mesi' ? { r: 3.5, strokeWidth: 2, stroke: '#10b981', fill: '#fff' } : false}
                    activeDot={{ r: 6, cursor: 'pointer' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={crescitaSecondaryKey}
                    name={valueMode === 'euro' ? 'Cumulato %' : 'Cumulato €'}
                    stroke="#94a3b8"
                    strokeOpacity={0.55}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 flex justify-between items-center shrink-0">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Inizio Range</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold font-mono">{crescitaData[0]?.mese || 'N/D'}</span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Fine Range</span>
                <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{crescitaData[crescitaData.length - 1]?.mese || 'N/D'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col h-[440px] p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/20 border border-slate-200/70 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Rendimenti Mensili
              </h4>
              <div className="flex bg-white dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700/60 select-none">
                <button
                  onClick={() => setMensileRange('storico')}
                  className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${mensileRange === 'storico' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  Storico
                </button>
                <button
                  onClick={() => setMensileRange('12mesi')}
                  className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${mensileRange === '12mesi' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  Ultimi 12 Mesi
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">
              Plusvalenza o minusvalenza registrata in ogni singolo mese.
            </p>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                {mensileRange === '12mesi' ? 'Focus Periodo (Ultimi 12 Mesi)' : 'Storico Completo'}
              </span>
              <span className="text-[10px] text-slate-500">
                {mensileData.length > 0 ? `${mensileData[0]?.mese} - ${mensileData[mensileData.length - 1]?.mese}` : ''}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensileData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={axisFormatter} />
                  <Tooltip
                    formatter={(value: any) => [tooltipFormatter(value), 'Rendimento Mese']}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Bar dataKey={mensileKey} radius={[4, 4, 0, 0]}>
                    {mensileData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={Number(entry[mensileKey]) >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 flex justify-between items-center shrink-0">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Inizio Range</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold font-mono">{mensileData[0]?.mese || 'N/D'}</span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Fine Range</span>
                <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{mensileData[mensileData.length - 1]?.mese || 'N/D'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabella Rendimenti: tutte le voci dallo sheet Rendimenti, filtrate per anno */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Registro Rendimenti
          </h3>
          <div className="relative select-none shrink-0">
            <button
              onClick={() => setIsTableYearDropdownOpen(!isTableYearDropdownOpen)}
              className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              <Database className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 shrink-0" />
              <span>
                <span className="hidden md:inline">Esercizio: </span>
                <strong className="text-blue-600 dark:text-blue-400">{tableYear}</strong>
              </span>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
            </button>

            {isTableYearDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-32 bg-white dark:bg-[#0c1425] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 animate-fadeIn">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      setTableYear(String(year));
                      setIsTableYearDropdownOpen(false);
                    }}
                    className={`px-3 py-1.5 text-left text-[11px] font-bold rounded-lg transition-all cursor-pointer ${String(tableYear) === String(year)
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {tableRows.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Nessun dato disponibile per l'anno {tableYear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 text-xs font-bold uppercase tracking-wider border-b border-sky-200 dark:border-sky-900/60">
                <tr>
                  <th className="px-3 py-3 rounded-tl-2xl">Mese</th>
                  <th className="px-3 py-3 text-right">Mensile €</th>
                  <th className="px-3 py-3 text-right">Mensile %</th>
                  <th className="px-3 py-3 text-right">Inv. Mese</th>
                  <th className="px-3 py-3 text-right">Cumul. €</th>
                  <th className="px-3 py-3 text-right">Cumul. %</th>
                  <th className="px-3 py-3 text-right">Investito</th>
                  <th className="px-3 py-3 text-right rounded-tr-2xl">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-medium">
                {tableRows.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors duration-155">
                    <td className="px-3 py-3 font-bold text-slate-850 dark:text-slate-200 capitalize">{r.mese}</td>
                    <td className="px-3 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoMensilePerc || 0)) }}>
                      {Number(r.rendimentoMensileEuro || 0) >= 0 ? '+' : ''}{formatEuro(r.rendimentoMensileEuro)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoMensilePerc || 0)) }}>
                      {formatPercent(r.rendimentoMensilePerc)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{formatEuro(r.importoMensileInvestito)}</td>
                    <td className="px-3 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoCumulativoPerc || 0)) }}>
                      {Number(r.rendimentoCumulativoEuro || 0) >= 0 ? '+' : ''}{formatEuro(r.rendimentoCumulativoEuro)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoCumulativoPerc || 0)) }}>
                      {formatPercent(r.rendimentoCumulativoPerc)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{formatEuro(r.importoInvestitoCumulato)}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-850 dark:text-slate-100">{formatEuro(r.valoreAttualePortafoglio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
