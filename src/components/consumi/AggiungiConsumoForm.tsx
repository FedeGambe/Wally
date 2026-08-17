import React, { useId, useState } from 'react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage } from '../../data/mockData';

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface AggiungiConsumoFormProps {
  onSaved: () => void;
}

/**
 * Form "Aggiungi Consumo" (Fase 3 del piano, docs/archive/PIANO-INSERIMENTO-DATI.md).
 * Solo i valori che l'utente legge davvero (costo, litri, km finali, km/lt da
 * cruscotto) sono campi del form; tutti gli altri (Km effettuati, €/100km,
 * Esito settimana, ...) sono in SHEETS_CONFIG.formulaFields — li copia e
 * shifta appendRowToSheet (sheetsService.tsx) dalla riga sopra, leggendo la
 * riga giusta fresca dal foglio invece che dal conteggio locale (che può
 * disallinearsi se un push precedente è fallito). "Efficienza" non si inserisce
 * più da form (deciso: non manuale), resta vuota sulle righe aggiunte da qui.
 */
export default function AggiungiConsumoForm({ onSaved }: AggiungiConsumoFormProps) {
  const dataId = useId();
  const costoId = useId();
  const litriId = useId();
  const prezzoId = useId();
  const kmFinaliId = useId();
  const kmAlLitroId = useId();
  const { data } = useFinanceData();
  const { appendAndPush, isSaving, error } = useSaveAndPush();

  const [dataStr, setDataStr] = useState(() => toInputDate(new Date()));
  const [costo, setCosto] = useState('');
  const [quantitaLitri, setQuantitaLitri] = useState('');
  const [prezzoAlLitro, setPrezzoAlLitro] = useState('');
  const [kmFinali, setKmFinali] = useState('');
  const [kmAlLitroAuto, setKmAlLitroAuto] = useState('');
  // Costo è sempre obbligatorio; tra Litri e €/Lt basta compilarne uno, l'altro si ricava dal
  // Costo. campoGuida ricorda quale dei due l'utente sta effettivamente scrivendo, così quando
  // cambia il Costo si ricalcola quello NON guidato invece di sovrascrivere quello che l'utente
  // ha appena digitato.
  const [campoGuida, setCampoGuida] = useState<'litri' | 'prezzo' | null>(null);

  const ricalcolaDaCosto = (costoStr: string, guida: 'litri' | 'prezzo' | null, valoreGuida: string) => {
    const c = Number(costoStr);
    if (!c || !guida || !valoreGuida) return;
    const v = Number(valoreGuida);
    if (!v || v <= 0) return;
    if (guida === 'litri') setPrezzoAlLitro((c / v).toFixed(3));
    else setQuantitaLitri((c / v).toFixed(2));
  };

  const handleCostoChange = (v: string) => {
    setCosto(v);
    ricalcolaDaCosto(v, campoGuida, campoGuida === 'litri' ? quantitaLitri : prezzoAlLitro);
  };
  const handleLitriChange = (v: string) => {
    setQuantitaLitri(v);
    setCampoGuida('litri');
    ricalcolaDaCosto(costo, 'litri', v);
  };
  const handlePrezzoChange = (v: string) => {
    setPrezzoAlLitro(v);
    setCampoGuida('prezzo');
    ricalcolaDaCosto(costo, 'prezzo', v);
  };

  const isValid = Boolean(dataStr && Number(costo) > 0 && Number(quantitaLitri) > 0 && Number(prezzoAlLitro) > 0 && Number(kmFinali) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const [y, m, d] = dataStr.split('-');
    const nuovoRecord: Record<string, any> = {
      data: `${d}/${m}/${y}`,
      costo: Number(costo),
      quantitaLitri: Number(quantitaLitri),
      prezzoAlLitro: Number(prezzoAlLitro),
      kmFinali: Number(kmFinali)
    };
    // Opzionale: se non compilato, non scriviamo 0 (un dato falso) ma lasciamo la cella vuota.
    if (kmAlLitroAuto) nuovoRecord.kmAlLitroAuto = Number(kmAlLitroAuto);

    const ok = await appendAndPush(() => {
      saveToLocalStorage({ analisiConsumi: [...data.analisiConsumi, nuovoRecord] as any });
    }, [{ tabTitle: 'Analisi consumi', record: nuovoRecord }]);
    if (ok) onSaved();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500";
  // Il calendario nativo del browser disegna l'iconcina in nero fisso: su
  // sfondo scuro diventa quasi invisibile, la "invertiamo" via filtro CSS.
  const dateInputClass = `${inputClass} dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:dark:invert`;
  const labelClass = "block text-2xs font-bold text-ink-soft uppercase mb-1.5 tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={dataId} className={labelClass}>Data</label>
        <input id={dataId} type="date" value={dataStr} onChange={e => setDataStr(e.target.value)} className={dateInputClass} required />
      </div>

      <div>
        <label htmlFor={costoId} className={labelClass}>Costo (€)</label>
        <input id={costoId} type="number" step="0.01" min="0.01" value={costo} onChange={e => handleCostoChange(e.target.value)} placeholder="0.00" className={inputClass} required />
      </div>

      <div>
        <p className="text-2xs text-ink-soft mb-1.5">Basta compilare uno tra Litri e €/Lt: l'altro si calcola dal Costo.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={litriId} className={labelClass}>Quantità (Lt)</label>
            <input id={litriId} type="number" step="0.01" min="0.01" value={quantitaLitri} onChange={e => handleLitriChange(e.target.value)} placeholder="0.00" className={inputClass} required />
          </div>
          <div>
            <label htmlFor={prezzoId} className={labelClass}>€/Lt</label>
            <input id={prezzoId} type="number" step="0.001" min="0.001" value={prezzoAlLitro} onChange={e => handlePrezzoChange(e.target.value)} placeholder="0.000" className={inputClass} required />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={kmFinaliId} className={labelClass}>Km finali</label>
        <input id={kmFinaliId} type="number" step="1" min="0" value={kmFinali} onChange={e => setKmFinali(e.target.value)} placeholder="0" className={inputClass} required />
      </div>

      <div>
        <label htmlFor={kmAlLitroId} className={labelClass}>Km/lt (bordo auto)</label>
        <input id={kmAlLitroId} type="number" step="0.1" min="0" value={kmAlLitroAuto} onChange={e => setKmAlLitroAuto(e.target.value)} placeholder="opzionale" className={inputClass} />
      </div>

      <p className="text-2xs text-ink-soft leading-relaxed">
        Km effettuati, Km/lt, €/100km, Km persi, Costo extra ed Esito settimana vengono calcolati
        dal foglio Google (stessa formula della riga precedente) al prossimo aggiornamento.
      </p>

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : 'Aggiungi Consumo'}
      </button>
    </form>
  );
}
