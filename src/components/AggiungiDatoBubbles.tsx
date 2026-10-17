import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, Sparkles, Repeat, Fuel } from 'lucide-react';
import type { TipoDato } from './AggiungiDatoModal';
import { useBolleAperte, setBolleAperte, useNascondiAggiunta } from '../hooks/useBolleAperte';

/**
 * Bottone "+" della Home su telefono: al posto del popup con la griglia dei tipi,
 * fa uscire su un quarto di cerchio attorno a sé (stessi pallini vetro della barra
 * in basso) cinque pallini: Entrate, Uscite, Trasferimenti, Investimenti, Consumi.
 * L'etichetta di ogni pallino sta all'esterno dell'arco, sulla retta che va dal "+"
 * al pallino: messa sotto finiva sotto il pallino successivo.
 * Uscite e Investimenti hanno un secondo passaggio: gli altri spariscono e ai due
 * posti accanto al pallino scelto, sullo stesso arco, escono "Una tantum" e "Ricorrente".
 * Scelto il tipo, chiama `onScegli` e Panoramica apre AggiungiDatoModal
 * direttamente sul form giusto. Toccando fuori, Esc o di nuovo il "+" si chiude;
 * toccando il pallino già scelto si torna ai cinque.
 */

interface AggiungiDatoBubblesProps {
  onScegli: (tipo: Exclude<TipoDato, null>) => void;
  theme: 'dark' | 'light';
}

type Principale = 'entrata' | 'uscita' | 'trasferimento' | 'investimento' | 'consumo';

// Cinque posti sull'arco, da dritto in su (90°) a dritto a sinistra (180°), a
// RAGGIO px dal centro del "+": con pallini da 56px restano ~10px fra uno e l'altro.
const RAGGIO = 170;
const ANGOLI = [90, 112.5, 135, 157.5, 180];

const polare = (gradi: number, raggio: number) => {
  const rad = (gradi * Math.PI) / 180;
  return { x: raggio * Math.cos(rad), y: -raggio * Math.sin(rad) };
};

// Etichetta agganciata al pallino: il punto d'aggancio sta sulla retta dal "+",
// 6px fuori dal bordo del cerchio (raggio 28 per la scala), e la pillola vi si appoggia con il
// lato (o l'angolo, in diagonale) rivolto verso il pallino. Lo spostamento in % della
// pillola stessa la tiene attaccata qualunque sia la lunghezza del testo.
function agganciaEtichetta(gradi: number, scala: number) {
  const rad = (gradi * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);
  const max = Math.max(Math.abs(dx), Math.abs(dy));
  const punto = polare(gradi, 28 * scala + 6);
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

function Pallino({ label, icon: Icon, colorClass, posto, delay = 0, attivo = false, onClick }: {
  label: string; icon: React.ElementType; colorClass: string; posto: number;
  delay?: number; attivo?: boolean; onClick: () => void;
}) {
  const gradi = ANGOLI[posto];
  const { x, y } = polare(gradi, RAGGIO);
  // Nel secondo passaggio il cerchio del pallino scelto si rimpicciolisce per lasciare
  // la scena alle due sotto-azioni; l'etichetta resta a grandezza normale e lo segue.
  const scala = attivo ? 0.55 : 1;
  const etichetta = agganciaEtichetta(gradi, scala);
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
        className={`absolute -left-7 -top-7 w-14 h-14 rounded-full ${colorClass} text-white flex items-center justify-center shadow-lg ring-4 ${attivo ? 'pallino-attivo ring-white' : 'ring-white/50 dark:ring-slate-900/60'}`}
        animate={{ scale: scala }}
        transition={MOLLA}
      >
        <Icon className="w-6 h-6" />
      </motion.span>
      <motion.span
        className="absolute px-3 py-1 rounded-full bg-black/75 text-white text-xs font-bold whitespace-nowrap shadow-lg"
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

export default function AggiungiDatoBubbles({ onScegli, theme }: AggiungiDatoBubblesProps) {
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

      <div className="fixed z-[60] right-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] w-14 h-14">
        <AnimatePresence>
          {/* Titolo dentro l'arco, fra il "+" e i pallini: quello spazio resta libero. */}
          {aperto && (
            <motion.span
              key="titolo"
              aria-hidden="true"
              className="absolute -translate-x-1/2 -translate-y-1/2 w-28 text-center text-sm font-bold leading-tight text-white drop-shadow pointer-events-none"
              style={{ left: 'calc(50% - 57px)', top: 'calc(50% - 57px)' }}
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
          className={`relative w-14 h-14 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer ${nascosto ? 'scale-0 opacity-0 pointer-events-none' : ''}`}
        >
          <motion.span animate={{ rotate: aperto ? 45 : 0 }} transition={MOLLA} className="flex">
            <Plus className="w-6 h-6" />
          </motion.span>
        </button>
      </div>
    </div>,
    document.body
  );
}
