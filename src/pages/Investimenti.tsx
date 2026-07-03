import React, { useState, useMemo, useEffect } from 'react';
import CruscottoGenerale from '../subviews/CruscottoGenerale';
import Conti from '../subviews/Conti';
import FondoPensione from '../subviews/FondoPensione';
import { computeCruscottoData, computeRealAssetAllocation } from '../utils/cruscottoInvestimenti';
import {
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
  const inspectorTargetRawIndex = useMemo(() => {
    const rawIdx = selectedRawIndex;
    if (isCurrentMonthSelected) {
      return rawIdx !== -1 ? rawIdx - 1 : localRendimenti.length - 2;
    }
    return rawIdx !== -1 ? rawIdx : localRendimenti.length - 1;
  }, [selectedRawIndex, isCurrentMonthSelected, localRendimenti]);

  // 2. Global inspector record with 0-value fallback
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
    if (sheetsData) {
      const computed = computeCruscottoData(sheetsData);
      if (computed && computed.length > 0) {
        return computed;
      }
    }
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
    
    return [
      { mese: 'Lug 25', anno: 2025, rendimentoMensileEuro: 45, rendimentoMensilePerc: 0.9, importoMensileInvestitoe: 200, rendimentoCumulativoEuro: 45, rendimentoCumulativoPerc: 0.9, totaleInvestito: 5000, saldoConto: 5045, saldoContoCompleto: 5045, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 2.99, dividendi: 0 },
      { mese: 'Ago 25', anno: 2025, rendimentoMensileEuro: -30, rendimentoMensilePerc: -0.6, importoMensileInvestitoe: 200, rendimentoCumulativoEuro: 15, rendimentoCumulativoPerc: 0.3, totaleInvestito: 5200, saldoConto: 5215, saldoContoCompleto: 5215, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 5.98, dividendi: 0 },
      { mese: 'Set 25', anno: 2025, rendimentoMensileEuro: 85, rendimentoMensilePerc: 1.6, importoMensileInvestitoe: 200, rendimentoCumulativoEuro: 100, rendimentoCumulativoPerc: 1.8, totaleInvestito: 5400, saldoConto: 5500, saldoContoCompleto: 5500, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 8.97, dividendi: 12 },
      { mese: 'Ott 25', anno: 2025, rendimentoMensileEuro: 50, rendimentoMensilePerc: 0.9, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 150, rendimentoCumulativoPerc: 2.6, totaleInvestito: 5700, saldoConto: 5850, saldoContoCompleto: 5850, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 11.96, dividendi: 0 },
      { mese: 'Nov 25', anno: 2025, rendimentoMensileEuro: 90, rendimentoMensilePerc: 1.5, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 240, rendimentoCumulativoPerc: 4.0, totaleInvestito: 6000, saldoConto: 6240, saldoContoCompleto: 6240, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 14.95, dividendi: 0 },
      { mese: 'Dic 25', anno: 2025, rendimentoMensileEuro: 120, rendimentoMensilePerc: 1.9, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 360, rendimentoCumulativoPerc: 5.6, totaleInvestito: 6400, saldoConto: 6760, saldoContoCompleto: 6760, interessiConto: 0, interessiContoComulativo: 0, commissioniMensili: 2.99, commissioniomulative: 17.94, dividendi: 25 },
      
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
    
    return [
      { mese: 'Lug 25', anno: 2025, rendimentoMensileEuro: 165, rendimentoMensilePerc: 1.1, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 1285, rendimentoCumulativoPerc: 8.6, totaleInvestito: 15000, saldoConto: 16285, interessiConto: 10.50, interessiContoComulativo: 10.50, commissioniMensili: 1.00, commissioniomulative: 1.00, dividendi: 15 },
      { mese: 'Ago 25', anno: 2025, rendimentoMensileEuro: -110, rendimentoMensilePerc: -0.7, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 1175, rendimentoCumulativoPerc: 7.7, totaleInvestito: 15300, saldoConto: 16475, interessiConto: 11.20, interessiContoComulativo: 21.70, commissioniMensili: 1.00, commissioniomulative: 2.00, dividendi: 0 },
      { mese: 'Set 25', anno: 2025, rendimentoMensileEuro: 225, rendimentoMensilePerc: 1.4, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 1400, rendimentoCumulativoPerc: 8.9, totaleInvestito: 15700, saldoConto: 17100, interessiConto: 12.10, interessiContoComulativo: 33.80, commissioniMensili: 1.00, commissioniomulative: 3.00, dividendi: 28 },
      { mese: 'Ott 25', anno: 2025, rendimentoMensileEuro: 130, rendimentoMensilePerc: 0.8, importoMensileInvestitoe: 350, rendimentoCumulativoEuro: 1530, rendimentoCumulativoPerc: 9.5, totaleInvestito: 16050, saldoConto: 17580, interessiConto: 12.40, interessiContoComulativo: 46.20, commissioniMensili: 1.00, commissioniomulative: 4.00, dividendi: 0 },
      { mese: 'Nov 25', anno: 2025, rendimentoMensileEuro: 200, rendimentoMensilePerc: 1.1, importoMensileInvestitoe: 300, rendimentoCumulativoEuro: 1730, rendimentoCumulativoPerc: 10.6, totaleInvestito: 16350, saldoConto: 18080, interessiConto: 12.85, interessiContoComulativo: 59.05, commissioniMensili: 1.00, commissioniomulative: 5.00, dividendi: 0 },
      { mese: 'Dic 25', anno: 2025, rendimentoMensileEuro: 300, rendimentoMensilePerc: 1.6, importoMensileInvestitoe: 500, rendimentoCumulativoEuro: 2030, rendimentoCumulativoPerc: 12.1, totaleInvestito: 16850, saldoConto: 18880, interessiConto: 13.50, interessiContoComulativo: 72.55, commissioniMensili: 1.00, commissioniomulative: 6.00, dividendi: 45 },
      
      { mese: 'Gen 26', anno: 2026, rendimentoMensileEuro: -40, rendimentoMensilePerc: -0.2, importoMensileInvestitoe: 350, rendimentoCumulativoEuro: 1990, rendimentoCumulativoPerc: 11.6, totaleInvestito: 17200, saldoConto: 19190, interessiConto: 13.80, interessiContoComulativo: 86.35, commissioniMensili: 1.00, commissioniomulative: 7.00, dividendi: 0 },
      { mese: 'Feb 26', anno: 2026, rendimentoMensileEuro: 115, rendimentoMensilePerc: 0.6, importoMensileInvestitoe: 310, rendimentoCumulativoEuro: 2105, rendimentoCumulativoPerc: 11.9, totaleInvestito: 17510, saldoConto: 19615, interessiConto: 14.10, interessiContoComulativo: 100.45, commissioniMensili: 1.00, commissioniomulative: 8.00, dividendi: 22 },
      { mese: 'Mar 26', anno: 2026, rendimentoMensileEuro: 230, rendimentoMensilePerc: 1.2, importoMensileInvestitoe: 450, rendimentoCumulativoEuro: 2335, rendimentoCumulativoPerc: 13.0, totaleInvestito: 17960, saldoConto: 20295, interessiConto: 14.50, interessiContoComulativo: 114.95, commissioniMensili: 1.00, commissioniomulative: 9.00, dividendi: 0 },
      { mese: 'Apr 26', anno: 2026, rendimentoMensileEuro: 280, rendimentoMensilePerc: 1.4, importoMensileInvestitoe: 410, rendimentoCumulativoEuro: 2615, rendimentoCumulativoPerc: 14.2, totaleInvestito: 18370, saldoConto: 20985, interessiConto: 15.10, interessiContoComulativo: 130.05, commissioniMensili: 1.00, commissioniomulative: 10.00, dividendi: 0 },
      { mese: 'Mag 26', anno: 2026, rendimentoMensileEuro: -70, rendimentoMensilePerc: -0.3, importoMensileInvestitoe: 450, rendimentoCumulativoEuro: 2545, rendimentoCumulativoPerc: 13.5, totaleInvestito: 18820, saldoConto: 21365, interessiConto: 15.30, interessiContoComulativo: 145.35, commissioniMensili: 1.00, commissioniomulative: 11.00, dividendi: 38 },
      { mese: 'Giu 26', anno: 2026, rendimentoMensileEuro: 300, rendimentoMensilePerc: 1.4, importoMensileInvestitoe: 400, rendimentoCumulativoEuro: 2845, rendimentoCumulativoPerc: 14.8, totaleInvestito: 19220, saldoConto: 22065, interessiConto: 15.80, interessiContoComulativo: 161.15, commissioniMensili: 1.00, commissioniomulative: 12.00, dividendi: 0 }
    ];
  }, [sheetsData?.tradeRepublic]);

  const localFondoPensione = useMemo(() => {
    return sheetsData?.fondoPensione?.length > 0
      ? sheetsData.fondoPensione
      : FONDO_PENSIONE_DATA;
  }, [sheetsData?.fondoPensione]);

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
        <CruscottoGenerale
          CRUSCOTTO_GENERALE={CRUSCOTTO_GENERALE}
          CRUSCOTTO_ANNO={CRUSCOTTO_ANNO}
          calculatedRendimentoAnnuo={calculatedRendimentoAnnuo}
          elapsedMonthsForSelectedYear={elapsedMonthsForSelectedYear}
          globalSelectedYear={globalSelectedYear}
          nestedPieData={nestedPieData}
          totalAssetAllocation={totalAssetAllocation}
          selectedMacroCategory={selectedMacroCategory}
          setSelectedMacroCategory={setSelectedMacroCategory}
          filteredDetailData={filteredDetailData}
          subTab={subTab}
          setSubTab={setSubTab}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          chartData={chartData}
          globalInspectorRecord={globalInspectorRecord}
          cruscottoRows={cruscottoRows}
          formatEuro={formatEuro}
          formatPercent={formatPercent}
          lastValidRendimento={lastValidRendimento}
        />
      )}

      {/* TAB 2: Conti details */}
      {activeTab === 'conti' && (
        <Conti
          activeConto={activeConto}
          setActiveConto={setActiveConto}
          accountKPIs={accountKPIs}
          localScalableInstruments={localScalableInstruments}
          localTradeRepublicInstruments={localTradeRepublicInstruments}
          sortedFilteredRecords={sortedFilteredRecords}
          globalSelectedYear={globalSelectedYear}
          formatEuro={formatEuro}
          formatPercent={formatPercent}
        />
      )}

      {/* TAB 3: Fondo Pensione data */}
      {activeTab === 'pensione' && (
        <FondoPensione
          FONDO_PENSIONE_DATA={localFondoPensione}
          formatEuro={formatEuro}
          selectedMonthName={globalSelectedMonth}
          selectedYearStr={globalSelectedYear}
        />
      )}
    </div>
  );
}
