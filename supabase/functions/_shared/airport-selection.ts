import { calculateDistance } from './geo-utils.ts';

export interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  elevation_ft?: number;
  best_runway?: string;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  lng?: number;
  displayName: string;
  address: string;
  placeId: string;
}

export interface AirportSelectionResult {
  pickupAirport: Airport;
  destinationAirport: Airport;
  requiresChiefPilotApproval: boolean;
  approvalData: {
    pickupAirportData: any;
    deliveryAirportData: any;
    pickupSelection: any;
    deliverySelection: any;
  };
  approvalReasons: string[];
}

/**
 * Select optimal pickup and destination airports with Long Island checks
 */
export async function selectTripAirports(params: {
  pickupLocation: GeocodeResult;
  deliveryLocation: GeocodeResult;
  departureTimeUTC: Date;
  preferredPickupAirport?: string;
  preferredDestinationAirport?: string;
  homeBase: Airport;
  config: any;
  supabase: any;
}): Promise<AirportSelectionResult> {
  const { 
    pickupLocation, 
    deliveryLocation, 
    departureTimeUTC, 
    preferredPickupAirport, 
    preferredDestinationAirport,
    homeBase,
    config,
    supabase 
  } = params;

  // Calculate distances from home base (50nm threshold for Long Island)
  console.log('Pickup Location:', { lat: pickupLocation.lat, lng: pickupLocation.lng || pickupLocation.lon, display: pickupLocation.displayName });
  console.log('Delivery Location:', { lat: deliveryLocation.lat, lng: deliveryLocation.lng || deliveryLocation.lon, display: deliveryLocation.displayName });
  
  const pickupLng = pickupLocation.lng || pickupLocation.lon;
  const deliveryLng = deliveryLocation.lng || deliveryLocation.lon;
  
  const pickupDistanceFromKFRG = calculateDistance(homeBase.lat, homeBase.lng, pickupLocation.lat, pickupLng);
  const deliveryDistanceFromKFRG = calculateDistance(homeBase.lat, homeBase.lng, deliveryLocation.lat, deliveryLng);
  
  const isPickupOnLongIsland = pickupDistanceFromKFRG <= 50;
  const isDeliveryOnLongIsland = deliveryDistanceFromKFRG <= 50;

  console.log(`Pickup ${isPickupOnLongIsland ? 'IS' : 'IS NOT'} on Long Island (${pickupDistanceFromKFRG.toFixed(1)}nm from ${homeBase.code})`);
  console.log(`Delivery ${isDeliveryOnLongIsland ? 'IS' : 'IS NOT'} on Long Island (${deliveryDistanceFromKFRG.toFixed(1)}nm from ${homeBase.code})`);

  let pickupAirport = homeBase;
  let destinationAirport = homeBase;
  
  let requiresChiefPilotApproval = false;
  let approvalReasons: string[] = [];
  let pickupAirportApprovalData: any = null;
  let deliveryAirportApprovalData: any = null;
  let pickupAirportSelection: any = null;
  let deliveryAirportSelection: any = null;

  // === PICKUP AIRPORT SELECTION ===
  let usingPreferredPickupAirport = false;
  if (preferredPickupAirport) {
    console.log(`✈️  FORCED preferred pickup airport: ${preferredPickupAirport}`);
    const { data: airportData } = await supabase
      .from('airports')
      .select('*')
      .eq('icao_code', preferredPickupAirport.toUpperCase())
      .single();
    
    if (airportData) {
      pickupAirport = {
        code: airportData.icao_code,
        name: airportData.name,
        lat: airportData.lat,
        lng: airportData.lng,
        elevation_ft: airportData.elevation_ft,
        best_runway: 'N/A'
      };
      usingPreferredPickupAirport = true;
      console.log(`✓ Using FORCED pickup airport: ${pickupAirport.code} (${pickupAirport.name})`);
      console.log(`⚡ Skipping find-qualified-airports call for preferred airport`);
    } else {
      console.log(`⚠️  Preferred pickup airport ${preferredPickupAirport} not found in database, falling back to automatic selection`);
    }
  }

  // Only use automatic selection if no preferred airport was specified or found
  if (!usingPreferredPickupAirport && !isPickupOnLongIsland) {
    // Estimate flight time from home base to pickup location
    const pickupFlightDistanceNM = calculateDistance(
      homeBase.lat, homeBase.lng, 
      pickupLocation.lat, pickupLng
    );
    const pickupFlightMinutes = Math.ceil((pickupFlightDistanceNM / config.cruise_speed_ktas) * 60) + 15;
    const pickupArrivalTimeUTC = new Date(departureTimeUTC.getTime() + pickupFlightMinutes * 60000);

    console.log(`📍 Estimated arrival at pickup airport: ${pickupArrivalTimeUTC.toISOString()} (${pickupFlightMinutes}min flight)`);

    const pickupAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
      body: { 
        location: pickupLocation, 
        maxGroundTimeMinutes: 60,
        departureTimeUTC: departureTimeUTC.toISOString(),
        estimatedArrivalTimeUTC: pickupArrivalTimeUTC.toISOString()
      }
    });
    
    const airportSelection = pickupAirportsResponse.data;
    pickupAirportSelection = airportSelection;
    
    if (airportSelection?.selectedAirport) {
      pickupAirport = airportSelection.selectedAirport;
      pickupAirportApprovalData = airportSelection.selectedAirport;
      
      if (airportSelection.isAlternate && airportSelection.preferredAirport) {
        console.log(`ℹ️ Using alternate pickup airport ${pickupAirport.code} - preferred was ${airportSelection.preferredAirport.code}`);
        console.log(`Rejection reasons: ${airportSelection.preferredAirport.whyRejected.join(', ')}`);
      }
      
      if (pickupAirportApprovalData.requiresChiefPilotApproval) {
        requiresChiefPilotApproval = true;
        if (pickupAirportApprovalData.violatedGuidelines) {
          approvalReasons.push(...pickupAirportApprovalData.violatedGuidelines.map((g: string) => `pickup_${g}`));
        }
      }
    } else if (airportSelection?.airports && airportSelection.airports.length > 0) {
      console.log('⚠️ WARNING: No selectedAirport but airports available - using first option');
      pickupAirport = airportSelection.airports[0];
      requiresChiefPilotApproval = true;
      approvalReasons.push('pickup_no_qualified_airports');
    }
  }

  // === DESTINATION AIRPORT SELECTION ===
  let usingPreferredDestinationAirport = false;
  if (preferredDestinationAirport) {
    console.log(`✈️  FORCED preferred destination airport: ${preferredDestinationAirport}`);
    const { data: airportData } = await supabase
      .from('airports')
      .select('*')
      .eq('icao_code', preferredDestinationAirport.toUpperCase())
      .single();
    
    if (airportData) {
      destinationAirport = {
        code: airportData.icao_code,
        name: airportData.name,
        lat: airportData.lat,
        lng: airportData.lng,
        elevation_ft: airportData.elevation_ft,
        best_runway: 'N/A'
      };
      usingPreferredDestinationAirport = true;
      console.log(`✓ Using FORCED destination airport: ${destinationAirport.code} (${destinationAirport.name})`);
      console.log(`⚡ Skipping find-qualified-airports call for preferred airport`);
    } else {
      console.log(`⚠️  Preferred destination airport ${preferredDestinationAirport} not found in database, falling back to automatic selection`);
    }
  }

  // Only use automatic selection if no preferred airport was specified or found
  if (!usingPreferredDestinationAirport) {
    if (!isDeliveryOnLongIsland) {
      const loadingMinutes = 30;
      const pickupToDeliveryDepartureTime = new Date(
        departureTimeUTC.getTime() + 
        Math.ceil((calculateDistance(homeBase.lat, homeBase.lng, pickupLocation.lat, pickupLng) / config.cruise_speed_ktas) * 60 + 15) * 60000 +
        loadingMinutes * 60000
      );

      const deliveryFlightDistanceNM = calculateDistance(
        pickupLocation.lat, pickupLng,
        deliveryLocation.lat, deliveryLng
      );
      const deliveryFlightMinutes = Math.ceil((deliveryFlightDistanceNM / config.cruise_speed_ktas) * 60) + 15;
      const deliveryArrivalTimeUTC = new Date(
        pickupToDeliveryDepartureTime.getTime() + deliveryFlightMinutes * 60000
      );

      console.log(`📍 Estimated arrival at delivery airport: ${deliveryArrivalTimeUTC.toISOString()} (${deliveryFlightMinutes}min flight)`);

      const deliveryAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
        body: { 
          location: deliveryLocation, 
          maxGroundTimeMinutes: 60,
          departureTimeUTC: pickupToDeliveryDepartureTime.toISOString(),
          estimatedArrivalTimeUTC: deliveryArrivalTimeUTC.toISOString()
        }
      });
      
      const deliverySelection = deliveryAirportsResponse.data;
      deliveryAirportSelection = deliverySelection;
      
      if (deliverySelection?.selectedAirport) {
        destinationAirport = deliverySelection.selectedAirport;
        deliveryAirportApprovalData = deliverySelection.selectedAirport;
        
        if (deliverySelection.isAlternate && deliverySelection.preferredAirport) {
          console.log(`ℹ️ Using alternate delivery airport ${destinationAirport.code} - preferred was ${deliverySelection.preferredAirport.code}`);
          console.log(`Rejection reasons: ${deliverySelection.preferredAirport.whyRejected.join(', ')}`);
        }
        
        if (deliveryAirportApprovalData.requiresChiefPilotApproval) {
          requiresChiefPilotApproval = true;
          if (deliveryAirportApprovalData.violatedGuidelines) {
            approvalReasons.push(...deliveryAirportApprovalData.violatedGuidelines.map((g: string) => `delivery_${g}`));
          }
        }
      } else if (deliverySelection?.airports && deliverySelection.airports.length > 0) {
        console.log('⚠️ WARNING: No selectedAirport but airports available - using first option');
        destinationAirport = deliverySelection.airports[0];
        requiresChiefPilotApproval = true;
        approvalReasons.push('delivery_no_qualified_airports');
      }
    } else {
      destinationAirport = homeBase;
    }
  }

  console.log(`Selected Airports - Pickup: ${pickupAirport.code} (${pickupAirport.name}), Destination: ${destinationAirport.code} (${destinationAirport.name})`);
  console.log(`Flight Route: ${homeBase.code} → ${pickupAirport.code} → ${destinationAirport.code}`);

  return {
    pickupAirport,
    destinationAirport,
    requiresChiefPilotApproval,
    approvalData: {
      pickupAirportData: pickupAirportApprovalData,
      deliveryAirportData: deliveryAirportApprovalData,
      pickupSelection: pickupAirportSelection,
      deliverySelection: deliveryAirportSelection
    },
    approvalReasons
  };
}
