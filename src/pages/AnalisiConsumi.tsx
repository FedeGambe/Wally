import React, { useState, useMemo, useEffect } from 'react';
import { Car, AlertOctagon } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line
} from 'recharts';
import { useFinanceData } from '../context/FinanceDataContext';
import { calcolaEsitiSettimanali, EsitoSettimana } from '../utils/esitoSettimanale';

const MESI_ABBR = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

// Format could be DD/MM/YYYY or YYYY-MM-DD
function parseDataConsumo(dataStr: string): { day: number; month: number; year: number } | null {
  if (!dataStr) return null;
  const parts = dataStr.split(/[-/]/);
  if (parts.length !== 3) return null;

  if (parts[0].length === 4) {
    // YYYY-MM-DD
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
  }
  // DD/MM/YYYY
  return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) };
}

function toDate(dataStr: string): Date | null {
  const p = parseDataConsumo(dataStr);
  return p ? new Date(p.year, p.month - 1, p.day) : null;
}

// Sintetizza una label tipo "Gen W1 26" dalla data grezza
function getSettimanaLabel(dataStr: string, index: number): string {
  const parsed = parseDataConsumo(dataStr);
  if (!parsed) return `Sett. ${index + 1}`;

  const meseAbbr = MESI_ABBR[parsed.month - 1] || 'Mese';
  let weekNum = 1;
  if (parsed.day > 21) weekNum = 4;
  else if (parsed.day > 14) weekNum = 3;
  else if (parsed.day > 7) weekNum = 2;

  const annoBreve = String(parsed.year).slice(-2);
  return `${meseAbbr} W${weekNum} ${annoBreve}`;
}

interface RecordConsumo {
  settimana: string;
  data: string;
  costo: number;
  quantitaLitri: number;
  prezzoAlLitro: number;
  kmFinali: number;
  kmEffettuati: number;
  kmAlLitro: number;
  efficienzaPercentuale: number;
  costoExtra: number;
  esitoSettimana: EsitoSettimana;
}

type TimeRange = 'storico' | '12mesi';

function filtraUltimi12Mesi(records: RecordConsumo[], range: TimeRange): RecordConsumo[] {
  if (range !== '12mesi' || records.length === 0) return records;
  const lastDate = toDate(records[records.length - 1].data);
  if (!lastDate) return records;
  const cutoff = new Date(lastDate);
  cutoff.setMonth(cutoff.getMonth() - 12);
  return records.filter(r => {
    const d = toDate(r.data);
    return d ? d >= cutoff : true;
  });
}

// Toggle Storico / Ultimi 12 Mesi, riusato in ogni singolo grafico della pagina
function TimeRangeToggle({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700 select-none shrink-0">
      <button
        onClick={() => onChange('storico')}
        className={`text-[9px] px-2.5 py-1 font-extrabold rounded-lg transition-all cursor-pointer ${
          value === 'storico' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-indigo-600'
        }`}
      >
        Storico
      </button>
      <button
        onClick={() => onChange('12mesi')}
        className={`text-[9px] px-2.5 py-1 font-extrabold rounded-lg transition-all cursor-pointer ${
          value === '12mesi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-indigo-600'
        }`}
      >
        Ultimi 12 Mesi
      </button>
    </div>
  );
}

export default function AnalisiConsumi() {
  const { data } = useFinanceData();

  // 1. Process and normalize the finance data
  const consumiRecords: RecordConsumo[] = useMemo(() => {
    const rawList = data.analisiConsumi || [];

    const parsedRecords = rawList
      .slice(1) // scarta la prima riga: sempre incompleta
      .filter((r: any) => r && (r.data || r.costo || r.kmEffettuati)) // filter empty rows
      .map((r: any, index: number) => {
        const parsedCosto = Number(r.costo || 0);
        const parsedKmEffettuati = Number(r.kmEffettuati || 0);
        const parsedKmLitro = Number(r.kmAlLitro || 0);
        const parsedEfficienza = Number(r.efficienzaPercentuale || 0);
        const parsedCostoExtra = Number(r.costoExtra || 0);
        const parsedQuantitaLitri = Number(r.quantitaLitri || 0);
        const parsedPrezzoAlLitro = Number(r.prezzoAlLitro || 0);
        const parsedKmFinali = Number(r.kmFinali || 0);

        // Label sempre calcolata dalla data per includere l'anno in modo uniforme
        const settimana = getSettimanaLabel(String(r.data || ''), index);

        return {
          ...r,
          settimana,
          data: r.data || '',
          costo: parsedCosto,
          quantitaLitri: parsedQuantitaLitri,
          prezzoAlLitro: parsedPrezzoAlLitro,
          kmFinali: parsedKmFinali,
          kmEffettuati: parsedKmEffettuati,
          kmAlLitro: parsedKmLitro,
          efficienzaPercentuale: parsedEfficienza,
          costoExtra: parsedCostoExtra
        };
      });

    const esiti = calcolaEsitiSettimanali(parsedRecords);
    return parsedRecords.map((r, index) => ({ ...r, esitoSettimana: esiti[index] }));
  }, [data.analisiConsumi]);

  // 2. Local selection state
  const [selectedWeekState, setSelectedWeekState] = useState<RecordConsumo | null>(null);

  useEffect(() => {
    if (consumiRecords.length > 0) {
      setSelectedWeekState(prev => {
        if (prev) {
          const matched = consumiRecords.find(r => r.data === prev.data && r.settimana === prev.settimana);
          if (matched) return matched;
        }
        return consumiRecords[consumiRecords.length - 1];
      });
    } else {
      setSelectedWeekState(null);
    }
  }, [consumiRecords]);

  // 3. Time range indipendente per ciascun grafico storico
  const [kmChartRange, setKmChartRange] = useState<TimeRange>('storico');
  const [kmLtChartRange, setKmLtChartRange] = useState<TimeRange>('storico');
  const [prezzoChartRange, setPrezzoChartRange] = useState<TimeRange>('storico');
  const [costoExtraChartRange, setCostoExtraChartRange] = useState<TimeRange>('storico');

  const kmChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, kmChartRange), [consumiRecords, kmChartRange]);
  const kmLtChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, kmLtChartRange), [consumiRecords, kmLtChartRange]);
  const prezzoChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, prezzoChartRange), [consumiRecords, prezzoChartRange]);
  const costoExtraChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, costoExtraChartRange), [consumiRecords, costoExtraChartRange]);

  const selectedWeek = selectedWeekState || {
    settimana: 'N/D',
    data: '***',
    costo: 0,
    quantitaLitri: 0,
    prezzoAlLitro: 0,
    kmFinali: 0,
    kmEffettuati: 0,
    kmAlLitro: 0,
    efficienzaPercentuale: 0,
    esitoSettimana: 'Nella media',
    costoExtra: 0
  };

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
    return num.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%';
  };

  // Historic averages for coloring scale thresholds
  const averages = useMemo(() => {
    const totalRecords = consumiRecords.length;
    if (totalRecords === 0) {
      return {
        kmAlLitro: 0,
        efficienza: 0,
        costo100: 0,
        costoExtra: 0
      };
    }
    const avgKmLt = consumiRecords.reduce((sum: number, item: any) => sum + (item.kmAlLitro || 0), 0) / totalRecords;
    const avgEfficienza = consumiRecords.reduce((sum: number, item: any) => sum + (item.efficienzaPercentuale || 0), 0) / totalRecords;
    
    // Cost per 100km average
    const avgCost100 = consumiRecords.reduce((sum: number, item: any) => {
      const cost100 = ((item.costo || 0) / (item.kmEffettuati || 1)) * 100;
      return sum + cost100;
    }, 0) / totalRecords;

    const avgCostoExtra = consumiRecords.reduce((sum: number, item: any) => sum + (item.costoExtra || 0), 0) / totalRecords;

    return {
      kmAlLitro: avgKmLt,
      efficienza: avgEfficienza,
      costo100: avgCost100,
      costoExtra: avgCostoExtra
    };
  }, [consumiRecords]);

  // Determine colors based on thresholds vs averages
  const getKpiColors = (value: number, type: 'costo100' | 'kmLt' | 'efficienza' | 'extra') => {
    if (isNaN(value)) {
      return { bg: 'bg-slate-50 dark:bg-slate-900/30 text-slate-500 border-slate-100 dark:border-slate-800/40', label: 'Dato non disponibile' };
    }
    if (type === 'costo100') {
      const delta = value - averages.costo100;
      if (delta < -1) return { bg: 'bg-emerald-50 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30', label: 'Ottimo (Sotto Media)' };
      if (delta < 1) return { bg: 'bg-amber-50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/20', label: 'Nella Media' };
      return { bg: 'bg-red-50 dark:bg-red-950/15 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30', label: 'Elevato (Sopra Media)' };
    }
    if (type === 'kmLt') {
      const delta = value - averages.kmAlLitro;
      if (delta > 1.5) return { bg: 'bg-emerald-50 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30', label: 'Ottimo (Sopra Media)' };
      if (delta > -1) return { bg: 'bg-amber-50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/20', label: 'Nella Media' };
      return { bg: 'bg-red-50 dark:bg-red-950/15 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30', label: 'Scarso (Sotto Media)' };
    }
    if (type === 'efficienza') {
      const delta = value - averages.efficienza;
      if (delta > 5) return { bg: 'bg-emerald-50 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30', label: 'Ottima' };
      if (delta > -5) return { bg: 'bg-amber-50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/20', label: 'Nella Media' };
      return { bg: 'bg-red-50 dark:bg-red-950/15 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30', label: 'Bassa' };
    }
    // extra cost
    if (value === 0) return { bg: 'bg-emerald-50 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30', label: 'Nessun Costo Extra' };
    if (value < averages.costoExtra) return { bg: 'bg-amber-50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/20', label: 'Basso Costo Extra' };
    return { bg: 'bg-red-50 dark:bg-red-950/15 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30', label: 'Incurrenza Extra' };
  };

  const getOutcomeBadge = (outcome: EsitoSettimana) => {
    switch (outcome) {
      case 'Migliore':
        return 'bg-emerald-700 text-white font-black';
      case 'Ottima':
        return 'bg-emerald-600 text-white font-black';
      case 'Buona':
        return 'bg-emerald-500 text-white font-bold';
      case 'Nella media':
        return 'bg-amber-500 text-white font-bold';
      case 'Non buona':
        return 'bg-orange-500 text-white font-bold';
      case 'Scarsa':
        return 'bg-red-600 text-white font-black';
      case 'Peggiore':
        return 'bg-red-800 text-white font-black';
    }
  };

  // Cost per 100km for selected week
  const selectedCost100 = ((selectedWeek.costo || 0) / (selectedWeek.kmEffettuati || 1)) * 100;

  const cost100Colors = getKpiColors(selectedCost100, 'costo100');
  const kmLtColors = getKpiColors(selectedWeek.kmAlLitro, 'kmLt');
  const efficienzaColors = getKpiColors(selectedWeek.efficienzaPercentuale, 'efficienza');
  const costoExtraColors = getKpiColors(selectedWeek.costoExtra, 'extra');

  // Selezione settimana cliccabile da qualsiasi grafico della pagina.
  // Recharts v3 non passa più `activePayload` all'onClick del chart (rimosso rispetto a v2):
  // l'unico riferimento disponibile è `activeLabel`, la label dell'asse X (qui: settimana).
  const handleChartClick = (chartEvent: any) => {
    if (!chartEvent || !chartEvent.activeLabel) return;
    const matched = consumiRecords.find(r => r.settimana === chartEvent.activeLabel);
    if (matched) setSelectedWeekState(matched);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Grid container dividing Left interactive inspector and right charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT PANEL: Selected Week Inspector and KPI color maps */}
        <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-left h-fit lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base">Settimana Selezionata</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{selectedWeek.settimana} · Andamento consumi e inefficienze</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${getOutcomeBadge(selectedWeek.esitoSettimana)}`}>
              {selectedWeek.esitoSettimana}
            </span>
          </div>

          <div className="space-y-4">
            {/* Quick stats totals */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Chilometri Effettuati</span>
              <span className="text-4xl font-black font-display text-blue-600 dark:text-indigo-400 mt-1 block">
                {selectedWeek.kmEffettuati} <span className="text-lg font-medium text-slate-400 dark:text-slate-500">Km</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 block font-mono">
                Rifornimento: {selectedWeek.data} • {selectedWeek.quantitaLitri} Lt • {selectedWeek.prezzoAlLitro} €/Lt
              </span>
            </div>

            {/* Dynamic colored KPI matrices */}
            <div className="space-y-3">
              {/* Cost per 100km */}
              <div className={`p-3.5 rounded-xl border ${cost100Colors.bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Costo / 100 Km</span>
                  <span className="text-xs font-bold font-mono">{cost100Colors.label}</span>
                </div>
                <span className="text-xl font-bold font-display mt-1 block">{formatEuro(selectedCost100)}</span>
              </div>

              {/* km/lt */}
              <div className={`p-3.5 rounded-xl border ${kmLtColors.bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Consumo medio (Km/Lt)</span>
                  <span className="text-xs font-bold font-mono">{kmLtColors.label}</span>
                </div>
                <span className="text-xl font-bold font-display mt-1 block">
                  {typeof selectedWeek.kmAlLitro === 'number' && !isNaN(selectedWeek.kmAlLitro) ? selectedWeek.kmAlLitro.toFixed(1) + ' km/lt' : '***'}
                </span>
              </div>

              {/* Punteggio efficienza */}
              <div className={`p-3.5 rounded-xl border ${efficienzaColors.bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Punteggio Efficienza %</span>
                  <span className="text-xs font-bold font-mono">{efficienzaColors.label}</span>
                </div>
                <span className="text-xl font-bold font-display mt-1 block">{formatPercent(selectedWeek.efficienzaPercentuale)}</span>
              </div>

              {/* Costo Extra */}
              <div className={`p-3.5 rounded-xl border ${costoExtraColors.bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Incurrenza Costo Extra</span>
                  <span className="text-xs font-bold font-mono">{costoExtraColors.label}</span>
                </div>
                <span className="text-xl font-bold font-display mt-1 block">{formatEuro(selectedWeek.costoExtra)}</span>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/20 rounded-2xl text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold block mb-0.5 text-indigo-600 dark:text-indigo-400">💡 Analisi per Federico:</span>
              I KPI e le colorazioni sono valutati automaticamente rispetto alla tua media storica di consumo carburante ({typeof averages.kmAlLitro === 'number' && !isNaN(averages.kmAlLitro) ? averages.kmAlLitro.toFixed(1) + ' km/lt' : '***'}).
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Historical graphs */}
        <div className="lg:col-span-2 space-y-6 text-left">

          {/* Weekly Kilometres and efficiency over time lines */}
          <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm flex items-center gap-1.5">
                  <Car className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
                  Chilometri Percorsi per Settimana
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Grafico storico della mobilità settimanale. Clicca sui punti per ispezionare.</p>
              </div>
              <TimeRangeToggle value={kmChartRange} onChange={setKmChartRange} />
            </div>

            <div className="h-56 mt-4">
              {kmChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={kmChartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorKmEffettuati" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#93c5fd' }}
                      formatter={(value: any) => [`${value} Km`, 'Km Effettuati']}
                    />
                    <Area
                      type="monotone"
                      dataKey="kmEffettuati"
                      name="Km percorsi"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorKmEffettuati)"
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isSelected = payload.data === selectedWeek.data && payload.settimana === selectedWeek.settimana;
                        return (
                          <circle
                            key={`dot-km-${payload.settimana}`}
                            cx={cx}
                            cy={cy}
                            r={isSelected ? 5 : 3}
                            fill={isSelected ? '#6366f1' : '#93c5fd'}
                            stroke="#fff"
                            strokeWidth={1.5}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      }}
                      activeDot={{ r: 6, fill: '#6366f1', cursor: 'pointer' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Efficiency curve lines */}
            <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-xs">Evoluzione Km / Litro</h3>
                <TimeRangeToggle value={kmLtChartRange} onChange={setKmLtChartRange} />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Riconversione consumi km/lt. Verde = sopra la media, rosso = sotto.</p>

              <div className="h-44">
                {kmLtChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={kmLtChartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      onClick={handleChartClick}
                    >
                      <defs>
                        <linearGradient id="colorKmAlLitro" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                      <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        itemStyle={{ color: '#10b981' }}
                        formatter={(value: any) => [`${value} km/lt`, 'Km/Lt']}
                      />
                      <Line type="monotone" dataKey="kmAlLitro" stroke="url(#colorKmAlLitro)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Price trend lines */}
            <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-xs">Andamento Prezzo Carburante (€/Lt)</h3>
                <TimeRangeToggle value={prezzoChartRange} onChange={setPrezzoChartRange} />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Storicità fluttuazione costi benzina</p>

              <div className="h-44">
                {prezzoChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={prezzoChartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      onClick={handleChartClick}
                    >
                      <defs>
                        <linearGradient id="colorPrezzoAlLitro" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                      <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        itemStyle={{ color: '#f59e0b' }}
                        formatter={(value: any) => [`€${value}`, 'Prezzo al Lt']}
                      />
                      <Area type="monotone" dataKey="prezzoAlLitro" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrezzoAlLitro)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Locked-in penalty cost extra index line chart */}
          <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm flex items-center gap-1.5">
                  <AlertOctagon className="w-4.5 h-4.5 text-orange-500" />
                  Costo Extra da Inefficienza Carburante Accumulato
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Costo in euro (€) dovuto ad andamento guida inefficiente sopra la media consigliata</p>
              </div>
              <TimeRangeToggle value={costoExtraChartRange} onChange={setCostoExtraChartRange} />
            </div>

            <div className="h-48 mt-4">
              {costoExtraChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={costoExtraChartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorCostoExtra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#f97316' }}
                      formatter={(value: any) => [formatEuro(value), 'Costo Extra']}
                    />
                    <Area type="monotone" dataKey="costoExtra" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCostoExtra)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
