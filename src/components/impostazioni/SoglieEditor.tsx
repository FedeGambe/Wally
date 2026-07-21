import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';

/** Editor "Soglie" (dentro il popup fullscreen di Impostazioni → Dati Base). */
export default function SoglieEditor() {
  const { soglie = [], updateDatiBase, error } = useDatiBase();
  const [nuovaCategoria, setNuovaCategoria] = useState('');

  const setPercentuale = (categoria: string, percentuale: number) => {
    updateDatiBase({ soglie: soglie.map(s => s.categoria === categoria ? { ...s, percentuale } : s) });
  };
  const removeSoglia = (categoria: string) => updateDatiBase({ soglie: soglie.filter(s => s.categoria !== categoria) });
  const addSoglia = () => {
    const categoria = nuovaCategoria.trim();
    if (!categoria || soglie.some(s => s.categoria === categoria)) return;
    updateDatiBase({ soglie: [...soglie, { categoria, percentuale: 0 }] });
    setNuovaCategoria('');
  };

  const totale = soglie.reduce((sum, s) => sum + (s.percentuale || 0), 0);

  return (
    <div>
      <p className="text-xs text-ink-soft dark:text-slate-400 mb-5 leading-relaxed">
        Target % di allocazione del reddito (Spese Primarie, Spese Secondarie, Risparmio, Investimenti...). Dovrebbero sommare a 100%.
      </p>
      <div className="space-y-2 mb-4">
        {soglie.map(s => (
          <div key={s.categoria} className="flex items-center gap-2">
            <span className="flex-1 text-sm font-semibold text-ink-soft dark:text-slate-300">{s.categoria}</span>
            <input
              type="number"
              value={s.percentuale}
              onChange={e => setPercentuale(s.categoria, parseFloat(e.target.value) || 0)}
              className="w-20 px-3 py-1.5 rounded-lg text-sm text-right border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
            <span className="text-xs text-ink-soft w-4">%</span>
            <button onClick={() => removeSoglia(s.categoria)} className="text-ink-soft hover:text-down cursor-pointer" aria-label={`Rimuovi soglia ${s.categoria}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {soglie.length === 0 && <p className="text-xs text-ink-soft">Nessuna soglia ancora.</p>}
      </div>

      <p className={`text-xs font-semibold mb-4 ${totale === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
        Totale: {totale}% {totale !== 100 && '(dovrebbe essere 100%)'}
      </p>

      <div className="flex gap-2">
        <input
          value={nuovaCategoria}
          onChange={e => setNuovaCategoria(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSoglia()}
          placeholder="Nuova categoria..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
        />
        <button onClick={addSoglia} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer font-bold text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>
      {error && <p className="text-xs text-down font-semibold mt-3">{error}</p>}
    </div>
  );
}
