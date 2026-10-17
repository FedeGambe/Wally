import React from 'react';
import { ArrowDownRight, ArrowUpRight, TrendingUp, Calendar, Tag, CreditCard } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../data/mockData';
import { formatEuro, formatPercent } from '../utils/format';
import { kpiColor, kpiColorAlpha, thresholdRange } from '../utils/kpiColorScale';
import SlideOverPanel from './SlideOverPanel';
import EuroAmount from './EuroAmount';

/**
 * Pannello laterale scorrevole (drawer) usato dalle pagine (es. Panoramica,
 * Entrate, Uscite) per mostrare il dettaglio di un dato periodo/categoria:
 * o un riepilogo mensile con torta di ripartizione (`stats.monthDetail`),
 * o un elenco di transazioni con totali semplici (`stats` senza monthDetail).
 * Il componente non calcola nulla di finanziario: riceve già `transactions`
 * e `stats` pronti da chi lo apre, e si limita a visualizzarli con
 * un'animazione di apertura/chiusura (Motion) e uno sfondo semi-trasparente
 * cliccabile per chiudere.
 */

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  transactions: Transaction[];
  stats?: {
    total: number;
    count: number;
    primaryTotal?: number;
    secondaryTotal?: number;
    monthDetail?: {
      entrate: number;
      speseTotali: number;
      spesePrimarie: number;
      speseSecondarie: number;
      investito: number;
      risparmioNetto: number;
      entrateDelta?: number;
      speseTotaliDelta?: number;
      spesePrimarieDelta?: number;
      speseSecondarieDelta?: number;
      investitoDelta?: number;
      risparmioNettoDelta?: number;
    };
  };
  /** Soglie dinamiche (stesse di Panoramica) per colorare i 4 riquadri Spese/Investito/Risparmio in base a quanto si è vicini al target. */
  dynamicThresholds?: {
    primarie: number;
    secondarie: number;
    investiti: number;
    risparmio: number;
  };
}

/** Badge +/- % vs mese precedente. `goodWhenPositive` inverte i colori per le voci di spesa (calo = verde). */
function DeltaBadge({ value, goodWhenPositive }: { value?: number; goodWhenPositive: boolean }) {
  if (value === undefined) return null;
  const isGood = goodWhenPositive ? value >= 0 : value <= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md mt-1 w-fit border ${isGood ? 'bg-up/15 border-up/40 text-up' : 'bg-down/15 border-down/40 text-down'}`}>
      <span className="text-2xs sm:text-3xs">{value >= 0 ? '+' : ''}{formatPercent(value)}</span>
      <span className="text-3xs">vs mese prec.</span>
    </span>
  );
}

/**
 * Riquadro del riepilogo mensile. Senza `tinta` è neutro (Entrate, Spese
 * Totali); con `tinta` prende fondo e bordo leggeri dal colore a soglia, come
 * le card KPI dell'app: il colore pieno resta solo all'etichetta e alla quota.
 */
function Riquadro({ label, valore, quota, delta, goodWhenPositive, tinta }: {
  label: string;
  valore: number;
  /** Quota sulle entrate; assente per le Entrate stesse (sarebbe sempre 100%). */
  quota?: string;
  delta?: number;
  goodWhenPositive: boolean;
  tinta?: { fondo: string; bordo: string; testo: string };
}) {
  return (
    <div
      className={`p-3.5 rounded-2xl border flex flex-col text-left ${tinta ? '' : 'bg-canvas border-hairline dark:bg-white/[0.04] dark:border-white/10'}`}
      style={tinta ? { backgroundColor: tinta.fondo, borderColor: tinta.bordo } : undefined}
    >
      <span
        className={`text-3xs font-bold uppercase tracking-wider block ${tinta ? '' : 'text-ink-soft dark:text-slate-400'}`}
        style={tinta ? { color: tinta.testo } : undefined}
      >
        {label}
      </span>
      <span className="text-xl font-black font-display text-ink dark:text-slate-100 block mt-1.5 leading-none tabular-nums">
        <EuroAmount value={valore} />
      </span>
      {quota && (
        <span
          className={`text-3xs font-semibold mt-1.5 ${tinta ? '' : 'text-ink-soft dark:text-slate-400'}`}
          style={tinta ? { color: tinta.testo } : undefined}
        >
          {quota} delle entrate
        </span>
      )}
      <DeltaBadge value={delta} goodWhenPositive={goodWhenPositive} />
    </div>
  );
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  transactions,
  stats,
  dynamicThresholds
}: DrawerProps) {
  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      {/* Quick stats summarizing this scope */}
      {/* Il drawer ha due "modalità" di contenuto, mutuamente esclusive:
                1) stats.monthDetail presente -> riepilogo mensile completo (6 mini-card + torta)
                2) stats presente ma senza monthDetail -> riepilogo semplice (totale + conteggio)
                3) nessuno dei due -> si passa direttamente all'elenco transazioni qui sotto */}
      {stats?.monthDetail ? (
        <div className="p-6 pb-28 md:pb-6 border-b border-hairline dark:border-white/10 flex-1 overflow-y-auto space-y-5">
          {(() => {
            // IIFE (funzione auto-invocata): serve solo per poter definire delle
            // variabili locali (m, pct, pieData...) prima del `return` del JSX,
            // cosa che non si potrebbe fare direttamente dentro le graffe {}.
            const m = stats.monthDetail;
            // Percentuale di ogni voce rispetto alle entrate del mese. Se le entrate
            // sono 0 (o mancanti) la quota non ha senso: il riquadro non la mostra.
            const quotaOf = (v: number) => m.entrate ? (v / m.entrate) * 100 : 0;
            const pct = (v: number) => m.entrate ? formatPercent(quotaOf(v)) : undefined;
            // Tinta del riquadro in base a quanto la quota si avvicina/supera la
            // soglia dinamica: per le spese "di meno è meglio" (higherIsBetter=false),
            // per investito/risparmio "di più è meglio". Senza soglia: riquadro neutro.
            const tinta = (quota: number, threshold: number | undefined, higherIsBetter = true) => {
              if (threshold === undefined) return undefined;
              const range = thresholdRange(threshold, 10, higherIsBetter);
              return {
                fondo: kpiColorAlpha(quota, range, 0.12),
                bordo: kpiColorAlpha(quota, range, 0.4),
                testo: kpiColor(quota, range),
              };
            };
            // Dati per la torta di ripartizione: si scartano i valori negativi (Math.max(0, ...))
            // e le voci a zero (.filter) perché Recharts disegnerebbe comunque uno spicchio
            // vuoto/fastidioso per un valore 0 o negativo.
            const pieData = [
              // Stessi colori ufficiali usati altrove: Spese Primarie/Secondarie
              // come in Uscite.tsx, Investito come in Panoramica/Cruscotto
              // Investimenti (azzurro), Risparmio come in Panoramica (rosa/viola).
              { name: 'Spese Primarie', value: Math.max(0, m.spesePrimarie), color: '#c2410c' },
              { name: 'Spese Secondarie', value: Math.max(0, m.speseSecondarie), color: '#fb923c' },
              { name: 'Investito', value: Math.max(0, m.investito), color: '#0ea5e9' },
              { name: 'Risparmio Netto', value: Math.max(0, m.risparmioNetto), color: '#d946ef' }
            ].filter(d => d.value > 0);
            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Riquadro label="Entrate" valore={m.entrate} delta={m.entrateDelta} goodWhenPositive={true} />
                  <Riquadro label="Spese Totali" valore={m.speseTotali} quota={pct(m.speseTotali)} delta={m.speseTotaliDelta} goodWhenPositive={false} />
                  <Riquadro label="Spese Primarie" valore={m.spesePrimarie} quota={pct(m.spesePrimarie)} delta={m.spesePrimarieDelta} goodWhenPositive={false} tinta={tinta(quotaOf(m.spesePrimarie), dynamicThresholds?.primarie, false)} />
                  <Riquadro label="Spese Secondarie" valore={m.speseSecondarie} quota={pct(m.speseSecondarie)} delta={m.speseSecondarieDelta} goodWhenPositive={false} tinta={tinta(quotaOf(m.speseSecondarie), dynamicThresholds?.secondarie, false)} />
                  <Riquadro label="Investito" valore={m.investito} quota={pct(m.investito)} delta={m.investitoDelta} goodWhenPositive={true} tinta={tinta(quotaOf(m.investito), dynamicThresholds?.investiti, true)} />
                  <Riquadro label="Risparmio Netto" valore={m.risparmioNetto} quota={pct(m.risparmioNetto)} delta={m.risparmioNettoDelta} goodWhenPositive={true} tinta={tinta(quotaOf(m.risparmioNetto), dynamicThresholds?.risparmio, true)} />
                </div>

                {/* Ripartizione: spese primarie/secondarie, investito, risparmio */}
                {pieData.length > 0 && (
                  <div className="bg-canvas dark:bg-white/[0.04] border border-hairline dark:border-white/10 rounded-2xl p-4">
                    <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block mb-2">Ripartizione</span>
                    <div className="h-52 flex items-center">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} stroke="none" dataKey="value" isAnimationActive={false}>
                              {pieData.map((d, idx) => <Cell key={idx} fill={d.color} />)}
                            </Pie>
                            <RechartsTooltip
                              formatter={(value: any, name: any) => [formatEuro(value), name]}
                              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-2 text-xs">
                        {pieData.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-ink-soft dark:text-slate-300 truncate">{d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : stats && (
        <div className="bg-canvas dark:bg-white/5 p-6 border-b border-hairline dark:border-white/10 grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-hairline dark:border-white/10 shadow-xs">
            <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Importo Totale</span>
            <span className="text-xl font-bold font-display text-ink dark:text-slate-100 block mt-1">
              {formatEuro(stats.total)}
            </span>
          </div>
          <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-hairline dark:border-white/10 shadow-xs">
            <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Numero Movimenti</span>
            <span className="text-xl font-bold font-display text-ink dark:text-slate-100 block mt-1">
              {stats.count}
            </span>
          </div>
          {stats.primaryTotal !== undefined && (
            <div className="bg-orange-700 border border-orange-800 p-3 rounded-2xl flex flex-col justify-between text-left">
              <span className="text-3xs text-orange-100 font-bold uppercase tracking-wider block">Spese Primarie</span>
              <span className="text-lg font-bold font-display text-white block mt-1">
                {formatEuro(stats.primaryTotal)}
              </span>
            </div>
          )}
          {stats.secondaryTotal !== undefined && (
            <div className="bg-orange-50 dark:bg-orange-400/10 border border-orange-200 dark:border-orange-400/20 p-3 rounded-2xl flex flex-col justify-between text-left">
              <span className="text-3xs text-orange-700 dark:text-orange-300 font-bold uppercase tracking-wider block">Spese Secondarie</span>
              <span className="text-lg font-bold font-display text-orange-800 dark:text-orange-200 block mt-1">
                {formatEuro(stats.secondaryTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Transactions List */}
      {/* L'elenco dettagliato delle transazioni si mostra solo quando NON c'è
                un riepilogo mensile (monthDetail), per non duplicare informazioni:
                nella vista mensile la torta+mini-card bastano come riepilogo. */}
      {!stats?.monthDetail && (
        <div className="flex-1 overflow-y-auto p-6 pb-28 md:pb-6 space-y-4">
          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-widest mb-2">
            Dettaglio Movimenti
          </h4>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-ink-soft text-xs">
              Nessuna transazione corrispondente trovata per questo filone.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t, idx) => (
                <div
                  key={t.id || `drawer-tx-${idx}-${t.data || ''}-${t.descrizione || ''}`}
                  className="p-3.5 bg-white hover:bg-canvas dark:bg-white/5 dark:hover:bg-white/10 rounded-xl border border-hairline dark:border-white/10 transition-all flex items-start gap-3.5"
                >
                  <div className="w-9 h-9 rounded-lg bg-canvas dark:bg-white/10 flex items-center justify-center text-lg shadow-xs shrink-0 border border-hairline dark:border-white/10">
                    {t.icon || '💸'}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-semibold text-ink dark:text-slate-100 truncate">{t.descrizione}</p>
                      <span className={`text-xs font-semibold shrink-0 ${t.macroCategoria === 'Entrate' ? 'text-up' : 'text-ink dark:text-slate-100'
                        }`}>
                        {t.macroCategoria === 'Entrate' ? '+' : '-'} {formatEuro(t.importo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-3xs text-ink-soft">
                      <span className="flex items-center gap-0.5 font-medium shrink-0">
                        <Calendar className="w-3 h-3 text-ink-soft" />
                        {t.data}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 truncate uppercase font-mono">
                        <Tag className="w-3 h-3 text-ink-soft shrink-0" />
                        {t.categoria}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 bg-canvas dark:bg-white/10 border border-hairline dark:border-white/10 px-2 py-0.5 rounded-md text-3xs text-ink-soft dark:text-slate-300">
                        <CreditCard className="w-2.5 h-2.5 text-ink-soft" />
                        {t.conto}
                      </span>
                      {t.macroCategoria !== 'Entrate' && (
                        t.primaria ? (
                          <span className="bg-orange-700 text-white text-3xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Spesa Primaria
                          </span>
                        ) : (
                          <span className="bg-orange-50 dark:bg-orange-400/10 text-orange-700 dark:text-orange-300 text-3xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Spesa Secondaria
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SlideOverPanel>
  );
}
