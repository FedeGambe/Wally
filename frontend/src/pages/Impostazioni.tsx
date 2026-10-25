/**
 * Pagina "Impostazioni": permette di collegare lo Spreadsheet Google (ID salvato in localStorage,
 * chiave "sf_spreadsheet_id"), avviare una sincronizzazione manuale e scegliere il tema (chiaro/scuro).
 * Questa pagina NON possiede lo stato di tema/sincronizzazione/logout: li riceve come props da
 * App.tsx (theme, setTheme, onRefreshData, isRefreshing, onLogout), che è il vero "proprietario"
 * di questo stato applicativo (vedi docs/FRONTEND.md: le UI-filter state vivono in App.tsx, non nel
 * FinanceDataContext). L'ID dello spreadsheet è l'unico dato che questa pagina legge/scrive
 * direttamente su localStorage (non è un dato finanziario, quindi non passa da saveToLocalStorage).
 */
import React, { useEffect, useRef, useState } from 'react';
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
  ChevronDown,
  Tags,
  Repeat,
  Landmark
} from 'lucide-react';
import DatiBaseSettings from '../components/impostazioni/DatiBaseSettings';
import PresetRicorrentiSettings from '../components/impostazioni/PresetRicorrentiSettings';
import BancheCollegateSettings from '../components/impostazioni/BancheCollegateSettings';
import { useIsMobile } from '../hooks/useIsMobile';

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
    return localStorage.getItem('sf_spreadsheet_id') || import.meta.env.VITE_DEFAULT_SPREADSHEET_ID || '';
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
  // verticale nella card: partono entrambe chiuse (gli ID si impostano una volta sola).
  const [mainSectionOpen, setMainSectionOpen] = useState(false);
  const [configSectionOpen, setConfigSectionOpen] = useState(false);

  // Telefono (sotto "md", come la barra in basso): elenco di voci a fisarmonica.
  const isMobile = useIsMobile(768);
  const [voceAperta, setVoceAperta] = useState<string | null>(null);
  const vociRef = useRef<Record<string, HTMLDivElement | null>>({});
  // Aprendo una voce, la porta in cima: chiudendo quella sopra la pagina si sposterebbe.
  useEffect(() => {
    if (voceAperta) vociRef.current[voceAperta]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [voceAperta]);

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

  const sheetsContent = (
    <>
      <div>
        {!isMobile && (
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-accent" />
          <h2 className="font-bold text-lg font-display text-ink">
            Collegamento Google Sheets
          </h2>
        </div>
        )}
        <button
          type="button"
          onClick={() => setMainSectionOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 cursor-pointer"
        >
          <span className="text-2xs font-bold text-ink-soft uppercase tracking-wider">Foglio Principale</span>
          <ChevronDown className={`w-4 h-4 text-ink-soft transition-transform ${mainSectionOpen ? 'rotate-180' : ''}`} />
        </button>

        {mainSectionOpen && (
          <div className="mt-3">
            <p className="text-xs text-ink-soft mb-4 leading-relaxed">
              Inserisci l'ID del foglio Google Sheets contenente i tuoi dati finanziari. Assicurati che l'app abbia i permessi di accesso.
            </p>

            <form onSubmit={handleSaveSpreadsheet} className="space-y-3">
              <div>
                <label className="block text-2xs font-bold text-ink-soft uppercase mb-1.5 tracking-wider">
                  ID del foglio
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="Inserisci l'ID del foglio..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-hairline bg-canvas focus:outline-hidden focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-accent-strong hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
              <p className="text-2xs text-up font-semibold mt-2 flex items-center gap-1 animate-fadeIn">
                <Check className="w-3.5 h-3.5" /> ID salvato correttamente in locale.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-hairline">
          <button
            type="button"
            onClick={() => setConfigSectionOpen(o => !o)}
            className="w-full flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-2xs font-bold text-ink-soft uppercase tracking-wider">Foglio di Configurazione (opzionale)</span>
            <ChevronDown className={`w-4 h-4 text-ink-soft transition-transform ${configSectionOpen ? 'rotate-180' : ''}`} />
          </button>

          {configSectionOpen && (
            <div className="mt-3">
              <p className="text-xs text-ink-soft mb-3 leading-relaxed">
                Un secondo foglio Google Sheets separato, con i dati di configurazione (categorie, conti, soglie, preset ricorrenti...).
              </p>
              <form onSubmit={handleSaveConfigSpreadsheet} className="flex gap-2">
                <input
                  type="text"
                  value={configSpreadsheetId}
                  onChange={(e) => setConfigSpreadsheetId(e.target.value)}
                  placeholder="Inserisci l'ID del foglio di configurazione..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-hairline bg-canvas focus:outline-hidden focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-accent-strong hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {configSaveSuccess ? (
                    <Check className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </form>
              {configSaveSuccess && (
                <p className="text-2xs text-up font-semibold mt-2 flex items-center gap-1 animate-fadeIn">
                  <Check className="w-3.5 h-3.5" /> ID salvato correttamente in locale.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-hairline flex flex-col sm:flex-row gap-3">
        <a
          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2.5 text-xs font-bold text-ink-soft hover:text-ink bg-canvas hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-2 border border-hairline cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-ink-soft" />
          Apri su Google Sheets
        </a>

        {onRefreshData && (
          <button
            type="button"
            onClick={onRefreshData}
            disabled={isRefreshing}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-accent-strong hover:opacity-90 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sincronizza Ora
          </button>
        )}
      </div>
    </>
  );

  const temaContent = (
    <>
      {!isMobile && (
      <div className="flex items-center gap-2 mb-4">
        {theme === 'dark' ? (
          <Moon className="w-5 h-5 text-accent" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500" />
        )}
        <h2 className="font-bold text-lg font-display text-ink">
          Tema Grafico
        </h2>
      </div>
      )}
      <p className="text-xs text-ink-soft mb-6 leading-relaxed">
        Scuro (vetro) o chiaro: si applica subito a tutta l'app ed è ricordato su questo dispositivo.
      </p>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Dark Theme Selection Card */}
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            theme === 'dark'
              ? 'border-accent bg-slate-900/60 shadow-md shadow-accent/5'
              : 'border-hairline hover:border-hairline bg-canvas/50'
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
              <div className="w-8 h-2 rounded bg-accent/50" />
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <span className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-ink-soft'}`}>
              Scuro (Vetro)
            </span>
            {theme === 'dark' && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white">
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
              ? 'border-accent bg-canvas shadow-md shadow-accent/5'
              : 'border-hairline hover:border-hairline bg-canvas/50'
          }`}
        >
          {/* Inner preview card graphics */}
          <div className="w-full h-20 rounded-lg bg-canvas p-2 flex flex-col justify-between border border-hairline mb-4 select-none pointer-events-none">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="w-full h-8 rounded-md bg-white border border-hairline flex items-center px-2 shadow-xs">
              <div className="w-8 h-2 rounded bg-accent" />
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <span className={`text-sm font-bold ${theme === 'light' ? 'text-accent' : 'text-ink-soft'}`}>
              Chiaro
            </span>
            {theme === 'light' && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
        </button>
      </div>
    </>
  );

  // Su telefono la pagina è un elenco di voci divise in gruppi (Sistema, Collegamenti,
  // Dati): toccandone una si apre sotto con il contenuto (una alla volta), e in fondo
  // c'è il tasto per scollegarsi.
  type Voce = { id: string; label: string; icon: React.ElementType; iconColor: string; content: React.ReactNode };
  const gruppi: { titolo: string; voci: Voce[] }[] = [
    {
      titolo: 'Sistema',
      voci: [
        { id: 'tema', label: 'Aspetto', icon: theme === 'dark' ? Moon : Sun, iconColor: theme === 'dark' ? 'text-accent' : 'text-amber-500', content: temaContent },
      ],
    },
    {
      titolo: 'Collegamenti',
      voci: [
        { id: 'sheets', label: 'Google Sheets', icon: Database, iconColor: 'text-accent', content: sheetsContent },
        { id: 'banche', label: 'Banche collegate', icon: Landmark, iconColor: 'text-accent', content: <BancheCollegateSettings compatto /> },
      ],
    },
    {
      titolo: 'Dati',
      voci: [
        { id: 'datiBase', label: 'Dati base', icon: Tags, iconColor: 'text-accent', content: <DatiBaseSettings compatto /> },
        { id: 'preset', label: 'Preset uscite ricorrenti', icon: Repeat, iconColor: 'text-accent', content: <PresetRicorrentiSettings compatto /> },
      ],
    },
  ];

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl ${'bg-accent/15 text-accent'}`}>
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-display text-ink dark:text-white leading-tight">
            Impostazioni
          </h1>
          <p className="text-sm text-ink-soft dark:text-slate-400">
            Personalizza l'applicazione e gestisci il collegamento con Google Sheets
          </p>
        </div>
      </div>

      {isMobile ? (
        <>
          {gruppi.map(g => (
          <section key={g.titolo} className="space-y-2">
          <h2 className="px-4 text-2xs font-bold text-ink-soft uppercase tracking-wider">{g.titolo}</h2>
          <div className="bg-white rounded-3xl border border-hairline shadow-sm overflow-hidden">
            {g.voci.map(v => {
              const Icon = v.icon;
              const aperta = voceAperta === v.id;
              return (
                <div key={v.id} ref={el => { vociRef.current[v.id] = el; }} className="scroll-mt-20">
                  <button
                    type="button"
                    aria-expanded={aperta}
                    onClick={() => setVoceAperta(aperta ? null : v.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-xl bg-canvas flex items-center justify-center shrink-0 ${v.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-bold text-ink truncate">{v.label}</span>
                    <ChevronDown className={`w-4 h-4 text-ink-soft shrink-0 transition-transform ${aperta ? 'rotate-180' : ''}`} />
                  </button>
                  {aperta && <div className="px-4 pb-5 pt-1">{v.content}</div>}
                </div>
              );
            })}
          </div>
          </section>
          ))}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full px-4 py-3 text-sm font-bold text-down bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all flex items-center justify-center gap-2 border border-rose-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Scollegati
            </button>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Sheets Configuration Card */}
            <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm flex flex-col justify-between">
              {sheetsContent}
            </div>

            {/* Theme Configuration Card */}
            <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm flex flex-col">
              {temaContent}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DatiBaseSettings />
            <PresetRicorrentiSettings />
            <BancheCollegateSettings />
          </div>
        </>
      )}
    </div>
  );
}
