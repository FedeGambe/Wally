import React, { useState, useMemo } from 'react';
import { Calendar, Database, Sliders, Sun, CloudSun, Moon, Eye, EyeOff } from 'lucide-react';
import { useFinanceData } from '../context/FinanceDataContext';
import { MESI_ITALIANI } from '../utils/date';
import DropdownMenu from './DropdownMenu';

/**
 * Barra superiore dell'app (usata in App.tsx sopra il contenuto di ogni pagina).
 * Mostra l'icona dell'ora del giorno (e scorciatoia mobile alle Impostazioni), il
 * toggle della modalità incognito, e i due selettori (DropdownMenu) per anno e mese, che
 * pilotano il filtro temporale globale usato da tutte le pagine (selectedYear/
 * selectedMonth arrivano come props da App.tsx e vengono modificati da qui).
 * Calcola anche quali anni/mesi hanno effettivamente dei dati, per disabilitare
 * nel menu le opzioni "vuote".
 */

interface HeaderProps {
  key?: React.Key;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenMobileSettings?: () => void;
  onGoToToday?: () => void;
}

export default function Header({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  onOpenMobileSettings,
  onGoToToday
}: HeaderProps) {
  const { data, isIncognito, toggleIncognito } = useFinanceData();

  // Saluto testuale + icona in base all'ora del giorno (Sole/Nuvola/Luna), mostrato
  // solo su desktop/tablet. Su mobile non c'è spazio: si mostra solo l'icona
  // Impostazioni come scorciatoia per aprirle.
  const { GreetingIcon, greeting } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 13 && hour < 18) return { GreetingIcon: CloudSun, greeting: 'Buon pomeriggio' };
    if (hour >= 18 || hour < 6) return { GreetingIcon: Moon, greeting: 'Buonasera' };
    return { GreetingIcon: Sun, greeting: 'Buongiorno' };
  }, []);

  const localRisparmio = data.risparmio;
  const localEntrate = data.entrate;

  // Costruisce l'elenco di anni da mostrare nel menu "Esercizio": l'anno corrente
  // c'è sempre (anche senza dati, per poter navigare al mese in corso), più tutti
  // gli anni per cui esiste almeno una riga in risparmio o entrate. Si usa un Set
  // per evitare duplicati, poi si ordina dal più recente al più vecchio.
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
    const currentYear = new Date().getFullYear();
    const sortedYears = Array.from(years)
      .filter(y => y <= currentYear)
      .sort((a, b) => b - a); // descending
    return sortedYears.map(String);
  }, [localRisparmio, localEntrate]);

  // True se l'anno selezionato ha almeno un dato (risparmio o entrate). Serve solo
  // come "interruttore" per isMonthAvailable qui sotto: se l'anno è del tutto vuoto,
  // non ha senso disabilitare i mesi (altrimenti risulterebbero tutti disabilitati).
  const hasAnyDataForSelectedYear = useMemo(() => {
    const yearNum = parseInt(selectedYear, 10);
    const hasRisparmio = localRisparmio?.some((r: any) => r.anno === yearNum);
    const hasEntrate = localEntrate?.some((e: any) => e.anno === yearNum);
    return hasRisparmio || hasEntrate;
  }, [selectedYear, localRisparmio, localEntrate]);

  // Determina se un dato mese (dell'anno selezionato) ha effettivamente dei dati,
  // usata dal DropdownMenu del mese per disabilitare (in grigio) le voci senza dati.
  const isMonthAvailable = (monthName: string) => {
    // Non si naviga mai oltre il mese corrente reale (i mesi futuri, es. transazioni
    // ricorrenti pre-scritte sul foglio, non vanno mostrati in grafici/tabelle).
    const today = new Date();
    const yearNum = parseInt(selectedYear, 10);
    const monthIdx = MESI_ITALIANI.indexOf(monthName);
    if (yearNum * 12 + monthIdx > today.getFullYear() * 12 + today.getMonth()) return false;

    if (!hasAnyDataForSelectedYear) return true; // fallback if year has no records
    const monthLower = monthName.toLowerCase().trim();
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
    <header className="h-16 bg-white border-b border-hairline flex flex-row items-center justify-between px-3 sm:px-6 md:px-8 gap-2 sticky top-0 z-40 shrink-0 w-full">
      {/* Saluto testuale con icona - desktop/tablet */}
      <div className="hidden md:flex items-center gap-2 min-w-0">
        <GreetingIcon className="w-4.5 h-4.5 text-accent shrink-0" />
        <span className="text-sm font-semibold text-ink truncate">
          {greeting} <span className="text-accent">Federico</span>
        </span>
      </div>

      {/* Icona Impostazioni - solo mobile */}
      <button
        type="button"
        onClick={onOpenMobileSettings}
        title="Impostazioni"
        aria-label="Impostazioni"
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-canvas cursor-pointer shrink-0"
      >
        <Sliders className="w-4.5 h-4.5 text-accent shrink-0" />
      </button>

      {/* Action controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Incognito Mode Toggle - shows fictional demo data instead of real data */}
        <button
          onClick={() => toggleIncognito(!isIncognito)}
          title={isIncognito ? 'Disattiva modalità incognito (torna ai dati reali)' : 'Attiva modalità incognito (mostra dati fittizi)'}
          aria-label={isIncognito ? 'Disattiva modalità incognito (torna ai dati reali)' : 'Attiva modalità incognito (mostra dati fittizi)'}
          aria-pressed={isIncognito}
          className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition-all cursor-pointer border ${
            isIncognito
              ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'
              : 'bg-canvas border-hairline hover:border-hairline hover:bg-canvas text-ink-soft'
          }`}
        >
          {isIncognito ? <EyeOff className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /> : <Eye className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-ink-soft shrink-0" />}
          <span className="hidden md:inline">{isIncognito ? 'Demo' : 'Incognito'}</span>
        </button>

        {/* Year Selector Dropdown */}
        <DropdownMenu
          icon={Database}
          label="Anno"
          accent="indigo"
          value={selectedYear}
          displayValue={selectedYear}
          options={availableYears}
          onSelect={setSelectedYear}
          align="right"
          widthClass="w-28"
        />

        {/* Month Selector dropdown */}
        <DropdownMenu
          icon={Calendar}
          label="Mese"
          accent="indigo"
          value={selectedMonth}
          displayValue={selectedMonth}
          options={MESI_ITALIANI}
          disabledOptions={MESI_ITALIANI.filter(m => !isMonthAvailable(m))}
          onSelect={setSelectedMonth}
          align="right"
          widthClass="w-48"
          layout="grid-2"
        />

        {/* Real Date Indicator - Click to set current Month/Year */}
        <button
          onClick={() => {
            const today = new Date();
            const currentYear = today.getFullYear().toString();
            const currentMonth = MESI_ITALIANI[today.getMonth()];
            setSelectedYear(currentYear);
            setSelectedMonth(currentMonth);
            onGoToToday?.();
          }}
          title="Imposta data odierna come filtro globale"
          aria-label="Imposta data odierna come filtro globale"
          className="hidden lg:flex items-center gap-2 bg-canvas hover:bg-accent/10 hover:text-accent hover:border-accent/20 active:bg-accent/15 border border-hairline px-3.5 py-1.5 rounded-xl text-xs text-ink-soft shrink-0 transition-all duration-200 hover:scale-[1.02] active:scale-98 cursor-pointer shadow-xs hover:shadow-sm"
        >
          <Calendar className="w-4 h-4 text-accent transition-transform duration-200 group-hover:scale-110" />
          <span className="font-semibold capitalize">{formattedDate}</span>
        </button>
      </div>
    </header>
  );
}
