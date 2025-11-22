/**
 * Shared geospatial utility functions for edge functions
 * Single source of truth for distance, bearing, and polyline calculations
 */

/**
 * Calculate great circle distance between two coordinates using Haversine formula
 * @param lat1 First point latitude
 * @param lng1 First point longitude
 * @param lat2 Second point latitude
 * @param lng2 Second point longitude
 * @param unit Unit of measurement: 'nm' (nautical miles), 'mi' (statute miles), 'km' (kilometers)
 * @returns Distance in specified unit
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'nm' | 'mi' | 'km' = 'nm'
): number {
  // Earth's radius in different units
  const R = unit === 'nm' ? 3440.065 : unit === 'mi' ? 3959 : 6371;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate true course (bearing) between two points
 * @param lat1 First point latitude
 * @param lng1 First point longitude
 * @param lat2 Second point latitude
 * @param lng2 Second point longitude
 * @returns Bearing in degrees (0-360)
 */
export function calculateCourse(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Decode Google Maps encoded polyline string into coordinates
 * Format is compatible with Mapbox GL JS which expects [longitude, latitude]
 * @param encoded Encoded polyline string
 * @returns Array of [lng, lat] coordinate pairs
 */
export function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    // Decode latitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    // Convert to degrees and return as [lng, lat] for Mapbox
    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}
