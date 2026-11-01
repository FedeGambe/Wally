import React, { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Flussi, NonDisponibile as ND } from '../../lib/previsioniService';
import {
  COLORI, EtichettaStima, NonDisponibile, Nota, Riquadro, Suggerimento, ValoreStimato,
  euroAsse, euroEsatto, euroStima, meseBreve, meseLungo,
} from './comune';

type Serie = 'avanzo' | 'entrate' | 'spese';
const NOMI: Record<Serie, string> = { avanzo: 'Avanzo', entrate: 'Entrate', spese: 'Spese' };
const COLORE: Record<Serie, string> = { avanzo: COLORI.vero, entrate: COLORI.entrate, spese: COLORI.spese };

/** B. Entrate, spese e avanzo dei prossimi 12 mesi (backend/domain/previsioni/flussi.py). */
export default function PrevisioniProssimiMesi({ flussi }: { flussi: Flussi | ND }) {
  const [serie, setSerie] = useState<Serie>('avanzo');

  const punti = useMemo(() => {
    if (!flussi.disponibile) return [];
    const storico = flussi.storico.slice(-12).map(s => ({
      mese: s.mese, vero: s[serie], fuoriEntrate: s.straordinarieEntrate, fuoriUscite: s.straordinarieUscite,
    }));
    // Il primo mese previsto si attacca all'ultimo vero, così la linea è continua.
    const ultimo = storico[storico.length - 1];
    if (ultimo) Object.assign(ultimo, { centrale: ultimo.vero, fascia: [ultimo.vero, ultimo.vero] });
    const previsti = flussi.previsti.map(p => ({
      mese: p.mese, centrale: p[serie].centrale, basso: p[serie].basso, alto: p[serie].alto, fascia: [p[serie].basso, p[serie].alto],
    }));
    return [...storico, ...previsti];
  }, [flussi, serie]);

  if (!flussi.disponibile) {
    return <Riquadro icona={CalendarRange} titolo="Prossimi 12 mesi"><NonDisponibile motivo={flussi.motivo} /></Riquadro>;
  }
  const ultimoPrevisto = flussi.previsti[flussi.previsti.length - 1];
  const affidabilita = flussi.affidabilita[serie];

  const scelta = (
    <div className="flex gap-1.5">
      {(Object.keys(NOMI) as Serie[]).map(s => (
        <button key={s} onClick={() => setSerie(s)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${serie === s
            ? 'bg-violet-600 text-white border-violet-600'
            : 'bg-transparent text-ink-soft border-hairline hover:bg-canvas dark:hover:bg-white/5'}`}>
          {NOMI[s]}
        </button>
      ))}
    </div>
  );

  return (
    <Riquadro icona={CalendarRange} titolo="Prossimi 12 mesi"
      sottotitolo="Avanzo = entrate - spese: la parte che va negli investimenti più quella che resta sui conti." destra={scelta}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-5">
          <ValoreStimato etichetta={`Avanzo totale fino a ${meseLungo(ultimoPrevisto.mese)}`} stima={ultimoPrevisto.avanzoCumulato} grande />
          <div className="overflow-hidden rounded-2xl border border-hairline">
            <table className="w-full text-xs">
              <thead className="bg-canvas dark:bg-white/5 text-ink-soft">
                <tr><th className="text-left font-semibold px-3 py-2">Mese</th><th className="text-right font-semibold px-3 py-2">Entrate</th>
                  <th className="text-right font-semibold px-3 py-2">Spese</th><th className="text-right font-semibold px-3 py-2">Avanzo<EtichettaStima /></th></tr>
              </thead>
              <tbody>
                {flussi.previsti.slice(0, 6).map(p => (
                  <tr key={p.mese} className="border-t border-hairline">
                    <td className="px-3 py-1.5 text-ink">{meseBreve(p.mese)}</td>
                    <td className="px-3 py-1.5 text-right text-ink">~ {euroStima(p.entrate.centrale)}</td>
                    <td className="px-3 py-1.5 text-right text-ink">~ {euroStima(p.spese.centrale)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-ink">~ {euroStima(p.avanzo.centrale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={punti} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORI.griglia} strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="mese" tickFormatter={meseBreve} stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                <YAxis stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={euroAsse} />
                {serie === 'avanzo' && <ReferenceLine y={0} stroke={COLORI.griglia} strokeOpacity={0.6} />}
                <Tooltip content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  const fuori = [
                    ...(p.fuoriEntrate ? [{ nome: 'Entrate straordinarie escluse', valore: euroEsatto(p.fuoriEntrate) }] : []),
                    ...(p.fuoriUscite ? [{ nome: 'Uscite straordinarie escluse', valore: euroEsatto(p.fuoriUscite) }] : []),
                  ];
                  const righe = p.vero !== undefined
                    ? [{ nome: `${NOMI[serie]} (senza straordinarie)`, valore: euroEsatto(p.vero), colore: COLORE[serie] }, ...fuori]
                    : [{ nome: `${NOMI[serie]} (stima)`, valore: `~ ${euroStima(p.centrale)}`, colore: COLORI.stima },
                       { nome: '8 volte su 10 tra', valore: `${euroStima(p.basso)} e ${euroStima(p.alto)}` }];
                  return <Suggerimento titolo={meseLungo(p.mese)} righe={righe} />;
                }} />
                <Area dataKey="fascia" stroke="none" fill={COLORI.fascia} fillOpacity={0.15} isAnimationActive={false} />
                <Line dataKey="centrale" stroke={COLORI.stima} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                <Line dataKey="vero" stroke={COLORE[serie]} strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft mb-2">Stipendio</div>
          {flussi.stipendio ? (
            <div className="text-xs text-ink space-y-1">
              <p>
                Periodo attuale: <strong>{flussi.stipendio.periodo.nome.toLowerCase()}</strong>, stipendi da {meseLungo(flussi.stipendio.periodo.dal)}.
                Stipendio tipico {euroEsatto(flussi.stipendio.tipico)} (mediana di {flussi.stipendio.periodo.mesi} mesi; i mesi prima non contano).
              </p>
              {flussi.stipendio.mensilitaExtra.map(x => (
                <p key={x.mese} className="text-ink-soft">
                  {meseLungo(x.mese)}: {x.nome.toLowerCase()} ~ {euroStima(x.importo)}
                  {x.frazione < 1 && ` (${Math.round(x.frazione * 12)}/12, i mesi lavorati)`}
                </p>
              ))}
              {flussi.stipendio.resaExtra !== 1 && (
                <p className="text-ink-soft">Le mensilità extra sono stimate al {Math.round(flussi.stipendio.resaExtra * 100)}% dello stipendio: è quanto è arrivato in busta l'ultima volta (sono tassate di più).</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-soft">Il periodo di lavoro attuale ha ancora troppo pochi mesi: le entrate sono stimate tutte insieme.</p>
          )}
        </div>
        <div>
          <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft mb-2">Voci straordinarie escluse dalla stima</div>
          {flussi.straordinarie.length ? (
            <ul className="text-xs space-y-1 max-h-40 overflow-y-auto pr-1">
              {[...flussi.straordinarie].reverse().map((v, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-ink-soft truncate">{meseBreve(v.mese)} · {v.descrizione || '—'}</span>
                  <span className={`font-semibold shrink-0 ${v.tipo === 'uscita' ? 'text-down' : 'text-up'}`}>{v.tipo === 'uscita' ? '-' : '+'}{euroEsatto(v.importo)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-ink-soft">Nessuna.</p>}
          <p className="text-2xs text-ink-soft mt-2">Singole voci da 1.000 € in su (più le altre con la stessa descrizione nello stesso mese, es. un saldo pagato in due volte). Lo stipendio non è mai escluso.</p>
        </div>
      </div>

      <Nota>
        Come è calcolata: stipendio del periodo attuale con tredicesima e quattordicesima, più le altre entrate e le spese stimate con la media degli ultimi 12 mesi e l'effetto tipico di quel mese dell'anno ({flussi.mesiUsati} mesi della scheda Risparmio), tutto senza le voci straordinarie.
        La fascia viene da quanto i mesi dell'ultimo anno si sono discostati dalla stima.
        {affidabilita.erroreMedio !== null && <> Provata sugli ultimi {affidabilita.mesiProvati} mesi, la stima del mese dopo ({NOMI[serie].toLowerCase()}) sbagliava in media di {euroEsatto(affidabilita.erroreMedio)} (compresi eventuali cambi di situazione, come un nuovo stipendio).</>}
      </Nota>
    </Riquadro>
  );
}
