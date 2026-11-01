import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FineMese, NonDisponibile as ND } from '../../lib/previsioniService';
import {
  COLORI, NonDisponibile, Nota, Riquadro, Suggerimento, ValoreEsatto, ValoreStimato,
  euroAsse, euroEsatto, euroStima, meseLungo, percentuale,
} from './comune';

type Tipo = 'totale' | 'primarie' | 'secondarie';
const NOMI: Record<Tipo, string> = { totale: 'Totali', primarie: 'Primarie', secondarie: 'Secondarie' };
const SOGLIA: Record<Tipo, string> = { totale: 'Spese Totali', primarie: 'Spese Primarie', secondarie: 'Spese Secondarie' };

/** A. Come chiude il mese in corso (backend/domain/previsioni/fine_mese.py).
 * Di default le spese totali; si possono vedere anche primarie e secondarie. */
export default function PrevisioniFineMese({ fineMese }: { fineMese: FineMese | ND }) {
  const [tipo, setTipo] = useState<Tipo>('totale');
  if (!fineMese.disponibile) {
    return <Riquadro icona={CalendarClock} titolo="Chiusura del mese"><NonDisponibile motivo={fineMese.motivo} /></Riquadro>;
  }
  const f = fineMese;
  const curvaTipo = f.curve?.[tipo] ?? f.curva;
  const fissi = f.fissiInArrivo.filter(x => tipo === 'totale' || x.primaria === undefined || x.primaria === (tipo === 'primarie'));
  const soglia = f.soglie.find(s => s.nome === SOGLIA[tipo]);
  // Stipendio non ancora registrato: le soglie si misurano su entrate stimate (asterisco).
  const ast = f.entrateStimate ? '*' : '';

  const scelta = (
    <div className="flex gap-1.5">
      {(Object.keys(NOMI) as Tipo[]).map(t => (
        <button key={t} type="button" onClick={() => setTipo(t)} aria-pressed={tipo === t}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${tipo === t
            ? 'bg-violet-600 text-white border-violet-600'
            : 'bg-transparent text-ink-soft border-hairline hover:bg-canvas dark:hover:bg-white/5'}`}>
          {NOMI[t]}
        </button>
      ))}
    </div>
  );
  const curva = curvaTipo.map(p => ({
    ...p,
    fascia: p.basso !== undefined && p.alto !== undefined ? [p.basso, p.alto] : undefined,
  }));
  const ultimoGiorno = f.giorno >= f.giorniMese;

  return (
    <Riquadro
      icona={CalendarClock}
      titolo={`Chiusura di ${meseLungo(f.mese)}`}
      sottotitolo={ultimoGiorno ? 'Ultimo giorno del mese: la cifra è quasi definitiva.' : `Oggi è il ${f.giorno}: restano ${f.giorniMese - f.giorno} giorni.`}
      destra={scelta}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-5">
          <ValoreStimato etichetta={tipo === 'totale' ? 'Spese a fine mese' : `Spese ${NOMI[tipo].toLowerCase()} a fine mese`} stima={f.stima[tipo]} grande />
          <div className="grid grid-cols-2 gap-4">
            <ValoreEsatto etichetta="Già speso" valore={euroEsatto(f.spesoFinora[tipo])} />
            <ValoreEsatto
              etichetta="Fisse in arrivo"
              valore={euroEsatto(fissi.reduce((s, x) => s + x.importo, 0))}
              nota={fissi.length ? `${fissi.length} dai preset ricorrenti` : 'nessuna'}
            />
          </div>

          <div className="space-y-3">
            {soglia && [soglia].map(s => {
              const stima = f.stima[tipo];
              const p = s.probabilitaSforamento;
              const colore = p === null ? 'bg-slate-300' : p >= 0.5 ? 'bg-rose-500' : p >= 0.2 ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <div key={s.nome}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-ink">{s.nome} <span className="text-ink-soft font-normal">· soglia {s.percentuale}%{s.limite !== null && ` = ${euroEsatto(s.limite)}${ast}`}</span></span>
                    <span className="font-bold text-ink">{p === null ? '—' : `${percentuale(p)}${ast} di superarla`}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-canvas dark:bg-white/10 mt-1.5 overflow-hidden">
                    <div className={`h-full ${colore}`} style={{ width: `${(p ?? 0) * 100}%` }} />
                  </div>
                  <div className="text-2xs text-ink-soft mt-1">stima ~ {euroStima(stima.centrale)} (tra {euroStima(stima.basso)} e {euroStima(stima.alto)})</div>
                </div>
              );
            })}
            {f.entrateStimate && (
              <p className="text-2xs text-ink-soft">
                * Stipendio di {meseLungo(f.mese).toLowerCase()} non ancora registrato: la soglia si misura su entrate stimate di {euroEsatto(f.entrateMese)}
                {f.stipendioMediano ? `, con lo stipendio mediano degli ultimi 6 mesi (${euroEsatto(f.stipendioMediano)})` : ''}.
              </p>
            )}
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curva} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORI.griglia} strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="giorno" stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={euroAsse} />
                <Tooltip content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  const righe = [];
                  if (p.speso !== undefined) righe.push({ nome: 'Speso', valore: euroEsatto(p.speso), colore: COLORI.vero });
                  if (p.centrale !== undefined && p.giorno > f.giorno) righe.push({ nome: 'Stima', valore: `~ ${euroStima(p.centrale)} (${euroStima(p.basso)} – ${euroStima(p.alto)})`, colore: COLORI.stima });
                  return <Suggerimento titolo={`Giorno ${p.giorno}`} righe={righe} />;
                }} />
                <Area dataKey="fascia" stroke="none" fill={COLORI.fascia} fillOpacity={0.15} isAnimationActive={false} connectNulls={false} />
                <Line dataKey="centrale" stroke={COLORI.stima} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                <Line dataKey="speso" stroke={COLORI.vero} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 text-2xs text-ink-soft mt-2">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: COLORI.vero }} />Speso (vero)</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: COLORI.stima }} />Stima</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm" style={{ background: COLORI.fascia, opacity: 0.25 }} />8 volte su 10 qui dentro</span>
          </div>
        </div>
      </div>

      <Nota>
        Come è calcolata: già speso + uscite fisse dei preset non ancora registrate + quanto hai speso dopo il giorno {f.giorno} in ognuno degli ultimi {f.mesiUsati} mesi (ogni mese è uno scenario).
        Provata sugli stessi {f.affidabilita.mesiProvati} mesi, al giorno {f.giorno} sbagliava in media di {euroEsatto(f.affidabilita.erroreMedio)}.
      </Nota>
    </Riquadro>
  );
}
