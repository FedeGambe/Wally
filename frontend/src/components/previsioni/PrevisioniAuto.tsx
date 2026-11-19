import React, { useMemo, useState } from 'react';
import { Car } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Auto, NonDisponibile as ND, Stima } from '../../lib/previsioniService';
import {
  ASSE, COLORI, EtichettaStima, GRIGLIA, Legenda, NonDisponibile, Nota, Riquadro, Segmenti, Suggerimento,
  ValoreStimato, euroAsse, euroEsatto, euroStima, meseAsse, meseLungo, pallino, percentuale,
} from './comune';

type Serie = 'km' | 'carburante';
const NOMI: Record<Serie, string> = { km: 'Km', carburante: 'Carburante' };

/** Intero col punto delle migliaia anche a 4 cifre ("4.500": toLocaleString('it-IT') lo omette). */
const migliaia = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const km = (v: number) => `${migliaia(v)} km`;
/** Km stimati: alle centinaia, come gli euro di una stima. */
const kmStima = (v: number) => `${migliaia(Math.round(v / 100) * 100)} km`;
const euroLitro = (v: number) => `${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/l`;

/**
 * D. Auto: km dei prossimi 12 mesi e quanto costeranno (backend/domain/previsioni/auto.py).
 * Il prezzo della benzina non si prevede: è un cursore, di partenza il prezzo
 * degli ultimi rifornimenti, e il costo del carburante si ricalcola qui.
 */
export default function PrevisioniAuto({ auto }: { auto: Auto | ND | undefined }) {
  const [serie, setSerie] = useState<Serie>('km');
  const [prezzoScelto, setPrezzo] = useState<number | null>(null);

  const dati = auto && auto.disponibile ? auto : null;
  const prezzo = prezzoScelto ?? dati?.prezzo.attuale ?? 0;
  const costoKm = dati ? prezzo / dati.kmAlLitro : 0; // € di carburante per km

  const punti = useMemo(() => {
    if (!dati) return [];
    const valore = (v: number) => (serie === 'km' ? v : v * costoKm);
    const storico = dati.storico.map(s => ({ mese: s.mese, vero: serie === 'km' ? s.km : s.carburante }));
    const ultimo = storico[storico.length - 1];
    if (ultimo) Object.assign(ultimo, { centrale: ultimo.vero, fascia: [ultimo.vero, ultimo.vero] });
    const previsti = dati.previsti.map(p => ({
      mese: p.mese, centrale: valore(p.km.centrale), basso: valore(p.km.basso), alto: valore(p.km.alto),
      fascia: [valore(p.km.basso), valore(p.km.alto)],
    }));
    return [...storico, ...previsti];
  }, [dati, serie, costoKm]);

  if (!dati) {
    return <Riquadro icona={Car} titolo="Auto"><NonDisponibile motivo={auto ? (auto as ND).motivo : 'Previsioni dell\'auto non ancora calcolate.'} /></Riquadro>;
  }

  const primo = dati.previsti[0].mese;
  const ultimoMese = dati.previsti[dati.previsti.length - 1].mese;
  const carburante: Stima = {
    centrale: dati.kmAnno.centrale * costoKm, basso: dati.kmAnno.basso * costoKm, alto: dati.kmAnno.alto * costoKm,
  };
  const rateAnno = dati.rateFisse.mensile * 12;
  const totale: Stima = { centrale: carburante.centrale + rateAnno, basso: carburante.basso + rateAnno, alto: carburante.alto + rateAnno };
  const { minimoAnno, massimoAnno } = dati.prezzo;
  const cursoreMin = Math.floor(Math.min(dati.prezzo.attuale, minimoAnno ?? dati.prezzo.attuale) * 0.8 * 10) / 10;
  const cursoreMax = Math.ceil(Math.max(dati.prezzo.attuale, massimoAnno ?? dati.prezzo.attuale) * 1.2 * 10) / 10;
  const colore = COLORI.auto;

  const scelta = <Segmenti voci={NOMI} attiva={serie} onChange={setSerie} etichetta="Serie da mostrare" />;

  return (
    <Riquadro icona={Car} titolo="Auto: prossimi 12 mesi"
      sottotitolo={`Da ${meseLungo(primo)} a ${meseLungo(ultimoMese)}, con il ritmo di guida dell'ultimo anno.`} destra={scelta}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-5">
          <div>
            <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">Km nei prossimi 12 mesi<EtichettaStima /></div>
            <div className="font-display font-black text-ink leading-none mt-2 text-3xl">~ {kmStima(dati.kmAnno.centrale)}</div>
            <div className="text-xs text-ink-soft mt-1.5">
              tra {kmStima(dati.kmAnno.basso)} e {kmStima(dati.kmAnno.alto)} · circa {Math.round(dati.kmAlGiorno)} km al giorno
            </div>
            <div className="text-xs text-ink-soft mt-1">
              Contachilometri: {km(dati.contachilometri.oggi)} oggi, ~ {kmStima(dati.contachilometri.traUnAnno)} fra un anno
            </div>
          </div>

          <ValoreStimato etichetta="Carburante nei 12 mesi" stima={carburante} />

          <label className="block">
            <div className="flex justify-between text-xs">
              <span className="text-ink">Prezzo della benzina</span>
              <span className="font-semibold text-ink">{euroLitro(prezzo)}</span>
            </div>
            <input type="range" min={cursoreMin} max={cursoreMax} step={0.01} value={prezzo}
              onChange={e => setPrezzo(Number(e.target.value))} className="w-full mt-1 accent-violet-600" />
            <div className="text-2xs text-ink-soft flex flex-wrap justify-between gap-x-3">
              <span>
                Ultimi rifornimenti {euroLitro(dati.prezzo.attuale)}
                {minimoAnno !== null && massimoAnno !== null && <> · nell'ultimo anno da {euroLitro(minimoAnno)} a {euroLitro(massimoAnno)}</>}
              </span>
              {prezzoScelto !== null && prezzoScelto !== dati.prezzo.attuale && (
                <button type="button" onClick={() => setPrezzo(null)} className="font-bold text-violet-600 dark:text-violet-300 hover:underline cursor-pointer">
                  Ripristina
                </button>
              )}
            </div>
          </label>
        </div>

        <div className="xl:col-span-2">
          <Legenda className="mb-3" voci={[
            { nome: serie === 'km' ? 'Km fatti' : 'Carburante pagato', colore },
            { nome: 'Stima', colore: COLORI.stima, forma: 'tratteggio' },
            { nome: '8 volte su 10 qui dentro', colore: COLORI.fascia, forma: 'fascia' },
          ]} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={punti} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="prevAutoVero" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colore} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={colore} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRIGLIA} />
                <XAxis dataKey="mese" tickFormatter={meseAsse} {...ASSE} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...ASSE} width={60} tickFormatter={serie === 'km'
                  ? (v: number) => `${Math.round(v).toLocaleString('it-IT')} km` : euroAsse} />
                <Tooltip content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  const formato = serie === 'km' ? km : euroEsatto;
                  const formatoStima = serie === 'km' ? kmStima : euroStima;
                  const righe = p.vero !== undefined
                    ? [{ nome: serie === 'km' ? 'Km fatti' : 'Carburante pagato', valore: formato(p.vero), colore }]
                    : [{ nome: `${NOMI[serie]} (stima)`, valore: `~ ${formatoStima(p.centrale)}`, colore: COLORI.stima },
                       { nome: '8 volte su 10 tra', valore: `${formatoStima(p.basso)} e ${formatoStima(p.alto)}` }];
                  return <Suggerimento titolo={meseLungo(p.mese)} righe={righe} />;
                }} />
                <Area type="monotone" dataKey="fascia" stroke="none" fill={COLORI.fascia} fillOpacity={0.15} activeDot={false} />
                <Area type="monotone" dataKey="vero" stroke={colore} strokeWidth={2.5} fill="url(#prevAutoVero)" fillOpacity={1}
                  dot={pallino(colore)} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="centrale" stroke={COLORI.stima} strokeWidth={2.5} strokeDasharray="6 4"
                  dot={pallino(COLORI.stima)} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft mb-2">Costo dell'auto nei 12 mesi<EtichettaStima /></div>
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="py-1 text-ink-soft">Carburante</td><td className="py-1 text-right text-ink">~ {euroStima(carburante.centrale)}</td></tr>
              <tr><td className="py-1 text-ink-soft">Rate fisse ({euroEsatto(dati.rateFisse.mensile)} al mese)</td><td className="py-1 text-right text-ink">{euroEsatto(rateAnno)}</td></tr>
              <tr className="border-t border-hairline font-semibold">
                <td className="py-1.5 text-ink">Totale</td>
                <td className="py-1.5 text-right text-ink">~ {euroStima(totale.centrale)} <span className="font-normal text-ink-soft">(tra {euroStima(totale.basso)} e {euroStima(totale.alto)})</span></td>
              </tr>
              <tr>
                <td className="py-1 text-ink-soft">Per km</td>
                <td className="py-1 text-right text-ink">
                  ~ {(totale.centrale / dati.kmAnno.centrale).toLocaleString('it-IT', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} €
                  <span className="text-ink-soft"> (solo carburante {costoKm.toLocaleString('it-IT', { maximumFractionDigits: 3, minimumFractionDigits: 3 })} €)</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-2xs text-ink-soft mt-2">Spese che non si ripetono (accessori, riparazioni, lavaggi) non ci sono: le rate fisse coprono già tagliando, gomme, bollo e revisione.</p>
        </div>
        <div>
          <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft mb-2">Rate fisse dell'auto</div>
          {dati.rateFisse.voci.length ? (
            <ul className="text-xs space-y-1">
              {dati.rateFisse.voci.map(v => (
                <li key={v.nome} className="flex justify-between gap-3">
                  <span className="text-ink-soft truncate">{v.nome}</span>
                  <span className="font-semibold text-ink shrink-0">{euroEsatto(v.importo)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-ink-soft">Nessuna uscita ricorrente dell'auto nei preset.</p>}
          <p className="text-2xs text-ink-soft mt-2">Dalle uscite ricorrenti in Impostazioni: macro Automobile, bollo e revisione.</p>
        </div>
      </div>

      <Nota>
        Km: il ritmo del contachilometri negli ultimi {dati.giorniUsati} giorni ({dati.rifornimenti} rifornimenti in Analisi Consumi, l'ultimo il {dati.ultimoRifornimento.split('-').reverse().join('/')}), uguale in ogni mese: con un anno solo di dati non si vede ancora se d'estate si guida di più.
        La fascia viene da quanto i km sono cambiati da un mese all'altro nell'ultimo anno.
        {dati.affidabilita.erroreMedio !== null && <> Provata sul passato ({dati.affidabilita.prove} partenze), sui {dati.affidabilita.giorni} giorni dopo sbagliava in media del {percentuale(dati.affidabilita.erroreMedio)}.</>}
        {' '}Consumo: {dati.kmAlLitro.toLocaleString('it-IT')} km al litro, tutti i rifornimenti dell'ultimo anno.
        Prezzo: di partenza la mediana degli ultimi 4 rifornimenti; sul passato il prezzo più recente sbagliava meno delle medie, ma di 0,15 €/l a tre mesi e di quasi 0,30 a sei, per questo si può cambiare.
      </Nota>
    </Riquadro>
  );
}
