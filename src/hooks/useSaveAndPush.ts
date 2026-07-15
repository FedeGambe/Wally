import { useCallback, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';

/**
 * Hook condiviso da tutti i form "Aggiungi ..." (Uscita, Entrata, Consumi,
 * Trasferimento): esegue il salvataggio locale (una funzione che chiama
 * saveToLocalStorage), poi pusha subito su Google Sheet — deciso nel piano
 * (docs/PIANO-INSERIMENTO-DATI.md) per evitare che un pull successivo
 * cancelli un record aggiunto in locale ma mai sincronizzato.
 */
export function useSaveAndPush() {
  const { pushToSheet, bumpVersion } = useFinanceData();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAndPush = useCallback(async (localSave: () => void): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      localSave();
      bumpVersion();
      const pushed = await pushToSheet();
      if (!pushed) {
        setError('Salvato in locale, ma la sincronizzazione con Google Sheets non è riuscita. Riprova da Impostazioni.');
      }
      return true;
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [pushToSheet, bumpVersion]);

  return { saveAndPush, isSaving, error, setError };
}
