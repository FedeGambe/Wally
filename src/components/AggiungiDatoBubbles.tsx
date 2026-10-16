import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, Sparkles, Repeat, Fuel } from 'lucide-react';
import type { TipoDato } from './AggiungiDatoModal';
import { useBolleAperte, setBolleAperte, useNascondiAggiunta } from '../hooks/useBolleAperte';

/**
 * Bottone "+" della Home su telefono: al posto del popup con la griglia dei tipi,
 * fa uscire in colonna sopra di sé (stessi pallini vetro della barra in basso)
 * cinque pallini, con l'etichetta in una pillola a sinistra: Entrate, Uscite,
 * Trasferimenti, Investimenti, Consumi. In colonna, e non a ventaglio, perché
 * sull'arco l'etichetta sotto un pallino finiva sotto il pallino successivo.
 * Uscite e Investimenti hanno un secondo passaggio: gli altri spariscono e subito
 * sopra il pallino scelto escono "Una tantum" e "Ricorrente".
 * Scelto il tipo, chiama `onScegli` e Panoramica apre AggiungiDatoModal
 * direttamente sul form giusto. Toccando fuori, Esc o di nuovo il "+" si chiude;
 * toccando il pallino già scelto si torna ai cinque.
 */

interface AggiungiDatoBubblesProps {
  onScegli: (tipo: Exclude<TipoDato, null>) => void;
  theme: 'dark' | 'light';
}

type Principale = 'entrata' | 'uscita' | 'trasferimento' | 'investimento' | 'consumo';

// Distanza verticale fra un posto della colonna e il successivo (pallino 56px + spazio).
const PASSO = 66;
const posto = (n: number) => -n * PASSO;

interface Voce {
  id: Principale;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  /** Posto nella colonna sopra il "+", contando da 1 (il più vicino). */
  posto: number;
  /** Se presente, il pallino apre il secondo passaggio invece di scegliere subito. */
  sotto?: { tipo: Exclude<TipoDato, null>; label: string; icon: React.ElementType }[];
  tipo?: Exclude<TipoDato, null>;
}

const VOCI: Voce[] = [
  { id: 'entrata', label: 'Entrate', icon: ArrowUpRight, colorClass: 'bg-emerald-600', posto: 1, tipo: 'entrata' },
  {
    id: 'uscita', label: 'Uscite', icon: ArrowDownLeft, colorClass: 'bg-orange-600', posto: 2,
    sotto: [
      { tipo: 'uscita', label: 'Una tantum', icon: Sparkles },
      { tipo: 'usciteRicorrenti', label: 'Ricorrente', icon: Repeat }
    ]
  },
  { id: 'trasferimento', label: 'Trasferimenti', icon: ArrowLeftRight, colorClass: 'bg-blue-600', posto: 3, tipo: 'trasferimento' },
  {
    id: 'investimento', label: 'Investimenti', icon: TrendingUp, colorClass: 'bg-sky-500', posto: 4,
    sotto: [
      { tipo: 'investimentoUnaTantum', label: 'Una tantum', icon: Sparkles },
      { tipo: 'investimentiRicorrenti', label: 'Ricorrente', icon: Repeat }
    ]
  },
  { id: 'consumo', label: 'Consumi', icon: Fuel, colorClass: 'bg-rose-600', posto: 5, tipo: 'consumo' }
];

const MOLLA = { type: 'spring' as const, stiffness: 420, damping: 26 };

function Pallino({ label, icon: Icon, colorClass, y, delay = 0, attivo = false, onClick }: {
  label: string; icon: React.ElementType; colorClass: string; y: number;
  delay?: number; attivo?: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={attivo || undefined}
      className="pallino-nav absolute right-0 top-0 flex items-center gap-3 cursor-pointer"
      style={{ transformOrigin: 'right center' }}
      initial={{ y: 0, scale: 0.3, opacity: 0 }}
      animate={{ y, scale: 1, opacity: 1 }}
      exit={{ y: 0, scale: 0.3, opacity: 0 }}
      transition={{ ...MOLLA, delay }}
    >
      <span className="px-3 py-1 rounded-full bg-black/75 text-white text-xs font-bold whitespace-nowrap shadow-lg">{label}</span>
      <span className={`w-14 h-14 shrink-0 rounded-full ${colorClass} text-white flex items-center justify-center shadow-lg ring-4 ${attivo ? 'pallino-attivo ring-white' : 'ring-white/50 dark:ring-slate-900/60'}`}>
        <Icon className="w-6 h-6" />
      </span>
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

      <div className="fixed z-[60] right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] w-14 h-14">
        <AnimatePresence>
          {aperto && VOCI.map((v, i) => {
            // Nel secondo passaggio resta solo il pallino scelto (con l'anello bianco).
            if (scelta && scelta !== v.id) return null;
            return (
              <Pallino
                key={v.id}
                label={v.label}
                icon={v.icon}
                colorClass={v.colorClass}
                y={posto(v.posto)}
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
                y={posto(voceScelta.posto + 1 + i)}
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
