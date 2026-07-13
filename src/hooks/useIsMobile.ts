import { useState, useEffect } from 'react';

/**
 * Rileva viewport mobile (sotto breakpointPx, default 640 = "sm" di Tailwind) per
 * adattare a runtime cose che le classi CSS responsive non possono esprimere
 * (es. formattazione dei tick di un asse Recharts, testo generato via JS).
 */
export function useIsMobile(breakpointPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpointPx);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpointPx]);
  return isMobile;
}
