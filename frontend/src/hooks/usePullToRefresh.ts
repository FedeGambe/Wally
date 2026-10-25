import { useEffect, useRef, useState, type RefObject } from 'react';

/** Quanti px bisogna tirare (dopo la resistenza) perché al rilascio parta l'aggiornamento. */
export const PULL_THRESHOLD = 70;
const MAX_PULL = 110;
/** Resistenza: il dito fa 2px, l'indicatore ne scende 1. */
const RESISTANCE = 0.5;

/**
 * "Tira giù per aggiornare" su telefono: se il contenitore `ref` è già in cima e
 * l'utente trascina verso il basso, restituisce di quanto sta tirando (`pull`);
 * al rilascio oltre PULL_THRESHOLD chiama `onRefresh`.
 *
 * Attivo solo sotto i 768px (breakpoint "md", lo stesso della barra in basso).
 * Non parte se il tocco inizia dentro un popup o dentro un elemento interno già
 * scorso verso il basso (es. una tabella con il suo scroll).
 */
export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  onRefresh: () => void,
  disabled = false,
) {
  const [pull, setPull] = useState(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const mq = window.matchMedia('(max-width: 767px)');
    let startY: number | null = null;
    let current = 0;

    const set = (v: number) => {
      current = v;
      setPull(v);
    };

    const innerScrolled = (target: EventTarget | null) => {
      let node = target instanceof Element ? target : null;
      while (node && node !== el) {
        if (node.scrollTop > 0) return true;
        node = node.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      startY = null;
      if (!mq.matches || e.touches.length !== 1) return;
      if (el.scrollTop > 0) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[role="dialog"], [aria-modal="true"]')) return;
      if (innerScrolled(e.target)) return;
      startY = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || el.scrollTop > 0) {
        // Scroll verso l'alto o pagina non più in cima: lascia fare al browser.
        if (current !== 0) set(0);
        if (dy < 0) startY = null;
        return;
      }
      // Blocca il rimbalzo nativo (iOS) e il ricarica-pagina del browser (Android).
      if (e.cancelable) e.preventDefault();
      set(Math.min(MAX_PULL, dy * RESISTANCE));
    };

    const onEnd = () => {
      if (startY !== null && current >= PULL_THRESHOLD) onRefreshRef.current();
      startY = null;
      if (current !== 0) set(0);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [ref, disabled]);

  return pull;
}
