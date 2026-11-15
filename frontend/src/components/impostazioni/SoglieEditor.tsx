import React, { useState } from 'react';
import { Percent, Calendar, X } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import DropdownMenu from '../DropdownMenu';
import type { Soglia } from '../../data/mockData';
import { MESI_ITALIANI } from '../../utils/date';
import { chiaveMese, soglieAttuali, sogliePerMese } from '../../utils/thresholds';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, TitoloGruppo, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

/**
 * Editor "Soglie" (popup di Impostazioni → Dati Base): target % di
 * allocazione del reddito. Le soglie hanno uno storico: cambiando una
 * percentuale si sceglie da che mese vale, e i mesi prima restano misurati
 * con la versione di allora. La lista mostra le soglie valide oggi.
 */
export default function SoglieEditor() {
  const { soglie = [], error } = useDatiBase();
  const [aperta, setAperta] = useVoceAperta<string>();
  useScheda(aperta === null ? null : aperta === 'nuova' ? 'Nuova soglia' : aperta, () => setAperta(null));

  if (aperta !== null) {
    return <SchedaSoglia key={aperta} originale={aperta === 'nuova' ? null : aperta} chiudi={() => setAperta(null)} />;
  }

  const attuali = soglieAttuali(soglie);
  const totale = attuali.reduce((sum, s) => sum + (s.percentuale || 0), 0);

  return (
    <div>
      <IntroEditor>
        Quanto del reddito va a Spese Primarie, Spese Secondarie, Risparmio, Investimenti... Le
        percentuali dovrebbero sommare a 100%. Quando ne cambi una scegli da che mese vale: i mesi
        prima restano misurati con quella vecchia.
      </IntroEditor>
      <ListaVoci vuota="Nessuna soglia ancora.">
        {attuali.map(s => (
          <VoceRiga
            key={s.categoria}
            icona={<Percent className="w-4 h-4 text-accent" />}
            titolo={s.categoria}
            sottotitolo={s.dal ? `Da ${etichettaMese(s.dal)}` : undefined}
            valore={`${s.percentuale}%`}
            onClick={() => setAperta(s.categoria)}
          />
        ))}
      </ListaVoci>
      {attuali.length > 0 && (
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

/** "2026-11" → "Novembre 2026"; vuoto → "sempre". */
function etichettaMese(dal?: string): string {
  if (!dal) return 'sempre';
  const [anno, mese] = dal.split('-').map(Number);
  return `${MESI_ITALIANI[mese - 1] ?? '?'} ${anno}`;
}

const confrontaDal = (a: Soglia, b: Soglia) => (a.dal || '').localeCompare(b.dal || '');

/** Sostituisce le versioni di `categoria` con `nuove`, nella posizione della prima (in coda se è nuova). */
function sostituisciVersioni(soglie: Soglia[], categoria: string | null, nuove: Soglia[]): Soglia[] {
  const idx = categoria === null ? -1 : soglie.findIndex(s => s.categoria === categoria);
  const resto = soglie.filter(s => s.categoria !== categoria);
  if (idx < 0) return [...resto, ...nuove];
  const prima = soglie.slice(0, idx).filter(s => s.categoria !== categoria).length;
  return [...resto.slice(0, prima), ...nuove, ...resto.slice(prima)];
}

function SchedaSoglia({ originale, chiudi }: { originale: string | null; chiudi: () => void }) {
  const { soglie = [], updateDatiBase } = useDatiBase();
  const oggi = new Date();
  const versioni = soglie.filter(s => s.categoria === originale).sort(confrontaDal);
  const attuale = originale ? sogliePerMese(versioni, oggi.getFullYear(), oggi.getMonth())[0] : undefined;

  const [nome, setNome] = useState(originale ?? '');
  const [percentuale, setPercentuale] = useState(attuale ? String(attuale.percentuale) : '');
  // Una soglia nuova vale per tutti i mesi; una che cambia, dal mese in corso.
  const [daSempre, setDaSempre] = useState(originale === null);
  const [mese, setMese] = useState(oggi.getMonth());
  const [anno, setAnno] = useState(oggi.getFullYear());

  const pulito = nome.trim();
  const valore = Number(percentuale);
  const dal = chiaveMese(anno, mese);
  const duplicato = pulito !== originale && soglie.some(s => s.categoria === pulito);

  // Le versioni dopo il salvataggio: rinominate, più quella nuova dal mese scelto
  // (che prende il posto di una già presente nello stesso mese). Se nel mese
  // scelto vale già questa percentuale non serve una versione nuova.
  const rinominate = versioni.map(v => ({ ...v, categoria: pulito }));
  const vigente = sogliePerMese(rinominate, anno, mese)[0];
  const nuove: Soglia[] = daSempre
    ? [{ categoria: pulito, percentuale: valore }]
    : vigente && vigente.percentuale === valore
      ? rinominate
      : [...rinominate.filter(v => (v.dal || '') !== dal), { categoria: pulito, percentuale: valore, dal }].sort(confrontaDal);

  const modificata = JSON.stringify(nuove) !== JSON.stringify(versioni);
  const valido = Boolean(pulito) && !duplicato && percentuale !== '' && valore >= 0 && valore <= 100 && modificata;

  // Totale nel mese da cui vale la modifica (oggi, se vale da sempre).
  const [annoTot, meseTot] = daSempre ? [oggi.getFullYear(), oggi.getMonth()] : [anno, mese];
  const altre = sogliePerMese(soglie.filter(s => s.categoria !== originale), annoTot, meseTot)
    .reduce((sum, s) => sum + (s.percentuale || 0), 0);

  const salva = () => {
    if (!valido) return;
    updateDatiBase({ soglie: sostituisciVersioni(soglie, originale, nuove) });
    chiudi();
  };

  const eliminaVersione = (v: Soglia) => {
    updateDatiBase({ soglie: soglie.filter(s => s !== v) });
  };

  const primoAnno = Math.min(oggi.getFullYear() - 5, ...versioni.filter(v => v.dal).map(v => Number(v.dal!.slice(0, 4))));
  const anni = Array.from({ length: oggi.getFullYear() + 2 - primoAnno + 1 }, (_, i) => String(primoAnno + i));

  return (
    <div className="space-y-4">
      <Campo label="Nome" nota={originale && versioni.length > 1 ? 'Il nome cambia in tutti i mesi.' : undefined}>
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

      <Campo
        label="Vale per"
        nota={daSempre
          ? (versioni.length > 1 ? 'Sostituisce tutte le versioni: anche i mesi passati useranno questo valore.' : 'Anche i mesi passati useranno questo valore.')
          : 'I mesi prima restano con la soglia che valeva allora.'}
      >
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-canvas dark:bg-white/5" role="radiogroup">
          {[{ v: false, l: 'Da un mese in poi' }, { v: true, l: 'Tutti i mesi' }].map(o => (
            <button
              key={o.l}
              type="button"
              role="radio"
              aria-checked={daSempre === o.v}
              onClick={() => setDaSempre(o.v)}
              className={`py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${daSempre === o.v ? 'bg-accent-strong text-white' : 'text-ink-soft hover:text-ink dark:hover:text-slate-200'}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Campo>

      {!daSempre && (
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Dal mese">
            <DropdownMenu
              icon={Calendar}
              label="Dal mese"
              ariaLabel="Dal mese"
              accent="teal"
              fullWidth
              hideLabel
              value={String(mese)}
              displayValue={MESI_ITALIANI[mese]}
              options={MESI_ITALIANI.map((_, i) => String(i))}
              getOptionLabel={i => MESI_ITALIANI[Number(i)]}
              onSelect={i => setMese(Number(i))}
            />
          </Campo>
          <Campo label="Anno">
            <DropdownMenu
              icon={Calendar}
              label="Anno"
              ariaLabel="Anno"
              accent="teal"
              fullWidth
              hideLabel
              value={String(anno)}
              displayValue={String(anno)}
              options={anni}
              onSelect={a => setAnno(Number(a))}
            />
          </Campo>
        </div>
      )}

      {versioni.length > 1 && (
        <div>
          <TitoloGruppo>Storico</TitoloGruppo>
          <ul className="space-y-1.5">
            {[...versioni].reverse().map(v => (
              <li key={v.dal || 'sempre'} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-canvas dark:bg-white/5 text-sm">
                <span className="flex-1 text-ink dark:text-slate-200">
                  Da {etichettaMese(v.dal)}
                  {v === attuale && <span className="ml-2 text-2xs font-bold text-accent uppercase tracking-wider">in uso</span>}
                </span>
                <span className="font-semibold tabular-nums text-ink dark:text-slate-200">{v.percentuale}%</span>
                <button
                  type="button"
                  onClick={() => eliminaVersione(v)}
                  aria-label={`Elimina la versione da ${etichettaMese(v.dal)}`}
                  className="p-1 -mr-1 rounded-lg text-ink-soft hover:text-down hover:bg-down/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={valido}
        etichettaSalva={originale ? 'Salva' : 'Aggiungi soglia'}
        onElimina={originale ? () => { updateDatiBase({ soglie: soglie.filter(s => s.categoria !== originale) }); chiudi(); } : undefined}
      />
    </div>
  );
}
