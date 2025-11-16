// Winds Aloft fetcher for accurate flight time calculations
// Uses Aviation Weather Center FD (Forecast Winds) data

export interface WindsAloftData {
  direction: number;
  speed: number;
  altitude: number;
  station: string;
}

interface FDStationData {
  station: string;
  levels: Map<number, { direction: number; speed: number }>;
}

// Standard FD altitudes in feet
const FD_ALTITUDES = [3000, 6000, 9000, 12000, 18000, 24000, 30000, 34000, 39000];

// FD stations by region
const FD_STATIONS: { [key: string]: string[] } = {
  northeast: ['ALB', 'BOS', 'BUF', 'EWR', 'JFK', 'LGA', 'PHL', 'BGR'],
  southeast: ['ATL', 'RDU', 'RIC', 'CLT', 'SAV', 'JAX', 'TPA', 'MIA'],
  midwest: ['ORD', 'DTW', 'CLE', 'CVG', 'IND', 'MKE', 'MSP'],
  southwest: ['DFW', 'IAH', 'AUS', 'SAT', 'OKC', 'TUL'],
  west: ['DEN', 'PHX', 'LAS', 'SLC', 'ABQ'],
  northwest: ['SEA', 'PDX', 'BOI', 'GEG'],
  west_coast: ['LAX', 'SFO', 'SAN', 'OAK', 'SJC']
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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Approximate station coordinates (major airports)
const STATION_COORDS: { [key: string]: { lat: number; lng: number } } = {
  'ALB': { lat: 42.75, lng: -73.80 }, 'BOS': { lat: 42.36, lng: -71.01 },
  'BUF': { lat: 42.94, lng: -78.73 }, 'EWR': { lat: 40.69, lng: -74.17 },
  'JFK': { lat: 40.64, lng: -73.78 }, 'LGA': { lat: 40.78, lng: -73.87 },
  'PHL': { lat: 39.87, lng: -75.24 }, 'BGR': { lat: 44.81, lng: -68.83 },
  'ATL': { lat: 33.64, lng: -84.43 }, 'RDU': { lat: 35.88, lng: -78.79 },
  'RIC': { lat: 37.51, lng: -77.32 }, 'CLT': { lat: 35.22, lng: -80.94 },
  'SAV': { lat: 32.13, lng: -81.20 }, 'JAX': { lat: 30.49, lng: -81.69 },
  'TPA': { lat: 27.98, lng: -82.53 }, 'MIA': { lat: 25.79, lng: -80.29 },
  'ORD': { lat: 41.98, lng: -87.90 }, 'DTW': { lat: 42.21, lng: -83.35 },
  'CLE': { lat: 41.41, lng: -81.85 }, 'CVG': { lat: 39.05, lng: -84.67 },
  'IND': { lat: 39.72, lng: -86.29 }, 'MKE': { lat: 42.95, lng: -87.90 },
  'MSP': { lat: 44.88, lng: -93.22 }, 'DFW': { lat: 32.90, lng: -97.04 },
  'IAH': { lat: 29.98, lng: -95.34 }, 'AUS': { lat: 30.19, lng: -97.67 },
  'SAT': { lat: 29.53, lng: -98.47 }, 'OKC': { lat: 35.39, lng: -97.60 },
  'TUL': { lat: 36.20, lng: -95.89 }, 'DEN': { lat: 39.86, lng: -104.67 },
  'PHX': { lat: 33.43, lng: -112.01 }, 'LAS': { lat: 36.08, lng: -115.15 },
  'SLC': { lat: 40.79, lng: -111.98 }, 'ABQ': { lat: 35.04, lng: -106.61 },
  'SEA': { lat: 47.45, lng: -122.31 }, 'PDX': { lat: 45.59, lng: -122.60 },
  'BOI': { lat: 43.56, lng: -116.22 }, 'GEG': { lat: 47.62, lng: -117.53 },
  'LAX': { lat: 33.94, lng: -118.41 }, 'SFO': { lat: 37.62, lng: -122.38 },
  'SAN': { lat: 32.73, lng: -117.19 }, 'OAK': { lat: 37.72, lng: -122.22 }
};

function findNearestStation(lat: number, lng: number, region: string): string {
  const stations = FD_STATIONS[region] || FD_STATIONS.northeast;
  let nearest = stations[0];
  let minDist = Infinity;
  
  for (const station of stations) {
    const coords = STATION_COORDS[station];
    if (coords) {
      const dist = calculateDistance(lat, lng, coords.lat, coords.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    }
  }
  
  return nearest;
}

function parseFDWind(fdCode: string): { direction: number; speed: number } | null {
  if (!fdCode || fdCode === '9900' || fdCode === '999999') {
    return null; // Light and variable or missing
  }
  
  // FD format: DDSSTT or DDSS where DD=direction, SS=speed, TT=temperature
  const windOnly = fdCode.substring(0, 4);
  const direction = parseInt(windOnly.substring(0, 2), 10) * 10;
  const speed = parseInt(windOnly.substring(2, 4), 10);
  
  if (isNaN(direction) || isNaN(speed)) return null;
  
  return { direction, speed };
}

export async function fetchWindsAloft(
  lat: number,
  lng: number,
  altitudeFt: number,
  forecastHours: number = 0
): Promise<WindsAloftData | null> {
  try {
    const region = determineRegion(lat, lng);
    const station = findNearestStation(lat, lng, region);
    
    console.log(`Fetching winds aloft for region ${region}, station ${station}, altitude ${altitudeFt}ft, forecast ${forecastHours}h`);
    
    // Try to fetch from Aviation Weather Center
    // Note: This is a simplified version - in production you'd need to handle
    // the actual FD format from aviationweather.gov
    const url = `https://aviationweather.gov/api/data/windtemp?region=${region.toLowerCase()}&hours=${forecastHours}&level=low`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TransplantCalculator/1.0)',
        }
      });
      
      if (!response.ok) {
        console.warn(`Winds aloft API returned ${response.status}, using fallback`);
        throw new Error('API unavailable');
      }
      
      const text = await response.text();
      console.log(`Winds aloft raw data (first 500 chars):`, text.substring(0, 500));
      
      // Parse the FD format - this is a simplified parser
      // Real implementation would need to handle the full FD text format
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes(station)) {
          // Extract winds at different altitudes
          // FD format has columns for each altitude
          const parts = line.trim().split(/\s+/);
          const altIndex = FD_ALTITUDES.findIndex(alt => alt >= altitudeFt);
          if (altIndex >= 0 && altIndex < parts.length - 1) {
            const wind = parseFDWind(parts[altIndex + 1]);
            if (wind) {
              return {
                ...wind,
                altitude: FD_ALTITUDES[altIndex],
                station
              };
            }
          }
        }
      }
    } catch (apiError) {
      console.warn('Winds aloft API error:', apiError);
    }
    
    // Fallback to estimated winds based on typical patterns
    return generateFallbackWinds(lat, lng, altitudeFt, station);
  } catch (error) {
    console.error('Error fetching winds aloft:', error);
    return generateFallbackWinds(lat, lng, altitudeFt, 'UNKNOWN');
  }
}

function generateFallbackWinds(
  lat: number, 
  lng: number, 
  altitudeFt: number, 
  station: string
): WindsAloftData {
  // Generate reasonable fallback based on typical jet stream patterns
  // In the US, westerly winds dominate at altitude
  
  // Stronger winds at higher altitudes and higher latitudes
  const latFactor = (lat - 25) / 25; // 0 at 25°N, 1 at 50°N
  const altFactor = Math.min(altitudeFt / 30000, 1);
  
  // Typical westerly direction (270°) with variation
  const direction = 270 + (Math.random() - 0.5) * 40;
  
  // Wind speed increases with altitude and latitude
  const baseSpeed = 20 + (altFactor * 80) + (latFactor * 30);
  const speed = Math.round(baseSpeed + (Math.random() - 0.5) * 20);
  
  console.log(`Using fallback winds: ${Math.round(direction)}° at ${speed}kts for ${altitudeFt}ft`);
  
  return {
    direction: Math.round(direction),
    speed: Math.max(0, speed),
    altitude: altitudeFt,
    station: `${station}_FALLBACK`
  };
}

export function interpolateWindsAloft(
  altitude: number,
  lowerWind: WindsAloftData,
  upperWind: WindsAloftData
): WindsAloftData {
  // Linear interpolation between two altitude levels
  const factor = (altitude - lowerWind.altitude) / (upperWind.altitude - lowerWind.altitude);
  
  // Interpolate speed
  const speed = Math.round(lowerWind.speed + (upperWind.speed - lowerWind.speed) * factor);
  
  // For direction, handle the circular nature (0° = 360°)
  let dir1 = lowerWind.direction;
  let dir2 = upperWind.direction;
  
  // Find shortest path
  if (Math.abs(dir2 - dir1) > 180) {
    if (dir2 > dir1) dir1 += 360;
    else dir2 += 360;
  }
  
  const direction = Math.round(dir1 + (dir2 - dir1) * factor) % 360;
  
  return {
    direction,
    speed,
    altitude,
    station: lowerWind.station
  };
}
