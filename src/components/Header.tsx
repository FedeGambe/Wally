import React, { useState, useMemo } from 'react';
import { Sparkles, Calendar, Search, Bell, Database, ChevronDown, Sliders, Sun, CloudSun, Moon, Eye, EyeOff } from 'lucide-react';
import { useFinanceData } from '../context/FinanceDataContext';
import { MESI_ITALIANI } from '../utils/date';

interface HeaderProps {
  key?: React.Key;
  userEmail: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenMobileSettings?: () => void;
}

export default function Header({
  userEmail,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  onOpenMobileSettings
}: HeaderProps) {
  const { data, isIncognito, toggleIncognito } = useFinanceData();
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  // Dynamic greeting based on the time of day
  const { greeting, greetingIcon: GreetingIcon } = useMemo(() => {
    const hour = new Date().getHours();
    let name = 'Federico';
    if (userEmail && userEmail !== 'federico.gamberini.fg@gmail.com') {
      const namePart = userEmail.split('@')[0];
      const firstWord = namePart.split('.')[0];
      name = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    }

    let base = 'Buongiorno';
    let icon = Sun;

    if (hour >= 13 && hour < 18) {
      base = 'Buon pomeriggio';
      icon = CloudSun;
    } else if (hour >= 18 && hour < 24) {
      base = 'Buonasera';
      icon = Moon;
    } else if (hour >= 0 && hour < 6) {
      base = 'Buonanotte';
      icon = Moon;
    }

    return { greeting: `${base}, ${name}!`, greetingIcon: icon };
  }, [userEmail]);

  const localRisparmio = data.risparmio;
  const localEntrate = data.entrate;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    // Ensure current year is always available
    years.add(new Date().getFullYear());
    if (localRisparmio) {
      localRisparmio.forEach((r: any) => { if (r.anno) years.add(r.anno); });
    }
    if (localEntrate) {
      localEntrate.forEach((e: any) => { if (e.anno) years.add(e.anno); });
    }
    const sortedYears = Array.from(years).sort((a, b) => b - a); // descending
    return sortedYears.map(String);
  }, [localRisparmio, localEntrate]);

  const hasAnyDataForSelectedYear = useMemo(() => {
    const yearNum = parseInt(selectedYear, 10);
    const hasRisparmio = localRisparmio?.some((r: any) => r.anno === yearNum);
    const hasEntrate = localEntrate?.some((e: any) => e.anno === yearNum);
    return hasRisparmio || hasEntrate;
  }, [selectedYear, localRisparmio, localEntrate]);

  const isMonthAvailable = (monthName: string) => {
    if (!hasAnyDataForSelectedYear) return true; // fallback if year has no records
    const monthLower = monthName.toLowerCase().trim();
    const yearNum = parseInt(selectedYear, 10);
    const hasInRisparmio = localRisparmio?.some(
      (r: any) => r.anno === yearNum && r.mese?.toLowerCase().trim() === monthLower
    );
    const hasInEntrate = localEntrate?.some(
      (e: any) => e.anno === yearNum && e.mese?.toLowerCase().trim() === monthLower
    );
    return hasInRisparmio || hasInEntrate;
  };

  const formattedDate = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex flex-row items-center justify-between px-3 sm:px-6 md:px-8 gap-2 sticky top-0 z-40 shrink-0 w-full">
      {/* Dynamic Greeting based on time of day - on mobile, doubles as shortcut to Impostazioni */}
      <button
        type="button"
        onClick={onOpenMobileSettings}
        className="flex items-center gap-2 text-left min-w-0 cursor-pointer md:cursor-default md:pointer-events-none"
      >
        <GreetingIcon className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
        <span className="text-xs sm:text-sm font-extrabold font-display text-slate-850 tracking-tight">
          {greeting}
        </span>
      </button>

      {/* Action controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Incognito Mode Toggle - shows fictional demo data instead of real data */}
        <button
          onClick={() => toggleIncognito(!isIncognito)}
          title={isIncognito ? 'Disattiva modalità incognito (torna ai dati reali)' : 'Attiva modalità incognito (mostra dati fittizi)'}
          className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition-all cursor-pointer border ${
            isIncognito
              ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'
              : 'bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-slate-100 text-slate-600'
          }`}
        >
          {isIncognito ? <EyeOff className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /> : <Eye className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 shrink-0" />}
          <span className="hidden md:inline">{isIncognito ? 'Demo' : 'Incognito'}</span>
        </button>

        {/* Year Selector Dropdown */}
        <div className="relative select-none shrink-0">
          <button
            onClick={() => {
              setIsYearDropdownOpen(!isYearDropdownOpen);
              setIsMonthDropdownOpen(false);
            }}
            className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-slate-600 transition-all cursor-pointer"
          >
            <Database className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 shrink-0" />
            <span>
              <span className="hidden md:inline">Esercizio: </span>
              <strong className="text-blue-600">{selectedYear}</strong>
            </span>
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
          </button>

          {isYearDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-32 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 animate-fadeIn">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsYearDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 text-left text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    selectedYear === year
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Month Selector dropdown */}
        <div className="relative select-none shrink-0">
          <button
            onClick={() => {
              setIsMonthDropdownOpen(!isMonthDropdownOpen);
              setIsYearDropdownOpen(false);
            }}
            className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-slate-600 transition-all cursor-pointer"
          >
            <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 shrink-0" />
            <span>
              <span className="hidden md:inline">Mese: </span>
              <strong className="text-indigo-600 capitalize">
                <span className="inline sm:hidden">{selectedMonth.substring(0, 3)}</span>
                <span className="hidden sm:inline">{selectedMonth}</span>
              </strong>
            </span>
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
          </button>
          
          {isMonthDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 grid grid-cols-2 gap-1 animate-fadeIn">
              {MESI_ITALIANI.map((m) => {
                const available = isMonthAvailable(m);
                return (
                  <button
                    key={m}
                    disabled={!available}
                    onClick={() => {
                      if (available) {
                        setSelectedMonth(m);
                        setIsMonthDropdownOpen(false);
                      }
                    }}
                    className={`px-2 py-1.5 text-left text-[11px] font-bold rounded-lg transition-all ${
                      !available
                        ? 'text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-50'
                        : selectedMonth.toLowerCase() === m.toLowerCase()
                        ? 'bg-indigo-50 text-indigo-700 cursor-pointer'
                        : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Real Date Indicator - Click to set current Month/Year */}
        <button
          onClick={() => {
            const today = new Date();
            const currentYear = today.getFullYear().toString();
            const currentMonth = MESI_ITALIANI[today.getMonth()];
            setSelectedYear(currentYear);
            setSelectedMonth(currentMonth);
          }}
          title="Imposta data odierna come filtro globale"
          className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-indigo-50/30 hover:text-indigo-600 hover:border-indigo-200 active:bg-indigo-100 border border-slate-100 px-3.5 py-1.5 rounded-xl text-xs text-slate-600 shrink-0 transition-all duration-200 hover:scale-[1.02] active:scale-98 cursor-pointer shadow-xs hover:shadow-sm"
        >
          <Calendar className="w-4 h-4 text-blue-500 transition-transform duration-200 group-hover:scale-110" />
          <span className="font-semibold capitalize">{formattedDate}</span>
        </button>
      </div>
    </header>
  );
}
