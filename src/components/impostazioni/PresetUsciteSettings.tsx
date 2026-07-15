import React, { useState } from 'react';
import { Trash2, Plus, Repeat } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { formatEuro } from '../../utils/format';
import type { PresetUscita } from '../../data/datiBase';

const emptyForm = { nome: '', macroCategoria: '', categoria: '', conto: '', importo: '', descrizione: '', primaria: false };

/**
 * Card "Preset Uscite Ricorrenti" (Fase 2 del piano): template per uscite
 * quasi identiche ogni mese (es. accantonamento). Usati da AggiungiUscitaForm
 * per precompilare il form — non inseriscono nulla da soli.
 */
export default function PresetUsciteSettings() {
  const { presetUscite, macroCategorieUscite, conti, updateDatiBase } = useDatiBase();
  const [form, setForm] = useState(emptyForm);

  const macroSelezionata = macroCategorieUscite.find(m => m.nome === form.macroCategoria);
  const categorieDisponibili = macroSelezionata?.categorie || [];

  const isValid = form.nome.trim() && form.macroCategoria && form.categoria && form.conto && Number(form.importo) > 0;

  const addPreset = () => {
    if (!isValid) return;
    const nuovo: PresetUscita = {
      id: `preset-${Date.now()}`,
      nome: form.nome.trim(),
      macroCategoria: form.macroCategoria,
      categoria: form.categoria,
      conto: form.conto,
      importo: Number(form.importo),
      descrizione: form.descrizione.trim() || form.nome.trim(),
      primaria: form.primaria
    };
    updateDatiBase({ presetUscite: [...presetUscite, nuovo] });
    setForm(emptyForm);
  };

  const removePreset = (id: string) => updateDatiBase({ presetUscite: presetUscite.filter(p => p.id !== id) });

  const inputClass = "px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500";

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Repeat className="w-5 h-5 text-orange-600" />
        <h3 className="font-bold text-lg font-display text-slate-800">Preset Uscite Ricorrenti</h3>
      </div>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
        Per uscite quasi identiche ogni mese (es. accantonamento). Scegli il preset nel form
        "Aggiungi Uscita": precompila i campi, tu confermi o modifichi prima di salvare — nessun
        inserimento automatico.
      </p>

      {presetUscite.length > 0 && (
        <div className="space-y-2 mb-5">
          {presetUscite.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-700 block truncate">{p.nome}</span>
                <span className="text-[11px] text-slate-400">
                  {p.macroCategoria} → {p.categoria} · {p.conto} · {formatEuro(p.importo)}
                </span>
              </div>
              <button onClick={() => removePreset(p.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0 ml-3" aria-label={`Rimuovi preset ${p.nome}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl border border-dashed border-slate-200">
        <input
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="Nome preset (es. Accantonamento Auto)"
          className={`${inputClass} sm:col-span-2`}
        />
        <select
          value={form.macroCategoria}
          onChange={e => setForm(f => ({ ...f, macroCategoria: e.target.value, categoria: '' }))}
          className={inputClass}
        >
          <option value="">Macro categoria...</option>
          {macroCategorieUscite.map(m => <option key={m.nome} value={m.nome}>{m.icon} {m.nome}</option>)}
        </select>
        {form.macroCategoria && categorieDisponibili.length === 0 ? (
          <input
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            placeholder="Scrivi la categoria..."
            className={inputClass}
          />
        ) : (
          <select
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            disabled={!form.macroCategoria}
            className={`${inputClass} disabled:opacity-50`}
          >
            <option value="">Categoria...</option>
            {categorieDisponibili.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select
          value={form.conto}
          onChange={e => setForm(f => ({ ...f, conto: e.target.value }))}
          className={inputClass}
        >
          <option value="">Conto...</option>
          {conti.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={form.importo}
          onChange={e => setForm(f => ({ ...f, importo: e.target.value }))}
          placeholder="Importo (€)"
          className={inputClass}
        />
        <input
          value={form.descrizione}
          onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
          placeholder="Descrizione (opzionale, default = nome)"
          className={`${inputClass} sm:col-span-2`}
        />
        <button
          onClick={addPreset}
          disabled={!isValid}
          className="sm:col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-700 hover:bg-orange-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Aggiungi Preset
        </button>
      </div>
    </div>
  );
}
