import React, { useState } from 'react';
import { ChevronRight, Wallet, ArrowDownCircle, Tags, Percent, RotateCcw, Download } from 'lucide-react';
import Modal from '../Modal';
import ContiEditor from './ContiEditor';
import CategorieEntrateEditor from './CategorieEntrateEditor';
import CategorieUsciteEditor from './CategorieUsciteEditor';
import SoglieEditor from './SoglieEditor';
import { SchedaProvider, type SchedaAperta } from './editorUI';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useFinanceData } from '../../context/FinanceDataContext';
import { CONTI_SEED, CATEGORIE_ENTRATE_SEED, MACRO_CATEGORIE_USCITE_SEED, SOGLIE_SEED } from '../../data/datiBase';

type Voce = 'conti' | 'categorieEntrate' | 'categorieUscite' | 'soglie' | null;

const VOCI: { id: Exclude<Voce, null>; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }[] = [
  { id: 'conti', label: 'Conti', desc: 'Lista conti usati nei form di inserimento', icon: Wallet, iconColor: 'text-accent' },
  { id: 'categorieEntrate', label: 'Categorie Entrate', desc: 'Categorie del form "Aggiungi Entrata"', icon: ArrowDownCircle, iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'categorieUscite', label: 'Categorie Uscite', desc: 'Macro e sotto-categorie del form "Aggiungi Uscita"', icon: Tags, iconColor: 'text-orange-600' },
  { id: 'soglie', label: 'Soglie', desc: 'Target % per Entrate, Uscite Primarie/Secondarie, Investimenti', icon: Percent, iconColor: 'text-accent' }
];

const TITOLI: Record<Exclude<Voce, null>, string> = {
  conti: 'Conti',
  categorieEntrate: 'Categorie Entrate',
  categorieUscite: 'Categorie Uscite',
  soglie: 'Soglie'
};

/**
 * Card "Dati Base" di Impostazioni: un menu con 4 voci (Conti, Categorie
 * Entrate, Categorie Uscite, Soglie). Ogni voce apre un popup centrato con
 * l'editor corrispondente (lista → scheda di modifica, vedi editorUI.tsx);
 * quando l'editor apre una scheda, titolo e freccia "indietro" del popup
 * seguono la scheda. Persistenza in src/data/datiBase.ts.
 */
/** `compatto`: su telefono la scheda è dentro una voce dell'elenco Impostazioni,
 *  che ha già titolo e bordo: qui niente card e niente titolo. */
export default function DatiBaseSettings({ compatto = false }: { compatto?: boolean }) {
  const [voceAperta, setVoceAperta] = useState<Voce>(null);
  const [scheda, setScheda] = useState<SchedaAperta | null>(null);
  const { updateDatiBase } = useDatiBase();
  const { accessToken } = useFinanceData();
  const [isImporting, setIsImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  // Conferma dentro la card invece di window.confirm (che nel tema vetro esce dallo
  // stile e su telefono è un popup di sistema): dice cosa verrà sovrascritto.
  const [conferma, setConferma] = useState<'importa' | 'ripristina' | null>(null);

  const ripristinaDefault = () => {
    setConferma(null);
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
    setConferma(null);
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
    <div className={compatto ? '' : 'bg-white dark:bg-white/5 p-6 rounded-3xl border border-hairline dark:border-white/10 shadow-sm'}>
      {!compatto && (
      <div className="flex items-center gap-2 mb-1">
        <Tags className="w-5 h-5 text-accent" />
        <h2 className="font-bold text-lg font-display text-ink dark:text-slate-100">Dati Base</h2>
      </div>
      )}
      <p className="text-xs text-ink-soft mb-5 leading-relaxed">
        Conti, categorie e soglie usati nei form "Aggiungi" e nelle pagine. Modificabili qui, non serve più toccare il foglio Google.
      </p>

      <div className="space-y-2">
        {VOCI.map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setVoceAperta(v.id)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-hairline dark:border-white/10 hover:border-hairline dark:hover:border-white/25 hover:bg-canvas dark:hover:bg-white/10 transition-all cursor-pointer text-left"
            >
              <div className={`w-10 h-10 rounded-xl bg-canvas dark:bg-white/10 flex items-center justify-center shrink-0 ${v.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-ink dark:text-slate-100 block">{v.label}</span>
                <span className="text-xs text-ink-soft block truncate">{v.desc}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-soft shrink-0" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setConferma(conferma === 'importa' ? null : 'importa')}
        disabled={isImporting}
        aria-expanded={conferma === 'importa'}
        className="w-full flex items-center justify-center gap-1.5 mt-3 px-3 py-2 text-xs font-semibold text-ink-soft dark:text-slate-400 hover:text-accent cursor-pointer transition-colors disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" /> {isImporting ? 'Importazione...' : 'Importa da foglio di configurazione'}
      </button>
      {conferma === 'importa' && (
        <div role="alertdialog" aria-label="Conferma importazione" className="mt-2 p-3.5 rounded-2xl bg-canvas dark:bg-white/5 text-xs">
          <p className="text-ink dark:text-slate-200">Conti, categorie e soglie verranno sostituiti con quelli del foglio di configurazione, anche sul foglio Google principale.</p>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setConferma(null)} className="flex-1 px-3 py-2.5 rounded-xl font-semibold text-ink-soft hover:bg-hairline/60 dark:hover:bg-white/10 cursor-pointer">Annulla</button>
            <button type="button" onClick={importaDaConfigSheet} className="flex-1 px-3 py-2.5 rounded-xl font-bold bg-accent-strong text-white hover:opacity-90 cursor-pointer">Importa</button>
          </div>
        </div>
      )}

      {/* Azione distruttiva staccata dalle altre e nel colore delle perdite */}
      <div className="mt-3 pt-3 border-t border-dashed border-hairline dark:border-white/10">
        <button
          type="button"
          onClick={() => setConferma(conferma === 'ripristina' ? null : 'ripristina')}
          aria-expanded={conferma === 'ripristina'}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-down cursor-pointer transition-opacity hover:opacity-80"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Ripristina valori di default
        </button>
        {conferma === 'ripristina' && (
          <div role="alertdialog" aria-label="Conferma ripristino" className="mt-2 p-3.5 rounded-2xl bg-down/10 border border-down/25 text-xs">
            <p className="text-ink dark:text-slate-200">Conti, categorie e <strong>soglie</strong> torneranno ai valori di default, anche sul foglio Google. Le modifiche fatte finora andranno perse.</p>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => setConferma(null)} className="flex-1 px-3 py-2.5 rounded-xl font-semibold text-ink-soft hover:bg-hairline/60 dark:hover:bg-white/10 cursor-pointer">Annulla</button>
              <button type="button" onClick={ripristinaDefault} className="flex-1 px-3 py-2.5 rounded-xl font-bold bg-rose-600 text-white hover:opacity-90 cursor-pointer">Ripristina</button>
            </div>
          </div>
        )}
      </div>

      {importMsg && (
        <p className="text-2xs text-center text-ink-soft dark:text-slate-400 font-semibold mt-2">{importMsg}</p>
      )}

      <Modal
        isOpen={voceAperta !== null}
        onClose={() => setVoceAperta(null)}
        title={scheda?.titolo ?? (voceAperta ? TITOLI[voceAperta] : '')}
        onBack={scheda?.indietro}
        maxWidthClass="max-w-lg"
        borderless
      >
        <SchedaProvider value={setScheda}>
          {voceAperta === 'conti' && <ContiEditor />}
          {voceAperta === 'categorieEntrate' && <CategorieEntrateEditor />}
          {voceAperta === 'categorieUscite' && <CategorieUsciteEditor />}
          {voceAperta === 'soglie' && <SoglieEditor />}
        </SchedaProvider>
      </Modal>
    </div>
  );
}
