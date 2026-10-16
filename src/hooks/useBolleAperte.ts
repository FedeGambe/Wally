import { useSyncExternalStore } from 'react';

/**
 * Quale menu a pallini è aperto in questo momento, condiviso fra componenti che
 * non si conoscono: la barra in basso (MobileBottomNav: Transazioni, Investimenti)
 * e il "+" della Home (AggiungiDatoBubbles). Ne può stare aperto uno solo: aprirne
 * uno chiude l'altro. Serve anche al bottone "+" delle pagine per sparire mentre
 * sono aperti i pallini della barra in basso.
 */
export type MenuBolle = 'transazioni' | 'investimenti' | 'aggiungi';

let aperto: MenuBolle | null = null;
const ascoltatori = new Set<() => void>();

export function setBolleAperte(menu: MenuBolle | null) {
  if (aperto === menu) return;
  aperto = menu;
  ascoltatori.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  ascoltatori.add(fn);
  return () => { ascoltatori.delete(fn); };
}

export function useBolleAperte(): MenuBolle | null {
  return useSyncExternalStore(subscribe, () => aperto, () => null);
}

/** True se sono aperti i pallini della barra in basso: il "+" in basso a destra si nasconde. */
export function useNascondiAggiunta(): boolean {
  const menu = useBolleAperte();
  return menu === 'transazioni' || menu === 'investimenti';
}
