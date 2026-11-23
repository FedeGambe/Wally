import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FineMese, NonDisponibile as ND } from '../../lib/previsioniService';
import {
  ASSE, COLORI, GRIGLIA, Legenda, NonDisponibile, Nota, Riquadro, Segmenti, Suggerimento, ValoreEsatto, ValoreStimato,
  euroAsse, euroEsatto, euroStima, meseLungo, percentuale,
} from './comune';

type Tipo = 'totale' | 'primarie' | 'secondarie';
const NOMI: Record<Tipo, string> = { totale: 'Totali', primarie: 'Primarie', secondarie: 'Secondarie' };
const SOGLIA: Record<Tipo, string> = { totale: 'Spese Totali', primarie: 'Spese Primarie', secondarie: 'Spese Secondarie' };

/** A. Come chiude il mese in corso (backend/domain/previsioni/fine_mese.py).
 * Di default le spese totali; si possono vedere anche primarie e secondarie. */
/** "venerdì, sabato e domenica" */
function elenco(voci: string[]) {
  return voci.length <= 1 ? (voci[0] ?? '') : `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`;
}

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

  const scelta = <Segmenti voci={NOMI} attiva={tipo} onChange={setTipo} etichetta="Spese da mostrare" />;
  const curva = curvaTipo.map(p => ({
    ...p,
    fascia: p.basso !== undefined && p.alto !== undefined ? [p.basso, p.alto] : undefined,
  }));
  const ultimoGiorno = f.giorno >= f.giorniMese;
  // Primarie stimate sui giorni della settimana rimasti (es. il rifornimento nel weekend).
  const perSettimana = tipo === 'secondarie' ? [] : (f.perGiornoSettimana ?? []);

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
            <ValoreEsatto etichetta="Già speso" valore={f.spesoFinora[tipo]} />
            <ValoreEsatto
              etichetta="Fisse in arrivo"
              valore={fissi.reduce((s, x) => s + x.importo, 0)}
              nota={fissi.length ? `${fissi.length} dai preset ricorrenti` : 'nessuna'}
            />
          </div>
          {perSettimana.length > 0 && !ultimoGiorno && (
            <ul className="space-y-1 text-2xs text-ink-soft">
              {perSettimana.map(v => (
                <li key={v.categoria}>
                  <span className="font-semibold text-ink">{v.categoria}</span>: di solito {elenco(v.giorni)} ({percentuale(v.quotaNeiGiorni)} della spesa),
                  {' '}{v.giorniRestanti === 0 ? 'nel mese non ne restano più' : v.giorniRestanti === 1 ? 'nel mese ne resta 1 di questi giorni' : `nel mese ne restano ${v.giorniRestanti} di questi giorni`}.
                </li>
              ))}
            </ul>
          )}

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
          <Legenda className="mb-3" voci={[
            { nome: 'Speso', colore: COLORI.spese },
            { nome: 'Stima', colore: COLORI.stima, forma: 'tratteggio' },
            { nome: '8 volte su 10 qui dentro', colore: COLORI.fascia, forma: 'fascia' },
          ]} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curva} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="prevSpeso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORI.spese} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORI.spese} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRIGLIA} />
                <XAxis dataKey="giorno" {...ASSE} interval="preserveStartEnd" minTickGap={12} />
                <YAxis {...ASSE} width={60} tickFormatter={euroAsse} />
                <Tooltip content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  const righe = [];
                  if (p.speso !== undefined) righe.push({ nome: 'Speso', valore: euroEsatto(p.speso), colore: COLORI.spese });
                  if (p.centrale !== undefined && p.giorno > f.giorno) {
                    righe.push({ nome: 'Stima', valore: `~ ${euroStima(p.centrale)}`, colore: COLORI.stima });
                    righe.push({ nome: '8 volte su 10 tra', valore: `${euroStima(p.basso)} e ${euroStima(p.alto)}` });
                  }
                  return <Suggerimento titolo={`Giorno ${p.giorno}`} righe={righe} />;
                }} />
                <Area type="monotone" dataKey="fascia" stroke="none" fill={COLORI.fascia} fillOpacity={0.15} connectNulls={false} activeDot={false} />
                <Area type="monotone" dataKey="speso" stroke={COLORI.spese} strokeWidth={2.5} fill="url(#prevSpeso)" fillOpacity={1} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="centrale" stroke={COLORI.stima} strokeWidth={2.5} strokeDasharray="6 4" dot={false} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Nota>
        Come è calcolata: già speso + uscite fisse dei preset non ancora registrate + quanto hai speso dopo il giorno {f.giorno} in ognuno degli ultimi {f.mesiUsati} mesi (ogni mese è uno scenario).
        Le primarie frequenti (almeno 2 al mese, come il rifornimento) seguono invece il giorno della settimana: la spesa media di ogni lunedì, martedì… di quel mese per i lunedì, martedì… che restano in questo, così contano i weekend rimasti.
        Provata sugli stessi {f.affidabilita.mesiProvati} mesi, al giorno {f.giorno} sbagliava in media di {euroEsatto(f.affidabilita.erroreMedio)}.
      </Nota>
    </Riquadro>
  );
}
