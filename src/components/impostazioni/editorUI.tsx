import React, { createContext, useContext, useEffect, useState } from 'react';
import { ChevronRight, Plus, Trash2, Check } from 'lucide-react';

/**
 * Pezzi comuni degli editor di Impostazioni (Dati Base e Preset Ricorrenti),
 * tutti con lo stesso schema dentro un popup centrato: lista delle voci →
 * tocchi una voce (o "Aggiungi") → scheda di modifica nello stesso popup, con
 * la freccia "indietro" del popup per tornare alla lista.
 */

// ---------------------------------------------------------------------------
// Scheda aperta: l'editor dice al popup che titolo mostrare e cosa fa la
// freccia "indietro" (il popup è del componente padre, l'editor è dentro).

export interface SchedaAperta {
  titolo: string;
  indietro: () => void;
}

const SchedaContext = createContext<(s: SchedaAperta | null) => void>(() => {});

export const SchedaProvider = SchedaContext.Provider;

/** Registra la scheda aperta nel popup finché `titolo` non è null. */
export function useScheda(titolo: string | null, indietro: () => void) {
  const setScheda = useContext(SchedaContext);
  useEffect(() => {
    setScheda(titolo ? { titolo, indietro } : null);
    return () => setScheda(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titolo]);
}

// ---------------------------------------------------------------------------
// Lista

export function IntroEditor({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-ink-soft dark:text-slate-400 mb-5 leading-relaxed">{children}</p>;
}

export function TitoloGruppo({ children }: { children: React.ReactNode }) {
  return <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold mb-2 mt-1">{children}</p>;
}

interface VoceRigaProps {
  titolo: React.ReactNode;
  sottotitolo?: React.ReactNode;
  valore?: React.ReactNode;
  icona?: React.ReactNode;
  onClick: () => void;
}

/** Una voce della lista: tutta cliccabile, apre la sua scheda. */
export function VoceRiga({ titolo, sottotitolo, valore, icona, onClick }: VoceRigaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-canvas dark:bg-white/5 hover:bg-hairline/60 dark:hover:bg-white/10 transition-colors cursor-pointer text-left group"
    >
      {icona && <span className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shrink-0 text-base">{icona}</span>}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-ink dark:text-slate-100 truncate">{titolo}</span>
        {sottotitolo && <span className="block text-2xs text-ink-soft truncate mt-0.5">{sottotitolo}</span>}
      </span>
      {valore && <span className="text-sm font-semibold text-ink dark:text-slate-200 tabular-nums shrink-0">{valore}</span>}
      <ChevronRight className="w-4 h-4 text-ink-soft group-hover:text-ink dark:group-hover:text-slate-200 shrink-0 transition-colors" />
    </button>
  );
}

export function ListaVoci({ children, vuota }: { children: React.ReactNode; vuota?: string }) {
  const elementi = React.Children.toArray(children).filter(Boolean);
  if (elementi.length === 0) {
    return <p className="text-xs text-ink-soft text-center py-6">{vuota ?? 'Nessuna voce ancora.'}</p>;
  }
  return <div className="space-y-2">{elementi}</div>;
}

export function AggiungiVoce({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-3 flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-dashed border-hairline dark:border-white/15 text-sm font-bold text-accent hover:bg-accent/10 hover:border-accent/40 transition-colors cursor-pointer"
    >
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Scheda di modifica

export const inputEditorClass =
  'w-full px-3 py-2.5 rounded-xl text-sm bg-canvas dark:bg-white/5 dark:text-slate-100 border border-transparent focus:outline-hidden focus:ring-2 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export function Campo({ label, nota, children }: { label: string; nota?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-2xs font-bold text-ink-soft uppercase mb-1.5 tracking-wider">{label}</label>
      {children}
      {nota && <p className="text-2xs text-ink-soft mt-1.5 leading-relaxed">{nota}</p>}
    </div>
  );
}

interface AzioniSchedaProps {
  onSalva: () => void;
  salvaAbilitato: boolean;
  /** Assente per una voce nuova (non c'è niente da eliminare). */
  onElimina?: () => void;
  etichettaSalva?: string;
}

/**
 * "Salva" e, per una voce esistente, "Elimina" con conferma dentro il popup
 * (secondo tocco su "Conferma eliminazione") invece del window.confirm del
 * browser.
 */
export function AzioniScheda({ onSalva, salvaAbilitato, onElimina, etichettaSalva = 'Salva' }: AzioniSchedaProps) {
  const [confermaElimina, setConfermaElimina] = useState(false);
  return (
    <div className="flex items-center gap-2 pt-2">
      {onElimina && (
        <button
          type="button"
          onClick={() => (confermaElimina ? onElimina() : setConfermaElimina(true))}
          onBlur={() => setConfermaElimina(false)}
          className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
            confermaElimina ? 'bg-down text-white' : 'text-down hover:bg-down/10'
          }`}
        >
          <Trash2 className="w-4 h-4" /> {confermaElimina ? 'Conferma eliminazione' : 'Elimina'}
        </button>
      )}
      <button
        type="button"
        onClick={onSalva}
        disabled={!salvaAbilitato}
        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
      >
        <Check className="w-4 h-4" /> {etichettaSalva}
      </button>
    </div>
  );
}

export function ErroreEditor({ errore }: { errore: string | null }) {
  return errore ? <p className="text-xs text-down font-semibold mt-3">{errore}</p> : null;
}

/** Stato "quale voce è aperta" comune a tutti gli editor: null = lista, 'nuova' = scheda vuota. */
export function useVoceAperta<K>() {
  return useState<K | 'nuova' | null>(null);
}
