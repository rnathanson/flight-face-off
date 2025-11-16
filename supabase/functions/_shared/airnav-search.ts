/**
 * AirNav Location-Based Airport Search
 * Scrapes AirNav's public airport search to find nearby airports
 */

interface NearbyAirport {
  code: string;
  distance_nm: number;
  name?: string;
}

/**
 * Search for airports near a location using AirNav's public search
 */
export async function searchNearbyAirports(
  lat: number,
  lng: number,
  radiusNm: number
): Promise<NearbyAirport[]> {
  try {
    // Build AirNav search URL
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lng >= 0 ? 'E' : 'W';
    const searchUrl = 
      `https://airnav.com/cgi-bin/airport-search?` +
      `lat=${Math.abs(lat).toFixed(6)}&ns=${ns}&` +
      `lon=${Math.abs(lng).toFixed(6)}&ew=${ew}&` +
      `maxdistance=${Math.ceil(radiusNm)}&distanceunits=nm&fieldtypes=a`;

    console.log(`Searching AirNav for airports within ${radiusNm}nm of ${lat}, ${lng}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TransplantCalc/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`AirNav search failed: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Parse results table
    const airports = parseAirNavSearchResults(html);
    console.log(`✓ Found ${airports.length} airports from AirNav search`);

    return airports;
  } catch (error) {
    console.error('AirNav search error:', error);
    return [];
  }
}

/**
 * Parse AirNav search results HTML
 */
function parseAirNavSearchResults(html: string): NearbyAirport[] {
  const airports: NearbyAirport[] = [];

  try {
    // Look for airport codes in links like: <a href="/airport/KXXX">
    const airportLinkRegex = /<a\s+href=[\"']\/airport\/([A-Z0-9]{3,4})[\"'][^>]*>([^<]+)<\/a>/gi;
    
    // Also look for distance information in the same row
    // Typical format: "XXX.X nm" or "XX.X mi"
    const matches = [...html.matchAll(airportLinkRegex)];
    
    for (const match of matches) {
      const code = match[1];
      const name = match[2].trim();
      
      // Try to find distance in nearby text
      // Look for pattern like ">XX.X nm<" or ">XX.X mi<" near this match
      const contextStart = Math.max(0, match.index! - 200);
      const contextEnd = Math.min(html.length, match.index! + 400);
      const context = html.slice(contextStart, contextEnd);
      
      const distanceMatch = context.match(/>(\d+\.?\d*)\s*nm</i);
      const distance_nm = distanceMatch ? parseFloat(distanceMatch[1]) : 0;
      
      airports.push({
        code,
        name,
        distance_nm,
      });
    }

    // Sort by distance
    airports.sort((a, b) => a.distance_nm - b.distance_nm);

    // Remove duplicates (keep closest)
    const seen = new Set<string>();
    return airports.filter(airport => {
      if (seen.has(airport.code)) return false;
      seen.add(airport.code);
      return true;
    });
  } catch (error) {
    console.error('Error parsing AirNav search results:', error);
    return [];
  }
}
