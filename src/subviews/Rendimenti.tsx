import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, BarChart3, Euro, Percent, Wallet, Award, ChevronUp, Database, ChevronDown, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import EuroAmount from '../components/EuroAmount';
import DropdownMenu from '../components/DropdownMenu';
import { rendColor, rendColorAlpha, formatAxisCompact } from '../utils/format';
import { kpiColor, kpiColorAlpha, median, type KpiRange } from '../utils/kpiColorScale';
import { parseMeseStringToMonthYear } from '../hooks/useInvestimentiData';
import { useIsMobile } from '../hooks/useIsMobile';

// Sotto-vista "Rendimenti" della pagina Investimenti: si concentra sull'andamento
// del rendimento (plus/minusvalenza) del portafoglio nel tempo, in euro o in percentuale.
// Dati usati: localRendimenti/activeRendimenti (righe mensili di rendimento), CRUSCOTTO_GENERALE
// (totali cumulati di sempre), cruscottoRows (storico annuale) e globalInspectorRecord (il mese
// selezionato nel filtro globale dell'header).
// Contenuti principali:
//  - 4 KPI (Portafoglio Attuale, Plusvalenza Cumulata, Rendimento Anno, Ultimo Mese)
//  - 2 grafici affiancati: "Crescita Rendimento" (cumulato, area+linea) e "Rendimenti Mensili" (barre)
//  - tabella "Registro Rendimenti" filtrabile per anno con colori in base a quanto un valore
//    si discosta dalla mediana storica (vedi kpiColorScale)
interface RendimentiProps {
  localRendimenti: any[];
  activeRendimenti: any[];
  CRUSCOTTO_GENERALE: any;
  globalSelectedYear: string;
  lastValidRendimento: any;
  globalInspectorRecord: any;
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
  globalSelectedYear,
  lastValidRendimento,
  globalInspectorRecord,
  cruscottoRows,
  formatEuro,
  formatPercent,
}: RendimentiProps) {
  const [crescitaRange, setCrescitaRange] = useState<TimeRange>('storico');
  const [mensileRange, setMensileRange] = useState<TimeRange>('12mesi');
  const [valueMode, setValueMode] = useState<ValueMode>('euro');
  const [tableYear, setTableYear] = useState(globalSelectedYear);
  const isMobile = useIsMobile();

  useEffect(() => setTableYear(globalSelectedYear), [globalSelectedYear]);

  // "Ultimi 12 Mesi" ancorati al filtro globale mese/anno: 12 mesi consecutivi che finiscono al mese
  // della data impostata nell'header (globalInspectorRecord), a meno che sia il mese attuale (senza dati),
  // nel qual caso globalInspectorRecord e' gia' risolto al mese precedente. Niente lookahead sui mesi
  // successivi (a differenza di globalFocusRendimenti usato dal Cruscotto, pensato per una finestra centrata).
  const last12MonthsRendimenti = useMemo(() => {
    if (!globalInspectorRecord) return activeRendimenti.slice(-12);
    const idx = activeRendimenti.findIndex(
      (r: any) => r.mese.toLowerCase().trim() === globalInspectorRecord.mese.toLowerCase().trim()
    );
    if (idx === -1) return activeRendimenti.slice(-12);
    return activeRendimenti.slice(Math.max(0, idx - 11), idx + 1);
  }, [activeRendimenti, globalInspectorRecord]);

  const crescitaData = useMemo(
    () => (crescitaRange === 'storico' ? activeRendimenti : last12MonthsRendimenti),
    [crescitaRange, activeRendimenti, last12MonthsRendimenti]
  );
  const mensileData = useMemo(
    () => (mensileRange === 'storico' ? activeRendimenti : last12MonthsRendimenti),
    [mensileRange, activeRendimenti, last12MonthsRendimenti]
  );

  // Il toggle Euro/Percentuale sceglie quale campo del record diventa la serie principale
  // dei grafici (crescitaKey/mensileKey) e quale diventa la serie secondaria in grigio tratteggiato.
  const crescitaKey = valueMode === 'euro' ? 'rendimentoCumulativoEuro' : 'rendimentoCumulativoPerc';
  const crescitaSecondaryKey = valueMode === 'euro' ? 'rendimentoCumulativoPerc' : 'rendimentoCumulativoEuro';
  const mensileKey = valueMode === 'euro' ? 'rendimentoMensileEuro' : 'rendimentoMensilePerc';
  // Massimo assoluto per ciascun asse: decide se può usare la notazione compatta
  // "k" su mobile (vedi formatAxisCompact in utils/format.ts), uno per grafico
  // perché "Crescita" e "Rendimenti Mensili" hanno scale indipendenti.
  const crescitaMaxAbs = useMemo(
    () => crescitaData.reduce((m: number, r: any) => Math.max(m, Math.abs(Number(r[crescitaKey]) || 0)), 0),
    [crescitaData, crescitaKey]
  );
  const mensileMaxAbs = useMemo(
    () => mensileData.reduce((m: number, r: any) => Math.max(m, Math.abs(Number(r[mensileKey]) || 0)), 0),
    [mensileData, mensileKey]
  );
  const makeAxisFormatter = (maxAbs: number) => (val: any) => {
    if (valueMode !== 'euro') return `${Number(val).toLocaleString('it-IT')}%`;
    if (isMobile) return formatAxisCompact(val, maxAbs);
    return `€${Number(val).toLocaleString('it-IT')}`;
  };
  const crescitaAxisFormatter = makeAxisFormatter(crescitaMaxAbs);
  const mensileAxisFormatter = makeAxisFormatter(mensileMaxAbs);
  const tooltipFormatter = (value: any) => (valueMode === 'euro' ? formatEuro(value) : formatPercent(value));
  const crescitaTooltipFormatter = (value: any, name: any) => {
    const isPercentSeries = name === 'Cumulato %';
    return [isPercentSeries ? formatPercent(value) : formatEuro(value), name];
  };

  // Elenco degli anni con almeno una riga di dati, per popolare il dropdown "Esercizio" della tabella.
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    localRendimenti.forEach((r: any) => {
      const p = parseMeseStringToMonthYear(r.mese);
      if (p) years.add(p.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [localRendimenti]);

  // Righe della tabella "Registro Rendimenti" filtrate per l'anno scelto nel dropdown (tableYear)
  // e ordinate dal mese più recente al più vecchio.
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

  // Riga cruscotto dell'anno mostrato nel Registro Rendimenti (tableYear): guida anche titolo e box
  // "Performance Anno"/"Rendimento", cosi il dropdown "Esercizio" e' l'unica fonte di verita per l'anno
  // (prima title e box restavano sull'anno globale della pagina, ignorando questo dropdown locale).
  const tableYearRow = useMemo(
    () => cruscottoRows.find((r: any) => Number(r.anno) === Number(tableYear)) || cruscottoRows[0] || {},
    [cruscottoRows, tableYear]
  );

  const previousYearRow = useMemo(
    () => cruscottoRows.find((r: any) => Number(r.anno) === Number(tableYear) - 1),
    [cruscottoRows, tableYear]
  );
  const annualUp = !previousYearRow || Number(tableYearRow.rendimentoAnnualeEuro || 0) >= Number(previousYearRow.rendimentoAnnualeEuro || 0);
  const annualDelta = Number(tableYearRow.rendimentoAnnualeEuro || 0) - Number(previousYearRow?.rendimentoAnnualeEuro || 0);

  // Ultimo mese valido DENTRO l'anno mostrato: serve solo per stimare quanti mesi dell'anno sono
  // trascorsi (proiezione % annua sotto). Il widget "Ultimo Mese" a video usa invece globalInspectorRecord,
  // che segue il mese/anno selezionati globalmente (con fallback al mese precedente se quello corrente
  // non ha ancora dati, esattamente come nel Cruscotto).
  const lastValidForTableYear = useMemo(() => {
    for (const r of tableRows) {
      if (r && r.mese && r.rendimentoMensileEuro !== null && r.rendimentoMensileEuro !== undefined && r.rendimentoMensileEuro !== 0) {
        return r;
      }
    }
    return tableRows[0] || null;
  }, [tableRows]);

  const previousMonthRecord = useMemo(() => {
    if (!globalInspectorRecord) return null;
    const idx = localRendimenti.findIndex((r: any) => r.mese === globalInspectorRecord.mese);
    return idx > 0 ? localRendimenti[idx - 1] : null;
  }, [localRendimenti, globalInspectorRecord]);
  const monthlyUp = !previousMonthRecord || Number(globalInspectorRecord?.rendimentoMensileEuro || 0) >= Number(previousMonthRecord.rendimentoMensileEuro || 0);
  const monthlyDelta = Number(globalInspectorRecord?.rendimentoMensileEuro || 0) - Number(previousMonthRecord?.rendimentoMensileEuro || 0);

  // Range (min/mediana/max) del rendimento mensile % nell'anno mostrato in tabella: usato da
  // kpiColor per colorare ogni valore in base a quanto è buono/cattivo rispetto agli altri mesi.
  const mensilePercRange: KpiRange = useMemo(() => {
    const values = tableRows.map((r: any) => Number(r.rendimentoMensilePerc || 0)).filter(v => !isNaN(v));
    if (values.length === 0) return { min: -1, median: 0, max: 1 };
    return { min: Math.min(...values), median: median(values), max: Math.max(...values) };
  }, [tableRows]);

  // Stesso concetto ma sul rendimento cumulativo %, calcolato su tutto lo storico (non solo l'anno
  // in tabella), perché il cumulato va confrontato con l'andamento di sempre, non con un solo anno.
  const cumulativoPercRange: KpiRange = useMemo(() => {
    const values = localRendimenti.map((r: any) => Number(r.rendimentoCumulativoPerc || 0)).filter(v => !isNaN(v));
    if (values.length === 0) return { min: -1, median: 0, max: 1 };
    return { min: Math.min(...values), median: median(values), max: Math.max(...values) };
  }, [localRendimenti]);

  // Rendimento annuo: scala dedicata segno+intensità (verde positivo/rosso negativo/giallo zero),
  // non la scala kpiColorScale condivisa. Confronta sulla stessa metrica mostrata a video
  // (rendimentoAnnualeEuro, non la %): confrontare basi diverse (es. % annualizzata sempre a 12 mesi
  // contro un valore mostrato diverso) falsava il ranking tra anni con capitale investito differente.
  const annualEuroPositiveMax = useMemo(() => {
    const values = cruscottoRows.map((r: any) => Number(r.rendimentoAnnualeEuro || 0)).filter(v => !isNaN(v) && v > 0);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [cruscottoRows]);

  const annualEuroNegativeMin = useMemo(() => {
    const values = cruscottoRows.map((r: any) => Number(r.rendimentoAnnualeEuro || 0)).filter(v => !isNaN(v) && v < 0);
    return values.length > 0 ? Math.min(...values) : -1;
  }, [cruscottoRows]);

  const normalizeAnnual = (value: number): number => {
    if (value >= 0) return annualEuroPositiveMax > 0 ? Math.min(1, value / annualEuroPositiveMax) : 0;
    return annualEuroNegativeMin < 0 ? Math.max(-1, value / Math.abs(annualEuroNegativeMin)) : 0;
  };

  // Il badge "Variazione annuale" mostra una %, non un importo: va confrontato contro le percentuali
  // annuali degli altri anni (rendimentoAnnuoStimatoPerc), non contro la stessa scala € del valore sopra.
  const annualPercPositiveMax = useMemo(() => {
    const values = cruscottoRows.map((r: any) => Number(r.rendimentoAnnuoStimatoPerc || 0)).filter(v => !isNaN(v) && v > 0);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [cruscottoRows]);

  const annualPercNegativeMin = useMemo(() => {
    const values = cruscottoRows.map((r: any) => Number(r.rendimentoAnnuoStimatoPerc || 0)).filter(v => !isNaN(v) && v < 0);
    return values.length > 0 ? Math.min(...values) : -1;
  }, [cruscottoRows]);

  const normalizeAnnualPerc = (value: number): number => {
    if (value >= 0) return annualPercPositiveMax > 0 ? Math.min(1, value / annualPercPositiveMax) : 0;
    return annualPercNegativeMin < 0 ? Math.max(-1, value / Math.abs(annualPercNegativeMin)) : 0;
  };

  // Testo mostrato nel badge "Variazione annuale": per l'anno reale in corso, media mensile * mesi
  // realmente trascorsi (non ancora un anno intero); per un anno chiuso, mediaMensile*12 (=rendimentoAnnuoStimatoPerc).
  // Il COLORE resta sempre su rendimentoAnnuoStimatoPerc (sopra) per un confronto equo tra anni.
  const annualDisplayPerc = useMemo(() => {
    const isRealCurrentYear = Number(tableYear) === new Date().getFullYear();
    if (!isRealCurrentYear) return Number(tableYearRow.rendimentoAnnuoStimatoPerc || 0);
    const mediaMensile = Number(tableYearRow.rendimentoMedioMensilePerc || 0);
    const elapsedMonths = lastValidForTableYear ? (parseMeseStringToMonthYear(lastValidForTableYear.mese)?.month ?? 12) : 12;
    return mediaMensile * elapsedMonths;
  }, [tableYear, tableYearRow, lastValidForTableYear]);

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
            <div className="bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 text-white p-3 sm:p-5 rounded-2xl border border-sky-900 dark:border-sky-900 shadow-[0_0_15px_rgba(14,165,233,0.12)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_25px_rgba(14,165,233,0.3)] hover:border-sky-900/30 dark:hover:border-sky-800/25 hover:scale-[1.01]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-sky-300 font-extrabold uppercase tracking-wider block">Portafoglio Attuale</span>
                <div className="bg-sky-950/50 p-1 rounded-lg">
                  <Wallet className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-black font-display text-white block">
                  <EuroAmount value={CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + CRUSCOTTO_GENERALE.monetariInvestitoCum + CRUSCOTTO_GENERALE.rendimentoCumulativoEuro} />
                </span>
              </div>
              <div className="border-t border-sky-800/60 pt-2 mt-2">
                <p className="text-[10px] text-sky-300 font-medium">Investito:   <span className="text-[12px] font-bold text-white">{formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0))}</span></p>
              </div>
            </div>

            {/* Plusvalenza Cumulata Box */}
            <div className={`p-3 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${CRUSCOTTO_GENERALE.rendimentoCumulativoEuro >= 0
              ? 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-500/30 dark:border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_25px_rgba(16,185,129,0.32)] hover:border-emerald-500/15 dark:hover:border-emerald-500/10'
              : 'bg-white dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/60 shadow-xs hover:shadow-md'
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
                  <EuroAmount value={CRUSCOTTO_GENERALE.rendimentoCumulativoEuro} />
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px]">
                <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Rendimento Totale</span>
                <span className="text-[12px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-700/60 px-1.5 py-0.5 rounded-lg font-extrabold font-mono">
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
              Performance Anno {tableYear}
            </span>
            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
              Anno Selezionato
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-[#0c1425]/90 p-3 sm:p-5 pb-2 sm:pb-3 rounded-2xl border border-sky-900/60 shadow-xs flex flex-col">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider">Rendimento {tableYear}</span>
                <div className="bg-sky-950/50 p-1 rounded-lg">
                  <Award className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-extrabold font-display flex items-center gap-1" style={{ color: rendColor(normalizeAnnual(Number(tableYearRow.rendimentoAnnualeEuro || 0)), 1) }}>
                  {annualUp ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                  <EuroAmount value={tableYearRow.rendimentoAnnualeEuro} />
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
                    backgroundColor: rendColorAlpha(normalizeAnnualPerc(Number(tableYearRow.rendimentoAnnuoStimatoPerc || 0)), 0.15, 1),
                    borderColor: rendColor(normalizeAnnualPerc(Number(tableYearRow.rendimentoAnnuoStimatoPerc || 0)), 1),
                    color: rendColor(normalizeAnnualPerc(Number(tableYearRow.rendimentoAnnuoStimatoPerc || 0)), 1),
                    boxShadow: `0 0 10px ${rendColorAlpha(normalizeAnnualPerc(Number(tableYearRow.rendimentoAnnuoStimatoPerc || 0)), 0.45, 1)}`,
                  }}
                >
                  {formatPercent(annualDisplayPerc)}
                </span>
              </div>
            </div>

            <div className="bg-[#0c1425]/90 p-3 sm:p-5 pb-2 sm:pb-3 rounded-2xl border border-sky-900/60 shadow-xs flex flex-col">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider truncate">Ultimo Mese {globalInspectorRecord?.mese || 'N/D'}</span>
                <div className="bg-sky-950/50 p-1 rounded-lg shrink-0">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-extrabold font-display flex items-center gap-1" style={{ color: kpiColor(Number(globalInspectorRecord?.rendimentoMensilePerc || 0), mensilePercRange) }}>
                  {monthlyUp ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                  <EuroAmount value={globalInspectorRecord?.rendimentoMensileEuro} />
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
                    backgroundColor: kpiColorAlpha(Number(globalInspectorRecord?.rendimentoMensilePerc || 0), mensilePercRange, 0.15),
                    borderColor: kpiColor(Number(globalInspectorRecord?.rendimentoMensilePerc || 0), mensilePercRange),
                    color: kpiColor(Number(globalInspectorRecord?.rendimentoMensilePerc || 0), mensilePercRange),
                    boxShadow: `0 0 10px ${kpiColorAlpha(Number(globalInspectorRecord?.rendimentoMensilePerc || 0), mensilePercRange, 0.45)}`,
                  }}
                >
                  {formatPercent(globalInspectorRecord?.rendimentoMensilePerc)}
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
                  className={`flex-1 text-center whitespace-nowrap text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${crescitaRange === 'storico' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  Storico
                </button>
                <button
                  onClick={() => setCrescitaRange('12mesi')}
                  className={`flex-1 text-center whitespace-nowrap text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${crescitaRange === '12mesi' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  <span className="sm:hidden">Ultimi 12 M.</span>
                  <span className="hidden sm:inline">Ultimi 12 Mesi</span>
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
                <ComposedChart data={crescitaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCrescitaLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(7 207 150)" />
                      <stop offset="50%" stopColor="rgb(163 230 53)" />
                      <stop offset="60%" stopColor="rgb(251 191 36)" />
                      <stop offset="75%" stopColor="rgb(249 115 22)" />
                      <stop offset="100%" stopColor="rgb(187 27 27)" />
                    </linearGradient>
                    <linearGradient id="colorCrescitaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(7 207 150)" stopOpacity={0.22} />
                      <stop offset="50%" stopColor="rgb(163 230 53)" stopOpacity={0.16} />
                      <stop offset="60%" stopColor="rgb(251 191 36)" stopOpacity={0.12} />
                      <stop offset="75%" stopColor="rgb(249 115 22)" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="rgb(187 27 27)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} width={isMobile ? 42 : 60} tickFormatter={crescitaAxisFormatter} />
                  <YAxis yAxisId="right" orientation="right" hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={crescitaTooltipFormatter}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey={crescitaKey}
                    name={valueMode === 'euro' ? 'Cumulato €' : 'Cumulato %'}
                    stroke="url(#colorCrescitaLine)"
                    strokeWidth={3}
                    fill="url(#colorCrescitaFill)"
                    fillOpacity={1}
                    dot={false}
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
                </ComposedChart>
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
                  className={`flex-1 text-center whitespace-nowrap text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${mensileRange === 'storico' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  Storico
                </button>
                <button
                  onClick={() => setMensileRange('12mesi')}
                  className={`flex-1 text-center whitespace-nowrap text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${mensileRange === '12mesi' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  <span className="sm:hidden">Ultimi 12 M.</span>
                  <span className="hidden sm:inline">Ultimi 12 Mesi</span>
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
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} width={isMobile ? 42 : 60} tickFormatter={mensileAxisFormatter} />
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
          <DropdownMenu
            icon={Database}
            label="Esercizio"
            accent="blue"
            value={String(tableYear)}
            displayValue={String(tableYear)}
            options={availableYears.map(String)}
            onSelect={setTableYear}
            align="right"
            widthClass="w-28"
          />
        </div>

        {tableRows.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Nessun dato disponibile per l'anno {tableYear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mese</th>
                  <th className="py-3 px-4 text-right">Mensile €</th>
                  <th className="py-3 px-4 text-right">Mensile %</th>
                  <th className="py-3 px-4 text-right">Inv. Mese</th>
                  <th className="py-3 px-4 text-right">Cumul. €</th>
                  <th className="py-3 px-4 text-right">Cumul. %</th>
                  <th className="py-3 px-4 text-right">Investito</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs">
                {tableRows.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 capitalize">{r.mese}</td>
                    <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: kpiColor(Number(r.rendimentoMensilePerc || 0), mensilePercRange) }}>
                      {Number(r.rendimentoMensileEuro || 0) >= 0 ? '+' : ''}{formatEuro(r.rendimentoMensileEuro)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: kpiColor(Number(r.rendimentoMensilePerc || 0), mensilePercRange) }}>
                      {formatPercent(r.rendimentoMensilePerc)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">{formatEuro(r.importoMensileInvestito)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: kpiColor(Number(r.rendimentoCumulativoPerc || 0), cumulativoPercRange) }}>
                      {Number(r.rendimentoCumulativoEuro || 0) >= 0 ? '+' : ''}{formatEuro(r.rendimentoCumulativoEuro)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: kpiColor(Number(r.rendimentoCumulativoPerc || 0), cumulativoPercRange) }}>
                      {formatPercent(r.rendimentoCumulativoPerc)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">{formatEuro(r.importoInvestitoCumulato)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100">{formatEuro(r.valoreAttualePortafoglio)}</td>
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
