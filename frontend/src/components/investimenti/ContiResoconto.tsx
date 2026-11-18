import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Landmark, Info, CalendarRange } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import SelettorePeriodo from '../SelettorePeriodo';
import { formatEuro } from '../../utils/format';
import { isMeseAnnoFuturo } from '../../utils/date';
import { useFinanceData } from '../../context/FinanceDataContext';
import { parseMeseStringToMonthYear } from '../../hooks/useInvestimentiData';
import { chiaveEntrata } from '../../hooks/useAnalisiEntrateData';
import { chiaveMese, etichettaMese, meseCorrenteChiave, usePeriodoAnalisi } from '../../hooks/usePeriodoAnalisi';
import { eInteresse, nomeConto } from '../../utils/interessi';
import { GRIGLIA, ASSE, euroAsse, Legenda, Suggerimento } from '../previsioni/comune';

/**
 * Resoconto della scheda Conti (Investimenti): quanto hanno reso i conti da soli.
 *  - Interessi: le Entrate con categoria "Interessi", divise per conto (BBVA,
 *    Santander, Trade Republic, Scalable, Unicredit…). È l'unica fonte: gli
 *    interessi di TR e Scalable sono anche nei fogli dei broker, ma sono le
 *    stesse cifre e contarli due volte gonfierebbe il totale. Le cedole di
 *    iBonds/Amundi registrate come "Interessi" restano fuori: sono dividendi e
 *    stanno nel dettaglio di Trade Republic.
 *  - Saveback: colonna "Savebacks" del foglio Trade Republic (non è nelle Entrate).
 * Periodo come nell'analisi di Entrate/Uscite: di base gli ultimi 12 mesi.
 */

const SAVEBACK = 'Saveback';
const COLORE_SAVEBACK = '#f59e0b';
const COLORI_CONTO: Record<string, string> = {
  'Trade Republic': '#0ea5e9',
  BBVA: '#1d4ed8',
  Scalable: '#14b8a6',
  Santander: '#6366f1',
  Unicredit: '#64748b',
};
const ALTRI_COLORI = ['#8b5cf6', '#0891b2', '#84cc16', '#a16207', '#94a3b8'];

type Movimento = { k: number; voce: string; importo: number };

export default function ContiResoconto({ tradeMensile }: { tradeMensile: any[] }) {
  const { data } = useFinanceData();
  const [vista, setVista] = useState<'mensile' | 'cumulato'>('mensile');
  const meseCorrente = meseCorrenteChiave();

  const movimenti = useMemo<Movimento[]>(() => {
    const out: Movimento[] = [];
    for (const e of data.entrate || []) {
      if (!eInteresse(e)) continue;
      const k = chiaveEntrata(e);
      const importo = Number(e.importo) || 0;
      if (k === null || k > meseCorrente || importo === 0) continue;
      out.push({ k, voce: nomeConto(e.conto), importo });
    }
    for (const r of tradeMensile) {
      const p = parseMeseStringToMonthYear(r.mese);
      const importo = Number(r.savebacks) || 0;
      if (!p || isMeseAnnoFuturo(r.mese, p.year) || importo === 0) continue;
      out.push({ k: chiaveMese(p.year, p.month - 1), voce: SAVEBACK, importo });
    }
    return out;
  }, [data.entrate, tradeMensile, meseCorrente]);

  const p = usePeriodoAnalisi(useMemo(() => movimenti.map(m => m.k), [movimenti]));
  const { inizio, fine, numeroMesi } = p;

  const nelPeriodo = useMemo(() => movimenti.filter(m => m.k >= inizio && m.k <= fine), [movimenti, inizio, fine]);

  // Voci in ordine di importo nel periodo; il saveback sempre per ultimo
  const voci = useMemo(() => {
    const tot = new Map<string, number>();
    nelPeriodo.forEach(m => tot.set(m.voce, (tot.get(m.voce) || 0) + m.importo));
    const conti = [...tot.keys()].filter(v => v !== SAVEBACK).sort((a, b) => tot.get(b)! - tot.get(a)!);
    let altro = 0;
    const lista = conti.map(nome => ({
      nome,
      colore: COLORI_CONTO[nome] ?? ALTRI_COLORI[altro++ % ALTRI_COLORI.length],
      totale: tot.get(nome)!,
      eSaveback: false,
    }));
    if (tot.has(SAVEBACK)) lista.push({ nome: SAVEBACK, colore: COLORE_SAVEBACK, totale: tot.get(SAVEBACK)!, eSaveback: true });
    return lista;
  }, [nelPeriodo]);

  const serie = useMemo(() => {
    const punti = new Map<number, Record<string, number>>();
    for (let k = inizio; k <= fine; k++) punti.set(k, { k, totale: 0 });
    nelPeriodo.forEach(m => {
      const q = punti.get(m.k)!;
      q[m.voce] = (q[m.voce] || 0) + m.importo;
      q.totale += m.importo;
    });
    const cum: Record<string, number> = {};
    return [...punti.values()].map(q => {
      const c: Record<string, number> = {};
      voci.forEach(v => { cum[v.nome] = (cum[v.nome] || 0) + (q[v.nome] || 0); c[`cum:${v.nome}`] = cum[v.nome]; });
      return { ...q, ...c, cumTotale: voci.reduce((s, v) => s + cum[v.nome], 0) };
    });
  }, [nelPeriodo, inizio, fine, voci]);

  const totale = voci.reduce((s, v) => s + v.totale, 0);
  const interessi = voci.filter(v => !v.eSaveback).reduce((s, v) => s + v.totale, 0);
  const saveback = voci.find(v => v.eSaveback)?.totale ?? 0;
  const precedente = useMemo(() => {
    if (!p.precedenteCompleto) return null;
    return movimenti.filter(m => m.k >= inizio - numeroMesi && m.k < inizio).reduce((s, m) => s + m.importo, 0);
  }, [movimenti, inizio, numeroMesi, p.precedenteCompleto]);
  const daSempre = useMemo(() => movimenti.reduce((s, m) => s + m.importo, 0), [movimenti]);

  // Anno per anno su tutti i dati (non dipende dal periodo scelto)
  const perAnno = useMemo(() => {
    const anni = new Map<number, { anno: number; interessi: number; saveback: number; mesi: Set<number> }>();
    movimenti.forEach(m => {
      const anno = Math.floor(m.k / 12);
      const a = anni.get(anno) ?? { anno, interessi: 0, saveback: 0, mesi: new Set<number>() };
      if (m.voce === SAVEBACK) a.saveback += m.importo; else a.interessi += m.importo;
      a.mesi.add(m.k);
      anni.set(anno, a);
    });
    return [...anni.values()].sort((x, y) => y.anno - x.anno);
  }, [movimenti]);
  const totInteressi = perAnno.reduce((s, a) => s + a.interessi, 0);
  const totSaveback = perAnno.reduce((s, a) => s + a.saveback, 0);
  const annoScelto = p.periodo.startsWith('anno-') ? parseInt(p.periodo.slice(5), 10) : null;
  const maxAnno = perAnno.reduce((m, a) => Math.max(m, a.interessi + a.saveback), 0);

  const card = 'bg-white dark:bg-[#0c1425]/45 p-5 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm transition-all duration-300 hover:shadow-md';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0c1425]/45 p-3 md:p-4 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <SelettorePeriodo p={p} accent="sky" ring="focus:ring-sky-500" />
          <span className="text-xs text-ink-soft font-medium ml-1">{p.etichettaPeriodo}</span>
        </div>
      </div>

      {movimenti.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-[#0c1425]/45 rounded-3xl border border-dashed border-hairline dark:border-slate-800">
          <p className="text-sm text-ink-soft">Non ci sono ancora interessi (Entrate, categoria "Interessi") né saveback registrati.</p>
        </div>
      ) : (<>
        {/* Cifre in alto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${card} border-sky-500/30 dark:border-sky-500/25`}>
            <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Totale fruttato</span>
            <span className="text-2xl font-black font-display text-sky-600 dark:text-sky-400 block mt-2">
              <EuroAmount value={totale} />
            </span>
            <p className="text-3xs text-ink-soft mt-1.5">
              {formatEuro(totale / numeroMesi)} al mese
              {precedente !== null && precedente > 0 && (
                <> · <span className={totale >= precedente ? 'text-up font-bold' : 'text-down font-bold'}>
                  {totale >= precedente ? '+' : ''}{Math.round(((totale - precedente) / precedente) * 100)}%
                </span> sui {numeroMesi} mesi prima</>
              )}
            </p>
          </div>
          <div className={card}>
            <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Interessi</span>
            <span className="text-2xl font-black font-display text-ink block mt-2"><EuroAmount value={interessi} /></span>
            <p className="text-3xs text-ink-soft mt-1.5">
              Da {voci.filter(v => !v.eSaveback).length} cont{voci.filter(v => !v.eSaveback).length === 1 ? 'o' : 'i'}
            </p>
          </div>
          <div className={card}>
            <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORE_SAVEBACK }} />
              Saveback
            </span>
            <span className="text-2xl font-black font-display text-ink block mt-2"><EuroAmount value={saveback} /></span>
            <p className="text-3xs text-ink-soft mt-1.5">Trade Republic, sulle spese con carta</p>
          </div>
          <div className={card}>
            <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Da sempre</span>
            <span className="text-2xl font-black font-display text-ink block mt-2"><EuroAmount value={daSempre} /></span>
            <p className="text-3xs text-ink-soft mt-1.5">Da {etichettaMese(p.primoMese)}, tutti i conti</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grafico */}
          <section className={`${card} p-6 lg:col-span-2`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-ink font-display text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                  Mese per mese
                </h2>
                <p className="text-xs text-ink-soft mt-1">
                  {vista === 'mensile' ? 'Quanto è arrivato ogni mese' : 'Quanto si è accumulato dall\'inizio del periodo'}
                </p>
              </div>
              <div role="group" aria-label="Vista del grafico" className="flex bg-canvas p-1 rounded-xl gap-0.5 border border-hairline select-none">
                {(['mensile', 'cumulato'] as const).map(v => (
                  <button key={v} type="button" onClick={() => setVista(v)} aria-pressed={vista === v}
                    className={`text-3xs px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${vista === v
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-ink-soft hover:text-sky-600 dark:hover:text-sky-300'}`}>
                    {v === 'mensile' ? 'Mensile' : 'Cumulato'}
                  </button>
                ))}
              </div>
            </div>
            <Legenda voci={voci.map(v => ({ nome: v.nome, colore: v.colore }))} className="mb-3" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {vista === 'mensile' ? (
                  <BarChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRIGLIA} />
                    <XAxis dataKey="k" tickFormatter={etichettaMese} {...ASSE} minTickGap={16} />
                    <YAxis tickFormatter={euroAsse} {...ASSE} width={56} />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <Suggerimento titolo={etichettaMese(d.k)} righe={[
                        ...voci.filter(v => d[v.nome]).map(v => ({ nome: v.nome, valore: formatEuro(d[v.nome]), colore: v.colore })),
                        { nome: 'Totale', valore: formatEuro(d.totale) },
                      ]} />;
                    }} />
                    {voci.map((v, i) => (
                      <Bar key={v.nome} dataKey={v.nome} stackId="a" fill={v.colore} radius={i === voci.length - 1 ? [4, 4, 0, 0] : undefined} />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRIGLIA} />
                    <XAxis dataKey="k" tickFormatter={etichettaMese} {...ASSE} minTickGap={16} />
                    <YAxis tickFormatter={euroAsse} {...ASSE} width={56} />
                    <Tooltip content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <Suggerimento titolo={`fino a ${etichettaMese(d.k)}`} righe={[
                        ...voci.map(v => ({ nome: v.nome, valore: formatEuro(d[`cum:${v.nome}`]), colore: v.colore })),
                        { nome: 'Totale', valore: formatEuro(d.cumTotale) },
                      ]} />;
                    }} />
                    {voci.map(v => (
                      <Area key={v.nome} type="monotone" dataKey={`cum:${v.nome}`} stackId="a" stroke={v.colore} fill={v.colore} fillOpacity={0.35} />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          {/* Per conto */}
          <section className={`${card} p-6`}>
            <h2 className="font-bold text-ink font-display text-base flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
              Per conto
            </h2>
            {voci.length === 0 ? (
              <p className="text-sm text-ink-soft py-6 text-center">Niente nel periodo scelto.</p>
            ) : (
              <ul className="space-y-3">
                {voci.map(v => (
                  <li key={v.nome}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-ink">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.colore }} />
                        {v.nome}
                      </span>
                      <span className="font-mono font-bold text-ink">{formatEuro(v.totale)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-canvas overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${totale > 0 ? (v.totale / totale) * 100 : 0}%`, backgroundColor: v.colore }} />
                    </div>
                    <div className="text-3xs text-ink-soft mt-1">{totale > 0 ? Math.round((v.totale / totale) * 100) : 0}% del totale</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-3xs text-ink-soft mt-6 pt-4 border-t border-hairline flex gap-1.5 leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Interessi dalle Entrate con categoria "Interessi" (cedole iBonds/Amundi escluse, sono nel dettaglio Trade Republic); saveback dal foglio Trade Republic.
            </p>
          </section>
        </div>
        {/* Anno per anno: interessi, saveback e totale; clic su un anno = periodo di quell'anno */}
        <section className={`${card} p-6`}>
          <div className="mb-4">
            <h2 className="font-bold text-ink font-display text-base flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
              Anno per anno
            </h2>
            <p className="text-xs text-ink-soft mt-1">Su tutti i dati; clicca un anno per vederlo nel periodo.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b border-hairline dark:border-slate-800/60 text-2xs font-bold text-ink-soft uppercase tracking-wider">
                  <th scope="col" className="py-3 px-3">Anno</th>
                  <th scope="col" className="py-3 px-3 text-right">Interessi</th>
                  <th scope="col" className="py-3 px-3 text-right">Saveback</th>
                  <th scope="col" className="py-3 px-3 text-right">Totale</th>
                  <th scope="col" className="py-3 px-3 text-right hidden sm:table-cell">Al mese</th>
                  <th scope="col" className="py-3 px-3 hidden md:table-cell w-1/4"><span className="sr-only">Barra</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs font-mono">
                {perAnno.map(a => {
                  const tot = a.interessi + a.saveback;
                  // Mesi coperti: dal primo mese con dati (o gennaio) a dicembre, o al mese corrente
                  const primo = Math.max(a.anno * 12, p.primoMese);
                  const ultimo = Math.min(a.anno * 12 + 11, meseCorrente);
                  const mesi = Math.max(1, ultimo - primo + 1);
                  return (
                    <tr key={a.anno} onClick={() => p.setPeriodo(`anno-${a.anno}`)}
                      className={`cursor-pointer transition-colors ${a.anno === annoScelto ? 'bg-sky-50/60 dark:bg-sky-950/25' : 'hover:bg-canvas/60 dark:hover:bg-slate-800/20'}`}>
                      <td className="py-3 px-3 font-sans font-semibold text-ink">
                        {a.anno}{a.anno * 12 + 11 > meseCorrente && <span className="ml-1.5 text-3xs font-medium text-ink-soft">in corso</span>}
                      </td>
                      <td className="py-3 px-3 text-right">{formatEuro(a.interessi)}</td>
                      <td className="py-3 px-3 text-right">{a.saveback ? formatEuro(a.saveback) : '—'}</td>
                      <td className="py-3 px-3 text-right font-bold text-ink">{formatEuro(tot)}</td>
                      <td className="py-3 px-3 text-right text-ink-soft hidden sm:table-cell">{formatEuro(tot / mesi)}</td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <div className="h-1.5 rounded-full bg-canvas overflow-hidden flex">
                          <div className="h-full" style={{ width: `${maxAnno ? (a.interessi / maxAnno) * 100 : 0}%`, backgroundColor: '#0ea5e9' }} />
                          <div className="h-full" style={{ width: `${maxAnno ? (a.saveback / maxAnno) * 100 : 0}%`, backgroundColor: COLORE_SAVEBACK }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-hairline dark:border-slate-700">
                  <td className="py-3 px-3 font-sans font-bold text-ink">Da sempre</td>
                  <td className="py-3 px-3 text-right font-bold">{formatEuro(totInteressi)}</td>
                  <td className="py-3 px-3 text-right font-bold">{formatEuro(totSaveback)}</td>
                  <td className="py-3 px-3 text-right font-black text-sky-600 dark:text-sky-400">{formatEuro(totInteressi + totSaveback)}</td>
                  <td className="hidden sm:table-cell" />
                  <td className="hidden md:table-cell" />
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </>)}
    </div>
  );
}
