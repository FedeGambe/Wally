import React from 'react';
import EuroAmount from './EuroAmount';

/**
 * Card riassuntiva per un singolo indicatore finanziario (KPI), es. "Disponibile",
 * "Investito", "Impegnato", "Totale". Mostra un titolo, un valore in euro (grande),
 * un'icona e una riga di dettaglio libera (`detail`, passata da chi usa il componente,
 * es. un confronto col mese precedente). Il colore della card cambia in base a `type`
 * (vedi `typeConfigs` sotto) per dare un colpo d'occhio immediato sul tipo di dato.
 * Componente puramente di presentazione: non calcola nulla, riceve già tutto pronto.
 */
export type FinanceKpiCardType = 'disponibile' | 'investito' | 'impegnato' | 'totale';

interface FinanceKpiCardProps {
    type: FinanceKpiCardType;
    title: string;
    value: number;
    detail: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    id?: string;
}

export default function FinanceKpiCard({
    type,
    title,
    value,
    detail,
    icon: Icon,
    id
}: FinanceKpiCardProps) {
    // Dynamic classes per card type (stile a riquadro chiaro/scuro, coerente con i widget del Cruscotto Investimenti)
    const typeConfigs = {
        disponibile: {
            cardClass: 'bg-emerald-200/70 dark:bg-emerald-950/65 border-emerald-200/80 dark:border-emerald-900/50',
            titleColor: 'text-emerald-600 dark:text-emerald-400',
            iconWrapper: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
            borderT: 'border-emerald-200/70 dark:border-emerald-900/50',
            textColor: 'text-slate-500 dark:text-slate-400',
            bgIconColor: 'text-emerald-500/5 dark:text-emerald-400/5'
        },
        investito: {
            cardClass: 'bg-sky-200/70 dark:bg-sky-950/65 border-sky-200/80 dark:border-sky-900/50',
            titleColor: 'text-sky-600 dark:text-sky-400',
            iconWrapper: 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
            borderT: 'border-sky-200/70 dark:border-sky-900/50',
            textColor: 'text-slate-500 dark:text-slate-400',
            bgIconColor: 'text-sky-500/5 dark:text-sky-400/5'
        },
        impegnato: {
            cardClass: 'bg-amber-200/70 dark:bg-amber-950/65 border-amber-200/80 dark:border-amber-900/50',
            titleColor: 'text-amber-600 dark:text-amber-400',
            iconWrapper: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
            borderT: 'border-amber-200/70 dark:border-amber-900/50',
            textColor: 'text-slate-500 dark:text-slate-400',
            bgIconColor: 'text-amber-500/5 dark:text-amber-400/5'
        },
        totale: {
            cardClass: 'bg-transparent border-slate-200 dark:border-slate-800/60',
            titleColor: 'text-slate-400 dark:text-slate-500',
            iconWrapper: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300',
            borderT: 'border-slate-200 dark:border-slate-800/60',
            textColor: 'text-slate-500 dark:text-slate-400',
            bgIconColor: 'text-slate-400/5 dark:text-slate-300/3'
        }
    };

    // Se `type` non corrisponde a nessuna chiave nota (non dovrebbe succedere, ma
    // TypeScript non lo garantisce a runtime), si usa lo stile "totale" come fallback
    // neutro invece di far crashare il rendering.
    const config = typeConfigs[type] || typeConfigs.totale;

    return (
        <div
            id={id}
            className={`${config.cardClass} rounded-3xl p-4 sm:p-6 flex flex-col justify-between shadow-xs relative overflow-hidden h-24 sm:h-40 border transition-all duration-300 hover:shadow-md hover:scale-[1.01]`}
        >
            {/* Top row with Title and small Icon Container */}
            <div className="flex justify-between items-start z-10">
                <span className={`text-[10px] sm:text-[12px] ${config.titleColor} font-extrabold uppercase tracking-wider block`}>
                    {title}
                </span>
                <div className={`${config.iconWrapper} p-1.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-105`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>

            {/* Value */}
            <div className="z-10 mt-1">
                <h3 className="text-2xl font-black font-display text-slate-800 dark:text-slate-100 block leading-none">
                    <EuroAmount value={value} />
                </h3>
            </div>

            {/* Separator line + Detail description below: nascosto su mobile per
                risparmiare spazio (solo l'importo resta visibile) */}
            <div className={`hidden sm:block border-t ${config.borderT} pt-2 mt-2 z-10`}>
                <div className={`text-[11px] sm:text-xs ${config.textColor} flex items-center gap-2 font-bold`}>
                    {detail}
                </div>
            </div>

            {/* Faded large background icon */}
            <div className={`absolute -right-4 -bottom-4 ${config.bgIconColor} pointer-events-none transition-transform duration-500 group-hover:scale-110`}>
                <Icon className="w-32 h-32" />
            </div>
        </div>
    );
}
