/**
 * Demo per la documentazione su GitHub Pages (docs/documentazione.html, build in docs/demo/ con
 * `npm run build:demo`): monta le pagine VERE dell'app con i dati fittizi della modalità
 * incognito (src/data/demoData.ts), senza login e senza Firebase (googleAuth non viene importato).
 * Una pagina per volta, scelta con ?vista=panoramica|entrate|uscite|patrimonio|investimenti|consumi.
 * L'altezza del contenuto viene mandata alla pagina che la incorpora (postMessage), così l'iframe
 * si adatta; aperta da sola funziona come una pagina normale.
 */
import { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import Header from '../components/Header';
import { FinanceDataProvider } from '../context/FinanceDataContext';

const Panoramica = lazy(() => import('../pages/Panoramica'));
const Entrate = lazy(() => import('../pages/Entrate'));
const Uscite = lazy(() => import('../pages/Uscite'));
const Patrimonio = lazy(() => import('../pages/Patrimonio'));
const Investimenti = lazy(() => import('../pages/Investimenti'));
const AnalisiConsumi = lazy(() => import('../pages/AnalisiConsumi'));
const Previsioni = lazy(() => import('../pages/Previsioni'));

const VISTE = ['panoramica', 'entrate', 'uscite', 'patrimonio', 'investimenti', 'consumi', 'previsioni'];
const parametri = new URLSearchParams(location.search);
const vistaIniziale = VISTE.includes(parametri.get('vista') || '') ? parametri.get('vista')! : 'panoramica';

function Demo() {
  const [vista, setVista] = useState(vistaIniziale);
  // ultimo mese dei dati demo (gennaio-giugno 2026)
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('Giugno');
  const mese = { selectedYear, setSelectedYear, selectedMonth, setSelectedMonth };

  useEffect(() => {
    if (window.parent === window) return;
    const invia = () => window.parent.postMessage({ wallyDemo: true, vista: vistaIniziale, altezza: document.documentElement.scrollHeight }, '*');
    const ro = new ResizeObserver(invia);
    ro.observe(document.body);
    invia();
    return () => ro.disconnect();
  }, []);

  const pagina = () => {
    switch (vista) {
      case 'entrate': return <Entrate {...mese} />;
      case 'uscite': return <Uscite {...mese} />;
      case 'patrimonio': return <Patrimonio />;
      case 'investimenti': return <Investimenti {...mese} theme="dark" />;
      case 'consumi': return <AnalisiConsumi goToTodaySignal={0} />;
      case 'previsioni': return <Previsioni />;
      default: return <Panoramica {...mese} setActiveView={v => VISTE.includes(v) && setVista(v)} theme="dark" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-100 antialiased font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-emerald-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[10%] w-[45vw] h-[45vw] rounded-full bg-rose-500/10 blur-[110px] pointer-events-none" />
      <div className="glass-theme relative z-10 w-full">
        <FinanceDataProvider accessToken={null} onAuthError={() => {}} forceIncognito>
          <Header {...mese} />
          <main className="p-4 md:p-8 max-w-7xl w-full mx-auto">
            <Suspense fallback={<div className="p-10 text-center text-slate-400">Caricamento…</div>}>
              {pagina()}
            </Suspense>
          </main>
        </FinanceDataProvider>
      </div>
    </div>
  );
}

// Nella demo non si aggiungono dati (non c'è un foglio collegato): via il pulsante "Aggiungi".
const stile = document.createElement('style');
stile.textContent = 'body > button.fixed.rounded-full{display:none}';
document.head.appendChild(stile);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
