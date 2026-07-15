/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Componente radice dell'app. Contiene due cose distinte:
 *  1) `App`: gestisce login/logout, tema chiaro/scuro, e lo stato di
 *     filtro (anno/mese selezionati) che va passato "a mano" (via props)
 *     alle pagine perché non fa parte di FinanceDataContext (vedi CLAUDE.md).
 *  2) `DashboardShell`: la UI vera e propria una volta loggati (sidebar,
 *     header, pagina attiva). E' un componente separato perché deve stare
 *     DENTRO <FinanceDataProvider> per poter leggere i dati con
 *     useFinanceData() — se il codice fosse tutto in App non potrebbe farlo,
 *     dato che il provider dei dati è renderizzato da App stesso.
 *
 * Per chi non conosce React: uno `useState` crea una variabile di stato che,
 * quando cambia, fa ridisegnare (re-render) il componente; uno `useEffect`
 * esegue del codice quando il componente viene montato o quando cambiano le
 * variabili elencate nell'array delle dipendenze `[...]` alla fine.
 * Vedi docs/GUIDA-REACT-TS.md per una spiegazione più estesa.
 */
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  TrendingUp,
  Fuel,
  Settings
} from 'lucide-react';

// Components & Views
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import SheetsModal from './components/SheetsModal';
import { ErrorBoundary } from './components/ErrorBoundary';

// ponytail: spinner minimale, non serve altro per il breve gap del lazy-load pagina
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full py-24">
      <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

// Pagine caricate on-demand (React.lazy): l'utente vede solo una vista alla volta
// tramite activeView, non serve scaricarle tutte nel bundle iniziale.
const Panoramica = lazy(() => import('./pages/Panoramica'));
const Entrate = lazy(() => import('./pages/Entrate'));
const Uscite = lazy(() => import('./pages/Uscite'));
const Patrimonio = lazy(() => import('./pages/Patrimonio'));
const Investimenti = lazy(() => import('./pages/Investimenti'));
const AnalisiConsumi = lazy(() => import('./pages/AnalisiConsumi'));
const Impostazioni = lazy(() => import('./pages/Impostazioni'));

import { initAuth, logout } from './lib/googleAuth';
import { getExportableData, isIncognitoModeEnabled } from './data/mockData';
import { FinanceDataProvider, useFinanceData } from './context/FinanceDataContext';
import { MESI_ITALIANI } from './utils/date';

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Layout View & Filters State
  const [activeView, setActiveView] = useState('panoramica');
  // Incrementato dal pulsante "data odierna" dell'Header: AnalisiConsumi lo usa per saltare all'ultima settimana nei dati
  const [goToTodaySignal, setGoToTodaySignal] = useState(0);
  const [selectedYear, setSelectedYear] = useState(() => {
    const data = getExportableData(isIncognitoModeEnabled());
    const today = new Date();
    const currentYear = today.getFullYear();

    // Check if the current year exists in the data
    const hasCurrentYear = data.risparmio.some(r => r.anno === currentYear);
    if (hasCurrentYear) {
      return currentYear.toString();
    }

    // Otherwise, find the latest year in the data
    if (data.risparmio.length > 0) {
      const maxYear = Math.max(...data.risparmio.map(r => r.anno || 0));
      if (maxYear > 0) return maxYear.toString();
    }

    return '2026'; // Fallback
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const data = getExportableData(isIncognitoModeEnabled());
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = MESI_ITALIANI[today.getMonth()];

    // Check if current month and year exists
    const hasCurrentMonthAndYear = data.risparmio.some(
      r => r.anno === currentYear && r.mese?.toLowerCase().trim() === currentMonth.toLowerCase().trim()
    );
    if (hasCurrentMonthAndYear) {
      return currentMonth;
    }

    // If not, find the latest month available for the resolved year
    const resolvedYear = data.risparmio.some(r => r.anno === currentYear)
      ? currentYear
      : Math.max(...data.risparmio.map(r => r.anno || 0));

    const yearRecords = data.risparmio.filter(r => r.anno === resolvedYear);
    if (yearRecords.length > 0) {
      const lastRecord = yearRecords[yearRecords.length - 1];
      if (lastRecord && lastRecord.mese) {
        return lastRecord.mese.charAt(0).toUpperCase() + lastRecord.mese.slice(1).toLowerCase();
      }
    }

    return 'Giugno'; // Fallback
  });

  // Sidebar Collapsible State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sf_sidebar_collapsed') === 'true';
  });

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem('sf_sidebar_collapsed', String(collapsed));
  };

  // Tablet range (md-lg): sidebar defaults collapsed to save space; expanding it
  // opens as a temporary overlay (see Sidebar.tsx) instead of pushing the layout.
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const applyTabletDefault = () => {
      setIsTablet(mq.matches);
      if (mq.matches) setIsSidebarCollapsed(true);
    };
    applyTabletDefault();
    mq.addEventListener('change', applyTabletDefault);
    return () => mq.removeEventListener('change', applyTabletDefault);
  }, []);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('sf_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('sf_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Load Auth State Automatically on Load
  useEffect(() => {
    const initialized = localStorage.getItem('sf_spreadsheet_initialized');
    if (!initialized) {
      localStorage.setItem('sf_spreadsheet_id', '1xfDnJX-Rx0F8d03ituBTY7HRp1Mw4FCjy4rEueTg9YA');
      localStorage.setItem('sf_spreadsheet_initialized', 'true');
    }

    const unsubscribe = initAuth(
      (user, token) => {
        setUserEmail(user.email || 'federico.gamberini.fg@gmail.com');
        setUserPhoto(user.photoURL || localStorage.getItem('sf_device_remembered_photo'));
        setUserDisplayName(user.displayName || localStorage.getItem('sf_device_remembered_name'));
        setAccessToken(token);
        setIsLoggedIn(true);
      },
      () => {
        setIsLoggedIn(false);
        setAccessToken(null);
        setUserPhoto(null);
        setUserDisplayName(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = (email: string, token: string, photo?: string | null, name?: string | null) => {
    setUserEmail(email);
    setAccessToken(token);
    setUserPhoto(photo || localStorage.getItem('sf_device_remembered_photo'));
    setUserDisplayName(name || localStorage.getItem('sf_device_remembered_name'));
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUserEmail('');
    setUserPhoto(null);
    setUserDisplayName(null);
    setAccessToken(null);
    setActiveView('panoramica');
  };

  return (
    <ErrorBoundary>
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#060a13] text-slate-100' : 'bg-slate-50 text-slate-800'} antialiased font-sans relative overflow-hidden transition-colors duration-300`}>
      {/* Colorful Floating Blurry Blobs for Glassmorphism depth in Dark theme only */}
      {theme === 'dark' && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[5%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-emerald-500/15 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-[35%] right-[10%] w-[45vw] h-[45vw] rounded-full bg-rose-500/10 blur-[110px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute bottom-[-10%] left-[15%] w-[50vw] h-[50vw] rounded-full bg-sky-500/15 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '14s' }} />
          <div className="absolute top-[15%] left-[40%] w-[35vw] h-[35vw] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '9s' }} />
        </>
      )}

      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <Login onLogin={handleLogin} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'glass-theme' : 'bg-transparent'} relative z-10 w-full`}
          >
            <FinanceDataProvider accessToken={accessToken} onAuthError={handleLogout}>
              <DashboardShell
                theme={theme}
                toggleTheme={toggleTheme}
                activeView={activeView}
                setActiveView={setActiveView}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                goToTodaySignal={goToTodaySignal}
                setGoToTodaySignal={setGoToTodaySignal}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={handleSetSidebarCollapsed}
                isTablet={isTablet}
                userEmail={userEmail}
                userPhoto={userPhoto}
                userDisplayName={userDisplayName}
                accessToken={accessToken}
                onLogout={handleLogout}
              />
            </FinanceDataProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

interface DashboardShellProps {
  theme: 'dark' | 'light';
  toggleTheme: (theme: 'dark' | 'light') => void;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  goToTodaySignal: number;
  setGoToTodaySignal: (updater: (s: number) => number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isTablet: boolean;
  userEmail: string;
  userPhoto: string | null;
  userDisplayName: string | null;
  accessToken: string | null;
  onLogout: () => void;
}

// Renders the logged-in dashboard shell. Lives inside FinanceDataProvider so it (and every
// page it renders) can read live finance data via useFinanceData() instead of prop-drilling.
function DashboardShell({
  theme,
  toggleTheme,
  activeView,
  setActiveView,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  goToTodaySignal,
  setGoToTodaySignal,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isTablet,
  userEmail,
  userPhoto,
  userDisplayName,
  accessToken,
  onLogout
}: DashboardShellProps) {
  const { data, isRefreshing, syncError, refreshData } = useFinanceData();
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  const handleRefreshData = () => {
    const savedId = localStorage.getItem('sf_spreadsheet_id');
    if (!savedId) {
      setIsSheetsModalOpen(true);
      return;
    }
    refreshData();
  };

  // Auto-correct selectedMonth when selectedYear or the live finance data changes
  useEffect(() => {
    const yearNum = parseInt(selectedYear, 10);

    // Check if there are any records for this year
    const yearRecords = data.risparmio.filter(r => r.anno === yearNum);
    if (yearRecords.length === 0) return; // No records, keep current month

    // Check if the currently selected month exists in the new year's records
    const monthLower = selectedMonth.toLowerCase().trim();
    const monthExists = yearRecords.some(r => r.mese?.toLowerCase().trim() === monthLower);

    if (!monthExists) {
      // Find the last available month in this year's records
      const lastRecord = yearRecords[yearRecords.length - 1];
      if (lastRecord && lastRecord.mese) {
        const capitalizedMonth = lastRecord.mese.charAt(0).toUpperCase() + lastRecord.mese.slice(1).toLowerCase();
        setSelectedMonth(capitalizedMonth);
      }
    }
  }, [selectedYear, selectedMonth, data]);

  // Switch Active View Layouts
  const renderActiveView = () => {
    switch (activeView) {
      case 'panoramica':
        return (
          <Panoramica
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            setActiveView={setActiveView}
          />
        );
      case 'entrate':
        return (
          <Entrate
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        );
      case 'uscite':
        return (
          <Uscite
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        );
      case 'patrimonio':
        return <Patrimonio />;
      case 'investimenti':
        return (
          <Investimenti
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            theme={theme}
          />
        );
      case 'consumi':
        return <AnalisiConsumi goToTodaySignal={goToTodaySignal} />;
      case 'impostazioni':
        return (
          <Impostazioni
            theme={theme}
            setTheme={toggleTheme}
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
            onLogout={onLogout}
          />
        );
      default:
        return (
          <Panoramica
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            setActiveView={setActiveView}
          />
        );
    }
  };

  return (
    <>
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        userEmail={userEmail}
        userPhoto={userPhoto}
        userDisplayName={userDisplayName}
        onLogout={onLogout}
        onRefreshData={handleRefreshData}
        isRefreshing={isRefreshing}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isTablet={isTablet}
      />

      {/* Main Stage Panel Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header navbar */}
        <Header
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          onOpenMobileSettings={() => setActiveView('impostazioni')}
          onGoToToday={() => setGoToTodaySignal(s => s + 1)}
        />

        {/* View Section Panels scrollable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto pb-32 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<PageLoadingFallback />}>
                {renderActiveView()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Google Sheets modal configuration drawer */}
      <SheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        accessToken={accessToken}
        onRefreshCompleted={() => {
          setShowRefreshToast(true);
          setTimeout(() => setShowRefreshToast(false), 4000);
        }}
      />

      {/* Mobile Bottom Navigation Bar styled dynamically per active tab color */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-2 select-none shadow-lg">
        {[
          { id: 'panoramica', label: 'Home', icon: LayoutDashboard },
          { id: 'entrate', label: 'Entrate', icon: ArrowUpRight },
          { id: 'uscite', label: 'Uscite', icon: ArrowDownLeft },
          { id: 'patrimonio', label: 'Patr', icon: Coins },
          { id: 'investimenti', label: 'Inv', icon: TrendingUp },
          { id: 'consumi', label: 'Cons', icon: Fuel },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const activeColorMap: { [key: string]: string } = {
            panoramica: 'text-blue-600 font-extrabold',
            entrate: 'text-emerald-600 font-extrabold',
            uscite: 'text-orange-600 font-extrabold',
            patrimonio: 'text-amber-500 font-extrabold',
            investimenti: 'text-sky-500 font-extrabold',
            consumi: 'text-rose-600 font-extrabold'
          };
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all"
            >
              <Icon className={`w-5 h-5 ${isActive ? activeColorMap[item.id] || 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] mt-0.5 tracking-tighter ${isActive ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Refreshing Sync success Toast notification */}
      <AnimatePresence>
        {showRefreshToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3.5 max-w-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-semibold">Sheets Sincronizzato!</h4>
              <p className="text-xs text-slate-400 mt-0.5">Dati scaricati dal foglio 'Finanza' ed elaborati correttamente.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Error Toast notification */}
      <AnimatePresence>
        {syncError && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-rose-950/90 border border-rose-500/30 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl flex items-center gap-3.5 max-w-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h4 className="text-sm font-semibold text-rose-200">Errore Sincronizzazione</h4>
              <p className="text-xs text-rose-300 mt-0.5">{syncError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
