import React, { useState } from 'react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage, Transaction } from '../../data/mockData';
import { iconPerMacroCategoria } from '../../data/datiBase';
import { MESI_ITALIANI } from '../../utils/date';

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface AggiungiUscitaFormProps {
  onSaved: () => void;
}

/**
 * Form "Aggiungi Uscita" — usato dal bottone dedicato in Uscite.tsx e (in
 * futuro, Fase 1b) dal popup generale di Panoramica. Categorie/conto vengono
 * da useDatiBase() (Impostazioni → Dati Base); mese e icon si derivano da
 * data/macroCategoria, l'utente non li compila a mano.
 */
export default function AggiungiUscitaForm({ onSaved }: AggiungiUscitaFormProps) {
  const { data } = useFinanceData();
  const { macroCategorieUscite, conti, presetUscite } = useDatiBase();
  const { saveAndPush, isSaving, error } = useSaveAndPush();

  const [dataStr, setDataStr] = useState(() => toInputDate(new Date()));
  const [descrizione, setDescrizione] = useState('');
  const [macroCategoria, setMacroCategoria] = useState(macroCategorieUscite[0]?.nome || '');
  const [categoria, setCategoria] = useState('');
  const [conto, setConto] = useState(conti[0] || '');
  const [importo, setImporto] = useState('');
  const [primaria, setPrimaria] = useState(true);

  // Applica un preset ricorrente (Impostazioni → Preset Uscite Ricorrenti):
  // precompila i campi, l'utente resta libero di modificarli prima di salvare.
  const applicaPreset = (presetId: string) => {
    const preset = presetUscite.find(p => p.id === presetId);
    if (!preset) return;
    setMacroCategoria(preset.macroCategoria);
    setCategoria(preset.categoria);
    setConto(preset.conto);
    setImporto(String(preset.importo));
    setDescrizione(preset.descrizione);
    setPrimaria(preset.primaria);
  };

  const macroSelezionata = macroCategorieUscite.find(m => m.nome === macroCategoria);
  const categorieDisponibili = macroSelezionata?.categorie || [];

  const handleMacroChange = (nome: string) => {
    setMacroCategoria(nome);
    setCategoria('');
  };

  const isValid = Boolean(descrizione.trim() && macroCategoria && categoria && conto && Number(importo) > 0 && dataStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const [y, m, d] = dataStr.split('-');
    const nuovaTransazione: Transaction = {
      id: `manual-${Date.now()}`,
      data: `${d}/${m}/${y}`,
      mese: MESI_ITALIANI[parseInt(m, 10) - 1],
      descrizione: descrizione.trim(),
      macroCategoria,
      categoria,
      icon: iconPerMacroCategoria(macroCategoria),
      conto,
      importo: Number(importo),
      primaria
    };

    const ok = await saveAndPush(() => {
      saveToLocalStorage({ uscite: [...data.uscite, nuovaTransazione] });
    });
    if (ok) onSaved();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500";
  const labelClass = "block text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {presetUscite.length > 0 && (
        <div>
          <label className={labelClass}>Preset ricorrente (opzionale)</label>
          <select
            defaultValue=""
            onChange={e => e.target.value && applicaPreset(e.target.value)}
            className={inputClass}
          >
            <option value="">Nessuno, compilo a mano</option>
            {presetUscite.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>Data</label>
        <input type="date" value={dataStr} onChange={e => setDataStr(e.target.value)} className={inputClass} required />
      </div>

      <div>
        <label className={labelClass}>Descrizione</label>
        <input
          type="text"
          value={descrizione}
          onChange={e => setDescrizione(e.target.value)}
          placeholder="Es. Spesa supermercato"
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Macro Categoria</label>
        <select value={macroCategoria} onChange={e => handleMacroChange(e.target.value)} className={inputClass} required>
          <option value="" disabled>Scegli...</option>
          {macroCategorieUscite.map(m => (
            <option key={m.nome} value={m.nome}>{m.icon} {m.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Categoria</label>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} disabled={!macroCategoria} className={`${inputClass} disabled:opacity-50`} required>
          <option value="" disabled>Scegli...</option>
          {categorieDisponibili.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Conto Utilizzato</label>
        <select value={conto} onChange={e => setConto(e.target.value)} className={inputClass} required>
          <option value="" disabled>Scegli...</option>
          {conti.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className={labelClass}>Tipologia</label>
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-white/10 h-[42px]">
            <button
              type="button"
              onClick={() => setPrimaria(true)}
              className={`flex-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${primaria ? 'bg-orange-700 text-white' : 'text-slate-500'}`}
            >
              Primaria
            </button>
            <button
              type="button"
              onClick={() => setPrimaria(false)}
              className={`flex-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${!primaria ? 'bg-orange-400 text-white' : 'text-slate-500'}`}
            >
              Secondaria
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : 'Aggiungi Uscita'}
      </button>
    </form>
  );
}
