import { useCallback, useEffect, useState } from 'react';
import { MACRO_CATEGORIE_USCITE, CATEGORIE_ENTRATE, CONTI, saveDatiBase, MacroCategoriaUscita } from '../data/datiBase';

// Gli array di datiBase.ts sono mutati sul posto (arr.length = 0; arr.push(...)),
// come TRANSACTIONS/RISPARMIO_DATA in mockData.ts: un componente che li ha già
// letti non si accorge da solo che sono cambiati. Qui basta un semplice pub/sub
// (niente Context, sono letti solo da Impostazioni e dai form di inserimento)
// per forzare un re-render dei componenti in ascolto dopo ogni saveDatiBase().
type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach(l => l());

/**
 * Hook usato da Impostazioni (per editare conti/categorie) e dai form
 * "Aggiungi Uscita/Entrata" (per popolare i dropdown). Restituisce le liste
 * correnti e `updateDatiBase`, l'unico modo per modificarle: chiama
 * saveDatiBase() e notifica tutti gli altri componenti in ascolto.
 */
export function useDatiBase() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener: Listener = () => forceRender(v => v + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const updateDatiBase = useCallback((data: {
    macroCategorieUscite?: MacroCategoriaUscita[];
    categorieEntrate?: string[];
    conti?: string[];
  }) => {
    saveDatiBase(data);
    notify();
  }, []);

  return {
    macroCategorieUscite: MACRO_CATEGORIE_USCITE,
    categorieEntrate: CATEGORIE_ENTRATE,
    conti: CONTI,
    updateDatiBase
  };
}
