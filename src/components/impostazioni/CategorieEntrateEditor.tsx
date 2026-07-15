import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';

/** Editor "Categorie Entrate" (dentro il popup fullscreen di Impostazioni → Dati Base). */
export default function CategorieEntrateEditor() {
  const { categorieEntrate, updateDatiBase } = useDatiBase();
  const [newCategoria, setNewCategoria] = useState('');

  const addCategoria = () => {
    const nome = newCategoria.trim();
    if (!nome || categorieEntrate.includes(nome)) return;
    updateDatiBase({ categorieEntrate: [...categorieEntrate, nome] });
    setNewCategoria('');
  };
  const removeCategoria = (nome: string) =>
    updateDatiBase({ categorieEntrate: categorieEntrate.filter(c => c !== nome) });

  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Categorie usate nel form "Aggiungi Entrata" (es. Stipendio, Dividendi...).
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {categorieEntrate.map(c => (
          <span key={c} className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {c}
            <button onClick={() => removeCategoria(c)} className="text-emerald-400 hover:text-rose-600 cursor-pointer" aria-label={`Rimuovi categoria ${c}`}>
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
        {categorieEntrate.length === 0 && <p className="text-xs text-slate-400">Nessuna categoria ancora.</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={newCategoria}
          onChange={e => setNewCategoria(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategoria()}
          placeholder="Nuova categoria..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        />
        <button onClick={addCategoria} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer font-bold text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>
    </div>
  );
}
