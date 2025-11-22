// NOAA Aviation Weather Winds Aloft API Integration
// Provides official flight-level wind and temperature data
import { calculateDistance } from './geo-utils.ts';

// Winds Aloft Station Lookup Table
// These are the official NOAA winds aloft reporting stations with their coordinates
// Each station's data is considered valid for the area around it
interface WindsAloftStation {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

// Comprehensive lookup table of winds aloft stations (focusing on CONUS)
const WINDS_ALOFT_STATIONS: WindsAloftStation[] = [
  // Florida & Southeast
  { code: 'MIA', name: 'Miami, FL', lat: 25.8, lng: -80.3, region: 'mia' },
  { code: 'TPA', name: 'Tampa, FL', lat: 27.9, lng: -82.5, region: 'mia' },
  { code: 'JAX', name: 'Jacksonville, FL', lat: 30.5, lng: -81.7, region: 'mia' },
  { code: 'TLH', name: 'Tallahassee, FL', lat: 30.4, lng: -84.4, region: 'mia' },
  { code: 'SAV', name: 'Savannah, GA', lat: 32.1, lng: -81.2, region: 'mia' },
  { code: 'ATL', name: 'Atlanta, GA', lat: 33.6, lng: -84.4, region: 'mia' },
  { code: 'BIJ', name: 'Albany, GA', lat: 31.5, lng: -84.2, region: 'mia' },
  { code: 'AGS', name: 'Augusta, GA', lat: 33.4, lng: -82.0, region: 'mia' },
  
  // Carolinas & Virginia
  { code: 'CAE', name: 'Columbia, SC', lat: 33.9, lng: -81.1, region: 'mia' },
  { code: 'CHS', name: 'Charleston, SC', lat: 32.9, lng: -80.0, region: 'mia' },
  { code: 'CLT', name: 'Charlotte, NC', lat: 35.2, lng: -80.9, region: 'bos' },
  { code: 'GSO', name: 'Greensboro, NC', lat: 36.1, lng: -79.9, region: 'bos' },
  { code: 'RDU', name: 'Raleigh-Durham, NC', lat: 35.9, lng: -78.8, region: 'bos' },
  { code: 'ILM', name: 'Wilmington, NC', lat: 34.3, lng: -77.9, region: 'mia' },
  { code: 'RIC', name: 'Richmond, VA', lat: 37.5, lng: -77.3, region: 'bos' },
  { code: 'ORF', name: 'Norfolk, VA', lat: 36.9, lng: -76.2, region: 'bos' },
  
  // Mid-Atlantic
  { code: 'DCA', name: 'Washington, DC', lat: 38.9, lng: -77.0, region: 'bos' },
  { code: 'BWI', name: 'Baltimore, MD', lat: 39.3, lng: -76.6, region: 'bos' },
  { code: 'PHL', name: 'Philadelphia, PA', lat: 39.9, lng: -75.2, region: 'bos' },
  { code: 'ACY', name: 'Atlantic City, NJ', lat: 39.5, lng: -74.6, region: 'bos' },
  { code: 'NYC', name: 'New York City, NY', lat: 40.8, lng: -74.0, region: 'bos' },
  { code: 'JFK', name: 'New York JFK, NY', lat: 40.6, lng: -73.8, region: 'bos' },
  { code: 'ISP', name: 'Long Island, NY', lat: 40.8, lng: -73.1, region: 'bos' },
  { code: 'HPN', name: 'White Plains, NY', lat: 41.1, lng: -73.7, region: 'bos' },
  
  // Northeast
  { code: 'BDL', name: 'Hartford, CT', lat: 41.9, lng: -72.7, region: 'bos' },
  { code: 'PVD', name: 'Providence, RI', lat: 41.7, lng: -71.4, region: 'bos' },
  { code: 'BOS', name: 'Boston, MA', lat: 42.4, lng: -71.1, region: 'bos' },
  { code: 'ALB', name: 'Albany, NY', lat: 42.7, lng: -73.8, region: 'bos' },
  { code: 'BUF', name: 'Buffalo, NY', lat: 42.9, lng: -78.7, region: 'bos' },
  { code: 'BGR', name: 'Bangor, ME', lat: 44.8, lng: -68.8, region: 'bos' },
  { code: 'PWM', name: 'Portland, ME', lat: 43.6, lng: -70.3, region: 'bos' },
  { code: 'CAR', name: 'Caribou, ME', lat: 46.9, lng: -68.0, region: 'bos' },
  
  // Inland East
  { code: 'PIT', name: 'Pittsburgh, PA', lat: 40.5, lng: -80.2, region: 'bos' },
  { code: 'CLE', name: 'Cleveland, OH', lat: 41.4, lng: -81.9, region: 'bos' },
  { code: 'CVG', name: 'Cincinnati, OH', lat: 39.0, lng: -84.7, region: 'chi' },
  { code: 'CMH', name: 'Columbus, OH', lat: 40.0, lng: -82.9, region: 'chi' },
  { code: 'BNA', name: 'Nashville, TN', lat: 36.1, lng: -86.7, region: 'dfw' },
  { code: 'MEM', name: 'Memphis, TN', lat: 35.0, lng: -90.0, region: 'dfw' },
  { code: 'BHM', name: 'Birmingham, AL', lat: 33.6, lng: -86.8, region: 'mia' },
  { code: 'MGM', name: 'Montgomery, AL', lat: 32.3, lng: -86.4, region: 'mia' },
  
  // Great Lakes
  { code: 'DTW', name: 'Detroit, MI', lat: 42.2, lng: -83.4, region: 'chi' },
  { code: 'GRR', name: 'Grand Rapids, MI', lat: 42.9, lng: -85.5, region: 'chi' },
  { code: 'MKE', name: 'Milwaukee, WI', lat: 43.0, lng: -88.0, region: 'chi' },
  { code: 'CHI', name: 'Chicago, IL', lat: 41.8, lng: -87.8, region: 'chi' },
  
  // Midwest
  { code: 'STL', name: 'St. Louis, MO', lat: 38.7, lng: -90.4, region: 'dfw' },
  { code: 'MCI', name: 'Kansas City, MO', lat: 39.3, lng: -94.7, region: 'dfw' },
  { code: 'DSM', name: 'Des Moines, IA', lat: 41.5, lng: -93.7, region: 'chi' },
  { code: 'MSP', name: 'Minneapolis, MN', lat: 45.0, lng: -93.2, region: 'chi' },
  { code: 'OMA', name: 'Omaha, NE', lat: 41.3, lng: -96.0, region: 'dfw' },
  { code: 'ICT', name: 'Wichita, KS', lat: 37.6, lng: -97.4, region: 'dfw' },
  { code: 'BRL', name: 'Burlington, IA', lat: 40.8, lng: -91.1, region: 'chi' },
  
  // South Central
  { code: 'DFW', name: 'Dallas-Fort Worth, TX', lat: 32.9, lng: -97.0, region: 'dfw' },
  { code: 'HOU', name: 'Houston, TX', lat: 29.6, lng: -95.3, region: 'dfw' },
  { code: 'SAT', name: 'San Antonio, TX', lat: 29.5, lng: -98.5, region: 'dfw' },
  { code: 'AUS', name: 'Austin, TX', lat: 30.2, lng: -97.7, region: 'dfw' },
  { code: 'OKC', name: 'Oklahoma City, OK', lat: 35.4, lng: -97.6, region: 'dfw' },
  { code: 'TUL', name: 'Tulsa, OK', lat: 36.2, lng: -95.9, region: 'dfw' },
  { code: 'LIT', name: 'Little Rock, AR', lat: 34.7, lng: -92.2, region: 'dfw' },
  { code: 'SHV', name: 'Shreveport, LA', lat: 32.5, lng: -93.7, region: 'dfw' },
  { code: 'MSY', name: 'New Orleans, LA', lat: 30.0, lng: -90.3, region: 'mia' },
  
  // Mountain West
  { code: 'DEN', name: 'Denver, CO', lat: 39.8, lng: -104.7, region: 'slc' },
  { code: 'SLC', name: 'Salt Lake City, UT', lat: 40.8, lng: -112.0, region: 'slc' },
  { code: 'PHX', name: 'Phoenix, AZ', lat: 33.4, lng: -112.0, region: 'slc' },
  { code: 'ABQ', name: 'Albuquerque, NM', lat: 35.0, lng: -106.6, region: 'slc' },
  { code: 'ELP', name: 'El Paso, TX', lat: 31.8, lng: -106.4, region: 'slc' },
  
  // Pacific Northwest
  { code: 'SEA', name: 'Seattle, WA', lat: 47.4, lng: -122.3, region: 'sfo' },
  { code: 'PDX', name: 'Portland, OR', lat: 45.6, lng: -122.6, region: 'sfo' },
  { code: 'BOI', name: 'Boise, ID', lat: 43.6, lng: -116.2, region: 'slc' },
  { code: 'GEG', name: 'Spokane, WA', lat: 47.6, lng: -117.5, region: 'sfo' },
  
  // California
  { code: 'SFO', name: 'San Francisco, CA', lat: 37.6, lng: -122.4, region: 'sfo' },
  { code: 'LAX', name: 'Los Angeles, CA', lat: 33.9, lng: -118.4, region: 'sfo' },
  { code: 'SAN', name: 'San Diego, CA', lat: 32.7, lng: -117.2, region: 'sfo' },
  { code: 'SAC', name: 'Sacramento, CA', lat: 38.5, lng: -121.5, region: 'sfo' },
  { code: 'SBA', name: 'Santa Barbara, CA', lat: 34.4, lng: -119.8, region: 'sfo' },
  { code: 'FAT', name: 'Fresno, CA', lat: 36.8, lng: -119.7, region: 'sfo' },
  
  // Alaska & Hawaii
  { code: 'ANC', name: 'Anchorage, AK', lat: 61.2, lng: -150.0, region: 'anc' },
  { code: 'FAI', name: 'Fairbanks, AK', lat: 64.8, lng: -147.9, region: 'anc' },
  { code: 'HNL', name: 'Honolulu, HI', lat: 21.3, lng: -157.9, region: 'hnl' },
];

// Create a fast lookup map by station code
const STATION_LOOKUP = new Map(
  WINDS_ALOFT_STATIONS.map(station => [station.code, station])
);

/**
 * Find the closest winds aloft station to a given lat/lng
 * Returns the station code, or null if no stations found within maxDistance
 */
function findClosestStation(lat: number, lng: number, maxDistanceNM: number = 500): string | null {
  let closestStation: string | null = null;
  let minDistance = Infinity;
  
  for (const station of WINDS_ALOFT_STATIONS) {
    const distance = calculateDistance(lat, lng, station.lat, station.lng);
    if (distance < minDistance && distance <= maxDistanceNM) {
      minDistance = distance;
      closestStation = station.code;
    }
  }
  
  if (closestStation) {
    console.log(`Closest station to (${lat.toFixed(2)}, ${lng.toFixed(2)}): ${closestStation} at ${minDistance.toFixed(0)}nm`);
  }
  
  return closestStation;
}

/**
 * Find multiple closest stations in order of proximity
 * Returns array of station codes sorted by distance
 */
function findClosestStations(lat: number, lng: number, count: number = 3, maxDistanceNM: number = 500): string[] {
  const stationsWithDistance = WINDS_ALOFT_STATIONS
    .map(station => ({
      code: station.code,
      distance: calculateDistance(lat, lng, station.lat, station.lng)
    }))
    .filter(s => s.distance <= maxDistanceNM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
  
  return stationsWithDistance.map(s => s.code);
}

export interface WindsAloftData {
  direction: number | 'VRB';
  speed: number;
  altitude: number;
  station: string;
  stations?: string[];  // All stations used (for multi-point average)
  sampleCount?: number;  // Number of wind samples averaged
  temperature?: number;
}

// Region mapping by lat/lng
function determineRegion(lat: number, lng: number): string {
  // Alaska
  if (lat > 51) return 'alaska';
  
  // Hawaii
  if (lat < 25 && lng < -155) return 'hawaii';
  
  // Continental US regions
  if (lat > 39 && lng > -80) return 'bos';        // Northeast
  if (lat < 39 && lat > 31 && lng > -87) return 'mia';  // Southeast
  if (lat > 37 && lng < -80 && lng > -100) return 'chi'; // North Central
  if (lat < 37 && lat > 28 && lng < -87 && lng > -105) return 'dfw'; // South Central
  if (lng < -110 && lng > -125) return 'slc';     // Rocky Mountain
  if (lng < -115) return 'sfo';                   // West Coast
  
  return 'chi'; // Default to central US
}

// Station code mapping for common airports (legacy support)
const STATION_CODES: { [key: string]: string } = {
  'KFRG': 'JFK', 'KJFK': 'JFK', 'KLGA': 'JFK', 'KEWR': 'JFK',
  'KRDU': 'RDU', 'KATL': 'ATL', 'KCLT': 'CAE',
  'KORD': 'JOT', 'KMDW': 'JOT', 'KMKE': 'GRB',
  'KDFW': 'DAL', 'KIAH': 'HOU', 'KAUS': 'SAT',
  'KDEN': 'DEN', 'KPHX': 'TUS', 'KLAS': 'LAS',
  'KSEA': 'SEA', 'KPDX': 'PDX', 'KBOI': 'BOI',
  'KLAX': 'SAN', 'KSFO': 'SFO', 'KSAN': 'SAN'
};

// Get station code for an ICAO airport code
function getStationCode(icao: string): string | null {
  return STATION_CODES[icao] || icao.replace('K', '').toUpperCase();
}

/**
 * Fetch winds aloft from NOAA Aviation Weather API
 * @param lat - Latitude of the position
 * @param lng - Longitude of the position
 * @param altitudeFt - Cruise altitude in feet
 * @param forecastHours - Hours ahead for forecast (not used with NOAA, kept for compatibility)
 * @param nearestAirport - Optional ICAO code for nearest airport
 * @returns WindsAloftData or null if unavailable
 */
export async function fetchWindsAloft(
  lat: number,
  lng: number,
  altitudeFt: number,
  forecastHours: number = 0,
  nearestAirport?: string
): Promise<WindsAloftData | null> {
  try {
    const region = determineRegion(lat, lng);
    const level = altitudeFt >= 18000 ? 'high' : 'low';
    
    // Map forecastHours to NOAA's available forecast periods: 06, 12, 18, 24
    let fcst = '06';
    if (forecastHours >= 24) fcst = '24';
    else if (forecastHours >= 18) fcst = '18';
    else if (forecastHours >= 12) fcst = '12';
    else if (forecastHours >= 6) fcst = '06';
    else fcst = '06'; // Use 6-hour for flights < 6 hours away
    
    let url = `https://aviationweather.gov/api/data/windtemp?region=${region}&level=${level}&fcst=${fcst}`;
    
    console.log(`Fetching NOAA winds aloft: region=${region}, level=${level}, fcst=${fcst}hr, alt=${altitudeFt}ft, position=(${lat.toFixed(2)}, ${lng.toFixed(2)})`);
    
    let response = await fetch(url, {
      headers: { 'Accept': 'text/plain' }
    });
    
    // If regional fetch fails, retry with national (region=us)
    if (!response.ok) {
      console.warn(`NOAA regional API failed (${response.status}), retrying with region=us`);
      url = `https://aviationweather.gov/api/data/windtemp?region=us&level=${level}&fcst=${fcst}`;
      response = await fetch(url, {
        headers: { 'Accept': 'text/plain' }
      });
      
      if (!response.ok) {
        console.error(`NOAA API error: ${response.status}`);
        return null;
      }
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 5) {
      console.warn('Insufficient data in NOAA response');
      return null;
    }

    // Find the FT (flight level) line to get altitude columns
    const ftLineIndex = lines.findIndex(line => line.trim().startsWith('FT'));
    if (ftLineIndex === -1) {
      console.warn('No FT line found in NOAA response');
      return null;
    }

    // Parse altitudes from FT line (e.g., "FT  18000  24000  30000")
    const ftLine = lines[ftLineIndex];
    const altitudes = ftLine
      .split(/\s+/)
      .slice(1) // Skip "FT"
      .map(alt => parseInt(alt))
      .filter(alt => !isNaN(alt));

    if (altitudes.length === 0) {
      console.warn('No altitudes parsed from FT line');
      return null;
    }

    // Find closest altitude
    let closestAlt = altitudes[0];
    let minDiff = Math.abs(altitudeFt - closestAlt);
    
    for (const alt of altitudes) {
      const diff = Math.abs(altitudeFt - alt);
      if (diff < minDiff) {
        minDiff = diff;
        closestAlt = alt;
      }
    }

    const altIndex = altitudes.indexOf(closestAlt);

    // Determine target station using proximity-based selection
    // Priority: 1) Closest station to lat/lng, 2) Legacy airport code mapping, 3) First available
    const closestStationCode = findClosestStation(lat, lng);
    const legacyStationCode = nearestAirport ? getStationCode(nearestAirport) : null;
    
    // Try closest station first, then legacy mapping as fallback
    const preferredStations = [closestStationCode, legacyStationCode].filter(Boolean) as string[];
    
    console.log(`Station priority: ${preferredStations.join(' > ')} (closest to route position)`);

    // Parse station data (starts after FT line)
    let windData: string | null = null;
    let foundStation: string | null = null;
    let availableStations: string[] = [];

    for (let i = ftLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('FD') || line.startsWith('DATA')) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      
      const station = parts[0];
      availableStations.push(station);
      
      // Check if this station matches any of our preferred stations
      if (preferredStations.includes(station)) {
        if (parts.length > altIndex + 1) {
          foundStation = station;
          windData = parts[altIndex + 1];
          console.log(`✓ Found preferred station ${station} with data: ${windData}`);
          break;
        }
      }
      
      // Keep first valid station as absolute fallback
      if (!foundStation && parts.length > altIndex + 1) {
        foundStation = station;
        windData = parts[altIndex + 1];
      }
    }

    // If preferred stations not found in regional data, retry with national
    if (preferredStations.length > 0 && !preferredStations.includes(foundStation!) && !url.includes('region=us')) {
      console.log(`Preferred stations not found in regional data (available: ${availableStations.slice(0, 5).join(', ')}), retrying with region=us`);
      url = `https://aviationweather.gov/api/data/windtemp?region=us&level=${level}&fcst=${fcst}`;
      
      const nationalResponse = await fetch(url, {
        headers: { 'Accept': 'text/plain' }
      });
      
      if (nationalResponse.ok) {
        const nationalText = await nationalResponse.text();
        const nationalLines = nationalText.split('\n').filter(line => line.trim());
        
        const nationalFtLineIndex = nationalLines.findIndex(line => line.trim().startsWith('FT'));
        if (nationalFtLineIndex !== -1) {
          for (let i = nationalFtLineIndex + 1; i < nationalLines.length; i++) {
            const line = nationalLines[i].trim();
            if (!line || line.startsWith('FD') || line.startsWith('DATA')) continue;
            
            const parts = line.split(/\s+/);
            if (parts.length < 2) continue;
            
            const station = parts[0];
            
            if (preferredStations.includes(station)) {
              if (parts.length > altIndex + 1) {
                foundStation = station;
                windData = parts[altIndex + 1];
                console.log(`✓ Found preferred station ${station} in national data with data: ${windData}`);
                break;
              }
            }
          }
        }
      }
    }

    if (!windData || !foundStation) {
      console.warn(`No wind data found for altitude ${closestAlt}ft`);
      return null;
    }
    
    if (preferredStations.length > 0 && !preferredStations.includes(foundStation)) {
      console.warn(`⚠️  Using fallback station ${foundStation} (preferred ${preferredStations[0]} not available)`);
    }

    // Parse 6-digit wind code: DDSSTT
    const cleanData = windData.trim();
    
    // Handle special cases
    if (cleanData === '9900' || cleanData.startsWith('99')) {
      console.log(`Light and variable winds at ${closestAlt}ft from ${foundStation}`);
      return {
        direction: 'VRB',
        speed: 2,
        altitude: closestAlt,
        station: foundStation
      };
    }

    if (cleanData.length < 4) {
      console.warn(`Invalid wind data: ${cleanData}`);
      return null;
    }

    // Parse direction and speed
    const direction = parseInt(cleanData.substring(0, 2)) * 10;
    const speed = parseInt(cleanData.substring(2, 4));
    
    // Temperature (optional, last 2 digits)
    let temperature: number | undefined;
    if (cleanData.length >= 6) {
      const tempStr = cleanData.substring(4, 6);
      const tempVal = parseInt(tempStr);
      if (!isNaN(tempVal)) {
        temperature = closestAlt >= 24000 ? -tempVal : tempVal;
      }
    }

    if (isNaN(direction) || isNaN(speed)) {
      console.warn(`Could not parse wind data: ${cleanData}`);
      return null;
    }

    console.log(`NOAA winds at ${closestAlt}ft from ${foundStation}: ${direction}° @ ${speed}kt ${temperature !== undefined ? `(${temperature}°C)` : ''}`);

    return {
      direction,
      speed,
      altitude: closestAlt,
      station: foundStation,
      temperature
    };

  } catch (error) {
    console.error('Error fetching NOAA winds aloft:', error);
    return null;
  }
}

/**
 * Fetch low-level winds aloft from NOAA Aviation Weather API
 * Low-level provides winds at: 3000ft, 6000ft, 9000ft, 12000ft, 18000ft
 */
async function fetchLowLevelWinds(
  lat: number,
  lng: number,
  altitudeFt: number,
  forecastHours: number = 0,
  nearestAirport?: string
): Promise<WindsAloftData | null> {
  try {
    const region = determineRegion(lat, lng);
    
    // Map forecastHours to NOAA's available forecast periods
    let fcst = '06';
    if (forecastHours >= 24) fcst = '24';
    else if (forecastHours >= 18) fcst = '18';
    else if (forecastHours >= 12) fcst = '12';
    else if (forecastHours >= 6) fcst = '06';
    else fcst = '06';
    
    let url = `https://aviationweather.gov/api/data/windtemp?region=${region}&level=low&fcst=${fcst}`;
    
    console.log(`Fetching NOAA low-level winds: region=${region}, fcst=${fcst}hr, alt=${altitudeFt}ft, position=(${lat.toFixed(2)}, ${lng.toFixed(2)})`);
    
    let response = await fetch(url, {
      headers: { 'Accept': 'text/plain' }
    });
    
    // If regional fetch fails, retry with national
    if (!response.ok) {
      url = `https://aviationweather.gov/api/data/windtemp?region=us&level=low&fcst=${fcst}`;
      response = await fetch(url, {
        headers: { 'Accept': 'text/plain' }
      });
      
      if (!response.ok) {
        console.error(`NOAA low-level API error: ${response.status}`);
        return null;
      }
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 5) {
      console.warn('NOAA low-level response too short');
      return null;
    }

    const ftLineIndex = lines.findIndex(line => line.trim().startsWith('FT'));
    if (ftLineIndex === -1) {
      console.warn('No FT line found in low-level NOAA response');
      return null;
    }

    const ftLine = lines[ftLineIndex];
    const altitudes = ftLine
      .split(/\s+/)
      .slice(1)
      .map(alt => parseInt(alt))
      .filter(alt => !isNaN(alt));

    if (altitudes.length === 0) {
      console.warn('No altitudes parsed from FT line');
      return null;
    }

    console.log(`Found FT line at index ${ftLineIndex}, altitudes: ${altitudes.join(', ')}`);
    
    // Find closest altitude
    const requestedAlt = Math.max(altitudeFt, 6000);
    let targetAlt = altitudes[0];
    let minDiff = Math.abs(requestedAlt - altitudes[0]);
    for (const alt of altitudes) {
      const diff = Math.abs(requestedAlt - alt);
      if (diff < minDiff) {
        minDiff = diff;
        targetAlt = alt;
      }
    }
    
    const altIndex = altitudes.indexOf(targetAlt);
    console.log(`Requested ${altitudeFt}ft (clamped to ${requestedAlt}ft), using ${targetAlt}ft at column ${altIndex}`);

    // Determine target station using proximity-based selection
    const closestStationCode = findClosestStation(lat, lng);
    const legacyStationCode = nearestAirport ? getStationCode(nearestAirport) : null;
    
    const preferredStations = [closestStationCode, legacyStationCode].filter(Boolean) as string[];
    console.log(`Station priority: ${preferredStations.join(' > ')}`);

    // Parse station data
    let foundStation: string | null = null;
    let windData: string | null = null;
    
    for (let i = ftLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('FD') || line.startsWith('DATA')) continue;
      
      const parts = line.split(/\s+/).filter(p => p.trim());
      if (parts.length < 2) continue;

      const stationCode = parts[0];
      
      // Check if this is a preferred station
      if (preferredStations.includes(stationCode)) {
        if (parts.length > altIndex + 1) {
          foundStation = stationCode;
          windData = parts[altIndex + 1];
          console.log(`✓ Found preferred station ${stationCode} with wind data: ${windData}`);
          break;
        }
      }
      
      // Keep first valid station as fallback
      if (!foundStation && parts.length > altIndex + 1) {
        foundStation = stationCode;
        windData = parts[altIndex + 1];
      }
    }

    if (!windData || !foundStation) {
      console.warn(`No wind data found at ${targetAlt}ft`);
      return null;
    }
    
    if (preferredStations.length > 0 && !preferredStations.includes(foundStation)) {
      console.log(`⚠️  Using fallback station ${foundStation} instead of ${preferredStations[0]}`);
    }

    // Parse NOAA format: DDSSTT
    const cleanData = windData.trim();
    
    if (cleanData === '9900' || cleanData.startsWith('99')) {
      console.log(`Light and variable winds at ${targetAlt}ft from ${foundStation}`);
      return {
        direction: 'VRB',
        speed: 2,
        altitude: targetAlt,
        station: foundStation
      };
    }

    if (cleanData.length < 4) {
      console.warn(`Invalid wind data: ${cleanData}`);
      return null;
    }

    try {
      let direction = parseInt(cleanData.substring(0, 2)) * 10;
      let speed = parseInt(cleanData.substring(2, 4));
      
      // Handle speeds > 100kt
      if (speed > 100) {
        direction += 50;
        speed -= 100;
      }

      if (isNaN(direction) || isNaN(speed) || speed === 0) {
        console.warn(`Could not parse wind data: ${cleanData}`);
        return null;
      }

      console.log(`✓ Low-level winds at ${targetAlt}ft from ${foundStation}: ${direction}° @ ${speed}kt`);

      return {
        direction,
        speed,
        altitude: targetAlt,
        station: foundStation
      };
    } catch (error) {
      console.error(`Error parsing wind data "${cleanData}":`, error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching low-level winds:', error);
    return null;
  }
}

/**
 * Fetch and average winds aloft along a route
 * Samples winds at multiple points and phases (climb, cruise, descent)
 * @param waypoints - Array of route waypoints with lat/lng
 * @param cruiseAltitudeFt - Cruise altitude
 * @param distanceNM - Total route distance
 * @param climbPhaseNM - Distance of climb phase (default 50nm)
 * @param descentPhaseNM - Distance of descent phase (default 50nm)
 * @returns Averaged wind data with metadata
 */
export async function fetchAverageWindsAlongRoute(
  waypoints: Array<{lat: number, lng: number, code?: string}>,
  cruiseAltitudeFt: number,
  distanceNM: number,
  climbPhaseNM: number = 50,
  descentPhaseNM: number = 50,
  forecastHours: number = 0
): Promise<WindsAloftData | null> {
  try {
    console.log(`\n🌬️  WINDS ALOFT SAMPLING (Using Closest-Station Selection):`);
    console.log(`   Route: ${waypoints.length} waypoints, ${distanceNM.toFixed(0)}nm total`);
    console.log(`   Target cruise altitude: ${cruiseAltitudeFt.toFixed(0)}ft`);
    console.log(`   Climb phase: ${climbPhaseNM.toFixed(1)}nm, Descent phase: ${descentPhaseNM.toFixed(1)}nm`);
    
    const windSamples: Array<{
      direction: number;
      speed: number;
      weight: number;
      station: string;
      phase: string;
    }> = [];
    
    const stationsUsed = new Set<string>();
    
    // Determine sample points based on waypoints and distance
    let samplePoints: Array<{lat: number, lng: number, fraction: number, code?: string}> = [];
    
    if (waypoints.length > 2) {
      // Use actual waypoints, but limit to 6 for performance
      const step = waypoints.length <= 6 ? 1 : Math.ceil(waypoints.length / 6);
      for (let i = 0; i < waypoints.length; i += step) {
        const wp = waypoints[i];
        const fraction = i / (waypoints.length - 1);
        samplePoints.push({ ...wp, fraction });
      }
      // Always include last waypoint
      if (samplePoints[samplePoints.length - 1].fraction < 1.0) {
        const lastWp = waypoints[waypoints.length - 1];
        samplePoints.push({ ...lastWp, fraction: 1.0 });
      }
    } else {
      // Interpolate based on distance
      const numSamples = distanceNM < 100 ? 3 : 
                         distanceNM < 250 ? 5 : 
                         distanceNM < 500 ? 8 : 
                         distanceNM < 750 ? 10 : 12;
      for (let i = 0; i < numSamples; i++) {
        const fraction = i / (numSamples - 1);
        const lat = waypoints[0].lat + (waypoints[waypoints.length - 1].lat - waypoints[0].lat) * fraction;
        const lng = waypoints[0].lng + (waypoints[waypoints.length - 1].lng - waypoints[0].lng) * fraction;
        samplePoints.push({ lat, lng, fraction });
      }
    }
    
    console.log(`Sampling winds at ${samplePoints.length} points along route`);
    
    // For each sample point, determine phase and fetch appropriate winds
    for (const point of samplePoints) {
      const distanceAlongRoute = point.fraction * distanceNM;
      let phase: string;
      let altitude: number;
      let weight: number;
      
      // Determine phase based on distance along route
      if (distanceAlongRoute < climbPhaseNM) {
        // Climb phase
        phase = 'climb';
        const climbFraction = distanceAlongRoute / climbPhaseNM;
        altitude = Math.max(6000, 6000 + (cruiseAltitudeFt - 6000) * climbFraction);
        weight = 1.0;
        
        const winds = await fetchLowLevelWinds(point.lat, point.lng, altitude, forecastHours, point.code);
        if (winds && winds.direction !== 'VRB') {
          console.log(`  🔼 CLIMB phase at ${altitude.toFixed(0)}ft from ${winds.station}: ${winds.direction}° @ ${winds.speed}kt`);
          windSamples.push({
            direction: winds.direction as number,
            speed: winds.speed,
            weight,
            station: winds.station,
            phase: `climb-${altitude.toFixed(0)}ft`
          });
          stationsUsed.add(winds.station);
        }
      } else if (distanceAlongRoute > distanceNM - descentPhaseNM) {
        // Descent phase
        phase = 'descent';
        const descentFraction = (distanceNM - distanceAlongRoute) / descentPhaseNM;
        altitude = Math.max(6000, 6000 + (cruiseAltitudeFt - 6000) * descentFraction);
        weight = 1.0;
        
        const winds = await fetchLowLevelWinds(point.lat, point.lng, altitude, forecastHours, point.code);
        if (winds && winds.direction !== 'VRB') {
          console.log(`  🔽 DESCENT phase at ${altitude.toFixed(0)}ft from ${winds.station}: ${winds.direction}° @ ${winds.speed}kt`);
          windSamples.push({
            direction: winds.direction as number,
            speed: winds.speed,
            weight,
            station: winds.station,
            phase: `descent-${altitude.toFixed(0)}ft`
          });
          stationsUsed.add(winds.station);
        }
      } else {
        // Cruise phase
        phase = 'cruise';
        altitude = cruiseAltitudeFt;
        weight = 1.5; // Give cruise more weight
        
        const winds = await fetchWindsAloft(point.lat, point.lng, altitude, forecastHours, point.code);
        if (winds && winds.direction !== 'VRB') {
          console.log(`  ✈️  CRUISE phase at FL${Math.round(altitude / 100)} from ${winds.station}: ${winds.direction}° @ ${winds.speed}kt`);
          windSamples.push({
            direction: winds.direction as number,
            speed: winds.speed,
            weight,
            station: winds.station,
            phase: `cruise-${altitude.toFixed(0)}ft`
          });
          stationsUsed.add(winds.station);
        }
      }
    }
    
    // Fallback if no samples
    if (windSamples.length === 0) {
      console.warn('No valid wind samples found, trying cruise-altitude fallback...');
      
      const fallbackPoints = [
        { ...waypoints[0], fraction: 0.0 },
        { 
          lat: (waypoints[0].lat + waypoints[waypoints.length - 1].lat) / 2,
          lng: (waypoints[0].lng + waypoints[waypoints.length - 1].lng) / 2,
          fraction: 0.5
        },
        { ...waypoints[waypoints.length - 1], fraction: 1.0 }
      ];
      
      for (const point of fallbackPoints) {
        const winds = await fetchWindsAloft(point.lat, point.lng, cruiseAltitudeFt, forecastHours, point.code);
        if (winds && winds.direction !== 'VRB') {
          windSamples.push({
            direction: winds.direction as number,
            speed: winds.speed,
            weight: 1.0,
            station: winds.station,
            phase: 'cruise-fallback'
          });
          stationsUsed.add(winds.station);
        }
      }
      
      if (windSamples.length === 0) {
        console.warn('All wind fetching failed, returning calm winds');
        return {
          direction: 0,
          speed: 0,
          altitude: cruiseAltitudeFt,
          station: 'FALLBACK',
          sampleCount: 0
        };
      }
    }
    
    console.log(`Collected ${windSamples.length} wind samples from ${stationsUsed.size} stations: ${Array.from(stationsUsed).join(', ')}`);
    
    // Vector average the winds
    let totalU = 0;
    let totalV = 0;
    let totalWeight = 0;
    
    for (const sample of windSamples) {
      const radians = sample.direction * Math.PI / 180;
      const u = -sample.speed * Math.sin(radians);
      const v = -sample.speed * Math.cos(radians);
      
      totalU += u * sample.weight;
      totalV += v * sample.weight;
      totalWeight += sample.weight;
    }
    
    const avgU = totalU / totalWeight;
    const avgV = totalV / totalWeight;
    const avgSpeed = Math.sqrt(avgU * avgU + avgV * avgV);
    let avgDirection = (Math.atan2(-avgU, -avgV) * 180 / Math.PI + 360) % 360;
    
    // Round to nearest 10 degrees
    avgDirection = Math.round(avgDirection / 10) * 10;
    
    console.log(`✅ Averaged winds: ${avgDirection}° @ ${avgSpeed.toFixed(0)}kt from ${stationsUsed.size} stations (${Array.from(stationsUsed).join(', ')})`);
    
    return {
      direction: avgDirection,
      speed: Math.round(avgSpeed),
      altitude: cruiseAltitudeFt,
      station: 'AVERAGED',
      stations: Array.from(stationsUsed),
      sampleCount: windSamples.length
    };
  } catch (error) {
    console.error('Error averaging winds along route:', error);
    return null;
  }
}
