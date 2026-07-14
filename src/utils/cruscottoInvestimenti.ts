/**
 * Utility per il calcolo dinamico del Cruscotto Investimenti.
 * Combina i dati di Scalable Capital, Trade Republic e Rendimenti
 * per generare le metriche aggregate anno per anno.
 */

interface MonthYear {
  month: number;
  year: number;
}

// Estrae mese e anno da una stringa come "Lug 25", "Giugno 2026", "Dicembre 25"
function parseMese(meseStr: string): MonthYear | null {
  if (!meseStr) return null;
  const str = String(meseStr).trim().toLowerCase();
  
  const parts = str.split(/[\s/\.\-]+/);
  if (parts.length < 2) return null;
  
  let mPart = parts[0];
  let yPart = parts[1];
  
  // Gestione formato YYYY-MM
  if (parts[0].length === 4 && !isNaN(Number(parts[0]))) {
    yPart = parts[0];
    mPart = parts[1];
  }
  
  let year = parseInt(yPart, 10);
  if (isNaN(year)) return null;
  if (year < 100) year += 2000;
  
  const m = mPart.substring(0, 3);
  const months: Record<string, number> = {
    gen: 1, jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    mag: 5, may: 5,
    giu: 6, jun: 6,
    lug: 7, jul: 7,
    ago: 8, aug: 8,
    set: 9, sep: 9,
    ott: 10, oct: 10,
    nov: 11,
    dic: 12, dec: 12
  };
  
  const month = months[m] || parseInt(mPart, 10);
  if (isNaN(month) || month < 1 || month > 12) return null;
  
  return { month, year };
}

/**
 * Calcola, per ogni anno presente nei fogli Scalable/Trade Republic/Rendimenti, il riepilogo
 * annuale investito e rendimento (in € e %). Usato da useInvestimentiData.ts (pagina
 * Investimenti) e da sheetsService.tsx quando prepara i dati da inviare al foglio Google.
 * Ritorna un array con un elemento per anno, ordinato dal più recente al più vecchio.
 */
export function computeCruscottoData(sheetsData: any): any[] {
  const scalable = sheetsData.scalable || [];
  const tradeRepublic = sheetsData.tradeRepublic || [];
  const rendimenti = sheetsData.rendimentiInvestimenti || sheetsData.rendimenti || [];

  const scalableCategories = sheetsData.scalableColumnCategories || {};
  const tradeRepublicCategories = sheetsData.tradeRepublicColumnCategories || {};

  // 1. Raccogliamo tutti gli anni presenti nei tre fogli
  const yearsSet = new Set<number>();

  const getYearsFromRecords = (records: any[]) => {
    records.forEach(r => {
      const parsed = parseMese(r.mese);
      if (parsed) {
        yearsSet.add(parsed.year);
      }
    });
  };

  getYearsFromRecords(scalable);
  getYearsFromRecords(tradeRepublic);
  getYearsFromRecords(rendimenti);

  const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);

  // 2. Mappiamo i record validi con il loro mese e anno per un rapido accesso
  const mapWithDate = (records: any[]) => {
    return records
      .map(r => {
        const date = parseMese(r.mese);
        return date ? { ...r, ...date } : null;
      })
      .filter(Boolean) as any[];
  };

  const scalableWithDate = mapWithDate(scalable);
  const tradeRepublicWithDate = mapWithDate(tradeRepublic);
  const rendimentiWithDate = mapWithDate(rendimenti);

  // Helper per sommare il valore delle colonne di una certa categoria per un record specifico
  const sumByCategory = (record: any, categoriesMap: Record<string, string>, category: string): number => {
    let sum = 0;
    Object.keys(categoriesMap).forEach(fieldName => {
      let resolvedCategory = categoriesMap[fieldName];

      // Healing logic: se la chiave del campo contiene parole come "bond" o "obbligazion", allora la categoria deve essere "obbligazioni"!
      const fieldLower = fieldName.toLowerCase();
      if (fieldLower.includes('bond') || fieldLower.includes('obbligazion') || fieldLower.includes('ibond')) {
        resolvedCategory = 'obbligazioni';
      } else if (fieldLower.includes('monetar') || fieldLower.includes('liqui') || fieldLower.includes('cash') || fieldLower.includes('swap') || fieldLower.includes('overnight')) {
        resolvedCategory = 'monetari';
      }

      if (resolvedCategory === category) {
        sum += Number(record[fieldName] || 0);
      }
    });
    return sum;
  };

  // 3. Calcoliamo i dati anno per anno
  const result: any[] = [];

  // Ordiniamo tutti i rendimenti cronologicamente per poter risalire a ritroso per il fallback
  const allSortedRendimenti = [...rendimentiWithDate].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // Stesso ordinamento cronologico per Scalable/Trade Republic, serve al fallback a ritroso
  // delle commissioni cumulate (colonna "Commissioni comulative"): se l'ultima riga dell'anno
  // ha quella cella vuota (mese in corso non ancora aggiornato), si retrocede fino a trovare
  // l'ultimo valore valorizzato, stesso pattern usato sopra per rendimentoCumulativoEuro.
  const allSortedScalable = [...scalableWithDate].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  const allSortedTradeRepublic = [...tradeRepublicWithDate].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

  const lastCommissioniCumulativeUpTo = (allSorted: any[], year: number, month: number): number => {
    for (let i = allSorted.length - 1; i >= 0; i--) {
      const r = allSorted[i];
      if (r.year > year || (r.year === year && r.month > month)) continue;
      const val = r.commissioniomulative;
      if (val !== null && val !== undefined && val !== '' && Number(val) !== 0) {
        return Number(val);
      }
    }
    return 0;
  };

  // Memorizziamo i valori cumulati dell'anno precedente per calcolare la differenza annuale
  let prevAzioniCum = 0;
  let prevObbligazioniCum = 0;
  let prevMonetariCum = 0;
  let prevCommissioniCum = 0;

  sortedYears.forEach((year, idx) => {
    // Trova l'ultimo record dell'anno in Scalable
    const scalableOfYear = scalableWithDate.filter(r => r.year === year);
    const lastScalable = scalableOfYear.length > 0
      ? scalableOfYear.sort((a, b) => b.month - a.month)[0]
      : null;

    // Trova l'ultimo record dell'anno in Trade Republic
    const tradeRepublicOfYear = tradeRepublicWithDate.filter(r => r.year === year);
    const lastTradeRepublic = tradeRepublicOfYear.length > 0
      ? tradeRepublicOfYear.sort((a, b) => b.month - a.month)[0]
      : null;

    // Calcoliamo il cumulato a fine anno sommando Scalable e Trade Republic
    let azioniInvestitoCum = 0;
    let obbligazioniInvestitoCum = 0;
    let monetariInvestitoCum = 0;

    if (lastScalable) {
      azioniInvestitoCum += sumByCategory(lastScalable, scalableCategories, 'azioni');
      obbligazioniInvestitoCum += sumByCategory(lastScalable, scalableCategories, 'obbligazioni');
      monetariInvestitoCum += sumByCategory(lastScalable, scalableCategories, 'monetari');
    }

    if (lastTradeRepublic) {
      azioniInvestitoCum += sumByCategory(lastTradeRepublic, tradeRepublicCategories, 'azioni');
      obbligazioniInvestitoCum += sumByCategory(lastTradeRepublic, tradeRepublicCategories, 'obbligazioni');
      monetariInvestitoCum += sumByCategory(lastTradeRepublic, tradeRepublicCategories, 'monetari');
    }

    // Se è il primo anno registrato, l'investito dell'anno coincide con il cumulato, altrimenti è la differenza con l'anno precedente
    const azioniInvestitoAnno = idx === 0 ? azioniInvestitoCum : Math.max(0, azioniInvestitoCum - prevAzioniCum);
    const obbligazioniInvestitoAnno = idx === 0 ? obbligazioniInvestitoCum : Math.max(0, obbligazioniInvestitoCum - prevObbligazioniCum);
    const monetariInvestitoAnno = idx === 0 ? monetariInvestitoCum : Math.max(0, monetariInvestitoCum - prevMonetariCum);

    // Commissioni cumulate (Scalable + Trade Republic) a fine anno: sono soldi usciti dalla
    // tasca ma non allocati in nessuna asset class, quindi si sommano solo all'investito, non
    // al rendimento/valutazione (che nel foglio Rendimenti è già calcolato al netto di queste).
    const commissioniInvestitoCum = lastCommissioniCumulativeUpTo(allSortedScalable, year, 12) +
      lastCommissioniCumulativeUpTo(allSortedTradeRepublic, year, 12);
    const commissioniInvestitoAnno = idx === 0 ? commissioniInvestitoCum : Math.max(0, commissioniInvestitoCum - prevCommissioniCum);

    // Salviamo i cumulati correnti per il prossimo anno nel ciclo
    prevAzioniCum = azioniInvestitoCum;
    prevObbligazioniCum = obbligazioniInvestitoCum;
    prevMonetariCum = monetariInvestitoCum;
    prevCommissioniCum = commissioniInvestitoCum;

    const investitoCumulativo = azioniInvestitoCum + obbligazioniInvestitoCum + monetariInvestitoCum + commissioniInvestitoCum;
    const investitoAnnuale = azioniInvestitoAnno + obbligazioniInvestitoAnno + monetariInvestitoAnno + commissioniInvestitoAnno;

    // --- Calcolo Rendimenti ---
    const rendimentiOfYear = rendimentiWithDate.filter(r => r.year === year);
    
    let rendimentoCumulativoEuro = 0;
    let rendimentoAnnualeEuro = 0;
    let rendimentoMedioMensilePerc = 0;
    let rendimentoAnnuoStimatoPerc = 0;

    if (rendimentiOfYear.length > 0) {
      // Ordiniamo per mese per trovare l'ultimo record dell'anno
      const sortedRendimenti = rendimentiOfYear.sort((a, b) => a.month - b.month);
      const lastRendimento = sortedRendimenti[sortedRendimenti.length - 1];

      // Rendimento cumulato a fine anno: se l'ultimo valore è null o vuoto o 0, prendiamo quello "sopra" (precedente cronologicamente)
      let chosenRendimento = lastRendimento;
      const lastRendimentoIdx = allSortedRendimenti.findIndex(
        r => r.year === year && r.month === lastRendimento.month
      );

      if (lastRendimentoIdx !== -1) {
        for (let i = lastRendimentoIdx; i >= 0; i--) {
          const r = allSortedRendimenti[i];
          const val = r.rendimentoCumulativoEuro;
          if (val !== null && val !== undefined && val !== '' && Number(val) !== 0) {
            chosenRendimento = r;
            break;
          }
        }
      }
      rendimentoCumulativoEuro = Number(chosenRendimento ? chosenRendimento.rendimentoCumulativoEuro : 0);

      // Rendimento annuale €: somma dei rendimenti mensili dell'anno
      rendimentoAnnualeEuro = sortedRendimenti.reduce((sum, r) => sum + Number(r.rendimentoMensileEuro || 0), 0);

      // Rendimento medio mensile %: escludiamo i mesi non ancora registrati (con rendimento mensile vuoto o zero)
      const validRendimenti = sortedRendimenti.filter(r => {
        const valEuro = r.rendimentoMensileEuro;
        const valPerc = r.rendimentoMensilePerc;
        return valEuro !== null && valEuro !== undefined && valEuro !== '' && Number(valEuro) !== 0;
      });

      const recordsToAverage = validRendimenti.length > 0 ? validRendimenti : sortedRendimenti;
      const sumPerc = recordsToAverage.reduce((sum, r) => sum + Number(r.rendimentoMensilePerc || 0), 0);
      rendimentoMedioMensilePerc = sumPerc / recordsToAverage.length;

      // Rendimento annuo %:
      // Se è l'anno corrente (o incompleto < 12 mesi), usiamo i mesi disponibili per stimare.
      // Moltiplichiamo il rendimento medio mensile * 12 per proiettare la percentuale annuale.
      rendimentoAnnuoStimatoPerc = rendimentoMedioMensilePerc * 12;
    }

    const yearData = {
      anno: year,
      azioniInvestitoCum,
      azioniInvestitoAnno,
      obbligazioniInvestitoCum,
      obbligazioniInvestitoAnno,
      monetariInvestitoCum,
      monetariInvestitoAnno,
      commissioniInvestitoCum,
      commissioniInvestitoAnno,
      investitoCumulativo,
      investitoAnnuale,
      rendimentoCumulativoEuro,
      rendimentoAnnualeEuro,
      rendimentoMedioMensilePerc,
      rendimentoAnnuoStimatoPerc
    };
    result.push(yearData);
  });

  // Ordiniamo l'array finale per anno decrescente (dal più recente al più vecchio)
  const sortedResult = result.sort((a, b) => b.anno - a.anno);
  return sortedResult;
}

/**
 * Calcola l'allocazione reale del patrimonio investito (quanto in Azioni/Obbligazioni/Monetari,
 * per singolo strumento e aggregato) guardando solo l'ULTIMA riga disponibile di Scalable e
 * Trade Republic (la fotografia più recente, non uno storico). Usato da useInvestimentiData.ts
 * per il grafico a torta dell'allocazione nella pagina Investimenti.
 * Nota: la logica di parsing del mese (parseMeseLocal) è una copia di parseMese qui sopra;
 * è duplicata volutamente per tenere questa funzione indipendente, non è un refactor da fare
 * "al volo" qui.
 */
export function computeRealAssetAllocation(sheetsData: any): { macroData: any[]; detailData: any[] } {
  if (!sheetsData) {
    return { macroData: [], detailData: [] };
  }

  const scalable = sheetsData.scalable || [];
  const tradeRepublic = sheetsData.tradeRepublic || [];

  const scalableCategories = sheetsData.scalableColumnCategories || {};
  const tradeRepublicCategories = sheetsData.tradeRepublicColumnCategories || {};

  const scalableFields = sheetsData.scalableFields || [];
  const scalableHeaders = sheetsData.scalableHeaders || [];

  const tradeRepublicFields = sheetsData.tradeRepublicFields || [];
  const tradeRepublicHeaders = sheetsData.tradeRepublicHeaders || [];

  // Helper to parse date
  const parseMeseLocal = (meseStr: string): MonthYear | null => {
    if (!meseStr) return null;
    const str = String(meseStr).trim().toLowerCase();
    
    const parts = str.split(/[\s/\.\-]+/);
    if (parts.length < 2) return null;
    
    let mPart = parts[0];
    let yPart = parts[1];
    
    // Gestione formato YYYY-MM
    if (parts[0].length === 4 && !isNaN(Number(parts[0]))) {
      yPart = parts[0];
      mPart = parts[1];
    }
    
    let year = parseInt(yPart, 10);
    if (isNaN(year)) return null;
    if (year < 100) year += 2000;
    
    const m = mPart.substring(0, 3);
    const months: Record<string, number> = {
      gen: 1, jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      mag: 5, may: 5,
      giu: 6, jun: 6,
      lug: 7, jul: 7,
      ago: 8, aug: 8,
      set: 9, sep: 9,
      ott: 10, oct: 10,
      nov: 11,
      dic: 12, dec: 12
    };
    
    const month = months[m] || parseInt(mPart, 10);
    if (isNaN(month) || month < 1 || month > 12) return null;
    
    return { month, year };
  };

  const mapWithDate = (records: any[]) => {
    return records
      .map(r => {
        const date = parseMeseLocal(r.mese);
        return date ? { ...r, ...date } : null;
      })
      .filter(Boolean) as any[];
  };

  const scalableWithDate = mapWithDate(scalable);
  const tradeRepublicWithDate = mapWithDate(tradeRepublic);

  // Find the latest records chronologically
  const latestScalable = scalableWithDate.length > 0
    ? [...scalableWithDate].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))[scalableWithDate.length - 1]
    : null;

  const latestTradeRepublic = tradeRepublicWithDate.length > 0
    ? [...tradeRepublicWithDate].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))[tradeRepublicWithDate.length - 1]
    : null;

  const detailList: any[] = [];

  const getCategoryForField = (fieldName: string, categoriesMap: Record<string, string>): string | null => {
    let resolvedCategory = categoriesMap[fieldName];
    const fieldLower = fieldName.toLowerCase();
    if (fieldLower.includes('bond') || fieldLower.includes('obbligazion') || fieldLower.includes('ibond')) {
      resolvedCategory = 'obbligazioni';
    } else if (fieldLower.includes('monetar') || fieldLower.includes('liqui') || fieldLower.includes('cash') || fieldLower.includes('swap') || fieldLower.includes('overnight')) {
      resolvedCategory = 'monetari';
    }
    return resolvedCategory || null;
  };

  const getHeaderForField = (fieldName: string, fields: string[], headers: string[]): string => {
    const idx = fields.indexOf(fieldName);
    if (idx !== -1 && headers[idx]) {
      return headers[idx];
    }
    return fieldName;
  };

  // Process Scalable latest row
  if (latestScalable) {
    Object.keys(scalableCategories).forEach(fieldName => {
      const category = getCategoryForField(fieldName, scalableCategories);
      if (category) {
        const val = Number(latestScalable[fieldName] || 0);
        if (val > 0) {
          const header = getHeaderForField(fieldName, scalableFields, scalableHeaders);
          detailList.push({
            nome: header,
            tipo: category === 'azioni' ? 'Azioni' : (category === 'obbligazioni' ? 'Obbligazioni' : 'Monetari'),
            importoInvestito: val
          });
        }
      }
    });
  }

  // Process Trade Republic latest row
  if (latestTradeRepublic) {
    Object.keys(tradeRepublicCategories).forEach(fieldName => {
      const category = getCategoryForField(fieldName, tradeRepublicCategories);
      if (category) {
        const val = Number(latestTradeRepublic[fieldName] || 0);
        if (val > 0) {
          const header = getHeaderForField(fieldName, tradeRepublicFields, tradeRepublicHeaders);
          detailList.push({
            nome: header,
            tipo: category === 'azioni' ? 'Azioni' : (category === 'obbligazioni' ? 'Obbligazioni' : 'Monetari'),
            importoInvestito: val
          });
        }
      }
    });
  }

  // Merge instruments with the exact same name and type
  const mergedDetails: Record<string, { nome: string; tipo: string; importoInvestito: number }> = {};
  detailList.forEach(item => {
    const key = `${item.nome}_${item.tipo}`.toLowerCase();
    if (mergedDetails[key]) {
      mergedDetails[key].importoInvestito += item.importoInvestito;
    } else {
      mergedDetails[key] = {
        nome: item.nome,
        tipo: item.tipo,
        importoInvestito: item.importoInvestito
      };
    }
  });

  const finalDetailData = Object.values(mergedDetails);

  const azioniTotal = finalDetailData.filter(i => i.tipo === 'Azioni').reduce((acc, i) => acc + i.importoInvestito, 0);
  const obbligazioniTotal = finalDetailData.filter(i => i.tipo === 'Obbligazioni').reduce((acc, i) => acc + i.importoInvestito, 0);
  const monetariTotal = finalDetailData.filter(i => i.tipo === 'Monetari').reduce((acc, i) => acc + i.importoInvestito, 0);

  const macroData = [
    { name: 'Azioni (Equity)', value: azioniTotal, color: '#3b82f6' },
    { name: 'Obbligazioni (Bonds)', value: obbligazioniTotal, color: '#f59e0b' },
    { name: 'Monetari (Cash/Swap)', value: monetariTotal, color: '#10b981' }
  ].filter(item => item.value > 0);

  return {
    macroData,
    detailData: finalDetailData
  };
}
