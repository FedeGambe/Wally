import React, { useMemo } from 'react';
import { PiggyBank } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Patrimonio } from '../../lib/previsioniService';
import { COLORI, Nota, Riquadro, Suggerimento, ValoreEsatto, euroAsse, euroEsatto, meseBreve, meseLungo, percentuale } from './comune';

const decimale = (v: number | null) => (v === null ? '—' : v.toLocaleString('it-IT', { maximumFractionDigits: 1 }));

const VOCI = [
  { chiave: 'risparmio', nome: 'Risparmio sui conti', colore: COLORI.risparmio },
  { chiave: 'versamenti', nome: 'Versamenti negli investimenti', colore: COLORI.versamenti },
  { chiave: 'fondoPensione', nome: 'Versamenti nel fondo pensione', colore: COLORI.fondoPensione },
  { chiave: 'mercato', nome: 'Rendimento di mercato', colore: COLORI.mercato },
] as const;

/**
 * C (prima parte). Da dove viene la crescita del patrimonio, mese per mese, e
 * come va il tasso di risparmio. Sono cifre vere del foglio, solo sommate:
 * qui non c'è nessuna stima.
 */
export default function PrevisioniCrescita({ patrimonio }: { patrimonio: Patrimonio }) {
  const { storico, oggi } = patrimonio;
  const mesi = useMemo(() => storico.mesi.map(m => ({ mese: m.mese, ...m.cumulato, tasso: m.tassoRisparmio12 })), [storico]);
  const u = storico.ultimi12;
  const daTe = u.risparmio + u.versamenti + u.fondoPensione;
  const quotaTe = u.totale ? daTe / u.totale : null;
  const tassoOra = storico.mesi.filter(m => !m.inCorso && m.tassoRisparmio12 !== null).at(-1)?.tassoRisparmio12 ?? null;
  const tassoAnnoPrima = storico.mesi.filter(m => !m.inCorso && m.tassoRisparmio12 !== null).at(-13)?.tassoRisparmio12 ?? null;

  return (
    <Riquadro icona={PiggyBank} titolo="Da dove viene la crescita"
      sottotitolo={`Somma mese per mese dal ${storico.mesi[0] ? meseLungo(storico.mesi[0].mese) : '—'}: cifre del foglio, nessuna stima.`}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-5">
          <ValoreEsatto etichetta="Patrimonio di oggi" valore={euroEsatto(oggi.totale)}
            nota={`liquidità ${euroEsatto(oggi.liquidita)} · investimenti ${euroEsatto(oggi.investimenti)} · fondo pensione ${euroEsatto(oggi.fondoPensione)}`} />

          <div>
            <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">Ultimi 12 mesi: +{euroEsatto(u.totale)}</div>
            <div className="flex h-3 rounded-full overflow-hidden mt-2 bg-canvas dark:bg-white/10">
              {VOCI.map(v => {
                const valore = u[v.chiave];
                const positivi = VOCI.reduce((s, x) => s + Math.max(0, u[x.chiave]), 0);
                return valore > 0 && positivi > 0
                  ? <div key={v.chiave} style={{ width: `${(valore / positivi) * 100}%`, background: v.colore }} title={v.nome} />
                  : null;
              })}
            </div>
            <ul className="mt-2 space-y-1">
              {VOCI.map(v => (
                <li key={v.chiave} className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-soft"><span className="w-2 h-2 rounded-full" style={{ background: v.colore }} />{v.nome}</span>
                  <span className={`font-semibold ${u[v.chiave] < 0 ? 'text-down' : 'text-ink'}`}>{euroEsatto(u[v.chiave])}</span>
                </li>
              ))}
            </ul>
            {quotaTe !== null && (
              <p className="text-xs text-ink mt-2">
                <strong>{percentuale(quotaTe)}</strong> della crescita è venuta da te, <strong>{percentuale(1 - quotaTe)}</strong> dal mercato.
                {u.risparmio < 0 && ' Sui conti sei sceso: hai investito più di quanto ti avanzava.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ValoreEsatto etichetta="Mesi di autonomia" valore={decimale(oggi.mesiAutonomia)}
              nota={`liquidità libera ${euroEsatto(oggi.liquiditaLibera)} (tolto l'impegnato) / spese medie ${euroEsatto(oggi.speseMedieMensili)}`} />
            <ValoreEsatto etichetta="Anni di spese" valore={decimale(oggi.anniDiSpese)} nota="patrimonio totale / spese di un anno" />
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div>
            <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft mb-2">Crescita cumulata, per origine</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mesi} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORI.griglia} strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="mese" tickFormatter={meseBreve} stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={euroAsse} />
                  <Tooltip content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return <Suggerimento titolo={meseLungo(p.mese)} righe={VOCI.map(v => ({ nome: v.nome, valore: euroEsatto(p[v.chiave]), colore: v.colore }))} />;
                  }} />
                  {VOCI.map(v => (
                    <Area key={v.chiave} dataKey={v.chiave} stackId="1" stroke={v.colore} fill={v.colore} fillOpacity={0.35} isAnimationActive={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">Tasso di risparmio (ultimi 12 mesi)</div>
              <div className="text-xs text-ink">
                oggi <strong>{percentuale(tassoOra, 1)}</strong>
                {tassoAnnoPrima !== null && <span className="text-ink-soft"> · un anno fa {percentuale(tassoAnnoPrima, 1)}</span>}
              </div>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mesi} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORI.griglia} strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="mese" tickFormatter={meseBreve} stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke={COLORI.griglia} fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={v => percentuale(v)} />
                  <Tooltip content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return <Suggerimento titolo={meseLungo(p.mese)} righe={[{ nome: 'Tasso di risparmio', valore: percentuale(p.tasso, 1), colore: COLORI.risparmio }]} />;
                  }} />
                  <Line dataKey="tasso" stroke={COLORI.risparmio} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <Nota>
        Tasso di risparmio = (entrate - spese) / entrate, sommando gli ultimi 12 mesi chiusi: comprende sia quello che investi sia quello che resta sui conti.
        Il rendimento del fondo pensione non è nello storico (il foglio ha solo i versamenti).
      </Nota>
    </Riquadro>
  );
}
