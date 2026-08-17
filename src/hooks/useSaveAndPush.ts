import { useCallback, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';

/**
 * Hook condiviso da tutti i form "Aggiungi ..." (Uscita, Entrata, Consumi,
 * Trasferimento): esegue il salvataggio locale (una funzione che chiama
 * saveToLocalStorage), poi pusha subito su Google Sheet — deciso nel piano
 * (docs/archive/PIANO-INSERIMENTO-DATI.md) per evitare che un pull successivo
 * cancelli un record aggiunto in locale ma mai sincronizzato.
 */
export function useSaveAndPush() {
  const { pushToSheet, bumpVersion, accessToken, spreadsheetId, setSyncError } = useFinanceData();
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

  // Come saveAndPush, ma invece di rimandare l'intero foglio (pushToSheet ->
  // pushSpreadsheetData, sovrascrive tutte le tab) accoda SOLO le righe nuove
  // sulle tab indicate via appendRowToSheet — non tocca mai altre celle/tab.
  // `appends` è una lista di { tabTitle, record }: quasi sempre un elemento
  // solo, due quando un'Uscita porta con sé un Trasferimento collegato (vedi
  // AggiungiUscitaForm). `record` è lo stesso oggetto già passato a
  // saveToLocalStorage dal form. `contantiDelta` opzionale: quando la
  // transazione coinvolge il conto Contanti, applica anche i delta di
  // banconote al tab "Portafoglio Raw" (vedi updatePortafoglioRawCounts).
  const appendAndPush = useCallback(async (
    localSave: () => void,
    appends: { tabTitle: string; record: Record<string, any> }[],
    contantiDelta?: Partial<Record<5 | 10 | 20 | 50 | 100, number>>
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      localSave();
      bumpVersion();
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio.');
      setIsSaving(false);
      return false;
    }
    try {
      if (!spreadsheetId) {
        throw new Error('Nessun foglio Google collegato. Collega un foglio da Impostazioni.');
      }
      if (!accessToken) {
        throw new Error('Autenticazione scaduta. Effettua di nuovo l\'accesso.');
      }
      const { appendRowToSheet, updatePortafoglioRawCounts } = await import('../lib/sheetsService');
      for (const { tabTitle, record } of appends) {
        await appendRowToSheet(accessToken, spreadsheetId, tabTitle, record);
      }
      if (contantiDelta) {
        await updatePortafoglioRawCounts(accessToken, spreadsheetId, contantiDelta);
      }
    } catch (err: any) {
      const message = `Salvato in locale, ma la sincronizzazione con Google Sheets non è riuscita: ${err?.message || 'errore sconosciuto'}. Riprova da Impostazioni.`;
      setError(message);
      // Il popup del form si chiude subito dopo (il salvataggio locale è comunque
      // riuscito), quindi l'errore sopra sparirebbe con lui prima di essere letto:
      // lo mandiamo anche al toast persistente in basso a destra (stesso usato da
      // pushToSheet), che sopravvive alla chiusura del popup.
      setSyncError(message);
      setTimeout(() => setSyncError(null), 8000);
    } finally {
      setIsSaving(false);
    }
    return true;
  }, [bumpVersion, accessToken, spreadsheetId]);

  return { saveAndPush, appendAndPush, isSaving, error, setError };
}
