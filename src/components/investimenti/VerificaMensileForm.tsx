import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { meseLabelBroker, valoreCampoBroker } from '../../utils/investimentiRicorrenti';
import { MESI_ITALIANI } from '../../utils/date';
import { formatEuro } from '../../utils/format';
import DropdownMenu from '../DropdownMenu';

interface VerificaMensileFormProps {
  onSaved: () => void;
}

interface Voce {
  id: string;
  broker: 'Trade Republic' | 'Scalable';
  intestazione: string; // riga 1 del tab broker
  campo: string; // stesso valore nei dati dell'app (SHEETS_CONFIG)
  label: string;
  meseSuccessivo: boolean; // true = va nella riga del mese dopo
  ammetteNegativi?: boolean;
}

// Interessi e saveback vengono accreditati a inizio mese successivo: sul
// foglio stanno nella riga del mese dopo quello verificato (es. verifica di
// settembre -> saldo in settembre, interessi/saveback in ottobre).
const VOCI: Voce[] = [
  { id: 'tr-saldo', broker: 'Trade Republic', intestazione: 'Saldo Conto', campo: 'saldoConto', label: 'Saldo conto', meseSuccessivo: false },
  { id: 'tr-interessi', broker: 'Trade Republic', intestazione: 'Interessi conto', campo: 'interessiConto', label: 'Interessi conto', meseSuccessivo: true },
  { id: 'tr-saveback', broker: 'Trade Republic', intestazione: 'Savebacks', campo: 'savebacks', label: 'Saveback', meseSuccessivo: true },
  { id: 'sc-saldo', broker: 'Scalable', intestazione: 'Saldo Conto Completo', campo: 'saldoContoCompleto', label: 'Saldo conto completo', meseSuccessivo: false },
  { id: 'sc-rendimento', broker: 'Scalable', intestazione: 'Rendimento comulativo', campo: 'rendimentoCumulativoEuro', label: 'Rendimento cumulativo', meseSuccessivo: false, ammetteNegativi: true }
];

const nomeMese = (d: Date) => `${MESI_ITALIANI[d.getMonth()]} ${d.getFullYear()}`;

/**
 * "Verifica mensile" della pagina Investimenti: i valori da riportare dai
 * broker a fine mese. Trade Republic: saldo conto del mese, più interessi e
 * saveback (nella riga del mese dopo). Scalable: saldo conto completo e
 * rendimento cumulativo del mese. Le voci già presenti sul foglio sono
 * mostrate come inserite e non vengono riscritte; il resto (rendimenti,
 * percentuali, saldo conto Scalable) lo calcolano le formule del foglio.
 */
export default function VerificaMensileForm({ onSaved }: VerificaMensileFormProps) {
  const { data, accessToken, spreadsheetId, refreshData } = useFinanceData();
  const oggi = new Date();
  // Si verifica a fine mese o nei primi giorni del successivo: prima del 20
  // la proposta è il mese scorso, dal 20 in poi il mese corrente.
  const opzioni = [new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1), new Date(oggi.getFullYear(), oggi.getMonth(), 1)];
  const [mese, setMese] = useState<Date>(oggi.getDate() < 20 ? opzioni[0] : opzioni[1]);
  const [valori, setValori] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meseDopo = new Date(mese.getFullYear(), mese.getMonth() + 1, 1);
  const meseDiVoce = (v: Voce) => (v.meseSuccessivo ? meseDopo : mese);
  const giaInserito = (v: Voce) => valoreCampoBroker(data, v.broker, v.campo, meseLabelBroker(meseDiVoce(v)));

  const daScrivere = VOCI.filter(v => giaInserito(v) === null && valori[v.id] !== undefined && valori[v.id].trim() !== '' && !isNaN(Number(valori[v.id])));
  const isValid = daScrivere.length > 0 && daScrivere.every(v => v.ammetteNegativi || Number(valori[v.id]) >= 0);

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
    const scritti: string[] = [];
    try {
      const { writeVerificaMensileToSheet } = await import('../../lib/sheetsService');
      for (const broker of ['Trade Republic', 'Scalable'] as const) {
        const voci = daScrivere
          .filter(v => v.broker === broker)
          .map(v => ({ intestazione: v.intestazione, meseLabel: meseLabelBroker(meseDiVoce(v)), valore: Number(valori[v.id]) }));
        if (voci.length === 0) continue;
        await writeVerificaMensileToSheet(accessToken, spreadsheetId, broker, voci);
        scritti.push(broker);
      }
    } catch (err: any) {
      const giaScritti = scritti.length > 0 ? ` (${scritti.join(' e ')} già aggiornato)` : '';
      setError(`${err?.message || 'Errore durante la scrittura su Google Sheets.'}${giaScritti}`);
      setIsSaving(false);
      if (scritti.length > 0) refreshData();
      return;
    }
    await refreshData();
    setIsSaving(false);
    onSaved();
  };

  const inputClass = "w-28 px-3 py-2 rounded-xl text-sm text-right tabular-nums bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold mb-1.5">Mese da verificare</p>
        <DropdownMenu
          icon={Calendar}
          label="Mese"
          accent="blue"
          fullWidth
          hideLabel
          value={nomeMese(mese)}
          displayValue={nomeMese(mese)}
          options={opzioni.map(nomeMese)}
          onSelect={nome => { setMese(opzioni.find(o => nomeMese(o) === nome) || mese); setValori({}); }}
        />
      </div>

      {(['Trade Republic', 'Scalable'] as const).map(broker => (
        <div key={broker} className="space-y-2">
          <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold">{broker}</p>
          {VOCI.filter(v => v.broker === broker).map(v => {
            const presente = giaInserito(v);
            return (
              <div key={v.id} className="flex items-center gap-3 pl-3.5 pr-2 py-2 rounded-2xl bg-canvas/60 dark:bg-white/5">
                <label htmlFor={`verifica-${v.id}`} className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-ink dark:text-slate-200">{v.label}</span>
                  <span className="block text-2xs text-ink-soft">{nomeMese(meseDiVoce(v)).toLowerCase()}</span>
                </label>
                {presente !== null ? (
                  <span className="text-xs text-ink-soft shrink-0 pr-1.5">già inserito · <span className="font-bold text-ink dark:text-slate-200 tabular-nums">{formatEuro(presente)}</span></span>
                ) : (
                  <input
                    id={`verifica-${v.id}`}
                    type="number"
                    step="0.01"
                    {...(v.ammetteNegativi ? {} : { min: '0' })}
                    value={valori[v.id] ?? ''}
                    onChange={e => setValori(prev => ({ ...prev, [v.id]: e.target.value }))}
                    placeholder="€"
                    className={inputClass}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : `Salva verifica${daScrivere.length > 0 ? ` (${daScrivere.length} valor${daScrivere.length === 1 ? 'e' : 'i'})` : ''}`}
      </button>
    </form>
  );
}
