import { useState, useMemo, useEffect } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { MESI_ITALIANI } from '../utils/date';

const monthsOrder = MESI_ITALIANI;

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

/**
 * Merge Entrate + Risparmio, trend e drawer della pagina Entrate, separati
 * dal JSX per isolare i bug numerici dal layout.
 */
export function useEntrateData(
  selectedYear: string,
  setSelectedYear: (year: string) => void,
  selectedMonth: string,
  setSelectedMonth: (month: string) => void
) {
  const { data } = useFinanceData();

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
    if (!data.entrate) return [];
    return data.entrate
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
  }, [data.entrate]);

  // 2. Normalizziamo il foglio Risparmio reale filtrando le sole righe valide con dati mensili effettivi
  const normalizedRisparmio = useMemo(() => {
    if (!data.risparmio) return [];
    return data.risparmio
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
  }, [data.risparmio]);

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

  // Apertura Drawer al click sui punti del grafico. Sincronizza anche il selettore globale in header.
  const handlePointClick = (monthName: string, yearValue: number, totalEntrate: number) => {
    setLocalSelectedMonth(monthName);
    setSelectedMonth(monthName);
    setSelectedYear(yearValue.toString());

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

  return {
    localSelectedMonth,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerTransactions, drawerStats,
    COLORS,
    chartData,
    selectedRecord, prevRecord,
    totalIncomeForSelectedYear, avgMonthlyIncome,
    categoryData, accountData,
    activeMonthEntries,
    handlePointClick
  };
}
