import React, { useState } from 'react';
import { Landmark, Link2, RefreshCw } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useMovimentiBanca } from '../../hooks/useMovimentiBanca';
import { avviaCollegamentoBanca, giorniAllaScadenza, BANCHE_COLLEGABILI } from '../../lib/bancaService';

/**
 * Card "Banche collegate" di Impostazioni: stato del consenso PSD2 di ogni
 * banca (scade dopo 90–180 giorni e va rinnovato dalla banca stessa), con i
 * pulsanti per collegare o rinnovare. I conti e il "Conto Wally" di ciascuno
 * sono nella scheda "Banca Collegamenti" del foglio di configurazione.
 */
export default function BancheCollegateSettings() {
  const { accessToken, isIncognito } = useFinanceData();
  const { collegamenti, inCaricamento, sincronizzaOra } = useMovimentiBanca();
  const [errore, setErrore] = useState<string | null>(null);
  const [inAvvio, setInAvvio] = useState<string | null>(null);

  if (isIncognito) return null;

  const collega = async (banca: string, paese: string) => {
    if (!accessToken) return;
    setErrore(null);
    setInAvvio(banca);
    try {
      window.location.href = await avviaCollegamentoBanca(accessToken, banca, paese);
    } catch (e: any) {
      setErrore(e?.message || 'Collegamento non riuscito');
      setInAvvio(null);
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-hairline dark:border-white/10 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-lg font-display text-ink dark:text-slate-100">Banche collegate</h3>
        </div>
        <button
          type="button"
          onClick={() => sincronizzaOra().catch(e => setErrore(e?.message || 'Sincronizzazione non riuscita'))}
          disabled={inCaricamento}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-ink-soft hover:text-ink dark:hover:text-slate-200 hover:bg-canvas dark:hover:bg-white/10 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${inCaricamento ? 'animate-spin' : ''}`} />
          Sincronizza ora
        </button>
      </div>
      <p className="text-xs text-ink-soft mb-5 leading-relaxed">
        I movimenti si scaricano ogni mattina. Il consenso dato alla banca scade (90 giorni per
        Trade Republic, 180 per UniCredit) e va rinnovato da qui.
      </p>

      <div className="space-y-2">
        {BANCHE_COLLEGABILI.map(({ banca, paese }) => {
          const conti = collegamenti.filter(c => c.banca === banca);
          const scadenza = conti[0]?.scadenza;
          const giorni = scadenza ? giorniAllaScadenza(scadenza) : null;
          const stato = giorni === null ? (inCaricamento ? 'Verifica in corso…' : 'Non collegata')
            : giorni < 0 ? 'Consenso scaduto'
            : `Scade il ${scadenza.split('-').reverse().join('/')} (tra ${giorni} giorni)`;
          return (
            <div key={banca} className="flex items-center gap-3 p-4 rounded-2xl border border-hairline dark:border-white/10">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink dark:text-slate-200">{banca}</div>
                <div className={`text-xs ${giorni !== null && giorni <= 14 ? 'text-down font-semibold' : 'text-ink-soft'}`}>{stato}</div>
                {conti.length > 0 && (
                  <div className="text-2xs text-ink-soft truncate">→ {[...new Set(conti.map(c => c.contoWally))].join(', ')}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => collega(banca, paese)}
                disabled={inAvvio !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-xs font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                <Link2 className="w-4 h-4" />
                {inAvvio === banca ? 'Apro…' : giorni === null ? 'Collega' : 'Rinnova'}
              </button>
            </div>
          );
        })}
      </div>
      {errore && <p className="mt-3 text-xs font-semibold text-down">{errore}</p>}
    </div>
  );
}
