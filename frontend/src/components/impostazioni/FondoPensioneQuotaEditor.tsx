import React, { useState } from 'react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { IntroEditor, Campo, AzioniScheda, ErroreEditor, inputEditorClass } from './editorUI';

/**
 * Editor "Quota Fondo Pensione" (popup di Impostazioni → Preset Ricorrenti):
 * la quota TFR mensile, salvata nel tab "Preset Fondo Pensione" del foglio di
 * configurazione. Usata da AggiungiEntrataForm per proporre la riga del fondo
 * pensione quando si inserisce lo stipendio. Un solo valore: niente lista.
 */
export default function FondoPensioneQuotaEditor() {
  const { quotaFondoPensione, updateDatiBase, isSaving, error } = useDatiBase();
  const [quota, setQuota] = useState(quotaFondoPensione > 0 ? String(quotaFondoPensione) : '');
  const [salvata, setSalvata] = useState(false);

  const valido = Number(quota) > 0 && Number(quota) !== quotaFondoPensione && !isSaving;

  const salva = async () => {
    if (!valido) return;
    await updateDatiBase({ quotaFondoPensione: Number(quota) });
    setSalvata(true);
  };

  return (
    <div className="space-y-4">
      <IntroEditor>
        Quota TFR versata ogni mese nel fondo pensione. Quando aggiungi l'entrata "Stipendio", il
        modulo propone anche la riga del mese nel tab "Fondo Pensione": contribuzioni e totali li
        calcola il foglio.
      </IntroEditor>
      <Campo label="Quota TFR mensile">
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={quota}
            onChange={e => { setQuota(e.target.value); setSalvata(false); }}
            onKeyDown={e => e.key === 'Enter' && salva()}
            className={`${inputEditorClass} pr-8`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">€</span>
        </div>
      </Campo>
      {salvata && !error && <p className="text-xs text-up font-semibold">Quota salvata.</p>}
      <AzioniScheda onSalva={salva} salvaAbilitato={valido} etichettaSalva={isSaving ? 'Salvataggio...' : 'Salva quota'} />
      <ErroreEditor errore={error} />
    </div>
  );
}
