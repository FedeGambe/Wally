import React, { useState } from 'react';
import { Landmark, LineChart, Layers } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { BROKER_INVESTIMENTI, importoGiaInserito, meseLabelBroker, strumentiBroker } from '../../utils/investimentiRicorrenti';
import { formatEuro } from '../../utils/format';
import { MESI_ITALIANI } from '../../utils/date';
import DropdownMenu from '../DropdownMenu';

interface AggiungiInvestimentoUnaTantumFormProps {
  onSaved: () => void;
}

const ASSET_CLASS = ['Azioni', 'Obbligazioni', 'Monetario'];

/**
 * Investimento una tantum fuori dai preset (Aggiungi Dato → Investimento Una
 * Tantum): broker + strumento + importo, scritto nella riga del mese corrente
 * del tab broker. Se la cella ha già un importo (es. il ricorrente del mese)
 * l'una tantum si accoda, non lo sostituisce.
 * Con "Strumento nuovo" crea prima la colonna dello strumento nel tab
 * (addStrumentoBrokerColumn), con nome e asset class.
 */
export default function AggiungiInvestimentoUnaTantumForm({ onSaved }: AggiungiInvestimentoUnaTantumFormProps) {
  const { data, accessToken, spreadsheetId, refreshData } = useFinanceData();
  const [broker, setBroker] = useState('');
  const [strumento, setStrumento] = useState('');
  const [importo, setImporto] = useState('');
  const [nuovo, setNuovo] = useState(false);
  const [assetClass, setAssetClass] = useState('Azioni');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oggi = new Date();
  const meseLabel = meseLabelBroker(oggi);
  const strumentiDisponibili = broker ? strumentiBroker(data, broker) : [];
  const giaPresente = !nuovo && broker && strumento ? importoGiaInserito(data, broker, strumento, meseLabel) : 0;
  const nomeGiaEsistente = nuovo && strumentiDisponibili.some(n => n.trim().toLowerCase() === strumento.trim().toLowerCase());
  const isValid = broker && strumento.trim() && Number(importo) > 0 && !nomeGiaEsistente;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    if (!spreadsheetId) {
      setError('Nessun foglio Google collegato. Collega un foglio da Impostazioni.');
      return;
    }
    if (!accessToken) {
      setError('Autenticazione scaduta. Effettua di nuovo l\'accesso.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const { writeInvestimentiRicorrentiToSheet, addStrumentoBrokerColumn } = await import('../../lib/sheetsService');
      if (nuovo) {
        await addStrumentoBrokerColumn(accessToken, spreadsheetId, broker, strumento.trim(), assetClass, meseLabel, Number(importo));
      } else {
        await writeInvestimentiRicorrentiToSheet(accessToken, spreadsheetId, broker, meseLabel, [{ strumento: strumento.trim(), importo: Number(importo) }], true);
      }
    } catch (err: any) {
      setError(err?.message || 'Errore durante la scrittura su Google Sheets.');
      setIsSaving(false);
      return;
    }
    await refreshData();
    setIsSaving(false);
    onSaved();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div>
        <p className="text-sm font-bold text-ink dark:text-slate-200">{MESI_ITALIANI[oggi.getMonth()]} {oggi.getFullYear()}</p>
        <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold">Investimento fuori dai ricorrenti</p>
      </div>
      <DropdownMenu
        icon={Landmark}
        label="Broker"
        accent="blue"
        fullWidth
        hideLabel
        placeholder="Broker..."
        value={broker}
        displayValue={broker}
        options={[...BROKER_INVESTIMENTI]}
        onSelect={b => { setBroker(b); setStrumento(''); }}
      />
      {broker && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-canvas dark:bg-white/5 text-xs font-bold">
          {[false, true].map(valore => (
            <button
              key={String(valore)}
              type="button"
              onClick={() => { setNuovo(valore); setStrumento(''); }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${nuovo === valore ? 'bg-white dark:bg-white/15 text-ink dark:text-slate-100 shadow-sm' : 'text-ink-soft'}`}
            >
              {valore ? 'Strumento nuovo' : 'Strumento esistente'}
            </button>
          ))}
        </div>
      )}
      {nuovo ? (
        <>
          <input
            value={strumento}
            onChange={e => setStrumento(e.target.value)}
            placeholder="Nome dello strumento (es. MSCI EM)"
            aria-label="Nome dello strumento nuovo"
            className={inputClass}
          />
          <DropdownMenu
            icon={Layers}
            label="Asset class"
            accent="blue"
            fullWidth
            hideLabel
            value={assetClass}
            displayValue={assetClass}
            options={ASSET_CLASS}
            onSelect={setAssetClass}
          />
        </>
      ) : broker && strumentiDisponibili.length === 0 ? (
        <input
          value={strumento}
          onChange={e => setStrumento(e.target.value)}
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
          value={strumento}
          displayValue={strumento}
          options={strumentiDisponibili}
          onSelect={setStrumento}
        />
      )}
      <input
        type="number"
        step="0.01"
        min="0.01"
        value={importo}
        onChange={e => setImporto(e.target.value)}
        placeholder="Importo (€)"
        aria-label="Importo investimento"
        className={inputClass}
      />
      {giaPresente > 0 && (
        <p className="text-2xs text-ink-soft">
          Questo mese ci sono già {formatEuro(giaPresente)}: l'importo si somma
          {Number(importo) > 0 && <> (totale {formatEuro(giaPresente + Number(importo))})</>}.
        </p>
      )}
      {nuovo && broker && strumento.trim() && (
        nomeGiaEsistente ? (
          <p className="text-2xs text-down">"{strumento.trim()}" esiste già nel tab {broker}: usa "Strumento esistente".</p>
        ) : (
          <p className="text-2xs text-ink-soft">
            Verrà aggiunta la colonna "{strumento.trim()}" ({assetClass}) nel tab {broker}, dentro le colonne
            sommate da "Importo investito Mensile", con l'importo nella riga di questo mese.
          </p>
        )
      )}
      {error && <p className="text-xs text-down font-semibold">{error}</p>}
      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : nuovo ? 'Crea strumento e aggiungi' : 'Aggiungi investimento'}
      </button>
    </form>
  );
}
