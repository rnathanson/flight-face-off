/**
 * AirportDB API Integration
 * Dynamic airport lookup for any location worldwide
 */

const AIRPORTDB_API_TOKEN = Deno.env.get('AIRPORTDB_API_TOKEN');
const AIRPORTDB_BASE_URL = 'https://airportdb.io/api/v1';

export interface AirportResult {
  icao_code: string;
  iata_code?: string;
  name: string;
  municipality?: string;
  country_code: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft?: number;
  type: string;
}

/**
 * Find airports near a given coordinate within a radius
 * @param lat Latitude
 * @param lng Longitude
 * @param radiusNm Radius in nautical miles (default 100)
 * @returns Array of airports sorted by distance
 */
export async function findNearbyAirports(
  lat: number, 
  lng: number, 
  radiusNm: number = 100
): Promise<AirportResult[]> {
  
  if (!AIRPORTDB_API_TOKEN) {
    console.error('❌ AIRPORTDB_API_TOKEN not configured');
    throw new Error('AirportDB API token not configured');
  }

  // Convert nautical miles to kilometers (1 nm = 1.852 km)
  const radiusKm = radiusNm * 1.852;
  
  console.log(`🔍 Searching AirportDB for airports within ${radiusNm}nm of ${lat},${lng}`);

  try {
    const url = `${AIRPORTDB_BASE_URL}/airport/nearby?lat=${lat}&lng=${lng}&max_distance_km=${radiusKm}&limit=50`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRPORTDB_API_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ AirportDB API error: ${response.status}`);
      throw new Error(`AirportDB API returned ${response.status}`);
    }

    const data = await response.json();
    const airports = Array.isArray(data) ? data : (data.airports || []);
    
    console.log(`✓ Found ${airports.length} airports within ${radiusNm}nm`);
    
    return airports;
  } catch (error) {
    console.error('❌ AirportDB API request failed:', error);
    throw error;
  }
}

/**
 * Calculate distance between two coordinates in nautical miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
