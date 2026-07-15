import React, { useState } from 'react';
import { Trash2, Plus, Wallet, Tags, ArrowDownCircle } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';

/**
 * Card "Dati Base" di Impostazioni: conti, categorie Entrate e macro/sotto
 * categorie Uscite usati nei form "Aggiungi ...". Editabile qui invece che
 * sul foglio Google — vedi src/data/datiBase.ts per il layer di persistenza.
 */
export default function DatiBaseSettings() {
  const { conti, macroCategorieUscite, categorieEntrate, updateDatiBase } = useDatiBase();

  // --- Conti ---
  const [newConto, setNewConto] = useState('');
  const addConto = () => {
    const nome = newConto.trim();
    if (!nome || conti.includes(nome)) return;
    updateDatiBase({ conti: [...conti, nome] });
    setNewConto('');
  };
  const removeConto = (nome: string) => updateDatiBase({ conti: conti.filter(c => c !== nome) });

  // --- Categorie Entrate ---
  const [newCategoriaEntrata, setNewCategoriaEntrata] = useState('');
  const addCategoriaEntrata = () => {
    const nome = newCategoriaEntrata.trim();
    if (!nome || categorieEntrate.includes(nome)) return;
    updateDatiBase({ categorieEntrate: [...categorieEntrate, nome] });
    setNewCategoriaEntrata('');
  };
  const removeCategoriaEntrata = (nome: string) =>
    updateDatiBase({ categorieEntrate: categorieEntrate.filter(c => c !== nome) });

  // --- Categorie Uscite (macro + sotto-categorie) ---
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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Tags className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-lg font-display text-slate-800">Dati Base</h3>
      </div>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
        Conti e categorie usati nei form "Aggiungi" di Entrate/Uscite. Modificabili qui, non serve più toccare il foglio Google.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conti */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Conti
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {conti.map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600">
                {c}
                <button onClick={() => removeConto(c)} className="text-slate-400 hover:text-rose-600 cursor-pointer" aria-label={`Rimuovi conto ${c}`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newConto}
              onChange={e => setNewConto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addConto()}
              placeholder="Nuovo conto..."
              className="flex-1 px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={addConto} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categorie Entrate */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ArrowDownCircle className="w-3.5 h-3.5" /> Categorie Entrate
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {categorieEntrate.map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {c}
                <button onClick={() => removeCategoriaEntrata(c)} className="text-emerald-400 hover:text-rose-600 cursor-pointer" aria-label={`Rimuovi categoria ${c}`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newCategoriaEntrata}
              onChange={e => setNewCategoriaEntrata(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategoriaEntrata()}
              placeholder="Nuova categoria..."
              className="flex-1 px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <button onClick={addCategoriaEntrata} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Categorie Uscite (macro + sotto) */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Tags className="w-3.5 h-3.5" /> Categorie Uscite
        </h4>
        <div className="space-y-3">
          {macroCategorieUscite.map(macro => (
            <div key={macro.nome} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <span>{macro.icon}</span> {macro.nome}
                </span>
                <button onClick={() => removeMacro(macro.nome)} className="text-slate-400 hover:text-rose-600 cursor-pointer" aria-label={`Rimuovi macro categoria ${macro.nome}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {macro.categorie.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {cat}
                    <button onClick={() => removeSottoCategoria(macro.nome, cat)} className="text-slate-400 hover:text-rose-600 cursor-pointer" aria-label={`Rimuovi categoria ${cat}`}>
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={newSottoCategoria[macro.nome] || ''}
                  onChange={e => setNewSottoCategoria(prev => ({ ...prev, [macro.nome]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addSottoCategoria(macro.nome)}
                  placeholder="Nuova sotto-categoria..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={() => addSottoCategoria(macro.nome)} className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <input
            value={newMacroIcon}
            onChange={e => setNewMacroIcon(e.target.value)}
            placeholder="Icona"
            className="w-16 px-2 py-2 rounded-xl text-center text-sm border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            maxLength={4}
          />
          <input
            value={newMacroNome}
            onChange={e => setNewMacroNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMacro()}
            placeholder="Nuova macro categoria..."
            className="flex-1 px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={addMacro} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
