interface NominatimResult {
  name?: string;
  address: string;
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  address: string;
  placeId: string;
}

export interface LocationSuggestion {
  placeId: string;
  name?: string;
  address: string;
  displayName: string;
  lat: number;
  lon: number;
}

import { supabase } from '@/integrations/supabase/client';

async function geocodeFetch(query: string, limit: number): Promise<NominatimResult[]> {
  const { data, error } = await supabase.functions.invoke('geocode-google', {
    body: { query, limit }
  });

  if (error) {
    console.error('Geocode function error:', error);
    throw new Error('Failed to geocode location');
  }

  return data;
}

export async function searchLocations(query: string, limit: number = 5): Promise<LocationSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const data: NominatimResult[] = await geocodeFetch(query, limit);

    return data.map(result => ({
      placeId: result.place_id,
      name: result.name || '',
      address: result.address,
      displayName: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    }));
  } catch (error) {
    console.error('Location search error:', error);
    return [];
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address || address.trim().length === 0) {
    throw new Error('Address cannot be empty');
  }

  const suggestions = await searchLocations(address, 1);

  if (suggestions.length === 0) {
    throw new Error(`Could not find location: "${address}". Try a more specific address or city name.`);
  }

  const result = suggestions[0];
  return {
    lat: result.lat,
    lon: result.lon,
    displayName: result.displayName,
    address: result.address,
    placeId: result.placeId,
  };
}

export async function geocodeRoute(
  from: GeocodeResult,
  to: GeocodeResult
): Promise<{
  from: GeocodeResult;
  to: GeocodeResult;
  distance: number; // nautical miles
}> {
  // Calculate distance using Haversine formula
  const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);

  return { from, to, distance };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Haversine formula for great circle distance
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
