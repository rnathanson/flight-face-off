/**
 * Decodes a Google Maps encoded polyline string into an array of [lng, lat] coordinates
 * Format is compatible with Mapbox GL JS which expects [longitude, latitude]
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
