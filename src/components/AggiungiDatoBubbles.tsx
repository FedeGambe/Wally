import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, Sparkles, Repeat, Fuel } from 'lucide-react';
import type { TipoDato } from './AggiungiDatoModal';
import { useBolleAperte, setBolleAperte, useNascondiAggiunta } from '../hooks/useBolleAperte';

/**
 * Bottone "+" della Home: al posto del popup con la griglia dei tipi,
 * fa uscire su un quarto di cerchio attorno a sé (stessi pallini vetro della barra
 * in basso) cinque pallini: Entrate, Uscite, Trasferimenti, Investimenti, Consumi.
 * L'etichetta di ogni pallino sta all'esterno dell'arco, sulla retta che va dal "+"
 * al pallino: messa sotto finiva sotto il pallino successivo.
 * Uscite e Investimenti hanno un secondo passaggio: gli altri spariscono e ai due
 * posti accanto al pallino scelto, sullo stesso arco, escono "Una tantum" e "Ricorrente".
 * Scelto il tipo, chiama `onScegli` e Panoramica apre AggiungiDatoModal
 * direttamente sul form giusto. Toccando fuori, Esc o di nuovo il "+" si chiude;
 * toccando il pallino già scelto si torna ai cinque.
 * Da md in su (`grande`) il bottone mostra anche l'etichetta come sulle altre
 * pagine e i pallini sono più grandi, su un arco più largo: lo spazio c'è.
 */

interface AggiungiDatoBubblesProps {
  onScegli: (tipo: Exclude<TipoDato, null>) => void;
  theme: 'dark' | 'light';
  /** Desktop: pallini, etichette e arco più grandi. */
  grande?: boolean;
}

type Principale = 'entrata' | 'uscita' | 'trasferimento' | 'investimento' | 'consumo';

// Cinque posti sull'arco, da dritto in su (90°) a dritto a sinistra (180°), a
// `raggio` px dal centro del "+": fra due posti vicini ci sono 0,39 × raggio, quindi
// con pallini da 56px (telefono, raggio 170) restano ~10px fra uno e l'altro, con
// quelli da 80px (desktop, raggio 270) ~25px.
const ANGOLI = [90, 112.5, 135, 157.5, 180];

interface Geometria {
  raggio: number;
  /** Raggio del cerchio del pallino in px, per agganciarci l'etichetta. */
  raggioPallino: number;
  cerchio: string;
  icona: string;
  etichetta: string;
  /** Distanza del titolo dal centro del "+", su ciascun asse, dentro l'arco. */
  titolo: number;
  classeTitolo: string;
}

const PICCOLA: Geometria = {
  raggio: 170,
  raggioPallino: 28,
  cerchio: '-left-7 -top-7 w-14 h-14',
  icona: 'w-6 h-6',
  etichetta: 'px-3 py-1 text-xs',
  titolo: 57,
  classeTitolo: 'w-28 text-sm'
};

const GRANDE: Geometria = {
  raggio: 270,
  raggioPallino: 40,
  cerchio: '-left-10 -top-10 w-20 h-20',
  icona: 'w-8 h-8',
  etichetta: 'px-4 py-1.5 text-sm',
  titolo: 95,
  classeTitolo: 'w-40 text-lg'
};

const polare = (gradi: number, raggio: number) => {
  const rad = (gradi * Math.PI) / 180;
  return { x: raggio * Math.cos(rad), y: -raggio * Math.sin(rad) };
};

// Etichetta agganciata al pallino: il punto d'aggancio sta sulla retta dal "+",
// 6px fuori dal bordo del cerchio (raggio del pallino per la scala), e la pillola vi si appoggia con il
// lato (o l'angolo, in diagonale) rivolto verso il pallino. Lo spostamento in % della
// pillola stessa la tiene attaccata qualunque sia la lunghezza del testo.
function agganciaEtichetta(gradi: number, raggioPallino: number, scala: number) {
  const rad = (gradi * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);
  const max = Math.max(Math.abs(dx), Math.abs(dy));
  const punto = polare(gradi, raggioPallino * scala + 6);
  return {
    left: punto.x,
    top: punto.y,
    // `translate` e non `transform`: transform lo gestisce motion per le animazioni.
    translate: `${-50 + 50 * (dx / max)}% ${-50 + 50 * (dy / max)}%`
  };
}

interface Voce {
  id: Principale;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  /** Indice del posto sull'arco (ANGOLI), da 0 = dritto in su. */
  posto: number;
  /** Se presente, il pallino apre il secondo passaggio invece di scegliere subito. */
  sotto?: { tipo: Exclude<TipoDato, null>; label: string; icon: React.ElementType }[];
  tipo?: Exclude<TipoDato, null>;
}

const VOCI: Voce[] = [
  { id: 'entrata', label: 'Entrate', icon: ArrowUpRight, colorClass: 'bg-emerald-600', posto: 0, tipo: 'entrata' },
  {
    id: 'uscita', label: 'Uscite', icon: ArrowDownLeft, colorClass: 'bg-orange-600', posto: 1,
    sotto: [
      { tipo: 'uscita', label: 'Una tantum', icon: Sparkles },
      { tipo: 'usciteRicorrenti', label: 'Ricorrente', icon: Repeat }
    ]
  },
  { id: 'trasferimento', label: 'Trasferimenti', icon: ArrowLeftRight, colorClass: 'bg-blue-600', posto: 2, tipo: 'trasferimento' },
  {
    id: 'investimento', label: 'Investimenti', icon: TrendingUp, colorClass: 'bg-sky-500', posto: 3,
    sotto: [
      { tipo: 'investimentoUnaTantum', label: 'Una tantum', icon: Sparkles },
      { tipo: 'investimentiRicorrenti', label: 'Ricorrente', icon: Repeat }
    ]
  },
  { id: 'consumo', label: 'Consumi', icon: Fuel, colorClass: 'bg-rose-600', posto: 4, tipo: 'consumo' }
];

const MOLLA = { type: 'spring' as const, stiffness: 420, damping: 26 };

function Pallino({ g, label, icon: Icon, colorClass, posto, delay = 0, attivo = false, onClick }: {
  g: Geometria; label: string; icon: React.ElementType; colorClass: string; posto: number;
  delay?: number; attivo?: boolean; onClick: () => void;
}) {
  const gradi = ANGOLI[posto];
  const { x, y } = polare(gradi, g.raggio);
  // Nel secondo passaggio il cerchio del pallino scelto si rimpicciolisce per lasciare
  // la scena alle due sotto-azioni; l'etichetta resta a grandezza normale e lo segue.
  const scala = attivo ? 0.55 : 1;
  const etichetta = agganciaEtichetta(gradi, g.raggioPallino, scala);
  return (
    // Bottone a dimensione zero centrato sul "+": pallino ed etichetta sono
    // posizionati rispetto al suo centro, così tutto parte e rientra dal "+".
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={attivo || undefined}
      className="pallino-nav absolute left-1/2 top-1/2 w-0 h-0 cursor-pointer"
      initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
      animate={{ x, y, scale: 1, opacity: 1 }}
      exit={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
      transition={{ ...MOLLA, delay }}
    >
      <motion.span
        className={`absolute ${g.cerchio} rounded-full ${colorClass} text-white flex items-center justify-center shadow-lg ring-4 ${attivo ? 'pallino-attivo ring-white' : 'ring-white/50 dark:ring-slate-900/60'}`}
        animate={{ scale: scala }}
        transition={MOLLA}
      >
        <Icon className={g.icona} />
      </motion.span>
      <motion.span
        className={`absolute ${g.etichetta} rounded-full bg-black/75 text-white font-bold whitespace-nowrap shadow-lg`}
        style={{ translate: etichetta.translate }}
        initial={false}
        animate={{ left: etichetta.left, top: etichetta.top }}
        transition={MOLLA}
      >
        {label}
      </motion.span>
    </motion.button>
  );
}

export default function AggiungiDatoBubbles({ onScegli, theme, grande = false }: AggiungiDatoBubblesProps) {
  const g = grande ? GRANDE : PICCOLA;
  // Stato condiviso con la barra in basso: aprire Transazioni/Investimenti chiude
  // questi pallini, e mentre quelli sono aperti il "+" sparisce.
  const aperto = useBolleAperte() === 'aggiungi';
  const nascosto = useNascondiAggiunta();
  const [scelta, setScelta] = useState<Principale | null>(null);

  const chiudi = () => {
    if (aperto) setBolleAperte(null);
    setScelta(null);
  };

  // Chiuso da fuori (altro menu aperto): riparte dal primo passaggio.
  useEffect(() => {
    if (!aperto) setScelta(null);
  }, [aperto]);

  // Cambiando pagina il componente sparisce: non lasciare il menu segnato come aperto.
  useEffect(() => () => {
    setBolleAperte(null);
  }, []);

  useEffect(() => {
    if (!aperto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Esc dal secondo passaggio torna ai cinque, dal primo chiude.
      if (scelta) setScelta(null); else chiudi();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aperto, scelta]);

  const scegli = (tipo: Exclude<TipoDato, null>) => {
    chiudi();
    onScegli(tipo);
  };

  const voceScelta = VOCI.find(v => v.id === scelta);

  // In portal su body come FloatingAddButton: le animazioni d'ingresso delle pagine
  // usano transform, che renderebbe il `fixed` relativo alla pagina. Fuori dal
  // contenitore dell'app però si perde la classe glass-theme (tema scuro, App.tsx),
  // che dà ai pallini l'effetto vetro: la si rimette qui.
  return createPortal(
    <div className={theme === 'dark' ? 'glass-theme' : undefined}>
      <AnimatePresence>
        {aperto && (
          <motion.div
            key="velo"
            className="fixed inset-0 z-[55] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={chiudi}
          />
        )}
      </AnimatePresence>

      {/* Su desktop il contenitore prende la misura della pillola con l'etichetta:
          l'arco parte dal suo centro. */}
      <div className={`fixed z-[60] ${grande ? 'right-8 bottom-8' : 'right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] w-14 h-14'}`}>
        <AnimatePresence>
          {/* Titolo dentro l'arco, fra il "+" e i pallini: quello spazio resta libero. */}
          {aperto && (
            <motion.span
              key="titolo"
              aria-hidden="true"
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${g.classeTitolo} text-center font-bold leading-tight text-white drop-shadow pointer-events-none`}
              style={{ left: `calc(50% - ${g.titolo}px)`, top: `calc(50% - ${g.titolo}px)` }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              Aggiungi dato manuale
            </motion.span>
          )}

          {aperto && VOCI.map((v, i) => {
            // Nel secondo passaggio resta solo il pallino scelto (con l'anello bianco).
            if (scelta && scelta !== v.id) return null;
            return (
              <Pallino
                key={v.id}
                g={g}
                label={v.label}
                icon={v.icon}
                colorClass={v.colorClass}
                posto={v.posto}
                delay={scelta ? 0 : i * 0.04}
                attivo={scelta === v.id}
                onClick={() => {
                  if (v.tipo) scegli(v.tipo);
                  else setScelta(s => (s === v.id ? null : v.id));
                }}
              />
            );
          })}

          {aperto && voceScelta?.sotto?.map((s, i) => {
            return (
              <Pallino
                key={`${voceScelta.id}-${s.tipo}`}
                g={g}
                label={s.label}
                icon={s.icon}
                colorClass={voceScelta.colorClass}
                posto={voceScelta.posto + (i === 0 ? -1 : 1)}
                delay={i * 0.04}
                onClick={() => scegli(s.tipo)}
              />
            );
          })}
        </AnimatePresence>

        {/* Il "+" resta piatto come quelli delle altre pagine: blue-600/700 scritti come
            colori arbitrari, che la regola glass .bg-blue-600 di index.css non intercetta. */}
        <button
          type="button"
          onClick={() => (aperto ? chiudi() : setBolleAperte('aggiungi'))}
          aria-label={aperto ? 'Chiudi' : 'Aggiungi Dato'}
          aria-expanded={aperto}
          tabIndex={nascosto ? -1 : undefined}
          aria-hidden={nascosto || undefined}
          className={`relative rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center gap-2 shadow-lg ${grande ? 'px-5 py-3.5 text-sm font-bold' : 'w-14 h-14'} hover:shadow-xl transition-all duration-200 cursor-pointer ${nascosto ? 'scale-0 opacity-0 pointer-events-none' : ''}`}
        >
          <motion.span animate={{ rotate: aperto ? 45 : 0 }} transition={MOLLA} className="flex">
            <Plus className={grande ? 'w-4 h-4' : 'w-6 h-6'} />
          </motion.span>
          {grande && <span>{aperto ? 'Chiudi' : 'Aggiungi Dato'}</span>}
        </button>
      </div>
    </div>,
    document.body
  );
}
