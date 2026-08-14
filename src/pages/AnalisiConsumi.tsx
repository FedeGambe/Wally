/**
 * Pagina "Analisi Consumi": tracking dei rifornimenti/consumi dell'auto.
 * Tutta la logica (parsing dati grezzi, calcoli km/litro/costo, settimana
 * selezionata, statistiche/etichette KPI) vive nell'hook useAnalisiConsumiData
 * (src/hooks/useAnalisiConsumiData.ts). Questo file compone solo la pagina:
 *  - ConsumiRiepilogoSettimanale: riepilogo della settimana selezionata
 *  - ConsumiEfficienzaMarcia: grafici Km/Litro e Costo per 100 Km
 *  - ConsumiPercorrenzaPrezzo: grafici Km percorsi e Prezzo carburante
 *  - ConsumiCostoExtraKmPersi: grafici Costo Extra e Km Persi per inefficienza
 * Tutti i grafici sono cliccabili per cambiare la settimana selezionata.
 */
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../components/Modal';
import ConsumiRiepilogoSettimanale from '../components/consumi/ConsumiRiepilogoSettimanale';
import ConsumiEfficienzaMarcia from '../components/consumi/ConsumiEfficienzaMarcia';
import ConsumiPercorrenzaPrezzo from '../components/consumi/ConsumiPercorrenzaPrezzo';
import ConsumiCostoExtraKmPersi from '../components/consumi/ConsumiCostoExtraKmPersi';
import AggiungiConsumoForm from '../components/consumi/AggiungiConsumoForm';
import { useAnalisiConsumiData } from '../hooks/useAnalisiConsumiData';

interface AnalisiConsumiProps {
  goToTodaySignal?: number;
}

export default function AnalisiConsumi({ goToTodaySignal }: AnalisiConsumiProps) {
  const {
    consumiRecords,
    selectedWeek, setSelectedWeekState,
    kmChartRange, setKmChartRange, kmChartData,
    kmLtChartRange, setKmLtChartRange, kmLtChartData,
    euro100ChartRange, setEuro100ChartRange, euro100ChartData,
    prezzoChartRange, setPrezzoChartRange, prezzoChartData,
    costoExtraChartRange, setCostoExtraChartRange, costoExtraChartData,
    kmPersiChartRange, setKmPersiChartRange, kmPersiChartData,
    extraMode, setExtraMode,
    stats,
    kmLtLabel, cost100Label, kmPersiLabel, costoExtraLabel,
    previousWeek, kmDelta, litriDelta, prezzoDelta,
    deltaClass, kpiCardStyle, kpiTextStyle,
    handleChartClick
  } = useAnalisiConsumiData(goToTodaySignal);

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Aggiungi Consumo
        </button>
      </div>

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

      <ConsumiEfficienzaMarcia
        kmLtChartData={kmLtChartData}
        kmLtChartRange={kmLtChartRange}
        setKmLtChartRange={setKmLtChartRange}
        euro100ChartData={euro100ChartData}
        euro100ChartRange={euro100ChartRange}
        setEuro100ChartRange={setEuro100ChartRange}
        handleChartClick={handleChartClick}
      />

      <ConsumiPercorrenzaPrezzo
        kmChartData={kmChartData}
        kmChartRange={kmChartRange}
        setKmChartRange={setKmChartRange}
        prezzoChartData={prezzoChartData}
        prezzoChartRange={prezzoChartRange}
        setPrezzoChartRange={setPrezzoChartRange}
        handleChartClick={handleChartClick}
      />

      <ConsumiCostoExtraKmPersi
        costoExtraChartData={costoExtraChartData}
        costoExtraChartRange={costoExtraChartRange}
        setCostoExtraChartRange={setCostoExtraChartRange}
        kmPersiChartData={kmPersiChartData}
        kmPersiChartRange={kmPersiChartRange}
        setKmPersiChartRange={setKmPersiChartRange}
        extraMode={extraMode}
        setExtraMode={setExtraMode}
        handleChartClick={handleChartClick}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Aggiungi Consumo">
        <AggiungiConsumoForm onSaved={() => setShowAddModal(false)} />
      </Modal>
    </div>
  );
}
