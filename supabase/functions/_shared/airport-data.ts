/**
 * Shared airport data and utilities
 * Single source of truth for coordinate caches and distance calculations
 */

// Fast-path coordinate cache for common airports
export const AIRPORT_COORDS: Record<string, { lat: number; lng: number; name?: string }> = {
  // NY/CT/MA/RI Regional
  'KALB': { lat: 42.7483, lng: -73.8017, name: 'Albany International Airport' },
  'KFRG': { lat: 40.7289, lng: -73.4134, name: 'Republic Airport' },
  'KISP': { lat: 40.7952, lng: -73.1002, name: 'Long Island MacArthur Airport' },
  'KHWV': { lat: 41.0678, lng: -72.8498, name: 'Tweed New Haven Airport' },
  'KGON': { lat: 41.3308, lng: -72.0451, name: 'Groton-New London Airport' },
  'KMTP': { lat: 41.0762, lng: -71.9200, name: 'Montauk Airport' },
  'KBID': { lat: 41.7390, lng: -71.5804, name: 'Block Island State Airport' },
  '0B8': { lat: 41.2637, lng: -71.9616, name: 'Elizabeth Field' },
  'KWST': { lat: 41.3337, lng: -71.8033, name: 'Westerly State Airport' },
  'KOQU': { lat: 41.2919, lng: -71.4208, name: 'Quonset State Airport' },
  'KPVD': { lat: 41.7240, lng: -71.4281, name: 'Theodore Francis Green State Airport' },
  'KHVN': { lat: 41.2637, lng: -72.8868, name: 'Tweed New Haven Airport' },
  'KBDR': { lat: 41.1635, lng: -73.1261, name: 'Igor I. Sikorsky Memorial Airport' },
  'KOXC': { lat: 41.4786, lng: -72.6120, name: 'Waterbury-Oxford Airport' },
  'KPOU': { lat: 41.6266, lng: -73.8842, name: 'Dutchess County Airport' },
  'KHPN': { lat: 41.0670, lng: -73.7076, name: 'Westchester County Airport' },
  'KBDL': { lat: 41.9389, lng: -72.6832, name: 'Bradley International Airport' },
  'KORH': { lat: 42.2673, lng: -71.8757, name: 'Worcester Regional Airport' },
  'KBOS': { lat: 42.3643, lng: -71.0052, name: 'Boston Logan International Airport' },
  
  // Major Hubs
  'KJFK': { lat: 40.6398, lng: -73.7789, name: 'John F. Kennedy International Airport' },
  'KLGA': { lat: 40.7769, lng: -73.8740, name: 'LaGuardia Airport' },
  'KEWR': { lat: 40.6925, lng: -74.1687, name: 'Newark Liberty International Airport' },
  'KTEB': { lat: 40.8501, lng: -74.0609, name: 'Teterboro Airport' },
  'KPHL': { lat: 39.8721, lng: -75.2408, name: 'Philadelphia International Airport' },
  'KBWI': { lat: 39.1754, lng: -76.6683, name: 'Baltimore/Washington International Airport' },
  'KDCA': { lat: 38.8521, lng: -77.0377, name: 'Ronald Reagan Washington National Airport' },
  'KIAD': { lat: 38.9445, lng: -77.4558, name: 'Washington Dulles International Airport' },
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in nautical miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
