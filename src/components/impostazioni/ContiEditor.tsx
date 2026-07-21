import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';

/** Editor "Conti" (dentro il popup fullscreen di Impostazioni → Dati Base). */
export default function ContiEditor() {
  const { conti, updateDatiBase, error } = useDatiBase();
  const [newConto, setNewConto] = useState('');

  const addConto = () => {
    const nome = newConto.trim();
    if (!nome || conti.includes(nome)) return;
    updateDatiBase({ conti: [...conti, nome] });
    setNewConto('');
  };
  const removeConto = (nome: string) => updateDatiBase({ conti: conti.filter(c => c !== nome) });

  return (
    <div>
      <p className="text-xs text-ink-soft dark:text-slate-400 mb-5 leading-relaxed">
        Conti usati nei dropdown dei form "Aggiungi" (Uscita, Entrata, Trasferimento).
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {conti.map(c => (
          <span key={c} className="inline-flex items-center gap-1.5 bg-canvas dark:bg-white/5 border border-hairline dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft dark:text-slate-300">
            {c}
            <button onClick={() => removeConto(c)} className="text-ink-soft hover:text-down cursor-pointer" aria-label={`Rimuovi conto ${c}`}>
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
        {conti.length === 0 && <p className="text-xs text-ink-soft">Nessun conto ancora.</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={newConto}
          onChange={e => setNewConto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addConto()}
          placeholder="Nuovo conto..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={addConto} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer font-bold text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>
      {error && <p className="text-xs text-down font-semibold mt-3">{error}</p>}
    </div>
  );
}
