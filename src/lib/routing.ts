import { GeocodeResult } from './geocoding';
import { supabase } from '@/integrations/supabase/client';
import { decodePolyline } from './polyline';
import { calculateDistance } from './geoUtils';

export interface DrivingRouteResult {
  distanceMiles: number;
  durationMinutes: number;
  source: 'google_maps' | 'heuristic';
  polyline?: string;
  coordinates?: [number, number][];
  hasTrafficData?: boolean;
  alternativeRoutes?: {
    distanceMiles: number;
    durationMinutes: number;
    polyline: string;
  }[];
}

export interface TrafficEstimateParams {
  baseTimeMinutes: number;
  departureTime: Date;
  isUrbanArea: boolean;
  isNearHospital: boolean;
}

// Smart traffic estimation based on time-of-day patterns
export function estimateTrafficMultiplier(params: TrafficEstimateParams): number {
  const hour = params.departureTime.getHours();
  const dayOfWeek = params.departureTime.getDay();
  
  let multiplier = 1.0;
  
  // Rush hour penalties
  if (params.isUrbanArea) {
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      multiplier = 1.4; // 40% longer in rush hour
    } else if (hour >= 6 && hour <= 20) {
      multiplier = 1.15; // 15% longer during day
    }
  }
  
  // Hospital area (always congested)
  if (params.isNearHospital) {
    multiplier *= 1.2;
  }
  
  // Weekend bonus
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    multiplier *= 0.9; // 10% faster on weekends
  }
  
  return multiplier;
}

// Cache key generator
function getCacheKey(from: GeocodeResult, to: GeocodeResult): string {
  const key1 = `${from.placeId}-${to.placeId}`;
  const key2 = `${to.placeId}-${from.placeId}`;
  return [key1, key2].sort()[0]; // Use consistent key for both directions
}

// Cache management
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedRoute {
  data: DrivingRouteResult;
  timestamp: number;
}

function getCachedRoute(cacheKey: string): DrivingRouteResult | null {
  try {
    const cached = localStorage.getItem(`route_${cacheKey}`);
    if (!cached) return null;
    
    const { data, timestamp }: CachedRoute = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`route_${cacheKey}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedRoute(cacheKey: string, data: DrivingRouteResult): void {
  try {
    const cached: CachedRoute = { data, timestamp: Date.now() };
    localStorage.setItem(`route_${cacheKey}`, JSON.stringify(cached));
  } catch {
    // Ignore cache errors
  }
}

// Haversine distance fallback
function calculateStraightLineDistance(from: GeocodeResult, to: GeocodeResult): number {
  return calculateDistance(from.lat, from.lon, to.lat, to.lon, 'mi');
}

// Fallback heuristic calculation
function calculateHeuristic(from: GeocodeResult, to: GeocodeResult): DrivingRouteResult {
  const straightLineMiles = calculateStraightLineDistance(from, to);
  const roadFactor = 1.3; // Roads are ~30% longer than straight line
  const actualDrivingMiles = straightLineMiles * roadFactor;
  const avgSpeed = 50; // 50 mph average including traffic, stops
  const baseDurationMinutes = (actualDrivingMiles / avgSpeed) * 60;
  const durationMinutes = baseDurationMinutes * 1.05; // Add 5% for traffic
  
  return {
    distanceMiles: actualDrivingMiles,
    durationMinutes,
    source: 'heuristic'
  };
}

// Main function to get driving route
export async function getRouteDriving(
  from: GeocodeResult,
  to: GeocodeResult,
  departureTime?: string
): Promise<DrivingRouteResult> {
  const cacheKey = getCacheKey(from, to);
  
  // Check cache first (but skip if we have a specific departure time for traffic)
  if (!departureTime) {
    const cachedRoute = getCachedRoute(cacheKey);
    if (cachedRoute) {
      console.log('Using cached driving route');
      return cachedRoute;
    }
  }

  try {
    console.log('Fetching driving route from Google Maps...');
    
    const { data, error } = await supabase.functions.invoke('route-google', {
      body: {
        origin: { lat: from.lat, lon: from.lon },
        destination: { lat: to.lat, lon: to.lon },
        departureTime,
      },
    });

    if (error) {
      console.error('Google Maps routing error:', error);
      throw new Error('Failed to get route from Google Maps');
    }

    if (!data) {
      console.log('No route data from Google Maps, using heuristic');
      return calculateHeuristic(from, to);
    }

    // Decode the polyline for map display
    const coordinates = data.polyline ? decodePolyline(data.polyline) : undefined;

    // Convert km to miles (1 km = 0.621371 miles)
    const distanceMiles = data.distance * 0.621371;

    const result: DrivingRouteResult = {
      distanceMiles,
      durationMinutes: data.duration,
      source: 'google_maps',
      polyline: data.polyline,
      coordinates,
      hasTrafficData: data.hasTrafficData,
    };

    // Cache the successful result (if no specific departure time)
    if (!departureTime) {
      setCachedRoute(cacheKey, result);
    }
    
    console.log('Google Maps route:', {
      distance: result.distanceMiles.toFixed(1),
      duration: result.durationMinutes.toFixed(1),
      hasTrafficData: result.hasTrafficData,
    });

    return result;
  } catch (error) {
    console.error('Error fetching route from Google Maps:', error);
    console.log('Falling back to heuristic calculation');
    return calculateHeuristic(from, to);
  }
}
