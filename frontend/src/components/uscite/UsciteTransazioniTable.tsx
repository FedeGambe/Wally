import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ListFilter, Receipt, X } from 'lucide-react';
import type { Transaction } from '../../data/mockData';
import DropdownMenu from '../DropdownMenu';
import { formatEuro } from '../../utils/format';
import {
  ColonnaUscite, FiltriUscite, OrdinamentoUscite, ORDINAMENTO_USCITE_DEFAULT,
  filtraUscite, filtriUsciteAttivi, ordinaUscite
} from '../../utils/filtriUscite';

/**
 * Tabella delle uscite con ordinamento (clic sull'intestazione, di default per
 * data dalla più recente) e un filtro per colonna: l'icona accanto al nome
 * della colonna apre un piccolo popup con il filtro di quella colonna (su
 * telefono un pannello "Filtri" li raccoglie tutti). I filtri sono del
 * genitore (`filtri`/`onFiltriChange`) perché nella pagina guidano anche torte,
 * grafici e KPI; l'ordinamento invece è solo della tabella.
 * Usata dall'archivio del mese (Uscite) e dall'analisi sul periodo.
 *
 * Colori: il popup vive in un portal su document.body, quindi fuori da
 * .glass-theme: ogni colore ha la sua variante dark: esplicita.
 */
interface UsciteTransazioniTableProps {
  transazioni: Transaction[];
  filtri: FiltriUscite;
  onFiltriChange: (filtri: FiltriUscite) => void;
  soglie?: { primarie: number; secondarie: number };
  /** Righe mostrate prima di "Mostra altri" (sull'intero periodo possono essere migliaia). */
  pagina?: number;
}

const COLONNE: { id: ColonnaUscite; etichetta: string; destra?: boolean; centro?: boolean }[] = [
  { id: 'data', etichetta: 'Data' },
  { id: 'descrizione', etichetta: 'Descrizione' },
  { id: 'macro', etichetta: 'Macro' },
  { id: 'categoria', etichetta: 'Categoria' },
  { id: 'importo', etichetta: 'Importo', destra: true },
  { id: 'conto', etichetta: 'Conto utilizzato' },
  { id: 'tipo', etichetta: 'Primaria', centro: true }
];

/** Campi del filtro di ogni colonna (per sapere se è attivo e per azzerarlo). */
const CAMPI: Record<ColonnaUscite, (keyof FiltriUscite)[]> = {
  data: ['data'], descrizione: ['descrizione'], macro: ['macro'], categoria: ['categoria'],
  importo: ['importoMin', 'importoMax'], conto: ['conto'], tipo: ['tipo']
};

const INPUT = 'w-full min-w-0 rounded-lg px-2.5 py-2 text-xs font-medium border bg-canvas dark:bg-white/5 border-hairline dark:border-white/10 text-ink dark:text-slate-100 placeholder:text-ink-soft dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-orange-500';

const unici = (valori: string[]) => Array.from(new Set(valori.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'));

export default function UsciteTransazioniTable({ transazioni, filtri, onFiltriChange, soglie, pagina = 100 }: UsciteTransazioniTableProps) {
  const [ordinamento, setOrdinamento] = useState<OrdinamentoUscite>(ORDINAMENTO_USCITE_DEFAULT);
  const [visibili, setVisibili] = useState(pagina);
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [popup, setPopup] = useState<{ colonna: ColonnaUscite; ancora: HTMLElement } | null>(null);

  const righe = useMemo(() => ordinaUscite(filtraUscite(transazioni, filtri), ordinamento), [transazioni, filtri, ordinamento]);
  const totale = useMemo(() => righe.reduce((s, t) => s + (Number(t.importo) || 0), 0), [righe]);

  useEffect(() => setVisibili(pagina), [transazioni, filtri, ordinamento, pagina]);

  // Le opzioni di ogni elenco vengono dalle righe che passano gli altri filtri,
  // così non si propone una categoria che darebbe zero risultati.
  const opzioni = useMemo(() => ({
    macro: unici(filtraUscite(transazioni, filtri, ['macro', 'categoria']).map(t => t.macroCategoria || 'Altro')),
    categoria: unici(filtraUscite(transazioni, filtri, ['categoria']).map(t => t.categoria || 'Altro')),
    conto: unici(filtraUscite(transazioni, filtri, ['conto']).map(t => t.conto))
  }), [transazioni, filtri]);

  const set = (patch: Partial<FiltriUscite>) => onFiltriChange({ ...filtri, ...patch });
  // Il testo libero sta fuori dalla tabella (barra di ricerca della pagina): non conta qui.
  const attivi = filtriUsciteAttivi(filtri, ['testo']);
  const colonnaAttiva = (c: ColonnaUscite) => CAMPI[c].some(k => filtri[k] !== '');
  const azzeraColonna = (c: ColonnaUscite) => set(Object.fromEntries(CAMPI[c].map(k => [k, ''])) as Partial<FiltriUscite>);
  const azzera = () => onFiltriChange({ ...filtri, data: '', descrizione: '', macro: '', categoria: '', conto: '', tipo: '', importoMin: '', importoMax: '' });

  const ordina = (colonna: ColonnaUscite) => setOrdinamento(o =>
    o.colonna === colonna
      ? { colonna, verso: o.verso === 'asc' ? 'desc' : 'asc' }
      // Date e importi partono dal più grande, i testi dalla A.
      : { colonna, verso: colonna === 'data' || colonna === 'importo' ? 'desc' : 'asc' }
  );

  /** Elenco a scelta singola (riclic sulla voce scelta = tutte). */
  const elenco = (valore: string, valori: string[], onSelect: (v: string) => void, etichetta: (v: string) => string = v => v) => (
    <div role="listbox" className="flex flex-col gap-0.5 max-h-56 overflow-y-auto -mx-1">
      {['', ...valori].map(v => {
        const scelto = valore === v;
        return (
          <button
            key={v || '__tutte'}
            type="button"
            role="option"
            aria-selected={scelto}
            onClick={() => onSelect(scelto && v ? '' : v)}
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
              scelto
                ? 'font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                : 'font-medium text-ink-soft dark:text-slate-300 hover:bg-canvas dark:hover:bg-white/10'
            }`}
          >
            <span className="truncate">{v ? etichetta(v) : 'Tutte'}</span>
            {scelto && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  const contenutoFiltro = (c: ColonnaUscite, autoFocus = false): React.ReactNode => {
    switch (c) {
      case 'data':
        return <input type="text" inputMode="numeric" autoFocus={autoFocus} aria-label="La data contiene" placeholder="es. 03/2025 oppure 14/" value={filtri.data} onChange={e => set({ data: e.target.value })} className={INPUT} />;
      case 'descrizione':
        return <input type="search" autoFocus={autoFocus} aria-label="La descrizione contiene" placeholder="Contiene…" value={filtri.descrizione} onChange={e => set({ descrizione: e.target.value })} className={INPUT} />;
      case 'macro':
        // Cambiando macro la categoria scelta potrebbe non appartenerle più.
        return elenco(filtri.macro, opzioni.macro, v => set({ macro: v, categoria: '' }));
      case 'categoria':
        return elenco(filtri.categoria, opzioni.categoria, v => set({ categoria: v }));
      case 'importo':
        return (
          <div className="flex items-center gap-2">
            <input type="text" inputMode="decimal" autoFocus={autoFocus} aria-label="Importo minimo" placeholder="Da €" value={filtri.importoMin} onChange={e => set({ importoMin: e.target.value })} className={INPUT} />
            <span className="text-ink-soft dark:text-slate-400 text-xs">–</span>
            <input type="text" inputMode="decimal" aria-label="Importo massimo" placeholder="A €" value={filtri.importoMax} onChange={e => set({ importoMax: e.target.value })} className={INPUT} />
          </div>
        );
      case 'conto':
        return elenco(filtri.conto, opzioni.conto, v => set({ conto: v }));
      case 'tipo':
        return elenco(filtri.tipo, ['primarie', 'secondarie'], v => set({ tipo: v as FiltriUscite['tipo'] }),
          v => (v === 'primarie' ? 'Solo primarie' : 'Solo secondarie'));
    }
  };

  const iconaVerso = (c: ColonnaUscite) => {
    if (ordinamento.colonna !== c) return <ArrowUpDown className="w-3 h-3 opacity-40" aria-hidden="true" />;
    return ordinamento.verso === 'asc'
      ? <ArrowUp className="w-3 h-3 text-orange-600 dark:text-orange-400" aria-hidden="true" />
      : <ArrowDown className="w-3 h-3 text-orange-600 dark:text-orange-400" aria-hidden="true" />;
  };

  const opzioniOrdina = COLONNE.flatMap(c => [`${c.id}:desc`, `${c.id}:asc`]);
  const etichettaOrdina = (v: string) => {
    const [c, verso] = v.split(':') as [ColonnaUscite, string];
    const nome = COLONNE.find(x => x.id === c)!.etichetta;
    const freccia = c === 'data' ? (verso === 'desc' ? 'più recenti' : 'meno recenti')
      : c === 'importo' ? (verso === 'desc' ? 'più alti' : 'più bassi')
      : verso === 'asc' ? 'A→Z' : 'Z→A';
    return `${nome} · ${freccia}`;
  };

  const mostrate = righe.slice(0, visibili);
  const nomeFiltro = (c: ColonnaUscite) => (c === 'tipo' ? 'Tipologia' : COLONNE.find(x => x.id === c)!.etichetta);

  return (
    <div>
      {/* Telefono: ordinamento e filtri sopra l'elenco (la tabella non c'è) */}
      <div className="md:hidden flex flex-wrap items-center gap-2 mb-3">
        <DropdownMenu
          icon={ArrowUpDown}
          accent="orange"
          label="Ordina"
          widthClass="w-60"
          value={`${ordinamento.colonna}:${ordinamento.verso}`}
          displayValue={etichettaOrdina(`${ordinamento.colonna}:${ordinamento.verso}`)}
          options={opzioniOrdina}
          onSelect={v => { const [colonna, verso] = v.split(':'); setOrdinamento({ colonna: colonna as ColonnaUscite, verso: verso as 'asc' | 'desc' }); }}
          getOptionLabel={etichettaOrdina}
        />
        <button
          type="button"
          onClick={() => setFiltriAperti(a => !a)}
          aria-expanded={filtriAperti}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
            attivi
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300'
              : 'bg-canvas dark:bg-white/5 border-hairline dark:border-white/10 text-ink-soft dark:text-slate-300'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          Filtri{attivi ? ` (${attivi})` : ''}
        </button>
      </div>
      {filtriAperti && (
        <div className="md:hidden space-y-4 mb-4 p-3 bg-canvas border border-hairline rounded-2xl">
          {COLONNE.map(c => (
            <div key={c.id}>
              <p className="text-3xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">{nomeFiltro(c.id)}</p>
              {contenutoFiltro(c.id)}
            </div>
          ))}
        </div>
      )}

      {righe.length === 0 ? (
        <div className="py-12 text-center text-ink-soft text-xs border border-dashed border-hairline rounded-2xl bg-canvas/50">
          Nessuna transazione soddisfa i filtri selezionati.
          {attivi > 0 && (
            <button type="button" onClick={azzera} className="block mx-auto mt-2 font-bold text-orange-700 dark:text-orange-300 hover:underline cursor-pointer">
              Azzera i filtri di colonna
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="md:hidden -mx-2 space-y-1">
            {mostrate.map((tx, idx) => (
              <li key={tx.id || `txm-${idx}`} className="flex items-center gap-3 px-2 py-3 rounded-2xl odd:bg-canvas dark:odd:bg-white/[0.03]">
                <span className="w-9 h-9 rounded-xl bg-canvas dark:bg-white/10 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                  {tx.icon || <Receipt className="w-4 h-4 text-ink-soft dark:text-slate-400" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-ink dark:text-slate-100 truncate">{tx.descrizione}</span>
                  <span className="block text-2xs text-ink-soft dark:text-slate-400 truncate">
                    {tx.data} · {tx.categoria} · {tx.conto}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-extrabold text-ink dark:text-slate-100 tabular-nums">{formatEuro(tx.importo)}</span>
                  <span className={`block text-2xs font-bold ${tx.primaria ? 'text-orange-700 dark:text-orange-400' : 'text-ink-soft dark:text-slate-400'}`}>
                    {tx.primaria ? 'Primaria' : 'Secondaria'}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline text-2xs font-bold text-ink-soft uppercase tracking-wider">
                  {COLONNE.map(c => {
                    const filtrata = colonnaAttiva(c.id);
                    const aperto = popup?.colonna === c.id;
                    return (
                      <th
                        key={c.id}
                        scope="col"
                        aria-sort={ordinamento.colonna === c.id ? (ordinamento.verso === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className={`py-3 px-2 first:pl-4 last:pr-4 whitespace-nowrap ${c.destra ? 'text-right' : c.centro ? 'text-center' : ''}`}
                      >
                        <span className={`inline-flex items-center gap-0.5 ${c.destra ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() => ordina(c.id)}
                            title={`Ordina per ${c.etichetta.toLowerCase()}`}
                            className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-md uppercase tracking-wider font-bold transition cursor-pointer hover:text-orange-700 dark:hover:text-orange-300 ${
                              ordinamento.colonna === c.id ? 'text-ink dark:text-slate-100' : ''
                            }`}
                          >
                            {c.etichetta}
                            {iconaVerso(c.id)}
                          </button>
                          <button
                            type="button"
                            aria-label={`Filtra ${nomeFiltro(c.id).toLowerCase()}`}
                            aria-haspopup="dialog"
                            aria-expanded={aperto}
                            title={`Filtra ${nomeFiltro(c.id).toLowerCase()}`}
                            onClick={e => { const ancora = e.currentTarget; setPopup(p => (p?.colonna === c.id ? null : { colonna: c.id, ancora })); }}
                            className={`relative p-1 rounded-md transition cursor-pointer ${
                              filtrata || aperto
                                ? 'text-orange-700 dark:text-orange-300 bg-orange-500/10'
                                : 'opacity-50 hover:opacity-100 hover:text-orange-700 dark:hover:text-orange-300'
                            }`}
                          >
                            <ListFilter className="w-3.5 h-3.5" />
                            {filtrata && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-600" aria-hidden="true" />}
                          </button>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {mostrate.map((tx, idx) => (
                  <tr key={tx.id || `tx-${idx}`} className="hover:bg-canvas/60 transition-colors">
                    <td className="py-3.5 px-2 pl-4 text-ink-soft font-normal font-mono whitespace-nowrap">{tx.data}</td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{tx.icon || <Receipt className="w-4 h-4 text-ink-soft" />}</span>
                        <span className="font-semibold text-ink truncate max-w-xs">{tx.descrizione}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="bg-canvas border border-hairline/50 text-3xs text-ink-soft px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        {tx.macroCategoria}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-ink-soft font-normal">{tx.categoria}</td>
                    <td className="py-3.5 px-2 text-right font-extrabold text-ink font-mono whitespace-nowrap">{formatEuro(tx.importo)}</td>
                    <td className="py-3.5 px-2 text-ink-soft font-medium">
                      <span className="inline-flex items-center gap-1 bg-canvas px-2 py-0.5 rounded text-3xs text-ink-soft font-mono">{tx.conto}</span>
                    </td>
                    <td className="py-3.5 px-2 pr-4 text-center">
                      {tx.primaria ? (
                        <span className="inline-flex items-center bg-orange-700 text-white text-3xs font-bold uppercase px-2 py-0.5 rounded-sm whitespace-nowrap">
                          Sì{soglie ? ` (${soglie.primarie}%)` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-orange-100 text-orange-700 text-3xs font-bold uppercase px-2 py-0.5 rounded-sm whitespace-nowrap">
                          No{soglie ? ` (${soglie.secondarie}%)` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Riepilogo delle righe filtrate */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-hairline text-xs text-ink-soft">
        <span>
          <strong className="text-ink tabular-nums">{righe.length}</strong> {righe.length === 1 ? 'movimento' : 'movimenti'}
          {' · '}Totale <strong className="text-ink tabular-nums">{formatEuro(totale)}</strong>
        </span>
        {attivi > 0 && (
          <button type="button" onClick={azzera} className="font-bold text-orange-700 dark:text-orange-300 hover:underline cursor-pointer">
            Azzera filtri di colonna ({attivi})
          </button>
        )}
        {righe.length > visibili && (
          <button
            type="button"
            onClick={() => setVisibili(v => v + pagina)}
            className="ml-auto bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            Mostra altri {Math.min(pagina, righe.length - visibili)} di {righe.length - visibili}
          </button>
        )}
      </div>

      {popup && (
        <PopupFiltro
          ancora={popup.ancora}
          titolo={nomeFiltro(popup.colonna)}
          attivo={colonnaAttiva(popup.colonna)}
          onAzzera={() => azzeraColonna(popup.colonna)}
          onClose={() => setPopup(null)}
        >
          {contenutoFiltro(popup.colonna, true)}
        </PopupFiltro>
      )}
    </div>
  );
}

/** Popup del filtro di una colonna, sotto l'icona che lo apre (portal, come DropdownMenu). */
function PopupFiltro({ ancora, titolo, attivo, onAzzera, onClose, children }: {
  ancora: HTMLElement; titolo: string; attivo: boolean; onAzzera: () => void; onClose: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const LARGHEZZA = 256;

  useLayoutEffect(() => {
    const posiziona = () => {
      const r = ancora.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left + r.width / 2 - LARGHEZZA / 2, window.innerWidth - LARGHEZZA - 8)) });
    };
    posiziona();
    window.addEventListener('resize', posiziona);
    window.addEventListener('scroll', posiziona, true);
    return () => { window.removeEventListener('resize', posiziona); window.removeEventListener('scroll', posiziona, true); };
  }, [ancora]);

  useEffect(() => {
    const fuori = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || ancora.contains(t)) return;
      onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); ancora.focus(); } };
    document.addEventListener('mousedown', fuori);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc); };
  }, [ancora, onClose]);

  if (!pos) return null;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`Filtro ${titolo}`}
      style={{ top: pos.top, left: pos.left, width: LARGHEZZA }}
      className="dropdown-menu-panel fixed z-[80] border rounded-2xl shadow-xl p-3 animate-fadeIn text-left normal-case tracking-normal"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-2xs font-bold uppercase tracking-wider text-ink-soft dark:text-slate-400">Filtra {titolo.toLowerCase()}</span>
        <button type="button" onClick={onClose} aria-label="Chiudi" className="p-1 -m-1 rounded-md text-ink-soft dark:text-slate-400 hover:text-ink dark:hover:text-white cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
      {attivo && (
        <button type="button" onClick={onAzzera} className="mt-3 text-xs font-bold text-orange-700 dark:text-orange-300 hover:underline cursor-pointer">
          Azzera questo filtro
        </button>
      )}
    </div>,
    document.body
  );
}
