import { useState, useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { calcolaEsitiSettimanali, EsitoSettimana } from '../utils/esitoSettimanale';
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

export function toDate(dataStr: string): Date | null {
  const p = parseDataConsumo(dataStr);
  return p ? new Date(p.year, p.month - 1, p.day) : null;
}

// Le "settimane" di Analisi Consumi vanno da martedì a lunedì (non lunedì-domenica):
// ogni data viene ancorata al martedì della sua settimana, traslando indietro di
// (giorno_settimana - martedì) giorni. getDay(): 0=domenica..6=sabato, martedì=2.
function getAnchorTuesday(date: Date): Date {
  const offset = (date.getDay() - 2 + 7) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

function formatDataIT(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

// Label del tipo "11 Ago 26" dal martedì di ancoraggio della settimana.
function getWeekLabel(anchor: Date): string {
  const meseAbbr = MESI_ABBR[anchor.getMonth()] || 'Mese';
  const annoBreve = String(anchor.getFullYear()).slice(-2);
  return `${anchor.getDate()} ${meseAbbr} ${annoBreve}`;
}

function weightedAverage(items: { value: number; weight: number }[]): number {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((s, i) => s + i.value * i.weight, 0) / totalWeight;
}

export interface RecordConsumo {
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

export type TimeRange = 'storico' | '12mesi';
export type ExtraMode = 'accumulato' | 'perKm';

export function filtraUltimi12Mesi(records: RecordConsumo[], range: TimeRange): RecordConsumo[] {
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

const FALLBACK_WEEK: RecordConsumo = {
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

/**
 * Hook usato dalla pagina AnalisiConsumi (src/pages/AnalisiConsumi.tsx). Legge
 * i dati grezzi da useFinanceData() (foglio "AnalisiConsumi") e li trasforma in
 * record settimanali con calcoli di km/litro, costo per 100km, km "persi" per
 * guida inefficiente, ecc. Gestisce anche la settimana selezionata, i range
 * temporali indipendenti di ciascun grafico storico e le statistiche/etichette
 * KPI (posizione vs mediana storica) usate per colorare le card.
 */
export function useAnalisiConsumiData(goToTodaySignal?: number) {
  const { data } = useFinanceData();

  // 1. Process and normalize the finance data
  // Tutti i valori numerici arrivano dal foglio come stringhe (o vuoti): qui li convertiamo con
  // Number(...) e usiamo "|| 0" come fallback per le celle mancanti. L'unica eccezione è
  // kmAlLitroAuto (vedi commento sotto), dove 0 è ambiguo e va trattato come "nessun dato".
  // Il ricalcolo avviene solo quando cambia data.analisiConsumi (nuova sincronizzazione dal foglio).
  const consumiRecords: RecordConsumo[] = useMemo(() => {
    const rawList = data.analisiConsumi || [];

    // Il foglio ha una riga per rifornimento (non per settimana): la parsiamo così com'è,
    // l'aggregazione per settimana avviene subito dopo.
    const parsedRows = rawList
      .slice(1) // scarta la prima riga: sempre incompleta
      .filter((r: any) => r && (r.data || r.costo || r.kmEffettuati)) // filter empty rows
      .map((r: any) => ({
        date: toDate(String(r.data || '')),
        costo: Number(r.costo || 0),
        quantitaLitri: Number(r.quantitaLitri || 0),
        prezzoAlLitro: Number(r.prezzoAlLitro || 0),
        kmFinali: Number(r.kmFinali || 0),
        kmEffettuati: Number(r.kmEffettuati || 0),
        // fetchSpreadsheetData normalizza le celle numeriche vuote a 0: un kmAlLitroAuto reale non è mai 0,
        // quindi 0 qui significa "nessun dato" (auto non ancora tracciata quel rifornimento).
        kmAlLitroAuto: (() => { const v = Number(r.kmAlLitroAuto || 0); return v === 0 ? null : v; })(),
        efficienzaPercentuale: Number(r.efficienzaPercentuale || 0)
      }))
      .filter((r): r is typeof r & { date: Date } => r.date !== null);

    // Raggruppa i rifornimenti per settimana (martedì-lunedì, vedi getAnchorTuesday): più
    // rifornimenti nella stessa settimana diventano un solo punto dati per grafici/KPI.
    const gruppi = new Map<string, typeof parsedRows>();
    parsedRows.forEach(r => {
      const key = getAnchorTuesday(r.date).toISOString();
      if (!gruppi.has(key)) gruppi.set(key, []);
      gruppi.get(key)!.push(r);
    });

    // Prima passata: aggrega i campi "base" per settimana — costo/litri/km effettuati sommati,
    // prezzo/efficienza in media pesata sui litri (rifornimenti più grandi pesano di più), km
    // finali e data presi dal rifornimento più recente della settimana.
    const settimaneBase = Array.from(gruppi.entries())
      .map(([key, righe]) => {
        const ordinate = [...righe].sort((a, b) => a.date.getTime() - b.date.getTime());
        const totaleLitri = ordinate.reduce((s, r) => s + r.quantitaLitri, 0);
        const costo = ordinate.reduce((s, r) => s + r.costo, 0);
        const kmEffettuati = ordinate.reduce((s, r) => s + r.kmEffettuati, 0);
        const prezzoAlLitro = weightedAverage(ordinate.map(r => ({ value: r.prezzoAlLitro, weight: r.quantitaLitri })));
        const efficienzaPercentuale = weightedAverage(ordinate.map(r => ({ value: r.efficienzaPercentuale, weight: r.quantitaLitri })));
        const ultimo = ordinate[ordinate.length - 1];
        const kmAlLitroAutoValidi = ordinate.filter(r => r.kmAlLitroAuto !== null);
        const kmAlLitroAuto = kmAlLitroAutoValidi.length > 0 ? kmAlLitroAutoValidi[kmAlLitroAutoValidi.length - 1].kmAlLitroAuto : null;
        return {
          anchorTime: new Date(key).getTime(),
          settimana: getWeekLabel(new Date(key)),
          data: formatDataIT(ultimo.date),
          costo,
          quantitaLitri: totaleLitri,
          prezzoAlLitro,
          kmFinali: ultimo.kmFinali,
          kmEffettuati,
          kmAlLitro: totaleLitri > 0 ? kmEffettuati / totaleLitri : 0,
          kmAlLitroAuto,
          efficienzaPercentuale
        };
      })
      .sort((a, b) => a.anchorTime - b.anchorTime);

    // Seconda passata: Km persi/Costo extra confrontano ogni settimana con il MAX (record
    // personale) e la MEDIANA di km/litro su TUTTO lo storico (stesse formule della colonna
    // corrispondente sul foglio Google, Analisi consumi!H/J/L/N) — richiede quindi che tutte le
    // settimane siano già aggregate, non si può calcolare riga per riga.
    const kmAlLitroStorico = settimaneBase.map(s => s.kmAlLitro).filter(v => v > 0);
    const maxKmAlLitro = kmAlLitroStorico.length > 0 ? Math.max(...kmAlLitroStorico) : 0;

    const settimane = settimaneBase.map(s => ({
      ...s,
      euroPer100Km: s.kmEffettuati > 0 ? (s.costo / s.kmEffettuati) * 100 : 0,
      kmPersi: maxKmAlLitro > 0 ? Math.max(0, s.quantitaLitri * maxKmAlLitro - s.kmEffettuati) : 0,
      costoExtra: (s.kmAlLitro > 0 && maxKmAlLitro > 0)
        ? Math.max(0, s.kmEffettuati * s.prezzoAlLitro * (1 / s.kmAlLitro - 1 / maxKmAlLitro))
        : 0
    }));

    const esiti = calcolaEsitiSettimanali(settimane);
    return settimane.map((s, index) => ({ ...s, esitoSettimana: esiti[index] }));
  }, [data.analisiConsumi]);

  // 2. Local selection state
  const [selectedWeekState, setSelectedWeekState] = useState<RecordConsumo | null>(null);

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

  const selectedWeek = selectedWeekState || FALLBACK_WEEK;

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
    } as CSSProperties;
  };
  const kpiTextStyle = (value: number, range: KpiRange, higherIsBetter: boolean): CSSProperties => ({
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
    return isDanger ? 'text-down' : 'text-up';
  };

  // Selezione settimana cliccabile da qualsiasi grafico della pagina.
  // Recharts v3 non passa più `activePayload` all'onClick del chart (rimosso rispetto a v2):
  // l'unico riferimento disponibile è `activeLabel`, la label dell'asse X (qui: settimana).
  const handleChartClick = (chartEvent: any) => {
    if (!chartEvent || !chartEvent.activeLabel) return;
    const matched = consumiRecords.find(r => r.settimana === chartEvent.activeLabel);
    if (matched) setSelectedWeekState(matched);
  };

  return {
    consumiRecords,
    selectedWeek, selectedWeekState, setSelectedWeekState,
    kmChartRange, setKmChartRange, kmChartData,
    kmLtChartRange, setKmLtChartRange, kmLtChartData,
    euro100ChartRange, setEuro100ChartRange, euro100ChartData,
    prezzoChartRange, setPrezzoChartRange, prezzoChartData,
    costoExtraChartRange, setCostoExtraChartRange, costoExtraChartData,
    kmPersiChartRange, setKmPersiChartRange, kmPersiChartData,
    extraMode, setExtraMode,
    stats,
    kmLtLabel, cost100Label, kmPersiLabel, costoExtraLabel,
    previousWeek, kmDelta, litriDelta, prezzoDelta,
    deltaClass, kpiCardStyle, kpiTextStyle,
    handleChartClick
  };
}
