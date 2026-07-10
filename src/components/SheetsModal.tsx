import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Database,
  Plus,
  Link2,
  FileSpreadsheet,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { createSpreadsheet, fetchSpreadsheetData, pushSpreadsheetData } from '../lib/sheetsService';
import { getExportableData, saveToLocalStorage } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';

/**
 * Modale "Integrazione Google Sheets" (apribile dalla Sidebar/Impostazioni).
 * È il punto in cui l'utente collega il proprio Google Sheet all'app, oppure
 * ne crea uno nuovo, e da cui può forzare manualmente un caricamento (push)
 * o uno scaricamento (pull) dei dati.
 *
 * ATTENZIONE: questo componente tocca la logica di sincronizzazione dati più
 * delicata dell'app (push/pull verso il foglio Google reale). I commenti qui
 * spiegano COSA fa il codice, ma non ne cambiano il comportamento: ogni
 * push/pull usa sempre `getExportableData()`/`saveToLocalStorage()` come
 * previsto dall'architettura (vedi CLAUDE.md), quindi i dati demo/incognito
 * non possono mai finire sul foglio reale.
 */
interface SheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onRefreshCompleted: () => void;
}

export default function SheetsModal({
  isOpen,
  onClose,
  accessToken,
  onRefreshCompleted
}: SheetsModalProps) {
  const { bumpVersion } = useFinanceData();
  const [sheetId, setSheetId] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Il push (caricamento sul foglio) sovrascrive i dati remoti: per questo motivo
  // non parte subito al click, ma prima mostra un banner di conferma (showConfirmPush).
  // Stessa logica per lo scollegamento (showConfirmDisconnect).
  const [showConfirmPush, setShowConfirmPush] = useState<boolean>(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState<boolean>(false);

  // Ogni volta che il modale viene aperto (isOpen passa a true), rilegge da
  // localStorage l'ID del foglio già collegato (se c'è) e resetta messaggi/conferme
  // residui di una precedente apertura, cosi' il modale riparte "pulito".
  useEffect(() => {
    if (isOpen) {
      const savedId = localStorage.getItem('sf_spreadsheet_id') || '';
      setSheetId(savedId);
      if (savedId) {
        setInputUrl(`https://docs.google.com/spreadsheets/d/${savedId}/edit`);
      } else {
        setInputUrl('');
      }
      setSuccessMsg(null);
      setErrorMsg(null);
      setShowConfirmPush(false);
      setShowConfirmDisconnect(false);
    }
  }, [isOpen]);

  // Extract ID from URL if user pastes a full Google Sheet link
  // Permette all'utente di incollare sia il solo ID sia l'intero URL del foglio
  // (es. "https://docs.google.com/spreadsheets/d/ABC123/edit"): l'espressione
  // regolare cerca il segmento "/d/<ID>" tipico degli URL di Google Sheets ed
  // estrae solo l'ID. Se non è un URL riconoscibile, restituisce il testo così
  // com'è (si assume che l'utente abbia incollato direttamente l'ID).
  const extractId = (urlOrId: string): string => {
    const clean = urlOrId.trim();
    if (!clean) return '';

    // Check if it's a URL
    if (clean.includes('docs.google.com/spreadsheets')) {
      const matches = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (matches && matches[1]) {
        return matches[1];
      }
    }
    return clean;
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const targetId = extractId(inputUrl);
    
    if (!targetId) {
      setErrorMsg('Inserisci un URL o un ID valido.');
      return;
    }

    if (!accessToken) {
      setErrorMsg('Autenticazione mancante. Esci e rientra.');
      return;
    }

    setIsLoading(true);
    try {
      // Test read to see if it's accessible and correct (will automatically create missing tabs)
      const data = await fetchSpreadsheetData(accessToken, targetId);

      // If it exists, save the ID
      localStorage.setItem('sf_spreadsheet_id', targetId);
      setSheetId(targetId);

      // Check if the remote spreadsheet is completely empty
      const isEmpty = (!data.uscite || data.uscite.length === 0) &&
                      (!data.risparmio || data.risparmio.length === 0) &&
                      (!data.patrimonio || data.patrimonio.length === 0);

      // Collegamento a un foglio vuoto (es. appena creato manualmente dall'utente su
      // Google Drive) vs collegamento a un foglio che ha già dei dati: nel primo caso
      // si "semina" il foglio remoto con i dati locali correnti (push); nel secondo
      // si considera il foglio remoto come sorgente di verità e si scaricano i suoi
      // dati in locale (pull), sovrascrivendo localStorage tramite saveToLocalStorage.
      if (isEmpty) {
        // Automatically upload current local dashboard state to populate the new sheet
        const currentLocalData = getExportableData();
        await pushSpreadsheetData(accessToken, targetId, currentLocalData);
        setSuccessMsg('Foglio Google collegato e sincronizzato con successo con i tuoi dati locali!');
      } else {
        // Pull existing data to local storage
        saveToLocalStorage(data);
        bumpVersion(); // segnala al resto dell'app (FinanceDataContext) di rileggere i dati aggiornati
        setSuccessMsg('Foglio Google collegato correttamente! Dati sincronizzati.');
      }

      onRefreshCompleted();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Impossibile collegare: ${err?.message || 'verifica i permessi del foglio o l\'ID'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (!accessToken) {
      setErrorMsg('Autenticazione mancante. Esci e rientra.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create Spreadsheet
      const newId = await createSpreadsheet(accessToken);

      // 2. Initial Export of local state to the new sheet
      // getExportableData() senza argomenti usa il default incognito=false: qui va
      // sempre bene, perché anche se l'utente sta guardando i dati demo, questo è un
      // push reale verso un foglio Google reale e deve contenere i dati veri (vedi
      // nota in CLAUDE.md: questo default NON va mai cambiato o reso automatico).
      const currentLocalData = getExportableData();
      await pushSpreadsheetData(accessToken, newId, currentLocalData);

      // 3. Save the spreadsheet ID
      localStorage.setItem('sf_spreadsheet_id', newId);
      setSheetId(newId);
      setInputUrl(`https://docs.google.com/spreadsheets/d/${newId}/edit`);
      
      setSuccessMsg('Nuovo foglio di lavoro "StarFinance" creato con successo nel tuo Google Drive!');
      bumpVersion();
      onRefreshCompleted();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Errore durante la creazione: ${err?.message || 'riprova più tardi'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushData = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (!sheetId) {
      setErrorMsg('Collega prima un foglio Google.');
      return;
    }
    
    if (!accessToken) {
      setErrorMsg('Autenticazione mancante.');
      return;
    }

    // Non esegue subito il push: apre solo il banner di conferma "Attenzione
    // Sovrascrittura" (vedi JSX più sotto). L'upload vero parte da executePushData,
    // chiamata solo dopo che l'utente conferma esplicitamente.
    setShowConfirmPush(true);
    setShowConfirmDisconnect(false);
  };

  const executePushData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const currentData = getExportableData();
      await pushSpreadsheetData(accessToken!, sheetId, currentData);
      setSuccessMsg('Dati caricati su Google Sheets con successo!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Errore durante il caricamento: ${err?.message || 'sconosciuto'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullData = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (!sheetId) {
      setErrorMsg('Collega prima un foglio Google.');
      return;
    }
    
    if (!accessToken) {
      setErrorMsg('Autenticazione mancante.');
      return;
    }

    setIsLoading(true);
    try {
      const remoteData = await fetchSpreadsheetData(accessToken, sheetId);
      saveToLocalStorage(remoteData);
      bumpVersion();
      setSuccessMsg('Dati scaricati da Google Sheets con successo!');
      onRefreshCompleted();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Errore durante il download: ${err?.message || 'sconosciuto'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowConfirmDisconnect(true);
    setShowConfirmPush(false);
  };

  // Scollegare NON cancella nulla sul foglio Google né in localStorage (sf_transactions
  // ecc.): rimuove solo il riferimento sf_spreadsheet_id, cioè l'app "dimentica" a
  // quale foglio era collegata. I dati locali già scaricati restano intatti.
  const executeDisconnect = () => {
    localStorage.removeItem('sf_spreadsheet_id');
    setSheetId('');
    setInputUrl('');
    setSuccessMsg('Foglio Google scollegato correttamente.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-105 w-full max-w-lg overflow-hidden shrink-0 z-50 text-slate-800"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-bold font-display text-slate-800 text-base">Integrazione Google Sheets</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sincronizza le tue finanze con un foglio Google</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-xs text-rose-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Connected State vs Setup State */}
          {sheetId ? (
            <div className="space-y-4">
              <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="flex justify-between items-start">
                  <div className="text-left">
                    <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
                      Collegamento Attivo
                    </span>
                    <h4 className="text-sm font-semibold text-slate-800 mt-2 flex items-center gap-1.5 font-display">
                      <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-500" />
                      StarFinance - Dashboard Economica
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-1 select-all truncate max-w-xs sm:max-w-md">
                      ID: {sheetId}
                    </p>
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noreferrer"
                    className="w-9 h-9 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-400 rounded-xl flex items-center justify-center transition-all shadow-xs shrink-0"
                    title="Apri su Google Sheets"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Custom Confirmation Warning for Upload (Overwrite) */}
              {showConfirmPush && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    ⚠️ Attenzione Sovrascrittura
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vuoi davvero sovrascrivere il foglio Google Sheets con i tuoi attuali dati locali? Le modifiche precedenti sul foglio verranno perse per sempre.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPush(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        executePushData();
                        setShowConfirmPush(false);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Sì, Sovrascrivi
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Confirmation Warning for Disconnect */}
              {showConfirmDisconnect && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-left space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    ⚠️ Scollega Google Sheets
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vuoi davvero scollegare il foglio Google Sheets corrente? Perderai la sincronizzazione dei dati con il cloud.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDisconnect(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        executeDisconnect();
                        setShowConfirmDisconnect(false);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Sì, Scollega
                    </button>
                  </div>
                </div>
              )}

              {/* Sync controls */}
              {!showConfirmPush && !showConfirmDisconnect && (
                <>
                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={handlePullData}
                      disabled={isLoading}
                      className="p-4 bg-white hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-2xl transition-all font-semibold text-xs flex flex-col items-center justify-center text-indigo-600 cursor-pointer shadow-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mb-2" />
                      ) : (
                        <DownloadCloud className="w-5 h-5 mb-2" />
                      )}
                      <span>Scarica da Sheets</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePushData}
                      disabled={isLoading}
                      className="p-4 bg-white hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-2xl transition-all font-semibold text-xs flex flex-col items-center justify-center text-emerald-600 cursor-pointer shadow-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mb-2" />
                      ) : (
                        <UploadCloud className="w-5 h-5 mb-2" />
                      )}
                      <span>Carica su Sheets</span>
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="w-full text-slate-400 hover:text-red-500 text-xs font-semibold py-2 transition-colors cursor-pointer text-center"
                    >
                      Scollega questo foglio di calcolo
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Option A: Quick Template Auto-Creator */}
              <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 border border-slate-100 rounded-2xl text-left">
                <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
                  Creazione Automatica Rapida
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Crea un nuovo foglio StarFinance formattato ed esporta all'istante i dati di esempio correnti per iniziare subito.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isLoading}
                  className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Crea nuovo foglio finanza
                </button>
              </div>

              {/* Divisor line */}
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="h-px bg-slate-100 flex-1" />
                <span className="font-mono text-[10px] tracking-widest uppercase">Oppure</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              {/* Option B: Input Existing ID/URL */}
              <form onSubmit={handleConnectExisting} className="space-y-3.5 text-left">
                <div>
                  <label htmlFor="sheetUrl" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Collega foglio Google esistente
                  </label>
                  <div className="relative">
                    <input
                      id="sheetUrl"
                      type="text"
                      placeholder="Incolla l'URL o l'ID del foglio Google..."
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      disabled={isLoading}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-3.5 pr-10 text-xs transition-all outline-hidden font-mono"
                    />
                    <Link2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    Puoi incollare l'intero indirizzo della barra di navigazione del tuo foglio di calcolo, ad esempio:<br />
                    <span className="font-mono text-indigo-500 select-all">https://docs.google.com/spreadsheets/d/...ID.../edit</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4.5 h-4.5" />
                  )}
                  Associa foglio esistente
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>StarFinance Engine v2</span>
          <span>Google Drive API v3</span>
        </div>
      </motion.div>
    </div>
  );
}
