/**
 * Pagina "Impostazioni": permette di collegare lo Spreadsheet Google (ID salvato in localStorage,
 * chiave "sf_spreadsheet_id"), avviare una sincronizzazione manuale e scegliere il tema (chiaro/scuro).
 * Questa pagina NON possiede lo stato di tema/sincronizzazione/logout: li riceve come props da
 * App.tsx (theme, setTheme, onRefreshData, isRefreshing, onLogout), che è il vero "proprietario"
 * di questo stato applicativo (vedi CLAUDE.md: le UI-filter state vivono in App.tsx, non nel
 * FinanceDataContext). L'ID dello spreadsheet è l'unico dato che questa pagina legge/scrive
 * direttamente su localStorage (non è un dato finanziario, quindi non passa da saveToLocalStorage).
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Database,
  ExternalLink,
  Moon,
  Sun,
  RefreshCw,
  Check,
  Save,
  LogOut,
  ChevronDown
} from 'lucide-react';
import DatiBaseSettings from '../components/impostazioni/DatiBaseSettings';
import PresetRicorrentiSettings from '../components/impostazioni/PresetRicorrentiSettings';

interface ImpostazioniProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onLogout?: () => void;
}

export default function Impostazioni({
  theme,
  setTheme,
  onRefreshData,
  isRefreshing = false,
  onLogout
}: ImpostazioniProps) {
  // Stato iniziale letto una sola volta da localStorage (funzione lazy passata a useState);
  // se non c'è ancora un ID salvato si usa lo spreadsheet di default del progetto.
  const [spreadsheetId, setSpreadsheetId] = useState(() => {
    return localStorage.getItem('sf_spreadsheet_id') || '1xfDnJX-Rx0F8d03ituBTY7HRp1Mw4FCjy4rEueTg9YA';
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Salva l'ID inserito nel form e mostra per 3 secondi la spunta di conferma.
  const handleSaveSpreadsheet = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sf_spreadsheet_id', spreadsheetId.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Secondo foglio, opzionale: contiene i dati di configurazione (categorie, conti, soglie, preset...).
  const [configSpreadsheetId, setConfigSpreadsheetId] = useState(() => {
    return localStorage.getItem('sf_config_spreadsheet_id') || '';
  });
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Le due sezioni di collegamento fogli sono collassabili per guadagnare spazio
  // verticale nella card: quella principale parte aperta (uso frequente), quella
  // di configurazione parte chiusa (opzionale, meno usata).
  const [mainSectionOpen, setMainSectionOpen] = useState(true);
  const [configSectionOpen, setConfigSectionOpen] = useState(false);

  const handleSaveConfigSpreadsheet = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = configSpreadsheetId.trim();
    if (trimmed) {
      localStorage.setItem('sf_config_spreadsheet_id', trimmed);
    } else {
      localStorage.removeItem('sf_config_spreadsheet_id');
    }
    setConfigSaveSuccess(true);
    setTimeout(() => setConfigSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-800 dark:text-white leading-tight">
            Impostazioni
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Personalizza l'applicazione e gestisci il collegamento con Google Sheets
          </p>
        </div>
      </div>

      {/* Logout - only shown on mobile, desktop already has it in the sidebar */}
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="md:hidden w-full px-4 py-3 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all flex items-center justify-center gap-2 border border-rose-100 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Scollegati
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Sheets Configuration Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-lg font-display text-slate-800">
                Collegamento Google Sheets
              </h3>
            </div>
            
            <button
              type="button"
              onClick={() => setMainSectionOpen(o => !o)}
              className="w-full flex items-center justify-between gap-2 cursor-pointer"
            >
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Foglio Principale</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mainSectionOpen ? 'rotate-180' : ''}`} />
            </button>

            {mainSectionOpen && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Inserisci l'ID del foglio Google Sheets contenente i tuoi dati finanziari. Assicurati che l'app abbia i permessi di accesso.
                </p>

                <form onSubmit={handleSaveSpreadsheet} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                      Spreadsheet ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={spreadsheetId}
                        onChange={(e) => setSpreadsheetId(e.target.value)}
                        placeholder="Inserisci l'ID del foglio..."
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        {saveSuccess ? (
                          <Check className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {saveSuccess && (
                  <p className="text-[11px] text-emerald-500 font-semibold mt-2 flex items-center gap-1 animate-fadeIn">
                    <Check className="w-3.5 h-3.5" /> ID salvato correttamente in locale.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfigSectionOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Foglio di Configurazione (opzionale)</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${configSectionOpen ? 'rotate-180' : ''}`} />
              </button>

              {configSectionOpen && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Un secondo foglio Google Sheets separato, con i dati di configurazione (categorie, conti, soglie, preset ricorrenti...).
                  </p>
                  <form onSubmit={handleSaveConfigSpreadsheet} className="flex gap-2">
                    <input
                      type="text"
                      value={configSpreadsheetId}
                      onChange={(e) => setConfigSpreadsheetId(e.target.value)}
                      placeholder="Inserisci l'ID del foglio di configurazione..."
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {configSaveSuccess ? (
                        <Check className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                  {configSaveSuccess && (
                    <p className="text-[11px] text-emerald-500 font-semibold mt-2 flex items-center gap-1 animate-fadeIn">
                      <Check className="w-3.5 h-3.5" /> ID salvato correttamente in locale.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              Apri su Google Sheets
            </a>

            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                disabled={isRefreshing}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Sincronizza Ora
              </button>
            )}
          </div>
        </div>

        {/* Theme Configuration Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
            <h3 className="font-bold text-lg font-display text-slate-800">
              Tema Grafico
            </h3>
          </div>

          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Scegli il tema grafico dell'applicazione. Il tema scuro offre la visualizzazione "Glassmorphic" con contrasti neon, mentre il tema chiaro offre un layout minimalista classico e luminoso.
          </p>

          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Dark Theme Selection Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-slate-900/60 shadow-md shadow-indigo-500/5'
                  : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
              }`}
            >
              {/* Inner preview card graphics */}
              <div className="w-full h-20 rounded-lg bg-[#060a13] p-2 flex flex-col justify-between border border-slate-800 mb-4 select-none pointer-events-none">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <div className="w-full h-8 rounded-md bg-white/5 border border-white/10 flex items-center px-2">
                  <div className="w-8 h-2 rounded bg-indigo-500/50" />
                </div>
              </div>

              <div className="flex items-center justify-between w-full">
                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-600'}`}>
                  Scuro (Vetro)
                </span>
                {theme === 'dark' && (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            </button>

            {/* Light Theme Selection Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                theme === 'light'
                  ? 'border-indigo-500 bg-slate-50 shadow-md shadow-indigo-500/5'
                  : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
              }`}
            >
              {/* Inner preview card graphics */}
              <div className="w-full h-20 rounded-lg bg-slate-50 p-2 flex flex-col justify-between border border-slate-200 mb-4 select-none pointer-events-none">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <div className="w-full h-8 rounded-md bg-white border border-slate-100 flex items-center px-2 shadow-xs">
                  <div className="w-8 h-2 rounded bg-indigo-600" />
                </div>
              </div>

              <div className="flex items-center justify-between w-full">
                <span className={`text-sm font-bold ${theme === 'light' ? 'text-indigo-600' : 'text-slate-600'}`}>
                  Chiaro
                </span>
                {theme === 'light' && (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DatiBaseSettings />
        <PresetRicorrentiSettings />
      </div>
    </div>
  );
}
