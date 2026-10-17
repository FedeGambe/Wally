import React, { useEffect, useState } from 'react';
import { Landmark, RefreshCw, X, Check, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useMovimentiBanca, type MovimentoDaConfermare } from '../../hooks/useMovimentiBanca';
import { useFinanceData } from '../../context/FinanceDataContext';
import { avviaCollegamentoBanca, giorniAllaScadenza, BANCHE_COLLEGABILI, STATO_REGISTRATO, STATO_IGNORATO } from '../../lib/bancaService';
import { formatEuro } from '../../utils/format';
import RegistraMovimentoModal from './RegistraMovimentoModal';
import { descrizioneBreve, dataProbabile } from '../../utils/movimentiBanca';

const MOSTRATI_DI_BASE = 5;
const AVVISO_SCADENZA_GIORNI = 14;

const etichettaProposta = (m: MovimentoDaConfermare) => {
  if (!m.proposta) return null;
  if (m.proposta.tipo === 'entrata') return m.proposta.categoria;
  if (m.proposta.tipo === 'trasferimento') {
    const altro = m.movimento.importo < 0 ? m.proposta.contoBeneficiario : m.proposta.contoOrdinante;
    return altro ? `Trasferimento ${m.movimento.importo < 0 ? 'verso' : 'da'} ${altro}` : 'Trasferimento';
  }
  return m.regola ?? null;
};

/**
 * Card "Dalla banca" in Panoramica: cosa è stato registrato in automatico
 * dall'ultima sincronizzazione, i movimenti da confermare (con i moduli di
 * Aggiungi Dato precompilati) e l'avviso quando il consenso di una banca sta
 * per scadere. Mostra anche l'esito del ritorno da /api/banca/callback
 * (?banca=collegata o ?banca=errore nell'indirizzo). Non compare finché non
 * c'è almeno una banca collegata.
 */
export default function MovimentiBancaCard() {
  const { accessToken } = useFinanceData();
  const { attivo, daConfermare, collegamenti, registratiOra, errore, inCaricamento, segna, sincronizzaOra } = useMovimentiBanca();
  const [aperto, setAperto] = useState<MovimentoDaConfermare | null>(null);
  const [mostraTutti, setMostraTutti] = useState(false);
  // Ultimo movimento ignorato: per qualche secondo si può annullare (la X è
  // accanto alla riga e un tocco sbagliato non deve far perdere il movimento).
  const [ignorato, setIgnorato] = useState<{ riga: number; descrizione: string } | null>(null);

  useEffect(() => {
    if (!ignorato) return;
    const timer = setTimeout(() => setIgnorato(null), 8000);
    return () => clearTimeout(timer);
  }, [ignorato]);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);

  useEffect(() => {
    const parametri = new URLSearchParams(window.location.search);
    const esito = parametri.get('banca');
    if (!esito) return;
    setMessaggio(esito === 'collegata'
      ? { ok: true, testo: `${parametri.get('nome') || 'Banca'} collegata: i movimenti arriveranno con la prossima sincronizzazione.` }
      : { ok: false, testo: parametri.get('motivo')
          ? `Collegamento non riuscito: ${parametri.get('motivo')}. Riprova da Impostazioni → Banche collegate.`
          : 'Collegamento con la banca non riuscito. Riprova da Impostazioni → Banche collegate.' });
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  if (!attivo || (collegamenti.length === 0 && daConfermare.length === 0 && !messaggio && !errore)) return null;

  const inScadenza = [...new Map(collegamenti.map(c => [c.banca, c])).values()]
    .map(c => ({ ...c, giorni: giorniAllaScadenza(c.scadenza) }))
    .filter(c => c.giorni <= AVVISO_SCADENZA_GIORNI);

  const rinnova = async (banca: string) => {
    if (!accessToken) return;
    const paese = BANCHE_COLLEGABILI.find(b => b.banca === banca)?.paese ?? 'IT';
    try {
      window.location.href = await avviaCollegamentoBanca(accessToken, banca, paese);
    } catch (e: any) {
      setMessaggio({ ok: false, testo: e?.message || 'Rinnovo del collegamento non riuscito: controlla la connessione e riprova.' });
    }
  };

  const sincronizza = async () => {
    try {
      const esito = await sincronizzaOra();
      if (esito) {
        const problemi = [...esito.errori, ...esito.scaduti.map(s => `${s}: consenso scaduto`)];
        setMessaggio(problemi.length > 0
          ? { ok: false, testo: problemi.join(' · ') }
          : { ok: true, testo: esito.aggiunti === 0 ? 'Nessun movimento nuovo.' : esito.aggiunti === 1 ? '1 movimento nuovo scaricato.' : `${esito.aggiunti} movimenti nuovi scaricati.` });
      }
    } catch (e: any) {
      setMessaggio({ ok: false, testo: e?.message || 'Sincronizzazione non riuscita: controlla la connessione e riprova.' });
    }
  };

  const ignora = async (m: MovimentoDaConfermare) => {
    try {
      await segna([m.riga], STATO_IGNORATO);
      setIgnorato({ riga: m.riga, descrizione: descrizioneBreve(m.movimento.descrizione) || m.movimento.descrizione || 'Pagamento con carta' });
    } catch (e: any) {
      setMessaggio({ ok: false, testo: e?.message || 'Movimento non ignorato: controlla la connessione e riprova.' });
    }
  };

  const annullaIgnora = async () => {
    if (!ignorato) return;
    const { riga } = ignorato;
    setIgnorato(null);
    try {
      await segna([riga], '');
    } catch (e: any) {
      setMessaggio({ ok: false, testo: e?.message || 'Annullamento non riuscito: controlla la connessione e riprova.' });
    }
  };

  const mostrati = mostraTutti ? daConfermare : daConfermare.slice(0, MOSTRATI_DI_BASE);

  return (
    <div className="bg-white dark:bg-white/5 p-5 md:p-6 rounded-3xl border border-hairline dark:border-white/10 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="font-bold text-lg font-display text-ink dark:text-slate-100">Dalla banca</h2>
          {daConfermare.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-accent text-white text-2xs font-bold">{daConfermare.length} da confermare</span>
          )}
        </div>
        <button
          type="button"
          onClick={sincronizza}
          disabled={inCaricamento}
          aria-label={inCaricamento ? 'Sincronizzazione in corso' : 'Sincronizza ora'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-ink-soft hover:text-ink dark:hover:text-slate-200 hover:bg-canvas dark:hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${inCaricamento ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sincronizza ora</span>
        </button>
      </div>

      {/* Esiti ed errori annunciati anche dagli screen reader (role status/alert). */}
      {messaggio && (
        <p role={messaggio.ok ? 'status' : 'alert'} className={`mb-3 text-xs font-semibold ${messaggio.ok ? 'text-up' : 'text-down'}`}>{messaggio.testo}</p>
      )}
      {errore && <p role="alert" className="mb-3 text-xs font-semibold text-down">{errore}</p>}
      {ignorato && (
        <div role="status" className="mb-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-canvas dark:bg-white/5 text-xs">
          <span className="min-w-0 truncate text-ink-soft dark:text-slate-300">
            Ignorato: <strong className="font-semibold text-ink dark:text-slate-100">{ignorato.descrizione}</strong>
          </span>
          <button type="button" onClick={annullaIgnora} className="px-3 py-1.5 rounded-lg font-bold text-accent hover:bg-accent/10 cursor-pointer shrink-0">
            Annulla
          </button>
        </div>
      )}

      {inScadenza.map(c => (
        <div key={c.banca} className="mb-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-xs">
          <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {c.giorni < 0
              ? `Il collegamento con ${c.banca} è scaduto`
              : c.giorni === 0
                ? `Il collegamento con ${c.banca} scade oggi`
                : c.giorni === 1
                  ? `Il collegamento con ${c.banca} scade domani`
                  : `Il collegamento con ${c.banca} scade tra ${c.giorni} giorni`}
          </span>
          <button type="button" onClick={() => rinnova(c.banca)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold cursor-pointer hover:bg-amber-600 shrink-0">
            Rinnova
          </button>
        </div>
      ))}

      {registratiOra.length > 0 && (
        <div className="mb-3 flex items-start gap-2 text-xs text-ink-soft">
          <CheckCircle2 className="w-4 h-4 text-up shrink-0 mt-px" />
          <span>Registrati in automatico: {registratiOra.join(' · ')}</span>
        </div>
      )}

      {daConfermare.length === 0 ? (
        registratiOra.length === 0 && <p className="text-xs text-ink-soft">Nessun movimento da confermare.</p>
      ) : (
        <ul className="divide-y divide-hairline dark:divide-white/10">
          {mostrati.map(m => {
            const proposta = etichettaProposta(m);
            const data = dataProbabile(m.movimento);
            return (
              <li
                key={m.movimento.id}
                // Arancio: probabile doppione di una spesa già inserita a mano.
                className={`flex items-center gap-3 py-2.5 ${m.giaInserito ? '-mx-2 px-2 my-1.5 rounded-xl border-transparent bg-orange-50 dark:bg-orange-500/10' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setAperto(m)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer group"
                >
                  <span className="text-2xs font-bold text-ink-soft w-10 shrink-0">{data.slice(8, 10)}/{data.slice(5, 7)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink dark:text-slate-200 truncate group-hover:text-accent">
                      {descrizioneBreve(m.movimento.descrizione) || m.movimento.descrizione || 'Pagamento con carta'}
                    </span>
                    <span className={`block text-2xs truncate ${m.giaInserito ? 'text-orange-700 dark:text-orange-400 font-semibold' : 'text-ink-soft'}`}>
                      {m.movimento.conto}{m.giaInserito ? ` · Già inserita: ${m.giaInserito}?` : proposta ? ` · ${proposta}?` : ''}
                    </span>
                  </span>
                  <span className={`text-sm font-bold shrink-0 ${m.movimento.importo < 0 ? 'text-down' : 'text-up'}`}>{formatEuro(m.movimento.importo)}</span>
                </button>
                {m.giaInserito && (
                  <button
                    type="button"
                    onClick={() => segna([m.riga], STATO_REGISTRATO)}
                    aria-label="Già inserito"
                    title={`Già inserito (${m.giaInserito}): non aggiungere niente`}
                    className="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shrink-0"
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => ignora(m)}
                  aria-label="Ignora movimento"
                  title="Ignora (non registrarlo)"
                  className="w-9 h-9 ml-1 flex items-center justify-center rounded-lg text-ink-soft dark:text-slate-400 hover:text-down dark:hover:text-down hover:bg-canvas dark:hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {daConfermare.length > MOSTRATI_DI_BASE && (
        <button type="button" onClick={() => setMostraTutti(v => !v)} className="mt-2 text-xs font-bold text-accent cursor-pointer">
          {mostraTutti ? 'Mostra meno' : `Mostra tutti (${daConfermare.length})`}
        </button>
      )}

      <RegistraMovimentoModal
        movimento={aperto}
        onClose={() => setAperto(null)}
        onRegistrato={m => { segna([m.riga], STATO_REGISTRATO); setAperto(null); }}
      />
    </div>
  );
}
