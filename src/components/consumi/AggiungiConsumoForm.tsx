import React, { useState } from 'react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage } from '../../data/mockData';
import { SHEETS_CONFIG } from '../../config/sheetsConfig';
import { shiftFormulaRows } from '../../utils/formulaShift';

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Campi calcolati dal foglio Google (non li reimplementiamo: copiamo e
// shiftiamo la formula della riga precedente, vedi utils/formulaShift.ts).
const CAMPI_FORMULA = ['kmEffettuati', 'litriPrecedenti', 'kmAlLitro', 'euroPer100Km', 'litriPer100Km', 'kmPersi', 'kmPersiMediani', 'costoExtra', 'esitoSettimana'];

interface AggiungiConsumoFormProps {
  onSaved: () => void;
}

/**
 * Form "Aggiungi Consumo" (Fase 3 del piano, docs/PIANO-INSERIMENTO-DATI.md).
 * Solo i valori che l'utente legge davvero (costo, litri, km finali, km/lt da
 * cruscotto, efficienza) sono campi del form; tutti gli altri (Km effettuati,
 * €/100km, Esito settimana, ...) vengono dalla formula della riga precedente
 * sul foglio, shiftata di una riga — il valore vero lo calcola Sheets al
 * prossimo pull, non lo approssimiamo qui.
 */
export default function AggiungiConsumoForm({ onSaved }: AggiungiConsumoFormProps) {
  const { data, accessToken, spreadsheetId } = useFinanceData();
  const { saveAndPush, isSaving, error, setError } = useSaveAndPush();

  const [dataStr, setDataStr] = useState(() => toInputDate(new Date()));
  const [costo, setCosto] = useState('');
  const [quantitaLitri, setQuantitaLitri] = useState('');
  const [prezzoAlLitro, setPrezzoAlLitro] = useState('');
  const [kmFinali, setKmFinali] = useState('');
  const [kmAlLitroAuto, setKmAlLitroAuto] = useState('');
  const [efficienzaPercentuale, setEfficienzaPercentuale] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);

  const isValid = Boolean(dataStr && Number(costo) > 0 && Number(quantitaLitri) > 0 && Number(prezzoAlLitro) > 0 && Number(kmFinali) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    if (!accessToken || !spreadsheetId) {
      setError('Serve una sessione Google attiva per leggere le formule dal foglio.');
      return;
    }

    setIsPreparing(true);
    setError(null);
    try {
      const { fetchRowFormulas } = await import('../../lib/sheetsService');
      const config = SHEETS_CONFIG.find(s => s.dataKey === 'analisiConsumi');
      if (!config) throw new Error('Configurazione foglio Analisi Consumi non trovata.');

      // Riga fisica sul foglio: 1 = header, quindi l'ultima riga esistente è
      // (numero di record già pulliti + 1), la nuova riga è quella successiva.
      const rigaPrecedente = data.analisiConsumi.length + 1;
      const range = `${config.title}!A${rigaPrecedente}:P${rigaPrecedente}`;
      const formulePrecedenti = await fetchRowFormulas(accessToken, spreadsheetId, range);

      const [y, m, d] = dataStr.split('-');
      const nuovoRecord: Record<string, any> = {
        data: `${d}/${m}/${y}`,
        costo: Number(costo),
        quantitaLitri: Number(quantitaLitri),
        prezzoAlLitro: Number(prezzoAlLitro),
        kmFinali: Number(kmFinali),
        kmAlLitroAuto: kmAlLitroAuto ? Number(kmAlLitroAuto) : 0,
        efficienzaPercentuale: efficienzaPercentuale ? Number(efficienzaPercentuale) : 0
      };

      config.fields.forEach((field, idx) => {
        if (!CAMPI_FORMULA.includes(field)) return;
        const formulaSopra = formulePrecedenti[idx] || '';
        nuovoRecord[field] = formulaSopra.startsWith('=') ? shiftFormulaRows(formulaSopra, 1) : 0;
      });

      const ok = await saveAndPush(() => {
        saveToLocalStorage({ analisiConsumi: [...data.analisiConsumi, nuovoRecord] as any });
      });
      if (ok) onSaved();
    } catch (err: any) {
      setError(err?.message || 'Errore nel leggere le formule dal foglio.');
    } finally {
      setIsPreparing(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500";
  // Il calendario nativo del browser disegna l'iconcina in nero fisso: su
  // sfondo scuro diventa quasi invisibile, la "invertiamo" via filtro CSS.
  const dateInputClass = `${inputClass} dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:dark:invert`;
  const labelClass = "block text-[11px] font-bold text-ink-soft uppercase mb-1.5 tracking-wider";
  const busy = isSaving || isPreparing;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Data</label>
        <input type="date" value={dataStr} onChange={e => setDataStr(e.target.value)} className={dateInputClass} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Costo (€)</label>
          <input type="number" step="0.01" min="0.01" value={costo} onChange={e => setCosto(e.target.value)} placeholder="0.00" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Quantità (Lt)</label>
          <input type="number" step="0.01" min="0.01" value={quantitaLitri} onChange={e => setQuantitaLitri(e.target.value)} placeholder="0.00" className={inputClass} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>€/Lt</label>
          <input type="number" step="0.001" min="0.001" value={prezzoAlLitro} onChange={e => setPrezzoAlLitro(e.target.value)} placeholder="0.000" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Km finali</label>
          <input type="number" step="1" min="0" value={kmFinali} onChange={e => setKmFinali(e.target.value)} placeholder="0" className={inputClass} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Km/lt (bordo auto)</label>
          <input type="number" step="0.1" min="0" value={kmAlLitroAuto} onChange={e => setKmAlLitroAuto(e.target.value)} placeholder="opzionale" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Efficienza</label>
          <input type="number" step="0.01" value={efficienzaPercentuale} onChange={e => setEfficienzaPercentuale(e.target.value)} placeholder="opzionale" className={inputClass} />
        </div>
      </div>

      <p className="text-[11px] text-ink-soft leading-relaxed">
        Km effettuati, Km/lt, €/100km, Km persi, Costo extra ed Esito settimana vengono calcolati
        dal foglio Google (stessa formula della riga precedente) al prossimo aggiornamento.
      </p>

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || busy}
        className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isPreparing ? 'Lettura formule dal foglio...' : isSaving ? 'Salvataggio...' : 'Aggiungi Consumo'}
      </button>
    </form>
  );
}
