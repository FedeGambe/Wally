import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';

/**
 * Editor "Quota Fondo Pensione" (dentro il popup fullscreen di Impostazioni →
 * Preset Ricorrenti): la quota TFR mensile, salvata nel tab "Preset Fondo
 * Pensione" del foglio di configurazione. Usata da AggiungiEntrataForm per
 * proporre la riga del fondo pensione quando si inserisce lo stipendio.
 */
export default function FondoPensioneQuotaEditor() {
  const { quotaFondoPensione, updateDatiBase, isSaving, error } = useDatiBase();
  const [quota, setQuota] = useState(quotaFondoPensione > 0 ? String(quotaFondoPensione) : '');

  const isValid = Number(quota) > 0 && Number(quota) !== quotaFondoPensione;

  const inputClass = "px-3 py-2 rounded-xl text-xs border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500";

  return (
    <div>
      <p className="text-xs text-ink-soft dark:text-slate-400 mb-6 leading-relaxed">
        Quota TFR versata ogni mese nel fondo pensione. Quando aggiungi un'entrata "Stipendio",
        il form propone di scrivere anche la riga del mese nel tab "Fondo Pensione": le
        contribuzioni (base, volontaria, azienda) e i totali li calcola il foglio.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl border border-dashed border-hairline dark:border-white/15">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={quota}
          onChange={e => setQuota(e.target.value)}
          placeholder="Quota TFR mensile (€)"
          aria-label="Quota TFR mensile"
          className={inputClass}
        />
        <button
          onClick={() => updateDatiBase({ quotaFondoPensione: Number(quota) })}
          disabled={!isValid || isSaving}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Salvataggio...' : 'Salva quota'}
        </button>
      </div>
      {error && <p className="text-xs text-down font-semibold mt-3">{error}</p>}
    </div>
  );
}
