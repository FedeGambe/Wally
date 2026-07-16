/**
 * UNICO PUNTO DI LETTURA dati finanza per la UI (layer 3 dell'architettura).
 *
 * Ogni pagina legge i dati tramite l'hook `useFinanceData()` invece di
 * importare direttamente gli array di src/data/mockData.ts. Questo componente
 * (`FinanceDataProvider`) va messo una volta in alto nell'albero (vedi
 * App.tsx) e fornisce a tutti i figli, tramite React Context:
 *  - `data`: l'oggetto con tutti i dati (reali o demo se incognito è attivo)
 *  - lo stato di sincronizzazione con Google Sheets (refresh/errori)
 *  - lo stato della modalità incognito
 *
 * `refreshVersion` è un contatore che si incrementa ogni volta che i dati
 * sottostanti cambiano (dopo un salvataggio, un refresh da Sheets, o un
 * toggle incognito). `data` è un useMemo che dipende da `refreshVersion`:
 * è il meccanismo con cui il resto della UI "si accorge" che i dati sono
 * cambiati, dato che gli array in mockData.ts sono mutati in-place e non
 * genererebbero da soli un nuovo render.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getExportableData, isIncognitoModeEnabled, setIncognitoModeEnabled } from '../data/mockData';

// Il tipo dei dati finanza è "derivato" dal valore di ritorno di getExportableData,
// invece di essere riscritto a mano: se quella funzione cambia forma, questo
// tipo si aggiorna da solo (utility TypeScript: ReturnType<typeof fn>).
type FinanceData = ReturnType<typeof getExportableData>;

interface FinanceDataContextValue {
  data: FinanceData;
  isIncognito: boolean;
  toggleIncognito: (enabled: boolean) => void;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
  syncError: string | null;
  bumpVersion: () => void;
  /**
   * Pusha lo stato attuale (getExportableData, MAI incognito) su Google Sheet.
   * Usata dai form "Aggiungi ..." dopo un saveToLocalStorage: dato che il push
   * sovrascrive sempre l'intera tab, basta richiamare questa subito dopo aver
   * salvato in locale, senza costruire a mano il payload da inviare.
   * Ritorna true se il push è andato a buon fine.
   */
  pushToSheet: () => Promise<boolean>;
  isPushing: boolean;
  /** Token OAuth corrente (o null) e ID del foglio collegato — servono ai form
   * che devono chiamare direttamente l'API Sheets (es. leggere una formula in
   * Analisi Consumi, Fase 3 del piano) invece di limitarsi a push/pull. */
  accessToken: string | null;
  spreadsheetId: string | null;
}

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

interface FinanceDataProviderProps {
  accessToken: string | null;
  onAuthError: () => void;
  children: React.ReactNode;
}

export function FinanceDataProvider({ accessToken, onAuthError, children }: FinanceDataProviderProps) {
  const [isIncognito, setIsIncognito] = useState<boolean>(() => isIncognitoModeEnabled());
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Forza il ricalcolo di `data` (vedi useMemo più sotto). Va chiamata da chiunque
  // scriva dati finanza (dopo saveToLocalStorage, dopo un refresh da Sheets, ecc.).
  const bumpVersion = useCallback(() => {
    setRefreshVersion(prev => prev + 1);
  }, []);

  const toggleIncognito = useCallback((enabled: boolean) => {
    setIncognitoModeEnabled(enabled);
    setIsIncognito(enabled);
    bumpVersion();
  }, [bumpVersion]);

  const refreshData = useCallback(async () => {
    const savedId = localStorage.getItem('sf_spreadsheet_id');
    if (!savedId) return;

    if (!accessToken) {
      setSyncError('Autenticazione scaduta. Per favore effettua di nuovo l\'accesso.');
      setTimeout(() => setSyncError(null), 5000);
      onAuthError();
      return;
    }

    setIsRefreshing(true);
    setSyncError(null);
    try {
      const { fetchSpreadsheetData, fetchDatiBaseFromConfigSheet } = await import('../lib/sheetsService');
      const { saveToLocalStorage } = await import('../data/mockData');
      const remoteData = await fetchSpreadsheetData(accessToken, savedId);
      saveToLocalStorage(remoteData);

      // Dati Base (Conti, Categorie Entrate/Uscite, Soglie) dal foglio di configurazione,
      // se collegato: fatto automaticamente ad ogni sync invece di richiedere il bottone
      // manuale "Importa da foglio di configurazione" in Impostazioni. Fallisce in
      // silenzio (solo log) se il foglio di configurazione non è raggiungibile: non deve
      // bloccare il resto della sync, che ha già i suoi dati aggiornati.
      const configId = localStorage.getItem('sf_config_spreadsheet_id');
      if (configId) {
        try {
          const datiBase = await fetchDatiBaseFromConfigSheet(accessToken, configId);
          saveToLocalStorage(datiBase);
        } catch (configErr) {
          console.error('Errore importazione Dati Base dal foglio di configurazione:', configErr);
        }
      }

      setIsRefreshing(false);
      bumpVersion();
    } catch (err: any) {
      console.error(err);
      const isUnauth = err?.message?.includes('UNAUTHENTICATED') ||
                       err?.message?.toLowerCase().includes('authentication credentials') ||
                       err?.message?.includes('401');
      if (isUnauth) {
        setSyncError('La sessione di Google è scaduta. Effettua nuovamente il login per ricollegare il tuo account.');
        setTimeout(() => setSyncError(null), 8000);
        onAuthError();
      } else {
        setSyncError(`Impossibile sincronizzare Google Sheets: ${err?.message || 'verifica permessi'}`);
        setTimeout(() => setSyncError(null), 6000);
      }
      setIsRefreshing(false);
    }
  }, [accessToken, onAuthError, bumpVersion]);

  // Sincronizzazione automatica al login (quando accessToken diventa disponibile)
  const pushToSheet = useCallback(async (): Promise<boolean> => {
    const savedId = localStorage.getItem('sf_spreadsheet_id');
    if (!savedId) {
      setSyncError('Nessun foglio Google collegato. Collega un foglio da Impostazioni prima di aggiungere dati.');
      setTimeout(() => setSyncError(null), 6000);
      return false;
    }
    if (!accessToken) {
      setSyncError('Autenticazione scaduta. Per favore effettua di nuovo l\'accesso.');
      setTimeout(() => setSyncError(null), 5000);
      onAuthError();
      return false;
    }

    setIsPushing(true);
    setSyncError(null);
    try {
      const { pushSpreadsheetData } = await import('../lib/sheetsService');
      // getExportableData() senza argomenti = SEMPRE dati reali, mai demo/incognito
      // (stesso motivo per cui SheetsModal la chiama così, vedi mockData.ts).
      await pushSpreadsheetData(accessToken, savedId, getExportableData());
      setIsPushing(false);
      return true;
    } catch (err: any) {
      console.error(err);
      const isUnauth = err?.message?.includes('UNAUTHENTICATED') ||
                       err?.message?.toLowerCase().includes('authentication credentials') ||
                       err?.message?.includes('401');
      if (isUnauth) {
        setSyncError('La sessione di Google è scaduta. Effettua nuovamente il login per ricollegare il tuo account.');
        setTimeout(() => setSyncError(null), 8000);
        onAuthError();
      } else {
        setSyncError(`Impossibile salvare su Google Sheets: ${err?.message || 'verifica permessi'}`);
        setTimeout(() => setSyncError(null), 6000);
      }
      setIsPushing(false);
      return false;
    }
  }, [accessToken, onAuthError]);

  useEffect(() => {
    if (accessToken) {
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const data = useMemo(() => getExportableData(isIncognito), [isIncognito, refreshVersion]);

  const value = useMemo<FinanceDataContextValue>(() => ({
    data,
    isIncognito,
    toggleIncognito,
    refreshData,
    isRefreshing,
    syncError,
    bumpVersion,
    pushToSheet,
    isPushing,
    accessToken,
    spreadsheetId: localStorage.getItem('sf_spreadsheet_id')
  }), [data, isIncognito, toggleIncognito, refreshData, isRefreshing, syncError, bumpVersion, pushToSheet, isPushing, accessToken]);

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData(): FinanceDataContextValue {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) {
    throw new Error('useFinanceData must be used within a FinanceDataProvider');
  }
  return ctx;
}
