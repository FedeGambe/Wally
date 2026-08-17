import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';

/** Editor "Categorie Uscite" (macro + sotto-categorie), dentro il popup
 * fullscreen di Impostazioni → Dati Base. */
export default function CategorieUsciteEditor() {
  const { macroCategorieUscite, updateDatiBase, error } = useDatiBase();

  const [newMacroNome, setNewMacroNome] = useState('');
  const [newMacroIcon, setNewMacroIcon] = useState('💸');
  const addMacro = () => {
    const nome = newMacroNome.trim();
    if (!nome || macroCategorieUscite.some(m => m.nome === nome)) return;
    updateDatiBase({
      macroCategorieUscite: [...macroCategorieUscite, { nome, icon: newMacroIcon.trim() || '💸', categorie: [] }]
    });
    setNewMacroNome('');
    setNewMacroIcon('💸');
  };
  const removeMacro = (nome: string) =>
    updateDatiBase({ macroCategorieUscite: macroCategorieUscite.filter(m => m.nome !== nome) });

  const [newSottoCategoria, setNewSottoCategoria] = useState<Record<string, string>>({});
  const addSottoCategoria = (macroNome: string) => {
    const nome = (newSottoCategoria[macroNome] || '').trim();
    if (!nome) return;
    updateDatiBase({
      macroCategorieUscite: macroCategorieUscite.map(m =>
        m.nome === macroNome && !m.categorie.includes(nome)
          ? { ...m, categorie: [...m.categorie, nome] }
          : m
      )
    });
    setNewSottoCategoria(prev => ({ ...prev, [macroNome]: '' }));
  };
  const removeSottoCategoria = (macroNome: string, categoria: string) =>
    updateDatiBase({
      macroCategorieUscite: macroCategorieUscite.map(m =>
        m.nome === macroNome ? { ...m, categorie: m.categorie.filter(c => c !== categoria) } : m
      )
    });

  return (
    <div>
      <p className="text-xs text-ink-soft dark:text-slate-400 mb-5 leading-relaxed">
        Macro categorie e relative sotto-categorie usate nel form "Aggiungi Uscita". Una macro
        senza sotto-categorie (es. Istruzione, Regalo) diventa "inserimento libero" nel form.
      </p>

      <div className="space-y-3 mb-5">
        {macroCategorieUscite.map(macro => (
          <div key={macro.nome} className="p-4 rounded-2xl border border-hairline dark:border-white/10 bg-canvas/60 dark:bg-white/5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-bold text-ink dark:text-slate-200 flex items-center gap-1.5">
                <span>{macro.icon}</span> {macro.nome}
              </span>
              <button onClick={() => removeMacro(macro.nome)} className="text-ink-soft hover:text-down cursor-pointer" aria-label={`Rimuovi macro categoria ${macro.nome}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {macro.categorie.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 bg-white dark:bg-white/10 border border-hairline dark:border-white/10 rounded-md px-2 py-0.5 text-2xs font-medium text-ink-soft dark:text-slate-300">
                  {cat}
                  <button onClick={() => removeSottoCategoria(macro.nome, cat)} className="text-ink-soft hover:text-down cursor-pointer" aria-label={`Rimuovi categoria ${cat}`}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              {macro.categorie.length === 0 && <span className="text-2xs text-ink-soft italic">Inserimento libero (nessuna sotto-categoria)</span>}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newSottoCategoria[macro.nome] || ''}
                onChange={e => setNewSottoCategoria(prev => ({ ...prev, [macro.nome]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addSottoCategoria(macro.nome)}
                placeholder="Nuova sotto-categoria..."
                className="flex-1 px-2.5 py-1.5 rounded-lg text-2xs border border-hairline dark:border-white/10 bg-white dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={() => addSottoCategoria(macro.nome)} className="px-2.5 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-ink-soft dark:text-slate-300 rounded-lg cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {macroCategorieUscite.length === 0 && <p className="text-xs text-ink-soft">Nessuna macro categoria ancora.</p>}
      </div>

      <div className="flex gap-2 pt-4 border-t border-hairline dark:border-white/10">
        <input
          value={newMacroIcon}
          onChange={e => setNewMacroIcon(e.target.value)}
          placeholder="Icona"
          className="w-16 px-2 py-2.5 rounded-xl text-center text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          maxLength={4}
        />
        <input
          value={newMacroNome}
          onChange={e => setNewMacroNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMacro()}
          placeholder="Nuova macro categoria..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={addMacro} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer font-bold text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>
      {error && <p className="text-xs text-down font-semibold mt-3">{error}</p>}
    </div>
  );
}
