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
import { calculateDistance } from './geoUtils';

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
