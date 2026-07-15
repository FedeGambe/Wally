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
import React from 'react';
import ConsumiRiepilogoSettimanale from '../components/consumi/ConsumiRiepilogoSettimanale';
import ConsumiEfficienzaMarcia from '../components/consumi/ConsumiEfficienzaMarcia';
import ConsumiPercorrenzaPrezzo from '../components/consumi/ConsumiPercorrenzaPrezzo';
import ConsumiCostoExtraKmPersi from '../components/consumi/ConsumiCostoExtraKmPersi';
import { useAnalisiConsumiData } from '../hooks/useAnalisiConsumiData';

interface AnalisiConsumiProps {
  goToTodaySignal?: number;
}

export default function AnalisiConsumi({ goToTodaySignal }: AnalisiConsumiProps) {
  const {
    consumiRecords,
    selectedWeek, setSelectedWeekState,
    isWeekDropdownOpen, setIsWeekDropdownOpen,
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

  return (
    <div className="space-y-6 animate-fadeIn">
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
        isWeekDropdownOpen={isWeekDropdownOpen}
        setIsWeekDropdownOpen={setIsWeekDropdownOpen}
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
    </div>
  );
}
