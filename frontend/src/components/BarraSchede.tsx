import React, { useEffect, useState } from 'react';
import { LiquidNavbar } from './ui/liquid-glass-navbar';

/**
 * Barra delle schede di una pagina (Uscite: Mese/Analisi; Investimenti:
 * Cruscotto/Rendimenti/Conti/Fondo Pensione). `accento` è il colore della
 * pagina (arancio Uscite, azzurro Investimenti). Con `fissa` resta in alto
 * mentre si scorre: top negativo pari al padding di <main> in App.tsx
 * (p-4 / md:p-8), così la barra si ferma a 16px dal bordo; il contenitore
 * lascia passare i clic fuori dalla barra.
 *
 * Due varianti:
 *  - "piatta" (default, quella in uso): pillola compatta con la linguetta
 *    attiva piena nel colore della pagina, come il resto dell'app;
 *  - "liquida": la pillola d'acqua di components/ui/liquid-glass-navbar.tsx
 *    (WebGL), provata e tenuta da parte. Il tono segue il tema dell'app
 *    (classe .dark su <html>); icone ferme, niente onde al clic né acqua che si
 *    solleva al passaggio del mouse, resta solo la goccia che si allunga verso
 *    la scheda scelta. Per riaverla basta passare variante="liquida".
 *    Lo stile gemello per i pulsanti di aggiunta è in
 *    components/ui/liquid-glass-bottone.css (non importato).
 */
export interface Scheda<T extends string> {
  id: T;
  etichetta: string;
  icona: React.ReactNode;
}

function useTemaScuro() {
  const leggi = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [scuro, setScuro] = useState(leggi);
  useEffect(() => {
    const mo = new MutationObserver(() => setScuro(leggi()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return scuro;
}

interface BarraSchedeProps<T extends string> {
  schede: Scheda<T>[];
  attiva: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  /** true: sotto i 520px solo icone; false: sempre anche il testo. */
  compatta?: boolean;
  /** Colore della pagina (#rrggbb). */
  accento?: string;
  /** Resta fissa in alto durante lo scorrimento. */
  fissa?: boolean;
  /** Classe della scheda scelta, la stessa del pulsante della pagina nella
   *  sidebar (es. "bg-orange-600 text-white"): così prende la stessa sfumatura
   *  (vedi .glass-theme .bg-orange-600 in index.css). Senza, il colore `accento`. */
  classeAttiva?: string;
  /** "piatta" (default) o "liquida" (vedi sopra). */
  variante?: 'piatta' | 'liquida';
  className?: string;
}

export default function BarraSchede<T extends string>({ schede, attiva, onChange, ariaLabel, compatta, accento = '#0284c7', fissa = false, classeAttiva, variante = 'piatta', className = '' }: BarraSchedeProps<T>) {
  const contenitore = `flex justify-center ${
    fissa ? 'barra-schede-fissa sticky top-[-16px] md:top-[-32px] z-30 -mt-4 pt-4 pb-1 pointer-events-none [&>*]:pointer-events-auto' : ''
  } ${className}`;

  if (variante === 'liquida') {
    return (
      <div className={contenitore}>
        <BarraLiquida schede={schede} attiva={attiva} onChange={onChange} ariaLabel={ariaLabel} compatta={compatta} accento={accento} />
      </div>
    );
  }

  // Pillola compatta e centrata (larga quanto il contenuto), come la variante
  // liquida. Linguetta attiva: colore della pagina scurito un po', perché il testo
  // bianco si legga (come i vecchi orange-700 / sky-700).
  const pieno = `color-mix(in srgb, ${accento} 82%, black)`;
  return (
    <div className={contenitore}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="barra-schede-pillola fondo-sidebar bordo-sidebar inline-flex max-w-full p-1 gap-1 rounded-full border shadow-xs"
      >
        {schede.map(s => {
          const scelta = s.id === attiva;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={scelta}
              onClick={() => onChange(s.id)}
              style={scelta && !classeAttiva ? { backgroundColor: pieno } : undefined}
              className={`inline-flex items-center justify-center gap-2 h-9 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                scelta
                  ? `${classeAttiva ?? 'text-white'} shadow-xs`
                  : 'text-ink-soft dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-slate-800/30'
              }`}
            >
              <span className="hidden sm:inline-flex [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">{s.icona}</span>
              {s.etichetta}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Variante "liquida" (non in uso): vedi il commento in cima al file. */
function BarraLiquida<T extends string>({ schede, attiva, onChange, ariaLabel, compatta, accento }: Pick<BarraSchedeProps<T>, 'schede' | 'attiva' | 'onChange' | 'ariaLabel' | 'compatta' | 'accento'>) {
  const scuro = useTemaScuro();
  return (
      <LiquidNavbar
        accent={accento}
        ripples={false}
        hoverFx={false}
        tone={scuro ? 'dark' : 'light'}
        ariaLabel={ariaLabel}
        compact={compatta}
        active={Math.max(0, schede.findIndex(s => s.id === attiva))}
        onChange={i => onChange(schede[i].id)}
        items={schede.map(s => ({ label: s.etichetta, icon: s.icona, fx: 'none' }))}
      />
  );
}
