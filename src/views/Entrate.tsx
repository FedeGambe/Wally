import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from 'recharts';
import {
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Grid,
  CreditCard
} from 'lucide-react';
import Drawer from '../components/Drawer';

// Definizione interfaccia dati da Google Sheets
export interface SheetsData {
  uscite: any[];
  risparmio: any[];
  patrimonio: any[];
  analisiConsumi: any[];
  rendimentiInvestimenti: any[];
  entrate?: any[];
}

interface EntrateProps {
  sheetsData?: SheetsData; // reso opzionale per evitare crash se non passato subito
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

const monthsOrder = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

// Funzione helper per estrarre mese e anno a 4 cifre da stringhe del tipo "ottobre 25" o "gennaio 22"
const parseMeseAnno = (meseField: string) => {
  if (!meseField) return { mese: '', anno: new Date().getFullYear() };
  const parts = String(meseField).trim().split(/\s+/);
  if (parts.length === 0) return { mese: '', anno: new Date().getFullYear() };
  
  const m = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  
  if (parts.length === 2) {
    let y = parseInt(parts[1], 10);
    if (!isNaN(y)) {
      if (y < 100) y = 2000 + y; // Converte "25" in 2025
      return { mese: m, anno: y };
    }
  }
  return { mese: m, anno: new Date().getFullYear() };
};

export default function Entrate({
  sheetsData = { uscite: [], risparmio: [], patrimonio: [], analisiConsumi: [], rendimentiInvestimenti: [], entrate: [] },
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: EntrateProps) {
  // Sincronizzazione stato locale del mese con quello del componente padre
  const [localSelectedMonth, setLocalSelectedMonth] = useState(selectedMonth);

  useEffect(() => {
    setLocalSelectedMonth(selectedMonth);
  }, [selectedMonth]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerTransactions, setDrawerTransactions] = useState<any[]>([]);
  const [drawerStats, setDrawerStats] = useState<any>(undefined);

  const COLORS = ['#10b981', '#2563eb', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

  // 1. Normalizziamo e puliamo la lista delle Entrate reali (scartiamo righe di trasferimento o prive di importo)
  const normalizedEntrate = useMemo(() => {
    if (!sheetsData?.entrate) return [];
    return sheetsData.entrate
      .map(e => {
        let anno = Number(e.anno);
        if (anno < 100 && anno > 0) anno += 2000; // Normalizza "26" in 2026
        const cleanMese = String(e.mese || '').trim();
        const meseNorm = cleanMese ? cleanMese.charAt(0).toUpperCase() + cleanMese.slice(1).toLowerCase() : '';
        return {
          ...e,
          anno: anno || new Date().getFullYear(),
          meseNorm,
          importo: Number(e.importo || 0)
        };
      })
      .filter(e => monthsOrder.includes(e.meseNorm) && e.importo > 0);
  }, [sheetsData?.entrate]);

  // 2. Normalizziamo il foglio Risparmio reale filtrando le sole righe valide con dati mensili effettivi
  const normalizedRisparmio = useMemo(() => {
    if (!sheetsData?.risparmio) return [];
    return sheetsData.risparmio
      .map(r => {
        const parsed = parseMeseAnno(r.mese);
        const finalAnno = (r.anno && Number(r.anno) > 2000) ? Number(r.anno) : parsed.anno;
        return {
          ...r,
          meseDisplay: parsed.mese,
          anno: finalAnno,
          uniqueKey: `${parsed.mese} ${finalAnno}`,
          entrate: Number(r.entrate || 0),
          speseTotali: Number(r.speseTotali || 0)
        };
      })
      .filter(r => monthsOrder.includes(r.meseDisplay) && r.anno > 2000);
  }, [sheetsData?.risparmio]);

  // 3. Unione intelligente (Smart Merge): creiamo un trend cronologico unendo Risparmio + mesi mancanti presi da Entrate
  const chronologicalData = useMemo(() => {
    // Calcoliamo la somma reale per mese/anno direttamente dalle transazioni del foglio Entrate
    const aggregatedMap: { [key: string]: number } = {};
    normalizedEntrate.forEach(e => {
      const key = `${e.meseNorm} ${e.anno}`;
      aggregatedMap[key] = (aggregatedMap[key] || 0) + e.importo;
    });

    // Mappa i dati di Risparmio, sovrascrivendo l'importo entrate se ci sono dati reali nel foglio Entrate
    const updatedRisparmio = normalizedRisparmio.map(r => {
      const key = r.uniqueKey;
      const realEntrateSum = aggregatedMap[key];
      return {
        ...r,
        entrate: realEntrateSum !== undefined && realEntrateSum > 0 ? realEntrateSum : r.entrate
      };
    });

    // Trova i mesi presenti nel foglio Entrate che NON esistono nel foglio Risparmio
    const existingKeys = new Set(updatedRisparmio.map(r => r.uniqueKey));
    const extraEntrate: any[] = [];
    
    normalizedEntrate.forEach(e => {
      const key = `${e.meseNorm} ${e.anno}`;
      if (!existingKeys.has(key)) {
        if (!extraEntrate.some(x => x.uniqueKey === key)) {
          extraEntrate.push({
            meseDisplay: e.meseNorm,
            anno: e.anno,
            uniqueKey: key,
            entrate: aggregatedMap[key],
            speseTotali: 0,
            spesePrimarie: 0,
            prim35: 0,
            speseSecondarie: 0,
            sec15: 0,
            spendibile: 0,
            investiti: 0,
            inv15: 0,
            risparmio: 0,
            risp35: 0,
            nettoTotale: 0,
            netto50: 0
          });
        }
      }
    });

    const combined = [
      ...updatedRisparmio,
      ...extraEntrate
    ];

    // Ordina in ordine cronologico assoluto (Anno -> Mese)
    return combined.sort((a, b) => {
      const scoreA = a.anno * 12 + monthsOrder.indexOf(a.meseDisplay);
      const scoreB = b.anno * 12 + monthsOrder.indexOf(b.meseDisplay);
      return scoreA - scoreB;
    });
  }, [normalizedRisparmio, normalizedEntrate]);

  // Grafico dinamico: 9 mesi indietro e 2 in avanti, in aggiunta al mese attuale.
  // Nel caso non ci fossero due mesi avanti ma solo 1, allora facciamo 10 mesi indietro.
  // Se non ci sono mesi avanti (siamo all'ultimo), facciamo 11 mesi indietro.
  const chartData = useMemo(() => {
    if (chronologicalData.length === 0) return [];

    const index = chronologicalData.findIndex(
      (r) => r.meseDisplay.toLowerCase() === localSelectedMonth.toLowerCase() &&
             (selectedYear === 'Tutti' || r.anno.toString() === selectedYear)
    );

    // Se non trovato, facciamo fallback all'ultimo elemento
    const targetIdx = index !== -1 ? index : chronologicalData.length - 1;

    const goForward = Math.min(2, chronologicalData.length - 1 - targetIdx);
    const goBackward = 11 - goForward;

    const startIdx = Math.max(0, targetIdx - goBackward);
    const endIdx = Math.min(chronologicalData.length - 1, targetIdx + goForward);

    return chronologicalData.slice(startIdx, endIdx + 1);
  }, [chronologicalData, localSelectedMonth, selectedYear]);

  // 4. Auto-Selezione Fallback: Se la combinazione selezionata non ha dati, sposta all'ultimo mese compilato
  useEffect(() => {
    if (chronologicalData.length > 0) {
      const currentHasData = chronologicalData.some(
        d => d.meseDisplay.toLowerCase() === selectedMonth.toLowerCase() &&
             d.anno.toString() === selectedYear
      );
      
      if (!currentHasData) {
        // Cerca l'ultimo record disponibile nello storico globale
        const latestRecord = chronologicalData[chronologicalData.length - 1];
        setSelectedMonth(latestRecord.meseDisplay);
        setSelectedYear(latestRecord.anno.toString());
        setLocalSelectedMonth(latestRecord.meseDisplay);
      }
    }
  }, [chronologicalData, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear]);

  // 5. Recupera il record del mese selezionato attivo
  const selectedRecord = useMemo(() => {
    const targetYearNum = parseInt(selectedYear, 10);
    const targetYear = isNaN(targetYearNum) ? new Date().getFullYear() : targetYearNum;
    
    const match = chronologicalData.find(
      (r) => r.meseDisplay.toLowerCase() === localSelectedMonth.toLowerCase() && r.anno === targetYear
    );
    if (match) return match;

    // Se non trova corrispondenze, calcola la somma aggregata in tempo reale
    const monthlySum = normalizedEntrate
      .filter(e => e.meseNorm.toLowerCase() === localSelectedMonth.toLowerCase() && e.anno === targetYear)
      .reduce((sum, e) => sum + e.importo, 0);

    return {
      meseDisplay: localSelectedMonth,
      anno: targetYear,
      entrate: monthlySum
    };
  }, [chronologicalData, localSelectedMonth, selectedYear, normalizedEntrate]);

  // Calcola il delta (differenza) con il mese precedente nello storico reale
  const prevRecord = useMemo(() => {
    if (!selectedRecord) return undefined;
    const idx = chronologicalData.findIndex(
      (r) => r.meseDisplay === selectedRecord.meseDisplay && r.anno === selectedRecord.anno
    );
    return idx > 0 ? chronologicalData[idx - 1] : undefined;
  }, [chronologicalData, selectedRecord]);

  // 6. Calcola le entrate dell'anno corrente selezionato
  const totalIncomeForSelectedYear = useMemo(() => {
    const targetYear = selectedRecord ? selectedRecord.anno : new Date().getFullYear();
    const yearIncomes = normalizedEntrate.filter(e => e.anno === targetYear);
    if (yearIncomes.length > 0) {
      return yearIncomes.reduce((sum, e) => sum + e.importo, 0);
    }
    const yearRisparmio = normalizedRisparmio.filter(r => r.anno === targetYear);
    return yearRisparmio.reduce((sum, r) => sum + r.entrate, 0);
  }, [selectedRecord, normalizedEntrate, normalizedRisparmio]);

  // Calcola la media mensile dell'anno selezionato
  const avgMonthlyIncome = useMemo(() => {
    const targetYear = selectedRecord ? selectedRecord.anno : new Date().getFullYear();
    const yearRisparmio = chronologicalData.filter(r => r.anno === targetYear && r.entrate > 0);
    if (yearRisparmio.length > 0) {
      return totalIncomeForSelectedYear / yearRisparmio.length;
    }
    return totalIncomeForSelectedYear / 12;
  }, [totalIncomeForSelectedYear, selectedRecord, chronologicalData]);

  // 7. Ripartizione per Categoria (dal foglio Entrate reale)
  const categoryData = useMemo(() => {
    if (!selectedRecord) return [];
    const monthIncomes = normalizedEntrate.filter(
      (e) => e.meseNorm.toLowerCase() === selectedRecord.meseDisplay.toLowerCase() && e.anno === selectedRecord.anno
    );

    if (monthIncomes.length === 0) {
      return selectedRecord.entrate > 0 
        ? [{ name: 'Entrate Generiche', value: selectedRecord.entrate }]
        : [];
    }

    const grouped: { [key: string]: number } = {};
    monthIncomes.forEach(e => {
      const cat = e.categoria || 'Altro';
      grouped[cat] = (grouped[cat] || 0) + e.importo;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [selectedRecord, normalizedEntrate]);

  // 8. Ripartizione per Canale di Accredito / Conto (dal foglio Entrate reale)
  const accountData = useMemo(() => {
    if (!selectedRecord) return [];
    const monthIncomes = normalizedEntrate.filter(
      (e) => e.meseNorm.toLowerCase() === selectedRecord.meseDisplay.toLowerCase() && e.anno === selectedRecord.anno
    );

    if (monthIncomes.length === 0) {
      return selectedRecord.entrate > 0 
        ? [{ name: 'Non Specificato', value: selectedRecord.entrate }]
        : [];
    }

    const grouped: { [key: string]: number } = {};
    monthIncomes.forEach(e => {
      const acc = e.conto || 'Altro';
      grouped[acc] = (grouped[acc] || 0) + e.importo;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [selectedRecord, normalizedEntrate]);

  // 9. Singoli flussi/movimenti del mese selezionato per la tabella in fondo
  const activeMonthEntries = useMemo(() => {
    if (!selectedRecord) return [];
    return normalizedEntrate.filter(
      (e) => e.meseNorm.toLowerCase() === selectedRecord.meseDisplay.toLowerCase() &&
             e.anno === selectedRecord.anno
    );
  }, [selectedRecord, normalizedEntrate]);

  const formatEuro = (value: any) => {
    if (value === undefined || value === null || isNaN(Number(value)) || value === '') {
      return '***';
    }
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: true }).format(Number(value));
  };

  const renderDelta = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const isPreviousHigher = previous > current;
    const percentDiff = Math.abs(((current - previous) / previous) * 100);
    const formattedPct = percentDiff.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

    if (isPreviousHigher) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 align-middle">
          <span>↓ {formattedPct}</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 align-middle">
          <span>↑ {formattedPct}</span>
        </span>
      );
    }
  };

  // Apertura Drawer al click sui punti del grafico
  const handlePointClick = (monthName: string, yearValue: number, totalEntrate: number) => {
    setLocalSelectedMonth(monthName);

    const monthIncomes = normalizedEntrate.filter(
      (e) => e.meseNorm.toLowerCase() === monthName.toLowerCase() && e.anno === yearValue
    );

    const mappedTx = monthIncomes.map((e) => ({
      id: e.id,
      data: e.data || `01/${monthName === 'Giugno' ? '06' : '05'}/${yearValue}`,
      mese: e.meseNorm.toLowerCase(),
      descrizione: e.categoria || 'Entrata generica',
      macroCategoria: 'Entrate',
      categoria: e.categoria,
      icon: e.categoria === 'Stipendio' ? '💼' : '💵',
      conto: e.conto,
      importo: e.importo,
      primaria: e.categoria === 'Stipendio'
    }));

    setDrawerTitle(`Dettaglio Entrate - ${monthName} ${yearValue}`);
    setDrawerTransactions(mappedTx);
    setDrawerStats({
      total: totalEntrate || monthIncomes.reduce((s, e) => s + e.importo, 0),
      count: mappedTx.length
    });
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Bento box contatori */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box Entrate Mensili */}
        <div className="bg-emerald-700 text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-40 border border-emerald-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-100 backdrop-blur-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="z-10 text-left">
            <span className="text-xs text-emerald-200 font-bold uppercase tracking-wider block">
              Entrate Mensili ({selectedRecord?.meseDisplay} {selectedRecord?.anno})
            </span>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <h3 className="text-3xl font-extrabold font-display text-white leading-none">
                {formatEuro(selectedRecord?.entrate || 0)}
              </h3>
              {renderDelta(selectedRecord?.entrate || 0, prevRecord?.entrate)}
            </div>
          </div>
          <p className="text-xs text-emerald-100/95 mt-auto z-10 font-medium text-left">
            Totale flussi reali accreditati nel mese selezionato
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <ArrowUpRight className="w-32 h-32" />
          </div>
        </div>

        {/* Box Entrate Annuali */}
        <div className="bg-indigo-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-40 border border-indigo-950 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-indigo-100 backdrop-blur-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="z-10 text-left">
            <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider block">
              Entrate Anno Corrente ({selectedRecord?.anno})
            </span>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <h3 className="text-3xl font-extrabold font-display text-white leading-none">
                {formatEuro(totalIncomeForSelectedYear)}
              </h3>
            </div>
          </div>
          <p className="text-xs text-indigo-100/95 mt-auto z-10 font-medium text-left">
            Media mensile stimata di <strong className="font-bold">{formatEuro(avgMonthlyIncome)}</strong>
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <TrendingUp className="w-32 h-32" />
          </div>
        </div>
      </div>

      {/* Grafico Principale di Andamento Storico */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">Andamento Entrate Mensili</h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualizzazione dei flussi di entrata storici estratti da Google Fogli. Clicca sul punto del mese per visualizzare il dettaglio dei bonifici.
            </p>
          </div>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 self-start sm:self-center capitalize">
            Attivo: {localSelectedMonth} {selectedRecord?.anno}
          </div>
        </div>

        <div className="h-72 mt-6">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs">Nessun dato cronologico disponibile per l'anno selezionato</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const clickedElement = data.activePayload[0].payload;
                    handlePointClick(clickedElement.meseDisplay, clickedElement.anno, clickedElement.entrate);
                  }
                }}
              >
                <defs>
                  <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="uniqueKey" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  interval={0}
                  tickFormatter={(val) => {
                    const parts = String(val).split(' ');
                    if (parts.length === 2) {
                      return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
                    }
                    return val;
                  }}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
                <Tooltip
                  formatter={(value: any) => [formatEuro(value), 'Entrate']}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="entrate"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorEntrate)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.meseDisplay.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.uniqueKey}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#10b981' : '#fff'}
                        stroke="#10b981"
                        strokeWidth={isSelected ? 3 : 2}
                        className="cursor-pointer transition-all"
                      />
                    );
                  }}
                  activeDot={{ r: 8 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Grafici a Torta della Ripartizione */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Torta Categorie */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
            <Grid className="w-5 h-5 text-emerald-600" />
            Ripartizione Categoria Ricavi
          </h3>
          <p className="text-xs text-slate-400 mt-1">Suddivisione delle entrate per causale o tipologia</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            {categoryData.length === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-center text-slate-400">
                <Grid className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs">Nessuna entrata registrata per questo mese</p>
              </div>
            ) : (
              <>
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={0}
                        stroke="none"
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatEuro(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2.5 text-xs w-full max-w-xs">
                  {categoryData.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-slate-600 font-semibold truncate">{c.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{formatEuro(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Torta Canali / Conti di accredito */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Canali di Accredito
          </h3>
          <p className="text-xs text-slate-400 mt-1">Conti correnti e depositi su cui sono confluiti i capitali</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            {accountData.length === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-center text-slate-400">
                <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs">Nessun accredito registrato per questo mese</p>
              </div>
            ) : (
              <>
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={accountData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={0}
                        stroke="none"
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {accountData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatEuro(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2.5 text-xs w-full max-w-xs">
                  {accountData.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                        <span className="text-slate-600 font-semibold truncate">{a.name}</span>
                      </div>
                       <span className="font-bold text-slate-800">{formatEuro(a.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabella Dettaglio Entrate del Mese */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">
              Movimenti Entrate - {selectedRecord?.meseDisplay} {selectedRecord?.anno}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Lista dei singoli flussi reali registrati per questo mese nel foglio Entrate.
            </p>
          </div>
          <div className="bg-slate-50 px-3 py-1 text-xs font-mono font-bold text-slate-600 rounded-lg">
            {activeMonthEntries.length} {activeMonthEntries.length === 1 ? 'movimento' : 'movimenti'}
          </div>
        </div>

        {activeMonthEntries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Nessun movimento di entrata inserito direttamente per questo mese.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Categoria / Causale</th>
                  <th className="py-3 px-4">Canale / Conto</th>
                  <th className="py-3 px-4">Note / Dettagli</th>
                  <th className="py-3 px-4 text-right">Importo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {activeMonthEntries.map((e, idx) => (
                  <tr key={e.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>{e.categoria || 'Generica'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-mono">
                        {e.conto || 'Altro'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-normal">
                      {e.dettagli || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 font-mono">
                      {formatEuro(e.importo)}
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
        transactions={drawerTransactions}
        stats={drawerStats}
      />
    </div>
  );
}