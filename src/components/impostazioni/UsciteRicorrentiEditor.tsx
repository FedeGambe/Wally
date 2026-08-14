import React, { useState } from 'react';
import { Trash2, Plus, Grid, Tag, CreditCard } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { formatEuro } from '../../utils/format';
import type { PresetUscita } from '../../data/datiBase';
import DropdownMenu from '../DropdownMenu';

const emptyForm = { nome: '', macroCategoria: '', categoria: '', conto: '', importo: '', giornoDelMese: '', primaria: false };

/**
 * Editor "Uscite Ricorrenti" (dentro il popup fullscreen di Impostazioni →
 * Preset Uscite Ricorrenti): template per uscite quasi identiche ogni mese
 * (es. accantonamento). Usati da AggiungiUscitaForm per precompilare il
 * form — non inseriscono nulla da soli.
 */
export default function UsciteRicorrentiEditor() {
  const { presetUscite, macroCategorieUscite, conti, updateDatiBase, error } = useDatiBase();
  const [form, setForm] = useState(emptyForm);

  const macroSelezionata = macroCategorieUscite.find(m => m.nome === form.macroCategoria);
  const categorieDisponibili = macroSelezionata?.categorie || [];

  const isValid = form.nome.trim() && form.macroCategoria && form.categoria && form.conto && Number(form.importo) > 0 &&
    Number(form.giornoDelMese) >= 1 && Number(form.giornoDelMese) <= 31;

  const addPreset = () => {
    if (!isValid) return;
    const nuovo: PresetUscita = {
      id: `preset-${Date.now()}`,
      nome: form.nome.trim(),
      macroCategoria: form.macroCategoria,
      categoria: form.categoria,
      conto: form.conto,
      importo: Number(form.importo),
      giornoDelMese: Number(form.giornoDelMese),
      primaria: form.primaria
    };
    updateDatiBase({ presetUscite: [...presetUscite, nuovo] });
    setForm(emptyForm);
  };

  const removePreset = (id: string) => updateDatiBase({ presetUscite: presetUscite.filter(p => p.id !== id) });

  const inputClass = "px-3 py-2 rounded-xl text-xs border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500";

  return (
    <div>
      <p className="text-xs text-ink-soft dark:text-slate-400 mb-6 leading-relaxed">
        Per uscite quasi identiche ogni mese (es. accantonamento). Scegli il preset nel form
        "Aggiungi Uscita": precompila i campi, tu confermi o modifichi prima di salvare — nessun
        inserimento automatico.
      </p>

      {presetUscite.length > 0 && (
        <div className="space-y-2 mb-5">
          {presetUscite.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline dark:border-white/10 bg-canvas/60 dark:bg-white/5">
              <div className="min-w-0">
                <span className="text-sm font-bold text-ink dark:text-slate-200 block truncate">{p.nome}</span>
                <span className="text-[11px] text-ink-soft">
                  {p.macroCategoria} → {p.categoria} · {p.conto} · {formatEuro(p.importo)} · giorno {p.giornoDelMese}
                </span>
              </div>
              <button onClick={() => removePreset(p.id)} className="text-ink-soft hover:text-down cursor-pointer shrink-0 ml-3" aria-label={`Rimuovi preset ${p.nome}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl border border-dashed border-hairline dark:border-white/15">
        <input
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="Nome preset (es. Accantonamento Auto)"
          className={`${inputClass} sm:col-span-2`}
        />
        <DropdownMenu
          icon={Grid}
          label="Macro categoria"
          accent="orange"
          fullWidth
          hideLabel
          placeholder="Macro categoria..."
          value={form.macroCategoria}
          displayValue={form.macroCategoria ? `${macroCategorieUscite.find(m => m.nome === form.macroCategoria)?.icon || ''} ${form.macroCategoria}` : ''}
          options={macroCategorieUscite.map(m => m.nome)}
          getOptionLabel={nome => `${macroCategorieUscite.find(m => m.nome === nome)?.icon || ''} ${nome}`}
          onSelect={nome => setForm(f => ({ ...f, macroCategoria: nome, categoria: '' }))}
        />
        {form.macroCategoria && categorieDisponibili.length === 0 ? (
          <input
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            placeholder="Scrivi la categoria..."
            className={inputClass}
          />
        ) : (
          <DropdownMenu
            icon={Tag}
            label="Categoria"
            accent="orange"
            fullWidth
            hideLabel
            placeholder="Categoria..."
            value={form.categoria}
            displayValue={form.categoria}
            options={categorieDisponibili}
            onSelect={cat => setForm(f => ({ ...f, categoria: cat }))}
          />
        )}
        <DropdownMenu
          icon={CreditCard}
          label="Conto"
          accent="orange"
          fullWidth
          hideLabel
          placeholder="Conto..."
          value={form.conto}
          displayValue={form.conto}
          options={conti}
          onSelect={c => setForm(f => ({ ...f, conto: c }))}
        />
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
          type="number"
          step="1"
          min="1"
          max="31"
          value={form.giornoDelMese}
          onChange={e => setForm(f => ({ ...f, giornoDelMese: e.target.value }))}
          placeholder="Giorno del mese (1-31)"
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
      {error && <p className="text-xs text-down font-semibold mt-3">{error}</p>}
    </div>
  );
}
