import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CalendarRange, Landmark, TrendingUp } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import type { RispostaPrevisioni } from '../../lib/previsioniService';
import { COLORI, euroEsatto, euroStima, meseBreve, meseLungo, percentuale } from './comune';

export type SchedaPrevisioni = 'mese' | 'prossimi' | 'patrimonio';

/**
 * Le quattro card in alto di Previsioni. Ognuna ha il colore del suo dato,
 * come nei grafici (spese arancio, avanzo fucsia, patrimonio di oggi neutro),
 * e il viola della pagina resta alla sola proiezione del patrimonio.
 * Sotto la cifra una barra fa vedere la stima: la parte piena è quello che
 * c'è già, la parte chiara è la fascia (8 volte su 10), la tacca è la stima
 * più probabile. Ogni card apre la sua scheda.
 */

type Tono = 'spese' | 'risparmio' | 'neutro' | 'stima';

const TONI: Record<Tono, { card: string; titolo: string; icona: string; bordo: string; anello: string; colore: string }> = {
  spese: {
    card: 'bg-orange-200/70 dark:bg-orange-950/65 border-orange-200/80 dark:border-orange-900/50',
    titolo: 'text-orange-700 dark:text-orange-300',
    icona: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300',
    bordo: 'border-orange-300/50 dark:border-orange-900/50',
    anello: 'ring-orange-500/40',
    colore: COLORI.spese,
  },
  risparmio: {
    card: 'bg-fuchsia-200/70 dark:bg-fuchsia-950/65 border-fuchsia-200/80 dark:border-fuchsia-900/50',
    titolo: 'text-fuchsia-700 dark:text-fuchsia-300',
    icona: 'bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300',
    bordo: 'border-fuchsia-300/50 dark:border-fuchsia-900/50',
    anello: 'ring-fuchsia-500/40',
    colore: COLORI.risparmio,
  },
  neutro: {
    card: 'bg-transparent border-hairline dark:border-slate-800/60',
    titolo: 'text-ink-soft dark:text-slate-400',
    icona: 'bg-canvas dark:bg-slate-800/60 text-ink-soft dark:text-slate-300',
    bordo: 'border-hairline dark:border-slate-800/60',
    anello: 'ring-slate-400/40',
    colore: COLORI.neutro,
  },
  stima: {
    card: 'bg-violet-200/70 dark:bg-violet-950/65 border-violet-200/80 dark:border-violet-900/50',
    titolo: 'text-violet-700 dark:text-violet-300',
    icona: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300',
    bordo: 'border-violet-300/50 dark:border-violet-900/50',
    anello: 'ring-violet-500/40',
    colore: COLORI.stima,
  },
};

/** Un tratto della barra, da `da` ad `a` sulla scala 0…max. */
type Tratto = { da: number; a: number; colore: string; opacita?: number; titolo?: string };

function BarraStima({ max, tratti, tacca, soglia }: { max: number; tratti: Tratto[]; tacca?: number; soglia?: number }) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="relative h-2 rounded-full bg-black/10 dark:bg-white/10">
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {tratti.map((t, i) => (
          <div key={i} title={t.titolo} className="absolute top-0 bottom-0"
            style={{ left: pos(t.da), width: `calc(${pos(t.a)} - ${pos(t.da)})`, background: t.colore, opacity: t.opacita ?? 1 }} />
        ))}
      </div>
      {soglia !== undefined && (
        <div className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink/50 dark:bg-white/60" style={{ left: pos(soglia) }} title="soglia" />
      )}
      {tacca !== undefined && (
        <div className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
          style={{ left: pos(tacca), background: tratti.at(-1)?.colore }} />
      )}
    </div>
  );
}

function Card({ tono, icona: Icona, titolo, stima, valore, barra, sotto, attiva, onClick }: {
  tono: Tono; icona: LucideIcon; titolo: string; stima?: boolean; valore: React.ReactNode;
  barra?: React.ReactNode; sotto: React.ReactNode; attiva: boolean; onClick: () => void;
}) {
  const t = TONI[tono];
  return (
    <button type="button" onClick={onClick} aria-pressed={attiva}
      className={`group w-full text-left cursor-pointer rounded-3xl p-5 border flex flex-col gap-3 relative overflow-hidden shadow-xs transition-all duration-300 hover:shadow-md hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${t.card} ${attiva ? `ring-4 ${t.anello}` : ''}`}>
      <div className="flex justify-between items-start gap-2">
        <span className={`text-xs font-extrabold uppercase tracking-wider ${t.titolo}`}>
          {titolo}
          {stima && <span className="ml-1.5 align-middle text-3xs font-bold normal-case tracking-normal opacity-80">· stima</span>}
        </span>
        <span className={`p-1.5 rounded-xl shrink-0 ${t.icona}`}><Icona className="w-4 h-4" /></span>
      </div>
      <div className="text-2xl xl:text-3xl font-black font-display text-ink dark:text-slate-100 leading-none">{valore}</div>
      <div className="mt-auto space-y-2">
        {barra}
        <div className={`pt-2 border-t ${t.bordo} text-2xs text-ink-soft dark:text-slate-400 font-semibold flex flex-wrap justify-between gap-x-3 gap-y-0.5`}>
          {sotto}
        </div>
      </div>
      <Icona className="absolute -right-5 -bottom-5 w-28 h-28 opacity-[0.04] pointer-events-none" />
    </button>
  );
}

const TRATTINO = <span className="text-ink-soft">—</span>;

export default function PrevisioniKpiCards({ risposta, anni, scheda, setScheda }: {
  risposta: RispostaPrevisioni; anni: number; scheda: SchedaPrevisioni; setScheda: (s: SchedaPrevisioni) => void;
}) {
  const { fineMese, flussi, patrimonio } = risposta;

  // 1. Spese a fine mese: già speso (pieno), fascia, soglia delle spese totali
  const spese = (() => {
    if (!fineMese.disponibile) return <Card tono="spese" icona={CalendarClock} titolo="Spese a fine mese" valore={TRATTINO}
      sotto="non disponibile" attiva={scheda === 'mese'} onClick={() => setScheda('mese')} />;
    const s = fineMese.stima.totale;
    const speso = fineMese.spesoFinora.totale;
    const soglia = fineMese.soglie.find(x => x.nome === 'Spese Totali');
    const limite = soglia?.limite ?? undefined;
    const p = soglia?.probabilitaSforamento;
    const max = Math.max(s.alto, limite ?? 0) * 1.08 || 1;
    return (
      <Card tono="spese" icona={CalendarClock} titolo={`Spese a fine ${meseLungo(fineMese.mese).split(' ')[0]}`} stima
        valore={`~ ${euroStima(s.centrale)}`}
        barra={<BarraStima max={max} soglia={limite} tacca={s.centrale} tratti={[
          { da: 0, a: speso, colore: COLORI.spese, titolo: 'già speso' },
          // da quanto già speso alla fascia alta: dove arriverà la spesa (8 volte su 10 tra basso e alto)
          { da: speso, a: s.alto, colore: COLORI.spese, opacita: 0.35, titolo: `8 volte su 10 tra ${euroStima(s.basso)} e ${euroStima(s.alto)}` },
        ]} />}
        sotto={<>
          <span>già {euroEsatto(speso)}</span>
          {p !== null && p !== undefined
            ? <span className={p >= 0.5 ? 'text-down' : p >= 0.2 ? 'text-warn' : 'text-up'}>{percentuale(p)} di superare la soglia</span>
            : <span>tra {euroStima(s.basso)} e {euroStima(s.alto)}</span>}
        </>}
        attiva={scheda === 'mese'} onClick={() => setScheda('mese')} />
    );
  })();

  // 2. Avanzo dei prossimi 12 mesi: media al mese e fascia
  const avanzo = (() => {
    if (!flussi.disponibile || !flussi.previsti.length) return <Card tono="risparmio" icona={CalendarRange} titolo="Avanzo prossimi 12 mesi"
      valore={TRATTINO} sotto="non disponibile" attiva={scheda === 'prossimi'} onClick={() => setScheda('prossimi')} />;
    const ultimo = flussi.previsti[flussi.previsti.length - 1];
    const s = ultimo.avanzoCumulato;
    const mesi = flussi.previsti.length;
    return (
      <Card tono="risparmio" icona={CalendarRange} titolo={`Avanzo fino a ${meseBreve(ultimo.mese)}`} stima
        valore={`~ ${euroStima(s.centrale)}`}
        barra={<BarraStima max={s.alto * 1.05 || 1} tacca={s.centrale} tratti={[
          { da: 0, a: s.basso, colore: COLORI.risparmio, opacita: 0.85 },
          { da: s.basso, a: s.alto, colore: COLORI.risparmio, opacita: 0.35, titolo: '8 volte su 10' },
        ]} />}
        sotto={<>
          <span>~ {euroStima(s.centrale / mesi)} al mese</span>
          <span>tra {euroStima(s.basso)} e {euroStima(s.alto)}</span>
        </>}
        attiva={scheda === 'prossimi'} onClick={() => setScheda('prossimi')} />
    );
  })();

  // 3. Patrimonio di oggi (cifra vera): liquidità / investimenti / fondo pensione
  const oggi = (() => {
    if (!patrimonio.disponibile) return <Card tono="neutro" icona={Landmark} titolo="Patrimonio di oggi" valore={TRATTINO}
      sotto="non disponibile" attiva={scheda === 'patrimonio'} onClick={() => setScheda('patrimonio')} />;
    const o = patrimonio.oggi;
    const tot = o.totale || 1;
    const a = o.liquidita, b = a + o.investimenti;
    return (
      <Card tono="neutro" icona={Landmark} titolo="Patrimonio di oggi"
        valore={<EuroAmount value={o.totale} />}
        barra={<BarraStima max={tot} tratti={[
          { da: 0, a, colore: COLORI.risparmio, titolo: 'liquidità' },
          { da: a, a: b, colore: COLORI.versamenti, titolo: 'investimenti' },
          { da: b, a: tot, colore: COLORI.fondoPensione, titolo: 'fondo pensione' },
        ]} />}
        sotto={<>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORI.risparmio }} />liquidità {percentuale(o.liquidita / tot)}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORI.versamenti }} />investito {percentuale(o.investimenti / tot)}</span>
        </>}
        attiva={scheda === 'patrimonio'} onClick={() => setScheda('patrimonio')} />
    );
  })();

  // 4. Patrimonio tra N anni: da dove parti (pieno) a dove puoi arrivare
  const futuro = (() => {
    const fine = patrimonio.disponibile ? patrimonio.proiezione.punti.at(-1) : undefined;
    const titolo = `Patrimonio tra ${anni} ${anni === 1 ? 'anno' : 'anni'}`;
    if (!patrimonio.disponibile || !fine) return <Card tono="stima" icona={TrendingUp} titolo={titolo} valore={TRATTINO}
      sotto="non disponibile" attiva={scheda === 'patrimonio'} onClick={() => setScheda('patrimonio')} />;
    const partenza = patrimonio.proiezione.partenza;
    const volte = partenza > 0 ? fine.p50 / partenza : null;
    return (
      <Card tono="stima" icona={TrendingUp} titolo={titolo} stima
        valore={`~ ${euroStima(fine.p50)}`}
        barra={<BarraStima max={fine.p90 * 1.05 || 1} tacca={fine.p50} tratti={[
          { da: 0, a: partenza, colore: COLORI.stima, titolo: 'oggi' },
          { da: fine.p10, a: fine.p90, colore: COLORI.stima, opacita: 0.35, titolo: '8 volte su 10' },
        ]} />}
        sotto={<>
          {volte !== null && <span>× {volte.toLocaleString('it-IT', { maximumFractionDigits: 1 })} da oggi</span>}
          <span title="8 volte su 10">{euroStima(fine.p10).replace(' €', '')}–{euroStima(fine.p90)}</span>
        </>}
        attiva={scheda === 'patrimonio'} onClick={() => setScheda('patrimonio')} />
    );
  })();

  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">{spese}{avanzo}{oggi}{futuro}</div>;
}
