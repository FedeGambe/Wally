/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

import Panoramica from './pages/Panoramica';
import Entrate from './pages/Entrate';
import Uscite from './pages/Uscite';
import Patrimonio from './pages/Patrimonio';
import Investimenti from './pages/Investimenti';
import AnalisiConsumi from './pages/AnalisiConsumi';
import Impostazioni from './pages/Impostazioni';

import { initAuth, logout } from './lib/googleAuth';
import { getExportableData } from './data/mockData';

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Sincronizzazione state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Layout View & Filters State
  const [activeView, setActiveView] = useState('panoramica');
  const [selectedYear, setSelectedYear] = useState(() => {
    const data = getExportableData();
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
    const data = getExportableData();
    const today = new Date();
    const currentYear = today.getFullYear();
    const MESI_ITALIANI = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
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

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('sf_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('sf_theme', newTheme);
  };

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

  const handleRefreshData = async () => {
    const savedId = localStorage.getItem('sf_spreadsheet_id');
    if (!savedId) {
      setIsSheetsModalOpen(true);
      return;
    }

    if (!accessToken) {
      setSyncError('Autenticazione scaduta. Per favore effettua di nuovo l\'accesso.');
      setTimeout(() => setSyncError(null), 5000);
      handleLogout();
      return;
    }

    setIsRefreshing(true);
    setSyncError(null);
    try {
      const { fetchSpreadsheetData } = await import('./lib/sheetsService');
      const { saveToLocalStorage } = await import('./data/mockData');
      const remoteData = await fetchSpreadsheetData(accessToken, savedId);
      saveToLocalStorage(remoteData);
      
      setIsRefreshing(false);
      setRefreshKey(prev => prev + 1);
      setShowRefreshToast(true);
      setTimeout(() => {
        setShowRefreshToast(false);
      }, 4000);
    } catch (err: any) {
      console.error(err);
      const isUnauth = err?.message?.includes('UNAUTHENTICATED') || 
                       err?.message?.toLowerCase().includes('authentication credentials') || 
                       err?.message?.includes('401');
      if (isUnauth) {
        setSyncError('La sessione di Google è scaduta. Effettua nuovamente il login per ricollegare il tuo account.');
        setTimeout(() => setSyncError(null), 8000);
        handleLogout();
      } else {
        setSyncError(`Impossibile sincronizzare Google Sheets: ${err?.message || 'verifica permessi'}`);
        setTimeout(() => setSyncError(null), 6000);
      }
      setIsRefreshing(false);
    }
  };

  // Sincronizzazione automatica all'avvio / login
  useEffect(() => {
    if (isLoggedIn && accessToken) {
      handleRefreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, accessToken]);

  // Auto-correct selectedMonth when selectedYear or refreshed data changes
  useEffect(() => {
    const data = getExportableData();
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
  }, [selectedYear, selectedMonth, refreshKey]);

  // Switch Active View Layouts
  const renderActiveView = () => {
    switch (activeView) {
      case 'panoramica':
        return (
          <Panoramica
            sheetsData={getExportableData()}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        );
      case 'entrate':
        return (
          <Entrate
            sheetsData={getExportableData()}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        );
      case 'uscite':
        return (
          <Uscite
            sheetsData={getExportableData()}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        );
      case 'patrimonio':
        return <Patrimonio sheetsData={getExportableData()} />;
      case 'investimenti':
        return (
          <Investimenti
            sheetsData={getExportableData()}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            theme={theme}
          />
        );
      case 'consumi':
        return <AnalisiConsumi sheetsData={getExportableData()} />;
      case 'impostazioni':
        return (
          <Impostazioni
            theme={theme}
            setTheme={toggleTheme}
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
          />
        );
      default:
        return (
          <Panoramica
            sheetsData={getExportableData()}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        );
    }
  };

  return (
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
            {/* Sidebar Navigation */}
            <Sidebar
              activeView={activeView}
              setActiveView={setActiveView}
              userEmail={userEmail}
              userPhoto={userPhoto}
              userDisplayName={userDisplayName}
              onLogout={handleLogout}
              onRefreshData={handleRefreshData}
              isRefreshing={isRefreshing}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={handleSetSidebarCollapsed}
            />

            {/* Main Stage Panel Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              {/* Top Header navbar */}
              <Header
                key={refreshKey}
                userEmail={userEmail}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
              />

              {/* View Section Panels scrollable */}
              <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView + selectedYear + refreshKey}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    {renderActiveView()}
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
                setRefreshKey(prev => prev + 1);
                setShowRefreshToast(true);
                setTimeout(() => setShowRefreshToast(false), 4000);
              }}
            />

            {/* Mobile Bottom Navigation Bar styled dynamically per active tab color */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center h-16 px-2 select-none shadow-lg">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
