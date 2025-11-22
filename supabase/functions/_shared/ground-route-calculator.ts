import { calculateDistance, decodePolyline } from './geo-utils.ts';

export interface GroundRouteResult {
  duration: number; // minutes
  distance: number; // miles
  source: string; // 'google_maps' | 'heuristic'
  polyline?: number[][];
  hasTrafficData?: boolean;
}

/**
 * Calculate ground transportation route between two locations
 */
export async function calculateGroundRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  trafficMultiplier: number,
  supabase: any,
  departureTime?: Date
): Promise<GroundRouteResult> {
  try {
    console.log('Calculating ground segment using Google Maps...');
    
    // Call route-google edge function
    const { data, error } = await supabase.functions.invoke('route-google', {
      body: {
        origin: { lat: from.lat, lon: from.lng },
        destination: { lat: to.lat, lon: to.lng },
        departureTime: departureTime?.toISOString()
      }
    });
    
    if (error) throw error;
    
    if (data && data.distance && data.duration) {
      console.log('Google Maps route found:', {
        distance: data.distance,
        duration: data.duration,
        hasTraffic: data.hasTrafficData,
        hasPolyline: !!data.polyline,
        polylineLength: data.polyline?.length
      });
      
      // Decode polyline to coordinates array
      const coordinates = data.polyline ? decodePolyline(data.polyline) : undefined;
      console.log(`  Decoded ${coordinates?.length || 0} coordinate points`);
      
      return {
        duration: Math.round(data.duration),
        distance: Math.round(data.distance * 10) / 10,
        source: 'google_maps',
        polyline: coordinates,
        hasTrafficData: data.hasTrafficData || false
      };
    }
  } catch (error) {
    console.warn('Google Maps routing failed, using heuristic:', error);
  }
  
  // Fallback heuristic
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng) * 1.15092;
  const baseTime = (distance / 45) * 60;
  const adjustedTime = baseTime * trafficMultiplier;
  
  console.log('Using heuristic routing for ground segment');
  
  return {
    duration: Math.round(adjustedTime),
    distance: Math.round(distance * 10) / 10,
    source: 'heuristic'
  };
}

/**
 * Calculate traffic multiplier based on departure time and day
 */
export function calculateTrafficMultiplier(departureTime: Date): number {
  const departureHour = departureTime.getHours();
  const dayOfWeek = departureTime.getDay();
  const isRushHour = (departureHour >= 7 && departureHour <= 9) || (departureHour >= 16 && departureHour <= 19);
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  
  let trafficMultiplier = 1.0;
  if (isRushHour && isWeekday) {
    trafficMultiplier = 1.4;
  } else if (departureHour >= 6 && departureHour <= 20) {
    trafficMultiplier = 1.15;
  }
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    trafficMultiplier *= 0.9;
  }
  
  return trafficMultiplier;
}
