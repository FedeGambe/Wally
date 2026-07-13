/**
 * Pagina "Analisi Consumi": tracking dei rifornimenti/consumi dell'auto.
 * Legge i dati grezzi da useFinanceData() (foglio "AnalisiConsumi" del Google Sheet, chiave data.analisiConsumi)
 * e li trasforma in record settimanali con calcoli di km/litro, costo per 100km, km "persi" per
 * guida inefficiente, ecc. Ogni riga del foglio rappresenta una settimana/rifornimento.
 * Usa calcolaEsitiSettimanali (src/utils/esitoSettimanale.ts) per assegnare un giudizio testuale
 * a ciascuna settimana e kpiColorScale (src/utils/kpiColorScale.ts) per colorare le card KPI
 * in base alla posizione del valore rispetto alla mediana storica.
 * Mostra: riepilogo della settimana selezionata, grafici storici (km/lt, costo/100km, prezzo
 * carburante, costo extra, km persi) tutti cliccabili per cambiare la settimana selezionata.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Car, AlertOctagon, Gauge, Calendar, ChevronDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { useFinanceData } from '../context/FinanceDataContext';
import { calcolaEsitiSettimanali, EsitoSettimana } from '../utils/esitoSettimanale';
import { formatEuro } from '../utils/format';
import EuroAmount from '../components/EuroAmount';
import { kpiColorAlpha, kpiTextColor, median, KpiRange } from '../utils/kpiColorScale';

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

// Etichetta asse X compatta: solo mese abbreviato + anno a 2 cifre (es. "Gen W1 26" -> "Gen 26")
function formatSettimanaTick(value: string): string {
  const parts = String(value).split(' ');
  return parts.length === 3 ? `${parts[0]} ${parts[2]}` : value;
}

// Etichetta asse Y: massimo 2 cifre decimali
function formatAxisNumber(val: number): string {
  return Number(val).toLocaleString('it-IT', { maximumFractionDigits: 2 });
}
function formatAxisEuro(val: number): string {
  return `€${formatAxisNumber(val)}`;
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
  kmAlLitroAuto: number | null;
  euroPer100Km: number;
  kmPersi: number;
  efficienzaPercentuale: number;
  costoExtra: number;
  esitoSettimana: EsitoSettimana;
}

type TimeRange = 'storico' | '12mesi';
type ExtraMode = 'accumulato' | 'perKm';

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

// Toggle generico a segmenti, riusato per storico/12 mesi e per accumulato/per km
function SegmentedToggle<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700 select-none shrink-0">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-[9px] px-2.5 py-1 font-extrabold rounded-lg transition-all cursor-pointer ${
            value === opt.value ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-rose-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TimeRangeToggle({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <SegmentedToggle
      value={value}
      onChange={onChange}
      options={[{ value: 'storico', label: 'Storico' }, { value: '12mesi', label: 'Ultimi 12 Mesi' }]}
    />
  );
}

// Tooltip dedicato per Km/Lt: bianco per il valore calcolato, grigio per il dato di bordo auto
function KmLtTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', padding: '8px 12px' }}>
      <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{label}</div>
      {payload
        .filter((entry: any) => entry.value !== null && entry.value !== undefined)
        .map((entry: any) => (
          <div key={entry.dataKey} style={{ color: entry.dataKey === 'kmAlLitroAuto' ? '#94a3b8' : '#fff', fontSize: 12 }}>
            {entry.dataKey === 'kmAlLitroAuto' ? 'Km/Lt Auto' : 'Km/Lt'}: {entry.value} km/lt
          </div>
        ))}
    </div>
  );
}

interface AnalisiConsumiProps {
  goToTodaySignal?: number;
}

export default function AnalisiConsumi({ goToTodaySignal }: AnalisiConsumiProps) {
  const { data } = useFinanceData();

  // 1. Process and normalize the finance data
  // Tutti i valori numerici arrivano dal foglio come stringhe (o vuoti): qui li convertiamo con
  // Number(...) e usiamo "|| 0" come fallback per le celle mancanti. L'unica eccezione è
  // kmAlLitroAuto (vedi commento sotto), dove 0 è ambiguo e va trattato come "nessun dato".
  // Il ricalcolo avviene solo quando cambia data.analisiConsumi (nuova sincronizzazione dal foglio).
  const consumiRecords: RecordConsumo[] = useMemo(() => {
    const rawList = data.analisiConsumi || [];

    const parsedRecords = rawList
      .slice(1) // scarta la prima riga: sempre incompleta
      .filter((r: any) => r && (r.data || r.costo || r.kmEffettuati)) // filter empty rows
      .map((r: any, index: number) => {
        const parsedCosto = Number(r.costo || 0);
        const parsedKmEffettuati = Number(r.kmEffettuati || 0);
        const parsedKmLitro = Number(r.kmAlLitro || 0);
        // fetchSpreadsheetData normalizza le celle numeriche vuote a 0: un kmAlLitroAuto reale non è mai 0,
        // quindi 0 qui significa "nessun dato" (auto non ancora tracciata quella settimana).
        const rawKmLitroAuto = Number(r.kmAlLitroAuto || 0);
        const parsedKmLitroAuto = rawKmLitroAuto === 0 ? null : rawKmLitroAuto;
        const parsedEuroPer100Km = Number(r.euroPer100Km || 0);
        const parsedKmPersi = Number(r.kmPersi || 0);
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
          kmAlLitroAuto: parsedKmLitroAuto,
          euroPer100Km: parsedEuroPer100Km,
          kmPersi: parsedKmPersi,
          efficienzaPercentuale: parsedEfficienza,
          costoExtra: parsedCostoExtra
        };
      });

    const esiti = calcolaEsitiSettimanali(parsedRecords);
    return parsedRecords.map((r, index) => ({ ...r, esitoSettimana: esiti[index] }));
  }, [data.analisiConsumi]);

  // 2. Local selection state
  const [selectedWeekState, setSelectedWeekState] = useState<RecordConsumo | null>(null);
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);

  // Ogni volta che consumiRecords cambia (nuova sincronizzazione dal foglio) riallinea la settimana
  // selezionata: se la settimana che era selezionata esiste ancora nei nuovi dati la ritrova (stesso
  // data+settimana, per oggetto aggiornato), altrimenti seleziona di default l'ultima settimana disponibile.
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

  // Il pulsante "data odierna" dell'Header non ha un mese/anno da applicare qui:
  // per questa pagina equivale a saltare all'ultima settimana presente nei dati.
  useEffect(() => {
    if (goToTodaySignal && goToTodaySignal > 0 && consumiRecords.length > 0) {
      setSelectedWeekState(consumiRecords[consumiRecords.length - 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToTodaySignal]);

  // 3. Time range indipendente per ciascun grafico storico
  const [kmChartRange, setKmChartRange] = useState<TimeRange>('storico');
  const [kmLtChartRange, setKmLtChartRange] = useState<TimeRange>('storico');
  const [euro100ChartRange, setEuro100ChartRange] = useState<TimeRange>('storico');
  const [prezzoChartRange, setPrezzoChartRange] = useState<TimeRange>('storico');
  const [costoExtraChartRange, setCostoExtraChartRange] = useState<TimeRange>('storico');
  const [kmPersiChartRange, setKmPersiChartRange] = useState<TimeRange>('storico');
  const [extraMode, setExtraMode] = useState<ExtraMode>('accumulato');
  const isMobile = useIsMobile();

  const kmChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, kmChartRange), [consumiRecords, kmChartRange]);
  const kmLtChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, kmLtChartRange), [consumiRecords, kmLtChartRange]);
  const euro100ChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, euro100ChartRange), [consumiRecords, euro100ChartRange]);
  const prezzoChartData = useMemo(() => filtraUltimi12Mesi(consumiRecords, prezzoChartRange), [consumiRecords, prezzoChartRange]);

  // Costo extra e km persi: normalizzabili "per km" dividendo per i km effettuati nella settimana
  const applyExtraMode = (records: RecordConsumo[], field: 'costoExtra' | 'kmPersi') => {
    if (extraMode === 'accumulato') return records;
    return records.map(r => ({ ...r, [field]: (r[field] || 0) / (r.kmEffettuati || 1) }));
  };

  const costoExtraChartData = useMemo(
    () => applyExtraMode(filtraUltimi12Mesi(consumiRecords, costoExtraChartRange), 'costoExtra'),
    [consumiRecords, costoExtraChartRange, extraMode]
  );
  const kmPersiChartData = useMemo(
    () => applyExtraMode(filtraUltimi12Mesi(consumiRecords, kmPersiChartRange), 'kmPersi'),
    [consumiRecords, kmPersiChartRange, extraMode]
  );

  const selectedWeek = selectedWeekState || {
    settimana: 'N/D',
    data: '***',
    costo: 0,
    quantitaLitri: 0,
    prezzoAlLitro: 0,
    kmFinali: 0,
    kmEffettuati: 0,
    kmAlLitro: 0,
    kmAlLitroAuto: null,
    euroPer100Km: 0,
    kmPersi: 0,
    efficienzaPercentuale: 0,
    esitoSettimana: 'Nella media' as EsitoSettimana,
    costoExtra: 0
  };

  // Min/mediana/max storici per settimana, base della scala colore continua dei KPI
  const stats = useMemo(() => {
    const empty: KpiRange = { min: 0, median: 0, max: 0 };
    if (consumiRecords.length === 0) {
      return { costo100: empty, kmAlLitro: empty, costoExtra: empty, kmPersi: empty, efficienza: empty };
    }
    const rangeOf = (values: number[]): KpiRange => ({
      min: Math.min(...values),
      median: median(values),
      max: Math.max(...values)
    });
    return {
      costo100: rangeOf(consumiRecords.map(r => r.euroPer100Km)),
      kmAlLitro: rangeOf(consumiRecords.map(r => r.kmAlLitro)),
      costoExtra: rangeOf(consumiRecords.map(r => r.costoExtra)),
      kmPersi: rangeOf(consumiRecords.map(r => r.kmPersi)),
      efficienza: rangeOf(consumiRecords.map(r => r.efficienzaPercentuale))
    };
  }, [consumiRecords]);

  // Etichetta testuale posizione vs mediana (il colore, continuo, è calcolato a parte con kpiColor/kpiColorAlpha)
  const kpiLabel = (value: number, range: KpiRange, higherIsBetter: boolean, zeroLabel?: string): string => {
    if (isNaN(value)) return 'Dato non disponibile';
    if (zeroLabel !== undefined && value === 0) return zeroLabel;
    const span = range.max - range.min;
    const epsilon = span > 0 ? span * 0.05 : 0;
    const diff = higherIsBetter ? value - range.median : range.median - value;
    if (diff > epsilon) return 'Migliore della media';
    if (diff < -epsilon) return 'Peggiore della media';
    return 'Nella media';
  };

  // Stile inline per una card KPI: colore continuo (kpiColor/kpiColorAlpha) invece delle 3 fasce discrete
  const kpiCardStyle = (value: number, range: KpiRange, higherIsBetter: boolean) => {
    const r: KpiRange = { ...range, higherIsBetter };
    return {
      backgroundColor: kpiColorAlpha(value, r, 0.1),
      borderColor: kpiColorAlpha(value, r, 0.4),
      ['--glow' as string]: kpiColorAlpha(value, r, 0.55)
    } as React.CSSProperties;
  };
  const kpiTextStyle = (value: number, range: KpiRange, higherIsBetter: boolean): React.CSSProperties => ({
    color: kpiTextColor(value, { ...range, higherIsBetter })
  });


  // kmLt: più alto è meglio. costo100/costoExtra/kmPersi: più basso è meglio.
  const kmLtLabel = kpiLabel(selectedWeek.kmAlLitro, stats.kmAlLitro, true);
  const cost100Label = kpiLabel(selectedWeek.euroPer100Km, stats.costo100, false);
  const kmPersiLabel = kpiLabel(selectedWeek.kmPersi, stats.kmPersi, false, 'Nessun Km Perso');
  const costoExtraLabel = kpiLabel(selectedWeek.costoExtra, stats.costoExtra, false, 'Nessun Costo Extra');

  // Settimana precedente a quella selezionata, per il confronto km/litri/prezzo
  const selectedWeekIndex = selectedWeekState
    ? consumiRecords.findIndex(r => r.data === selectedWeekState.data && r.settimana === selectedWeekState.settimana)
    : -1;
  const previousWeek = selectedWeekIndex > 0 ? consumiRecords[selectedWeekIndex - 1] : null;
  const kmDelta = previousWeek ? selectedWeek.kmEffettuati - previousWeek.kmEffettuati : null;
  const litriDelta = previousWeek ? selectedWeek.quantitaLitri - previousWeek.quantitaLitri : null;
  const prezzoDelta = previousWeek ? selectedWeek.prezzoAlLitro - previousWeek.prezzoAlLitro : null;

  // Km/litri in più sono "peggio" (rosso); il prezzo al litro segue la logica opposta (in calo è "peggio")
  const deltaClass = (delta: number, dangerWhenPositive: boolean) => {
    const isDanger = dangerWhenPositive ? delta >= 0 : delta < 0;
    return isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
  };

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

      {/* RIEPILOGO SETTIMANALE: header a tutta larghezza + 3 sotto-widget + analisi */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-left">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base">Riepilogo Settimanale</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{selectedWeek.settimana} · Andamento consumi e inefficienze</p>
          </div>
          <div className="flex items-center gap-8 pr-4">
            <span
              className="px-4 py-1.5 rounded-full text-sm uppercase tracking-wider font-bold text-white transition-all"
              style={{
                backgroundColor: kpiTextColor(selectedWeek.efficienzaPercentuale, { ...stats.efficienza, higherIsBetter: true }),
                boxShadow: `0 0 20px -3px ${kpiColorAlpha(selectedWeek.efficienzaPercentuale, { ...stats.efficienza, higherIsBetter: true }, 0.65)}`
              }}
            >
              {selectedWeek.esitoSettimana}
            </span>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Punteggio</span>
              <span className="text-xl font-black font-display text-slate-800 dark:text-slate-100">
                {typeof selectedWeek.efficienzaPercentuale === 'number' && !isNaN(selectedWeek.efficienzaPercentuale) ? selectedWeek.efficienzaPercentuale.toFixed(2) : '***'}
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500"> /1</span>
              </span>
            </div>

            {/* Selettore settimana: stesso design/layout del selettore Anno globale in Header */}
            <div className="relative select-none shrink-0">
              <button
                onClick={() => setIsWeekDropdownOpen(o => !o)}
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Sett.: <strong className="text-rose-600 dark:text-rose-400">{selectedWeek.settimana}</strong>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isWeekDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-36 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 animate-fadeIn">
                  {[...consumiRecords].reverse().map((r) => (
                    <button
                      key={`${r.settimana}-${r.data}`}
                      onClick={() => {
                        setSelectedWeekState(r);
                        setIsWeekDropdownOpen(false);
                      }}
                      className={`px-3 py-1.5 text-left text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        selectedWeek.settimana === r.settimana && selectedWeek.data === r.data
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {r.settimana}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sotto-widget 1: Km Effettuati */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Chilometri Effettuati</span>
            <span className="text-4xl font-black font-display text-blue-600 dark:text-rose-400 mt-1 block">
              {selectedWeek.kmEffettuati} <span className="text-lg font-medium text-slate-400 dark:text-slate-500">Km</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 block font-mono">
              Rifornimento: {selectedWeek.data} • {selectedWeek.quantitaLitri} Lt • {selectedWeek.prezzoAlLitro} €/Lt
            </span>
            {previousWeek && (
              <div className="mt-1.5 space-y-0.5">
                {kmDelta !== null && (
                  <span className={`text-[10px] block ${deltaClass(kmDelta, true)}`}>
                    <span className="font-bold">{kmDelta >= 0 ? '▲' : '▼'} {Math.abs(kmDelta)} km</span> vs sett. precedente
                  </span>
                )}
                {litriDelta !== null && (
                  <span className={`text-[10px] block ${deltaClass(litriDelta, true)}`}>
                    <span className="font-bold">{litriDelta >= 0 ? '▲' : '▼'} {Math.abs(litriDelta).toFixed(1)} Lt</span> vs sett. precedente
                  </span>
                )}
                {prezzoDelta !== null && (
                  <span className={`text-[10px] block ${deltaClass(prezzoDelta, true)}`}>
                    <span className="font-bold">{prezzoDelta >= 0 ? '▲' : '▼'} {Math.abs(prezzoDelta).toFixed(3)} €/Lt</span> vs sett. precedente
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sotto-widget 2: Consumo medio e costo */}
          <div className="h-full flex flex-col gap-3">
            <div
              className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
              style={kpiCardStyle(selectedWeek.kmAlLitro, stats.kmAlLitro, true)}
            >
              <div className="col-span-2 h-full flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider block">Consumo medio (Km/Lt)</span>
                <span className="text-xl font-bold font-display block">
                  {typeof selectedWeek.kmAlLitro === 'number' && !isNaN(selectedWeek.kmAlLitro) ? selectedWeek.kmAlLitro.toFixed(1) + ' km/lt' : '***'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.kmAlLitro, stats.kmAlLitro, true)}>{kmLtLabel}</span>
                <span className="text-xs font-mono opacity-70 block">{stats.kmAlLitro.median.toFixed(1)} km/lt</span>
              </div>
            </div>
            <div
              className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
              style={kpiCardStyle(selectedWeek.euroPer100Km, stats.costo100, false)}
            >
              <div className="col-span-2 h-full flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider block">Costo / 100 Km</span>
                <span className="text-xl font-bold font-display block"><EuroAmount value={selectedWeek.euroPer100Km} /></span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.euroPer100Km, stats.costo100, false)}>{cost100Label}</span>
                <span className="text-xs font-mono opacity-70 block">{formatEuro(stats.costo100.median)}</span>
              </div>
            </div>
          </div>

          {/* Sotto-widget 3: Incurrenza e costo extra */}
          <div className="h-full flex flex-col gap-3">
            <div
              className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
              style={kpiCardStyle(selectedWeek.kmPersi, stats.kmPersi, false)}
            >
              <div className="col-span-2 h-full flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider block">Km Persi (Incurrenza)</span>
                <span className="text-xl font-bold font-display block">
                  {typeof selectedWeek.kmPersi === 'number' && !isNaN(selectedWeek.kmPersi) ? selectedWeek.kmPersi.toFixed(1) + ' km' : '***'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.kmPersi, stats.kmPersi, false)}>{kmPersiLabel}</span>
                <span className="text-xs font-mono opacity-70 block">{stats.kmPersi.median.toFixed(1)} km</span>
              </div>
            </div>
            <div
              className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
              style={kpiCardStyle(selectedWeek.costoExtra, stats.costoExtra, false)}
            >
              <div className="col-span-2 h-full flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider block">Costo Extra</span>
                <span className="text-xl font-bold font-display block"><EuroAmount value={selectedWeek.costoExtra} /></span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.costoExtra, stats.costoExtra, false)}>{costoExtraLabel}</span>
                <span className="text-xs font-mono opacity-70 block">{formatEuro(stats.costoExtra.median)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 px-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-bold block mb-0.5 text-rose-600 dark:text-rose-400">💡 Analisi per Federico:</span>
          I KPI e le colorazioni sono valutati automaticamente rispetto alla tua mediana storica di consumo carburante ({typeof stats.kmAlLitro.median === 'number' && !isNaN(stats.kmAlLitro.median) ? stats.kmAlLitro.median.toFixed(1) + ' km/lt' : '***'}).
        </div>
      </div>

      {/* CONTENITORE 1: Efficienza di Marcia */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-left">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm flex items-center gap-1.5 mb-4">
          <Gauge className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
          Efficienza di Marcia
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Km / Litro */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 font-display text-xs">Evoluzione Km / Litro</h4>
              <TimeRangeToggle value={kmLtChartRange} onChange={setKmLtChartRange} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Km/lt calcolato (verde/rosso vs media) e km/lt bordo auto (grigio)</p>
            <div className="h-44">
              {kmLtChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={kmLtChartData}
                    margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorKmAlLitro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 40 : 60} tickFormatter={formatAxisNumber} domain={[(dataMin: number) => Math.max(0, dataMin - 0.75), (dataMax: number) => dataMax + 0.75]} />
                    <Tooltip content={<KmLtTooltip />} />
                    <Line type="monotone" dataKey="kmAlLitroAuto" stroke="#94a3b8" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="kmAlLitro" stroke="url(#colorKmAlLitro)" strokeWidth={2.5} fill="url(#colorKmAlLitro)" fillOpacity={0.18} dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* €/100km */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 font-display text-xs">Costo per 100 Km</h4>
              <TimeRangeToggle value={euro100ChartRange} onChange={setEuro100ChartRange} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Spesa carburante normalizzata ogni 100 km percorsi</p>
            <div className="h-44">
              {euro100ChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={euro100ChartData}
                    margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorEuro100" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 44 : 60} tickFormatter={formatAxisEuro} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#f59e0b' }}
                      formatter={(value: any) => [formatEuro(value), '€/100km']}
                    />
                    <Area type="monotone" dataKey="euroPer100Km" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEuro100)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENITORE 2: Percorrenza & Prezzo Carburante */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-left">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm flex items-center gap-1.5 mb-4">
          <Car className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
          Percorrenza & Prezzo Carburante
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Km settimanali */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 font-display text-xs">Chilometri Percorsi per Settimana</h4>
              <TimeRangeToggle value={kmChartRange} onChange={setKmChartRange} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Grafico storico della mobilità settimanale. Clicca sui punti per ispezionare.</p>
            <div className="h-44">
              {kmChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={kmChartData}
                    margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorKmEffettuati" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 40 : 60} tickFormatter={formatAxisNumber} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fda4af' }}
                      formatter={(value: any) => [`${value} Km`, 'Km Effettuati']}
                    />
                    <Area
                      type="monotone"
                      dataKey="kmEffettuati"
                      name="Km percorsi"
                      stroke="#e11d48"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorKmEffettuati)"
                      dot={false}
                      activeDot={{ r: 6, fill: '#e11d48', cursor: 'pointer' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* €/Lt */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 font-display text-xs">Andamento Prezzo Carburante (€/Lt)</h4>
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
                    margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorPrezzoAlLitro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 44 : 60} tickFormatter={formatAxisEuro} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
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
      </div>

      {/* CONTENITORE 3: Costo Extra & Km Persi */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-left">
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-sm flex items-center gap-1.5">
            <AlertOctagon className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
            Costo Extra & Km Persi
          </h3>
          <SegmentedToggle<ExtraMode>
            value={extraMode}
            onChange={setExtraMode}
            options={[{ value: 'accumulato', label: 'Accumulato' }, { value: 'perKm', label: '€/Km' }]}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Costo extra */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 font-display text-xs">Costo Extra da Inefficienza Carburante</h4>
              <TimeRangeToggle value={costoExtraChartRange} onChange={setCostoExtraChartRange} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Costo in euro (€) dovuto ad andamento guida inefficiente sopra la media consigliata</p>
            <div className="h-44">
              {costoExtraChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={costoExtraChartData}
                    margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorCostoExtra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 44 : 60} tickFormatter={formatAxisEuro} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#f97316' }}
                      formatter={(value: any) => [
                        extraMode === 'perKm'
                          ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(value))
                          : formatEuro(value),
                        extraMode === 'perKm' ? 'Costo Extra/Km' : 'Costo Extra'
                      ]}
                    />
                    <Area type="monotone" dataKey="costoExtra" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCostoExtra)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Km persi */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 font-display text-xs">Km Persi per Inefficienza</h4>
              <TimeRangeToggle value={kmPersiChartRange} onChange={setKmPersiChartRange} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Chilometri "persi" per uno stile di guida sopra la media consigliata</p>
            <div className="h-44">
              {kmPersiChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={kmPersiChartData}
                    margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                    onClick={handleChartClick}
                  >
                    <defs>
                      <linearGradient id="colorKmPersi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                    <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 40 : 60} tickFormatter={formatAxisNumber} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fda4af' }}
                      formatter={(value: any) => [`${Number(value).toFixed(1)} Km`, extraMode === 'perKm' ? 'Km Persi/Km' : 'Km Persi']}
                    />
                    <Area type="monotone" dataKey="kmPersi" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKmPersi)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
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
