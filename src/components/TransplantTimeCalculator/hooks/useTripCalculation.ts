import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GeocodeResult } from '@/lib/geocoding';
import { TripResult } from '../types';

interface UseTripCalculationProps {
  selectedOrigin: GeocodeResult | null;
  selectedDestination: GeocodeResult | null;
  departureDate: Date;
  departureTime: string;
  passengerCount: number;
  preferredPickupAirport: string;
  preferredDestinationAirport: string;
}

export function useTripCalculation(props: UseTripCalculationProps) {
  const [calculating, setCalculating] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const { toast } = useToast();

  const calculateTrip = async () => {
    if (!props.selectedOrigin || !props.selectedDestination) {
      toast({
        title: "Missing Information",
        description: "Please enter both origin and destination locations",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);
    setLoadingStage('Initializing calculation...');

    try {
      const departureDateTime = new Date(props.departureDate);
      const [hours, minutes] = props.departureTime.split(':').map(Number);
      departureDateTime.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase.functions.invoke('calculate-accurate-trip', {
        body: {
          origin: props.selectedOrigin,
          destination: props.selectedDestination,
          departureTime: departureDateTime.toISOString(),
          passengerCount: props.passengerCount,
          preferredPickupAirport: props.preferredPickupAirport || undefined,
          preferredDestinationAirport: props.preferredDestinationAirport || undefined,
        },
      });

      if (error) {
        console.error('Trip calculation error:', error);
        throw error;
      }

      if (!data || !data.segments) {
        throw new Error('Invalid response from trip calculation');
      }

      setTripResult(data);
      toast({
        title: "Trip Calculated",
        description: `Total time: ${Math.round(data.total_time_minutes)} minutes`,
      });
    } catch (error: any) {
      console.error('Error calculating trip:', error);
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate trip",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
      setLoadingStage('');
    }
  };

  const resetTrip = () => {
    setTripResult(null);
  };

  return {
    calculating,
    loadingStage,
    tripResult,
    calculateTrip,
    resetTrip,
  };
}
