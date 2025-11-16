// Iowa State Mesonet Winds Aloft API Integration
// Provides free winds aloft data at standard flight levels

export interface WindsAloftData {
  direction: number;
  speed: number;
  altitude: number;
  station: string;
}

// Station mapping by region
const STATIONS_BY_REGION: { [key: string]: string[] } = {
  northeast: ['KALB', 'KBOS', 'KBUF', 'KEWR', 'KPHL', 'KBGR'],
  southeast: ['KATL', 'KRDU', 'KRIC', 'KCLT', 'KJAX', 'KTPA', 'KMIA'],
  midwest: ['KORD', 'KDTW', 'KCLE', 'KIND', 'KMSP'],
  southwest: ['KDFW', 'KIAH', 'KAUS', 'KOKC'],
  west: ['KDEN', 'KPHX', 'KLAS', 'KSLC', 'KABQ'],
  northwest: ['KSEA', 'KPDX', 'KBOI'],
  west_coast: ['KLAX', 'KSFO', 'KSAN']
};

function determineRegion(lat: number, lng: number): string {
  if (lat > 39 && lng > -80) return 'northeast';
  if (lat < 39 && lat > 31 && lng > -87) return 'southeast';
  if (lat > 37 && lng < -80 && lng > -105) return 'midwest';
  if (lat < 37 && lat > 28 && lng < -87 && lng > -105) return 'southwest';
  if (lat > 42 && lng < -105 && lng > -125) return 'northwest';
  if (lng < -115) return 'west_coast';
  return 'west';
}

function getNearestStation(lat: number, lng: number): string {
  const region = determineRegion(lat, lng);
  const stations = STATIONS_BY_REGION[region];
  return stations?.[0] || 'KORD';
}

/**
 * Fetch winds aloft from Iowa State Mesonet
 * @param lat - Latitude of the position
 * @param lng - Longitude of the position
 * @param altitudeFt - Cruise altitude in feet
 * @returns WindsAloftData or null if unavailable
 */
export async function fetchWindsAloft(
  lat: number,
  lng: number,
  altitudeFt: number,
  forecastHours: number = 0
): Promise<WindsAloftData | null> {
  const station = getNearestStation(lat, lng);
  
  // Get current date and a few days back for recent data
  const now = new Date();
  const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  
  const url = `https://mesonet.agron.iastate.edu/cgi-bin/request/tempwind_aloft.py?` +
    `station=${station}&tz=UTC&` +
    `year1=${startDate.getFullYear()}&month1=${startDate.getMonth() + 1}&day1=${startDate.getDate()}&` +
    `year2=${now.getFullYear()}&month2=${now.getMonth() + 1}&day2=${now.getDate()}&` +
    `format=csv`;

  try {
    console.log(`Fetching winds aloft from ${station} for ${altitudeFt}ft`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Iowa State API error: ${response.status}`);
      return null;
    }

    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.warn('No data in response');
      return null;
    }

    // Parse CSV header to find column indices
    const headers = lines[0].split(',');
    
    // Find altitude columns (they're labeled like "3000", "6000", "9000", etc.)
    const altitudeColumns: { [key: number]: number } = {};
    headers.forEach((header, index) => {
      const alt = parseInt(header.trim());
      if (!isNaN(alt)) {
        altitudeColumns[alt] = index;
      }
    });

    // Get most recent data (last line)
    const lastLine = lines[lines.length - 1].split(',');
    
    // Find closest altitude column
    const availableAltitudes = Object.keys(altitudeColumns).map(Number).sort((a, b) => a - b);
    let closestAlt = availableAltitudes[0];
    let minDiff = Math.abs(altitudeFt - closestAlt);
    
    for (const alt of availableAltitudes) {
      const diff = Math.abs(altitudeFt - alt);
      if (diff < minDiff) {
        minDiff = diff;
        closestAlt = alt;
      }
    }

    const columnIndex = altitudeColumns[closestAlt];
    const windData = lastLine[columnIndex]?.trim();
    
    if (!windData || windData === '' || windData === 'M') {
      console.warn(`No wind data for altitude ${closestAlt}ft`);
      return null;
    }

    // Parse wind data format: "270045" = 270° at 45kts
    const windStr = windData.padStart(6, '0');
    const direction = parseInt(windStr.substring(0, 3));
    const speed = parseInt(windStr.substring(3));

    if (isNaN(direction) || isNaN(speed)) {
      console.warn(`Invalid wind data: ${windData}`);
      return null;
    }

    console.log(`Winds at ${closestAlt}ft: ${direction}° @ ${speed}kt from ${station}`);

    return {
      direction,
      speed,
      altitude: closestAlt,
      station
    };

  } catch (error) {
    console.error('Error fetching winds aloft:', error);
    return null;
  }
}
