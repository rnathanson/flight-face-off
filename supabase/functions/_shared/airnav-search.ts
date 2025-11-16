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
    // Build AirNav search URL with filters for suitable airports
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lng >= 0 ? 'E' : 'W';
    const searchUrl = 
      `https://airnav.com/cgi-bin/airport-search?` +
      `lat=${Math.abs(lat).toFixed(6)}&ns=${ns}&` +
      `lon=${Math.abs(lng).toFixed(6)}&ew=${ew}&` +
      `maxdistance=${Math.ceil(radiusNm)}&distanceunits=nm&fieldtypes=a&` +
      `runwaylength=4000&runwayspaved=1`; // Filter: min 4000ft paved runway

    console.log(`Searching AirNav for airports within ${radiusNm}nm of ${lat}, ${lng} (4000ft+ paved)`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
    console.log(`✓ Found ${airports.length} airports from AirNav (pre-filtered by AirNav for 4000ft+ paved runways)`);

    return airports;
  } catch (error) {
    console.error('AirNav search error:', error);
    return [];
  }
}

/**
 * Normalize airport code to ICAO format
 * US airports: prepend 'K' to 3-letter codes (e.g., RDU -> KRDU)
 */
function normalizeAirportCode(code: string): string {
  // If it's a 3-letter code with only letters, assume it's a US airport and prepend 'K'
  if (code.length === 3 && /^[A-Z]{3}$/.test(code)) {
    return 'K' + code;
  }
  return code;
}

/**
 * Parse AirNav search results HTML
 */
function parseAirNavSearchResults(html: string): NearbyAirport[] {
  const airports: NearbyAirport[] = [];

  try {
    // Match each table row containing an airport
    // Pattern: <TR>...<A href="/airport/CODE">...distance text...</TR>
    const rowRegex = /<TR>[\s\S]*?<A href="\/airport\/([A-Z0-9]{3,4})"[\s\S]*?<\/TR>/gi;
    const rows = [...html.matchAll(rowRegex)];
    
    console.log(`Found ${rows.length} airport rows in HTML`);
    
    for (const row of rows) {
      const rawCode = row[1]; // Airport code from href="/airport/CODE"
      const code = normalizeAirportCode(rawCode); // Normalize to ICAO format
      const rowHtml = row[0]; // Full row HTML
      
      // Extract airport name from the row (4th TD cell typically)
      const nameMatch = rowHtml.match(/<TD align=left>([^<]+AIRPORT[^<]*)<\/TD>/i);
      const name = nameMatch ? nameMatch[1].trim() : '';
      
      // Extract distance from last TD: "12.1 nm NNE"
      const distanceMatch = rowHtml.match(/(\d+\.?\d*)\s*nm\s+[NSEW]{1,3}/i);
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
