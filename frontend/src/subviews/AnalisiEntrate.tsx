import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { CreditCard, Grid, Search, Tag } from 'lucide-react';
import CategoryPieCard from '../components/uscite/CategoryPieCard';
import DropdownMenu from '../components/DropdownMenu';
import SelettorePeriodo from '../components/SelettorePeriodo';
import { FILTRI_ENTRATE_VUOTI, FiltriEntrate, filtraEntrate, useAnalisiEntrateData } from '../hooks/useAnalisiEntrateData';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatAxisCompact, formatEuro, formatPercent } from '../utils/format';

/**
 * Scheda "Analisi periodo" di Entrate: le entrate su un periodo intero invece
 * che sul singolo mese (es. tutti i rimborsi del 2025). Periodo e filtri in
 * alto guidano indicatori, andamento, torte e tabella; cliccare una fetta
 * filtra per quella categoria o quel conto. Gemella di AnalisiUscite.
 */
const COLORI = ['#10b981', '#2563eb', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#06b6d4'];
const VERDE = '#059669';
const CARD = 'bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md';
const PAGINA = 100;

const unici = (valori: string[]) => Array.from(new Set(valori.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'));

export default function AnalisiEntrate() {
  const isMobile = useIsMobile();
  const d = useAnalisiEntrateData();
  const { filtri, setFiltri } = d;
  const set = (patch: Partial<FiltriEntrate>) => setFiltri({ ...filtri, ...patch });

  const opzioni = useMemo(() => ({
    categoria: unici(filtraEntrate(d.entratePeriodo, filtri, ['categoria']).map(e => e.categoria || 'Altro')),
    conto: unici(filtraEntrate(d.entratePeriodo, filtri, ['conto']).map(e => e.conto || 'Altro'))
  }), [d.entratePeriodo, filtri]);

  const altriFiltri = [filtri.categoria, filtri.conto, filtri.testo ? `“${filtri.testo}”` : ''].filter(Boolean).join(' · ');
  const conFiltri = JSON.stringify(filtri) !== JSON.stringify(FILTRI_ENTRATE_VUOTI);

  const delta = d.precedente && d.precedente.totale > 0 ? ((d.totale - d.precedente.totale) / d.precedente.totale) * 100 : null;
  const maxAsse = d.andamento.reduce((m, q) => Math.max(m, q.totale), 0);
  const perAnno = d.raggruppa === 'anno' && d.piuAnni;

  // La tabella mostra 100 righe per volta; si riparte da 100 quando cambiano i filtri.
  const [mostrate, setMostrate] = useState(PAGINA);
  useEffect(() => setMostrate(PAGINA), [d.righe]);

  const menu = (label: string, icon: React.ComponentType<{ className?: string }>, valore: string, valori: string[], onSelect: (v: string) => void) => (
    <DropdownMenu
      icon={icon}
      accent="emerald"
      widthClass="w-56"
      label={label}
      value={valore || 'Tutte'}
      displayValue={valore || 'Tutte'}
      options={['Tutte', ...valori]}
      onSelect={v => onSelect(v === 'Tutte' ? '' : v)}
      getOptionLabel={v => (v === 'Tutte' ? `${label} (Tutte)` : v)}
    />
  );

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const q = payload[0].payload;
    return (
      <div style={{ background: '#1e293b', borderRadius: 12, color: '#fff', fontSize: 12, padding: '8px 12px' }}>
        <div className="font-bold" style={{ marginBottom: 4 }}>{label}</div>
        <div>Entrate: {formatEuro(q.totale)}</div>
        <div style={{ marginTop: 2, opacity: 0.8 }}>{q.movimenti} mov.</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Periodo e filtri in una riga sola */}
      <div className="bg-white p-3 md:p-4 rounded-3xl border border-hairline shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <SelettorePeriodo p={d} accent="emerald" ring="focus:ring-emerald-500" />
          {menu('Categoria', Tag, filtri.categoria, opzioni.categoria, v => set({ categoria: v }))}
          {menu('Conto', CreditCard, filtri.conto, opzioni.conto, v => set({ conto: v }))}
          {conFiltri && (
            <button
              type="button"
              onClick={() => setFiltri(FILTRI_ENTRATE_VUOTI)}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs px-3 py-1 rounded-xl font-bold transition cursor-pointer"
            >
              Azzera filtri ×
            </button>
          )}
          <div className="relative w-full md:w-64 md:ml-auto">
            <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Cerca nelle entrate"
              placeholder="Cerca: es. stipendio, rimborso…"
              value={filtri.testo}
              onChange={e => set({ testo: e.target.value })}
              className="w-full bg-canvas border border-hairline rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Indicatori del periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Kpi titolo="Totale nel periodo" valore={formatEuro(d.totale)}>
          {delta !== null ? (
            <span className={delta >= 0 ? 'text-up font-bold' : 'text-down font-bold'}>
              {formatPercent(delta, { signed: true })} <span className="text-ink-soft font-medium">vs {d.numeroMesi} mesi prima</span>
            </span>
          ) : (
            <>{d.etichettaPeriodo}</>
          )}
        </Kpi>
        <Kpi titolo="Media al mese" valore={formatEuro(d.mediaMensile)}>
          su {d.numeroMesi} {d.numeroMesi === 1 ? 'mese' : 'mesi'}{d.mesiConEntrate < d.numeroMesi ? ` (${d.mesiConEntrate} con entrate)` : ''}
        </Kpi>
        <Kpi titolo="Movimenti" valore={String(d.movimenti)}>
          {d.movimenti > 0 ? <>in media {formatEuro(d.totale / d.movimenti)} l'uno</> : 'nessun movimento'}
        </Kpi>
        <Kpi titolo="Mese più alto" valore={d.mesePiuAlto ? formatEuro(d.mesePiuAlto.totale) : '—'}>
          {d.mesePiuAlto ? d.mesePiuAlto.etichetta.replace("'", '20') : 'nessuna entrata'}
        </Kpi>
      </div>

      {/* Andamento */}
      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink font-display text-base">
              Andamento {perAnno ? 'anno per anno' : 'mese per mese'}
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Entrate{altriFiltri ? ` di ${altriFiltri}` : ''}{!perAnno && d.mediaMensile > 0 ? '; la linea tratteggiata è la media al mese' : ''}.
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
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${d.raggruppa === r ? 'bg-emerald-700 text-white' : 'text-ink-soft hover:text-ink dark:hover:text-white'}`}
                >
                  {r === 'mese' ? 'Mesi' : 'Anni'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-72 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.andamento} margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="etichetta" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} minTickGap={isMobile ? 8 : 4} />
              <YAxis
                stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 44 : 64}
                tickFormatter={v => isMobile ? formatAxisCompact(v, maxAsse) : `${Number(v).toLocaleString('it-IT')} €`}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Bar dataKey="totale" name="Entrate" fill={VERDE} radius={[6, 6, 0, 0]} maxBarSize={48} />
              {!perAnno && d.mediaMensile > 0 && (
                <ReferenceLine y={d.mediaMensile} stroke="#64748b" strokeDasharray="4 4" ifOverflow="extendDomain" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ripartizione */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPieCard
          icon={Grid}
          title="Per Categoria"
          subtitle={`Ripartizione su ${d.etichettaPeriodo}; clicca per filtrare`}
          data={d.perCategoria}
          colors={COLORI}
          tono="emerald"
          selected={filtri.categoria || 'Tutte'}
          onSelect={v => set({ categoria: v === 'Tutte' ? '' : v })}
        />
        <CategoryPieCard
          icon={CreditCard}
          title="Per Conto di accredito"
          subtitle="Su quali conti sono arrivate; clicca per filtrare"
          data={d.perConto}
          colors={COLORI}
          tono="emerald"
          colorOffset={2}
          selected={filtri.conto || 'Tutte'}
          onSelect={v => set({ conto: v === 'Tutte' ? '' : v })}
        />
      </div>

      {/* Movimenti del periodo */}
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink font-display text-base">Movimenti del periodo</h2>
          <span className="bg-canvas px-3 py-1 text-xs font-mono font-bold text-ink-soft rounded-lg">
            {d.righe.length} {d.righe.length === 1 ? 'movimento' : 'movimenti'}
          </span>
        </div>
        <p className="text-xs text-ink-soft mt-1 mb-5">Dal più recente.</p>
        {d.righe.length === 0 ? (
          <div className="py-12 text-center text-ink-soft text-xs border border-dashed border-hairline rounded-2xl bg-canvas/50">
            Nessuna entrata con questi filtri nel periodo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline text-2xs font-bold text-ink-soft uppercase tracking-wider">
                  <th scope="col" className="py-3 px-3">Mese</th>
                  <th scope="col" className="py-3 px-3">Categoria</th>
                  <th scope="col" className="py-3 px-3 hidden md:table-cell">Descrizione</th>
                  <th scope="col" className="py-3 px-3 hidden sm:table-cell">Conto</th>
                  <th scope="col" className="py-3 px-3 text-right">Importo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {d.righe.slice(0, mostrate).map((e, i) => (
                  <tr key={e.id || i} className="hover:bg-canvas/60 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap text-ink-soft font-mono">{e.data || e.etichettaMese}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => set({ categoria: e.categoria || 'Altro' })}
                        className="font-semibold text-ink hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer text-left"
                        title="Filtra per questa categoria"
                      >
                        {e.categoria || 'Altro'}
                      </button>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell text-ink-soft truncate max-w-xs">{e.descrizione || e.dettagli || '—'}</td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <span className="inline-flex bg-canvas px-2 py-0.5 rounded text-3xs text-ink-soft font-mono">{e.conto || 'Altro'}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-up font-mono whitespace-nowrap">{formatEuro(e.importo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.righe.length > mostrate && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setMostrate(m => m + PAGINA)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs px-4 py-2 rounded-xl font-bold transition cursor-pointer"
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

function Kpi({ titolo, valore, children }: { titolo: string; valore: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-3xl border border-hairline shadow-sm text-left min-w-0">
      <p className="text-2xs font-bold uppercase tracking-wider text-ink-soft">{titolo}</p>
      <p className="text-xl md:text-2xl font-extrabold text-ink tabular-nums mt-1.5 truncate">{valore}</p>
      <p className="text-2xs md:text-xs text-ink-soft mt-1.5">{children}</p>
    </div>
  );
}
