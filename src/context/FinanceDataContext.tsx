import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getExportableData, isIncognitoModeEnabled, setIncognitoModeEnabled } from '../data/mockData';

type FinanceData = ReturnType<typeof getExportableData>;

interface FinanceDataContextValue {
  data: FinanceData;
  isIncognito: boolean;
  toggleIncognito: (enabled: boolean) => void;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
  syncError: string | null;
  bumpVersion: () => void;
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
  const [syncError, setSyncError] = useState<string | null>(null);

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
      const { fetchSpreadsheetData } = await import('../lib/sheetsService');
      const { saveToLocalStorage } = await import('../data/mockData');
      const remoteData = await fetchSpreadsheetData(accessToken, savedId);
      saveToLocalStorage(remoteData);

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
    bumpVersion
  }), [data, isIncognito, toggleIncognito, refreshData, isRefreshing, syncError, bumpVersion]);

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
