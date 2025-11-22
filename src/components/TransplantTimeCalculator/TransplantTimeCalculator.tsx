import { useState, useEffect } from 'react';
import { GeocodeResult } from '@/lib/geocoding';
import { useAirportCodeHandler } from './hooks/useAirportCodeHandler';
import { useTripCalculation } from './hooks/useTripCalculation';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useMapUpdater } from './hooks/useMapUpdater';
import { TripInputForm } from './components/TripInputForm';
import { TripResultsCard } from './components/TripResultsCard';
import { TripBreakdownCard } from './components/TripBreakdownCard';
import { TripMapCard } from './components/TripMapCard';
import { LoadingModal } from './components/LoadingModal';
import { ChiefPilotApprovalModal } from './components/ChiefPilotApprovalModal';
import { filterSegments } from './utils/segmentHelpers';

interface TransplantTimeCalculatorProps {
  onAIPlatformClick?: () => void;
}

export function TransplantTimeCalculator({ onAIPlatformClick }: TransplantTimeCalculatorProps) {
  // Form state
  const [originHospital, setOriginHospital] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<GeocodeResult | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [departureTime, setDepartureTime] = useState('12:00');
  const [passengerCount, setPassengerCount] = useState(2);
  const [preferredPickupAirport, setPreferredPickupAirport] = useState('');
  const [preferredDestinationAirport, setPreferredDestinationAirport] = useState('');
  
  // UI state
  const [showChiefPilotModal, setShowChiefPilotModal] = useState(false);
  const [showFullTrip, setShowFullTrip] = useState(false);

  // Custom hooks
  const airportHandler = useAirportCodeHandler({
    setSelectedOrigin,
    setOriginHospital,
    setPreferredPickupAirport,
    setSelectedDestination,
    setDestinationHospital,
    setPreferredDestinationAirport,
  });

  const tripCalc = useTripCalculation({
    selectedOrigin,
    selectedDestination,
    departureDate,
    departureTime,
    passengerCount,
    preferredPickupAirport,
    preferredDestinationAirport,
  });

  const mapInit = useMapInitialization();
  const mapUpdater = useMapUpdater({ map: mapInit.map, showFullTrip });

  // Handle airport code input
  const handleOriginSelect = async (location: GeocodeResult) => {
    if (airportHandler.isAirportCode(originHospital)) {
      await airportHandler.handleAirportCodeInput(originHospital, true);
    } else {
      setSelectedOrigin(location);
    }
  };

  const handleDestinationSelect = async (location: GeocodeResult) => {
    if (airportHandler.isAirportCode(destinationHospital)) {
      await airportHandler.handleAirportCodeInput(destinationHospital, false);
    } else {
      setSelectedDestination(location);
    }
  };

  // Update map when trip result or display mode changes
  useEffect(() => {
    if (tripCalc.tripResult && mapInit.mapboxToken) {
      const { displaySegments } = filterSegments(tripCalc.tripResult.segments, showFullTrip);
      
      if (!mapInit.map.current) {
        mapInit.initializeMap(tripCalc.tripResult);
      }
      
      if (mapInit.map.current) {
        mapUpdater.updateMap(tripCalc.tripResult, displaySegments);
      }
    }
  }, [mapInit.mapboxToken, tripCalc.tripResult, showFullTrip]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Medical Transport Time Calculator
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          AI-powered trip planning with real-time weather, traffic, and routing intelligence
        </p>
      </div>

      {!tripCalc.tripResult ? (
        <TripInputForm
          originHospital={originHospital}
          onOriginChange={setOriginHospital}
          destinationHospital={destinationHospital}
          onDestinationChange={setDestinationHospital}
          selectedOrigin={selectedOrigin}
          selectedDestination={selectedDestination}
          onOriginSelect={handleOriginSelect}
          onDestinationSelect={handleDestinationSelect}
          departureDate={departureDate}
          onDepartureDateChange={setDepartureDate}
          departureTime={departureTime}
          onDepartureTimeChange={setDepartureTime}
          passengerCount={passengerCount}
          onPassengerCountChange={setPassengerCount}
          calculating={tripCalc.calculating}
          onCalculate={tripCalc.calculateTrip}
        />
      ) : (
        <div className="space-y-6">
          <TripResultsCard
            tripResult={tripCalc.tripResult}
            showFullTrip={showFullTrip}
            onToggleFullTrip={setShowFullTrip}
            onNewCalculation={tripCalc.resetTrip}
            onShowChiefPilotModal={() => setShowChiefPilotModal(true)}
          />

          <TripBreakdownCard
            segments={tripCalc.tripResult.segments}
            showFullTrip={showFullTrip}
            departureTime={tripCalc.tripResult.departure_time}
          />

          <TripMapCard mapContainer={mapInit.mapContainer} />
        </div>
      )}

      <LoadingModal
        calculating={tripCalc.calculating}
        loadingStage={tripCalc.loadingStage}
      />

      <ChiefPilotApprovalModal
        open={showChiefPilotModal}
        onOpenChange={setShowChiefPilotModal}
        chiefPilotApproval={tripCalc.tripResult?.chiefPilotApproval}
      />
    </div>
  );
}
