import { useEffect, useSyncExternalStore } from 'react';

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

// Pannelli laterali aperti (SlideOverPanel, es. il dettaglio del mese): il "+"
// sta sopra di loro, quindi mentre ce n'è uno aperto deve sparire. Contatore e
// non booleano, nel caso se ne aprano due uno sopra l'altro.
let pannelliAperti = 0;

/** Da chiamare in un pannello laterale: finché `isOpen` è true il "+" resta nascosto. */
export function usePannelloAperto(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    pannelliAperti++;
    ascoltatori.forEach(fn => fn());
    return () => {
      pannelliAperti--;
      ascoltatori.forEach(fn => fn());
    };
  }, [isOpen]);
}

/** True se sono aperti i pallini della barra in basso o un pannello laterale: il "+" in basso a destra si nasconde. */
export function useNascondiAggiunta(): boolean {
  const menu = useBolleAperte();
  const pannello = useSyncExternalStore(subscribe, () => pannelliAperti > 0, () => false);
  return menu === 'transazioni' || menu === 'investimenti' || pannello;
}
