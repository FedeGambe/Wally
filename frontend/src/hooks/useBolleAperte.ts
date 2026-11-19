import { useEffect, useState, useSyncExternalStore } from 'react';

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

/**
 * Per il "+" in basso a destra su telefono (FloatingAddButton, AggiungiDatoBubbles):
 * true mentre l'utente scorre verso il basso (oltre i primi 120px); false appena risale. */
export function useScorreGiu(): boolean {
  const [giu, setGiu] = useState(false);
  useEffect(() => {
    // Il contenitore che scorre non è sempre la finestra (nell'app è il <main>):
    // si ascolta in fase di cattura, così arriva lo scroll di qualunque elemento.
    const ultime = new WeakMap<EventTarget, number>();
    const onScroll = (e: Event) => {
      const el = e.target === document ? document.scrollingElement : (e.target as Element);
      if (!el || !(el instanceof Element)) return;
      // Scroll orizzontali (barre delle schede, tabelle) non contano.
      if (el.scrollHeight <= el.clientHeight + 1) return;
      const y = el.scrollTop;
      const prima = ultime.get(el) ?? y;
      ultime.set(el, y);
      if (Math.abs(y - prima) < 6) return;
      setGiu(y > prima && y > 120);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);
  return giu;
}
