import React, { useState } from 'react';
import { Trash2, Plus, Repeat, CreditCard, ArrowRight } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { formatEuro } from '../../utils/format';
import type { PresetTrasferimento } from '../../data/datiBase';
import DropdownMenu from '../DropdownMenu';

const emptyForm = { categoria: '', contoOrdinante: '', contoBeneficiario: '', importo: '' };

/**
 * Editor "Trasferimenti Ricorrenti" (dentro il popup fullscreen di
 * Impostazioni → Preset Ricorrenti). `categoria` va scelta tra i nomi dei
 * Preset Uscite Ricorrenti esistenti: è il match esatto su questo nome che fa
 * scattare, nel form Aggiungi Uscita, il flag "aggiungi anche il
 * trasferimento" e il pallino lampeggiante sulla voce corrispondente.
 */
export default function TrasferimentiRicorrentiEditor() {
  const { presetTrasferimenti, presetUscite, conti, updateDatiBase, error } = useDatiBase();
  const [form, setForm] = useState(emptyForm);

  const isValid = form.categoria && form.contoBeneficiario && Number(form.importo) > 0;

  const addPreset = () => {
    if (!isValid) return;
    const nuovo: PresetTrasferimento = {
      id: `preset-trasf-${Date.now()}`,
      categoria: form.categoria,
      contoOrdinante: form.contoOrdinante,
      contoBeneficiario: form.contoBeneficiario,
      importo: Number(form.importo)
    };
    updateDatiBase({ presetTrasferimenti: [...presetTrasferimenti, nuovo] });
    setForm(emptyForm);
  };

  const removePreset = (id: string) =>
    updateDatiBase({ presetTrasferimenti: presetTrasferimenti.filter(p => p.id !== id) });

  const inputClass = "px-3 py-2 rounded-xl text-xs border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500";

  return (
    <div>
      <p className="text-xs text-ink-soft dark:text-slate-400 mb-6 leading-relaxed">
        Trasferimenti legati a un'uscita ricorrente (es. bonifico verso il conto di accantonamento
        quando paghi una rata). La categoria deve corrispondere al nome di un preset in "Uscite
        Ricorrenti": quando coincide, il form "Aggiungi Uscita" mostra un flag per aggiungere anche
        questo trasferimento in automatico.
      </p>

      {presetTrasferimenti.length > 0 && (
        <div className="space-y-2 mb-5">
          {presetTrasferimenti.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline dark:border-white/10 bg-canvas/60 dark:bg-white/5">
              <div className="min-w-0">
                <span className="text-sm font-bold text-ink dark:text-slate-200 block truncate">{p.categoria}</span>
                <span className="text-[11px] text-ink-soft">
                  {p.contoOrdinante || 'Qualsiasi'} → {p.contoBeneficiario} · {formatEuro(p.importo)}
                </span>
              </div>
              <button onClick={() => removePreset(p.id)} className="text-ink-soft hover:text-down cursor-pointer shrink-0 ml-3" aria-label={`Rimuovi preset ${p.categoria}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl border border-dashed border-hairline dark:border-white/15">
        <DropdownMenu
          icon={Repeat}
          label="Categoria (preset uscita)"
          accent="orange"
          fullWidth
          hideLabel
          placeholder="Collega a un preset uscita..."
          value={form.categoria}
          displayValue={form.categoria}
          options={presetUscite.map(p => p.nome)}
          onSelect={categoria => setForm(f => ({ ...f, categoria }))}
        />
        <div />
        <DropdownMenu
          icon={CreditCard}
          label="Conto ordinante (opzionale)"
          accent="orange"
          fullWidth
          hideLabel
          placeholder="Conto ordinante..."
          value={form.contoOrdinante}
          displayValue={form.contoOrdinante}
          options={conti}
          onSelect={c => setForm(f => ({ ...f, contoOrdinante: c }))}
        />
        <DropdownMenu
          icon={ArrowRight}
          label="Conto beneficiario"
          accent="orange"
          fullWidth
          hideLabel
          placeholder="Conto beneficiario..."
          value={form.contoBeneficiario}
          displayValue={form.contoBeneficiario}
          options={conti}
          onSelect={c => setForm(f => ({ ...f, contoBeneficiario: c }))}
        />
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={form.importo}
          onChange={e => setForm(f => ({ ...f, importo: e.target.value }))}
          placeholder="Importo (€)"
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
