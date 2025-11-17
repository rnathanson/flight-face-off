import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchAndParseAirNav } from '../_shared/airnav-parser.ts';
import { parseMETAR } from '../_shared/metar-parser.ts';
import { fetchTAFWithFallback } from '../_shared/checkwx-fetcher.ts';
import { parseTAFPeriods, findRelevantTafPeriod } from '../_shared/taf-period-parser.ts';
import { searchNearbyAirports } from '../_shared/airnav-search.ts';
import { AIRPORT_COORDS } from '../_shared/airport-data.ts';

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WindData {
  direction: number;
  speed: number;
  gust?: number;
}

interface RunwayWindAnalysis {
  runway: string;
  crosswind: number;
  headwind: number;
  totalWind: number;
}

interface QualifiedAirport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm: number;
  elevation_ft: number;
  qualifications: {
    passed: boolean;
    runway_ok: boolean;
    surface_ok: boolean;
    lighting_ok: boolean;
    weather_ok: boolean;
    approach_ok: boolean;
    wind_ok: boolean;
  };
  warnings: string[];
  best_runway?: {
    name: string;
    length_ft: number;
    width_ft: number;
    surface: string;
  };
  windAnalysis?: {
    runway: string;
    crosswind: number;
    headwind: number;
    totalWind: number;
  };
  requiresChiefPilotApproval: boolean;
  violatedGuidelines: string[];
}

interface RejectionDetail {
  ceiling_ft?: number;
  visibility_sm?: number;
  wind_kt?: number;
  crosswind_kt?: number;
  runway?: string;
}

interface RejectedAirport {
  code: string;
  name: string;
  distance_nm: number;
  groundTransportMinutes: number;
  failureStage: 'ground_transport' | 'runway' | 'weather' | 'wind' | 'approaches' | 'fuel';
  rejectionReasons: string[]; // User-friendly, non-technical
  details: RejectionDetail;
}

interface AirportSelectionResult {
  selectedAirport: QualifiedAirport | null;
  isAlternate: boolean;
  preferredAirport?: {
    code: string;
    name: string;
    distance_nm: number;
    groundTransportMinutes: number;
    whyRejected: string[]; // Non-technical reasons
  };
  rejectedAirports: RejectedAirport[];
  searchBoundary: {
    maxGroundTimeMinutes: number;
    airportsTried: number;
    airportsWithinBoundary: number;
  };
  airports: QualifiedAirport[]; // Keep for backwards compatibility
  configUsed: any;
}

// Extract wind from METAR/TAF string
function extractWind(weatherData: string): WindData | null {
  const vrbMatch = weatherData.match(/\bVRB(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (vrbMatch) {
    return {
      direction: -1,
      speed: parseInt(vrbMatch[1]),
      gust: vrbMatch[2] ? parseInt(vrbMatch[2]) : undefined
    };
  }

  if (/\b00000KT\b/.test(weatherData)) {
    return { direction: 0, speed: 0 };
  }

  const match = weatherData.match(/\b(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (!match) return null;
  
  return {
    direction: parseInt(match[1]),
    speed: parseInt(match[2]),
    gust: match[3] ? parseInt(match[3]) : undefined
  };
}

function calculateCrosswind(windSpeed: number, windDir: number, runwayHeading: number): number {
  const angleDiff = Math.abs(windDir - runwayHeading);
  const angleRad = (angleDiff * Math.PI) / 180;
  return Math.abs(Math.round(windSpeed * Math.sin(angleRad)));
}

function calculateHeadwind(windSpeed: number, windDir: number, runwayHeading: number): number {
  const angleDiff = Math.abs(windDir - runwayHeading);
  const angleRad = (angleDiff * Math.PI) / 180;
  return Math.round(windSpeed * Math.cos(angleRad));
}

function getRunwayHeading(runwayName: string): number {
  const digits = runwayName.match(/\d+/)?.[0];
  if (!digits) return 0;
  return parseInt(digits) * 10;
}

function analyzeBestRunway(wind: WindData, runways: any[]): RunwayWindAnalysis | null {
  if (runways.length === 0) return null;
  
  const windSpeed = wind.gust || wind.speed;
  
  if (wind.direction === -1) {
    const longestRunway = runways.reduce((max, rw) => 
      rw.length_ft > max.length_ft ? rw : max
    );
    return {
      runway: longestRunway.name,
      crosswind: windSpeed,
      headwind: 0,
      totalWind: windSpeed
    };
  }
  
  if (wind.speed === 0) {
    const longestRunway = runways.reduce((max, rw) => 
      rw.length_ft > max.length_ft ? rw : max
    );
    return {
      runway: longestRunway.name,
      crosswind: 0,
      headwind: 0,
      totalWind: 0
    };
  }
  
  let bestRunway: RunwayWindAnalysis | null = null;
  let lowestCrosswind = Infinity;
  
  for (const runway of runways) {
    const runwayHeading = getRunwayHeading(runway.name);
    const crosswind = calculateCrosswind(windSpeed, wind.direction, runwayHeading);
    const headwind = calculateHeadwind(windSpeed, wind.direction, runwayHeading);
    
    if (crosswind < lowestCrosswind) {
      lowestCrosswind = crosswind;
      bestRunway = {
        runway: runway.name,
        crosswind,
        headwind,
        totalWind: windSpeed
      };
    }
  }
  
  return bestRunway;
}

// Helper function to calculate ground transport time
async function calculateGroundTransportTime(
  from: { lat: number; lng: number; displayName: string },
  to: { lat: number; lng: number; displayName: string },
  supabase: any
): Promise<number> {
  try {
    const { data, error } = await supabase.functions.invoke('route-google', {
      body: { 
        from: {
          lat: from.lat,
          lon: from.lng,
          displayName: from.displayName,
          address: from.displayName,
          placeId: 'temp'
        },
        to: {
          lat: to.lat,
          lon: to.lng,
          displayName: to.displayName,
          address: to.displayName,
          placeId: 'temp'
        }
      }
    });

    if (!error && data?.duration_minutes) {
      return Math.ceil(data.duration_minutes);
    }
    
    // Fallback to straight-line heuristic (1.5x distance / 45mph)
    const R = 3440.065; // Nautical miles
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceNM = R * c;
    const distanceMiles = distanceNM * 1.15078; // Convert NM to statute miles
    return Math.ceil((distanceMiles * 1.5) / 45 * 60); // 45mph avg with 1.5x road factor
  } catch (error) {
    console.error('Error calculating ground transport time:', error);
    // Return a conservative estimate
    const distanceNM = calculateDistance(from.lat, from.lng, to.lat, to.lng);
    const distanceMiles = distanceNM * 1.15078;
    return Math.ceil((distanceMiles * 1.5) / 45 * 60);
  }
}

// Convert technical violations to user-friendly messages
function formatUserFriendlyReason(technicalReason: string, details: RejectionDetail): string {
  if (technicalReason.includes('Ceiling')) {
    return 'Low clouds prevent safe landing';
  }
  if (technicalReason.includes('Visibility')) {
    return 'Poor visibility makes landing unsafe';
  }
  if (technicalReason.includes('Crosswind')) {
    return `Strong crosswind makes landing unsafe`;
  }
  if (technicalReason.includes('Wind') && technicalReason.includes('limit')) {
    return 'High winds exceed safety limits';
  }
  if (technicalReason.includes('IFR requires instrument approach')) {
    return 'Weather requires special equipment not available at this airport';
  }
  if (technicalReason.includes('No Jet A fuel')) {
    return 'Airport does not have required fuel type';
  }
  if (technicalReason.includes('runway')) {
    return 'Runway too short or narrow for safe operations';
  }
  if (technicalReason.includes('ground transport')) {
    return `Too far from hospital (over 1 hour drive)`;
  }
  
  // Fallback to technical reason if no match
  return technicalReason;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      location, 
      maxGroundTimeMinutes = 60, // Changed from maxDistance to time-based
      departureTimeUTC,
      estimatedArrivalTimeUTC,
      requiresJetFuel = false 
    } = await req.json();

    const requireDaylight = false;

    const arrivalTime = estimatedArrivalTimeUTC 
      ? new Date(estimatedArrivalTimeUTC) 
      : new Date(Date.now() + 60 * 60000);

    console.log(`🕐 Using arrival time (UTC): ${arrivalTime.toISOString()}`);
    console.log(`Finding qualified airports within ${maxGroundTimeMinutes} minutes ground transport of ${location.lat}, ${location.lng}`);

    const { data: configData, error: configError } = await supabase
      .from('flight_ops_config')
      .select('*')
      .single();

    if (configError) throw new Error('Failed to load flight ops configuration');

    const config = configData;

    // Search 40nm radius - covers ~1 hour ground transport in most areas
    console.log(`🔍 Searching AirNav for airports within 40nm (will filter by ground transport time)`);
    
    const nearbyAirports = await searchNearbyAirports(location.lat, location.lng, 40);

    console.log(`✓ Found ${nearbyAirports.length} airports via AirNav search`);
    
    // Sort by flight distance initially
    nearbyAirports.sort((a, b) => a.distance_nm - b.distance_nm);

    // Get flight ops config requirements
    const minRunwayLength = config.min_runway_length_ft || 4000;
    const minRunwayWidth = config.min_runway_width_ft || 100;
    const acceptableSurfaces = config.acceptable_surfaces || ['ASPH', 'CONC'];

    // Take top 10 closest airports for detailed checking
    const airportsToCheck = nearbyAirports.slice(0, 10);
    console.log(`\n📋 Checking top ${airportsToCheck.length} closest airports in detail`);

    const rejectedAirports: RejectedAirport[] = [];
    const qualifiedAirports: QualifiedAirport[] = [];

    // ============================================================
    // PARALLEL BATCH 1: Fetch AirNav data for all 10 airports
    // ============================================================
    console.log('\n📡 BATCH 1: Fetching airport data in parallel...');

    const airnavDataPromises = airportsToCheck.map(async (airport) => {
      try {
        const airnavData = await fetchAndParseAirNav(airport.code, false, supabase);
        return { airport, airnavData, fetchSuccess: true };
      } catch (error) {
        console.error(`   ❌ Error fetching data for ${airport.code}:`, error);
        return { airport, fetchSuccess: false };
      }
    });

    const airnavResults = await Promise.all(airnavDataPromises);
    console.log(`   ✅ Fetched data for ${airnavResults.filter(r => r.fetchSuccess).length}/${airportsToCheck.length} airports`);

    // ============================================================
    // VALIDATION: Check runway requirements immediately (HARD)
    // ============================================================
    console.log('\n🛬 Validating runway requirements...');

    const airportsWithValidRunways = [];

    for (const result of airnavResults) {
      if (!result.fetchSuccess) {
        rejectedAirports.push({
          code: result.airport.code,
          name: result.airport.name || result.airport.code,
          distance_nm: result.airport.distance_nm,
          groundTransportMinutes: 999,
          failureStage: 'runway',
          rejectionReasons: ['Unable to fetch airport data'],
          details: {}
        });
        continue;
      }

      const { airport, airnavData } = result;

      // Check if runway data exists
      if (!airnavData || !airnavData.runways || airnavData.runways.length === 0) {
        console.log(`   ❌ ${airport.code}: No runway data`);
        rejectedAirports.push({
          code: airport.code,
          name: airport.name || airport.code,
          distance_nm: airport.distance_nm,
          groundTransportMinutes: 999,
          failureStage: 'runway',
          rejectionReasons: ['No runway data available'],
          details: {}
        });
        continue;
      }

      // Filter for acceptable surface types
      const validRunways = airnavData.runways.filter((rwy: any) => {
        const surface = rwy.surface?.toUpperCase() || '';
        return acceptableSurfaces.includes(surface);
      });

      if (validRunways.length === 0) {
        const surfaces = airnavData.runways.map((r: any) => r.surface).join(', ');
        console.log(`   ❌ ${airport.code}: No paved runways (surfaces: ${surfaces})`);
        rejectedAirports.push({
          code: airport.code,
          name: airport.name || airport.code,
          distance_nm: airport.distance_nm,
          groundTransportMinutes: 999,
          failureStage: 'runway',
          rejectionReasons: [`No suitable runway surface (have: ${surfaces})`],
          details: {}
        });
        continue;
      }

      // Find longest paved runway
      const longestRunway = validRunways.reduce((longest: any, rwy: any) => 
        (rwy.length_ft > longest.length_ft) ? rwy : longest
      );

      // Check runway length
      if (longestRunway.length_ft < minRunwayLength) {
        console.log(`   ❌ ${airport.code}: Runway too short (${longestRunway.length_ft}ft < ${minRunwayLength}ft)`);
        rejectedAirports.push({
          code: airport.code,
          name: airport.name || airport.code,
          distance_nm: airport.distance_nm,
          groundTransportMinutes: 999,
          failureStage: 'runway',
          rejectionReasons: [`Runway too short (${longestRunway.length_ft}ft, need ${minRunwayLength}ft+)`],
          details: { runway: longestRunway.name }
        });
        continue;
      }

      // Check runway width
      if (longestRunway.width_ft < minRunwayWidth) {
        console.log(`   ❌ ${airport.code}: Runway too narrow (${longestRunway.width_ft}ft < ${minRunwayWidth}ft)`);
        rejectedAirports.push({
          code: airport.code,
          name: airport.name || airport.code,
          distance_nm: airport.distance_nm,
          groundTransportMinutes: 999,
          failureStage: 'runway',
          rejectionReasons: [`Runway too narrow (${longestRunway.width_ft}ft, need ${minRunwayWidth}ft+)`],
          details: { runway: longestRunway.name }
        });
        continue;
      }

      // ✅ Runway is suitable
      console.log(`   ✅ ${airport.code}: ${longestRunway.name} - ${longestRunway.length_ft}ft x ${longestRunway.width_ft}ft ${longestRunway.surface}`);
      airportsWithValidRunways.push({ airport, airnavData });
    }

    console.log(`\n   📊 ${airportsWithValidRunways.length}/${airportsToCheck.length} airports have suitable runways`);

    if (airportsWithValidRunways.length === 0) {
      console.log('\n❌ NO AIRPORTS with suitable runways found');
      return new Response(
        JSON.stringify({
          success: false,
          selectedAirport: null,
          isAlternate: false,
          rejectedAirports,
          searchBoundary: {
            maxGroundTimeMinutes,
            airportsTried: airportsToCheck.length,
            airportsWithinBoundary: 0,
          },
          airports: [],
          configUsed: config,
          error: 'No airports with suitable runways within search area',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // PARALLEL BATCH 2: Calculate ground transport (FIXED)
    // ============================================================
    console.log('\n🚗 BATCH 2: Calculating ground transport times in parallel...');

    const transportPromises = airportsWithValidRunways.map(async ({ airport, airnavData }) => {
      // Get actual airport coordinates from cache
      const airportCoords = AIRPORT_COORDS[airport.code];
      
      if (!airportCoords) {
        console.log(`   ⚠️ No coordinates for ${airport.code}`);
        return { 
          airport, 
          airnavData,
          groundTransportMinutes: 999,
          hasCoords: false 
        };
      }

      const minutes = await calculateGroundTransportTime(
        location, // Hospital location ✅
        { 
          lat: airportCoords.lat, // ✅ Actual airport coordinates
          lng: airportCoords.lng,
          displayName: airportCoords.name || airport.code 
        },
        supabase
      );
      
      console.log(`   ${airport.code}: ${minutes} min drive`);
      
      return { 
        airport, 
        airnavData,
        groundTransportMinutes: minutes,
        hasCoords: true 
      };
    });

    const transportResults = await Promise.all(transportPromises);

    // Filter for airports within ground transport boundary
    const airportsWithinBoundary = transportResults
      .filter(r => r.hasCoords && r.groundTransportMinutes <= maxGroundTimeMinutes)
      .sort((a, b) => a.airport.distance_nm - b.airport.distance_nm)
      .slice(0, 5); // Take top 5 for weather checks

    console.log(`\n   📊 ${airportsWithinBoundary.length} airports within ${maxGroundTimeMinutes}min ground transport`);

    // Add rejected airports for those beyond ground transport boundary
    transportResults.forEach(r => {
      if (!r.hasCoords || r.groundTransportMinutes > maxGroundTimeMinutes) {
        rejectedAirports.push({
          code: r.airport.code,
          name: r.airport.name || r.airport.code,
          distance_nm: r.airport.distance_nm,
          groundTransportMinutes: r.groundTransportMinutes,
          failureStage: 'ground_transport',
          rejectionReasons: [formatUserFriendlyReason('ground transport', {})],
          details: {}
        });
      }
    });

    if (airportsWithinBoundary.length === 0) {
      console.log('\n❌ NO AIRPORTS within ground transport boundary');
      return new Response(
        JSON.stringify({
          success: false,
          selectedAirport: null,
          isAlternate: false,
          rejectedAirports,
          searchBoundary: {
            maxGroundTimeMinutes,
            airportsTried: airportsToCheck.length,
            airportsWithinBoundary: 0,
          },
          airports: [],
          configUsed: config,
          error: `No airports within ${maxGroundTimeMinutes} minutes ground transport`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // PARALLEL BATCH 3: Fetch TAF weather data
    // ============================================================
    console.log('\n🌤️ BATCH 3: Fetching weather data in parallel...');

    const weatherPromises = airportsWithinBoundary.map(async ({ airport, airnavData, groundTransportMinutes }) => {
      try {
        const tafData = await fetchTAFWithFallback(airport.code);
        return {
          airport, 
          airnavData, 
          groundTransportMinutes, 
          tafData, 
          weatherFetchSuccess: true 
        };
      } catch (error) {
        console.error(`   ⚠️ No weather data for ${airport.code}`);
        return { 
          airport, 
          airnavData, 
          groundTransportMinutes, 
          tafData: null,
          weatherFetchSuccess: false 
        };
      }
    });

    const weatherResults = await Promise.all(weatherPromises);
    console.log(`   ✅ Fetched weather for ${weatherResults.filter(r => r.weatherFetchSuccess).length}/${airportsWithinBoundary.length} airports`);

    // ============================================================
    // SEQUENTIAL: Check fuel, weather, wind, IFR (fast - no API calls)
    // ============================================================
    console.log('\n✅ FINAL: Checking fuel, weather, wind, and approaches...');

    for (const { airport, airnavData, groundTransportMinutes, tafData, weatherFetchSuccess } of weatherResults) {
      console.log(`\n🔍 Evaluating ${airport.code}...`);
      
      // Check fuel availability (HARD requirement)
      if (!airnavData || !airnavData.has_jet_fuel) {
        console.log(`   ❌ No Jet A fuel`);
        rejectedAirports.push({
          code: airport.code,
          name: airport.name || airport.code,
          distance_nm: airport.distance_nm,
          groundTransportMinutes,
          failureStage: 'fuel',
          rejectionReasons: ['No Jet A fuel available'],
          details: {}
        });
        continue;
      }
      
      const warnings: string[] = [];
      const violatedGuidelines: string[] = [];
      let requiresApproval = false;

      // Parse weather if available (SOFT requirement)
      let weatherOk = true;
      let windOk = true;
      let approachOk = true;

      if (weatherFetchSuccess && tafData) {
        const tafPeriods = parseTAFPeriods(tafData.raw);
        const relevantPeriod = findRelevantTafPeriod(tafPeriods, arrivalTime);

        if (relevantPeriod) {
          const minCeiling = config.minimum_ceiling_ft || 1000;
          const minVisibility = config.minimum_visibility_sm || 3;

          // Check ceiling (SOFT)
          if (relevantPeriod.ceiling !== undefined && relevantPeriod.ceiling !== null && relevantPeriod.ceiling < minCeiling) {
            console.log(`   ⚠️ Low ceiling: ${relevantPeriod.ceiling}ft (min ${minCeiling}ft)`);
            warnings.push(`Low ceiling: ${relevantPeriod.ceiling}ft`);
            violatedGuidelines.push('ceiling');
            requiresApproval = true;
            weatherOk = false;
          }

          // Check visibility (SOFT) - visibility is a string like "10SM"
          if (relevantPeriod.visibility) {
            const visMatch = relevantPeriod.visibility.match(/(\d+(?:\.\d+)?)/);
            const visSm = visMatch ? parseFloat(visMatch[1]) : 10;
            if (visSm < minVisibility) {
              console.log(`   ⚠️ Low visibility: ${visSm}SM (min ${minVisibility}SM)`);
              warnings.push(`Low visibility: ${visSm}SM`);
              violatedGuidelines.push('visibility');
              requiresApproval = true;
              weatherOk = false;
            }
          }

          // Check winds (SOFT)
          const windData = extractWind(relevantPeriod.raw);
          if (windData) {
            const maxWind = config.max_wind_kt || 35;
            const maxCrosswind = config.max_crosswind_kt || 15;

            const effectiveWind = windData.gust || windData.speed;
            if (effectiveWind > maxWind) {
              console.log(`   ⚠️ High winds: ${effectiveWind}kt (max ${maxWind}kt)`);
              warnings.push(`High winds: ${effectiveWind}kt`);
              violatedGuidelines.push('wind');
              requiresApproval = true;
              windOk = false;
            }

            // Check crosswind if runways available
            if (airnavData.runways && airnavData.runways.length > 0) {
              const runwayAnalysis = analyzeBestRunway(windData, airnavData.runways);
              if (runwayAnalysis && Math.abs(runwayAnalysis.crosswind) > maxCrosswind) {
                console.log(`   ⚠️ High crosswind: ${Math.abs(runwayAnalysis.crosswind).toFixed(0)}kt on ${runwayAnalysis.runway} (max ${maxCrosswind}kt)`);
                warnings.push(`High crosswind: ${Math.abs(runwayAnalysis.crosswind).toFixed(0)}kt`);
                violatedGuidelines.push('crosswind');
                requiresApproval = true;
                windOk = false;
              }
            }
          }
        }
      }

      // Check approaches (SOFT) - check if airport has ILS or RNAV approaches
      if (config.ifr_requires_instrument_approach && airnavData && !airnavData.has_ils && !airnavData.has_rnav) {
        console.log(`   ⚠️ No instrument approaches for IFR operations`);
        warnings.push('No instrument approaches');
        violatedGuidelines.push('approaches');
        requiresApproval = true;
        approachOk = false;
      }

      // If this airport has violations, mark as rejected but continue checking others
      if (requiresApproval) {
        console.log(`   ⚠️ ${airport.code} requires Chief Pilot approval: ${warnings.join(', ')}`);
        rejectedAirports.push({
          code: airport.code,
          name: airport.name || airport.code,
          distance_nm: airport.distance_nm,
          groundTransportMinutes,
          failureStage: weatherOk ? (windOk ? 'approaches' : 'wind') : 'weather',
          rejectionReasons: warnings,
          details: {}
        });
        
        // But also add as qualified with approval requirement
        const qualifiedAirport: QualifiedAirport = {
          code: airport.code,
          name: airnavData.name || airport.code,
          lat: airnavData.lat || AIRPORT_COORDS[airport.code]?.lat || 0,
          lng: airnavData.lng || AIRPORT_COORDS[airport.code]?.lng || 0,
          distance_nm: airport.distance_nm,
          elevation_ft: airnavData.elevation_ft || 0,
          qualifications: {
            passed: false,
            runway_ok: true,
            surface_ok: true,
            lighting_ok: true,
            weather_ok: weatherOk,
            approach_ok: approachOk,
            wind_ok: windOk,
          },
          warnings,
          best_runway: airnavData.runways?.[0],
          requiresChiefPilotApproval: true,
          violatedGuidelines
        };
        qualifiedAirports.push(qualifiedAirport);
        continue;
      }

      // ✅ FULLY QUALIFIED AIRPORT FOUND!
      console.log(`   ✅ ${airport.code} is FULLY QUALIFIED (no violations)`);
      
      const qualifiedAirport: QualifiedAirport = {
        code: airport.code,
        name: airnavData.name || airport.code,
        lat: airnavData.lat || AIRPORT_COORDS[airport.code]?.lat || 0,
        lng: airnavData.lng || AIRPORT_COORDS[airport.code]?.lng || 0,
        distance_nm: airport.distance_nm,
        elevation_ft: airnavData.elevation_ft || 0,
        qualifications: {
          passed: true,
          runway_ok: true,
          surface_ok: true,
          lighting_ok: true,
          weather_ok: true,
          approach_ok: true,
          wind_ok: true,
        },
        warnings: [],
        best_runway: airnavData.runways?.[0],
        requiresChiefPilotApproval: false,
        violatedGuidelines: []
      };

      qualifiedAirports.push(qualifiedAirport);

      const result: AirportSelectionResult = {
        selectedAirport: qualifiedAirport,
        isAlternate: false,
        rejectedAirports,
        searchBoundary: {
          maxGroundTimeMinutes,
          airportsTried: airportsToCheck.length,
          airportsWithinBoundary: airportsWithinBoundary.length
        },
        airports: qualifiedAirports,
        configUsed: config
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If we get here, no airports within boundary passed all requirements
    console.log(`\n⚠️ NO QUALIFIED AIRPORTS FOUND within ${maxGroundTimeMinutes}min ground transport`);
    console.log(`   Tried ${rejectedAirports.length} airports within boundary`);
    
    // Separate HARD failures (runway, distance, fuel) from SOFT failures (weather, wind, approaches)
    const hardFailures = rejectedAirports.filter(a => 
      ['runway', 'ground_transport', 'fuel'].includes(a.failureStage)
    );
    
    const softFailures = rejectedAirports.filter(a => 
      ['weather', 'wind', 'approaches'].includes(a.failureStage)
    );
    
    console.log(`\n📊 FAILURE ANALYSIS:`);
    console.log(`   ❌ HARD failures (runway/distance/fuel): ${hardFailures.length} airports`);
    console.log(`   ⚠️  SOFT failures (weather/wind/approaches): ${softFailures.length} airports`);
    
    // CRITICAL: NEVER select an airport with hard failures
    // ONLY select from soft failures (can be overridden by Chief Pilot)
    let selectedAirport: QualifiedAirport | null = null;
    
    if (softFailures.length > 0) {
      // Pick the closest one with fewest soft violations
      const leastBad = softFailures.reduce((best, current) => {
        // Prefer closer airports
        if (current.distance_nm < best.distance_nm - 5) return current;
        if (best.distance_nm < current.distance_nm - 5) return best;
        // If similar distance, prefer fewer reasons
        return current.rejectionReasons.length < best.rejectionReasons.length ? current : best;
      });

      console.log(`\n⚠️ Selecting airport with SOFT violations (requires Chief Pilot approval):`);
      console.log(`   Airport: ${leastBad.code} - ${leastBad.name}`);
      console.log(`   Distance: ${leastBad.distance_nm.toFixed(1)}nm`);
      console.log(`   Ground transport: ${leastBad.groundTransportMinutes}min`);
      console.log(`   Violations: ${leastBad.rejectionReasons.join(', ')}`);

      // Create a qualified airport object but mark it as requiring approval
      selectedAirport = {
        code: leastBad.code,
        name: leastBad.name,
        lat: AIRPORT_COORDS[leastBad.code]?.lat || 0,
        lng: AIRPORT_COORDS[leastBad.code]?.lng || 0,
        distance_nm: leastBad.distance_nm,
        elevation_ft: 0,
        qualifications: {
          passed: false,
          runway_ok: true, // Runway is OK (soft failure)
          surface_ok: true,
          lighting_ok: true,
          weather_ok: leastBad.failureStage !== 'weather',
          approach_ok: leastBad.failureStage !== 'approaches',
          wind_ok: leastBad.failureStage !== 'wind',
        },
        warnings: leastBad.rejectionReasons,
        requiresChiefPilotApproval: true,
        violatedGuidelines: [leastBad.failureStage]
      };
      
      qualifiedAirports.push(selectedAirport);
    } else {
      // NO acceptable airports - all failed HARD requirements
      console.log(`\n❌ NO SUITABLE AIRPORTS FOUND`);
      console.log(`   All ${hardFailures.length} airports within range failed critical requirements:`);
      hardFailures.forEach(airport => {
        console.log(`   - ${airport.code}: ${airport.rejectionReasons.join(', ')}`);
      });
      console.log(`   ⛔ Cannot complete this trip - HARD requirements cannot be waived`);
      selectedAirport = null;
    }

    const result: AirportSelectionResult = {
      selectedAirport,
      isAlternate: false,
      preferredAirport: rejectedAirports.length > 0 ? {
        code: rejectedAirports[0].code,
        name: rejectedAirports[0].name,
        distance_nm: rejectedAirports[0].distance_nm,
        groundTransportMinutes: rejectedAirports[0].groundTransportMinutes,
        whyRejected: rejectedAirports[0].rejectionReasons
      } : undefined,
      rejectedAirports,
      searchBoundary: {
        maxGroundTimeMinutes,
        airportsTried: rejectedAirports.length,
        airportsWithinBoundary: airportsWithinBoundary.length
      },
      airports: qualifiedAirports,
      configUsed: config
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
