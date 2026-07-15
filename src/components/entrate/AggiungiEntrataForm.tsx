import React, { useState } from 'react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage, EntrataRecord } from '../../data/mockData';
import { MESI_ITALIANI } from '../../utils/date';

interface AggiungiEntrataFormProps {
  onSaved: () => void;
}

/**
 * Form "Aggiungi Entrata" — niente campi data/descrizione (confermato non
 * servono, vedi docs/PIANO-INSERIMENTO-DATI.md): solo mese (default corrente,
 * un flag per sceglierne uno diverso), anno derivato dal mese, categoria,
 * conto, importo. Stipendio e voci variabili restano inserimento manuale
 * puro, nessun preset applicato qui.
 */
export default function AggiungiEntrataForm({ onSaved }: AggiungiEntrataFormProps) {
  const { data } = useFinanceData();
  const { categorieEntrate, conti } = useDatiBase();
  const { saveAndPush, isSaving, error } = useSaveAndPush();

  const oggi = new Date();
  const [useMeseDiverso, setUseMeseDiverso] = useState(false);
  const [meseIdx, setMeseIdx] = useState(oggi.getMonth());
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [categoria, setCategoria] = useState(categorieEntrate[0] || '');
  const [conto, setConto] = useState(conti[0] || '');
  const [importo, setImporto] = useState('');

  const isValid = Boolean(categoria && conto && Number(importo) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const nuovaEntrata: EntrataRecord = {
      id: `manual-${Date.now()}`,
      data: '',
      mese: MESI_ITALIANI[useMeseDiverso ? meseIdx : oggi.getMonth()],
      anno: useMeseDiverso ? anno : oggi.getFullYear(),
      descrizione: categoria,
      categoria,
      conto,
      importo: Number(importo)
    };

    const ok = await saveAndPush(() => {
      saveToLocalStorage({ entrate: [...data.entrate, nuovaEntrata] });
    });
    if (ok) onSaved();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500";
  const labelClass = "block text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelClass}>Mese</label>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer select-none">
            <input type="checkbox" checked={useMeseDiverso} onChange={e => setUseMeseDiverso(e.target.checked)} className="cursor-pointer" />
            Mese diverso da quello corrente
          </label>
        </div>
        {useMeseDiverso ? (
          <div className="grid grid-cols-2 gap-3">
            <select value={meseIdx} onChange={e => setMeseIdx(Number(e.target.value))} className={inputClass}>
              {MESI_ITALIANI.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <input type="number" value={anno} onChange={e => setAnno(Number(e.target.value))} className={inputClass} />
          </div>
        ) : (
          <div className={`${inputClass} bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400`}>
            {MESI_ITALIANI[oggi.getMonth()]} {oggi.getFullYear()}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Categoria</label>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputClass} required>
          <option value="" disabled>Scegli...</option>
          {categorieEntrate.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Conto</label>
        <select value={conto} onChange={e => setConto(e.target.value)} className={inputClass} required>
          <option value="" disabled>Scegli...</option>
          {conti.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Importo (€)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={importo}
          onChange={e => setImporto(e.target.value)}
          placeholder="0.00"
          className={inputClass}
          required
        />
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : 'Aggiungi Entrata'}
      </button>
    </form>
  );
}
