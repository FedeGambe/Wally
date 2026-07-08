import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Shield, Coins, Wallet, Landmark } from 'lucide-react';

interface FondoPensioneProps {
  FONDO_PENSIONE_DATA: any[];
  formatEuro: (val: any) => string;
  selectedMonthName: string;
  selectedYearStr: string;
}

function parseMeseStringToMonthYear(meseStr: string): { month: number; year: number } | null {
  if (!meseStr) return null;
  const str = String(meseStr).trim().toLowerCase();
  
  // Trova l'anno (4 cifre o 2 cifre)
  const yearMatch = str.match(/\b(20\d{2}|\d{2})\b/);
  let year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  if (year !== null && year < 100) {
    year += 2000;
  }

  // Mappa dei mesi in italiano e inglese, sia completi che abbreviati
  const months: Record<string, number> = {
    gennaio: 1, january: 1, gen: 1, jan: 1, '01': 1,
    febbraio: 2, february: 2, feb: 2, '02': 2,
    marzo: 3, march: 3, mar: 3, '03': 3,
    aprile: 4, april: 4, apr: 4, '04': 4,
    maggio: 5, may: 5, mag: 5, '05': 5,
    giugno: 6, june: 6, giu: 6, jun: 6, '06': 6,
    luglio: 7, july: 7, lug: 7, jul: 7, '07': 7,
    agosto: 8, august: 8, ago: 8, aug: 8, '08': 8,
    settembre: 9, september: 9, set: 9, sep: 9, '09': 9,
    ottobre: 10, october: 10, ott: 10, oct: 10, '10': 10,
    novembre: 11, november: 11, nov: 11, '11': 11,
    dicembre: 12, december: 12, dic: 12, dec: 12, '12': 12
  };

  let foundMonth: number | null = null;
  let maxMatchLength = 0;
  for (const [key, value] of Object.entries(months)) {
    if (str.includes(key) && key.length > maxMatchLength) {
      foundMonth = value;
      maxMatchLength = key.length;
    }
  }

  if (!foundMonth) {
    const parts = str.split(/[\s/\.\-]+/);
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= 12 && part.length <= 2) {
        foundMonth = num;
        break;
      }
    }
  }

  if (!foundMonth || !year) {
    return null;
  }

  return { month: foundMonth, year };
}

export default function FondoPensione({
  FONDO_PENSIONE_DATA,
  formatEuro,
  selectedMonthName,
  selectedYearStr,
}: FondoPensioneProps) {
  // Normalize data to support both mock keys and Google Sheets keys dynamically
  const normalizedData = useMemo(() => {
    let rawList = FONDO_PENSIONE_DATA || [];
    
    // Check if the data comes from Google Sheets. Google Sheets maps fields like 'contrVolontaria' or 'totAccumulato'.
    const isFromSheets = rawList.some((item: any) => 'contrVolontaria' in item || 'totAccumulato' in item);
    console.log("FONDO_PENSIONE_DATA length:", rawList.length, "isFromSheets:", isFromSheets);
    if (rawList.length > 0) {
      console.log("First raw item keys/values:", JSON.stringify(rawList[0]));
    }
    
    if (isFromSheets && rawList.length > 0) {
      // Skip the second row of the Google Sheet, which is at index 0 of the parsed data
      // (This is the calculations/percentage row)
      rawList = rawList.slice(1);
    }
    
    return rawList
      .map((item: any, index: number) => {
        const tfr = Number(item.tfr) || 0;
        const contrBase = Number(item.contrBase) || 0;
        
        let contrVolont = 0;
        if (item.contrVolontaria !== undefined && item.contrVolontaria !== null && item.contrVolontaria !== '') {
          contrVolont = Number(item.contrVolontaria);
        } else if (item.contrVolont !== undefined && item.contrVolont !== null && item.contrVolont !== '') {
          contrVolont = Number(item.contrVolont);
        }
        if (isNaN(contrVolont)) contrVolont = 0;

        const contrAzienda = Number(item.contrAzienda) || 0;

        let totMensile = 0;
        if (item.totMensile !== undefined && item.totMensile !== null && item.totMensile !== '') {
          totMensile = Number(item.totMensile);
        } else {
          totMensile = tfr + contrBase + contrVolont + contrAzienda;
        }
        if (isNaN(totMensile) || totMensile === 0) {
          totMensile = tfr + contrBase + contrVolont + contrAzienda;
        }
        let totCumulativo = 0;
        
        // Debugging totAccumulato mapping
        console.log(`[FondoPensione Map Item ${index}] Month: "${item.mese}"`);
        console.log(contrVolont)
        console.log(` - item.totAccumulato:`, item.totAccumulato, `(type: ${typeof item.totAccumulato})`);
        console.log(` - item.totCumulativo:`, item.totCumulativo, `(type: ${typeof item.totCumulativo})`);
        console.log(` - keys in item:`, Object.keys(item));

        if (item.totAccumulato !== undefined && item.totAccumulato !== null && item.totAccumulato !== '') {
          totCumulativo = Number(item.totAccumulato);
          console.log(` - Selected totAccumulato -> Number:`, totCumulativo);
        } else if (item.totCumulativo !== undefined && item.totCumulativo !== null && item.totCumulativo !== '') {
          totCumulativo = Number(item.totCumulativo);
          console.log(` - Selected totCumulativo -> Number:`, totCumulativo);
        }
        if (isNaN(totCumulativo)) {
          console.log(` - totCumulativo is NaN! Resetting to 0`);
          totCumulativo = 0;
        }
        
        return {
          mese: item.mese || '',
          tfr,
          contrBase,
          contrVolont,
          contrAzienda,
          totMensile,
          totCumulativo,
        };
      })
      .filter((r: any) => {
        // Filter out empty rows, rows where month is empty, or contains percentage signs or says 'mese'
        const cleanMese = String(r.mese || '').trim();
        if (!cleanMese || cleanMese === '' || cleanMese.includes('%') || cleanMese.toLowerCase() === 'mese') {
          return false;
        }
        // Also filter out any trailing blank rows where all values are zero
        if (r.tfr === 0 && r.contrBase === 0 && r.contrVolont === 0 && r.contrAzienda === 0 && r.totCumulativo === 0) {
          return false;
        }
        return true;
      });
  }, [FONDO_PENSIONE_DATA]);

  // Derive key indicators dynamically
  const resolvedRecord = useMemo(() => {
    const parsedRows = normalizedData.map(row => {
      const parsed = parseMeseStringToMonthYear(row.mese);
      return {
        ...row,
        parsedDate: parsed ? parsed.year * 12 + parsed.month : 0
      };
    }).sort((a, b) => a.parsedDate - b.parsedDate);

    if (parsedRows.length === 0) return null;

    const targetParsed = parseMeseStringToMonthYear(`${selectedMonthName} ${selectedYearStr}`);
    if (!targetParsed) {
      return parsedRows[parsedRows.length - 1];
    }
    const selectedParsedDate = targetParsed.year * 12 + targetParsed.month;

    // Look for exact match
    const exactMatch = parsedRows.find(r => r.parsedDate === selectedParsedDate);
    if (exactMatch) return exactMatch;

    // Fallback to previous chronologically
    const earlierRows = parsedRows.filter(r => r.parsedDate < selectedParsedDate);
    if (earlierRows.length > 0) {
      return earlierRows[earlierRows.length - 1];
    }

    // Fallback to the first available record
    return parsedRows[0];
  }, [normalizedData, selectedMonthName, selectedYearStr]);

  const lastAccumulated = resolvedRecord?.totCumulativo || 0;

  // Sorted list in descending chronological order for the records table
  const descendingData = useMemo(() => {
    return [...normalizedData].map(row => {
      const parsed = parseMeseStringToMonthYear(row.mese);
      return {
        ...row,
        parsedDate: parsed ? parsed.year * 12 + parsed.month : 0
      };
    }).sort((a, b) => b.parsedDate - a.parsedDate);
  }, [normalizedData]);

  const avgMonthly = useMemo(() => {
    if (normalizedData.length === 0) return 0;
    const total = normalizedData.reduce((sum, item) => sum + item.totMensile, 0);
    return total / normalizedData.length;
  }, [normalizedData]);

  const activeCompanyContrib = resolvedRecord?.contrAzienda || 0;

  // Pie chart data: breakdown of all historical contributions summed up
  const pieData = useMemo(() => {
    if (normalizedData.length === 0) return [];
    let totalTfr = 0;
    let totalAzienda = 0;
    let totalDipendente = 0;

    normalizedData.forEach((row) => {
      totalTfr += row.tfr;
      totalAzienda += row.contrAzienda;
      totalDipendente += (row.contrBase + row.contrVolont);
    });

    return [
      { name: 'Quota TFR', value: totalTfr, color: '#4f46e5' },
      { name: 'Contributo Azienda', value: totalAzienda, color: '#8b5cf6' },
      { name: 'Dipendente (Base + Vol.)', value: totalDipendente, color: '#f59e0b' },
    ];
  }, [normalizedData]);

  const totalHistoricalContributions = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieData]);

  // Custom tooltips for recharts
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const val = payload[0].value;
      const pct = totalHistoricalContributions > 0 ? ((val / totalHistoricalContributions) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-slate-900/95 backdrop-blur-xs text-slate-100 px-3 py-2 rounded-xl shadow-xl text-xs font-medium border border-slate-800 leading-tight">
          <div className="flex items-center gap-1.5 mb-1 font-bold">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
            <span className="uppercase text-[9px] tracking-wide text-slate-300">{data.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3 font-mono font-bold text-white">
            <span>{formatEuro(val)}</span>
            <span className="text-emerald-400">({pct}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (normalizedData.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        Nessun dato disponibile per il Fondo Pensione.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Dynamic Key Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Valore Fondo Accumulato */}
        <div className="bg-white dark:bg-[#0c1425]/45 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider block">Valore Fondo Accumulato</span>
            <Landmark className="w-4 h-4 text-slate-400 dark:text-slate-400" />
          </div>
          <span className="text-2xl font-black font-display text-slate-800 dark:text-white block mt-1">
            {formatEuro(lastAccumulated)}
          </span>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Capitale complessivo accumulato comprensivo di TFR</p>
        </div>

        {/* Versamento Mensile Medio */}
        <div className="bg-white dark:bg-[#0c1425]/45 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider block">Versamento Mensile Medio</span>
            <Coins className="w-4 h-4 text-slate-400 dark:text-slate-400" />
          </div>
          <span className="text-2xl font-black font-display text-slate-800 dark:text-white block mt-1">
            {formatEuro(avgMonthly)}
          </span>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">PAC integrato con contributo datore e TFR</p>
        </div>

        {/* Contributo Azienda Attivo */}
        <div className="p-5 rounded-3xl border flex flex-col justify-between h-32 bg-emerald-50/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:border-emerald-500/80 dark:bg-[#0c2514]/15 transition-all duration-300 hover:shadow-[0_0_22px_rgba(16,185,129,0.55)]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-wider block">Contributo Azienda Attivo</span>
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400 block mt-1">
            {formatEuro(activeCompanyContrib)}
          </span>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500/80 font-medium mt-1">Ultimo versamento base datoriale sbloccato</p>
        </div>
      </div>

      {/* Visual Charts: 1/3 Pie composition + 2/3 Line accumulated trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1/3 Pie Chart for Historical Contribution composition */}
        <div className="lg:col-span-1 bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md min-h-[380px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Ripartizione Totale Versamenti
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mb-2 font-medium">
              Somma delle quote di tutti i versamenti storici effettuati nel fondo
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center relative min-h-[220px]">
            <div className="h-[180px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} wrapperStyle={{ zIndex: 100 }} />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Label for Donut chart */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 mt-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-black">Totale Versato</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">
                  {formatEuro(totalHistoricalContributions)}
                </span>
              </div>
            </div>

            {/* Custom Legends under Pie chart */}
            <div className="space-y-1.5 mt-2 px-2">
              {pieData.map((item, index) => {
                const pct = totalHistoricalContributions > 0 ? ((item.value / totalHistoricalContributions) * 100).toFixed(1) : '0.0';
                return (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium truncate max-w-[130px]">{item.name}</span>
                    </div>
                    <div className="font-bold text-slate-850 dark:text-slate-100 font-mono text-right shrink-0">
                      {formatEuro(item.value)} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2/3 Area/Line Chart for Accumulated Value over time */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md min-h-[380px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Andamento Valore Accumulato
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mb-4 font-medium">
              Crescita progressiva del capitale accumulato nel fondo pensione
            </p>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={normalizedData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorFondoAccumulato" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-850/40" />
                <XAxis
                  dataKey="mese"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT')}`}
                />
                <Tooltip
                  formatter={(value: any) => formatEuro(value)}
                  contentStyle={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="totCumulativo"
                  name="Valore Accumulato"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorFondoAccumulato)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition-all duration-300 hover:shadow-md">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base mb-4">Registro Storico Versamenti Fondo Pensione</h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-850">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-950/80">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Mese Rif</th>
                <th className="px-6 py-4 text-right">Quota TFR</th>
                <th className="px-6 py-4 text-right">Dipendente Base</th>
                <th className="px-6 py-4 text-right">Volontario</th>
                <th className="px-6 py-4 text-right">Quota Datoriale</th>
                <th className="px-6 py-4 text-right">Totale Mese</th>
                <th className="px-6 py-4 text-right rounded-tr-2xl">Importo Cumulativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-350 font-medium">
              {descendingData.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors duration-150">
                  <td className="px-6 py-3.5 font-bold text-slate-850 dark:text-slate-200 capitalize">{r.mese}</td>
                  <td className="px-6 py-3.5 text-right">{formatEuro(r.tfr)}</td>
                  <td className="px-6 py-3.5 text-right">{formatEuro(r.contrBase)}</td>
                  <td className="px-6 py-3.5 text-right text-indigo-500 dark:text-indigo-400 font-semibold">{formatEuro(r.contrVolont)}</td>
                  <td className="px-6 py-3.5 text-right">{formatEuro(r.contrAzienda)}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-800 dark:text-slate-200">{formatEuro(r.totMensile)}</td>
                  <td className="px-6 py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">{formatEuro(r.totCumulativo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
