import React, { useEffect, useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import SelettorePeriodo from '../components/SelettorePeriodo';
import { useAnalisiConsumiPeriodo, Scomposizione } from '../hooks/useAnalisiConsumiPeriodo';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatAxisCompact, formatEuro, formatPercent } from '../utils/format';
import { fmtNum } from '../components/consumi/ConsumiChartHelpers';

/**
 * Scheda "Analisi periodo" di Analisi Consumi: quanto costa l'auto in carburante
 * su un periodo intero (ultimi 12 mesi, un anno, tutto, da/a) invece che sulla
 * singola settimana. Indicatori con il confronto sugli stessi mesi subito prima,
 * andamento della spesa mese per mese (o anno per anno) con il costo per 100 km,
 * la scomposizione della differenza di spesa (km, prezzo, consumo) e l'elenco dei
 * rifornimenti. Struttura gemella di AnalisiEntrate/AnalisiUscite.
 */
const ROSA = '#e11d48';
const AMBRA = '#f59e0b';
const CARD = 'bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left';
const PAGINA = 100;

const fmtData = (d: Date) => d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const variazione = (ora: number, prima: number) => (prima > 0 ? ((ora - prima) / prima) * 100 : null);

export default function AnalisiConsumiPeriodo() {
  const isMobile = useIsMobile();
  const d = useAnalisiConsumiPeriodo();
  const t = d.totali;
  const m = d.alMese;
  const prima = d.precedente?.alMese;
  const fraseConfronto = d.precedente ? `vs ${d.precedente.etichetta}` : '';
  const perAnno = d.raggruppa === 'anno' && d.piuAnni;
  const maxAsse = d.andamento.reduce((m, q) => Math.max(m, q.spesa), 0);

  // L'elenco mostra 100 righe per volta; si riparte da 100 quando cambia il periodo.
  const [mostrate, setMostrate] = useState(PAGINA);
  useEffect(() => setMostrate(PAGINA), [d.righe]);

  const confronto = (ora: number, ex: number | undefined, aumentoEPeggio: boolean | null) => {
    if (ex === undefined) return null;
    const v = variazione(ora, ex);
    if (v === null) return null;
    const colore = aumentoEPeggio === null ? 'text-ink-soft' : (v > 0) === aumentoEPeggio ? 'text-down' : 'text-up';
    return (
      <span className={`${colore} font-bold`}>
        {formatPercent(v, { signed: true })} <span className="text-ink-soft font-medium">{fraseConfronto}</span>
      </span>
    );
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const q = payload[0].payload;
    return (
      <div style={{ background: '#1e293b', borderRadius: 12, color: '#fff', fontSize: 12, padding: '8px 12px' }}>
        <div className="font-bold" style={{ marginBottom: 4 }}>{label}</div>
        <div>Spesa: {formatEuro(q.spesa)}</div>
        <div style={{ opacity: 0.8 }}>{fmtNum(q.km, 0)} km · {fmtNum(q.litri, 1)} Lt</div>
        {q.euroPer100Km !== null && <div style={{ color: AMBRA }}>{formatEuro(q.euroPer100Km)} ogni 100 km</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Periodo */}
      <div className="bg-white dark:bg-[#0c1425]/45 p-3 md:p-4 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <SelettorePeriodo p={d} accent="rose" ring="focus:ring-rose-500" />
          <span className="text-xs text-ink-soft md:ml-auto">
            {t.rifornimenti} {t.rifornimenti === 1 ? 'rifornimento' : 'rifornimenti'} · {fmtNum(t.litri, 1)} Lt
          </span>
        </div>
      </div>

      {/* Indicatori del periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Kpi titolo="Spesa carburante" valore={formatEuro(t.spesa)}>
          {formatEuro(m.spesa)} al mese{prima && <> · {confronto(m.spesa, prima.spesa, true)}</>}
        </Kpi>
        <Kpi titolo="Km percorsi" valore={`${fmtNum(t.km, 0)} km`}>
          {fmtNum(m.km, 0)} km al mese{prima && <> · {confronto(m.km, prima.km, null)}</>}
        </Kpi>
        <Kpi titolo="Costo per 100 km" valore={formatEuro(t.euroPer100Km)}>
          {confronto(t.euroPer100Km, prima?.euroPer100Km, true) ?? <>prezzo medio {fmtNum(t.prezzo, 3)} €/Lt</>}
        </Kpi>
        <Kpi titolo="Consumo medio" valore={`${fmtNum(t.kmAlLitro, 1)} km/Lt`}>
          {confronto(t.kmAlLitro, prima?.kmAlLitro, false) ?? <>km fatti con un litro</>}
        </Kpi>
      </div>

      {/* Andamento */}
      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink dark:text-slate-100 font-display text-base">
              Spesa {perAnno ? 'anno per anno' : 'mese per mese'}
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Barre: spesa in carburante. Linea: costo ogni 100 km{!perAnno && m.spesa > 0 ? '. Tratteggio: spesa media al mese' : ''}.
            </p>
          </div>
          {d.piuAnni && (
            <div role="tablist" aria-label="Raggruppa per" className="flex p-1 rounded-xl bg-canvas border border-hairline gap-1 self-start">
              {(['mese', 'anno'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={d.raggruppa === r}
                  onClick={() => d.setRaggruppa(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${d.raggruppa === r ? 'bg-rose-600 text-white' : 'text-ink-soft hover:text-ink dark:hover:text-white'}`}
                >
                  {r === 'mese' ? 'Mesi' : 'Anni'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-72 mt-6">
          {t.rifornimenti === 0 ? (
            <div className="h-full flex items-center justify-center text-ink-soft text-xs">Nessun rifornimento nel periodo</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.andamento} margin={{ top: 10, right: 0, left: isMobile ? 0 : 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                <XAxis dataKey="etichetta" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} minTickGap={isMobile ? 8 : 4} />
                <YAxis
                  yAxisId="spesa" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 44 : 64}
                  tickFormatter={v => isMobile ? formatAxisCompact(v, maxAsse) : `${Number(v).toLocaleString('it-IT')} €`}
                />
                <YAxis
                  yAxisId="cento" orientation="right" stroke={AMBRA} fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 36 : 48}
                  tickFormatter={v => `${fmtNum(v, 1)}`} domain={[(min: number) => Math.max(0, Math.floor(min - 1)), (max: number) => Math.ceil(max + 1)]}
                />
                <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                <Bar yAxisId="spesa" dataKey="spesa" fill={ROSA} radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Line yAxisId="cento" type="monotone" dataKey="euroPer100Km" stroke={AMBRA} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                {!perAnno && m.spesa > 0 && (
                  <ReferenceLine yAxisId="spesa" y={m.spesa} stroke="#64748b" strokeDasharray="4 4" ifOverflow="extendDomain" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Perché la spesa è cambiata */}
      <div className={CARD}>
        <h2 className="font-bold text-ink dark:text-slate-100 font-display text-base">Perché la spesa è cambiata</h2>
        {d.scomposizione && d.precedente ? (
          <ScomposizioneSpesa s={d.scomposizione} spesaPrima={d.precedente.alMese.spesa} etichettaPrima={d.precedente.etichetta} />
        ) : (
          <p className="text-xs text-ink-soft mt-2">
            Non ci sono rifornimenti registrati prima di questo periodo con cui confrontarlo.
          </p>
        )}
      </div>

      {/* Rifornimenti del periodo */}
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink dark:text-slate-100 font-display text-base">Rifornimenti</h2>
          <span className="bg-canvas dark:bg-slate-800/60 px-3 py-1 text-xs font-mono font-bold text-ink-soft rounded-lg">
            {d.righe.length}
          </span>
        </div>
        <p className="text-xs text-ink-soft mt-1 mb-5">Dal più recente. I km sono quelli fatti dal rifornimento precedente.</p>
        {d.righe.length === 0 ? (
          <div className="py-12 text-center text-ink-soft text-xs border border-dashed border-hairline rounded-2xl bg-canvas/50">
            Nessun rifornimento nel periodo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline dark:border-slate-800 text-2xs font-bold text-ink-soft uppercase tracking-wider">
                  <th scope="col" className="py-3 px-3">Data</th>
                  <th scope="col" className="py-3 px-3 text-right">Costo</th>
                  <th scope="col" className="py-3 px-3 text-right">Litri</th>
                  <th scope="col" className="py-3 px-3 text-right hidden sm:table-cell">€/Lt</th>
                  <th scope="col" className="py-3 px-3 text-right">Km</th>
                  <th scope="col" className="py-3 px-3 text-right hidden sm:table-cell">Km/Lt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-slate-800/60">
                {d.righe.slice(0, mostrate).map((r, i) => (
                  <tr key={`${r.date.getTime()}-${i}`} className="hover:bg-canvas/60 dark:hover:bg-slate-800/30 transition-colors tabular-nums">
                    <td className="py-3 px-3 whitespace-nowrap text-ink-soft font-mono">{fmtData(r.date)}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-ink dark:text-slate-100 font-mono whitespace-nowrap">{formatEuro(r.costo)}</td>
                    <td className="py-3 px-3 text-right font-mono">{fmtNum(r.quantitaLitri, 2)}</td>
                    <td className="py-3 px-3 text-right font-mono hidden sm:table-cell">{fmtNum(r.prezzoAlLitro || (r.quantitaLitri > 0 ? r.costo / r.quantitaLitri : 0), 3)}</td>
                    <td className="py-3 px-3 text-right font-mono">{r.kmEffettuati > 0 ? fmtNum(r.kmEffettuati, 0) : '—'}</td>
                    <td className="py-3 px-3 text-right font-mono hidden sm:table-cell">{r.kmEffettuati > 0 && r.quantitaLitri > 0 ? fmtNum(r.kmEffettuati / r.quantitaLitri, 1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.righe.length > mostrate && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setMostrate(m => m + PAGINA)}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                >
                  Mostra altri ({d.righe.length - mostrate})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Le tre parti della differenza di spesa, ciascuna con una barra proporzionale:
// rossa se ha fatto spendere di più, verde se ha fatto risparmiare.
function ScomposizioneSpesa({ s, spesaPrima, etichettaPrima }: { s: Scomposizione; spesaPrima: number; etichettaPrima: string }) {
  const voci = [
    { nome: 'Km percorsi', valore: s.km, piu: 'hai guidato di più', meno: 'hai guidato di meno' },
    { nome: 'Prezzo del carburante', valore: s.prezzo, piu: 'il carburante costava di più', meno: 'il carburante costava di meno' },
    { nome: 'Consumo (guida)', valore: s.consumo, piu: 'hai fatto meno km con un litro', meno: 'hai fatto più km con un litro' }
  ];
  const max = Math.max(...voci.map(v => Math.abs(v.valore)), 0.01);
  const segno = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatEuro(Math.abs(v))}`;
  return (
    <>
      <p className="text-xs text-ink-soft mt-1 mb-5">
        In media spendi <span className={`font-bold ${s.differenza > 0 ? 'text-down' : 'text-up'}`}>{segno(s.differenza)} al mese</span> rispetto
        a {etichettaPrima} ({formatEuro(spesaPrima)} al mese). Ecco da dove viene la differenza:
      </p>
      <div className="space-y-4">
        {voci.map(v => (
          <div key={v.nome} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[12rem_1fr_6rem] items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink dark:text-slate-200 truncate">{v.nome}</p>
              <p className="text-2xs text-ink-soft truncate">{Math.abs(v.valore) < 0.5 ? 'quasi nessun effetto' : v.valore > 0 ? v.piu : v.meno}</p>
            </div>
            <div className="h-2.5 rounded-full bg-canvas dark:bg-slate-800/60 overflow-hidden">
              <div
                className={`h-full rounded-full ${v.valore > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${(Math.abs(v.valore) / max) * 100}%` }}
              />
            </div>
            <span className={`text-sm font-extrabold font-mono tabular-nums text-right ${v.valore > 0 ? 'text-down' : 'text-up'}`}>{segno(v.valore)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Kpi({ titolo, valore, children }: { titolo: string; valore: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-4 md:p-5 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left min-w-0">
      <p className="text-2xs font-bold uppercase tracking-wider text-ink-soft">{titolo}</p>
      <p className="text-xl md:text-2xl font-extrabold text-ink dark:text-slate-100 tabular-nums mt-1.5 truncate">{valore}</p>
      <p className="text-2xs md:text-xs text-ink-soft mt-1.5">{children}</p>
    </div>
  );
}
