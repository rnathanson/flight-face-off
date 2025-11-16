/**
 * Airport Cache Helper
 * Caches AirNav airport data (NOT weather) for 7 days
 */

export interface CachedAirportData {
  airport_code: string;
  name: string;
  lat: number;
  lng: number;
  elevation_ft: number;
  has_jet_fuel: boolean;
  has_lighting: boolean;
  runways: any[];
  cached_at: string;
  expires_at: string;
}

/**
 * Get cached airport data if available and not expired
 */
export async function getCachedAirport(
  airportCode: string,
  supabase: any
): Promise<CachedAirportData | null> {
  try {
    const { data, error } = await supabase
      .from('airport_cache')
      .select('*')
      .eq('airport_code', airportCode.toUpperCase())
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    console.log(`✅ Cache HIT: ${airportCode} (cached ${Math.round((Date.now() - new Date(data.cached_at).getTime()) / (1000 * 60 * 60))}h ago)`);
    return data;
  } catch (error) {
    console.warn(`Cache lookup failed for ${airportCode}:`, error);
    return null;
  }
}

/**
 * Cache airport data for 7 days
 */
export async function cacheAirport(
  airportCode: string,
  airportData: {
    name: string;
    lat: number;
    lng: number;
    elevation_ft: number;
    has_jet_fuel: boolean;
    has_lighting: boolean;
    runways: any[];
  },
  supabase: any
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { error } = await supabase
      .from('airport_cache')
      .upsert({
        airport_code: airportCode.toUpperCase(),
        ...airportData,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'airport_code'
      });

    if (error) {
      console.warn(`Failed to cache ${airportCode}:`, error);
    } else {
      console.log(`💾 Cached airport data for ${airportCode} (expires in 7 days)`);
    }
  } catch (error) {
    console.warn(`Cache write failed for ${airportCode}:`, error);
  }
}

/**
 * Convert cached data to AirNav format
 */
export function cachedToAirnavFormat(cached: CachedAirportData): any {
  return {
    name: cached.name,
    lat: cached.lat,
    lng: cached.lng,
    elevation_ft: cached.elevation_ft,
    has_jet_fuel: cached.has_jet_fuel,
    has_lighting: cached.has_lighting,
    runways: cached.runways,
    metar: null, // NEVER cache weather
    taf: null    // NEVER cache weather
  };
}
