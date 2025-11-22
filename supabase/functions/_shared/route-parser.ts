// Route parsing and distance calculation for IFR routes
import { calculateDistance } from './geo-utils.ts';

interface Waypoint {
  code: string;
  lat: number;
  lng: number;
}

interface ParsedRoute {
  waypoints: Waypoint[];
  totalDistanceNM: number;
  routeString: string;
}

// Parse route string and calculate distance
export async function parseRoute(
  routeString: string,
  originAirport: { code: string; lat: number; lng: number },
  destAirport: { code: string; lat: number; lng: number },
  supabase: any
): Promise<ParsedRoute> {
  // Split route string into segments
  // Example: "GREKI DCT LAAYK J174 ETG J121 RDU"
  const segments = routeString.trim().split(/\s+/);
  
  const waypoints: Waypoint[] = [
    { code: originAirport.code, lat: originAirport.lat, lng: originAirport.lng }
  ];
  
  // Resolve each waypoint from database
  for (const segment of segments) {
    // Skip DCT (direct), airways (J###, V###), and destination if already added
    if (segment === 'DCT' || /^[JVQ]\d+$/.test(segment) || segment === destAirport.code) {
      continue;
    }
    
    // Try to resolve waypoint from database
    const { data } = await supabase
      .from('nav_waypoints')
      .select('waypoint_code, lat, lng')
      .eq('waypoint_code', segment)
      .single();
    
    if (data) {
      waypoints.push({
        code: data.waypoint_code,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng)
      });
    }
  }
  
  // Add destination
  waypoints.push({ code: destAirport.code, lat: destAirport.lat, lng: destAirport.lng });
  
  // Calculate total distance
  let totalDistanceNM = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    totalDistanceNM += calculateDistance(from.lat, from.lng, to.lat, to.lng);
  }
  
  return {
    waypoints,
    totalDistanceNM,
    routeString
  };
}

// Get FAA preferred route if available
export async function getFAARoute(
  originICAO: string,
  destICAO: string,
  supabase: any
): Promise<string | null> {
  const { data } = await supabase
    .from('faa_preferred_routes')
    .select('route_string')
    .eq('origin_airport', originICAO)
    .eq('destination_airport', destICAO)
    .maybeSingle();
  
  return data?.route_string || null;
}
