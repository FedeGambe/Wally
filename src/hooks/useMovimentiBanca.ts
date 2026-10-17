import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { useDatiBase } from './useDatiBase';
import { saveToLocalStorage } from '../data/mockData';
import { iconPerMacroCategoria } from '../data/datiBase';
import {
  leggiMovimentiBanca, leggiCollegamentiBanca, segnaMovimentiBanca, sincronizzaBancaOra,
  STATO_REGISTRATO, STATO_IGNORATO, type RigaMovimentoBanca, type CollegamentoBanca
} from '../lib/bancaService';
import { classificaMovimenti, regoleDaPresetUscite, regoleDaPresetInvestimenti, regoleTrasferimentiTraConti, type MovimentoClassificato } from '../utils/movimentiBanca';
import { pianificaRegistrazioni, trovaGiaInseriti } from '../utils/registraBanca';
import { importoGiaInserito } from '../utils/investimentiRicorrenti';
import { REGOLE_BANCA } from '../config/regoleBanca';

export type MovimentoDaConfermare = MovimentoClassificato & {
  riga: number;
  /** Record inserito a mano che sembra già questo movimento (es. "Spesa del 10/10"). */
  giaInserito?: string;
};

// Una registrazione automatica alla volta in tutta l'app: due componenti
// montati insieme (o il doppio effetto di React in sviluppo) non devono
// scrivere due volte gli stessi record.
let registrazioneInCorso: Promise<unknown> | null = null;

// Ultimo stato letto, salvato sul dispositivo: la card compare subito
// all'apertura invece di aspettare la lettura dal foglio (che poi lo aggiorna).
const CHIAVE_CACHE = 'sf_banca_cache';

const leggiCache = (): { movimenti: RigaMovimentoBanca[]; collegamenti: CollegamentoBanca[] } => {
  try {
    const cache = JSON.parse(localStorage.getItem(CHIAVE_CACHE) || '{}');
    return { movimenti: cache.movimenti ?? [], collegamenti: cache.collegamenti ?? [] };
  } catch {
    return { movimenti: [], collegamenti: [] };
  }
};

const scriviCache = (movimenti: RigaMovimentoBanca[], collegamenti: CollegamentoBanca[]) => {
  try {
    localStorage.setItem(CHIAVE_CACHE, JSON.stringify({ movimenti: movimenti.filter(m => !m.stato), collegamenti }));
  } catch {
    // Spazio pieno o storage bloccato: senza cache la card arriva solo un po' dopo.
  }
};

/**
 * Movimenti scaricati dalle banche (scheda "Movimenti Banca"): registra da
 * solo quelli riconosciuti con certezza (preset, giri tra conti, PAC) e
 * restituisce gli altri da confermare. La registrazione parte solo dopo un
 * pull riuscito, così il controllo "c'è già?" lavora sui dati aggiornati.
 */
export function useMovimentiBanca() {
  const { data, accessToken, spreadsheetId, isIncognito, ultimoPullRiuscito, bumpVersion, refreshData } = useFinanceData();
  const { conti, presetUscite, presetTrasferimenti, presetInvestimenti } = useDatiBase();
  const [movimenti, setMovimenti] = useState<RigaMovimentoBanca[]>(() => leggiCache().movimenti);
  const [collegamenti, setCollegamenti] = useState<CollegamentoBanca[]>(() => leggiCache().collegamenti);
  const [registratiOra, setRegistratiOra] = useState<string[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCaricamento, setInCaricamento] = useState(false);

  const attivo = Boolean(accessToken && spreadsheetId && !isIncognito);

  // Ordine: preset e PAC (automatici, i più precisi), regole fisse (stipendio,
  // PAC Scalable, bonifici a sé stessi), bonifici che nominano un altro conto.
  const regole = useMemo(() => {
    const contiCollegati = collegamenti.map(c => c.contoWally);
    return [
      ...regoleDaPresetUscite(presetUscite),
      ...regoleDaPresetInvestimenti(presetInvestimenti, contiCollegati),
      ...REGOLE_BANCA,
      ...regoleTrasferimentiTraConti(contiCollegati, conti)
    ];
  }, [presetUscite, presetInvestimenti, collegamenti, conti]);

  const classifica = useCallback((righe: RigaMovimentoBanca[]): MovimentoDaConfermare[] => {
    const daGestire = righe.filter(r => !r.stato);
    const riga = new Map(daGestire.map(r => [r.id, r.riga]));
    return classificaMovimenti(daGestire, regole).map(c => ({ ...c, riga: riga.get(c.movimento.id)! }));
  }, [regole]);

  const registraAutomatici = useCallback(async (righe: RigaMovimentoBanca[]) => {
    if (!accessToken || !spreadsheetId) return;
    const operazioni = pianificaRegistrazioni(classifica(righe), {
      presetUscite, presetTrasferimenti, uscite: data.uscite, trasferimenti: data.trasferimenti, iconPerMacroCategoria
    });
    if (operazioni.length === 0) return;

    const { appendRowToSheet, writeInvestimentiRicorrentiToSheet } = await import('../lib/sheetsService');
    const uscite = [...data.uscite];
    const trasferimenti = [...data.trasferimenti];
    const fatte: { riga: number; stato: string }[] = [];
    const descrizioni: string[] = [];
    let serveRefresh = false;
    try {
      // Una operazione alla volta: se una fallisce, quelle prima sono già
      // scritte e segnate, e la prossima volta si riparte da lì.
      for (const op of operazioni) {
        if (op.tipo === 'record') {
          if (op.uscita) {
            await appendRowToSheet(accessToken, spreadsheetId, 'Uscite', op.uscita as Record<string, any>);
            uscite.push(op.uscita);
          }
          if (op.trasferimento) {
            await appendRowToSheet(accessToken, spreadsheetId, 'Trasferimenti', op.trasferimento as Record<string, any>);
            trasferimenti.push(op.trasferimento);
          }
          descrizioni.push(op.descrizione);
        } else if (op.tipo === 'investimenti') {
          const voci = presetInvestimenti
            .filter(p => p.broker === op.broker && importoGiaInserito(data, op.broker, p.strumento, op.meseLabel) === 0)
            .map(p => ({ strumento: p.strumento, importo: p.importo }));
          if (voci.length > 0) {
            await writeInvestimentiRicorrentiToSheet(accessToken, spreadsheetId, op.broker, op.meseLabel, voci);
            serveRefresh = true;
            descrizioni.push(op.descrizione);
          }
        }
        fatte.push(...op.righe.map(riga => ({ riga, stato: STATO_REGISTRATO })));
      }
    } finally {
      saveToLocalStorage({ uscite, trasferimenti });
      bumpVersion();
      await segnaMovimentiBanca(accessToken, spreadsheetId, fatte);
      if (descrizioni.length > 0) setRegistratiOra(prev => [...prev, ...descrizioni]);
      // Le colonne calcolate dei broker (totali, rendimenti) le aggiorna il foglio.
      if (serveRefresh) refreshData();
    }
  }, [accessToken, spreadsheetId, classifica, presetUscite, presetTrasferimenti, presetInvestimenti, data, bumpVersion, refreshData]);

  const carica = useCallback(async (conRegistrazione: boolean) => {
    if (!attivo || !accessToken || !spreadsheetId) return;
    setInCaricamento(true);
    setErrore(null);
    try {
      const configId = localStorage.getItem('sf_config_spreadsheet_id');
      const nuoviCollegamenti = configId ? await leggiCollegamentiBanca(accessToken, configId) : [];
      setCollegamenti(nuoviCollegamenti);
      let righe = await leggiMovimentiBanca(accessToken, spreadsheetId);
      if (conRegistrazione && righe.some(r => !r.stato)) {
        if (!registrazioneInCorso) {
          registrazioneInCorso = registraAutomatici(righe).finally(() => { registrazioneInCorso = null; });
        }
        await registrazioneInCorso;
        righe = await leggiMovimentiBanca(accessToken, spreadsheetId);
      }
      setMovimenti(righe);
      scriviCache(righe, nuoviCollegamenti);
    } catch (e: any) {
      setErrore(e?.message || 'Lettura dei movimenti bancari non riuscita: tocca Sincronizza ora per riprovare.');
    } finally {
      setInCaricamento(false);
    }
  }, [attivo, accessToken, spreadsheetId, registraAutomatici]);

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

  const daConfermare = useMemo(() => {
    const lista = classifica(movimenti).filter(c => c.esito === 'da-confermare');
    // I movimenti già registrati passano per primi: i loro record non vanno
    // proposti come "già inserito" per un altro movimento uguale.
    const registrati = movimenti
      .filter(r => r.stato === STATO_REGISTRATO)
      .map(r => ({ movimento: r, esito: 'da-confermare' as const }));
    const giaInseriti = trovaGiaInseriti([...registrati, ...lista], data.uscite);
    return lista
      .map(c => ({ ...c, giaInserito: giaInseriti.get(c.movimento.id) }))
      .sort((a, b) => b.movimento.data.localeCompare(a.movimento.data));
  }, [movimenti, classifica, data.uscite]);

  const segna = useCallback(async (righe: number[], stato: typeof STATO_REGISTRATO | typeof STATO_IGNORATO) => {
    if (!accessToken || !spreadsheetId) return;
    await segnaMovimentiBanca(accessToken, spreadsheetId, righe.map(riga => ({ riga, stato })));
    const aggiornati = movimenti.map(m => righe.includes(m.riga) ? { ...m, stato } : m);
    setMovimenti(aggiornati);
    scriviCache(aggiornati, collegamenti);
  }, [accessToken, spreadsheetId, movimenti, collegamenti]);

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
