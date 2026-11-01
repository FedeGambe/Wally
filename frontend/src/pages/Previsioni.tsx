/**
 * Pagina "Previsioni" (solo computer): stime fatte dal backend Python
 * (backend/domain/previsioni/) sui dati già in memoria.
 *  - PrevisioniFineMese: come chiude il mese in corso
 *  - PrevisioniProssimiMesi: entrate, spese e avanzo dei prossimi 12 mesi
 *  - PrevisioniCrescita: da dove viene la crescita del patrimonio (cifre vere)
 *  - PrevisioniProiezione: dove può arrivare, con i cursori "E se…"
 * Su telefono mostra solo un avviso: i grafici sono pensati per lo schermo largo.
 */
import React from 'react';
import { Monitor, Sparkles } from 'lucide-react';
import { usePrevisioni } from '../hooks/usePrevisioni';
import { useIsMobile } from '../hooks/useIsMobile';
import PrevisioniFineMese from '../components/previsioni/PrevisioniFineMese';
import PrevisioniProssimiMesi from '../components/previsioni/PrevisioniProssimiMesi';
import PrevisioniCrescita from '../components/previsioni/PrevisioniCrescita';
import PrevisioniProiezione from '../components/previsioni/PrevisioniProiezione';
import { NonDisponibile, Riquadro } from '../components/previsioni/comune';

export default function Previsioni() {
  const solotelefono = useIsMobile(768);
  const { risposta, errore, inCaricamento, ipotesi, setIpotesi, ripristinaIpotesi, cursoriBloccati, isIncognito } = usePrevisioni();

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
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-ink text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" /> Previsioni
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Le stime sono sempre una fascia, non una cifra: la linea tratteggiata è la più probabile, l'area colorata è dove il valore cade 8 volte su 10.
            {isIncognito && ' Modalità incognito: stime fatte sui dati finti.'}
          </p>
        </div>
      </div>

      {errore && !risposta && (
        <Riquadro icona={Sparkles} titolo="Previsioni non disponibili"><NonDisponibile motivo={errore} /></Riquadro>
      )}
      {errore && risposta && <p className="text-xs text-down">Ultimo ricalcolo non riuscito: {errore}</p>}

      {!risposta && !errore && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-hairline border-t-violet-600 rounded-full animate-spin" />
        </div>
      )}

      {risposta && (
        <>
          <PrevisioniFineMese fineMese={risposta.fineMese} />
          <PrevisioniProssimiMesi flussi={risposta.flussi} />
          {risposta.patrimonio.disponibile ? (
            <>
              <PrevisioniCrescita patrimonio={risposta.patrimonio} />
              <PrevisioniProiezione patrimonio={risposta.patrimonio} ipotesi={ipotesi} setIpotesi={setIpotesi}
                ripristina={ripristinaIpotesi} bloccati={cursoriBloccati} inCaricamento={inCaricamento} />
            </>
          ) : (
            <Riquadro icona={Sparkles} titolo="Patrimonio"><NonDisponibile motivo={risposta.patrimonio.motivo} /></Riquadro>
          )}
        </>
      )}
    </div>
  );
}
