// NOAA Aviation Weather Winds Aloft API Integration
// Provides official flight-level wind and temperature data

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

// Use 6-hour forecast (fcst parameter represents hours ahead, not cycle time)
// Valid values: '06', '12', '24' for 6-hour, 12-hour, or 24-hour forecasts

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
    const fcst = '06'; // 6-hour forecast (most current data)
    
    let url = `https://aviationweather.gov/api/data/windtemp?region=${region}&level=${level}&fcst=${fcst}`;
    
    console.log(`Fetching NOAA winds aloft: region=${region}, level=${level}, fcst=${fcst}hr, alt=${altitudeFt}ft, airport=${nearestAirport || 'none'}`);
    
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
    let stationLines: string[] = [];

    for (let i = ftLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('FD') || line.startsWith('DATA')) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      
      stationLines.push(line);
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

    // If target station not found in regional data and we haven't tried national yet, retry with region=us
    if (targetStation && foundStation !== targetStation && !url.includes('region=us')) {
      console.log(`Target station ${targetStation} not found in regional data, retrying with region=us`);
      url = `https://aviationweather.gov/api/data/windtemp?region=us&level=${level}&fcst=${fcst}`;
      
      const nationalResponse = await fetch(url, {
        headers: { 'Accept': 'text/plain' }
      });
      
      if (nationalResponse.ok) {
        const nationalText = await nationalResponse.text();
        const nationalLines = nationalText.split('\n').filter(line => line.trim());
        
        // Find FT line in national data
        const nationalFtLineIndex = nationalLines.findIndex(line => line.trim().startsWith('FT'));
        if (nationalFtLineIndex !== -1) {
          // Search for target station in national data
          for (let i = nationalFtLineIndex + 1; i < nationalLines.length; i++) {
            const line = nationalLines[i].trim();
            if (!line || line.startsWith('FD') || line.startsWith('DATA')) continue;
            
            const parts = line.split(/\s+/);
            if (parts.length < 2) continue;
            
            const station = parts[0];
            
            if (station === targetStation) {
              foundStation = station;
              windData = parts[altIndex + 1];
              console.log(`Found target station ${targetStation} in national data with data: ${windData}`);
              break;
            }
          }
        }
      } else {
        console.warn(`National NOAA API request failed: ${nationalResponse.status}`);
      }
    }

    if (!windData || !foundStation) {
      console.warn(`No wind data found for altitude ${closestAlt}ft, target=${targetStation}`);
      return null;
    }
    
    if (targetStation && foundStation !== targetStation) {
      console.warn(`Target station ${targetStation} not found in regional or national data, using ${foundStation} as fallback`);
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

/**
 * Fetch low-level winds aloft from NOAA Aviation Weather API
 * Low-level provides winds at: 3000ft, 6000ft, 9000ft, 12000ft, 18000ft
 */
async function fetchLowLevelWinds(
  lat: number,
  lng: number,
  altitudeFt: number,
  nearestAirport?: string
): Promise<WindsAloftData | null> {
  try {
    const region = determineRegion(lat, lng);
    const fcst = '06'; // 6-hour forecast (most current data)
    
    let url = `https://aviationweather.gov/api/data/windtemp?region=${region}&level=low&fcst=${fcst}`;
    
    console.log(`Fetching NOAA low-level winds: region=${region}, fcst=${fcst}hr, alt=${altitudeFt}ft`);
    
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

    // Find the FT line dynamically (contains altitude columns)
    const ftLineIndex = lines.findIndex(line => line.trim().startsWith('FT'));
    if (ftLineIndex === -1) {
      console.warn('No FT line found in low-level NOAA response');
      return null;
    }

    // Parse altitudes from FT line (e.g., "FT  3000    6000    9000   12000   18000")
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

    console.log(`Found FT line at index ${ftLineIndex}, altitudes: ${altitudes.join(', ')}`);
    
    // Find closest altitude to requested (minimum 6000ft)
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

    // Determine target station
    let targetStation: string | null = null;
    if (nearestAirport) {
      targetStation = getStationCode(nearestAirport);
      console.log(`Looking for station: ${targetStation}`);
    }

    // Parse station data (starts after FT line)
    let foundStation: string | null = null;
    let windData: string | null = null;
    
    for (let i = ftLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('FD') || line.startsWith('DATA')) continue;
      
      const parts = line.split(/\s+/).filter(p => p.trim());
      if (parts.length < 2) continue;

      const stationCode = parts[0];
      
      // If we have a target station, look for exact match
      if (targetStation && stationCode === targetStation) {
        foundStation = stationCode;
        // parts[0] is station code, parts[1+] are wind data columns
        if (parts.length > altIndex + 1) {
          windData = parts[altIndex + 1];
          console.log(`Found target station ${targetStation} with wind data: ${windData}`);
          break;
        }
      }
      
      // Use first valid station as fallback
      if (!foundStation && parts.length > altIndex + 1) {
        foundStation = stationCode;
        windData = parts[altIndex + 1];
      }
    }

    if (!windData || !foundStation) {
      console.warn(`No wind data found at ${targetAlt}ft for station ${targetStation || 'any'}`);
      return null;
    }
    
    if (targetStation && foundStation !== targetStation) {
      console.log(`Using fallback station ${foundStation} instead of ${targetStation}`);
    }

    // Parse NOAA format: DDSSTT (direction, speed, temperature)
    const cleanData = windData.trim();
    
    // Handle light and variable
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
      
      // Handle speeds > 100kt (direction + 50, speed - 100)
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
  descentPhaseNM: number = 50
): Promise<WindsAloftData | null> {
  try {
    console.log(`\n🌬️  WINDS ALOFT SAMPLING:`);
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
    
    if (waypoints.length >= 2) {
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
      const numSamples = distanceNM < 100 ? 2 : distanceNM < 350 ? 4 : 6;
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
        // Climb phase - sample at multiple altitudes, weighted toward lower
        phase = 'climb';
        const climbFraction = distanceAlongRoute / climbPhaseNM;
        altitude = Math.max(6000, 6000 + (cruiseAltitudeFt - 6000) * climbFraction);
        weight = 1.0; // Equal weight for simplicity
        
        // Fetch low-level winds
        const winds = await fetchLowLevelWinds(point.lat, point.lng, altitude, point.code);
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
        } else {
          console.log(`  🔼 CLIMB phase at ${altitude.toFixed(0)}ft: No wind data available`);
        }
      } else if (distanceAlongRoute > distanceNM - descentPhaseNM) {
        // Descent phase - sample at multiple altitudes, weighted toward lower
        phase = 'descent';
        const descentFraction = (distanceNM - distanceAlongRoute) / descentPhaseNM;
        altitude = Math.max(6000, 6000 + (cruiseAltitudeFt - 6000) * descentFraction);
        weight = 1.0;
        
        // Fetch low-level winds
        const winds = await fetchLowLevelWinds(point.lat, point.lng, altitude, point.code);
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
        } else {
          console.log(`  🔽 DESCENT phase at ${altitude.toFixed(0)}ft: No wind data available`);
        }
      } else {
        // Cruise phase - sample at cruise altitude
        phase = 'cruise';
        altitude = cruiseAltitudeFt;
        weight = 1.5; // Give cruise phase more weight since we spend most time there
        
        // Fetch high-level winds
        const winds = await fetchWindsAloft(point.lat, point.lng, altitude, 0, point.code);
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
        } else {
          console.log(`  ✈️  CRUISE phase at FL${Math.round(altitude / 100)}: No wind data available`);
        }
      }
    }
    
    // Fallback: if no samples, try cruise altitude at departure, midpoint, and arrival
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
        const winds = await fetchWindsAloft(point.lat, point.lng, cruiseAltitudeFt, 0, point.code);
        if (winds && winds.direction !== 'VRB') {
          console.log(`  ✈️  CRUISE fallback at ${cruiseAltitudeFt.toFixed(0)}ft: ${winds.direction}° @ ${winds.speed}kt (station: ${winds.station})`);
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
      
      // If still no samples, return calm winds as last resort
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
    
    console.log(`Collected ${windSamples.length} wind samples from ${stationsUsed.size} stations`);
    
    // Vector average the winds
    let totalU = 0;
    let totalV = 0;
    let totalWeight = 0;
    
    for (const sample of windSamples) {
      const radians = sample.direction * Math.PI / 180;
      const u = -sample.speed * Math.sin(radians); // East-west component
      const v = -sample.speed * Math.cos(radians); // North-south component
      
      totalU += u * sample.weight;
      totalV += v * sample.weight;
      totalWeight += sample.weight;
    }
    
    const avgU = totalU / totalWeight;
    const avgV = totalV / totalWeight;
    const avgSpeed = Math.sqrt(avgU * avgU + avgV * avgV);
    let avgDirection = (Math.atan2(-avgU, -avgV) * 180 / Math.PI + 360) % 360;
    
    // Round to nearest 10 degrees (standard reporting)
    avgDirection = Math.round(avgDirection / 10) * 10;
    
    console.log(`Averaged winds: ${avgDirection}° @ ${avgSpeed.toFixed(0)}kt from ${stationsUsed.size} stations`);
    
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
