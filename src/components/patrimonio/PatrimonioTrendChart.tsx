import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';
import { formatEuro } from '../../utils/format';
import type { RisparmioMese } from '../../data/mockData';

// Estratto da Patrimonio.tsx: la card "Andamento Finanziario" (grafico ad area
// con zoom via drag del mouse, 3 linee attivabili Netto/Risparmio/Investito
// con stime tratteggiate per i mesi mancanti, più il riepilogo mensile a fianco).
// Contiene anche lo stato di interazione del grafico (zoom, toggle linee) dato
// che è specifico e non serve al resto della pagina.

interface CumulativeDatum {
  mese: string;
  anno: number;
  uniqueKey: string;
  risparmioCumulativo: number;
  investito?: number | null;
  andamentoNetto?: number;
  investitoStimaOttimistica?: number | null;
  investitoStimaPessimistica?: number | null;
  andamentoNettoStimaOttimistica?: number;
  andamentoNettoStimaPessimistica?: number;
}

interface VisibleLines {
  netto: boolean;
  risparmio: boolean;
  investito: boolean;
}

interface PatrimonioTrendChartProps {
  cumulativeRisparmioData: CumulativeDatum[];
  sortedRisparmio: RisparmioMese[];
  visibleLines: VisibleLines;
  setVisibleLines: React.Dispatch<React.SetStateAction<VisibleLines>>;
}

export default function PatrimonioTrendChart({
  cumulativeRisparmioData,
  sortedRisparmio,
  visibleLines,
  setVisibleLines
}: PatrimonioTrendChartProps) {
  // Zoom a selezione (drag) sul grafico: solo desktop con mouse (pointer: fine).
  const isPointerFine = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches,
    []
  );
  const [zoomDomain, setZoomDomain] = useState<{ left: string; right: string } | null>(null);
  const [zoomSelection, setZoomSelection] = useState<{ left?: string; right?: string }>({});

  // Dati effettivamente disegnati nel grafico: se non c'è uno zoom attivo
  // (zoomDomain null) si usa tutta la serie storica; altrimenti si ritaglia
  // (slice) la porzione di array compresa tra i due punti selezionati con il
  // drag del mouse, indipendentemente dall'ordine in cui sono stati scelti
  // (da qui il confronto i1 <= i2 per capire quale sia "start" e quale "end").
  const chartData = useMemo(() => {
    if (!zoomDomain) return cumulativeRisparmioData;
    const i1 = cumulativeRisparmioData.findIndex(d => d.uniqueKey === zoomDomain.left);
    const i2 = cumulativeRisparmioData.findIndex(d => d.uniqueKey === zoomDomain.right);
    if (i1 === -1 || i2 === -1) return cumulativeRisparmioData;
    const [start, end] = i1 <= i2 ? [i1, i2] : [i2, i1];
    return cumulativeRisparmioData.slice(start, end + 1);
  }, [cumulativeRisparmioData, zoomDomain]);

  // Sequenza drag-to-zoom: mouseDown segna il punto di partenza, mouseMove
  // aggiorna il punto di arrivo mentre si trascina (mostrando l'area
  // evidenziata via <ReferenceArea>), mouseUp conferma la selezione impostando
  // zoomDomain (che rifà girare la useMemo sopra) e pulisce lo stato temporaneo.
  // Attivo solo con mouse preciso (isPointerFine) per non rompere lo scroll su touch.
  const handleChartMouseDown = (e: any) => {
    if (!isPointerFine || !e?.activeLabel) return;
    setZoomSelection({ left: e.activeLabel });
  };
  const handleChartMouseMove = (e: any) => {
    if (!isPointerFine || !zoomSelection.left || !e?.activeLabel) return;
    setZoomSelection(prev => ({ ...prev, right: e.activeLabel }));
  };
  const handleChartMouseUp = () => {
    if (!isPointerFine) return;
    const { left, right } = zoomSelection;
    if (left && right && left !== right) {
      setZoomDomain({ left, right });
    }
    setZoomSelection({});
  };

  // Le voci "Stima" (linee tratteggiate) compaiono in tooltip solo per il mese effettivamente mancante,
  // non nel punto di raccordo dove duplicano il valore reale già mostrato dalla linea piena.
  const renderAndamentoTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const rowData = payload[0].payload;
    const meseMancante = rowData.investito === undefined || rowData.investito === null;
    const visible = payload.filter((p: any) => {
      if (p.value === undefined || p.value === null) return false;
      const isStima = typeof p.dataKey === 'string' && p.dataKey.includes('Stima');
      return isStima ? meseMancante : true;
    });
    if (visible.length === 0) return null;
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
        <div className="font-bold" style={{ marginBottom: 4 }}>{rowData.mese} {rowData.anno}</div>
        {visible.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5" style={{ marginTop: idx > 0 ? 4 : 0 }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.name}: {formatEuro(Number(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base leading-snug">Andamento Finanziario</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analisi storica e cumulativa del patrimonio netto
              {isPointerFine && <span className="hidden sm:inline"> · trascina sul grafico per zoomare</span>}
            </p>
          </div>
        </div>
        {/* Legend indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {zoomDomain && (
            <button
              onClick={() => setZoomDomain(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/30 dark:hover:bg-amber-400/20 transition-all"
            >
              Reset zoom
            </button>
          )}
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, netto: !prev.netto }))}
            className={`flex items-center gap-2 transition-all duration-200 cursor-pointer select-none px-3 py-1.5 rounded-xl border text-xs font-semibold ${visibleLines.netto
              ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs dark:bg-white/10 dark:text-slate-100 dark:border-white/20'
              : 'bg-transparent text-slate-400 border-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 dark:border-white/10 opacity-60'
              }`}
          >
            <span className={`w-2 h-2 rounded-full transition-all ${visibleLines.netto ? 'bg-slate-500' : 'bg-slate-300'}`}></span>
            <span>Netto</span>
          </button>
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, risparmio: !prev.risparmio }))}
            className={`flex items-center gap-2 transition-all duration-200 cursor-pointer select-none px-3 py-1.5 rounded-xl border text-xs font-semibold ${visibleLines.risparmio
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/30'
              : 'bg-transparent text-slate-400 border-slate-200 hover:bg-emerald-50/20 dark:hover:bg-emerald-400/10 dark:border-white/10 opacity-60'
              }`}
          >
            <span className={`w-2 h-2 rounded-full transition-all ${visibleLines.risparmio ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            <span>Risparmio</span>
          </button>
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, investito: !prev.investito }))}
            className={`flex items-center gap-2 transition-all duration-200 cursor-pointer select-none px-3 py-1.5 rounded-xl border text-xs font-semibold ${visibleLines.investito
              ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/30'
              : 'bg-transparent text-slate-400 border-slate-200 hover:bg-sky-50/20 dark:hover:bg-sky-400/10 dark:border-white/10 opacity-60'
              }`}
          >
            <span className={`w-2 h-2 rounded-full transition-all ${visibleLines.investito ? 'bg-sky-500' : 'bg-slate-300'}`}></span>
            <span>Investito</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 - Integrated Chart */}
        <div className="lg:col-span-2">
          <div className="h-72 pointer-events-none md:pointer-events-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                onMouseDown={handleChartMouseDown}
                onMouseMove={handleChartMouseMove}
                onMouseUp={handleChartMouseUp}
                style={isPointerFine ? { cursor: 'crosshair' } : undefined}
              >
                <defs>
                  <linearGradient id="colorNettoPatrimonio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRisparmioPatrimonio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvestitoPatrimonio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderAndamentoTooltip} />

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="uniqueKey"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(value) => {
                    const item = chartData.find(d => d.uniqueKey === value);
                    return item?.mese?.toLowerCase().includes("dic") ? String(item.anno) : "";
                  }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                  }
                />

                {/* Line 1: Andamento Netto (scala sinistra, grigia) */}
                <Area
                  type="monotone"
                  yAxisId="left"
                  name="Andamento Netto"
                  dataKey="andamentoNetto"
                  stroke="#94a3b8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorNettoPatrimonio)"
                  dot={false}
                  activeDot={false}
                  hide={!visibleLines.netto}
                />

                {/* Line 2: Andamento Risparmio (scala sinistra, verde) */}
                <Area
                  type="monotone"
                  yAxisId="left"
                  name="Andamento Risparmio"
                  dataKey="risparmioCumulativo"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRisparmioPatrimonio)"
                  dot={false}
                  activeDot={false}
                  hide={!visibleLines.risparmio}
                />

                {/* Line 3: Quota Investimenti (scala destra, blu/indigo) */}
                <Area
                  type="monotone"
                  yAxisId="right"
                  name="Quota Investimenti"
                  dataKey="investito"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorInvestitoPatrimonio)"
                  dot={false}
                  activeDot={false}
                  hide={!visibleLines.investito}
                />

                {/* Stima mese mancante Investito: scenario ottimistico e pessimistico (tratteggiate, stesso colore della linea Quota Investimenti) */}
                <Area
                  type="monotone"
                  yAxisId="right"
                  name="Stima Investito (ottimistica)"
                  dataKey="investitoStimaOttimistica"
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  fill="url(#colorInvestitoPatrimonio)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  hide={!visibleLines.investito}
                />
                <Area
                  type="monotone"
                  yAxisId="right"
                  name="Stima Investito (pessimistica)"
                  dataKey="investitoStimaPessimistica"
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  fill="url(#colorInvestitoPatrimonio)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  hide={!visibleLines.investito}
                />

                {/* Stima mese mancante Andamento Netto: somma risparmio + stima investito, scenario ottimistico e pessimistico (tratteggiate, stesso grigio della linea Netto) */}
                <Area
                  type="monotone"
                  yAxisId="left"
                  name="Stima Netto (ottimistica)"
                  dataKey="andamentoNettoStimaOttimistica"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  fill="url(#colorNettoPatrimonio)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  hide={!visibleLines.netto}
                />
                <Area
                  type="monotone"
                  yAxisId="left"
                  name="Stima Netto (pessimistica)"
                  dataKey="andamentoNettoStimaPessimistica"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  fill="url(#colorNettoPatrimonio)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  hide={!visibleLines.netto}
                />

                {zoomSelection.left && zoomSelection.right && (
                  <ReferenceArea
                    yAxisId="left"
                    x1={zoomSelection.left}
                    x2={zoomSelection.right}
                    strokeOpacity={0.3}
                    fill="#f59e0b"
                    fillOpacity={0.15}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1/3 - Monthly Detail List */}
        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0 flex flex-col h-full justify-between">
          <div className="mb-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Riepilogo Mensile</span>
          </div>
          <div className="h-72 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
            {[...sortedRisparmio].reverse().map((r, idx) => {
              // Fallback su nomi di campo alternativi: righe più vecchie del
              // foglio Google Sheets possono usare "risparmio"/"investiti"
              // invece di "risparmioNetto"/"investito" (rinominati in seguito).
              const rispVal = r.risparmioNetto ?? r.risparmio ?? 0;
              const invVal = r.investito ?? r.investiti ?? 0;
              return (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs transition-all hover:bg-slate-100/70 dark:hover:bg-white/5">
                  <div>
                    <span className="font-bold text-slate-700 block">{r.mese}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{r.anno}</span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[9px] text-slate-400 font-medium">Risp:</span>
                      <span className={`font-bold ${rispVal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatEuro(rispVal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[9px] text-slate-400 font-medium">Inv:</span>
                      <span className="font-bold text-sky-600">
                        {formatEuro(invVal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
