/**
 * Pagina "Analisi Consumi": tracking dei rifornimenti/consumi dell'auto.
 * Tutta la logica (parsing dati grezzi, calcoli km/litro/costo, settimana
 * selezionata, statistiche/etichette KPI) vive nell'hook useAnalisiConsumiData
 * (src/hooks/useAnalisiConsumiData.ts). Questo file compone solo la pagina:
 *  - ConsumiRiepilogoSettimanale: riepilogo della settimana selezionata
 *  - un solo interruttore Ultimi 12 mesi / Storico per tutti i grafici
 *  - ConsumiEfficienzaMarcia: grafici Km/Litro e Costo per 100 Km (media 4 settimane + mediana)
 *  - ConsumiPercorrenzaPrezzo: grafici Km percorsi e Prezzo carburante
 *  - ConsumiCostoExtraKmPersi: un grafico Costo Extra / Km Persi rispetto alla mediana
 * Tutti i grafici sono cliccabili per cambiare la settimana selezionata.
 * In alto la barra delle schede: la settimana scelta oppure "Analisi periodo"
 * (subviews/AnalisiConsumiPeriodo.tsx), il costo del carburante su un periodo intero.
 */
import React, { useState } from 'react';
import { CalendarDays, ChartColumn } from 'lucide-react';
import BarraSchede from '../components/BarraSchede';
import AnalisiConsumiPeriodo from '../subviews/AnalisiConsumiPeriodo';
import Modal from '../components/Modal';
import FloatingAddButton from '../components/FloatingAddButton';
import ConsumiRiepilogoSettimanale from '../components/consumi/ConsumiRiepilogoSettimanale';
import ConsumiEfficienzaMarcia from '../components/consumi/ConsumiEfficienzaMarcia';
import ConsumiPercorrenzaPrezzo from '../components/consumi/ConsumiPercorrenzaPrezzo';
import ConsumiCostoExtraKmPersi from '../components/consumi/ConsumiCostoExtraKmPersi';
import AggiungiConsumoForm from '../components/consumi/AggiungiConsumoForm';
import { TimeRangeToggle } from '../components/consumi/ConsumiChartHelpers';
import { useAnalisiConsumiData } from '../hooks/useAnalisiConsumiData';

interface AnalisiConsumiProps {
  goToTodaySignal?: number;
}

export default function AnalisiConsumi({ goToTodaySignal }: AnalisiConsumiProps) {
  const {
    consumiRecords,
    selectedWeek, setSelectedWeekState,
    chartRange, setChartRange, chartData,
    extraChartData, extraMode, setExtraMode, extraUnit, setExtraUnit,
    stats,
    kmLtLabel, cost100Label, kmPersiLabel, costoExtraLabel,
    previousWeek, kmDelta, litriDelta, prezzoDelta,
    deltaClass, kpiCardStyle, kpiTextStyle,
    handleChartClick
  } = useAnalisiConsumiData(goToTodaySignal);

  const [showAddModal, setShowAddModal] = useState(false);
  const [scheda, setScheda] = useState<'settimana' | 'analisi'>('settimana');

  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="sr-only">Analisi Consumi</h1>
      <FloatingAddButton label="Aggiungi Consumo" colorClass="bg-rose-600 hover:bg-rose-700" onClick={() => setShowAddModal(true)} />

      <BarraSchede
        ariaLabel="Sezioni di Analisi Consumi"
        compatta={false}
        accento="#e11d48"
        classeAttiva="bg-rose-600 text-white"
        fissa
        attiva={scheda}
        onChange={setScheda}
        schede={[
          { id: 'settimana', etichetta: `Settimana ${selectedWeek.settimana}`, icona: <CalendarDays className="w-[18px] h-[18px]" /> },
          { id: 'analisi', etichetta: 'Analisi periodo', icona: <ChartColumn className="w-[18px] h-[18px]" /> }
        ]}
      />

      {scheda === 'analisi' ? (
        <AnalisiConsumiPeriodo />
      ) : (
      <>

      <ConsumiRiepilogoSettimanale
        selectedWeek={selectedWeek}
        previousWeek={previousWeek}
        kmDelta={kmDelta}
        litriDelta={litriDelta}
        prezzoDelta={prezzoDelta}
        deltaClass={deltaClass}
        stats={stats}
        kpiCardStyle={kpiCardStyle}
        kpiTextStyle={kpiTextStyle}
        kmLtLabel={kmLtLabel}
        cost100Label={cost100Label}
        kmPersiLabel={kmPersiLabel}
        costoExtraLabel={costoExtraLabel}
        consumiRecords={consumiRecords}
        setSelectedWeekState={setSelectedWeekState}
      />

      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="font-bold text-ink dark:text-slate-100 font-display text-sm">Andamento</h2>
        <TimeRangeToggle value={chartRange} onChange={setChartRange} />
      </div>

      <ConsumiEfficienzaMarcia
        chartData={chartData}
        medianaKmAlLitro={stats.kmAlLitro.median}
        medianaCosto100={stats.costo100.median}
        handleChartClick={handleChartClick}
      />

      <ConsumiPercorrenzaPrezzo
        chartData={chartData}
        handleChartClick={handleChartClick}
      />

      <ConsumiCostoExtraKmPersi
        extraChartData={extraChartData}
        extraMode={extraMode}
        setExtraMode={setExtraMode}
        extraUnit={extraUnit}
        setExtraUnit={setExtraUnit}
        handleChartClick={handleChartClick}
      />
      </>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Aggiungi Consumo" fullScreenOnMobile>
        <AggiungiConsumoForm onSaved={() => setShowAddModal(false)} />
      </Modal>
    </div>
  );
}
