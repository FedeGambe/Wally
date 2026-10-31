import { useEffect, useMemo, useRef, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import {
  CHIAVI_DATI,
  IPOTESI_PREDEFINITE,
  chiediPrevisioni,
  type IpotesiPrevisioni,
  type RispostaPrevisioni,
} from '../lib/previsioniService';

const CHIAVE_IPOTESI = 'sf_previsioni_ipotesi';
const ATTESA_MS = 350; // dopo l'ultimo cursore spostato, prima di chiedere al backend

function ipotesiSalvate(): IpotesiPrevisioni {
  try {
    const salvate = JSON.parse(localStorage.getItem(CHIAVE_IPOTESI) || 'null');
    if (salvate && typeof salvate === 'object') {
      return { ...IPOTESI_PREDEFINITE, ...salvate, rendimenti: { ...IPOTESI_PREDEFINITE.rendimenti, ...salvate.rendimenti } };
    }
  } catch { /* storage non disponibile: si parte dalle ipotesi predefinite */ }
  return IPOTESI_PREDEFINITE;
}

/**
 * Dati della pagina Previsioni. Manda al backend (POST /api/previsioni) i dati
 * già in memoria e le ipotesi scelte con i cursori; risponde con le stime.
 * In incognito i dati in memoria sono quelli finti, quindi anche le stime.
 * Nella demo pubblicata (niente backend né login) usa le previsioni già
 * calcolate sui dati finti (data/demoPrevisioni.json) e i cursori sono fermi.
 */
export function usePrevisioni() {
  const { data, accessToken, isIncognito } = useFinanceData();
  const [ipotesi, setIpotesi] = useState<IpotesiPrevisioni>(ipotesiSalvate);
  const [risposta, setRisposta] = useState<RispostaPrevisioni | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCaricamento, setInCaricamento] = useState(false);
  const richiesta = useRef(0);
  const soloDemo = !accessToken && isIncognito;

  const dati = useMemo(() => {
    const scelti: Record<string, unknown> = {};
    for (const chiave of CHIAVI_DATI) scelti[chiave] = (data as Record<string, unknown>)[chiave];
    return scelti;
  }, [data]);

  useEffect(() => {
    try { localStorage.setItem(CHIAVE_IPOTESI, JSON.stringify(ipotesi)); } catch { /* non indispensabile */ }
  }, [ipotesi]);

  // Demo: previsioni già calcolate, caricate una volta. I cursori (fermi)
  // mostrano le ipotesi con cui sono state calcolate.
  useEffect(() => {
    if (!soloDemo) return;
    let attivo = true;
    import('../data/demoPrevisioni.json').then(m => {
      if (!attivo) return;
      const r = m.default as unknown as RispostaPrevisioni;
      setRisposta(r);
      if (r.patrimonio.disponibile) setIpotesi(r.patrimonio.ipotesi);
    });
    return () => { attivo = false; };
  }, [soloDemo]);

  useEffect(() => {
    const numero = ++richiesta.current;
    if (soloDemo || !accessToken) return;
    setInCaricamento(true);
    const timer = setTimeout(() => {
      chiediPrevisioni(accessToken, dati, ipotesi)
        .then(r => { if (numero === richiesta.current) { setRisposta(r); setErrore(null); } })
        .catch((e: Error) => { if (numero === richiesta.current) setErrore(e.message); })
        .finally(() => { if (numero === richiesta.current) setInCaricamento(false); });
    }, ATTESA_MS);
    return () => clearTimeout(timer);
  }, [accessToken, dati, ipotesi, soloDemo]);

  // Il primo obiettivo proposto: il patrimonio di oggi raddoppiato, a decine di migliaia.
  useEffect(() => {
    if (ipotesi.obiettivo !== null || !risposta || !risposta.patrimonio.disponibile || soloDemo) return;
    const totale = risposta.patrimonio.oggi.totale;
    if (totale > 0) setIpotesi(i => ({ ...i, obiettivo: Math.ceil((totale * 2) / 10000) * 10000 }));
  }, [risposta, ipotesi.obiettivo, soloDemo]);

  return {
    risposta,
    errore,
    inCaricamento,
    ipotesi,
    setIpotesi,
    ripristinaIpotesi: () => setIpotesi({ ...IPOTESI_PREDEFINITE, obiettivo: ipotesi.obiettivo }),
    cursoriBloccati: soloDemo,
    isIncognito,
  };
}
