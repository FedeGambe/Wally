import React from 'react';

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
    // Format as Euro
    const formatEuro = (val: number) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
            useGrouping: true
        }).format(val);
    };

    // Dynamic classes per card type
    const typeConfigs = {
        disponibile: {
            cardClass: 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 border-indigo-700 text-white',
            titleColor: 'text-indigo-200',
            iconWrapper: 'bg-white/12 text-white',
            textColor: 'text-indigo-100/90',
            bgOpacity: 'opacity-[0.14]'
        },
        investito: {
            cardClass: 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 border-emerald-700 text-white',
            titleColor: 'text-emerald-200',
            iconWrapper: 'bg-white/12 text-white',
            textColor: 'text-emerald-100/90',
            bgOpacity: 'opacity-[0.14]'
        },
        impegnato: {
            cardClass: 'bg-gradient-to-br from-amber-600 via-amber-600 to-amber-700 border-amber-700 text-white',
            titleColor: 'text-amber-200',
            iconWrapper: 'bg-white/12 text-white',
            textColor: 'text-amber-100/90',
            bgOpacity: 'opacity-[0.14]'
        },
        totale: {
            cardClass: 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-950 text-white',
            titleColor: 'text-slate-400',
            iconWrapper: 'bg-white/10 text-white/90',
            textColor: 'text-slate-300',
            bgOpacity: 'opacity-[0.05]' // Highly opacized/faded background icon for the total card
        }
    };

    const config = typeConfigs[type] || typeConfigs.totale;

    return (
        <div
            id={id}
            className={`${config.cardClass} rounded-3xl p-6 flex flex-col justify-between shadow-xs relative overflow-hidden h-40 border transition-all duration-300 hover:shadow-md hover:scale-[1.01]`}
        >
            {/* Top row with Title and small Icon Container */}
            <div className="flex justify-between items-start z-10">
                <span className={`text-[12px] ${config.titleColor} font-extrabold uppercase tracking-wider block`}>
                    {title}
                </span>
                <div className={`${config.iconWrapper} p-1.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-105`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>

            {/* Value */}
            <div className="z-10 mt-1">
                <h3 className="text-2xl sm:text-[26px] font-black font-display text-white block leading-none">
                    {formatEuro(value)}
                </h3>
            </div>

            {/* Footer / Detail description */}
            <div className={`text-[11px] sm:text-xs ${config.textColor} flex items-center gap-2 mt-auto z-10 font-bold`}>
                {detail}
            </div>

            {/* Faded Background Icon with elegant lower-matte opacity */}
            <div className={`absolute -right-4 -bottom-4 ${config.bgOpacity} pointer-events-none transition-transform duration-500 group-hover:scale-110`}>
                <Icon className="w-32 h-32" />
            </div>
        </div>
    );
}
