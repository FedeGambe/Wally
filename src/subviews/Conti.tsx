import { useMemo } from 'react';
import { ChevronUp, Landmark, PiggyBank, ArrowUpRight, TrendingUp } from 'lucide-react';

// ponytail: scala colore graduata (verde->rosso) in base al segno/intensità del rendimento %, satura a ±maxAbs
function rendColor(perc: number, maxAbs = 3): string {
  const t = Math.min(Math.abs(perc) / maxAbs, 1);
  const hue = perc >= 0 ? 158 : 350;
  const saturation = 30 + t * 55;
  const lightness = 58 - t * 16;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

interface ContiProps {
  activeConto: 'scalable' | 'trade';
  setActiveConto: (conto: 'scalable' | 'trade') => void;
  accountKPIs: any;
  localScalableInstruments: any[];
  localTradeRepublicInstruments: any[];
  sortedFilteredRecords: any[];
  globalSelectedYear: string;
  formatEuro: (val: any) => string;
  formatPercent: (val: any) => string;
}

export default function Conti({
  activeConto,
  setActiveConto,
  accountKPIs,
  sortedFilteredRecords,
  globalSelectedYear,
  formatEuro,
  formatPercent,
}: ContiProps) {
  // 1. Find the latest record in the chronological filtered records
  const latestRecord = useMemo(() => {
    return sortedFilteredRecords.length > 0 ? sortedFilteredRecords[sortedFilteredRecords.length - 1] : null;
  }, [sortedFilteredRecords]);

  // 2. Compute dynamic metrics for top 3 KPIs (Saldo, Investito, Plusvalenza)
  const topKPIs = useMemo(() => {
    let targetRecord = latestRecord;
    let isFallbackMonth = false;

    if (latestRecord && Number(latestRecord.saldoConto || 0) === 0 && sortedFilteredRecords.length > 1) {
      // Find the first record going backwards that has a non-zero saldoConto
      for (let i = sortedFilteredRecords.length - 2; i >= 0; i--) {
        const r = sortedFilteredRecords[i];
        if (Number(r.saldoConto || 0) !== 0) {
          targetRecord = r;
          isFallbackMonth = true;
          break;
        }
      }
    }

    if (targetRecord) {
      const saldo = Number(targetRecord.saldoConto || 0);
      const investito = Number(targetRecord.totaleInvestito || 0);
      const plusvalenza = Number(targetRecord.rendimentoCumulativoEuro || 0);

      if (saldo !== 0 || investito !== 0 || plusvalenza !== 0) {
        return {
          saldo,
          investito,
          plusvalenza,
          isReal: true,
          mese: targetRecord.mese,
          isFallbackMonth
        };
      }
    }

    // Fallback to the static mock-based KPIs
    return {
      saldo: accountKPIs[activeConto]?.saldo || 0,
      investito: accountKPIs[activeConto]?.investito || 0,
      plusvalenza: accountKPIs[activeConto]?.plusvalenza || 0,
      isReal: false,
      mese: null,
      isFallbackMonth: false
    };
  }, [latestRecord, sortedFilteredRecords, accountKPIs, activeConto]);

  // 3. Compute real metrics for Trade Republic widgets (Interessi, Savebacks, Bond/Dividends)
  const realMetrics = useMemo(() => {
    let sumInteressi = 0;
    let sumSaveback = 0;
    let sumDividendi = 0;
    let hasRealData = false;

    sortedFilteredRecords.forEach(r => {
      const intVal = Number(r.interessiConto || r.interessiContoComulativo || 0);
      const sbVal = Number(r.savebacks || 0);
      const divVal = Number(r.dividendiIbonds || 0) + Number(r.dividendiAmundi || 0) + Number(r.dividendi || 0);

      if (intVal !== 0 || sbVal !== 0 || divVal !== 0) {
        hasRealData = true;
      }

      sumInteressi += intVal;
      sumSaveback += sbVal;
      sumDividendi += divVal;
    });

    const latestInteressi = latestRecord ? Number(latestRecord.interessiConto || 0) : 0;
    const latestSaveback = latestRecord ? Number(latestRecord.savebacks || 0) : 0;
    const latestDividendi = latestRecord 
      ? (Number(latestRecord.dividendiIbonds || 0) + Number(latestRecord.dividendiAmundi || 0) + Number(latestRecord.dividendi || 0)) 
      : 0;

    // Elegant fallback to mock data if there is no real sheet record at all
    if (!hasRealData && sortedFilteredRecords.length === 0) {
      return {
        monthlyInteressi: 12.33,
        annualInteressi: 152.10,
        monthlySaveback: 10.00,
        annualSaveback: 120.00,
        monthlyDividendi: 45.18,
        annualDividendi: 542.16,
      };
    }

    return {
      monthlyInteressi: latestInteressi,
      annualInteressi: sumInteressi,
      monthlySaveback: latestSaveback,
      annualSaveback: sumSaveback,
      monthlyDividendi: latestDividendi,
      annualDividendi: sumDividendi,
    };
  }, [sortedFilteredRecords, latestRecord]);

  // 4. Compute running totals for interests, saveback and dividends
  const runningTotals = useMemo(() => {
    let cumInteressi = 0;
    let cumSaveback = 0;
    let cumDividendi = 0;

    return sortedFilteredRecords.map(r => {
      const intVal = Number(r.interessiConto || 0);
      const sbVal = Number(r.savebacks || 0);
      const divVal = Number(r.dividendiIbonds || 0) + Number(r.dividendiAmundi || 0) + Number(r.dividendi || 0);

      cumInteressi += intVal;
      cumSaveback += sbVal;
      cumDividendi += divVal;

      return {
        mese: r.mese,
        interessi: intVal,
        cumInteressi,
        saveback: sbVal,
        cumSaveback,
        dividendi: divVal,
        cumDividendi,
        dividendiIbonds: Number(r.dividendiIbonds || 0),
        dividendiAmundi: Number(r.dividendiAmundi || 0),
      };
    });
  }, [sortedFilteredRecords]);

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Subtabs to choose between Scalable Capital and Trade republic */}
      <div className="flex border-b border-slate-200 dark:border-slate-800/60 gap-6 mb-6 select-none outline-hidden">
        <button
          onClick={() => setActiveConto('scalable')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeConto === 'scalable'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Scalable Capital Portfolio
        </button>
        <button
          onClick={() => setActiveConto('trade')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeConto === 'trade'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Trade Republic Portfolio
        </button>
      </div>

      {/* Accounts KPIs panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0c1425]/45 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Saldo Attuale Portafoglio</span>
          <span className="text-2xl font-black font-display text-slate-800 dark:text-slate-100 block mt-1">
            {formatEuro(topKPIs.saldo)}
          </span>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            {topKPIs.isReal 
              ? `${topKPIs.isFallbackMonth ? 'Dato precedente rilevato' : 'Valutazione reale rilevata'} nel mese di ${topKPIs.mese}` 
              : 'Valutazione corrente di tutti gli strumenti'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-[#0c1425]/45 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Totale Capitale Investito</span>
          <span className="text-2xl font-black font-display text-slate-800 dark:text-slate-100 block mt-1">
            {formatEuro(topKPIs.investito)}
          </span>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            {topKPIs.isReal ? `Capitale totale investito al mese di ${topKPIs.mese}` : 'Versato cumulativo netto'}
          </p>
        </div>

        <div className={`p-5 rounded-3xl border flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md ${
          topKPIs.plusvalenza >= 0
            ? 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-500/30 dark:border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]'
            : 'bg-white dark:bg-[#0c1425]/45 border-slate-200 dark:border-slate-800/80 shadow-sm'
        }`}>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Plusvalenza Attiva</span>
          <span className={`text-2xl font-black font-display block mt-1 flex items-center gap-1 ${
            topKPIs.plusvalenza >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {topKPIs.plusvalenza >= 0 ? (
              <ChevronUp className="w-5 h-5 shrink-0" />
            ) : (
              <span className="text-lg shrink-0">-</span>
            )}
            {formatEuro(Math.abs(topKPIs.plusvalenza))}
          </span>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
            {topKPIs.isReal ? `Rendimento cumulativo registrato al mese di ${topKPIs.mese}` : `Contributore principale: ${accountKPIs[activeConto]?.topContributor || 'SToxx 600'}`}
          </p>
        </div>
      </div>

      {/* Trade Republic Interests, Savebacks and Dividends widgets - MOVED ABOVE REGISTRO */}
      {activeConto === 'trade' && (
        <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-6 border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Dettaglio Rendimenti e Benefit Accumulati ({globalSelectedYear})
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Riepilogo delle voci di rendimento passivo con dettaglio sullo storico e progressione cumulativa.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: INTERESSI ACCUMULATI */}
            <div className="p-5 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-150/40 dark:border-indigo-900/20 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Interessi Accumulati</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded">4% Lordo</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-display block">
                    {formatEuro(realMetrics.annualInteressi)}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block font-medium mt-1">
                    Totale maturato nell'anno
                  </span>
                </div>
              </div>
              
              {/* Historical progression list */}
              <div className="mt-4 border-t border-indigo-150/40 dark:border-indigo-900/20 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Progressione Storica (Cumulato)</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {runningTotals.length === 0 ? (
                    <span className="text-xs text-slate-400 block py-2">Nessun dato registrato</span>
                  ) : (
                    runningTotals.slice().reverse().map((m, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-500 dark:text-slate-400 capitalize">{m.mese}</span>
                        <div className="text-right font-mono">
                          <span className="text-slate-800 dark:text-slate-200 font-bold">{formatEuro(m.cumInteressi)}</span>
                          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 ml-1.5">({formatEuro(m.interessi)})</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: SAVEBACK */}
            <div className="p-5 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-150/40 dark:border-indigo-900/20 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Saveback Maturati</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded">1% Spesa</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-display block">
                    {formatEuro(realMetrics.annualSaveback)}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block font-medium mt-1">
                    Totale accreditato nell'anno
                  </span>
                </div>
              </div>

              {/* Historical progression list */}
              <div className="mt-4 border-t border-indigo-150/40 dark:border-indigo-900/20 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Progressione Storica (Cumulato)</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {runningTotals.length === 0 ? (
                    <span className="text-xs text-slate-400 block py-2">Nessun dato registrato</span>
                  ) : (
                    runningTotals.slice().reverse().map((m, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-500 dark:text-slate-400 capitalize">{m.mese}</span>
                        <div className="text-right font-mono">
                          <span className="text-slate-800 dark:text-slate-200 font-bold">{formatEuro(m.cumSaveback)}</span>
                          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 ml-1.5">({formatEuro(m.saveback)})</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 3: INTERESSI BOND & DIVIDENDI */}
            <div className="p-5 rounded-2xl bg-emerald-50/10 dark:bg-emerald-950/10 border border-emerald-100/20 dark:border-emerald-900/20 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Bond & Dividendi</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100/30 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">Cedole</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-display block">
                    {formatEuro(realMetrics.annualDividendi)}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block font-medium mt-1">
                    Totale pagato nell'anno
                  </span>
                </div>
              </div>

              {/* Historical progression list */}
              <div className="mt-4 border-t border-emerald-100/20 dark:border-emerald-900/20 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Progressione Storica (Cumulato)</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-100/30 dark:scrollbar-thumb-emerald-900/30">
                  {runningTotals.length === 0 ? (
                    <span className="text-xs text-slate-400 block py-2">Nessun dato registrato</span>
                  ) : (
                    runningTotals.slice().reverse().map((m, i) => (
                      <div key={i} className="flex flex-col text-xs py-1 border-b border-slate-100/10 last:border-0">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400 capitalize font-medium">{m.mese}</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatEuro(m.cumDividendi)}
                          </span>
                        </div>
                        {(m.dividendiIbonds > 0 || m.dividendiAmundi > 0) && (
                          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 pl-2 font-mono mt-0.5">
                            <span>iBonds: {formatEuro(m.dividendiIbonds)}</span>
                            <span>Amundi: {formatEuro(m.dividendiAmundi)}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Monthly Spreadsheet Structure */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Registro Storico Mensile — Foglio di Calcolo ({activeConto === 'scalable' ? 'Scalable Capital' : 'Trade Republic'})
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              Rappresentazione della struttura del foglio Google filtrata per l'anno {globalSelectedYear}
            </p>
          </div>
          <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold font-mono self-start sm:self-center">
            Anno: {globalSelectedYear}
          </div>
        </div>

        {sortedFilteredRecords.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Nessun dato mensile disponibile per l'anno {globalSelectedYear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider border-b border-indigo-100/60 dark:border-indigo-900/40">
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
                  {activeConto === 'trade' ? (
                    <th className="px-4 py-3 text-right">Savebacks</th>
                  ) : (
                    <th className="px-4 py-3 text-right">Interessi Cumulati</th>
                  )}
                  <th className="px-4 py-3 text-right">Commissioni Mese</th>
                  <th className="px-4 py-3 text-right">Commissioni Cumul.</th>
                  <th className="px-4 py-3 text-right rounded-tr-2xl">Dividendi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-medium">
                {sortedFilteredRecords.map((r, idx) => {
                  const rendMese = Number(r.rendimentoMensileEuro || 0);
                  const rendCum = Number(r.rendimentoCumulativoEuro || 0);
                  const divSum = Number(r.dividendiIbonds || 0) + Number(r.dividendiAmundi || 0) + Number(r.dividendi || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors duration-155">
                      <td className="px-4 py-3 font-bold text-slate-850 dark:text-slate-200 capitalize">{r.mese}</td>
                      <td className="px-4 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoMensilePerc || 0)) }}>
                        {rendMese >= 0 ? '+' : ''}{formatEuro(rendMese)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoMensilePerc || 0)) }}>
                        {formatPercent(r.rendimentoMensilePerc || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatEuro(r.importoMensileInvestitoe || r.importoMensileInvestito || 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoCumulativoPerc || 0)) }}>
                        {rendCum >= 0 ? '+' : ''}{formatEuro(rendCum)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoCumulativoPerc || 0)) }}>
                        {formatPercent(r.rendimentoCumulativoPerc || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatEuro(r.totaleInvestito || 0)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-850 dark:text-slate-100">{formatEuro(r.saldoConto || 0)}</td>
                      {activeConto === 'scalable' && (
                        <td className="px-4 py-3 text-right font-mono">{formatEuro(r.saldoContoCompleto || 0)}</td>
                      )}
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatEuro(r.interessiConto || 0)}</td>
                      {activeConto === 'trade' ? (
                        <td className="px-4 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400">{formatEuro(r.savebacks || 0)}</td>
                      ) : (
                        <td className="px-4 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400">{formatEuro(r.interessiContoComulativo || 0)}</td>
                      )}
                      <td className="px-4 py-3 text-right font-mono text-slate-400 dark:text-slate-500">{formatEuro(r.commissioniMensili || 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400 dark:text-slate-500">{formatEuro(r.commissioniomulative || 0)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatEuro(divSum)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
