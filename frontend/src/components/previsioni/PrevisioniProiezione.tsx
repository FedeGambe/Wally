import React, { useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { Area, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IpotesiPrevisioni, Patrimonio, Ripartizione } from '../../lib/previsioniService';
import {
  COLORI, EtichettaStima, Nota, Riquadro, Suggerimento, ValoreEsatto,
  euroAsse, euroEsatto, euroStima, meseLungo, percentuale,
} from './comune';

interface Props {
  patrimonio: Patrimonio;
  ipotesi: IpotesiPrevisioni;
  setIpotesi: React.Dispatch<React.SetStateAction<IpotesiPrevisioni>>;
  ripristina: () => void;
  bloccati: boolean;
  inCaricamento: boolean;
}

/**
 * C (seconda parte). Dove può arrivare il patrimonio: migliaia di futuri
 * simulati nel backend, di cui si mostrano le fasce. I cursori cambiano le
 * ipotesi e rifanno la simulazione.
 */
export default function PrevisioniProiezione({ patrimonio, ipotesi, setIpotesi, ripristina, bloccati, inCaricamento }: Props) {
  const { proiezione, oggi } = patrimonio;
  const [avanzate, setAvanzate] = useState(false);
  const imposta = <K extends keyof IpotesiPrevisioni>(chiave: K, valore: IpotesiPrevisioni[K]) => setIpotesi(i => ({ ...i, [chiave]: valore }));
  const impostaRendimento = (classe: keyof IpotesiPrevisioni['rendimenti'], campo: 'medio' | 'volatilita', valore: number) =>
    setIpotesi(i => ({ ...i, rendimenti: { ...i.rendimenti, [classe]: { ...i.rendimenti[classe], [campo]: valore } } }));

  const partenza = proiezione.partenza;
  const punti = useMemo(() => [
    { mese: 'oggi', p50: partenza, esterna: [partenza, partenza], interna: [partenza, partenza], soloVersamenti: partenza },
    ...proiezione.punti.map(p => ({ ...p, esterna: [p.p10, p.p90], interna: [p.p25, p.p75] })),
  ], [proiezione, partenza]);
  const fine = proiezione.punti[proiezione.punti.length - 1];
  // Un punto intermedio: tra 10 anni (o 5, se la simulazione è più corta).
  const anniIntermedi = ipotesi.anni > 10 ? 10 : ipotesi.anni > 5 ? 5 : null;
  const intermedio = anniIntermedi && proiezione.punti[0]
    ? proiezione.punti.find(p => p.mese === aggiungiMesi(proiezione.punti[0].mese, anniIntermedi * 12 - 3))
    : undefined;
  const reale = ipotesi.inflazione > 0;
  // Mese della torta: quello cliccato sul grafico, altrimenti la fine del periodo.
  const [meseScelto, setMeseScelto] = useState<string | null>(null);
  const puntoScelto = proiezione.punti.find(p => p.mese === meseScelto) ?? fine;

  return (
    <Riquadro icona={TrendingUp} titolo="Dove può arrivare il patrimonio"
      sottotitolo={`${proiezione.scenari.toLocaleString('it-IT', { useGrouping: true })} futuri simulati con le ipotesi qui sotto, partendo da ${euroEsatto(partenza)}${proiezione.fondoIncluso ? '' : ' (fondo pensione escluso)'}${reale ? `, in euro di oggi (inflazione ${ipotesi.inflazione}% l'anno)` : ''}.`}
      destra={inCaricamento ? <span className="text-2xs text-ink-soft">ricalcolo…</span> : undefined}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {intermedio && <Scenario etichetta={`Tra ${anniIntermedi} anni`} p={intermedio} />}
            {fine && <Scenario etichetta={`Tra ${ipotesi.anni} anni`} p={fine} />}
            {fine && (
              <ValoreEsatto etichetta={`Di cui dal mercato`} valore={<>~ {euroStima(fine.p50 - fine.soloVersamenti)}<EtichettaStima /></>}
                nota={`senza rendimenti: ~ ${euroStima(fine.soloVersamenti)}`} />
            )}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={punti} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} className="cursor-pointer"
                onClick={(e: any) => { if (e?.activeLabel && e.activeLabel !== 'oggi') setMeseScelto(String(e.activeLabel)); }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORI.griglia} strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="mese" tickFormatter={m => (m === 'oggi' ? 'oggi' : m.slice(0, 4))} stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} width={48} tickFormatter={euroAsse} />
                {ipotesi.obiettivo && <ReferenceLine y={ipotesi.obiettivo} stroke={COLORI.fondoPensione} strokeDasharray="4 4"
                  label={{ value: `obiettivo ${euroStima(ipotesi.obiettivo)}`, position: 'insideTopLeft', fontSize: 11, fill: COLORI.fondoPensione }} />}
                {puntoScelto && <ReferenceLine x={puntoScelto.mese} stroke={COLORI.stima} strokeOpacity={0.6} />}
                <Tooltip content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  if (p.mese === 'oggi') return <Suggerimento titolo="Oggi" righe={[{ nome: proiezione.fondoIncluso ? 'Patrimonio' : 'Patrimonio senza fondo pensione', valore: euroEsatto(p.p50) }]} />;
                  return <Suggerimento titolo={meseLungo(p.mese)} righe={[
                    { nome: 'Più probabile', valore: `~ ${euroStima(p.p50)}`, colore: COLORI.stima },
                    { nome: '1 volta su 2 tra', valore: `${euroStima(p.p25)} e ${euroStima(p.p75)}` },
                    { nome: '8 volte su 10 tra', valore: `${euroStima(p.p10)} e ${euroStima(p.p90)}` },
                    { nome: 'Senza rendimenti', valore: `~ ${euroStima(p.soloVersamenti)}`, colore: COLORI.griglia },
                  ]} />;
                }} />
                <Area dataKey="esterna" stroke="none" fill={COLORI.fascia} fillOpacity={0.12} isAnimationActive={false} />
                <Area dataKey="interna" stroke="none" fill={COLORI.fascia} fillOpacity={0.22} isAnimationActive={false} />
                <Line dataKey="soloVersamenti" stroke={COLORI.griglia} strokeWidth={1.5} strokeDasharray="2 4" dot={false} isAnimationActive={false} />
                <Line dataKey="p50" stroke={COLORI.stima} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 text-2xs text-ink-soft mt-2">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: COLORI.stima }} />Più probabile</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm" style={{ background: COLORI.fascia, opacity: 0.4 }} />1 volta su 2</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm" style={{ background: COLORI.fascia, opacity: 0.2 }} />8 volte su 10</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dotted" style={{ borderColor: COLORI.griglia }} />Senza rendimenti</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">Liquidità e investimenti</div>
                {meseScelto && puntoScelto && puntoScelto !== fine && (
                  <button onClick={() => setMeseScelto(null)} className="text-2xs font-semibold text-violet-600 dark:text-violet-300 cursor-pointer">torna alla fine</button>
                )}
              </div>
              <p className="text-2xs text-ink-soft mb-3">Clicca sul grafico per vedere un altro momento.</p>
              <div className="grid grid-cols-2 gap-3">
                <Torta titolo="Oggi" ripartizione={proiezione.ripartizioneOggi} totale={partenza} esatta />
                {puntoScelto && <Torta titolo={meseLungo(puntoScelto.mese)} ripartizione={puntoScelto.ripartizione} totale={puntoScelto.p50} />}
              </div>
              <ul className="mt-3 space-y-1">
                {PARTI.filter(x => x.chiave !== 'fondoPensione' || proiezione.fondoIncluso).map(x => (
                  <li key={x.chiave} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs items-center">
                    <span className="flex items-center gap-1.5 text-ink-soft"><span className="w-2 h-2 rounded-full" style={{ background: x.colore }} />{x.nome}</span>
                    <span className="text-ink-soft">{euroEsatto(proiezione.ripartizioneOggi[x.chiave].importo)}</span>
                    <span className="font-semibold text-ink text-right min-w-24">{puntoScelto ? `~ ${euroStima(puntoScelto.ripartizione[x.chiave].importo)}` : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-ink-soft">
                <Target className="w-3.5 h-3.5" /> Obiettivo
              </label>
              <input type="number" min={0} step={5000} value={ipotesi.obiettivo ?? ''} disabled={bloccati}
                onChange={e => imposta('obiettivo', e.target.value ? Number(e.target.value) : null)}
                className="mt-1.5 w-full rounded-xl bg-canvas dark:bg-white/5 border border-hairline px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet-500" />
              {proiezione.obiettivo && <Obiettivo obiettivo={proiezione.obiettivo} />}
            </div>
          </div>

          {proiezione.pacNonCoperto.meseProbabile && (
            <div className="flex gap-2 items-start mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-400/10 dark:border-amber-400/30 dark:text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Con l'avanzo previsto (~ {euroStima(proiezione.avanzoMedioMensile)} al mese) e un PAC di {euroEsatto(proiezione.pacMensile)} al mese, i conti si svuotano verso <strong>{meseLungo(proiezione.pacNonCoperto.meseProbabile)}</strong>:
                da lì la simulazione versa solo quello che avanza. Per tenere il PAC servono entrate più alte, spese più basse o un PAC più leggero.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">E se…</div>
            {!bloccati && (
              <button onClick={ripristina} className="flex items-center gap-1 text-2xs font-semibold text-ink-soft hover:text-ink cursor-pointer">
                <RotateCcw className="w-3 h-3" /> ripristina
              </button>
            )}
          </div>
          {bloccati && <p className="text-xs text-ink-soft">Nella demo le ipotesi non si possono cambiare.</p>}
          <Cursore etichetta="Anni" valore={ipotesi.anni} min={1} max={40} passo={1} formato={v => `${v}`} onChange={v => imposta('anni', v)} bloccato={bloccati} />
          <Cursore etichetta="Risparmio in più al mese" valore={ipotesi.risparmioExtra} min={-500} max={1000} passo={25} formato={v => euroEsatto(v)} onChange={v => imposta('risparmioExtra', v)} bloccato={bloccati} />
          <Cursore etichetta="PAC in più al mese" valore={ipotesi.pacExtra} min={-proiezione.pacMensile + ipotesi.pacExtra} max={1000} passo={25} formato={v => euroEsatto(v)} onChange={v => imposta('pacExtra', v)} bloccato={bloccati}
            nota={`PAC di oggi: ${euroEsatto(proiezione.pacMensile - ipotesi.pacExtra)} al mese`} />
          <Cursore etichetta="Aumento delle entrate all'anno" valore={ipotesi.crescitaEntrate} min={0} max={8} passo={0.5} formato={v => `${v.toLocaleString('it-IT')}%`} onChange={v => imposta('crescitaEntrate', v)} bloccato={bloccati} />
          <Interruttore
            acceso={ipotesi.includiFondoPensione}
            onChange={v => imposta('includiFondoPensione', v)}
            bloccato={bloccati}
            etichetta="Fondo pensione (TFR)"
            stato={ipotesi.includiFondoPensione ? 'Incluso' : 'Escluso'}
            nota={`${euroEsatto(oggi.fondoPensione)} oggi, ~ ${euroStima(proiezione.fondoMensile)} al mese. Di solito escluso: non si può usare fino alla pensione.`}
          />
          <Cursore etichetta="Togli l'inflazione (euro di oggi)" valore={ipotesi.inflazione} min={0} max={5} passo={0.5} formato={v => (v ? `${v.toLocaleString('it-IT')}%` : 'no')} onChange={v => imposta('inflazione', v)} bloccato={bloccati} />

          <button onClick={() => setAvanzate(a => !a)} className="text-2xs font-semibold text-violet-600 dark:text-violet-300 cursor-pointer">
            {avanzate ? 'Nascondi' : 'Mostra'} i rendimenti ipotizzati
          </button>
          {avanzate && (
            <div className="space-y-2">
              {(['azioni', 'obbligazioni', 'monetari', 'fondoPensione'] as const).map(c => (
                <div key={c} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs">
                  <span className="text-ink">{{ azioni: 'Azioni', obbligazioni: 'Obbligazioni', monetari: 'Monetari', fondoPensione: 'Fondo pensione' }[c]}
                    {c !== 'fondoPensione' && <span className="text-ink-soft"> · {percentuale(patrimonio.allocazione[c])}</span>}</span>
                  <NumeroPiccolo valore={ipotesi.rendimenti[c].medio} onChange={v => impostaRendimento(c, 'medio', v)} suffisso="% anno" bloccato={bloccati} />
                  <NumeroPiccolo valore={ipotesi.rendimenti[c].volatilita} onChange={v => impostaRendimento(c, 'volatilita', v)} suffisso="± %" bloccato={bloccati} />
                </div>
              ))}
              <p className="text-2xs text-ink-soft">Rendimento medio e oscillazione annua. Sono ipotesi prudenti di lungo periodo: i tuoi anni di storia sono troppo pochi per stimarli.</p>
            </div>
          )}
        </div>
      </div>

      <Nota>
        Come è calcolata: ogni mese l'avanzo previsto (entrate - spese, in media ~ {euroStima(proiezione.avanzoMedioMensile)}, con la sua incertezza) va sui conti e
        il PAC di {euroEsatto(proiezione.pacMensile)} passa negli investimenti{proiezione.fondoIncluso ? <>; il fondo pensione riceve {euroEsatto(proiezione.fondoMensile)}</> : <>; il fondo pensione è escluso</>}.
        Gli investimenti{proiezione.fondoIncluso ? ' e il fondo' : ''} crescono con rendimenti casuali secondo le ipotesi, divisi
        come oggi tra azioni ({percentuale(patrimonio.allocazione.azioni)}) e obbligazioni ({percentuale(patrimonio.allocazione.obbligazioni)}).
        Non sono previste spese straordinarie (casa, auto) né prelievi.
      </Nota>
    </Riquadro>
  );
}

const PARTI = [
  { chiave: 'liquidita', nome: 'Liquidità sui conti', colore: COLORI.risparmio },
  { chiave: 'investimenti', nome: 'Investimenti', colore: COLORI.versamenti },
  { chiave: 'fondoPensione', nome: 'Fondo pensione', colore: COLORI.fondoPensione },
] as const;

/**
 * Ciambella liquidità / investimenti / fondo. Al centro il totale e la quota
 * investita; passando sopra una fetta, il centro mostra quella fetta (niente
 * riquadro volante: in uno spazio così piccolo finiva sotto la scritta).
 */
function Torta({ titolo, ripartizione, totale, esatta = false }: { titolo: string; ripartizione: Ripartizione; totale: number; esatta?: boolean }) {
  const [attiva, setAttiva] = useState<number | null>(null);
  const dati = PARTI.map(p => ({ ...p, valore: ripartizione[p.chiave].importo })).filter(p => p.valore > 0);
  const fetta = attiva !== null ? dati[attiva] : null;
  const cifra = (v: number) => (esatta ? euroEsatto(v) : `~ ${euroStima(v)}`);
  return (
    <div className="text-center">
      <div className="text-2xs font-semibold text-ink capitalize">{titolo}{!esatta && <EtichettaStima />}</div>
      <div className="relative h-44">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2">
          {fetta ? (
            <>
              <span className="text-3xs font-semibold leading-tight" style={{ color: fetta.colore }}>{fetta.nome}</span>
              <span className="font-display font-black text-ink text-xs leading-tight mt-0.5">{cifra(fetta.valore)}</span>
              <span className="text-3xs text-ink-soft">{percentuale(ripartizione[fetta.chiave].quota)}</span>
            </>
          ) : (
            <>
              <span className="font-display font-black text-ink text-xs leading-tight">{cifra(totale)}</span>
              <span className="text-3xs text-ink-soft mt-0.5">{percentuale(ripartizione.investimenti.quota)} investito</span>
            </>
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dati} dataKey="valore" nameKey="nome" innerRadius="72%" outerRadius="95%" paddingAngle={dati.length > 1 ? 2 : 0}
              stroke="none" isAnimationActive={false}
              onMouseEnter={(_: unknown, i: number) => setAttiva(i)} onMouseLeave={() => setAttiva(null)}>
              {dati.map((p, i) => (
                <Cell key={p.chiave} fill={p.colore} fillOpacity={attiva === null || attiva === i ? 1 : 0.35} className="cursor-pointer" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** "2026-12" + 3 → "2027-03". Il primo punto è 3 mesi dopo oggi. */
function aggiungiMesi(chiave: string, mesi: number) {
  const [anno, mese] = chiave.split('-').map(Number);
  const totale = anno * 12 + mese - 1 + mesi;
  return `${Math.floor(totale / 12)}-${String((totale % 12) + 1).padStart(2, '0')}`;
}

function Scenario({ etichetta, p }: { etichetta: string; p: { p10: number; p50: number; p90: number; mese: string } }) {
  return (
    <div>
      <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">{etichetta}<EtichettaStima /></div>
      <div className="font-display font-black text-ink text-xl mt-1">~ {euroStima(p.p50)}</div>
      <div className="text-xs text-ink-soft mt-0.5">8 volte su 10 tra {euroStima(p.p10)} e {euroStima(p.p90)}</div>
    </div>
  );
}

function Obiettivo({ obiettivo }: { obiettivo: NonNullable<Patrimonio['proiezione']['obiettivo']> }) {
  if (obiettivo.giaRaggiunto) return <p className="text-xs text-ink mt-2">Già raggiunto oggi.</p>;
  const anni = obiettivo.perAnno.filter((_, i) => i % Math.max(1, Math.ceil(obiettivo.perAnno.length / 10)) === 0 || i === obiettivo.perAnno.length - 1);
  return (
    <div className="mt-2">
      <p className="text-xs text-ink">
        {obiettivo.meseProbabile
          ? <>Più probabile entro <strong>{meseLungo(obiettivo.meseProbabile)}</strong> (1 volta su 2).</>
          : <>Nel periodo simulato lo raggiungi meno di 1 volta su 2.</>}
      </p>
      <div className="mt-2 space-y-1">
        {anni.map(a => (
          <div key={a.anno} className="grid grid-cols-[3rem_1fr_2.5rem] gap-2 items-center text-2xs">
            <span className="text-ink-soft">{a.anno}</span>
            <div className="h-1.5 rounded-full bg-canvas dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-violet-500" style={{ width: `${a.probabilita * 100}%` }} />
            </div>
            <span className="text-right text-ink font-semibold">{percentuale(a.probabilita)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Interruttore acceso/spento, con il suo stato scritto accanto. */
function Interruttore({ acceso, onChange, bloccato, etichetta, stato, nota }: {
  acceso: boolean; onChange: (v: boolean) => void; bloccato: boolean; etichetta: string; stato: string; nota: string;
}) {
  return (
    <div className={`rounded-2xl border p-3 transition-colors ${acceso
      ? 'border-violet-300 bg-violet-50 dark:border-violet-400/40 dark:bg-violet-400/10'
      : 'border-hairline'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-ink">{etichetta}</div>
          <div className={`text-2xs font-bold uppercase tracking-wider mt-0.5 ${acceso ? 'text-violet-700 dark:text-violet-300' : 'text-ink-soft'}`}>{stato}</div>
        </div>
        <button type="button" role="switch" aria-checked={acceso} aria-label={etichetta} disabled={bloccato}
          onClick={() => onChange(!acceso)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${acceso ? 'bg-violet-600 border-violet-600' : 'bg-slate-300 border-slate-300 dark:bg-white/15 dark:border-white/25'}`}>
          {/* Colore scritto a mano: il tema vetro rende trasparente la classe bg-white. */}
          <span style={{ backgroundColor: '#ffffff' }} className={`inline-block h-5 w-5 rounded-full shadow transition-transform ${acceso ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <p className="text-2xs text-ink-soft mt-2 leading-relaxed">{nota}</p>
    </div>
  );
}

function Cursore({ etichetta, valore, min, max, passo, formato, onChange, bloccato, nota }: {
  etichetta: string; valore: number; min: number; max: number; passo: number; formato: (v: number) => string;
  onChange: (v: number) => void; bloccato: boolean; nota?: string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs">
        <span className="text-ink">{etichetta}</span>
        <span className="font-semibold text-ink">{formato(valore)}</span>
      </div>
      <input type="range" min={min} max={max} step={passo} value={valore} disabled={bloccato}
        onChange={e => onChange(Number(e.target.value))} className="w-full mt-1 accent-violet-600 disabled:opacity-50" />
      {nota && <div className="text-2xs text-ink-soft">{nota}</div>}
    </label>
  );
}

function NumeroPiccolo({ valore, onChange, suffisso, bloccato }: { valore: number; onChange: (v: number) => void; suffisso: string; bloccato: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <input type="number" step={0.5} value={valore} disabled={bloccato} onChange={e => onChange(Number(e.target.value))}
        className="w-14 rounded-lg bg-canvas dark:bg-white/5 border border-hairline px-1.5 py-1 text-xs text-ink text-right focus:outline-none focus:ring-2 focus:ring-violet-500" />
      <span className="text-2xs text-ink-soft w-10">{suffisso}</span>
    </span>
  );
}
