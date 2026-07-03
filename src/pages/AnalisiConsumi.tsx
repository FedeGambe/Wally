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
import { HISTORICAL_CAR_MEASUREMENTS, ConsumoAutoWeek } from '../data/mockData';

export default function AnalisiConsumi() {
  const [selectedWeekState, setSelectedWeekState] = useState<ConsumoAutoWeek | null>(null);

  useEffect(() => {
    if (HISTORICAL_CAR_MEASUREMENTS.length > 0) {
      setSelectedWeekState(HISTORICAL_CAR_MEASUREMENTS[HISTORICAL_CAR_MEASUREMENTS.length - 1]);
    } else {
      setSelectedWeekState(null);
    }
  }, [HISTORICAL_CAR_MEASUREMENTS.length]);

  const selectedWeek = selectedWeekState || {
    settimana: 'N/D',
    data: '***',
    costo: undefined as any,
    quantitaLitri: undefined as any,
    prezzoAlLitro: undefined as any,
    kmFinali: undefined as any,
    kmEffettuati: undefined as any,
    kmAlLitro: undefined as any,
    efficienzaPercentuale: undefined as any,
    esitoSettimana: 'Nella media' as any,
    costoExtra: undefined as any
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
    const totalRecords = HISTORICAL_CAR_MEASUREMENTS.length;
    if (totalRecords === 0) {
      return {
        kmAlLitro: 0,
        efficienza: 0,
        costo100: 0,
        costoExtra: 0
      };
    }
    const avgKmLt = HISTORICAL_CAR_MEASUREMENTS.reduce((sum, item) => sum + (item.kmAlLitro || 0), 0) / totalRecords;
    const avgEfficienza = HISTORICAL_CAR_MEASUREMENTS.reduce((sum, item) => sum + (item.efficienzaPercentuale || 0), 0) / totalRecords;
    
    // Cost per 100km average
    const avgCost100 = HISTORICAL_CAR_MEASUREMENTS.reduce((sum, item) => {
      const cost100 = ((item.costo || 0) / (item.kmEffettuati || 1)) * 100;
      return sum + cost100;
    }, 0) / totalRecords;

    const avgCostoExtra = HISTORICAL_CAR_MEASUREMENTS.reduce((sum, item) => sum + (item.costoExtra || 0), 0) / totalRecords;

    return {
      kmAlLitro: avgKmLt,
      efficienza: avgEfficienza,
      costo100: avgCost100,
      costoExtra: avgCostoExtra
    };
  }, []);

  // Determine colors based on thresholds vs averages
  const getKpiColors = (value: number, type: 'costo100' | 'kmLt' | 'efficienza' | 'extra') => {
    if (type === 'costo100') {
      const delta = value - averages.costo100;
      if (delta < -1) return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-100', label: 'Ottimo (Sotto Media)' };
      if (delta < 1) return { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Nella Media' };
      return { bg: 'bg-red-50 text-red-800 border-red-100', label: 'Elevato (Sopra Media)' };
    }
    if (type === 'kmLt') {
      const delta = value - averages.kmAlLitro;
      if (delta > 1.5) return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-100', label: 'Ottimo (Sopra Media)' };
      if (delta > -1) return { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Nella Media' };
      return { bg: 'bg-red-50 text-red-800 border-red-100', label: 'Scarso (Sotto Media)' };
    }
    if (type === 'efficienza') {
      const delta = value - averages.efficienza;
      if (delta > 5) return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-100', label: 'Ottima' };
      if (delta > -5) return { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Nella Media' };
      return { bg: 'bg-red-50 text-red-800 border-red-100', label: 'Bassa' };
    }
    // extra cost
    if (value === 0) return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-100', label: 'Nessun Costo Extra' };
    if (value < averages.costoExtra) return { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Basso Costo Extra' };
    return { bg: 'bg-red-50 text-red-800 border-red-100', label: 'Incurrenza Extra' };
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
  const selectedCost100 = (selectedWeek.costo / (selectedWeek.kmEffettuati || 1)) * 100;

  return (
    <div className="space-y-6">
      {/* Grid container dividing Left interactive inspector and right charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT PANEL: Selected Week Inspector and KPI color maps */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs text-left h-fit lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 font-display text-base">Ultima Settimana</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Andamento consumi e inefficienze</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${getOutcomeBadge(selectedWeek.esitoSettimana)}`}>
              {selectedWeek.esitoSettimana}
            </span>
          </div>

          <div className="space-y-4">
            {/* Quick stats totals */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chilometri Effettuati</span>
              <span className="text-4xl font-black font-display text-blue-600 mt-1 block">
                {selectedWeek.kmEffettuati} <span className="text-lg font-medium text-slate-400">Km</span>
              </span>
              <span className="text-[10px] text-slate-550 mt-1 block font-mono">
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

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-700/90 leading-relaxed">
              <span className="font-bold block mb-0.5">💡 Informazione per Federico:</span>
              I KPI e le colorazioni sono valutati automaticamente rispetto alla tua media storica di consumo carburante ({typeof averages.kmAlLitro === 'number' && !isNaN(averages.kmAlLitro) ? averages.kmAlLitro.toFixed(1) + ' km/lt' : '***'}).
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Historical graphs */}
        <div className="lg:col-span-2 space-y-6 text-left">
          
          {/* Weekly Kilometres and efficiency over time lines */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="font-bold text-slate-800 font-display text-sm flex items-center gap-1.5 mb-2">
              <Car className="w-4.5 h-4.5 text-blue-500" />
              Chilometri Percorsi per Settimana
            </h3>
            <p className="text-xs text-slate-400 mb-4">Grafico storico della mobilità settimanale. Clicca sui punti per ispezionare.</p>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...HISTORICAL_CAR_MEASUREMENTS]}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      setSelectedWeekState(data.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: any) => [`${value} Km`, 'Km Effettuati']} />
                  <Bar dataKey="kmEffettuati" name="Km percorsi" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {[...HISTORICAL_CAR_MEASUREMENTS].map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.settimana === selectedWeek.settimana ? '#2563eb' : '#93c5fd'}
                        className="transition-all"
                        cursor="pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Efficiency curve lines */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="font-bold text-slate-800 font-display text-xs mb-1">Evoluzione Km / Litro</h3>
              <p className="text-[11px] text-slate-400 mb-4">Riconversione consumi km/lt</p>
              
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...HISTORICAL_CAR_MEASUREMENTS]}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: any) => [`${value} km/lt`, 'Km/Lt']} />
                    <Line type="monotone" dataKey="kmAlLitro" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Price trend lines */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="font-bold text-slate-800 font-display text-xs mb-1">Andamento Prezzo Carburante (€/Lt)</h3>
              <p className="text-[11px] text-slate-400 mb-4">Storicità fluttuazione costi benzina</p>
              
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...HISTORICAL_CAR_MEASUREMENTS]}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
                    <Tooltip formatter={(value: any) => [`€${value}`, 'Prezzo al Lt']} />
                    <Line type="monotone" dataKey="prezzoAlLitro" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Locked-in penalty cost extra index line chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="font-bold text-slate-800 font-display text-sm flex items-center gap-1.5 mb-2">
              <AlertOctagon className="w-4.5 h-4.5 text-orange-500" />
              Costo Extra da Inefficienza Carburante Accumulato
            </h3>
            <p className="text-xs text-slate-400 mb-4">Costo in euro (€) dovuto ad andamento guida inefficiente sopra la media consigliata</p>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...HISTORICAL_CAR_MEASUREMENTS]}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
                  <Tooltip formatter={(value: any) => [formatEuro(value), 'Costo Extra']} />
                  <Bar dataKey="costoExtra" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
