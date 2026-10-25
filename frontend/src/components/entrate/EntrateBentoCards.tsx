import React from 'react';
import { ArrowUpRight, TrendingUp, Calendar } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import { formatEuro, formatPercent } from '../../utils/format';

interface EntrateBentoCardsProps {
  selectedRecord: any;
  prevRecord: any;
  totalIncomeForSelectedYear: number;
  avgMonthlyIncome: number;
}

// Badge con la variazione percentuale rispetto al mese precedente. Per le
// entrate "di più" è positivo: in calo rosa, in aumento verde, invariato neutro
// ("= 0,0%", prima risultava verde come un aumento). Sta sulla card verde piena:
// pillola chiara con testo scuro del segno, perché verde su verde stava a 2,4:1.
// Nessun badge se manca lo storico o se il mese precedente vale 0 (per evitare
// divisioni per zero).
function renderDelta(current: number, previous?: number) {
  if (previous === undefined || previous === 0) return null;
  const diff = current - previous;
  const formattedPct = formatPercent(Math.abs((diff / previous) * 100));
  const base = 'inline-flex items-center gap-0.5 text-2xs font-extrabold px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 align-middle';

  if (diff === 0) {
    return <span className={`${base} bg-white/20 text-white`}><span>= {formattedPct}</span></span>;
  }
  return diff < 0
    ? <span className={`${base} bg-white/90 text-rose-700`}><span>↓ {formattedPct}</span></span>
    : <span className={`${base} bg-white/90 text-emerald-800`}><span>↑ {formattedPct}</span></span>;
}

/** I due box "bento" in cima a Entrate: Entrate Mensili (con delta vs mese precedente) ed Entrate Annuali + media mensile. */
export default function EntrateBentoCards({ selectedRecord, prevRecord, totalIncomeForSelectedYear, avgMonthlyIncome }: EntrateBentoCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Box Entrate Mensili */}
      <div className="bg-emerald-700 text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-40 border border-emerald-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
        <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-100 backdrop-blur-xs">
          <ArrowUpRight className="w-6 h-6" />
        </div>
        <div className="z-10 text-left">
          <span className="text-xs text-emerald-200 font-bold uppercase tracking-wider block">
            Entrate Mensili ({selectedRecord?.meseDisplay} {selectedRecord?.anno})
          </span>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <div className="text-3xl font-extrabold font-display text-white leading-none">
              <EuroAmount value={selectedRecord?.entrate || 0} />
            </div>
            {renderDelta(selectedRecord?.entrate || 0, prevRecord?.entrate)}
          </div>
        </div>
        <p className="text-xs text-emerald-100/95 mt-auto z-10 font-medium text-left">
          Totale flussi reali accreditati nel mese selezionato
        </p>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <ArrowUpRight className="w-32 h-32" />
        </div>
      </div>

      {/* Box Entrate Annuali */}
      <div className="bg-transparent text-ink rounded-3xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden h-40 border-2 border-emerald-500 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
        <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-up">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="z-10 text-left">
          <span className="text-xs text-up font-bold uppercase tracking-wider block">
            Entrate del {selectedRecord?.anno}
          </span>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <div className="text-3xl font-extrabold font-display text-ink leading-none">
              <EuroAmount value={totalIncomeForSelectedYear} />
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-soft mt-auto z-10 font-medium text-left">
          Media mensile di <strong className="font-bold text-ink">{formatEuro(avgMonthlyIncome)}</strong>
        </p>
        <div className="absolute -right-4 -bottom-4 text-emerald-500/10">
          <TrendingUp className="w-32 h-32" />
        </div>
      </div>
    </div>
  );
}
