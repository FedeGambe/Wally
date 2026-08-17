import { useMemo } from 'react';
import { ChevronUp, Landmark, PiggyBank, ArrowUpRight, TrendingUp } from 'lucide-react';
import { rendColor } from '../utils/format';
import EuroAmount from '../components/EuroAmount';

// Sotto-vista "Conti" della pagina Investimenti: mostra il dettaglio dei due
// conti broker (Scalable Capital e Trade Republic), selezionabili con i tab in alto.
// Dati usati: sortedFilteredRecords (righe mensili del broker attivo, già filtrate
// per anno) e accountKPIs (valori di fallback quando non ci sono dati reali dal foglio).
// Contenuti principali:
//  - 3 KPI in alto (Saldo, Investito, Plusvalenza) calcolati dall'ultimo mese disponibile
//  - per Trade Republic: 3 pannelli con interessi/saveback/dividendi accumulati e relativo storico
//  - tabella "Registro Storico Mensile" con tutte le colonne del foglio Google per il broker attivo
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

    // Se il mese più recente ha saldo zero (es. dato non ancora aggiornato sul foglio),
    // torniamo indietro nel tempo finché non troviamo un mese con saldo reale, così i KPI
    // non mostrano "0 €" solo perché manca l'ultima riga.
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

    // Se non c'è nessun dato utile (né reale né fallback) nel foglio, mostriamo
    // i valori statici precalcolati in accountKPIs (dati mock/demo) invece che zero.
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
  // I dividendi sono la somma di più colonne del foglio (iBonds + Amundi + generico "dividendi"),
  // perché lo sheet storicamente ha aggiunto colonne separate per ogni fonte di dividendo.
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

    // Se non ci sono affatto righe dal foglio (utente nuovo, o filtro senza risultati),
    // mostriamo valori di esempio invece di 0 €, per non dare l'idea che l'app sia rotta.
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
  // Calcola il totale progressivo (somma cumulativa mese su mese) per alimentare le liste
  // "Progressione Storica" sotto ai 3 pannelli Trade Republic: ogni riga mostra il cumulato
  // fino a quel mese, non solo il valore del singolo mese.
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
      <div className="flex border-b border-hairline dark:border-slate-800/60 gap-6 mb-6 select-none outline-hidden">
        <button
          onClick={() => setActiveConto('scalable')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeConto === 'scalable'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 dark:border-sky-400'
              : 'border-transparent text-ink-soft hover:text-ink dark:hover:text-slate-200'
          }`}
        >
          Scalable Capital Portfolio
        </button>
        <button
          onClick={() => setActiveConto('trade')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeConto === 'trade'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 dark:border-sky-400'
              : 'border-transparent text-ink-soft hover:text-ink dark:hover:text-slate-200'
          }`}
        >
          Trade Republic Portfolio
        </button>
      </div>

      {/* Accounts KPIs panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0c1425]/45 p-5 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
          <span className="text-3xs text-ink-soft dark:text-slate-500 font-bold uppercase tracking-wider block">Saldo Attuale Portafoglio</span>
          <span className="text-2xl font-black font-display text-ink dark:text-slate-100 block mt-1">
            <EuroAmount value={topKPIs.saldo} />
          </span>
          <p className="text-3xs text-ink-soft dark:text-slate-500 mt-1">
            {topKPIs.isReal 
              ? `${topKPIs.isFallbackMonth ? 'Dato precedente rilevato' : 'Valutazione reale rilevata'} nel mese di ${topKPIs.mese}` 
              : 'Valutazione corrente di tutti gli strumenti'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-[#0c1425]/45 p-5 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md">
          <span className="text-3xs text-ink-soft dark:text-slate-500 font-bold uppercase tracking-wider block">Totale Capitale Investito</span>
          <span className="text-2xl font-black font-display text-ink dark:text-slate-100 block mt-1">
            <EuroAmount value={topKPIs.investito} />
          </span>
          <p className="text-3xs text-ink-soft dark:text-slate-500 mt-1">
            {topKPIs.isReal ? `Capitale totale investito al mese di ${topKPIs.mese}` : 'Versato cumulativo netto'}
          </p>
        </div>

        <div className={`p-5 rounded-3xl border flex flex-col justify-between h-32 transition-all duration-300 hover:shadow-md ${
          topKPIs.plusvalenza >= 0
            ? 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-500/30 dark:border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]'
            : 'bg-white dark:bg-[#0c1425]/45 border-hairline dark:border-slate-800/80 shadow-sm'
        }`}>
          <span className="text-3xs text-ink-soft dark:text-slate-500 font-bold uppercase tracking-wider block">Plusvalenza Attiva</span>
          <span className={`text-2xl font-black font-display block mt-1 flex items-center gap-1 ${
            topKPIs.plusvalenza >= 0 ? 'text-up' : 'text-down'
          }`}>
            {topKPIs.plusvalenza >= 0 ? (
              <ChevronUp className="w-5 h-5 shrink-0" />
            ) : (
              <span className="text-lg shrink-0">-</span>
            )}
            <EuroAmount value={Math.abs(topKPIs.plusvalenza)} />
          </span>
          <p className="text-3xs text-ink-soft dark:text-slate-500 mt-1 truncate">
            {topKPIs.isReal ? `Rendimento cumulativo registrato al mese di ${topKPIs.mese}` : `Contributore principale: ${accountKPIs[activeConto]?.topContributor || 'SToxx 600'}`}
          </p>
        </div>
      </div>

      {/* Trade Republic Interests, Savebacks and Dividends widgets - MOVED ABOVE REGISTRO */}
      {activeConto === 'trade' && (
        <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-6 border-b border-hairline dark:border-slate-800/60 pb-4">
            <h3 className="font-bold text-ink dark:text-slate-100 font-display text-base flex items-center gap-2">
              <Landmark className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              Dettaglio Rendimenti e Benefit Accumulati ({globalSelectedYear})
            </h3>
            <p className="text-xs text-ink-soft dark:text-slate-500 mt-0.5">
              Riepilogo delle voci di rendimento passivo con dettaglio sullo storico e progressione cumulativa.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: INTERESSI ACCUMULATI */}
            <div className="p-5 rounded-2xl bg-sky-50/20 dark:bg-sky-950/10 border border-sky-150/40 dark:border-sky-900/20 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-ink-soft dark:text-slate-400 uppercase tracking-wider block">Interessi Accumulati</span>
                  <span className="px-2 py-0.5 text-3xs font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded">4% Lordo</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-black text-sky-600 dark:text-sky-400 font-display block">
                    <EuroAmount value={realMetrics.annualInteressi} />
                  </span>
                  <span className="text-2xs text-ink-soft dark:text-slate-500 block font-medium mt-1">
                    Totale maturato nell'anno
                  </span>
                </div>
              </div>
              
              {/* Historical progression list */}
              <div className="mt-4 border-t border-sky-150/40 dark:border-sky-900/20 pt-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-ink-soft dark:text-slate-500 block mb-2">Progressione Storica (Cumulato)</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {runningTotals.length === 0 ? (
                    <span className="text-xs text-ink-soft block py-2">Nessun dato registrato</span>
                  ) : (
                    runningTotals.slice().reverse().map((m, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span className="text-ink-soft dark:text-slate-400 capitalize">{m.mese}</span>
                        <div className="text-right font-mono">
                          <span className="text-ink dark:text-slate-200 font-bold">{formatEuro(m.cumInteressi)}</span>
                          <span className="text-3xs text-emerald-500 dark:text-emerald-400 ml-1.5">({formatEuro(m.interessi)})</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: SAVEBACK */}
            <div className="p-5 rounded-2xl bg-sky-50/20 dark:bg-sky-950/10 border border-sky-150/40 dark:border-sky-900/20 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-ink-soft dark:text-slate-400 uppercase tracking-wider block">Saveback Maturati</span>
                  <span className="px-2 py-0.5 text-3xs font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded">1% Spesa</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-black text-sky-600 dark:text-sky-400 font-display block">
                    <EuroAmount value={realMetrics.annualSaveback} />
                  </span>
                  <span className="text-2xs text-ink-soft dark:text-slate-500 block font-medium mt-1">
                    Totale accreditato nell'anno
                  </span>
                </div>
              </div>

              {/* Historical progression list */}
              <div className="mt-4 border-t border-sky-150/40 dark:border-sky-900/20 pt-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-ink-soft dark:text-slate-500 block mb-2">Progressione Storica (Cumulato)</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {runningTotals.length === 0 ? (
                    <span className="text-xs text-ink-soft block py-2">Nessun dato registrato</span>
                  ) : (
                    runningTotals.slice().reverse().map((m, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span className="text-ink-soft dark:text-slate-400 capitalize">{m.mese}</span>
                        <div className="text-right font-mono">
                          <span className="text-ink dark:text-slate-200 font-bold">{formatEuro(m.cumSaveback)}</span>
                          <span className="text-3xs text-emerald-500 dark:text-emerald-400 ml-1.5">({formatEuro(m.saveback)})</span>
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
                  <span className="text-xs font-bold text-ink-soft dark:text-slate-400 uppercase tracking-wider block">Bond & Dividendi</span>
                  <span className="px-2 py-0.5 text-3xs font-bold bg-emerald-100/30 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">Cedole</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-black text-up font-display block">
                    <EuroAmount value={realMetrics.annualDividendi} />
                  </span>
                  <span className="text-2xs text-ink-soft dark:text-slate-500 block font-medium mt-1">
                    Totale pagato nell'anno
                  </span>
                </div>
              </div>

              {/* Historical progression list */}
              <div className="mt-4 border-t border-emerald-100/20 dark:border-emerald-900/20 pt-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-ink-soft dark:text-slate-500 block mb-2">Progressione Storica (Cumulato)</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-100/30 dark:scrollbar-thumb-emerald-900/30">
                  {runningTotals.length === 0 ? (
                    <span className="text-xs text-ink-soft block py-2">Nessun dato registrato</span>
                  ) : (
                    runningTotals.slice().reverse().map((m, i) => (
                      <div key={i} className="flex flex-col text-xs py-1 border-b border-hairline/10 last:border-0">
                        <div className="flex justify-between">
                          <span className="text-ink-soft dark:text-slate-400 capitalize font-medium">{m.mese}</span>
                          <span className="font-mono text-up font-bold">
                            {formatEuro(m.cumDividendi)}
                          </span>
                        </div>
                        {(m.dividendiIbonds > 0 || m.dividendiAmundi > 0) && (
                          <div className="flex justify-between text-3xs text-ink-soft dark:text-slate-500 pl-2 font-mono mt-0.5">
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
      <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-ink dark:text-slate-100 font-display text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              Registro Storico Mensile — Foglio di Calcolo ({activeConto === 'scalable' ? 'Scalable Capital' : 'Trade Republic'})
            </h3>
            <p className="text-xs text-ink-soft dark:text-slate-500 font-medium mt-0.5">
              Rappresentazione della struttura del foglio Google filtrata per l'anno {globalSelectedYear}
            </p>
          </div>
          <div className="px-3 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-full text-xs font-bold font-mono self-start sm:self-center">
            Anno: {globalSelectedYear}
          </div>
        </div>

        {sortedFilteredRecords.length === 0 ? (
          <div className="text-center py-8 bg-canvas/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-hairline dark:border-slate-800">
            <p className="text-sm text-ink-soft dark:text-slate-500 font-medium">Nessun dato mensile disponibile per l'anno {globalSelectedYear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b border-hairline dark:border-slate-800/60 text-2xs font-bold text-ink-soft dark:text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4">Mese</th>
                  <th scope="col" className="py-3 px-4 text-right">Rend. Mensile €</th>
                  <th scope="col" className="py-3 px-4 text-right">Rend. Mensile %</th>
                  <th scope="col" className="py-3 px-4 text-right">Importo Inv. Mese</th>
                  <th scope="col" className="py-3 px-4 text-right">Rend. Cumulativo €</th>
                  <th scope="col" className="py-3 px-4 text-right">Rend. Cumulativo %</th>
                  <th scope="col" className="py-3 px-4 text-right">Totale Investito</th>
                  <th scope="col" className="py-3 px-4 text-right">Saldo Conto</th>
                  {activeConto === 'scalable' && (
                    <th scope="col" className="py-3 px-4 text-right">Saldo Conto Compl.</th>
                  )}
                  <th scope="col" className="py-3 px-4 text-right">Interessi Conto</th>
                  {activeConto === 'trade' ? (
                    <th scope="col" className="py-3 px-4 text-right">Savebacks</th>
                  ) : (
                    <th scope="col" className="py-3 px-4 text-right">Interessi Cumulati</th>
                  )}
                  <th scope="col" className="py-3 px-4 text-right">Commissioni Mese</th>
                  <th scope="col" className="py-3 px-4 text-right">Commissioni Cumul.</th>
                  <th scope="col" className="py-3 px-4 text-right">Dividendi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs">
                {sortedFilteredRecords.map((r, idx) => {
                  const rendMese = Number(r.rendimentoMensileEuro || 0);
                  const rendCum = Number(r.rendimentoCumulativoEuro || 0);
                  const divSum = Number(r.dividendiIbonds || 0) + Number(r.dividendiAmundi || 0) + Number(r.dividendi || 0);
                  return (
                    <tr key={idx} className="hover:bg-canvas/60 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-ink dark:text-slate-200 capitalize">{r.mese}</td>
                      <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoMensilePerc || 0)) }}>
                        {rendMese >= 0 ? '+' : ''}{formatEuro(rendMese)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoMensilePerc || 0)) }}>
                        {formatPercent(r.rendimentoMensilePerc || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{formatEuro(r.importoMensileInvestitoe || r.importoMensileInvestito || 0)}</td>
                      <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoCumulativoPerc || 0)) }}>
                        {rendCum >= 0 ? '+' : ''}{formatEuro(rendCum)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold font-mono" style={{ color: rendColor(Number(r.rendimentoCumulativoPerc || 0)) }}>
                        {formatPercent(r.rendimentoCumulativoPerc || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{formatEuro(r.totaleInvestito || 0)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-ink dark:text-slate-100">{formatEuro(r.saldoConto || 0)}</td>
                      {activeConto === 'scalable' && (
                        <td className="py-3.5 px-4 text-right font-mono">{formatEuro(r.saldoContoCompleto || 0)}</td>
                      )}
                      <td className="py-3.5 px-4 text-right font-mono text-up">{formatEuro(r.interessiConto || 0)}</td>
                      {activeConto === 'trade' ? (
                        <td className="py-3.5 px-4 text-right font-mono text-sky-600 dark:text-sky-400">{formatEuro(r.savebacks || 0)}</td>
                      ) : (
                        <td className="py-3.5 px-4 text-right font-mono text-sky-600 dark:text-sky-400">{formatEuro(r.interessiContoComulativo || 0)}</td>
                      )}
                      <td className="py-3.5 px-4 text-right font-mono text-ink-soft dark:text-slate-500">{formatEuro(r.commissioniMensili || 0)}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-ink-soft dark:text-slate-500">{formatEuro(r.commissioniomulative || 0)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-600 dark:text-sky-400">{formatEuro(divSum)}</td>
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
