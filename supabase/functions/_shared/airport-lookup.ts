/**
 * Shared airport lookup utilities
 * Handles ICAO/IATA code normalization and database lookups
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AirportData {
  icao_code: string;
  iata_code?: string;
  name: string;
  lat: number;
  lng: number;
  elevation_ft?: number;
  has_jet_fuel?: boolean;
  has_lighting?: boolean;
}

/**
 * Check if a string looks like an airport code
 * @param input String to check
 * @returns True if it looks like a 3-4 letter airport code
 */
export function isAirportCode(input: string): boolean {
  const trimmed = input.trim().toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(trimmed);
}

/**
 * Normalize airport code (uppercase, trim)
 * @param code Airport code to normalize
 * @returns Normalized code
 */
export function normalizeAirportCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Lookup airport by ICAO or IATA code
 * Handles US K prefix (e.g., FRG -> KFRG)
 * Checks both airports and airport_cache tables
 * 
 * @param code Airport code (3 or 4 letters)
 * @param supabase Supabase client
 * @returns Airport data or null if not found
 */
export async function lookupAirportByCode(
  code: string,
  supabase: SupabaseClient
): Promise<AirportData | null> {
  const normalizedCode = normalizeAirportCode(code);
  
  // Try original code first
  let airport = await lookupAirportInternal(normalizedCode, supabase);
  if (airport) return airport;

  // If 3 letters, try with K prefix (US airports)
  if (normalizedCode.length === 3) {
    const withK = 'K' + normalizedCode;
    airport = await lookupAirportInternal(withK, supabase);
    if (airport) return airport;
  }

  // Not found
  return null;
}

/**
 * Internal lookup function that checks both airports and airport_cache
 */
async function lookupAirportInternal(
  code: string,
  supabase: SupabaseClient
): Promise<AirportData | null> {
  // Try airports table first (by ICAO or IATA)
  const { data: airportData } = await supabase
    .from('airports')
    .select('icao_code, iata_code, name, lat, lng, elevation_ft, has_jet_fuel, has_lighting')
    .or(`icao_code.eq.${code},iata_code.eq.${code}`)
    .maybeSingle();

  if (airportData) {
    return {
      icao_code: airportData.icao_code,
      iata_code: airportData.iata_code || undefined,
      name: airportData.name,
      lat: Number(airportData.lat),
      lng: Number(airportData.lng),
      elevation_ft: airportData.elevation_ft || undefined,
      has_jet_fuel: airportData.has_jet_fuel || undefined,
      has_lighting: airportData.has_lighting || undefined
    };
  }

  // Try airport_cache table (ICAO only)
  const { data: cacheData } = await supabase
    .from('airport_cache')
    .select('airport_code, name, lat, lng, elevation_ft, has_jet_fuel, has_lighting')
    .eq('airport_code', code)
    .maybeSingle();

  if (cacheData) {
    return {
      icao_code: cacheData.airport_code,
      name: cacheData.name || code,
      lat: Number(cacheData.lat),
      lng: Number(cacheData.lng),
      elevation_ft: cacheData.elevation_ft || undefined,
      has_jet_fuel: cacheData.has_jet_fuel || undefined,
      has_lighting: cacheData.has_lighting || undefined
    };
  }

  return null;
}

/**
 * Lookup multiple airports by codes
 * @param codes Array of airport codes
 * @param supabase Supabase client
 * @returns Array of airport data (nulls for not found)
 */
export async function lookupAirportsByCodes(
  codes: string[],
  supabase: SupabaseClient
): Promise<(AirportData | null)[]> {
  const results = await Promise.all(
    codes.map(code => lookupAirportByCode(code, supabase))
  );
  return results;
}
