import { GeocodeResult } from './geocoding';

export interface DrivingRouteResult {
  distanceMiles: number;
  durationMinutes: number;
  source: 'osrm' | 'heuristic';
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
    // Call OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false&alternatives=false&steps=false`;
    
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
    
    const result: DrivingRouteResult = {
      distanceMiles,
      durationMinutes,
      source: 'osrm'
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
