import React, { useState } from 'react';
import { ChevronRight, Wallet, ArrowDownCircle, Tags, Percent, RotateCcw, Download } from 'lucide-react';
import Modal from '../Modal';
import ContiEditor from './ContiEditor';
import CategorieEntrateEditor from './CategorieEntrateEditor';
import CategorieUsciteEditor from './CategorieUsciteEditor';
import SoglieEditor from './SoglieEditor';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useFinanceData } from '../../context/FinanceDataContext';
import { CONTI_SEED, CATEGORIE_ENTRATE_SEED, MACRO_CATEGORIE_USCITE_SEED, SOGLIE_SEED } from '../../data/datiBase';

type Voce = 'conti' | 'categorieEntrate' | 'categorieUscite' | 'soglie' | null;

const VOCI: { id: Exclude<Voce, null>; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }[] = [
  { id: 'conti', label: 'Conti', desc: 'Lista conti usati nei form di inserimento', icon: Wallet, iconColor: 'text-blue-600' },
  { id: 'categorieEntrate', label: 'Categorie Entrate', desc: 'Categorie del form "Aggiungi Entrata"', icon: ArrowDownCircle, iconColor: 'text-emerald-600' },
  { id: 'categorieUscite', label: 'Categorie Uscite', desc: 'Macro e sotto-categorie del form "Aggiungi Uscita"', icon: Tags, iconColor: 'text-orange-600' },
  { id: 'soglie', label: 'Soglie', desc: 'Target % per Entrate, Uscite Primarie/Secondarie, Investimenti', icon: Percent, iconColor: 'text-rose-600' }
];

const TITOLI: Record<Exclude<Voce, null>, string> = {
  conti: 'Conti',
  categorieEntrate: 'Categorie Entrate',
  categorieUscite: 'Categorie Uscite',
  soglie: 'Soglie'
};

/**
 * Card "Dati Base" di Impostazioni: un menu con 4 voci (Conti, Categorie
 * Entrate, Categorie Uscite, Soglie). Ogni voce apre un popup a tutto schermo
 * con l'editor corrispondente — vedi src/data/datiBase.ts per il layer di
 * persistenza, ContiEditor/CategorieEntrateEditor/CategorieUsciteEditor per
 * il contenuto di ciascun popup (Soglie ancora da costruire).
 */
export default function DatiBaseSettings() {
  const [voceAperta, setVoceAperta] = useState<Voce>(null);
  const { updateDatiBase } = useDatiBase();
  const { accessToken } = useFinanceData();
  const [isImporting, setIsImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const ripristinaDefault = () => {
    if (!window.confirm('Sovrascrivere conti e categorie (anche sul foglio Google) con i valori di default? Le modifiche fatte finora andranno perse.')) return;
    updateDatiBase({
      conti: CONTI_SEED,
      categorieEntrate: CATEGORIE_ENTRATE_SEED,
      macroCategorieUscite: MACRO_CATEGORIE_USCITE_SEED,
      soglie: SOGLIE_SEED
    });
  };

  const importaDaConfigSheet = async () => {
    const configId = localStorage.getItem('sf_config_spreadsheet_id');
    if (!configId) {
      setImportMsg('Nessun foglio di configurazione collegato. Aggiungilo prima nella card "Collegamento Google Sheets".');
      setTimeout(() => setImportMsg(null), 6000);
      return;
    }
    if (!accessToken) {
      setImportMsg('Sessione Google scaduta: rifai il login.');
      setTimeout(() => setImportMsg(null), 6000);
      return;
    }
    if (!window.confirm('Importare conti, categorie e soglie dal foglio di configurazione? Sovrascriverà i valori attuali (anche sul foglio Google principale).')) return;

    setIsImporting(true);
    setImportMsg(null);
    try {
      const { fetchDatiBaseFromConfigSheet } = await import('../../lib/sheetsService');
      const result = await fetchDatiBaseFromConfigSheet(accessToken, configId);
      updateDatiBase(result);
      setImportMsg('Dati importati dal foglio di configurazione.');
    } catch (err: any) {
      setImportMsg(err?.message || 'Errore durante l\'importazione.');
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportMsg(null), 6000);
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Tags className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-lg font-display text-slate-800 dark:text-slate-100">Dati Base</h3>
      </div>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        Conti, categorie e soglie usati nei form "Aggiungi" e nelle pagine. Modificabili qui, non serve più toccare il foglio Google.
      </p>

      <div className="space-y-2">
        {VOCI.map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setVoceAperta(v.id)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer text-left"
            >
              <div className={`w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 ${v.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">{v.label}</span>
                <span className="text-xs text-slate-400 block truncate">{v.desc}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          );
        })}
      </div>

      <button
        onClick={importaDaConfigSheet}
        disabled={isImporting}
        className="w-full flex items-center justify-center gap-1.5 mt-3 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" /> {isImporting ? 'Importazione...' : 'Importa da foglio di configurazione'}
      </button>

      <button
        onClick={ripristinaDefault}
        className="w-full flex items-center justify-center gap-1.5 mt-1 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Ripristina valori di default
      </button>

      {importMsg && (
        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 font-semibold mt-2">{importMsg}</p>
      )}

      <Modal isOpen={voceAperta !== null} onClose={() => setVoceAperta(null)} title={voceAperta ? TITOLI[voceAperta] : ''} fullScreen>
        {voceAperta === 'conti' && <ContiEditor />}
        {voceAperta === 'categorieEntrate' && <CategorieEntrateEditor />}
        {voceAperta === 'categorieUscite' && <CategorieUsciteEditor />}
        {voceAperta === 'soglie' && <SoglieEditor />}
      </Modal>
    </div>
  );
}
