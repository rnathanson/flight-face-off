import { GeocodeResult } from './geocoding';

export interface DrivingRouteResult {
  distanceMiles: number;
  durationMinutes: number;
  source: 'osrm' | 'heuristic';
  polyline?: string; // Encoded polyline for map display
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

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

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
  const R = 3959; // Earth's radius in miles
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLon = (to.lon - from.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
  to: GeocodeResult
): Promise<DrivingRouteResult> {
  // Check cache first
  const cacheKey = getCacheKey(from, to);
  const cached = getCachedRoute(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  
  try {
    // Enhanced OSRM call with full geometry and alternatives
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&alternatives=true&steps=true&geometries=polyline&annotations=duration,distance`;
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OSRM responded with ${response.status}`);
    }
    
    const json = await response.json();
    
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      throw new Error('OSRM returned no valid routes');
    }
    
    const route = json.routes[0];
    const distanceMiles = route.distance / 1609.344; // meters to miles
    const baseDurationMinutes = route.duration / 60; // seconds to minutes
    const durationMinutes = baseDurationMinutes * 1.05; // Add 5% for traffic
    
    // Extract alternative routes if available
    const alternativeRoutes = json.routes.slice(1, 3).map((altRoute: any) => ({
      distanceMiles: altRoute.distance / 1609.344,
      durationMinutes: (altRoute.duration / 60) * 1.05,
      polyline: altRoute.geometry
    }));
    
    const result: DrivingRouteResult = {
      distanceMiles,
      durationMinutes,
      source: 'osrm',
      polyline: route.geometry, // Encoded polyline
      alternativeRoutes: alternativeRoutes.length > 0 ? alternativeRoutes : undefined
    };
    
    // Cache the result
    setCachedRoute(cacheKey, result);
    
    return result;
  } catch (error) {
    console.warn('OSRM routing failed, using heuristic:', error);
    // Return heuristic fallback
    const result = calculateHeuristic(from, to);
    // Cache the fallback too (but with shorter duration implicitly handled by cache timestamp)
    setCachedRoute(cacheKey, result);
    return result;
  }
}
