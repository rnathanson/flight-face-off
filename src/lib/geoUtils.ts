/**
 * Shared geospatial utility functions for frontend
 * Single source of truth for distance calculations
 */

/**
 * Calculate great circle distance between two coordinates using Haversine formula
 * @param lat1 First point latitude
 * @param lon1 First point longitude
 * @param lat2 Second point latitude
 * @param lon2 Second point longitude
 * @param unit Unit of measurement: 'nm' (nautical miles), 'mi' (statute miles), 'km' (kilometers)
 * @returns Distance in specified unit
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'nm' | 'mi' | 'km' = 'nm'
): number {
  // Earth's radius in different units
  const R = unit === 'nm' ? 3440.065 : unit === 'mi' ? 3959 : 6371;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
