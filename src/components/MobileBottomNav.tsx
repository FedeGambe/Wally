import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  TrendingUp,
  Settings,
  Gauge,
  Percent,
  Landmark,
  PiggyBank
} from 'lucide-react';
import type { InvestimentiTab } from '../pages/Investimenti';

/**
 * Barra di navigazione in basso, solo su telefono (sotto md). Cinque voci:
 * Home, Transazioni, Patrimonio, Investimenti, Impostazioni.
 * "Transazioni" e "Investimenti" non aprono subito una pagina: fanno uscire con
 * un'animazione dei pallini sopra la barra (Entrate/Uscite; Cruscotto, Rendimenti,
 * Conti, Fondo pensione), che si chiudono toccando fuori o con Esc. Per questo su
 * telefono la pagina Investimenti non mostra la sua barra delle schede in alto.
 * Analisi consumi su telefono si apre dall'icona in alto a sinistra (Header) o dalla sua card nella Home.
 */

interface MobileBottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  investimentiTab: InvestimentiTab;
  setInvestimentiTab: (tab: InvestimentiTab) => void;
}

type Gruppo = 'transazioni' | 'investimenti';

interface Pallino {
  id: string;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  /** Spostamento finale rispetto al centro della voce, in px: escono a ventaglio verso l'alto. */
  x: number;
  y: number;
}

const PALLINI: Record<Gruppo, Pallino[]> = {
  transazioni: [
    { id: 'entrate', label: 'Entrate', icon: ArrowUpRight, colorClass: 'bg-emerald-600', x: -40, y: -78 },
    { id: 'uscite', label: 'Uscite', icon: ArrowDownLeft, colorClass: 'bg-orange-600', x: 40, y: -78 }
  ],
  // Investimenti è la 4ª voce, vicino al bordo destro: l'arco è spostato a sinistra
  // per non far uscire dallo schermo il pallino più a destra.
  investimenti: [
    { id: 'cruscotto', label: 'Cruscotto', icon: Gauge, colorClass: 'bg-sky-600', x: -122, y: -76 },
    { id: 'rendimenti', label: 'Rendimenti', icon: Percent, colorClass: 'bg-sky-600', x: -62, y: -136 },
    { id: 'conti', label: 'Conti', icon: Landmark, colorClass: 'bg-sky-600', x: 6, y: -136 },
    { id: 'pensione', label: 'Fondo pensione', icon: PiggyBank, colorClass: 'bg-sky-600', x: 66, y: -76 }
  ]
};

const VOCI: { id: string; label: string; icon: React.ElementType; gruppo?: Gruppo }[] = [
  { id: 'panoramica', label: 'Home', icon: LayoutDashboard },
  { id: 'transazioni', label: 'Transazioni', icon: ArrowLeftRight, gruppo: 'transazioni' },
  { id: 'patrimonio', label: 'Patrimonio', icon: Coins },
  { id: 'investimenti', label: 'Investimenti', icon: TrendingUp, gruppo: 'investimenti' },
  { id: 'impostazioni', label: 'Impostazioni', icon: Settings }
];

// Colore dell'icona della voce attiva, per pagina.
const COLORE_ATTIVO: Record<string, string> = {
  panoramica: 'text-blue-600',
  entrate: 'text-up',
  uscite: 'text-orange-600',
  patrimonio: 'text-amber-500',
  investimenti: 'text-sky-500',
  impostazioni: 'text-accent'
};

export default function MobileBottomNav({ activeView, setActiveView, investimentiTab, setInvestimentiTab }: MobileBottomNavProps) {
  const [aperto, setAperto] = useState<Gruppo | null>(null);

  useEffect(() => {
    if (!aperto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAperto(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aperto]);

  const vai = (view: string) => {
    setAperto(null);
    setActiveView(view);
  };

  const scegliPallino = (gruppo: Gruppo, id: string) => {
    if (gruppo === 'investimenti') {
      setInvestimentiTab(id as InvestimentiTab);
      vai('investimenti');
    } else {
      vai(id);
    }
  };

  // Pagina che la voce rappresenta in questo momento: Transazioni vale per Entrate e Uscite.
  const paginaDellaVoce = (id: string) =>
    id === 'transazioni' ? (activeView === 'entrate' || activeView === 'uscite' ? activeView : null)
      : activeView === id ? id : null;

  const isPallinoAttivo = (gruppo: Gruppo, id: string) =>
    gruppo === 'investimenti' ? activeView === 'investimenti' && investimentiTab === id : activeView === id;

  return (
    <>
      {/* Velo per chiudere i pallini toccando fuori: sta fuori dalla barra perché il
          backdrop-filter della barra renderebbe il `fixed` relativo a lei. */}
      <AnimatePresence>
        {aperto && (
          <motion.div
            key="velo"
            className="md:hidden fixed inset-0 z-40 bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setAperto(null)}
          />
        )}
      </AnimatePresence>

      <nav
        aria-label="Navigazione principale"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-hairline flex justify-around items-center pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-2 select-none shadow-lg"
      >
        {VOCI.map((item) => {
          const Icon = item.icon;
          const gruppo = item.gruppo;
          const isOpen = gruppo !== undefined && aperto === gruppo;
          const pagina = paginaDellaVoce(item.id);
          const isActive = pagina !== null;
          const iconClass = isOpen ? 'text-ink' : isActive ? COLORE_ATTIVO[pagina] : 'text-ink-soft';

          return (
            <div key={item.id} className="relative flex-1 flex justify-center">
              {gruppo && (
                <AnimatePresence>
                  {isOpen && PALLINI[gruppo].map((p, i) => {
                    const PIcon = p.icon;
                    const attivo = isPallinoAttivo(gruppo, p.id);
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        onClick={() => scegliPallino(gruppo, p.id)}
                        aria-label={p.label}
                        aria-current={attivo ? 'page' : undefined}
                        className="pallino-nav absolute left-1/2 top-0 -ml-10 w-20 flex flex-col items-center cursor-pointer"
                        initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                        animate={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                        exit={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26, delay: i * 0.04 }}
                      >
                        <span className={`w-14 h-14 rounded-full ${p.colorClass} text-white flex items-center justify-center shadow-lg ring-4 ${attivo ? 'ring-white' : 'ring-white/50 dark:ring-slate-900/60'}`}>
                          <PIcon className="w-6 h-6" />
                        </span>
                        <span className="mt-1 text-2xs font-bold text-white text-center leading-tight drop-shadow">{p.label}</span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              )}

              <button
                type="button"
                onClick={() => (gruppo ? setAperto(a => (a === gruppo ? null : gruppo)) : vai(item.id))}
                aria-current={!gruppo && isActive ? 'page' : undefined}
                aria-expanded={gruppo ? isOpen : undefined}
                className="flex flex-col items-center justify-center w-full py-1 cursor-pointer transition-all"
              >
                <motion.span
                  animate={gruppo ? { rotate: isOpen ? 90 : 0 } : undefined}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  className="flex"
                >
                  <Icon className={`w-5 h-5 ${iconClass}`} />
                </motion.span>
                <span className={`text-3xs mt-0.5 tracking-tighter ${isActive ? 'text-ink font-extrabold' : 'text-ink-soft'}`}>
                  {item.label}
                </span>
              </button>
            </div>
          );
        })}
      </nav>
    </>
  );
}
