import React, { useEffect, useState } from 'react';
import { Calendar, Check, X } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import { formatEuro, formatPercent } from '../../utils/format';
import type { RisparmioMese } from '../../data/mockData';

interface DynamicThresholds {
  primarie: number;
  secondarie: number;
  investiti: number;
  risparmio: number;
}

interface PanoramicaMeseCorrenteStripProps {
  currentMonthData: RisparmioMese;
  prevMonthData: RisparmioMese | undefined;
  dynamicThresholds: DynamicThresholds;
  primPerc: number | undefined;
  secPerc: number | undefined;
  invPerc: number | undefined;
  rispPerc: number | undefined;
  entrateDelta: number | undefined;
  speseDelta: number | undefined;
  spesePrimDelta: number | undefined;
  speseSecDelta: number | undefined;
  /** Presente se lo stipendio del mese non è ancora registrato (usePanoramicaData). */
  stimaStipendio?: { mediana: number; entrate: number; risparmioNetto: number } | null;
  setActiveView?: (view: string) => void;
}

/**
 * Anello che si riempie in proporzione a quota / soglia. Per Risparmio e
 * Investito ("sopra") pieno = soglia raggiunta; per le Spese ("sotto") è il
 * budget consumato: pieno = soglia esaurita, oltre diventa rosso.
 * Oltre il 100% l'anello continua a girare: il secondo (e terzo) giro si
 * sovrappone al primo con una sfumatura più chiara, fino a MAX_GIRI.
 * Al centro la quota sulle entrate (34,6%), non il rapporto con la soglia:
 * quello lo dice già quanto è pieno l'anello. Il primo giro sfuma dal colore
 * scurito all'inizio al colore pieno alla fine e l'arco finisce con un
 * pallino più chiaro. Parte vuoto e si riempie al montaggio animando --ring-p
 * (registrata con @property in index.css; ferma con prefers-reduced-motion).
 */
const MAX_GIRI = 3;

function SogliaRing({ perc, percAst = '', soglia, ok }: { perc: number | undefined; percAst?: string; soglia: number; ok: boolean }) {
  const ratio = perc !== undefined && soglia > 0 ? Math.max(0, perc / soglia) : undefined;
  const target = ratio !== undefined ? Math.min(ratio, MAX_GIRI) : 0;
  const giri = Math.max(1, Math.ceil(target));
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const size = 56;
  const stroke = 6;
  const base = ok ? 'var(--color-up)' : 'var(--color-down)';
  const color = ok ? 'text-up' : 'text-down';
  const ringStyle = {
    '--ring-p': fill,
    '--ring-c': base,
    width: size,
    height: size,
    // Più giri, più tempo: la velocità del riempimento resta simile.
    transitionDuration: `${700 + 500 * (giri - 1)}ms`,
  } as React.CSSProperties;
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${stroke}px), #000 calc(100% - ${stroke}px))`;
  return (
    <div
      className="soglia-ring relative shrink-0"
      style={ringStyle}
      role="img"
      aria-label={ratio !== undefined ? `Quota ${formatPercent(perc)} su una soglia del ${soglia}%: ${Math.round(ratio * 100)}% della soglia` : 'Dato non disponibile'}
      title={ratio !== undefined ? `Quota ${formatPercent(perc)} su soglia ${soglia}% (${Math.round(ratio * 100)}% della soglia)` : undefined}
    >
      {/* Binario */}
      <div
        className="absolute inset-0 rounded-full bg-slate-100 dark:bg-slate-700/40"
        style={{ mask, WebkitMask: mask }}
      />
      {/* Inizio arrotondato: mezzo cerchio del colore di partenza in cima */}
      {target > 0 && (
        <span
          className="absolute left-1/2 rounded-full"
          style={{
            top: 0,
            width: stroke,
            height: stroke,
            transform: 'translateX(-50%)',
            clipPath: 'inset(0 50% 0 0)',
            background: 'color-mix(in oklab, var(--ring-c), black 60%)',
          }}
        />
      )}
      {/* Un arco per giro. Il giro i mostra clamp(0, p - i, 1) del cerchio:
          il primo sfuma dal colore scurito al pieno, i successivi dal pieno
          al più chiaro, così si distinguono sopra il giro precedente. */}
      {Array.from({ length: giri }, (_, i) => {
        const p = `clamp(0, var(--ring-p) - ${i}, 1)`;
        const da = i === 0 ? 'color-mix(in oklab, var(--ring-c), black 60%)' : 'var(--ring-c)';
        const a = i === 0 ? 'var(--ring-c)' : 'color-mix(in oklab, var(--ring-c), white 35%)';
        return (
          <div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, ${da} 0deg, ${a} calc(${p} * 360deg), transparent calc(${p} * 360deg))`,
              mask,
              WebkitMask: mask,
            }}
          />
        );
      })}
      {/* Pallino finale, più chiaro, ruotato sulla punta dell'arco */}
      {target > 0 && (
        <div
          className="absolute inset-0"
          style={{ transform: 'rotate(calc(var(--ring-p) * 360deg))' }}
        >
          <span
            className="absolute left-1/2 rounded-full"
            style={{
              top: stroke / 2,
              width: stroke + 3,
              height: stroke + 3,
              transform: 'translate(-50%, -50%)',
              background: 'color-mix(in srgb, var(--ring-c), white 55%)',
              boxShadow: '0 0 0 1.5px var(--ring-c), 0 0 8px var(--ring-c)',
            }}
          />
        </div>
      )}
      <span className={`absolute inset-0 flex items-center justify-center text-3xs font-extrabold font-display tabular-nums tracking-tight ${color}`}>
        {perc !== undefined ? `${formatPercent(perc)}${percAst}` : '—'}
      </span>
    </div>
  );
}

interface MeseCardProps {
  label: string;
  value: number | undefined;
  valueAst?: string;
  deltaEuro: number | undefined;
  perc: number | undefined;
  percAst?: string;
  percDelta: number | undefined;
  soglia: number;
  /** "sopra": di più è meglio (Risparmio, Investito); "sotto": di meno è meglio (Spese). */
  verso: 'sopra' | 'sotto';
  onClick: () => void;
}

/** Card di uno dei 4 mini-widget: cifra con lo scostamento dalla soglia in € sotto, anello a destra. */
function MeseCard({ label, value, valueAst = '', deltaEuro, perc, percAst = '', percDelta, soglia, verso, onClick }: MeseCardProps) {
  const ok = percDelta !== undefined && percDelta >= 0;
  const distanza = percDelta !== undefined ? formatPercent(Math.abs(percDelta)) : '***%';
  const statoSoglia = ok
    ? `${verso === 'sopra' ? 'Sopra' : 'Sotto'} la soglia del ${soglia}% di ${distanza}`
    : `Fuori soglia (${soglia}%) di ${distanza}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-5 rounded-2xl bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 flex flex-col justify-between gap-3 min-h-32 cursor-pointer hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">{label}</span>
          <span className="text-2xl font-extrabold font-display text-ink block mt-1 truncate">
            <EuroAmount value={value} />{valueAst}
          </span>
          {deltaEuro !== undefined && (
            <span className={`text-xs font-bold block ${deltaEuro >= 0 ? 'text-up' : 'text-down'}`}>
              {deltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(deltaEuro))}
            </span>
          )}
        </div>
        <SogliaRing perc={perc} percAst={percAst} soglia={soglia} ok={ok} />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-xs text-ink-soft font-medium whitespace-nowrap">Soglia: <strong className="font-bold text-ink">{soglia}%</strong></span>
        {/* Chip compatto: icona ✓/✗ e distanza dalla soglia in punti; la
            frase intera ("Sopra soglia di …") è nel tooltip e per lo screen reader. */}
        <span
          className={`inline-flex items-center gap-0.5 whitespace-nowrap text-3xs font-bold pl-1 pr-2 py-0.5 rounded-full border ${ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}
          title={statoSoglia}
        >
          {ok ? <Check className="w-3 h-3" strokeWidth={3} aria-hidden /> : <X className="w-3 h-3" strokeWidth={3} aria-hidden />}
          <span aria-hidden>{formatPercent(percDelta, { signed: true })}</span>
          <span className="sr-only">{statoSoglia}</span>
        </span>
      </div>
    </button>
  );
}

/**
 * Sezione "Mese in evidenza": spendibile residuo, i 4 mini-widget
 * Risparmio/Investito/Spese Primarie/Secondarie (con scostamento dalla soglia
 * dinamica sia in € che in punti percentuali) e la riga di delta % vs il mese
 * precedente. Nascosta su mobile: il suo contenuto è già coperto dal widget
 * "Rendiconto Mese Corrente" (PanoramicaRendicontoWidget) e dal suo popup di
 * dettaglio.
 */
export default function PanoramicaMeseCorrenteStrip({
  currentMonthData,
  prevMonthData,
  dynamicThresholds,
  primPerc,
  secPerc,
  invPerc,
  rispPerc,
  entrateDelta,
  speseDelta,
  spesePrimDelta,
  speseSecDelta,
  stimaStipendio,
  setActiveView
}: PanoramicaMeseCorrenteStripProps) {
  // Senza stipendio registrato entrate e risparmio sono stimati con lo
  // stipendio mediano: le cifre che ne dipendono hanno l'asterisco.
  const entrateMese = stimaStipendio ? stimaStipendio.entrate : currentMonthData.entrate;
  const risparmioMese = stimaStipendio ? stimaStipendio.risparmioNetto : currentMonthData.risparmioNetto;
  const ast = stimaStipendio ? '*' : '';

  // Widget "Risparmio & Investito": somma i due sotto-widget, quota % sulle
  // entrate e soglia combinata (somma delle due soglie dinamiche).
  const rispInvTotale = (risparmioMese || 0) + (currentMonthData.investito || 0);
  const rispInvPerc = entrateMese > 0 ? (rispInvTotale / entrateMese) * 100 : undefined;
  const rispInvSoglia = dynamicThresholds.risparmio + dynamicThresholds.investiti;

  // Widget "Spese": somma Primarie + Secondarie, quota % e soglia combinata.
  const speseTotaleWidget = (currentMonthData.spesePrimarie || 0) + (currentMonthData.speseSecondarie || 0);
  const spesePerc = entrateMese > 0 ? (speseTotaleWidget / entrateMese) * 100 : undefined;
  const speseSoglia = dynamicThresholds.primarie + dynamicThresholds.secondarie;

  // Scostamento dalla soglia dei 4 mini-widget, sia in euro (accanto
  // all'importo) che in punti percentuali (nel badge Sotto/Fuori Soglia, che
  // prima ripeteva la stessa quota già mostrata sopra invece di dire "di
  // quanto"). Positivo = soglia rispettata (margine), negativo = soglia
  // sforata. Per risparmio/investito "di più è meglio" (quota - target); per
  // le spese vale il contrario (target - quota).
  const rispDeltaEuro = (risparmioMese !== undefined && entrateMese)
    ? risparmioMese - (entrateMese * dynamicThresholds.risparmio / 100) : undefined;
  const invDeltaEuro = (currentMonthData.investito !== undefined && entrateMese)
    ? currentMonthData.investito - (entrateMese * dynamicThresholds.investiti / 100) : undefined;
  const primDeltaEuro = (currentMonthData.spesePrimarie !== undefined && entrateMese)
    ? (entrateMese * dynamicThresholds.primarie / 100) - currentMonthData.spesePrimarie : undefined;
  const secDeltaEuro = (currentMonthData.speseSecondarie !== undefined && entrateMese)
    ? (entrateMese * dynamicThresholds.secondarie / 100) - currentMonthData.speseSecondarie : undefined;
  const rispPercDelta = rispPerc !== undefined ? rispPerc - dynamicThresholds.risparmio : undefined;
  const invPercDelta = invPerc !== undefined ? invPerc - dynamicThresholds.investiti : undefined;
  const primPercDelta = primPerc !== undefined ? dynamicThresholds.primarie - primPerc : undefined;
  const secPercDelta = secPerc !== undefined ? dynamicThresholds.secondarie - secPerc : undefined;

  return (
    <div className="hidden md:block bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left">
      <h2 className="text-base font-bold text-ink font-display mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        {/* "Mese in evidenza", non "corrente": è il mese scelto in alto, che può essere passato */}
        <span>Mese in evidenza:</span>
        <span className="text-blue-600 font-extrabold capitalize">
          {currentMonthData.mese} <span className="hidden md:inline">{currentMonthData.anno}</span><span className="md:hidden">{String(currentMonthData.anno).slice(2)}</span>
        </span>
      </h2>

      {/* Nota sul verso dei confronti con la soglia: per Risparmio e
          Investito "di più è meglio" quindi il confronto è >= (raggiunto
          o superato il target = verde). Per le Spese (Primarie/Secondarie)
          vale il contrario: "di meno è meglio", quindi il confronto è <=
          (sotto la soglia = verde, sopra = allerta rossa). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Widget Risparmio & Investito */}
        <div className="p-5 rounded-2xl border border-hairline">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-300 font-bold">Risparmio & Investito</span>
            <div className="text-right">
              <span className="font-extrabold font-display text-ink block"><EuroAmount value={rispInvTotale} />{ast}</span>
              <span className={`text-3xs font-bold ${rispInvPerc !== undefined && rispInvPerc >= rispInvSoglia ? 'text-up' : 'text-down'}`}>
                {formatPercent(rispInvPerc)}{ast} / Soglia {rispInvSoglia}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            <MeseCard
              label="Risparmio"
              value={risparmioMese}
              valueAst={ast}
              deltaEuro={rispDeltaEuro}
              perc={rispPerc}
              percAst={ast}
              percDelta={rispPercDelta}
              soglia={dynamicThresholds.risparmio}
              verso="sopra"
              onClick={() => setActiveView?.('patrimonio')}
            />
            <MeseCard
              label="Investito"
              value={currentMonthData.investito}
              deltaEuro={invDeltaEuro}
              perc={invPerc}
              percAst={ast}
              percDelta={invPercDelta}
              soglia={dynamicThresholds.investiti}
              verso="sopra"
              onClick={() => setActiveView?.('investimenti')}
            />
          </div>
        </div>

        {/* Widget Spese */}
        <div className="p-5 rounded-2xl border border-hairline">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-300 font-bold">Spese</span>
            <div className="text-right">
              <span className="font-extrabold font-display text-ink block"><EuroAmount value={speseTotaleWidget} /></span>
              <span className={`text-3xs font-bold ${spesePerc !== undefined && spesePerc <= speseSoglia ? 'text-up' : 'text-down'}`}>
                {formatPercent(spesePerc)}{ast} / Soglia {speseSoglia}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            <MeseCard
              label="Spese Primarie"
              value={currentMonthData.spesePrimarie}
              deltaEuro={primDeltaEuro}
              perc={primPerc}
              percAst={ast}
              percDelta={primPercDelta}
              soglia={dynamicThresholds.primarie}
              verso="sotto"
              onClick={() => setActiveView?.('uscite')}
            />
            <MeseCard
              label="Spese Secondarie"
              value={currentMonthData.speseSecondarie}
              deltaEuro={secDeltaEuro}
              perc={secPerc}
              percAst={ast}
              percDelta={secPercDelta}
              soglia={dynamicThresholds.secondarie}
              verso="sotto"
              onClick={() => setActiveView?.('uscite')}
            />
          </div>
        </div>
      </div>

      {/* Delta change vs previous month */}
      <div className="mt-4 p-4 bg-canvas dark:bg-slate-800 rounded-2xl border border-hairline dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-3xs font-extrabold text-ink dark:text-slate-200 uppercase tracking-wider bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
            Rispetto a {prevMonthData ? `${prevMonthData.mese} ${prevMonthData.anno}` : 'il mese prima'}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Entrate:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${entrateDelta !== undefined && entrateDelta >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {entrateDelta !== undefined && entrateDelta >= 0 ? '+' : ''}{formatPercent(entrateDelta)}{ast}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Spese Totali:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseDelta !== undefined && speseDelta <= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {speseDelta !== undefined && speseDelta >= 0 ? '+' : ''}{formatPercent(speseDelta)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Spese Primarie:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${spesePrimDelta !== undefined && spesePrimDelta <= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {spesePrimDelta !== undefined && spesePrimDelta >= 0 ? '+' : ''}{formatPercent(spesePrimDelta)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Spese Secondarie:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseSecDelta !== undefined && speseSecDelta <= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {speseSecDelta !== undefined && speseSecDelta >= 0 ? '+' : ''}{formatPercent(speseSecDelta)}
            </span>
          </div>
        </div>
      </div>

      {stimaStipendio && (
        <p className="mt-3 text-2xs text-ink-soft">
          * Stipendio di {currentMonthData.mese.toLowerCase()} non ancora registrato: entrate e risparmio includono quello mediano degli ultimi 6 mesi ({formatEuro(stimaStipendio.mediana)}).
        </p>
      )}
    </div>
  );
}
