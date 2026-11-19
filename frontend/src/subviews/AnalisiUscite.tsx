import React, { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { CreditCard, Grid, Search, Tag } from 'lucide-react';
import CategoryPieCard from '../components/uscite/CategoryPieCard';
import UsciteTransazioniTable from '../components/uscite/UsciteTransazioniTable';
import UsciteKpiCards from '../components/uscite/UsciteKpiCards';
import DropdownMenu from '../components/DropdownMenu';
import SelettorePeriodo from '../components/SelettorePeriodo';
import { useAnalisiUsciteData } from '../hooks/useAnalisiUsciteData';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatAxisCompact, formatEuro, formatPercent } from '../utils/format';
import { FILTRI_USCITE_VUOTI, FiltriUscite, filtraUscite } from '../utils/filtriUscite';

/**
 * Scheda "Analisi" di Uscite: le uscite su un periodo intero invece che sul
 * singolo mese (es. tutti i rifornimenti del 2025). Periodo e filtri in alto
 * guidano KPI, andamento, torte e tabella; i filtri sono gli stessi dei filtri
 * di colonna della tabella, quindi cambiarli da una parte cambia anche l'altra.
 */
const COLORI = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#06b6d4'];
const PRIMARIE = '#c2410c';
const SECONDARIE = '#fb923c';
const CARD = 'bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md';

const unici = (valori: string[]) => Array.from(new Set(valori.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'));

interface AnalisiUsciteProps {
  soglie?: { primarie: number; secondarie: number };
}

export default function AnalisiUscite({ soglie }: AnalisiUsciteProps) {
  const isMobile = useIsMobile();
  const d = useAnalisiUsciteData();
  const { filtri, setFiltri } = d;
  const set = (patch: Partial<FiltriUscite>) => setFiltri({ ...filtri, ...patch });

  const opzioni = useMemo(() => ({
    macro: unici(filtraUscite(d.transazioniPeriodo, filtri, ['macro', 'categoria']).map(t => t.macroCategoria || 'Altro')),
    categoria: unici(filtraUscite(d.transazioniPeriodo, filtri, ['categoria']).map(t => t.categoria || 'Altro')),
    conto: unici(filtraUscite(d.transazioniPeriodo, filtri, ['conto']).map(t => t.conto))
  }), [d.transazioniPeriodo, filtri]);

  const altriFiltri = [filtri.macro, filtri.categoria, filtri.conto, filtri.testo ? `“${filtri.testo}”` : ''].filter(Boolean).join(' · ');
  const conFiltri = JSON.stringify(filtri) !== JSON.stringify(FILTRI_USCITE_VUOTI);

  const delta = d.precedente && d.precedente.totale > 0 ? ((d.totale - d.precedente.totale) / d.precedente.totale) * 100 : null;
  const maxAsse = d.andamento.reduce((m, p) => Math.max(m, p.totale), 0);
  const perAnno = d.raggruppa === 'anno' && d.piuAnni;

  const menu = (label: string, icon: React.ComponentType<{ className?: string }>, valore: string, valori: string[], onSelect: (v: string) => void, etichette?: (v: string) => string) => (
    <DropdownMenu
      icon={icon}
      accent="orange"
      widthClass="w-56"
      label={label}
      value={valore || 'Tutte'}
      displayValue={valore ? (etichette ? etichette(valore) : valore) : 'Tutte'}
      options={['Tutte', ...valori]}
      onSelect={v => onSelect(v === 'Tutte' ? '' : v)}
      getOptionLabel={v => (v === 'Tutte' ? `${label} (Tutte)` : etichette ? etichette(v) : v)}
    />
  );

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div style={{ background: '#1e293b', borderRadius: 12, color: '#fff', fontSize: 12, padding: '8px 12px' }}>
        <div className="font-bold" style={{ marginBottom: 4 }}>{label}</div>
        {payload.map((x: any) => (
          <div key={x.dataKey} className="flex items-center gap-1.5" style={{ marginTop: 2 }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: x.color }} />
            <span>{x.name}: {formatEuro(Number(x.value))}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, opacity: 0.8 }}>Totale {formatEuro(p.totale)} · {p.movimenti} mov.</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Periodo e filtri in una riga sola; Primarie/Secondarie si scelgono
          dalle card sotto i quattro indicatori */}
      <div className="bg-white p-3 md:p-4 rounded-3xl border border-hairline shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <SelettorePeriodo p={d} accent="orange" ring="focus:ring-orange-500" />
          {menu('Macro', Grid, filtri.macro, opzioni.macro, v => set({ macro: v, categoria: '' }))}
          {menu('Categoria', Tag, filtri.categoria, opzioni.categoria, v => set({ categoria: v }))}
          {menu('Conto', CreditCard, filtri.conto, opzioni.conto, v => set({ conto: v }))}
          {conFiltri && (
            <button
              type="button"
              onClick={() => setFiltri(FILTRI_USCITE_VUOTI)}
              className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs px-3 py-1 rounded-xl font-bold transition cursor-pointer"
            >
              Azzera filtri ×
            </button>
          )}
          <div className="relative w-full md:w-64 md:ml-auto">
            <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Cerca nelle uscite"
              placeholder="Cerca: es. rifornimento, Esselunga…"
              value={filtri.testo}
              onChange={e => set({ testo: e.target.value })}
              className="w-full bg-canvas border border-hairline rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* KPI del periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Kpi titolo="Totale nel periodo" valore={formatEuro(d.totale)}>
          {delta !== null ? (
            <span className={delta > 0 ? 'text-down font-bold' : 'text-up font-bold'}>
              {formatPercent(delta, { signed: true })} <span className="text-ink-soft font-medium">vs {d.numeroMesi} mesi prima</span>
            </span>
          ) : (
            <>Primarie {formatEuro(d.primarie)}</>
          )}
        </Kpi>
        <Kpi titolo="Media al mese" valore={formatEuro(d.mediaMensile)}>
          su {d.numeroMesi} {d.numeroMesi === 1 ? 'mese' : 'mesi'}{d.mesiConSpesa < d.numeroMesi ? ` (${d.mesiConSpesa} con spese)` : ''}
        </Kpi>
        <Kpi titolo="Movimenti" valore={String(d.movimenti)}>
          {d.movimenti > 0 ? <>in media {formatEuro(d.totale / d.movimenti)} l'uno</> : 'nessun movimento'}
        </Kpi>
        <Kpi titolo="Mese più alto" valore={d.mesePiuAlto ? formatEuro(d.mesePiuAlto.totale) : '—'}>
          {d.mesePiuAlto ? d.mesePiuAlto.etichetta.replace("'", '20') : 'nessuna spesa'}
        </Kpi>
      </div>

      {/* Totali / Primarie / Secondarie: come in cima al mese, più basse e senza
          soglie; scegliere una card filtra grafico, torte e tabella */}
      <UsciteKpiCards
        compatta
        sottotitolo={d.etichettaPeriodo}
        etichettaConfronto={`vs ${d.numeroMesi} ${d.numeroMesi === 1 ? 'mese' : 'mesi'} prima`}
        selectedRecord={{
          mese: '', anno: 0,
          speseTotali: d.perTipo.attuale.totale,
          spesePrimarie: d.perTipo.attuale.primarie,
          speseSecondarie: d.perTipo.attuale.secondarie
        }}
        prevRecord={d.perTipo.prima && {
          speseTotali: d.perTipo.prima.totale,
          spesePrimarie: d.perTipo.prima.primarie,
          speseSecondarie: d.perTipo.prima.secondarie
        }}
        activeChartFilter={filtri.tipo || 'all'}
        setActiveChartFilter={f => set({ tipo: f === 'all' ? '' : f })}
        totalPctOfIncome={0}
        primaryPctOfIncome={0}
        secondaryPctOfIncome={0}
      />

      {/* Andamento */}
      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink font-display text-base">
              Andamento {perAnno ? 'anno per anno' : 'mese per mese'}
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              {filtri.tipo ? `Solo ${filtri.tipo}` : 'Primarie e secondarie'}{altriFiltri ? ` di ${altriFiltri}` : ''}{!perAnno && d.mediaMensile > 0 ? '; la linea tratteggiata è la media al mese' : ''}.
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
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${d.raggruppa === r ? 'bg-orange-700 text-white' : 'text-ink-soft hover:text-ink dark:hover:text-white'}`}
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
                tickFormatter={v => isMobile ? formatAxisCompact(v, maxAsse) : `${Number(v).toLocaleString('it-IT')}\u00A0€`}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <Bar dataKey="primarie" name="Primarie" stackId="s" fill={PRIMARIE} maxBarSize={48} />
              <Bar dataKey="secondarie" name="Secondarie" stackId="s" fill={SECONDARIE} radius={[6, 6, 0, 0]} maxBarSize={48} />
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
          title="Per Macro Categoria"
          subtitle={`Ripartizione su ${d.etichettaPeriodo}; clicca per filtrare`}
          data={d.perMacro}
          colors={COLORI}
          selected={filtri.macro || 'Tutte'}
          onSelect={v => set({ macro: v === 'Tutte' ? '' : v, categoria: '' })}
        />
        <CategoryPieCard
          icon={CreditCard}
          title="Per Categoria"
          subtitle={filtri.macro ? `Dentro ${filtri.macro}` : 'Tutte le categorie del periodo'}
          data={d.perCategoria}
          colors={COLORI}
          colorOffset={3}
          selected={filtri.categoria || 'Tutte'}
          onSelect={v => set({ categoria: v === 'Tutte' ? '' : v })}
        />
      </div>

      {/* Transazioni del periodo */}
      <div className={CARD}>
        <h2 className="font-bold text-ink font-display text-base">Transazioni del periodo</h2>
        <p className="text-xs text-ink-soft mt-1 mb-5">Dalla più recente; clicca un'intestazione per ordinare, filtra dalla riga sotto.</p>
        <UsciteTransazioniTable
          transazioni={d.transazioniPeriodo}
          filtri={filtri}
          onFiltriChange={setFiltri}
          soglie={soglie}
        />
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
