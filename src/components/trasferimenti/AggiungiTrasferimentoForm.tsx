import React, { useId, useState } from 'react';
import { Calendar, CreditCard, ArrowRight } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage, Trasferimento } from '../../data/mockData';
import { MESI_ITALIANI } from '../../utils/date';
import DropdownMenu from '../DropdownMenu';

interface AggiungiTrasferimentoFormProps {
  onSaved: () => void;
}

/**
 * Form "Aggiungi Trasferimento" (Fase 5 del piano, docs/archive/PIANO-INSERIMENTO-DATI.md).
 * Resta un log puro dei movimenti tra conti: NON aggiorna i saldi mostrati in
 * Patrimonio (che restano uno snapshot letto dal foglio Google) — decisione
 * presa per evitare doppio conteggio finché non si definisce una logica di
 * sincronizzazione tra le due cose.
 */
export default function AggiungiTrasferimentoForm({ onSaved }: AggiungiTrasferimentoFormProps) {
  const categoriaId = useId();
  const importoId = useId();
  const { data } = useFinanceData();
  const { conti } = useDatiBase();
  const { appendAndPush, isSaving, error } = useSaveAndPush();

  const oggi = new Date();
  const [useMeseDiverso, setUseMeseDiverso] = useState(false);
  const [meseIdx, setMeseIdx] = useState(oggi.getMonth());
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [categoria, setCategoria] = useState('Trasferimento');
  const [contoOrdinante, setContoOrdinante] = useState(conti[0] || '');
  const [contoBeneficiario, setContoBeneficiario] = useState(conti[1] || conti[0] || '');
  const [importo, setImporto] = useState('');

  const isValid = Boolean(contoOrdinante && contoBeneficiario && contoOrdinante !== contoBeneficiario && Number(importo) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const nuovoTrasferimento: Trasferimento = {
      id: `manual-${Date.now()}`,
      mese: MESI_ITALIANI[useMeseDiverso ? meseIdx : oggi.getMonth()],
      anno: useMeseDiverso ? anno : oggi.getFullYear(),
      categoria: categoria.trim() || 'Trasferimento',
      contoOrdinante,
      contoBeneficiario,
      importo: Number(importo)
    };

    const ok = await appendAndPush(() => {
      saveToLocalStorage({ trasferimenti: [...data.trasferimenti, nuovoTrasferimento] });
    }, [{ tabTitle: 'Trasferimenti', record: nuovoTrasferimento }]);
    if (ok) onSaved();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-2xs font-bold text-ink-soft uppercase mb-1.5 tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelClass}>Mese</label>
          <label className="flex items-center gap-1.5 text-2xs font-semibold text-ink-soft cursor-pointer select-none">
            <input type="checkbox" checked={useMeseDiverso} onChange={e => setUseMeseDiverso(e.target.checked)} className="cursor-pointer" />
            Mese diverso da quello corrente
          </label>
        </div>
        {useMeseDiverso ? (
          <div className="grid grid-cols-2 gap-3">
            <DropdownMenu
              icon={Calendar}
              label="Mese"
              accent="blue"
              fullWidth
              hideLabel
              value={MESI_ITALIANI[meseIdx]}
              displayValue={MESI_ITALIANI[meseIdx]}
              options={MESI_ITALIANI}
              onSelect={m => setMeseIdx(MESI_ITALIANI.indexOf(m))}
            />
            <input type="number" value={anno} onChange={e => setAnno(Number(e.target.value))} aria-label="Anno" className={inputClass} />
          </div>
        ) : (
          <div className={`${inputClass} bg-canvas dark:bg-white/10 text-ink-soft dark:text-slate-400`}>
            {MESI_ITALIANI[oggi.getMonth()]} {oggi.getFullYear()}
          </div>
        )}
      </div>

      <div>
        <label htmlFor={categoriaId} className={labelClass}>Categoria</label>
        <input
          id={categoriaId}
          type="text"
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          placeholder="Trasferimento"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Conto Ordinante</label>
        <DropdownMenu
          icon={CreditCard}
          label="Conto Ordinante"
          accent="blue"
          fullWidth
          hideLabel
          value={contoOrdinante}
          displayValue={contoOrdinante}
          options={conti}
          onSelect={setContoOrdinante}
        />
      </div>

      <div>
        <label className={labelClass}>Conto Beneficiario</label>
        <DropdownMenu
          icon={ArrowRight}
          label="Conto Beneficiario"
          accent="blue"
          fullWidth
          hideLabel
          value={contoBeneficiario}
          displayValue={contoBeneficiario}
          options={conti}
          onSelect={setContoBeneficiario}
        />
        {contoOrdinante && contoBeneficiario && contoOrdinante === contoBeneficiario && (
          <p className="text-2xs text-down font-semibold mt-1">Conto ordinante e beneficiario devono essere diversi.</p>
        )}
      </div>

      <div>
        <label htmlFor={importoId} className={labelClass}>Importo (€)</label>
        <input
          id={importoId}
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

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : 'Aggiungi Trasferimento'}
      </button>
    </form>
  );
}
