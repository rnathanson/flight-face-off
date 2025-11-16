// NOAA Aviation Weather Winds Aloft API Integration
// Provides official flight-level wind and temperature data

export interface WindsAloftData {
  direction: number | 'VRB';
  speed: number;
  altitude: number;
  station: string;
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

// Station code mapping for common airports
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

// Determine valid forecast cycle based on current UTC time and NOAA "FOR USE" windows
function getValidForecastCycle(): string {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // NOAA publishes at 00, 06, 12, 18 with specific "FOR USE" windows:
  // 00Z: FOR USE 2000–0200Z (previous day 8pm - 2am)
  // 06Z: FOR USE 0200–0900Z (2am - 9am)
  // 12Z: FOR USE 0900–1500Z (9am - 3pm)
  // 18Z: FOR USE 1500–2100Z (3pm - 9pm)
  
  if (hour >= 2 && hour < 9) return '06';
  if (hour >= 9 && hour < 15) return '12';
  if (hour >= 15 && hour < 21) return '18';
  return '00'; // 21Z - 02Z uses 00Z
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
    const fcst = getValidForecastCycle();
    
    let url = `https://aviationweather.gov/api/data/windtemp?region=${region}&level=${level}&fcst=${fcst}`;
    
    console.log(`Fetching NOAA winds aloft: region=${region}, level=${level}, fcst=${fcst}Z, alt=${altitudeFt}ft, airport=${nearestAirport || 'none'}`);
    
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

    // Determine which station to use
    let targetStation: string | null = null;
    
    if (nearestAirport) {
      targetStation = getStationCode(nearestAirport);
      console.log(`Looking for target station: ${targetStation} (from ${nearestAirport})`);
    }

    // Parse station data (starts after FT line)
    let windData: string | null = null;
    let foundStation: string | null = null;

    for (let i = ftLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('FD') || line.startsWith('DATA')) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      
      const station = parts[0];
      
      // If we have a target station, look for exact match
      if (targetStation && station === targetStation) {
        foundStation = station;
        windData = parts[altIndex + 1]; // +1 because parts[0] is station name
        console.log(`Found target station ${targetStation} with data: ${windData}`);
        break;
      }
      
      // Otherwise, use first valid station as fallback
      if (!foundStation && parts.length > altIndex + 1) {
        foundStation = station;
        windData = parts[altIndex + 1];
        // Continue looking in case we find a better match
      }
    }

    if (!windData || !foundStation) {
      console.warn(`No wind data found for altitude ${closestAlt}ft, target=${targetStation}`);
      return null;
    }
    
    if (targetStation && foundStation !== targetStation) {
      console.log(`Target station ${targetStation} not found, using ${foundStation} as fallback`);
    }

    // Parse 6-digit wind code: DDSSTT
    // DD = direction (tens of degrees), SS = speed (knots), TT = temperature
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

    // Parse direction and speed (minimum 4 digits needed)
    const direction = parseInt(cleanData.substring(0, 2)) * 10;
    const speed = parseInt(cleanData.substring(2, 4));
    
    // Temperature (optional, last 2 digits)
    let temperature: number | undefined;
    if (cleanData.length >= 6) {
      const tempStr = cleanData.substring(4, 6);
      const tempVal = parseInt(tempStr);
      if (!isNaN(tempVal)) {
        // Negative above FL240
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
