import React, { useState } from 'react';
import { Trash2, Plus, Landmark, LineChart } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useFinanceData } from '../../context/FinanceDataContext';
import { formatEuro } from '../../utils/format';
import { BROKER_INVESTIMENTI, strumentiBroker } from '../../utils/investimentiRicorrenti';
import type { PresetInvestimento } from '../../data/datiBase';
import DropdownMenu from '../DropdownMenu';

const emptyForm = { broker: '', strumento: '', importo: '' };

/**
 * Editor "Investimenti Ricorrenti" (dentro il popup fullscreen di
 * Impostazioni → Preset Ricorrenti): contributo mensile per ogni ETF dei tab
 * "Scalable"/"Trade Republic". Usati da AggiungiInvestimentiRicorrentiForm,
 * che scrive gli importi nella riga del mese corrente del broker.
 */
export default function InvestimentiRicorrentiEditor() {
  const { data } = useFinanceData();
  const { presetInvestimenti, updateDatiBase, error } = useDatiBase();
  const [form, setForm] = useState(emptyForm);

  const strumentiDisponibili = form.broker ? strumentiBroker(data, form.broker) : [];
  const isValid = form.broker && form.strumento.trim() && Number(form.importo) > 0;

  const addPreset = () => {
    if (!isValid) return;
    const nuovo: PresetInvestimento = {
      id: `preset-inv-${Date.now()}`,
      broker: form.broker,
      strumento: form.strumento.trim(),
      importo: Number(form.importo)
    };
    updateDatiBase({ presetInvestimenti: [...presetInvestimenti, nuovo] });
    setForm(emptyForm);
  };

  const removePreset = (id: string) =>
    updateDatiBase({ presetInvestimenti: presetInvestimenti.filter(p => p.id !== id) });

  const inputClass = "px-3 py-2 rounded-xl text-xs border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500";

  return (
    <div>
      <p className="text-xs text-ink-soft dark:text-slate-400 mb-6 leading-relaxed">
        Investimenti mensili sui broker. Lo strumento è il nome della colonna dell'ETF nel tab
        Scalable o Trade Republic: da "Aggiungi Dato → Investimenti Ricorrenti" gli importi
        vengono scritti nella riga del mese corrente.
      </p>

      {BROKER_INVESTIMENTI.map(broker => {
        const presetBroker = presetInvestimenti.filter(p => p.broker === broker);
        if (presetBroker.length === 0) return null;
        return (
          <div key={broker} className="mb-5">
            <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold mb-2">
              {broker} · {formatEuro(presetBroker.reduce((sum, p) => sum + p.importo, 0))}/mese
            </p>
            <div className="space-y-2">
              {presetBroker.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline dark:border-white/10 bg-canvas/60 dark:bg-white/5">
                  <span className="text-sm font-bold text-ink dark:text-slate-200 truncate min-w-0">{p.strumento}</span>
                  <span className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm text-ink dark:text-slate-200 tabular-nums">{formatEuro(p.importo)}</span>
                    <button onClick={() => removePreset(p.id)} className="text-ink-soft hover:text-down cursor-pointer" aria-label={`Rimuovi preset ${p.strumento}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl border border-dashed border-hairline dark:border-white/15">
        <DropdownMenu
          icon={Landmark}
          label="Broker"
          accent="blue"
          fullWidth
          hideLabel
          placeholder="Broker..."
          value={form.broker}
          displayValue={form.broker}
          options={[...BROKER_INVESTIMENTI]}
          onSelect={broker => setForm(f => ({ ...f, broker, strumento: '' }))}
        />
        {form.broker && strumentiDisponibili.length === 0 ? (
          <input
            value={form.strumento}
            onChange={e => setForm(f => ({ ...f, strumento: e.target.value }))}
            placeholder="Nome colonna ETF (riga 1 del tab)"
            className={inputClass}
          />
        ) : (
          <DropdownMenu
            icon={LineChart}
            label="Strumento"
            accent="blue"
            fullWidth
            hideLabel
            placeholder="Strumento..."
            value={form.strumento}
            displayValue={form.strumento}
            options={strumentiDisponibili}
            onSelect={strumento => setForm(f => ({ ...f, strumento }))}
          />
        )}
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={form.importo}
          onChange={e => setForm(f => ({ ...f, importo: e.target.value }))}
          placeholder="Importo mensile (€)"
          className={`${inputClass} sm:col-span-2`}
        />
        <button
          onClick={addPreset}
          disabled={!isValid}
          className="sm:col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Aggiungi Preset
        </button>
      </div>
      {error && <p className="text-xs text-down font-semibold mt-3">{error}</p>}
    </div>
  );
}
