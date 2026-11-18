/**
 * Pagina "Previsioni" (solo computer): stime fatte dal backend Python
 * (backend/domain/previsioni/) sui dati già in memoria.
 *
 * Come le altre pagine: in alto la barra delle schede (nel viola della
 * pagina) e quattro card KPI col riassunto (PrevisioniKpiCards), ognuna
 * nel colore del suo dato, che portano alla loro scheda.
 * Le schede:
 *  - Questo mese: PrevisioniFineMese, come chiude il mese in corso
 *  - Prossimi 12 mesi: PrevisioniProssimiMesi, entrate, spese e avanzo
 *  - Patrimonio: PrevisioniCrescita (da dove viene la crescita, cifre vere) e
 *    PrevisioniProiezione (dove può arrivare, con i cursori "E se…")
 * Su telefono mostra solo un avviso: i grafici sono pensati per lo schermo largo.
 */
import React, { useState } from 'react';
import { CalendarClock, CalendarRange, Monitor, Sparkles, TrendingUp } from 'lucide-react';
import { usePrevisioni } from '../hooks/usePrevisioni';
import { useIsMobile } from '../hooks/useIsMobile';
import BarraSchede from '../components/BarraSchede';
import PrevisioniFineMese from '../components/previsioni/PrevisioniFineMese';
import PrevisioniProssimiMesi from '../components/previsioni/PrevisioniProssimiMesi';
import PrevisioniCrescita from '../components/previsioni/PrevisioniCrescita';
import PrevisioniProiezione from '../components/previsioni/PrevisioniProiezione';
import PrevisioniKpiCards, { type SchedaPrevisioni } from '../components/previsioni/PrevisioniKpiCards';
import { NonDisponibile, Riquadro } from '../components/previsioni/comune';

/** Colore della pagina (voce attiva della barra laterale: violet-600). */
const VIOLA = '#8b5cf6';

export default function Previsioni() {
  const solotelefono = useIsMobile(768);
  const { risposta, errore, inCaricamento, ipotesi, setIpotesi, ripristinaIpotesi, cursoriBloccati, isIncognito } = usePrevisioni();
  const [scheda, setScheda] = useState<SchedaPrevisioni>('mese');

  if (solotelefono) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6 gap-3">
        <Monitor className="w-10 h-10 text-violet-500" />
        <h1 className="font-display font-bold text-ink text-lg">Previsioni: disponibile su computer</h1>
        <p className="text-sm text-ink-soft max-w-xs">I grafici di questa pagina hanno bisogno di uno schermo largo. Aprila da computer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Previsioni</h1>

      <BarraSchede
        ariaLabel="Sezioni di Previsioni"
        compatta={false}
        accento={VIOLA}
        classeAttiva="bg-violet-600 text-white"
        fissa
        attiva={scheda}
        onChange={setScheda}
        schede={[
          { id: 'mese', etichetta: 'Questo mese', icona: <CalendarClock className="w-[18px] h-[18px]" /> },
          { id: 'prossimi', etichetta: 'Prossimi 12 mesi', icona: <CalendarRange className="w-[18px] h-[18px]" /> },
          { id: 'patrimonio', etichetta: 'Patrimonio', icona: <TrendingUp className="w-[18px] h-[18px]" /> },
        ]}
      />

      {errore && !risposta && (
        <Riquadro icona={Sparkles} titolo="Previsioni non disponibili"><NonDisponibile motivo={errore} /></Riquadro>
      )}

      {!risposta && !errore && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-hairline border-t-violet-600 rounded-full animate-spin" />
        </div>
      )}

      {risposta && (
        <>
          <PrevisioniKpiCards risposta={risposta} anni={ipotesi.anni} scheda={scheda} setScheda={setScheda} />

          <p className="text-xs text-ink-soft">
            Le stime sono sempre una fascia, non una cifra: nei grafici la linea tratteggiata viola è la più probabile, l'area viola è dove il valore cade 8 volte su 10.
            {isIncognito && ' Modalità incognito: stime fatte sui dati finti.'}
            {errore && <span className="text-down"> Ultimo ricalcolo non riuscito: {errore}</span>}
          </p>

          {scheda === 'mese' && <PrevisioniFineMese fineMese={risposta.fineMese} />}
          {scheda === 'prossimi' && <PrevisioniProssimiMesi flussi={risposta.flussi} />}
          {scheda === 'patrimonio' && (risposta.patrimonio.disponibile ? (
            <>
              <PrevisioniCrescita patrimonio={risposta.patrimonio} />
              <PrevisioniProiezione patrimonio={risposta.patrimonio} ipotesi={ipotesi} setIpotesi={setIpotesi}
                ripristina={ripristinaIpotesi} bloccati={cursoriBloccati} inCaricamento={inCaricamento} />
            </>
          ) : (
            <Riquadro icona={Sparkles} titolo="Patrimonio"><NonDisponibile motivo={risposta.patrimonio.motivo} /></Riquadro>
          ))}
        </>
      )}
    </div>
  );
}
