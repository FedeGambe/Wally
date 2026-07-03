import React, { useState, useMemo } from 'react';
import { Sparkles, Calendar, Search, Bell, Database, ChevronDown, Sliders, Sun, CloudSun, Moon } from 'lucide-react';
import { RISPARMIO_DATA, ENTRATE_LIST } from '../data/mockData';

interface HeaderProps {
  key?: React.Key;
  userEmail: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenSheetsModal?: () => void;
}

export default function Header({
  userEmail,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  onOpenSheetsModal
}: HeaderProps) {
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

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    // Ensure current year is always available
    years.add(new Date().getFullYear());
    if (RISPARMIO_DATA) {
      RISPARMIO_DATA.forEach(r => { if (r.anno) years.add(r.anno); });
    }
    if (ENTRATE_LIST) {
      ENTRATE_LIST.forEach(e => { if (e.anno) years.add(e.anno); });
    }
    const sortedYears = Array.from(years).sort((a, b) => b - a); // descending
    return sortedYears.map(String);
  }, []);

  const hasAnyDataForSelectedYear = useMemo(() => {
    const yearNum = parseInt(selectedYear, 10);
    const hasRisparmio = RISPARMIO_DATA?.some(r => r.anno === yearNum);
    const hasEntrate = ENTRATE_LIST?.some(e => e.anno === yearNum);
    return hasRisparmio || hasEntrate;
  }, [selectedYear]);

  const isMonthAvailable = (monthName: string) => {
    if (!hasAnyDataForSelectedYear) return true; // fallback if year has no records
    const monthLower = monthName.toLowerCase().trim();
    const yearNum = parseInt(selectedYear, 10);
    const hasInRisparmio = RISPARMIO_DATA?.some(
      r => r.anno === yearNum && r.mese?.toLowerCase().trim() === monthLower
    );
    const hasInEntrate = ENTRATE_LIST?.some(
      e => e.anno === yearNum && e.mese?.toLowerCase().trim() === monthLower
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
      {/* Dynamic Greeting based on time of day */}
      <div className="flex items-center gap-2 text-left min-w-0">
        <GreetingIcon className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
        <span className="text-xs sm:text-sm font-extrabold font-display text-slate-850 tracking-tight">
          {greeting}
        </span>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
              {['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'].map((m) => {
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
            const MESI_ITALIANI = [
              'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
              'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
            ];
            const currentMonth = MESI_ITALIANI[today.getMonth()];
            setSelectedYear(currentYear);
            setSelectedMonth(currentMonth);
          }}
          title="Imposta data odierna come filtro globale"
          className="hidden lg:flex items-center gap-2 bg-slate-50/820 hover:bg-indigo-50/30 hover:text-indigo-600 hover:border-indigo-200 active:bg-indigo-100 border border-slate-100 px-3.5 py-1.5 rounded-xl text-xs text-slate-600 shrink-0 transition-all duration-200 hover:scale-[1.02] active:scale-98 cursor-pointer shadow-xs hover:shadow-sm"
        >
          <Calendar className="w-4 h-4 text-blue-500 transition-transform duration-200 group-hover:scale-110" />
          <span className="font-semibold capitalize">{formattedDate}</span>
        </button>
      </div>
    </header>
  );
}
