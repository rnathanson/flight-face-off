// DTN Aviation Winds Aloft API Integration
// Provides accurate winds aloft data at standard flight levels

export interface WindsAloftData {
  direction: number;
  speed: number;
  altitude: number;
  station: string;
}

// Determine appropriate flight level based on cruise altitude
function determineFlightLevel(cruiseAltitudeFt: number): string {
  if (cruiseAltitudeFt < 5000) return 'fl010';
  if (cruiseAltitudeFt < 7000) return 'fl050';
  if (cruiseAltitudeFt < 14000) return 'fl100';
  if (cruiseAltitudeFt < 21000) return 'fl180';
  if (cruiseAltitudeFt < 27000) return 'fl240';
  if (cruiseAltitudeFt < 37000) return 'fl300';
  return 'fl390';
}

/**
 * Fetch winds aloft from DTN Aviation API
 * @param lat - Latitude of the position
 * @param lng - Longitude of the position
 * @param altitudeFt - Cruise altitude in feet
 * @param forecastHours - Hours into the future (default: 0 for current)
 * @returns WindsAloftData or null if unavailable
 */
export async function fetchWindsAloft(
  lat: number,
  lng: number,
  altitudeFt: number,
  forecastHours: number = 0
): Promise<WindsAloftData | null> {
  const apiKey = Deno.env.get('DTN_AVIATION_API_KEY');
  
  if (!apiKey) {
    console.warn('DTN_AVIATION_API_KEY not configured, falling back to surface winds');
    return null;
  }

  const flightLevel = determineFlightLevel(altitudeFt);
  
  // Use a 50nm radius circle around the flight path midpoint
  const apiUrl = `https://aviation.api.dtn.com/v1/windsaloft/?flt_level=${flightLevel}&circle=${lng},${lat},50`;
  
  try {
    console.log(`Fetching DTN winds aloft at ${flightLevel} (${altitudeFt}ft) for ${lat.toFixed(2)},${lng.toFixed(2)}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`DTN API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.warn('No winds aloft data returned from DTN API');
      return null;
    }

    // Average the wind data from nearby points
    let totalWindDir = 0;
    let totalWindSpeed = 0;
    let count = 0;
    
    for (const feature of data.features) {
      if (feature.properties?.wind_direction !== undefined && 
          feature.properties?.wind_speed_kts !== undefined) {
        totalWindDir += feature.properties.wind_direction;
        totalWindSpeed += feature.properties.wind_speed_kts;
        count++;
      }
    }

    if (count === 0) {
      console.warn('No valid wind data in DTN response');
      return null;
    }

    const avgDirection = Math.round(totalWindDir / count);
    const avgSpeed = Math.round(totalWindSpeed / count);

    console.log(`DTN winds at ${flightLevel}: ${avgDirection}° @ ${avgSpeed}kt (averaged from ${count} points)`);

    return {
      direction: avgDirection,
      speed: avgSpeed,
      altitude: altitudeFt,
      station: 'DTN'
    };

  } catch (error) {
    console.error('Error fetching DTN winds aloft:', error);
    return null;
  }
}
