import React from 'react';
import { TriangleAlert, ChevronRight } from 'lucide-react';
import { formatEuro } from '../../utils/format';
import type { SpesaFuoriNorma } from '../../utils/speseFuoriNorma';

/**
 * Card "Fuori dal normale" della pagina Uscite: le categorie del mese in cui
 * si è speso molto più del solito (regole in utils/speseFuoriNorma.ts).
 * Toccare una riga filtra torte e archivio su quella categoria. Se non c'è
 * niente di strano resta una riga sottile, per non occupare spazio.
 */
interface Props {
  spese: SpesaFuoriNorma[];
  /** "ottobre 2026" */
  periodo: string;
  categoriaScelta: string;
  onScegli: (s: SpesaFuoriNorma) => void;
}

const MOVIMENTI_MOSTRATI = 3;

function spiegazione(s: SpesaFuoriNorma): string {
  if (s.tipo === 'ricorrente') return `di solito ${formatEuro(s.riferimento)} al mese`;
  if (s.riferimento <= 0) return 'nessuna spesa nei 12 mesi prima';
  return `spesa saltuaria: al massimo ${formatEuro(s.riferimento)} in un mese, negli ultimi 12`;
}

export default function SpeseFuoriNormaCard({ spese, periodo, categoriaScelta, onScegli }: Props) {
  if (spese.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-ink-soft px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
        Niente fuori dal normale a {periodo}: ogni categoria è nella sua norma degli ultimi 12 mesi.
      </p>
    );
  }

  return (
    <section className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left" aria-labelledby="fuori-norma-titolo">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <TriangleAlert className="w-[18px] h-[18px] text-orange-600" />
        </div>
        <div>
          <h2 id="fuori-norma-titolo" className="font-bold text-ink font-display text-base">Fuori dal normale</h2>
          <p className="text-xs text-ink-soft mt-0.5">
            Categorie di {periodo} con una spesa molto sopra i 12 mesi prima. Tocca per filtrare l'archivio.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {spese.map(s => {
          const scelta = categoriaScelta === s.categoria;
          const altri = s.movimenti.length - MOVIMENTI_MOSTRATI;
          return (
            <li key={`${s.macroCategoria}/${s.categoria}`}>
              <button
                type="button"
                onClick={() => onScegli(s)}
                aria-pressed={scelta}
                className={`w-full text-left rounded-2xl px-4 py-3 transition cursor-pointer border ${
                  scelta ? 'bg-orange-500/10 border-orange-500/30' : 'bg-canvas border-transparent hover:border-orange-500/25'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-ink">{s.categoria}</span>
                    <span className="text-3xs text-ink-soft ml-1.5 uppercase tracking-wider">{s.macroCategoria}</span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="font-bold text-sm text-ink tabular-nums">{formatEuro(s.importo)}</span>
                    <span className="text-3xs font-extrabold text-down bg-rose-500/10 px-1.5 py-0.5 rounded-md tabular-nums">
                      +{formatEuro(s.differenza)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-soft self-center" aria-hidden />
                  </div>
                </div>
                <p className="text-xs text-ink-soft mt-0.5">{spiegazione(s)}</p>
                <p className="text-xs text-ink-soft mt-1.5 truncate">
                  {s.movimenti.slice(0, MOVIMENTI_MOSTRATI).map(t =>
                    `${t.descrizione || 'Senza descrizione'} ${formatEuro(t.importo)}`).join(' · ')}
                  {altri > 0 && ` · e altri ${altri}`}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
