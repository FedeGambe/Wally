import { useCallback, useEffect, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { useDatiBase } from './useDatiBase';
import {
  elaboraMovimentiBanca, leggiCollegamentiBanca, segnaMovimentiBanca, sincronizzaBancaOra,
  STATO_REGISTRATO, STATO_IGNORATO, type CollegamentoBanca, type MovimentoDaConfermare
} from '../lib/bancaService';

export type { MovimentoDaConfermare };

// Una registrazione automatica alla volta in tutta l'app: due componenti
// montati insieme (o il doppio effetto di React in sviluppo) non devono
// scrivere due volte gli stessi record.
let registrazioneInCorso: Promise<unknown> | null = null;

// Ultimo stato letto, salvato sul dispositivo: la card compare subito
// all'apertura invece di aspettare il backend (che poi lo aggiorna).
const CHIAVE_CACHE = 'sf_banca_cache_v2';

const leggiCache = (): { daConfermare: MovimentoDaConfermare[]; collegamenti: CollegamentoBanca[] } => {
  try {
    const cache = JSON.parse(localStorage.getItem(CHIAVE_CACHE) || '{}');
    return { daConfermare: cache.daConfermare ?? [], collegamenti: cache.collegamenti ?? [] };
  } catch {
    return { daConfermare: [], collegamenti: [] };
  }
};

const scriviCache = (daConfermare: MovimentoDaConfermare[], collegamenti: CollegamentoBanca[]) => {
  try {
    localStorage.setItem(CHIAVE_CACHE, JSON.stringify({ daConfermare, collegamenti }));
  } catch {
    // Spazio pieno o storage bloccato: senza cache la card arriva solo un po' dopo.
  }
};

/**
 * Movimenti scaricati dalle banche (scheda "Movimenti Banca"). Il lavoro lo
 * fa il backend (POST /api/banca/elabora, backend/routes/banca.py): classifica
 * i movimenti con le regole e i Dati Base dell'app, registra da solo quelli
 * riconosciuti con certezza (preset, giri tra conti, PAC) e restituisce gli
 * altri da confermare, già con i suggerimenti per il modulo. La registrazione
 * parte solo dopo un pull riuscito, così il controllo "c'è già?" lavora sui
 * dati aggiornati.
 */
export function useMovimentiBanca() {
  const { accessToken, spreadsheetId, isIncognito, ultimoPullRiuscito, refreshData } = useFinanceData();
  const { conti, presetUscite, presetTrasferimenti, presetInvestimenti, macroCategorieUscite } = useDatiBase();
  const [daConfermare, setDaConfermare] = useState<MovimentoDaConfermare[]>(() => leggiCache().daConfermare);
  const [collegamenti, setCollegamenti] = useState<CollegamentoBanca[]>(() => leggiCache().collegamenti);
  const [registratiOra, setRegistratiOra] = useState<string[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCaricamento, setInCaricamento] = useState(false);

  const attivo = Boolean(accessToken && spreadsheetId && !isIncognito);

  const carica = useCallback(async (conRegistrazione: boolean) => {
    if (!attivo || !accessToken || !spreadsheetId) return;
    setInCaricamento(true);
    setErrore(null);
    try {
      const configId = localStorage.getItem('sf_config_spreadsheet_id');
      const nuoviCollegamenti = configId ? await leggiCollegamentiBanca(accessToken, configId) : [];
      setCollegamenti(nuoviCollegamenti);

      const elabora = (registra: boolean) => elaboraMovimentiBanca(accessToken, spreadsheetId, {
        registra,
        conti,
        contiCollegati: nuoviCollegamenti.map(c => c.contoWally),
        presetUscite,
        presetTrasferimenti,
        presetInvestimenti,
        macroCategorieUscite
      });
      let esito: Awaited<ReturnType<typeof elabora>>;
      if (conRegistrazione) {
        if (!registrazioneInCorso) {
          registrazioneInCorso = elabora(true).finally(() => { registrazioneInCorso = null; });
          esito = await registrazioneInCorso as typeof esito;
        } else {
          // Un'altra registrazione è già partita: si aspetta e poi si rilegge.
          await registrazioneInCorso.catch(() => {});
          esito = await elabora(false);
        }
      } else {
        esito = await elabora(false);
      }

      setDaConfermare(esito.daConfermare);
      scriviCache(esito.daConfermare, nuoviCollegamenti);
      if (esito.errore) setErrore(esito.errore);
      if (esito.registrati.length > 0) {
        setRegistratiOra(prev => [...prev, ...esito.registrati]);
        // Righe nuove su Uscite/Trasferimenti/broker: le rilegge dal foglio,
        // con le colonne calcolate (mese, icona, totali) già aggiornate.
        refreshData();
      }
    } catch (e: any) {
      setErrore(e?.message || 'Lettura dei movimenti bancari non riuscita: tocca Sincronizza ora per riprovare.');
    } finally {
      setInCaricamento(false);
    }
  }, [attivo, accessToken, spreadsheetId, conti, presetUscite, presetTrasferimenti, presetInvestimenti, macroCategorieUscite, refreshData]);

  // Appena aperta, se il pull non è ancora finito: legge subito i movimenti,
  // senza registrare niente (il controllo "c'è già?" vuole i dati aggiornati).
  useEffect(() => {
    if (!ultimoPullRiuscito) carica(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attivo]);

  // Dopo ogni pull riuscito (al login, o dopo "Aggiorna"): rilegge e registra.
  useEffect(() => {
    if (ultimoPullRiuscito) carica(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimoPullRiuscito, attivo]);

  // stato '' = di nuovo da confermare (l'"Annulla" dopo un Ignora nella card):
  // la lista si rilegge dal backend, che rimette il movimento al suo posto.
  const segna = useCallback(async (righe: number[], stato: typeof STATO_REGISTRATO | typeof STATO_IGNORATO | '') => {
    if (!accessToken || !spreadsheetId) return;
    await segnaMovimentiBanca(accessToken, spreadsheetId, righe.map(riga => ({ riga, stato })));
    if (stato === '') {
      await carica(false);
      return;
    }
    const restanti = daConfermare.filter(m => !righe.includes(m.riga));
    setDaConfermare(restanti);
    scriviCache(restanti, collegamenti);
  }, [accessToken, spreadsheetId, daConfermare, collegamenti, carica]);

  const sincronizzaOra = useCallback(async () => {
    if (!accessToken) return null;
    setInCaricamento(true);
    try {
      const esito = await sincronizzaBancaOra(accessToken);
      await carica(true);
      return esito;
    } finally {
      setInCaricamento(false);
    }
  }, [accessToken, carica]);

  return { attivo, daConfermare, collegamenti, registratiOra, errore, inCaricamento, segna, sincronizzaOra, ricarica: () => carica(false) };
}
