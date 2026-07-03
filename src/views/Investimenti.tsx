import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { computeCruscottoData, computeRealAssetAllocation } from '../utils/cruscottoInvestimenti';
import {
  TrendingUp,
  Award,
  TrendingDown,
  Activity,
  Layers,
  Percent,
  Coins,
  ChevronRight,
  Shield,
  Briefcase,
  ToggleLeft,
  ChevronUp,
  ChevronDown,
  Wallet,
  Calendar,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  RISPARMIO_DATA,
  CRUSCOTTO_DATA,
  RENDIMENTI_MENSILI,
  SCALABLE_INSTRUMENTS,
  TRADE_REPUBLIC_INSTRUMENTS,
  FONDO_PENSIONE_DATA,
  RendimentoInvestimenti
} from '../data/mockData';

interface InvestimentiProps {
  sheetsData?: any;
  selectedMonth?: string;
  setSelectedMonth?: (month: string) => void;
  selectedYear?: string;
  setSelectedYear?: (year: string) => void;
  theme?: 'light' | 'dark';
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

  // Cerca la corrispondenza più lunga per evitare falsi positivi (es. "giugno" che contiene "giu")
  let foundMonth: number | null = null;
  let maxMatchLength = 0;
  for (const [key, value] of Object.entries(months)) {
    if (str.includes(key) && key.length > maxMatchLength) {
      foundMonth = value;
      maxMatchLength = key.length;
    }
  }

  // Se non viene trovato tramite testo, prova ad analizzare un numero tra 1 e 12
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

export default function Investimenti({
  sheetsData,
  selectedMonth: globalSelectedMonth = 'Luglio',
  setSelectedMonth: setGlobalSelectedMonth,
  selectedYear: globalSelectedYear = '2026',
  setSelectedYear: setGlobalSelectedYear,
  theme = 'dark'
}: InvestimentiProps = {}) {
  const [activeTab, setActiveTab] = useState<'cruscotto' | 'conti' | 'pensione'>('cruscotto');
  const [activeConto, setActiveConto] = useState<'scalable' | 'trade'>('scalable');
  const [selectedMonth, setSelectedMonth] = useState<RendimentoInvestimenti | null>(null);
  const [selectedMacroCategory, setSelectedMacroCategory] = useState<'Azioni' | 'Obbligazioni' | 'Monetari' | null>(null);
  const [subTab, setSubTab] = useState<'valore' | 'crescita' | 'mensile'>('valore');
  const [timeRange, setTimeRange] = useState<'storico' | '12mesi'>('storico');
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (scrollContainer.scrollTop > 12) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const localRendimenti = useMemo(() => {
    const raw = sheetsData?.rendimentiInvestimenti || sheetsData?.rendimentiMensili || RENDIMENTI_MENSILI;
    return raw.filter((item: any) => item && item.mese && String(item.mese).trim() !== '');
  }, [sheetsData?.rendimentiInvestimenti, sheetsData?.rendimentiMensili]);

  // 1.5 Active records with non-zero portfolio value
  const activeRendimenti = useMemo(() => {
    return localRendimenti.filter((r: any) => r && r.valoreAttualePortafoglio && r.valoreAttualePortafoglio > 0);
  }, [localRendimenti]);

  // 1.7 Check if global selection matches current month/year
  const isCurrentMonthSelected = useMemo(() => {
    const today = new Date();
    const MESI_ITALIANI = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    const currentMonthName = MESI_ITALIANI[today.getMonth()];
    const currentYearStr = today.getFullYear().toString();

    return globalSelectedMonth.toLowerCase().trim() === currentMonthName.toLowerCase().trim() && 
           globalSelectedYear === currentYearStr;
  }, [globalSelectedMonth, globalSelectedYear]);

  // 1.8 Find the raw index of the globally selected month in localRendimenti (using extremely robust date/month matching)
  const selectedRawIndex = useMemo(() => {
    const targetMonthYear = parseMeseStringToMonthYear(`${globalSelectedMonth} ${globalSelectedYear}`);
    if (!targetMonthYear) return -1;

    return localRendimenti.findIndex((r: any) => {
      const rMonthYear = parseMeseStringToMonthYear(r.mese);
      if (!rMonthYear) return false;
      return rMonthYear.month === targetMonthYear.month && rMonthYear.year === targetMonthYear.year;
    });
  }, [localRendimenti, globalSelectedMonth, globalSelectedYear]);

  // 1.9 Find the target index in localRendimenti for the inspector
  // "di base deve prendere il mese precedente if mese selezionato == mese attuale della data di oggi. Se no else, prende il mese selezionato dalla configurazione globale"
  const inspectorTargetRawIndex = useMemo(() => {
    const rawIdx = selectedRawIndex;
    if (isCurrentMonthSelected) {
      return rawIdx !== -1 ? rawIdx - 1 : localRendimenti.length - 2;
    }
    return rawIdx !== -1 ? rawIdx : localRendimenti.length - 1;
  }, [selectedRawIndex, isCurrentMonthSelected, localRendimenti]);

  // 2. Global inspector record with 0-value fallback
  // "se il mese ha valore 0 allora ci si ferma al mese precedente"
  const globalInspectorRecord = useMemo(() => {
    if (activeRendimenti.length === 0) return null;

    let targetIdx = inspectorTargetRawIndex;
    if (targetIdx < 0) {
      targetIdx = localRendimenti.length - 1;
    }

    // Cerca all'indietro a partire da targetIdx per trovare il primo record valido (> 0)
    for (let i = Math.min(targetIdx, localRendimenti.length - 1); i >= 0; i--) {
      const r = localRendimenti[i];
      if (r && r.valoreAttualePortafoglio && r.valoreAttualePortafoglio > 0) {
        return r;
      }
    }

    return activeRendimenti[activeRendimenti.length - 1] || null;
  }, [localRendimenti, activeRendimenti, inspectorTargetRawIndex]);

  // 2.5 Find resolved focus index in activeRendimenti based on the inspector's resolved record
  const resolvedFocusIndex = useMemo(() => {
    if (!globalInspectorRecord || activeRendimenti.length === 0) return -1;
    return activeRendimenti.findIndex(
      (r: any) => r.mese.toLowerCase().trim() === globalInspectorRecord.mese.toLowerCase().trim()
    );
  }, [activeRendimenti, globalInspectorRecord]);

  // 3. Focus data (12 months centered/aligned based on the resolved focus index inside activeRendimenti)
  const globalFocusRendimenti = useMemo(() => {
    const idx = resolvedFocusIndex;
    if (idx === -1 || activeRendimenti.length === 0) {
      return activeRendimenti.slice(-12);
    }

    if (isCurrentMonthSelected) {
      // Se si seleziona il mese corrente, mostra gli ultimi 12 mesi fino al mese risolto inclusive
      return activeRendimenti.slice(Math.max(0, idx - 11), idx + 1);
    }

    // Altrimenti: 9 mesi precedenti e 3 mesi successivi se disponibili, altrimenti 10 e 2, o 11 e 1
    const subsequentCount = Math.min(3, activeRendimenti.length - 1 - idx);
    const endIndex = idx + subsequentCount;
    const startIndex = Math.max(0, endIndex - 11);
    
    return activeRendimenti.slice(startIndex, endIndex + 1);
  }, [activeRendimenti, resolvedFocusIndex, isCurrentMonthSelected]);

  const chartData = useMemo(() => {
    return timeRange === '12mesi' ? globalFocusRendimenti : activeRendimenti;
  }, [timeRange, globalFocusRendimenti, activeRendimenti]);

  const localCruscotto = useMemo(() => {
    console.log("INVESTIMENTI VIEW: Ricalcolo localCruscotto. sheetsData:", sheetsData ? "presente" : "assente");
    if (sheetsData) {
      const computed = computeCruscottoData(sheetsData);
      console.log("INVESTIMENTI VIEW: Dati calcolati dal servizio:", computed);
      if (computed && computed.length > 0) {
        return computed;
      }
    }
    console.log("INVESTIMENTI VIEW: Ritorno dati di fallback (CRUSCOTTO_DATA):", CRUSCOTTO_DATA);
    return CRUSCOTTO_DATA;
  }, [sheetsData]);

  useEffect(() => {
    setSelectedMonth(globalInspectorRecord);
  }, [globalInspectorRecord]);

  const CRUSCOTTO_GENERALE = useMemo(() => {
    const isLoaded = !!localStorage.getItem('sf_spreadsheet_id');

    if (localCruscotto && localCruscotto.length > 0) {
      // Trova sempre il record con l'anno più recente per la vista riassuntiva
      const sortedCruscotto = [...localCruscotto].sort((a, b) => Number(a.anno || 0) - Number(b.anno || 0));
      const lastRow = sortedCruscotto[sortedCruscotto.length - 1];
      
      // Calcoliamo liquidiConto dinamico sommando il capitale disponibile dei conti Trade Republic o Scalable Capital
      let liquidiContoComputed = 0;
      const conti = sheetsData?.contiPatrimonio || [];
      if (conti.length > 0) {
        conti.forEach((c: any) => {
          const name = String(c.categoria || '').toLowerCase();
          if (name.includes('trade republic') || name.includes('scalable capital')) {
            liquidiContoComputed += Number(c.capitaleDisponibile || 0);
          }
        });
      } else {
        liquidiContoComputed = 5290.30;
      }

      // Rendimento cumulativo in percentuale
      let rendCumPerc = Number(lastRow.rendimentoCumulativoPerc || 0);
      if (!rendCumPerc && lastRow.investitoCumulativo) {
        rendCumPerc = (Number(lastRow.rendimentoCumulativoEuro || 0) / Number(lastRow.investitoCumulativo)) * 100;
      }
      if (isNaN(rendCumPerc)) rendCumPerc = 0;

      return {
        azioniInvestitoCum: Number(lastRow.azioniInvestitoCum !== undefined ? lastRow.azioniInvestitoCum : 18500),
        azioniInvestitoAnno: Number(lastRow.azioniInvestitoAnno !== undefined ? lastRow.azioniInvestitoAnno : 2400),
        obbligazioniInvestitoCum: Number(lastRow.obbligazioniInvestitoCum !== undefined ? lastRow.obbligazioniInvestitoCum : 10000),
        obbligazioniInvestitoAnno: Number(lastRow.obbligazioniInvestitoAnno !== undefined ? lastRow.obbligazioniInvestitoAnno : 1200),
        monetariInvestitoCum: Number(lastRow.monetariInvestitoCum !== undefined ? lastRow.monetariInvestitoCum : 0),
        monetariInvestitoAnno: Number(lastRow.monetariInvestitoAnno !== undefined ? lastRow.monetariInvestitoAnno : 0),
        rendimentoCumulativoEuro: Number(lastRow.rendimentoCumulativoEuro !== undefined ? lastRow.rendimentoCumulativoEuro : 3450.80),
        rendimentoAnnualeEuro: Number(lastRow.rendimentoAnnualeEuro !== undefined ? lastRow.rendimentoAnnualeEuro : 3600),
        rendimentoCumulativoPerc: rendCumPerc || 13.8,
        rendimentoMedioMensilePerc: Number(lastRow.rendimentoMedioMensilePerc !== undefined ? lastRow.rendimentoMedioMensilePerc : 1.15),
        rendimentoAnnuoStimatoPerc: Number(lastRow.rendimentoAnnuoStimatoPerc !== undefined ? lastRow.rendimentoAnnuoStimatoPerc : 7.8),
        liquidiConto: liquidiContoComputed
      };
    }

    if (!isLoaded) {
      return {
        azioniInvestitoCum: undefined as any,
        azioniInvestitoAnno: undefined as any,
        obbligazioniInvestitoCum: undefined as any,
        obbligazioniInvestitoAnno: undefined as any,
        monetariInvestitoCum: undefined as any,
        monetariInvestitoAnno: undefined as any,
        rendimentoCumulativoEuro: undefined as any,
        rendimentoAnnualeEuro: undefined as any,
        rendimentoCumulativoPerc: undefined as any,
        rendimentoMedioMensilePerc: undefined as any,
        rendimentoAnnuoStimatoPerc: undefined as any,
        liquidiConto: undefined as any
      };
    }

    return {
      azioniInvestitoCum: 18500,
      azioniInvestitoAnno: 2400,
      obbligazioniInvestitoCum: 10000,
      obbligazioniInvestitoAnno: 1200,
      monetariInvestitoCum: 1500,
      monetariInvestitoAnno: 500,
      rendimentoCumulativoEuro: 3450.80,
      rendimentoAnnualeEuro: 3600,
      rendimentoCumulativoPerc: 13.8,
      rendimentoMedioMensilePerc: 1.15,
      rendimentoAnnuoStimatoPerc: 7.8,
      liquidiConto: 5290.30
    };
  }, [localCruscotto, sheetsData]);

  const lastValidRendimento = useMemo(() => {
    if (!localRendimenti || localRendimenti.length === 0) return null;
    for (let i = localRendimenti.length - 1; i >= 0; i--) {
      const item = localRendimenti[i];
      if (item && item.mese && String(item.mese).trim() !== '' && item.rendimentoMensileEuro !== null && item.rendimentoMensileEuro !== undefined && item.rendimentoMensileEuro !== '' && item.rendimentoMensileEuro !== 0) {
        return item;
      }
    }
    return localRendimenti[localRendimenti.length - 1];
  }, [localRendimenti]);

  const CRUSCOTTO_ANNO = useMemo(() => {
    const isLoaded = !!localStorage.getItem('sf_spreadsheet_id');

    if (localCruscotto && localCruscotto.length > 0) {
      const row = localCruscotto.find(item => Number(item.anno) === Number(globalSelectedYear)) || localCruscotto[localCruscotto.length - 1];
      return {
        azioniInvestitoAnno: Number(row.azioniInvestitoAnno !== undefined ? row.azioniInvestitoAnno : 0),
        obbligazioniInvestitoAnno: Number(row.obbligazioniInvestitoAnno !== undefined ? row.obbligazioniInvestitoAnno : 0),
        monetariInvestitoAnno: Number(row.monetariInvestitoAnno !== undefined ? row.monetariInvestitoAnno : 0),
        rendimentoAnnualeEuro: Number(row.rendimentoAnnualeEuro !== undefined ? row.rendimentoAnnualeEuro : 0),
        rendimentoMedioMensilePerc: Number(row.rendimentoMedioMensilePerc !== undefined ? row.rendimentoMedioMensilePerc : 0),
      };
    }

    if (!isLoaded) {
      if (Number(globalSelectedYear) === 2025) {
        return {
          azioniInvestitoAnno: 3100,
          obbligazioniInvestitoAnno: 1800,
          monetariInvestitoAnno: 0,
          rendimentoAnnualeEuro: 2510.00,
          rendimentoMedioMensilePerc: 1.05,
        };
      }
      return {
        azioniInvestitoAnno: 2400,
        obbligazioniInvestitoAnno: 1200,
        monetariInvestitoAnno: 500,
        rendimentoAnnualeEuro: 3600,
        rendimentoMedioMensilePerc: 1.15,
      };
    }

    if (Number(globalSelectedYear) === 2025) {
      return {
        azioniInvestitoAnno: 3100,
        obbligazioniInvestitoAnno: 1800,
        monetariInvestitoAnno: 0,
        rendimentoAnnualeEuro: 2510.00,
        rendimentoMedioMensilePerc: 1.05,
      };
    }
    return {
      azioniInvestitoAnno: 2400,
      obbligazioniInvestitoAnno: 1200,
      monetariInvestitoAnno: 500,
      rendimentoAnnualeEuro: 3600,
      rendimentoMedioMensilePerc: 1.15,
    };
  }, [localCruscotto, sheetsData, globalSelectedYear]);

  const elapsedMonthsForSelectedYear = useMemo(() => {
    if (!lastValidRendimento || !lastValidRendimento.mese) return 12;
    const targetMonthYear = parseMeseStringToMonthYear(lastValidRendimento.mese);
    if (targetMonthYear && Number(targetMonthYear.year) !== Number(globalSelectedYear)) {
      return 12;
    }
    const normalized = String(lastValidRendimento.mese).toLowerCase().trim();
    if (normalized.includes('gen')) return 1;
    if (normalized.includes('feb')) return 2;
    if (normalized.includes('mar')) return 3;
    if (normalized.includes('apr')) return 4;
    if (normalized.includes('mag') || normalized.includes('may')) return 5;
    if (normalized.includes('giu') || normalized.includes('jun')) return 6;
    if (normalized.includes('lug') || normalized.includes('jul')) return 7;
    if (normalized.includes('ago') || normalized.includes('aug')) return 8;
    if (normalized.includes('set') || normalized.includes('sep')) return 9;
    if (normalized.includes('ott') || normalized.includes('oct')) return 10;
    if (normalized.includes('nov')) return 11;
    if (normalized.includes('dic') || normalized.includes('dec')) return 12;
    return 12;
  }, [lastValidRendimento, globalSelectedYear]);

  const calculatedRendimentoAnnuo = useMemo(() => {
    const mediaMensile = CRUSCOTTO_ANNO.rendimentoMedioMensilePerc;
    if (mediaMensile === undefined || mediaMensile === null || isNaN(Number(mediaMensile))) {
      return undefined;
    }
    return Number(mediaMensile) * elapsedMonthsForSelectedYear;
  }, [CRUSCOTTO_ANNO.rendimentoMedioMensilePerc, elapsedMonthsForSelectedYear]);

  const chartRendimentiData = useMemo(() => {
    if (!localRendimenti || localRendimenti.length === 0) return [];
    const data = [...localRendimenti];
    const lastIdx = data.length - 1;
    if (CRUSCOTTO_GENERALE.rendimentoCumulativoEuro !== undefined && CRUSCOTTO_GENERALE.rendimentoCumulativoEuro !== 0) {
      data[lastIdx] = {
        ...data[lastIdx],
        rendimentoCumulativoEuro: CRUSCOTTO_GENERALE.rendimentoCumulativoEuro
      };
    }
    return data;
  }, [localRendimenti, CRUSCOTTO_GENERALE.rendimentoCumulativoEuro]);

  const last12MonthsRendimenti = useMemo(() => {
    return chartRendimentiData.slice(-12);
  }, [chartRendimentiData]);

  const cruscottoRows = useMemo(() => {
    if (!localCruscotto) return [];
    const list = [...localCruscotto];
    const has2025 = list.some(item => Number(item.anno) === 2025);
    if (!has2025 && list.some(item => Number(item.anno) === 2026)) {
      list.push({
        anno: 2025,
        azioniInvestitoCum: 16100,
        azioniInvestitoAnno: 3100,
        obbligazioniInvestitoCum: 8800,
        obbligazioniInvestitoAnno: 1800,
        investitoCumulativo: 24900,
        investitoAnnuale: 4900,
        rendimentoCumulativoEuro: 2510.00,
        rendimentoAnnualeEuro: 2510.00
      });
    }
    return list.sort((a, b) => Number(b.anno || 0) - Number(a.anno || 0));
  }, [localCruscotto]);

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
    return (num >= 0 ? '+' : '') + num.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  };

  // Grouped instruments detail across Scalable and Trade Republic
  const nestedPieData = useMemo(() => {
    const azioniColors = ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
    const obbligazioniColors = ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74'];
    const monetariColors = ['#064e3b', '#065f46', '#047857', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

    // If sheetsData exists and has scalable or trade republic records, compute real allocation
    if (sheetsData && (sheetsData.scalable?.length > 0 || sheetsData.tradeRepublic?.length > 0)) {
      const allocation = computeRealAssetAllocation(sheetsData);
      
      const azioniItems = allocation.detailData.filter(item => item.tipo === 'Azioni').sort((a, b) => b.importoInvestito - a.importoInvestito);
      const obbligazioniItems = allocation.detailData.filter(item => item.tipo === 'Obbligazioni').sort((a, b) => b.importoInvestito - a.importoInvestito);
      const monetariItems = allocation.detailData.filter(item => item.tipo === 'Monetari').sort((a, b) => b.importoInvestito - a.importoInvestito);

      const azioniMapped = azioniItems.map((item, idx) => ({
        name: item.nome,
        value: item.importoInvestito,
        color: azioniColors[Math.min(idx, azioniColors.length - 1)],
        tipo: 'Azioni'
      }));

      const obbligazioniMapped = obbligazioniItems.map((item, idx) => ({
        name: item.nome,
        value: item.importoInvestito,
        color: obbligazioniColors[Math.min(idx, obbligazioniColors.length - 1)],
        tipo: 'Obbligazioni'
      }));

      const monetariMapped = monetariItems.map((item, idx) => ({
        name: item.nome,
        value: item.importoInvestito,
        color: monetariColors[Math.min(idx, monetariColors.length - 1)],
        tipo: 'Monetari'
      }));

      const macroData = allocation.macroData.map(m => {
        let color = '#3b82f6';
        if (m.name.includes('Azioni')) color = '#3b82f6';
        else if (m.name.includes('Obbligazioni')) color = '#ea580c';
        else if (m.name.includes('Monetari')) color = '#10b981';
        return {
          name: m.name.includes('Azioni') ? 'Azioni' : m.name.includes('Obbligazioni') ? 'Obbligazioni' : 'Monetari',
          value: m.value,
          color
        };
      });

      const detailData = [...azioniMapped, ...obbligazioniMapped, ...monetariMapped];

      return { macroData, detailData };
    }

    // Fallback/Mock allocation if Google Sheets is not loaded
    const fallbackList = [...SCALABLE_INSTRUMENTS, ...TRADE_REPUBLIC_INSTRUMENTS].map(item => {
      let mappedType = 'Azioni';
      const nameLower = item.nome.toLowerCase();
      if (nameLower.includes('bond') || nameLower.includes('obbligazion') || (item.tipo as string) === 'Obbligazioni') {
        mappedType = 'Obbligazioni';
      } else if (nameLower.includes('overnight') || nameLower.includes('swap') || nameLower.includes('monetar') || (item.tipo as string) === 'Liquidita' || (item.tipo as string) === 'Monetari') {
        mappedType = 'Monetari';
      }
      return {
        ...item,
        tipo: mappedType
      };
    });

    const azioniItems = fallbackList.filter(item => item.tipo === 'Azioni').sort((a, b) => b.importoInvestito - a.importoInvestito);
    const obbligazioniItems = fallbackList.filter(item => item.tipo === 'Obbligazioni').sort((a, b) => b.importoInvestito - a.importoInvestito);
    const monetariItems = fallbackList.filter(item => item.tipo === 'Monetari').sort((a, b) => b.importoInvestito - a.importoInvestito);

    const azioniTotal = azioniItems.reduce((acc, i) => acc + i.importoInvestito, 0);
    const obbligazioniTotal = obbligazioniItems.reduce((acc, i) => acc + i.importoInvestito, 0);
    const monetariTotal = monetariItems.reduce((acc, i) => acc + i.importoInvestito, 0);

    const macroData = [
      { name: 'Azioni', value: azioniTotal || CRUSCOTTO_GENERALE.azioniInvestitoCum, color: '#3b82f6' },
      { name: 'Obbligazioni', value: obbligazioniTotal || CRUSCOTTO_GENERALE.obbligazioniInvestitoCum, color: '#ea580c' },
      { name: 'Monetari', value: monetariTotal || CRUSCOTTO_GENERALE.monetariInvestitoCum, color: '#10b981' }
    ].filter(item => item.value > 0);

    const azioniMapped = azioniItems.map((item, idx) => ({
      name: item.nome,
      value: item.importoInvestito,
      color: azioniColors[Math.min(idx, azioniColors.length - 1)],
      tipo: 'Azioni'
    }));

    const obbligazioniMapped = obbligazioniItems.map((item, idx) => ({
      name: item.nome,
      value: item.importoInvestito,
      color: obbligazioniColors[Math.min(idx, obbligazioniColors.length - 1)],
      tipo: 'Obbligazioni'
    }));

    const monetariMapped = monetariItems.map((item, idx) => ({
      name: item.nome,
      value: item.importoInvestito,
      color: monetariColors[Math.min(idx, monetariColors.length - 1)],
      tipo: 'Monetari'
    }));

    const detailData = [...azioniMapped, ...obbligazioniMapped, ...monetariMapped];

    return { macroData, detailData };
  }, [sheetsData, CRUSCOTTO_GENERALE]);

  const localScalableInstruments = useMemo(() => {
    return sheetsData?.scalableInstruments?.length > 0
      ? sheetsData.scalableInstruments
      : SCALABLE_INSTRUMENTS;
  }, [sheetsData?.scalableInstruments]);

  const localTradeRepublicInstruments = useMemo(() => {
    return sheetsData?.tradeRepublicInstruments?.length > 0
      ? sheetsData.tradeRepublicInstruments
      : TRADE_REPUBLIC_INSTRUMENTS;
  }, [sheetsData?.tradeRepublicInstruments]);

  const localScalableMonthly = useMemo(() => {
    const raw = sheetsData?.scalable || [];
    if (raw.length > 0) return raw;
    
    // Fallback Mock Data for Scalable (2025 & 2026)
    return [
      // 2025
      { mese: 'Lug 25', anno: 2025, rendimentoMensileEuro: 45, rendimentoMensilePerc: 0.9, importoMensileInvestitoe: 200, rendimentoCumulativoEuro: 45, rendimentoCumulativoPerc: 0.9, totaleInvestito: 5000, saldoConto: 5045, saldoContoCompleto: 5045, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 2.99, dividendi: 0 },
      { mese: 'Ago 25', anno: 2025, rendimentoMensileEuro: -30, rendimentoMensilePerc: -0.6, importoMensileInvestitoe: 200, rendimentoCumulativoEuro: 15, rendimentoCumulativoPerc: 0.3, totaleInvestito: 5200, saldoConto: 5215, saldoContoCompleto: 5215, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 5.98, dividendi: 0 },
      { mese: 'Set 25', anno: 2025, rendimentoMensileEuro: 85, rendimentoMensilePerc: 1.6, importoMensileInvestitoe: 200, rendimentoCumulativoEuro: 100, rendimentoCumulativoPerc: 1.8, totaleInvestito: 5400, saldoConto: 5500, saldoContoCompleto: 5500, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 8.97, dividendi: 12 },
      { mese: 'Ott 25', anno: 2025, rendimentoMensileEuro: 50, rendimentoMensilePerc: 0.9, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 150, rendimentoCumulativoPerc: 2.6, totaleInvestito: 5700, saldoConto: 5850, saldoContoCompleto: 5850, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 11.96, dividendi: 0 },
      { mese: 'Nov 25', anno: 2025, rendimentoMensileEuro: 90, rendimentoMensilePerc: 1.5, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 240, rendimentoCumulativoPerc: 4.0, totaleInvestito: 6000, saldoConto: 6240, saldoContoCompleto: 6240, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 14.95, dividendi: 0 },
      { mese: 'Dic 25', anno: 2025, rendimentoMensileEuro: 120, rendimentoMensilePerc: 1.9, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 360, rendimentoCumulativoPerc: 5.6, totaleInvestito: 6400, saldoConto: 6760, saldoContoCompleto: 6760, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 17.94, dividendi: 25 },
      
      // 2026
      { mese: 'Gen 26', anno: 2026, rendimentoMensileEuro: -40, rendimentoMensilePerc: -0.6, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 320, rendimentoCumulativoPerc: 4.8, totaleInvestito: 6700, saldoConto: 7020, saldoContoCompleto: 7020, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 20.93, dividendi: 0 },
      { mese: 'Feb 26', anno: 2026, rendimentoMensileEuro: 75, rendimentoMensilePerc: 1.1, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 395, rendimentoCumulativoPerc: 5.6, totaleInvestito: 7000, saldoConto: 7395, saldoContoCompleto: 7395, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 23.92, dividendi: 18 },
      { mese: 'Mar 26', anno: 2026, rendimentoMensileEuro: 110, rendimentoMensilePerc: 1.5, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 505, rendimentoCumulativoPerc: 6.8, totaleInvestito: 7400, saldoConto: 7905, saldoContoCompleto: 7905, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 26.91, dividendi: 0 },
      { mese: 'Apr 26', anno: 2026, rendimentoMensileEuro: 130, rendimentoMensilePerc: 1.6, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 635, rendimentoCumulativoPerc: 8.2, totaleInvestito: 7700, saldoConto: 8335, saldoContoCompleto: 8335, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 29.90, dividendi: 0 },
      { mese: 'Mag 26', anno: 2026, rendimentoMensileEuro: -50, rendimentoMensilePerc: -0.6, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 585, rendimentoCumulativoPerc: 7.3, totaleInvestito: 8000, saldoConto: 8585, saldoContoCompleto: 8585, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 32.89, dividendi: 35 },
      { mese: 'Giu 26', anno: 2026, rendimentoMensileEuro: 150, rendimentoMensilePerc: 1.7, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 735, rendimentoCumulativoPerc: 8.8, totaleInvestito: 8400, saldoConto: 9135, saldoContoCompleto: 9135, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 35.88, dividendi: 0 }
    ];
  }, [sheetsData?.scalable]);

  const localTradeRepublicMonthly = useMemo(() => {
    const raw = sheetsData?.tradeRepublic || [];
    if (raw.length > 0) return raw;
    
    // Fallback Mock Data for Trade Republic (2025 & 2026)
    return [
      // 2025
      { mese: 'Lug 25', anno: 2025, rendimentoMensileEuro: 165, rendimentoMensilePerc: 1.1, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 1285, rendimentoCumulativoPerc: 8.6, totaleInvestito: 15000, saldoConto: 16285, interessiConto: 10.50, interessiContoComulativo: 10.50, commissioniMensili: 1.00, commissioniomulative: 1.00, dividendi: 15 },
      { mese: 'Ago 25', anno: 2025, rendimentoMensileEuro: -110, rendimentoMensilePerc: -0.7, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 1175, rendimentoCumulativoPerc: 7.7, totaleInvestito: 15300, saldoConto: 16475, interessiConto: 11.20, interessiContoComulativo: 21.70, commissioniMensili: 1.00, commissioniomulative: 2.00, dividendi: 0 },
      { mese: 'Set 25', anno: 2025, rendimentoMensileEuro: 225, rendimentoMensilePerc: 1.4, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 1400, rendimentoCumulativoPerc: 8.9, totaleInvestito: 15700, saldoConto: 17100, interessiConto: 12.10, interessiContoComulativo: 33.80, commissioniMensili: 1.00, commissioniomulative: 3.00, dividendi: 28 },
      { mese: 'Ott 25', anno: 2025, rendimentoMensileEuro: 130, rendimentoMensilePerc: 0.8, importoMensileInvestitoe: 350, rendimentoCumulativoEuro: 1530, rendimentoCumulativoPerc: 9.5, totaleInvestito: 16050, saldoConto: 17580, interessiConto: 12.40, interessiContoComulativo: 46.20, commissioniMensili: 1.00, commissioniomulative: 4.00, dividendi: 0 },
      { mese: 'Nov 25', anno: 2025, rendimentoMensileEuro: 200, rendimentoMensilePerc: 1.1, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 1730, rendimentoCumulativoPerc: 10.6, totaleInvestito: 16350, saldoConto: 18080, interessiConto: 12.85, interessiContoComulativo: 59.05, commissioniMensili: 1.00, commissioniomulative: 5.00, dividendi: 0 },
      { mese: 'Dic 25', anno: 2025, rendimentoMensileEuro: 300, rendimentoMensilePerc: 1.6, importoMensileInvestitoe: 500, rendimentoCumulativoEuro: 2030, rendimentoCumulativoPerc: 12.1, totaleInvestito: 16850, saldoConto: 18880, interessiConto: 13.50, interessiContoComulativo: 72.55, commissioniMensili: 1.00, commissioniomulative: 6.00, dividendi: 45 },
      
      // 2026
      { mese: 'Gen 26', anno: 2026, rendimentoMensileEuro: -40, rendimentoMensilePerc: -0.2, importoMensileInvestitoe: 350, rendimentoCumulativoEuro: 1990, rendimentoCumulativoPerc: 11.6, totaleInvestito: 17200, saldoConto: 19190, interessiConto: 13.80, interessiContoComulativo: 86.35, commissioniMensili: 1.00, commissioniomulative: 7.00, dividendi: 0 },
      { mese: 'Feb 26', anno: 2026, rendimentoMensileEuro: 115, rendimentoMensilePerc: 0.6, importoMensileInvestitoe: 310, rendimentoCumulativoEuro: 2105, rendimentoCumulativoPerc: 11.9, totaleInvestito: 17510, saldoConto: 19615, interessiConto: 14.10, interessiContoComulativo: 100.45, commissioniMensili: 1.00, commissioniomulative: 8.00, dividendi: 22 },
      { mese: 'Mar 26', anno: 2026, rendimentoMensileEuro: 230, rendimentoMensilePerc: 1.2, importoMensileInvestitoe: 450, rendimentoCumulativoEuro: 2335, rendimentoCumulativoPerc: 13.0, totaleInvestito: 17960, saldoConto: 20295, interessiConto: 14.50, interessiContoComulativo: 114.95, commissioniMensili: 1.00, commissioniomulative: 9.00, dividendi: 0 },
      { mese: 'Apr 26', anno: 2026, rendimentoMensileEuro: 280, rendimentoMensilePerc: 1.4, importoMensileInvestitoe: 410, rendimentoCumulativoEuro: 2615, rendimentoCumulativoPerc: 14.2, totaleInvestito: 18370, saldoConto: 20985, interessiConto: 15.10, interessiContoComulativo: 130.05, commissioniMensili: 1.00, commissioniomulative: 10.00, dividendi: 0 },
      { mese: 'Mag 26', anno: 2026, rendimentoMensileEuro: -70, rendimentoMensilePerc: -0.3, importoMensileInvestitoe: 450, rendimentoCumulativoEuro: 2545, rendimentoCumulativoPerc: 13.5, totaleInvestito: 18820, saldoConto: 21365, interessiConto: 15.30, interessiContoComulativo: 145.35, commissioniMensili: 1.00, commissioniomulative: 11.00, dividendi: 38 },
      { mese: 'Giu 26', anno: 2026, rendimentoMensileEuro: 300, rendimentoMensilePerc: 1.4, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 2845, rendimentoCumulativoPerc: 14.8, totaleInvestito: 19220, saldoConto: 22065, interessiConto: 15.80, interessiContoComulativo: 161.15, commissioniMensili: 1.00, commissioniomulative: 12.00, dividendi: 0 }
    ];
  }, [sheetsData?.tradeRepublic]);

  const filteredMonthlyRecords = useMemo(() => {
    const list = activeConto === 'scalable' ? localScalableMonthly : localTradeRepublicMonthly;
    return list.filter((row: any) => {
      const parsed = parseMeseStringToMonthYear(row.mese);
      if (parsed) {
        return parsed.year === Number(globalSelectedYear);
      }
      return Number(row.anno) === Number(globalSelectedYear) || String(row.mese).includes(String(globalSelectedYear).slice(-2));
    });
  }, [activeConto, localScalableMonthly, localTradeRepublicMonthly, globalSelectedYear]);

  const sortedFilteredRecords = useMemo(() => {
    return [...filteredMonthlyRecords].sort((a, b) => {
      const pA = parseMeseStringToMonthYear(a.mese);
      const pB = parseMeseStringToMonthYear(b.mese);
      if (pA && pB) {
        return pA.month - pB.month;
      }
      return 0;
    });
  }, [filteredMonthlyRecords]);

  const accountKPIs = useMemo(() => {
    const sSaldo = localScalableInstruments.reduce((acc: number, item: any) => acc + (item.saldoConto || item.importoInvestito || 0), 0);
    const sInvestito = localScalableInstruments.reduce((acc: number, item: any) => acc + (item.importoInvestito || 0), 0);
    const sPlusvalenza = localScalableInstruments.reduce((acc: number, item: any) => acc + (item.rendimentoCumulativoEuro || 0), 0) || (sSaldo - sInvestito);

    const tSaldo = localTradeRepublicInstruments.reduce((acc: number, item: any) => acc + (item.saldoConto || item.importoInvestito || 0), 0);
    const tInvestito = localTradeRepublicInstruments.reduce((acc: number, item: any) => acc + (item.importoInvestito || 0), 0);
    const tPlusvalenza = localTradeRepublicInstruments.reduce((acc: number, item: any) => acc + (item.rendimentoCumulativoEuro || 0), 0) || (tSaldo - tInvestito);

    return {
      scalable: { saldo: sSaldo, investito: sInvestito, plusvalenza: sPlusvalenza, topContributor: 'STOXX Europe 600' },
      trade: { saldo: tSaldo, investito: tInvestito, plusvalenza: tPlusvalenza, topContributor: 'S&P 500 InfoTech' }
    };
  }, [localScalableInstruments, localTradeRepublicInstruments]);

  const totalAssetAllocation = useMemo(() => {
    return nestedPieData.macroData.reduce((acc, m) => acc + m.value, 0);
  }, [nestedPieData]);

  const macroPercentages = useMemo(() => {
    const total = totalAssetAllocation;
    if (total === 0) return { azioni: 0, obbligazioni: 0, monetari: 0 };
    
    const azioniValue = nestedPieData.macroData.find(m => m.name.includes('Azioni'))?.value || 0;
    const obbligazioniValue = nestedPieData.macroData.find(m => m.name.includes('Obbligazioni'))?.value || 0;
    const monetariValue = nestedPieData.macroData.find(m => m.name.includes('Monetari'))?.value || 0;

    return {
      azioni: (azioniValue / total) * 100,
      obbligazioni: (obbligazioniValue / total) * 100,
      monetari: (monetariValue / total) * 100
    };
  }, [nestedPieData, totalAssetAllocation]);

  const filteredDetailData = useMemo(() => {
    if (!selectedMacroCategory) return nestedPieData.detailData;
    return nestedPieData.detailData.filter(item => item.tipo === selectedMacroCategory);
  }, [nestedPieData.detailData, selectedMacroCategory]);

  return (
    <div className="space-y-6">
      {/* 3 Inner Tabs buttons (Sticky & Glassmorphic) */}
      <div 
        className={`sticky transition-all duration-300 z-30 ${
          isSticky 
            ? 'top-[-16px] md:top-[-32px] -mx-4 px-4 md:-mx-8 md:px-8 pt-4 pb-2 bg-slate-50/30 dark:bg-[#060a13]/30 backdrop-blur-md border-b border-slate-200/30 dark:border-slate-800/10 shadow-xs' 
            : 'top-0 pt-0 pb-3 bg-transparent'
        }`}
      >
        <div className={`flex transition-all duration-300 p-1.5 rounded-2xl border flex-wrap gap-2 justify-center sm:justify-start ${
          isSticky 
            ? 'bg-white/35 dark:bg-[#0c1425]/35 border-slate-200/30 dark:border-slate-800/20' 
            : 'bg-white/85 dark:bg-[#0c1425]/85 border-slate-200 dark:border-slate-800/60 shadow-xs'
        }`}>
          <button
            onClick={() => setActiveTab('cruscotto')}
            className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'cruscotto'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Cruscotto Generale
          </button>
          <button
            onClick={() => setActiveTab('conti')}
            className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'conti'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Conti (Scalable & TR)
          </button>
          <button
            onClick={() => setActiveTab('pensione')}
            className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pensione'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Fondo Pensione
          </button>
        </div>
      </div>

      {/* TAB 1: Cruscotto Generale */}
      {activeTab === 'cruscotto' && (
        <div className="space-y-6 text-left">
          {/* Key KPI grouped section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GRUPPO 1: DATI CUMULATI STORICI */}
            <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                  Dati Cumulati Storici
                </span>
                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  Sempre Aggiornato
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Portafoglio Attuale Box */}
                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 rounded-2xl border border-indigo-950 dark:border-indigo-900 shadow-md flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block">Portafoglio Attuale</span>
                    <Wallet className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black font-display text-white block">
                      {formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + CRUSCOTTO_GENERALE.monetariInvestitoCum + CRUSCOTTO_GENERALE.rendimentoCumulativoEuro)}
                    </span>
                  </div>
                  <div className="border-t border-indigo-800/60 pt-2 mt-2">
                    <p className="text-[9px] text-indigo-300 font-medium">Investito: <span className="font-bold text-white">{formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0))}</span></p>
                  </div>
                </div>

                {/* Plusvalenza Cumulata Box */}
                <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-xs flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Plusvalenza Cumulata</span>
                    <div className="bg-emerald-50 dark:bg-emerald-950/50 p-1 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold font-display text-emerald-600 dark:text-emerald-400 block flex items-center gap-0.5">
                      <ChevronUp className="w-5 h-5 shrink-0" />
                      {formatEuro(CRUSCOTTO_GENERALE.rendimentoCumulativoEuro)}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px]">
                    <span className="text-slate-400 dark:text-slate-400 font-medium">Rendimento Totale</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-extrabold font-mono">
                      {formatPercent(lastValidRendimento?.rendimentoCumulativoPerc)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* GRUPPO 2: PERFORMANCE ANNO SELEZIONATO */}
            <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                  Performance Anno {globalSelectedYear}
                </span>
                <span className="text-[9px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Anno Selezionato
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rendimento Annuo Box */}
                <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-xs flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Rendimento {globalSelectedYear}</span>
                    <div className="bg-violet-50 dark:bg-violet-950/50 p-1 rounded-lg">
                      <Award className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold font-display text-violet-600 dark:text-violet-400 block flex items-baseline gap-1 flex-wrap">
                      <span>{formatEuro(CRUSCOTTO_ANNO.rendimentoAnnualeEuro)}</span>
                      <span className="text-xs font-semibold text-violet-400 dark:text-violet-300">({formatPercent(calculatedRendimentoAnnuo)})</span>
                    </span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px] text-slate-400">
                    <span>Media mensile ({elapsedMonthsForSelectedYear}m)</span>
                    <span className="font-bold text-slate-600 dark:text-slate-300 font-mono">{formatPercent(CRUSCOTTO_ANNO.rendimentoMedioMensilePerc)}</span>
                  </div>
                </div>

                {/* Contributo Anno Box */}
                <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-xs flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Contributo {globalSelectedYear}</span>
                    <div className="bg-indigo-50 dark:bg-indigo-950/50 p-1 rounded-lg">
                      <Coins className="w-4 h-4 text-indigo-600 dark:text-indigo-450" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold font-display text-slate-800 dark:text-slate-100 block">
                      {formatEuro(CRUSCOTTO_ANNO.azioniInvestitoAnno + CRUSCOTTO_ANNO.obbligazioniInvestitoAnno + (CRUSCOTTO_ANNO.monetariInvestitoAnno || 0))}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px] text-slate-400">
                    <span>Contributo Totale</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                      {formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doppio Grafico a Torta (Nested Pie Chart) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md h-[540px]">
              <div>
                <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Ripartizione Asset e Strumenti
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  Asset class all'interno, dettaglio strumenti all'esterno (Scalable e Trade Republic)
                </p>
              </div>

              {/* Custom compact Tooltip for Recharts */}
              {(() => {
                const CustomTooltip = ({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const val = payload[0].value;
                    const name = payload[0].name;
                    const total = totalAssetAllocation;
                    const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0.0';
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-xs text-slate-100 px-2.5 py-1.5 rounded-lg shadow-xl text-[10px] font-medium border border-slate-800 leading-tight">
                        <div className="flex items-center gap-1.5 mb-1 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: data.color || payload[0].color }} />
                          <span className="uppercase text-[8.5px] tracking-wide text-slate-300 truncate max-w-[125px]">{name}</span>
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

                return (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden mt-3">
                    {/* 1. Macro Data Legend Tiles (Interactive buttons) - FULL WIDTH */}
                    <div className="mb-4 shrink-0">
                      <div className="grid grid-cols-3 gap-2">
                        {nestedPieData.macroData.map((item, idx) => {
                          const value = item.value;
                          const percentage = totalAssetAllocation > 0 ? (value / totalAssetAllocation) * 100 : 0;
                          const categoryKey = item.name as 'Azioni' | 'Obbligazioni' | 'Monetari';
                          const isSelected = selectedMacroCategory === categoryKey;
                          const isAnySelected = selectedMacroCategory !== null;

                          // Dynamic professional styling based on state
                          let containerClass = '';
                          let textTitleClass = '';
                          let textPercentageClass = '';
                          let textAmountClass = '';
                          let dotColor = item.color;
                          let dotClass = '';

                          if (isSelected) {
                            if (categoryKey === 'Azioni') {
                              containerClass = 'bg-blue-950 border-blue-900 text-white shadow-md ring-2 ring-blue-500/30';
                              textTitleClass = 'text-blue-200 font-bold';
                              textPercentageClass = 'text-white font-black';
                              textAmountClass = 'text-blue-300';
                              dotColor = '#60a5fa'; // bright neon blue
                              dotClass = 'shadow-xs shadow-blue-400/50 animate-pulse';
                            } else if (categoryKey === 'Obbligazioni') {
                              containerClass = 'bg-orange-950 border-orange-900 text-white shadow-md ring-2 ring-orange-500/30';
                              textTitleClass = 'text-orange-200 font-bold';
                              textPercentageClass = 'text-white font-black';
                              textAmountClass = 'text-orange-300';
                              dotColor = '#fb923c'; // bright neon orange
                              dotClass = 'shadow-xs shadow-orange-400/50 animate-pulse';
                            } else if (categoryKey === 'Monetari') {
                              containerClass = 'bg-emerald-950 border-emerald-900 text-white shadow-md ring-2 ring-emerald-500/30';
                              textTitleClass = 'text-emerald-200 font-bold';
                              textPercentageClass = 'text-white font-black';
                              textAmountClass = 'text-emerald-300';
                              dotColor = '#34d399'; // bright neon green
                              dotClass = 'shadow-xs shadow-emerald-400/50 animate-pulse';
                            }
                          } else if (isAnySelected) {
                            containerClass = 'border-slate-100 bg-slate-50/40 opacity-45 hover:opacity-90 hover:bg-slate-100/60';
                            textTitleClass = 'text-slate-400 font-semibold';
                            textPercentageClass = 'text-slate-500 font-extrabold';
                            textAmountClass = 'text-slate-400/70';
                          } else {
                            containerClass = 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs';
                            textTitleClass = 'text-slate-600 font-bold';
                            textPercentageClass = 'text-slate-800 font-extrabold';
                            textAmountClass = 'text-slate-400';
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedMacroCategory(isSelected ? null : categoryKey)}
                              className={`p-2 rounded-xl border flex flex-col justify-between text-left transition-all duration-200 cursor-pointer active:scale-[0.97] h-[64px] ${containerClass}`}
                            >
                              <div className="flex items-center gap-1.5 truncate w-full">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} style={{ backgroundColor: dotColor }} />
                                <span className={`text-[10px] truncate uppercase tracking-wider ${textTitleClass}`}>{item.name}</span>
                              </div>
                              <div className="mt-0.5 flex flex-col">
                                <span className={`font-mono text-[11px] leading-tight ${textPercentageClass}`}>{percentage.toFixed(1)}%</span>
                                <span className={`text-[9px] font-mono leading-none ${textAmountClass}`}>{formatEuro(value)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 50/50 Split Grid (Chart left, Micro Legend right) */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center min-h-0 overflow-hidden">
                      {/* Pie Chart Column - 50% split */}
                      <div className="h-full min-h-[240px] md:min-h-[260px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            {/* Inner Pie: Macro asset allocation */}
                            <Pie
                              data={nestedPieData.macroData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              stroke="none"
                              dataKey="value"
                            >
                              {nestedPieData.macroData.map((entry: any, index: number) => (
                                <Cell key={`cell-macro-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            {/* Outer Pie: Detailed instruments */}
                            <Pie
                              data={nestedPieData.detailData}
                              cx="50%"
                              cy="50%"
                              innerRadius={85}
                              outerRadius={115}
                              stroke="none"
                              dataKey="value"
                            >
                              {nestedPieData.detailData.map((entry: any, index: number) => (
                                <Cell key={`cell-detail-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Centered Label for Donut chart */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1 z-10">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Investito</span>
                          <span className="text-sm font-black text-slate-800 font-mono">
                            {formatEuro(totalAssetAllocation)}
                          </span>
                        </div>
                      </div>

                      {/* Micro Data Legend Column - 50% split */}
                      <div className="h-full flex flex-col min-h-0 overflow-hidden pb-1">
                        <div className="flex items-center justify-between mb-1.5 shrink-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Dettaglio Strumenti {selectedMacroCategory && `(${selectedMacroCategory})`}
                          </span>
                          {selectedMacroCategory && (
                            <button
                              onClick={() => setSelectedMacroCategory(null)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors"
                            >
                              Mostra tutti
                            </button>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                          {filteredDetailData.map((item, idx) => {
                            const itemPerc = totalAssetAllocation > 0 ? (item.value / totalAssetAllocation) * 100 : 0;
                            return (
                              <div key={idx} className="flex items-center justify-between font-semibold py-1 border-b border-slate-50 hover:bg-slate-50/50 px-1.5 rounded-lg transition-colors text-[11px]">
                                <div className="flex items-center gap-2 truncate max-w-[130px] sm:max-w-[150px]">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="text-slate-500 truncate uppercase font-bold" title={item.name}>{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-right shrink-0">
                                  <span className="text-slate-500 font-extrabold text-[10px]">({itemPerc.toFixed(1)}%)</span>
                                  <span className="text-slate-800 font-bold">{formatEuro(item.value)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Analisi Portafoglio Widget */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md h-[540px]">
              <div>
                <div className="flex flex-col gap-3 mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-1.5">
                      <Activity className={`w-5 h-5 ${
                        subTab === 'valore' ? 'text-indigo-600' :
                        subTab === 'crescita' ? 'text-emerald-600' : 'text-violet-600'
                      }`} />
                      Analisi Portafoglio
                    </h3>
                    
                    {/* Premium mini-segmented control */}
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 border border-slate-200 select-none">
                      <button
                        onClick={() => setSubTab('valore')}
                        className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                          subTab === 'valore'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-indigo-600'
                        }`}
                      >
                        Investito vs Valore
                      </button>
                      <button
                        onClick={() => setSubTab('crescita')}
                        className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                          subTab === 'crescita'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-emerald-600'
                        }`}
                      >
                        Crescita Rendimento
                      </button>
                      <button
                        onClick={() => setSubTab('mensile')}
                        className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                          subTab === 'mensile'
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-violet-600'
                        }`}
                      >
                        Rendimenti Mensili
                      </button>
                    </div>
                  </div>

                  {/* Time Range Selector underneath sections */}
                  <div className="flex justify-start sm:justify-end">
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 border border-slate-200 select-none">
                      <button
                        onClick={() => setTimeRange('storico')}
                        className={`text-[9px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                          timeRange === 'storico'
                            ? `${
                                subTab === 'valore' ? 'bg-indigo-600' :
                                subTab === 'crescita' ? 'bg-emerald-600' : 'bg-violet-600'
                              } text-white shadow-xs`
                            : `text-slate-500 ${
                                subTab === 'valore' ? 'hover:text-indigo-600' :
                                subTab === 'crescita' ? 'hover:text-emerald-600' : 'hover:text-violet-600'
                              }`
                        }`}
                      >
                        Storico
                      </button>
                      <button
                        onClick={() => setTimeRange('12mesi')}
                        className={`text-[9px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                          timeRange === '12mesi'
                            ? `${
                                subTab === 'valore' ? 'bg-indigo-600' :
                                subTab === 'crescita' ? 'bg-emerald-600' : 'bg-violet-600'
                              } text-white shadow-xs`
                            : `text-slate-500 ${
                                subTab === 'valore' ? 'hover:text-indigo-600' :
                                subTab === 'crescita' ? 'hover:text-emerald-600' : 'hover:text-violet-600'
                              }`
                        }`}
                      >
                        Ultimi 12 Mesi
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4 font-medium">
                  {subTab === 'valore' && "Confronto storico tra il capitale depositato e l'attuale valore di mercato."}
                  {subTab === 'crescita' && "Progresso della plusvalenza netta (€) con focus temporale e storico."}
                  {subTab === 'mensile' && "Plusvalenza o minusvalenza mensile (€) registrata nel tempo."}
                </p>
              </div>

              {/* Single Unified Chart Area */}
              <div className="flex-1 flex flex-col justify-between gap-3 overflow-hidden">
                <div className="flex-1 min-h-[280px] flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      {timeRange === '12mesi' ? "Focus Periodo (Ultimi 12 Mesi)" : "Storico Completo"}
                    </span>
                    <span className={`text-xs font-bold font-mono ${
                      subTab === 'valore' ? 'text-indigo-600' :
                      subTab === 'crescita' ? 'text-emerald-600' : 'text-violet-600'
                    }`}>
                      {chartData.length > 0 ? (
                        <span className="text-[10px] text-slate-500">
                          {chartData[0]?.mese} - {chartData[chartData.length - 1]?.mese}
                        </span>
                      ) : ''}
                    </span>
                  </div>
                  
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {subTab === 'valore' ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorInvestitoValore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01}/>
                            </linearGradient>
                            <linearGradient id="colorValorePortafoglio" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT')}`} />
                          <Tooltip
                            formatter={(value: any) => formatEuro(value)}
                            contentStyle={{
                              background: '#1e293b',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '11px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                          />
                          <Area
                            type="monotone"
                            name="Capitale Investito"
                            dataKey="importoInvestitoCumulato"
                            stroke="#94a3b8"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorInvestitoValore)"
                            dot={timeRange === '12mesi' ? { r: 3.5, strokeWidth: 1.5, stroke: '#94a3b8', fill: '#fff' } : false}
                            activeDot={{ r: 5 }}
                          />
                          <Area
                            type="monotone"
                            name="Valore Portafoglio"
                            dataKey="valoreAttualePortafoglio"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValorePortafoglio)"
                            dot={timeRange === '12mesi' ? { r: 3.5, strokeWidth: 2, stroke: '#4f46e5', fill: '#fff' } : false}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      ) : subTab === 'crescita' ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorGlobalRendimentoSingle" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT')}`} />
                          <Tooltip
                            formatter={(value: any) => [formatEuro(value), 'Plusvalenza']}
                            contentStyle={{
                              background: '#1e293b',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '11px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="rendimentoCumulativoEuro"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorGlobalRendimentoSingle)"
                            dot={timeRange === '12mesi' ? { r: 3.5, strokeWidth: 2, stroke: '#10b981', fill: '#fff' } : false}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT')}`} />
                          <Tooltip
                            formatter={(value: any) => [formatEuro(value), 'Rendimento Mese']}
                            contentStyle={{
                              background: '#1e293b',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '11px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="rendimentoMensileEuro" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.rendimentoMensileEuro >= 0 ? '#10b981' : '#f43f5e'} />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 flex justify-between items-center h-10 shrink-0">
                <div>
                  <span className="block text-[9px] uppercase text-slate-400 font-bold">Inizio Range</span>
                  <span className="text-slate-800 font-bold font-mono">{chartData[0]?.mese || 'N/D'}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase text-slate-400 font-bold">Fine Range</span>
                  <span className={`font-bold font-mono ${
                    subTab === 'valore' ? 'text-indigo-600' :
                    subTab === 'crescita' ? 'text-emerald-600' : 'text-violet-600'
                  }`}>
                    {chartData[chartData.length - 1]?.mese || 'N/D'} ({formatEuro(chartData[chartData.length - 1]?.valoreAttualePortafoglio || 0)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid containing Monthly returns inspector card on the left, and Distribuzione Asset Class table on the right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Left Column: Inspector widget */}
            <div className="lg:col-span-1 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
              {globalInspectorRecord ? (
                <>
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Filtro Mese Selezionato</span>
                    <h3 className="text-xl font-bold font-display text-slate-800 capitalize mt-2 flex items-center justify-between">
                      <span>{globalInspectorRecord.mese}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        globalInspectorRecord.rendimentoMensileEuro >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {formatPercent(globalInspectorRecord.rendimentoMensilePerc)}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 font-medium">Sintesi dei movimenti del portafoglio nel mese</p>
                  </div>

                  <div className="my-6 space-y-3 border-t border-b border-slate-200 py-4 font-semibold text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Valore Portafoglio:</span>
                      <span className="text-slate-850 font-bold font-mono">{formatEuro(globalInspectorRecord.valoreAttualePortafoglio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Importo Investito Mese:</span>
                      <span className="text-slate-850 font-bold font-mono">{formatEuro(globalInspectorRecord.importoMensileInvestito)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risultato Netto (€):</span>
                      <span className={`font-bold font-mono ${globalInspectorRecord.rendimentoMensileEuro >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {formatEuro(globalInspectorRecord.rendimentoMensileEuro)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Plusvalenza Cumulata:</span>
                      <span className="text-indigo-600 font-bold font-mono">{formatEuro(globalInspectorRecord.rendimentoCumulativoEuro)}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium">
                    * Mostra il mese selezionato globalmente o quello precedente se è selezionato il mese corrente.
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Nessun dato disponibile per il periodo selezionato.
                </div>
              )}
            </div>

            {/* Right Column: Distribuzione Asset Class per Anno */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 font-display text-base mb-4">Distribuzione Asset Class per Anno</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-100">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-2xl">Esercizio</th>
                        <th className="px-6 py-4 text-right">Azioni Cumulato</th>
                        <th className="px-6 py-4 text-right">Azioni Annuale</th>
                        <th className="px-6 py-4 text-right">Obbligazioni Cumulato</th>
                        <th className="px-6 py-4 text-right">Obbligazioni Annuale</th>
                        <th className="px-6 py-4 text-right">Monetari Cumulato</th>
                        <th className="px-6 py-4 text-right">Monetari Annuale</th>
                        <th className="px-6 py-4 text-right rounded-tr-2xl">Valutazione Totale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                      {cruscottoRows.map((row: any) => {
                        const isCorrente = Number(row.anno) === Number(cruscottoRows[0]?.anno);
                        const valuationSum = Number(row.azioniInvestitoCum || 0) + 
                                             Number(row.obbligazioniInvestitoCum || 0) + 
                                             Number(row.monetariInvestitoCum || 0) + 
                                             Number(row.rendimentoCumulativoEuro || 0);
                        return (
                          <tr key={row.anno} className="hover:bg-slate-50/50 transition-colors duration-155">
                            <td className="px-6 py-3.5 font-bold text-slate-800">
                              {row.anno} {isCorrente ? '(Corrente)' : ''}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono">{formatEuro(row.azioniInvestitoCum)}</td>
                            <td className="px-6 py-3.5 text-right text-emerald-600 font-bold font-mono">
                              +{formatEuro(row.azioniInvestitoAnno)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono">{formatEuro(row.obbligazioniInvestitoCum)}</td>
                            <td className="px-6 py-3.5 text-right text-emerald-600 font-bold font-mono">
                              +{formatEuro(row.obbligazioniInvestitoAnno)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono">{formatEuro(row.monetariInvestitoCum)}</td>
                            <td className="px-6 py-3.5 text-right text-emerald-600 font-bold font-mono">
                              +{formatEuro(row.monetariInvestitoAnno)}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-indigo-600 font-mono">
                              {formatEuro(valuationSum)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* TAB 3: Conti Scalable & Trade republic details */}
      {activeTab === 'conti' && (
        <div className="space-y-6 text-left animate-fadeIn">
          {/* Subtabs to choose between Scalable Capital and Trade republic */}
          <div className="flex border-b border-slate-200 gap-6 mb-6 select-none outline-hidden">
            <button
              onClick={() => setActiveConto('scalable')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeConto === 'scalable'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Scalable Capital Portfolio
            </button>
            <button
              onClick={() => setActiveConto('trade')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeConto === 'trade'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Trade Republic Portfolio
            </button>
          </div>

          {/* Accounts KPIs panels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Saldo Attuale Portafoglio</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 block mt-1">
                {formatEuro(accountKPIs[activeConto].saldo)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Valutazione corrente di tutti gli strumenti</p>
            </div>
            
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Totale Capitale Investito</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 block mt-1">
                {formatEuro(accountKPIs[activeConto].investito)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Versato cumulativo netto</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Plusvalenza Attiva</span>
              <span className={`text-2xl font-extrabold font-display block mt-1 flex items-center gap-1 ${
                accountKPIs[activeConto].plusvalenza >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {accountKPIs[activeConto].plusvalenza >= 0 ? (
                  <ChevronUp className="w-5 h-5 shrink-0" />
                ) : (
                  <span className="text-lg shrink-0">-</span>
                )}
                {formatEuro(accountKPIs[activeConto].plusvalenza)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                Contributore principale: {accountKPIs[activeConto].topContributor}
              </p>
            </div>
          </div>

          {/* Instruments Detail list table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
            <h3 className="font-bold text-slate-800 font-display text-base mb-4">
              Dettaglio strumenti ({activeConto === 'scalable' ? 'Scalable Capital' : 'Trade Republic'})
            </h3>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-100">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-2xl">Nome Strumento</th>
                    <th className="px-6 py-4">Classe Asset</th>
                    <th className="px-6 py-4 text-right">Capitale Investito</th>
                    <th className="px-6 py-4 text-right">Rendimento Mese (Euro)</th>
                    <th className="px-6 py-4 text-right">Rendimento Cumulativo (Euro)</th>
                    <th className="px-6 py-4 text-right rounded-tr-2xl">Valutazione Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                  {(activeConto === 'scalable' ? localScalableInstruments : localTradeRepublicInstruments).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-155">
                      <td className="px-6 py-3.5 font-bold text-slate-850">
                        {item.nome}
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[9px] ${
                          item.tipo === 'ETF'
                            ? 'bg-blue-100 text-blue-800'
                            : item.tipo === 'Azioni'
                            ? 'bg-fuchsia-100 text-fuchsia-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold">
                        {formatEuro(item.importoInvestito)}
                      </td>
                      <td className={`px-6 py-3.5 text-right font-bold ${
                        item.rendimentoMensileEuro >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {formatEuro(item.rendimentoMensileEuro)} ({formatPercent(item.rendimentoMensilePerc)})
                      </td>
                      <td className={`px-6 py-3.5 text-right font-bold ${
                        item.rendimentoCumulativoEuro >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {formatEuro(item.rendimentoCumulativoEuro)} ({formatPercent(item.rendimentoCumulativoPerc)})
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800">
                        {formatEuro(item.saldoConto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Monthly Spreadsheet Structure */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 font-display text-base">
                  Registro Storico Mensile — Foglio di Calcolo ({activeConto === 'scalable' ? 'Scalable Capital' : 'Trade Republic'})
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Rappresentazione fedele della struttura del foglio Google filtrata per l'anno {globalSelectedYear}
                </p>
              </div>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold font-mono self-start sm:self-center">
                Anno: {globalSelectedYear}
              </div>
            </div>

            {sortedFilteredRecords.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400 font-medium">Nessun dato mensile disponibile per l'anno {globalSelectedYear}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-100">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-2xl">Mese</th>
                      <th className="px-4 py-3 text-right">Rend. Mensile €</th>
                      <th className="px-4 py-3 text-right">Rend. Mensile %</th>
                      <th className="px-4 py-3 text-right">Importo Inv. Mese</th>
                      <th className="px-4 py-3 text-right">Rend. Cumulativo €</th>
                      <th className="px-4 py-3 text-right">Rend. Cumulativo %</th>
                      <th className="px-4 py-3 text-right">Totale Investito</th>
                      <th className="px-4 py-3 text-right">Saldo Conto</th>
                      {activeConto === 'scalable' && (
                        <th className="px-4 py-3 text-right">Saldo Conto Compl.</th>
                      )}
                      <th className="px-4 py-3 text-right">Interessi Conto</th>
                      <th className="px-4 py-3 text-right">Interessi Cumulati</th>
                      <th className="px-4 py-3 text-right">Commissioni Mese</th>
                      <th className="px-4 py-3 text-right">Commissioni Cumul.</th>
                      <th className="px-4 py-3 text-right rounded-tr-2xl">Dividendi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                    {sortedFilteredRecords.map((r, idx) => {
                      const rendMese = Number(r.rendimentoMensileEuro || 0);
                      const rendCum = Number(r.rendimentoCumulativoEuro || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-155">
                          <td className="px-4 py-3 font-bold text-slate-850 capitalize">{r.mese}</td>
                          <td className={`px-4 py-3 text-right font-semibold font-mono ${rendMese >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {rendMese >= 0 ? '+' : ''}{formatEuro(rendMese)}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold font-mono ${Number(r.rendimentoMensilePerc || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(r.rendimentoMensilePerc || 0) >= 0 ? '+' : ''}{formatPercent(r.rendimentoMensilePerc || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatEuro(r.importoMensileInvestitoe || 0)}</td>
                          <td className={`px-4 py-3 text-right font-semibold font-mono ${rendCum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {rendCum >= 0 ? '+' : ''}{formatEuro(rendCum)}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold font-mono ${Number(r.rendimentoCumulativoPerc || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(r.rendimentoCumulativoPerc || 0) >= 0 ? '+' : ''}{formatPercent(r.rendimentoCumulativoPerc || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatEuro(r.totaleInvestito || 0)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatEuro(r.saldoConto || 0)}</td>
                          {activeConto === 'scalable' && (
                            <td className="px-4 py-3 text-right font-mono">{formatEuro(r.saldoContoCompleto || 0)}</td>
                          )}
                          <td className="px-4 py-3 text-right font-mono text-emerald-600">{formatEuro(r.interessiConto || 0)}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600">{formatEuro(r.interessiContoComulativo || 0)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">{formatEuro(r.commissioniMensili || 0)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">{formatEuro(r.commissioniomulative || 0)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">{formatEuro(r.dividendi || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Interests, Savebacks and Dividends widgets */}
          {activeConto === 'trade' && (
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Interessi Accumulati (4% annuo)</span>
                <span className="text-lg font-bold text-slate-800 font-display block mt-1">€12.33 / mese</span>
                <span className="text-[9px] text-slate-400 mt-1 block">Accumulo annuale cumulato: €152.10</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Saveback Maturati</span>
                <span className="text-lg font-bold text-slate-800 font-display block mt-1">€10.00 / mese</span>
                <span className="text-[9px] text-slate-400 mt-1 block">Accreditati automaticamente nel PAC</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Interessi Bond & Dividendi</span>
                <span className="text-lg font-bold text-emerald-600 font-display block mt-1">€45.18</span>
                <span className="text-[9px] text-slate-400 mt-1 block">Ritorno cedolare staccato semestralmente</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Fondo Pensione data */}
      {activeTab === 'pensione' && (
        <div className="space-y-6 text-left animate-fadeIn">
          {/* Key summaries layout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Valore Fondo Accumulato</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 block mt-1">
                {formatEuro(FONDO_PENSIONE_DATA[FONDO_PENSIONE_DATA.length - 1].totCumulativo)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Totale versato comprensivo di quota TFR</p>
            </div>
            
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Versamento Mensile Medio</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 block mt-1">
                {formatEuro(FONDO_PENSIONE_DATA.reduce((sum, item) => sum + item.totMensile, 0) / FONDO_PENSIONE_DATA.length)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">PAC integrato con contributo datore</p>
            </div>

            <div className="p-5 rounded-3xl border shadow-sm flex flex-col justify-between h-32 bg-emerald-50/10 border-emerald-200 transition-all duration-300 hover:shadow-md">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Contributo Azienda Attivo</span>
              <span className="text-2xl font-extrabold font-display text-emerald-600 block mt-1">€44.00</span>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Contributo base datoriale sbloccato</p>
            </div>
          </div>

          {/* Stacked bar charts showing pension contributions breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
            <h3 className="font-bold text-slate-800 font-display text-base mb-2">Composizione Flusso Mensile Versamenti</h3>
            <p className="text-xs text-slate-400 mb-4 font-medium">Breakdown per singola quota: TFR, Dipendente Base, Volontario, Datoriale</p>
            
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={FONDO_PENSIONE_DATA}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mese" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
                  <Tooltip
                    formatter={(value: any) => formatEuro(value)}
                    contentStyle={{
                      background: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar dataKey="tfr" name="Quota TFR" stackId="pension" fill="#4f46e5" />
                  <Bar dataKey="contrBase" name="Contributo Base Dipendente" stackId="pension" fill="#f59e0b" />
                  <Bar dataKey="contrVolont" name="Contributo Volontario" stackId="pension" fill="#10b981" />
                  <Bar dataKey="contrAzienda" name="Contributo Datoriale Azienda" stackId="pension" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pension Details table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
            <h3 className="font-bold text-slate-800 font-display text-base mb-4">Registro Storico Versamenti Fondo Pensione</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-100">
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
                <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                  {FONDO_PENSIONE_DATA.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-155">
                      <td className="px-6 py-3.5 font-bold text-slate-850 capitalize">{r.mese}</td>
                      <td className="px-6 py-3.5 text-right">{formatEuro(r.tfr)}</td>
                      <td className="px-6 py-3.5 text-right">{formatEuro(r.contrBase)}</td>
                      <td className="px-6 py-3.5 text-right text-indigo-500 font-semibold">{formatEuro(r.contrVolont)}</td>
                      <td className="px-6 py-3.5 text-right">{formatEuro(r.contrAzienda)}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800">{formatEuro(r.totMensile)}</td>
                      <td className="px-6 py-3.5 text-right font-black text-indigo-600">{formatEuro(r.totCumulativo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
