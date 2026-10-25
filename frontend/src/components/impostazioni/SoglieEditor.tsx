import React, { useState } from 'react';
import { Percent } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

/**
 * Editor "Soglie" (popup di Impostazioni → Dati Base): target % di
 * allocazione del reddito. Lista con la percentuale e il totale (dovrebbe
 * fare 100%) → scheda per cambiare nome e percentuale.
 */
export default function SoglieEditor() {
  const { soglie = [], error } = useDatiBase();
  const [aperta, setAperta] = useVoceAperta<string>();
  useScheda(aperta === null ? null : aperta === 'nuova' ? 'Nuova soglia' : aperta, () => setAperta(null));

  if (aperta !== null) {
    return <SchedaSoglia key={aperta} originale={aperta === 'nuova' ? null : aperta} chiudi={() => setAperta(null)} />;
  }

  const totale = soglie.reduce((sum, s) => sum + (s.percentuale || 0), 0);

  return (
    <div>
      <IntroEditor>
        Quanto del reddito va a Spese Primarie, Spese Secondarie, Risparmio, Investimenti... Le
        percentuali dovrebbero sommare a 100%.
      </IntroEditor>
      <ListaVoci vuota="Nessuna soglia ancora.">
        {soglie.map(s => (
          <VoceRiga key={s.categoria} icona={<Percent className="w-4 h-4 text-accent" />} titolo={s.categoria} valore={`${s.percentuale}%`} onClick={() => setAperta(s.categoria)} />
        ))}
      </ListaVoci>
      {soglie.length > 0 && (
        <div className={`mt-3 flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold ${totale === 100 ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn'}`}>
          <span>Totale</span>
          <span className="tabular-nums">{totale}%{totale !== 100 && ' · dovrebbe essere 100%'}</span>
        </div>
      )}
      <AggiungiVoce label="Aggiungi soglia" onClick={() => setAperta('nuova')} />
      <ErroreEditor errore={error} />
    </div>
  );
}

function SchedaSoglia({ originale, chiudi }: { originale: string | null; chiudi: () => void }) {
  const { soglie = [], updateDatiBase } = useDatiBase();
  const esistente = soglie.find(s => s.categoria === originale);
  const [nome, setNome] = useState(esistente?.categoria ?? '');
  const [percentuale, setPercentuale] = useState(esistente ? String(esistente.percentuale) : '');

  const pulito = nome.trim();
  const valore = Number(percentuale);
  const duplicato = pulito !== originale && soglie.some(s => s.categoria === pulito);
  const altre = soglie.filter(s => s.categoria !== originale).reduce((sum, s) => sum + (s.percentuale || 0), 0);
  const modificata = !esistente || pulito !== esistente.categoria || valore !== esistente.percentuale;
  const valido = Boolean(pulito) && !duplicato && percentuale !== '' && valore >= 0 && valore <= 100 && modificata;

  const salva = () => {
    if (!valido) return;
    const aggiornata = { categoria: pulito, percentuale: valore };
    updateDatiBase({
      soglie: originale === null ? [...soglie, aggiornata] : soglie.map(s => (s.categoria === originale ? aggiornata : s))
    });
    chiudi();
  };

  return (
    <div className="space-y-4">
      <Campo label="Nome">
        <input autoFocus={!originale} value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Risparmio" className={inputEditorClass} />
      </Campo>
      {duplicato && <p className="text-xs text-down font-semibold">Esiste già una soglia con questo nome.</p>}
      <Campo label="Percentuale del reddito" nota={`Con questo valore il totale diventa ${altre + (valore || 0)}%.`}>
        <div className="relative">
          <input
            autoFocus={Boolean(originale)}
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            value={percentuale}
            onChange={e => setPercentuale(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && salva()}
            className={`${inputEditorClass} pr-8`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">%</span>
        </div>
      </Campo>
      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={valido}
        etichettaSalva={originale ? 'Salva' : 'Aggiungi soglia'}
        onElimina={originale ? () => { updateDatiBase({ soglie: soglie.filter(s => s.categoria !== originale) }); chiudi(); } : undefined}
      />
    </div>
  );
}
