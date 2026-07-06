import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Car,
  Fuel,
  TrendingUp,
  AlertOctagon,
  Award,
  Calendar,
  Zap,
  DollarSign,
  Gauge
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { useFinanceData } from '../context/FinanceDataContext';

// Helper to synthesize a week label like "Set W1" or "Gen W2" from raw dates
function getSettimanaLabel(dataStr: string, index: number): string {
  if (!dataStr) return `Sett. ${index + 1}`;
  
  // Format could be DD/MM/YYYY or YYYY-MM-DD
  const parts = dataStr.split(/[-/]/);
  if (parts.length === 3) {
    let day = 1;
    let month = 1;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      // DD/MM/YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }

    const MESI_ABBR = [
      'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
    ];

    const meseAbbr = MESI_ABBR[month - 1] || 'Mese';
    let weekNum = 1;
    if (day > 21) weekNum = 4;
    else if (day > 14) weekNum = 3;
    else if (day > 7) weekNum = 2;

    return `${meseAbbr} W${weekNum}`;
  }
  return dataStr; // Fallback to raw string if we can't parse
}

export default function AnalisiConsumi() {
  const { data } = useFinanceData();

  // 1. Process and normalize the finance data
  const consumiRecords = useMemo(() => {
    const rawList = data.analisiConsumi || [];

    return rawList
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

        // Synthesize week label if not present
        let settimana = r.settimana;
        if (!settimana) {
          settimana = getSettimanaLabel(String(r.data || ''), index);
        }

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
          esitoSettimana: r.esitoSettimana || 'Nella media',
          costoExtra: parsedCostoExtra
        };
      });
  }, [data.analisiConsumi]);

  // 2. Local selection state
  const [selectedWeekState, setSelectedWeekState] = useState<any | null>(null);

  useEffect(() => {
    if (consumiRecords.length > 0) {
      setSelectedWeekState(prev => {
        if (prev) {
          const matched = consumiRecords.find(
            (r: any) => r.settimana === prev.settimana || r.data === prev.data
          );
          if (matched) return matched;
        }
        return consumiRecords[consumiRecords.length - 1];
      });
    } else {
      setSelectedWeekState(null);
    }
  }, [consumiRecords]);

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

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'Ottima':
        return 'bg-emerald-600 text-white font-black';
      case 'Buona':
        return 'bg-emerald-500 text-white font-bold';
      case 'Nella media':
        return 'bg-amber-500 text-white font-bold';
      case 'Sopra media':
        return 'bg-orange-500 text-white font-bold';
      case 'Scarsa':
        return 'bg-red-600 text-white font-black';
      default:
        return 'bg-slate-500 text-white font-normal';
    }
  };

  // Cost per 100km for selected week
  const selectedCost100 = ((selectedWeek.costo || 0) / (selectedWeek.kmEffettuati || 1)) * 100;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Grid container dividing Left interactive inspector and right charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT PANEL: Selected Week Inspector and KPI color maps */}
        <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-left h-fit lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base">Ultimo Rilevamento</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Andamento consumi e inefficienze</p>
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
              <div className={`p-3.5 rounded-xl border ${getKpiColors(selectedCost100, 'costo100').bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Costo / 100 Km</span>
                  <span className="text-xs font-bold font-mono">{getKpiColors(selectedCost100, 'costo100').label}</span>
                </div>
                <span className="text-xl font-bold font-display mt-1 block">{formatEuro(selectedCost100)}</span>
              </div>

              {/* km/lt */}
              <div className={`p-3.5 rounded-xl border ${getKpiColors(selectedWeek.kmAlLitro, 'kmLt').bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Consumo medio (Km/Lt)</span>
                  <span className="text-xs font-bold font-mono">{getKpiColors(selectedWeek.kmAlLitro, 'kmLt').label}</span>
                </div>
                <span className="text-xl font-bold font-display mt-1 block">
                  {typeof selectedWeek.kmAlLitro === 'number' && !isNaN(selectedWeek.kmAlLitro) ? selectedWeek.kmAlLitro.toFixed(1) + ' km/lt' : '***'}
                </span>
              </div>

              {/* Punteggio efficienza */}
              <div className={`p-3.5 rounded-xl border ${getKpiColors(selectedWeek.efficienzaPercentuale, 'efficienza').bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Punteggio Efficienza %</span>
                  <span className="text-xs font-bold font-mono">{getKpiColors(selectedWeek.efficienzaPercentuale, 'efficienza').label}</span>
                </div>
                <span className="text-xl font-bold font-display mt-1 block">{formatPercent(selectedWeek.efficienzaPercentuale)}</span>
              </div>

              {/* Costo Extra */}
              <div className={`p-3.5 rounded-xl border ${getKpiColors(selectedWeek.costoExtra, 'extra').bg} transition-all`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Incurrenza Costo Extra</span>
                  <span className="text-xs font-bold font-mono">{getKpiColors(selectedWeek.costoExtra, 'extra').label}</span>
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
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm flex items-center gap-1.5 mb-2">
              <Car className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
              Chilometri Percorsi per Settimana
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Grafico storico della mobilità settimanale. Clicca sui punti per ispezionare.</p>

            <div className="h-56">
              {consumiRecords.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={consumiRecords}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        setSelectedWeekState(data.activePayload[0].payload);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#93c5fd' }}
                      formatter={(value: any) => [`${value} Km`, 'Km Effettuati']} 
                    />
                    <Bar dataKey="kmEffettuati" name="Km percorsi" radius={[4, 4, 0, 0]} maxBarSize={30}>
                      {consumiRecords.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.settimana === selectedWeek.settimana ? '#6366f1' : '#93c5fd'}
                          className="transition-all opacity-80 hover:opacity-100"
                          cursor="pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Efficiency curve lines */}
            <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-xs mb-1">Evoluzione Km / Litro</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Riconversione consumi km/lt</p>
              
              <div className="h-44">
                {consumiRecords.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={consumiRecords}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                      <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        itemStyle={{ color: '#10b981' }}
                        formatter={(value: any) => [`${value} km/lt`, 'Km/Lt']} 
                      />
                      <Line type="monotone" dataKey="kmAlLitro" stroke="#10b981" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Price trend lines */}
            <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-xs mb-1">Andamento Prezzo Carburante (€/Lt)</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Storicità fluttuazione costi benzina</p>
              
              <div className="h-44">
                {consumiRecords.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={consumiRecords}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                      <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        itemStyle={{ color: '#f59e0b' }}
                        formatter={(value: any) => [`€${value}`, 'Prezzo al Lt']} 
                      />
                      <Line type="monotone" dataKey="prezzoAlLitro" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Locked-in penalty cost extra index line chart */}
          <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm flex items-center gap-1.5 mb-2">
              <AlertOctagon className="w-4.5 h-4.5 text-orange-500" />
              Costo Extra da Inefficienza Carburante Accumulato
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Costo in euro (€) dovuto ad andamento guida inefficiente sopra la media consigliata</p>

            <div className="h-48">
              {consumiRecords.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={consumiRecords}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#f97316' }}
                      formatter={(value: any) => [formatEuro(value), 'Costo Extra']} 
                    />
                    <Bar dataKey="costoExtra" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
