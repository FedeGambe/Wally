import React from 'react';
import { Construction } from 'lucide-react';

/** Contenuto placeholder per le voci di menu già previste ma non ancora
 * costruite (es. Soglie, Trasferimenti/Investimenti/Fondo Pensione ricorrenti).
 * Da sostituire con l'editor vero quando si arriva a quella voce. */
export default function InArrivoPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-canvas dark:bg-white/5 flex items-center justify-center text-ink-soft">
        <Construction className="w-7 h-7" />
      </div>
      <p className="text-sm font-bold text-ink-soft dark:text-slate-300">{label} — in arrivo</p>
      <p className="text-xs text-ink-soft max-w-xs">Non ancora configurabile da qui.</p>
    </div>
  );
}
