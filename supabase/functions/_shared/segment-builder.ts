import { calculateDistance } from './geo-utils.ts';

export interface TripSegment {
  type: 'flight' | 'ground';
  from: string;
  to: string;
  duration: number;
  distance?: number;
  route?: string;
  traffic?: string;
  polyline?: number[][];
}

export interface SegmentBuilderParams {
  homeBase: any;
  pickupAirport: any;
  destinationAirport: any;
  pickupLocation: any;
  deliveryLocation: any;
  leg1Flight?: any;
  leg2Ground: any;
  leg3Ground: any;
  leg4Flight?: any;
  leg5Ground: any;
  leg1Distance?: number;
  leg4Distance?: number;
  leg1RouteSource?: string;
  leg4RouteSource?: string;
}

/**
 * Build trip segments array with proper formatting
 */
export function buildTripSegments(params: SegmentBuilderParams): TripSegment[] {
  const {
    homeBase,
    pickupAirport,
    destinationAirport,
    leg1Flight,
    leg2Ground,
    leg3Ground,
    leg4Flight,
    leg5Ground,
    leg1Distance,
    leg4Distance,
    leg1RouteSource,
    leg4RouteSource
  } = params;

  const segments: TripSegment[] = [];

  // Leg 1: Home base to pickup airport (flight, if not same airport)
  if (pickupAirport.code !== homeBase.code && leg1Flight) {
    segments.push({
      type: 'flight',
      from: `${homeBase.code} (Home Base)`,
      to: `${pickupAirport.code} (Pickup Airport)`,
      duration: leg1Flight.minutes,
      distance: leg1Distance,
      route: leg1RouteSource,
      polyline: [[homeBase.lng, homeBase.lat], [pickupAirport.lng, pickupAirport.lat]]
    });
  }

  // Leg 2: Pickup airport to pickup hospital (ground)
  segments.push({
    type: 'ground',
    from: `${pickupAirport.code}${pickupAirport.code === homeBase.code ? ' (Home Base)' : ' (Pickup Airport)'}`,
    to: 'Pickup Hospital',
    duration: leg2Ground.duration,
    distance: leg2Ground.distance,
    traffic: leg2Ground.source,
    polyline: leg2Ground.polyline
  });

  // Leg 3: Pickup hospital back to pickup airport (ground)
  segments.push({
    type: 'ground',
    from: 'Pickup Hospital',
    to: `${pickupAirport.code} (Pickup Airport)`,
    duration: leg3Ground.duration,
    distance: leg3Ground.distance,
    traffic: leg3Ground.source,
    polyline: leg3Ground.polyline
  });

  // Leg 4: Pickup airport to destination airport (flight, if not same airport)
  if (pickupAirport.code !== destinationAirport.code && leg4Flight) {
    segments.push({
      type: 'flight',
      from: `${pickupAirport.code} (Pickup Airport)`,
      to: `${destinationAirport.code}${destinationAirport.code === homeBase.code ? ' (Home Base)' : ' (Destination Airport)'}`,
      duration: leg4Flight.minutes,
      distance: leg4Distance,
      route: leg4RouteSource,
      polyline: [[pickupAirport.lng, pickupAirport.lat], [destinationAirport.lng, destinationAirport.lat]]
    });
  }

  // Leg 5: Destination airport to delivery hospital (ground)
  segments.push({
    type: 'ground',
    from: `${destinationAirport.code}${destinationAirport.code === homeBase.code ? ' (Home Base)' : ' (Destination Airport)'}`,
    to: 'Delivery Hospital',
    duration: leg5Ground.duration,
    distance: leg5Ground.distance,
    traffic: leg5Ground.source,
    polyline: leg5Ground.polyline
  });

  return segments;
}

/**
 * Geocode airport by name/code using Google geocoding
 */
export async function geocodeAirport(
  airport: any,
  supabase: any
): Promise<string> {
  try {
    const searchQuery = `${airport.name} ${airport.code} Airport`;
    console.log(`Geocoding airport: ${searchQuery}`);
    
    const geocodeResponse = await supabase.functions.invoke('geocode-google', {
      body: { query: searchQuery, limit: 1 }
    });
    
    if (geocodeResponse.data && geocodeResponse.data.length > 0) {
      const address = geocodeResponse.data[0].address || geocodeResponse.data[0].display_name || '';
      console.log(`✅ Airport address: ${address}`);
      return address;
    }
  } catch (err) {
    console.error('Failed to geocode airport:', err);
  }
  
  return '';
}

/**
 * Generate advisories based on conditions
 */
export function generateAdvisories(
  weatherDelay: number,
  headwind: number,
  trafficMultiplier: number
): string[] {
  const advisories: string[] = [];
  
  if (weatherDelay > 10) {
    advisories.push('⚠️ Significant weather delays expected');
  }
  if (headwind > 20) {
    advisories.push('🌬️ Strong headwinds may increase flight time');
  }
  if (trafficMultiplier > 1.3) {
    advisories.push('🚦 Heavy traffic expected on ground segments');
  }
  
  return advisories;
}
