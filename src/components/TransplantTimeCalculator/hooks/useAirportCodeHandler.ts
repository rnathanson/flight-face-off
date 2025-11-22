import { supabase } from '@/integrations/supabase/client';
import { GeocodeResult } from '@/lib/geocoding';
import { useToast } from '@/hooks/use-toast';

interface UseAirportCodeHandlerProps {
  setSelectedOrigin: (location: GeocodeResult) => void;
  setOriginHospital: (name: string) => void;
  setPreferredPickupAirport: (code: string) => void;
  setSelectedDestination: (location: GeocodeResult) => void;
  setDestinationHospital: (name: string) => void;
  setPreferredDestinationAirport: (code: string) => void;
}

export function useAirportCodeHandler(props: UseAirportCodeHandlerProps) {
  const { toast } = useToast();

  const isAirportCode = (input: string): boolean => {
    const trimmed = input.trim().toUpperCase();
    return /^[A-Z0-9]{3,4}$/.test(trimmed);
  };

  const handleAirportCodeInput = async (code: string, isOrigin: boolean): Promise<boolean> => {
    const normalizedCode = code.trim().toUpperCase();
    
    try {
      // Try looking up airport in database
      let airportData = null;
      
      // First try original code
      const { data: airportResult } = await supabase
        .from('airports')
        .select('icao_code, iata_code, name, lat, lng')
        .or(`icao_code.eq.${normalizedCode},iata_code.eq.${normalizedCode}`)
        .maybeSingle();
      
      if (airportResult) {
        airportData = airportResult;
      } else if (normalizedCode.length === 3) {
        // Try with K prefix for US airports
        const withK = 'K' + normalizedCode;
        const { data: airportResultK } = await supabase
          .from('airports')
          .select('icao_code, iata_code, name, lat, lng')
          .or(`icao_code.eq.${withK},iata_code.eq.${withK}`)
          .maybeSingle();
        
        if (airportResultK) {
          airportData = airportResultK;
        }
      }

      if (airportData) {
        const geocodeResult: GeocodeResult = {
          lat: airportData.lat,
          lon: airportData.lng,
          displayName: airportData.name,
          address: airportData.name,
          placeId: airportData.icao_code,
        };

        if (isOrigin) {
          props.setSelectedOrigin(geocodeResult);
          props.setOriginHospital(airportData.name);
          props.setPreferredPickupAirport(airportData.icao_code);
        } else {
          props.setSelectedDestination(geocodeResult);
          props.setDestinationHospital(airportData.name);
          props.setPreferredDestinationAirport(airportData.icao_code);
        }

        toast({
          title: "Airport Found",
          description: `Using ${airportData.name} (${airportData.icao_code})`,
        });

        return true;
      } else {
        toast({
          title: "Airport Not Found",
          description: `Could not find airport with code: ${code}`,
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error looking up airport:', error);
      toast({
        title: "Error",
        description: "Failed to look up airport code",
        variant: "destructive",
      });
      return false;
    }
  };

  return { isAirportCode, handleAirportCodeInput };
}
