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
    isWeekDropdownOpen, setIsWeekDropdownOpen,
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
