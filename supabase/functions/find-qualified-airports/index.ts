import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchAndParseAirNav } from '../_shared/airnav-parser.ts';
import { parseMETAR } from '../_shared/metar-parser.ts';
import { fetchTAFWithFallback } from '../_shared/checkwx-fetcher.ts';
import { parseTAFPeriods, findRelevantTafPeriod } from '../_shared/taf-period-parser.ts';
import { searchNearbyAirports } from '../_shared/airnav-search.ts';

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

    // Start with wider search radius (100nm) to ensure we find airports
    console.log(`🔍 Searching AirNav for airports within 100nm (will filter by ground transport time)`);
    
    const nearbyAirports = await searchNearbyAirports(location.lat, location.lng, 100);

    console.log(`✓ Found ${nearbyAirports.length} airports via AirNav search`);
    
    // Sort by flight distance initially
    nearbyAirports.sort((a, b) => a.distance_nm - b.distance_nm);

    // CASCADE LOGIC: Try airports one by one until we find a qualified one
    console.log('\n🔄 CASCADE LOGIC: Checking airports sequentially...');
    
    const acceptableSurfaces = config.acceptable_surfaces || ['ASPH', 'CONC'];
    const rejectedAirports: RejectedAirport[] = [];
    const qualifiedAirports: QualifiedAirport[] = [];
    let airportsWithinBoundary = 0;
    let firstRejectedAirport: RejectedAirport | null = null;
    
    // Try each airport in order of flight distance
    for (const nearbyAirport of nearbyAirports) {
      console.log(`\n🔍 Checking ${nearbyAirport.code} (${nearbyAirport.distance_nm.toFixed(1)}nm away)...`);
      
      // STEP 1: Calculate ground transport time
      // Note: NearbyAirport doesn't have lat/lng, so we use location as approximation
      // The actual airport coordinates will be used once we fetch airnavData
      const groundTransportMinutes = await calculateGroundTransportTime(
        location,
        { 
          lat: location.lat, // Will use actual airport coords after fetch
          lng: location.lng, 
          displayName: nearbyAirport.code 
        },
        supabase
      );
      
      console.log(`🚗 Ground transport time: ${groundTransportMinutes} minutes`);
      
      if (groundTransportMinutes > maxGroundTimeMinutes) {
        console.log(`❌ Outside ground transport boundary (${groundTransportMinutes}min > ${maxGroundTimeMinutes}min limit)`);
        const rejected: RejectedAirport = {
          code: nearbyAirport.code,
          name: nearbyAirport.name || nearbyAirport.code,
          distance_nm: nearbyAirport.distance_nm,
          groundTransportMinutes,
          failureStage: 'ground_transport',
          rejectionReasons: [formatUserFriendlyReason('ground transport', {})],
          details: {}
        };
        rejectedAirports.push(rejected);
        if (!firstRejectedAirport) firstRejectedAirport = rejected;
        continue; // Skip to next airport
      }
      
      airportsWithinBoundary++;
      
      // STEP 2: Fetch airport data and check runway requirements
      let airnavData: any;
      try {
        airnavData = await fetchAndParseAirNav(nearbyAirport.code, false, supabase);
        if (!airnavData) {
          console.log(`❌ No AirNav data available`);
          const rejected: RejectedAirport = {
            code: nearbyAirport.code,
            name: nearbyAirport.name || nearbyAirport.code,
            distance_nm: nearbyAirport.distance_nm,
            groundTransportMinutes,
            failureStage: 'runway',
            rejectionReasons: ['Airport data not available'],
            details: {}
          };
          rejectedAirports.push(rejected);
          if (!firstRejectedAirport) firstRejectedAirport = rejected;
          continue;
        }
      } catch (error) {
        console.error(`Error fetching ${nearbyAirport.code}:`, error);
        continue;
      }

      // Check fuel requirement
      if (requiresJetFuel && !airnavData.has_jet_fuel) {
        console.log(`❌ No Jet A fuel available`);
        const rejected: RejectedAirport = {
          code: nearbyAirport.code,
          name: airnavData.name || nearbyAirport.code,
          distance_nm: nearbyAirport.distance_nm,
          groundTransportMinutes,
          failureStage: 'fuel',
          rejectionReasons: [formatUserFriendlyReason('No Jet A fuel', {})],
          details: {}
        };
        rejectedAirports.push(rejected);
        if (!firstRejectedAirport) firstRejectedAirport = rejected;
        continue;
      }

      // Check runway dimensions
      const qualifyingRunways = airnavData.runways.filter((runway: any) => 
        runway.length_ft >= config.min_runway_length_ft &&
        runway.width_ft >= config.min_runway_width_ft &&
        (!config.requires_paved_surface || acceptableSurfaces.includes(runway.surface)) &&
        (!requireDaylight || !config.requires_lighting || runway.lighted)
      );

      if (qualifyingRunways.length === 0) {
        console.log(`❌ No qualifying runways (need ${config.min_runway_length_ft}ft x ${config.min_runway_width_ft}ft)`);
        const rejected: RejectedAirport = {
          code: nearbyAirport.code,
          name: airnavData.name || nearbyAirport.code,
          distance_nm: nearbyAirport.distance_nm,
          groundTransportMinutes,
          failureStage: 'runway',
          rejectionReasons: [formatUserFriendlyReason('runway', {})],
          details: { runway: `Need ${config.min_runway_length_ft}ft x ${config.min_runway_width_ft}ft` }
        };
        rejectedAirports.push(rejected);
        if (!firstRejectedAirport) firstRejectedAirport = rejected;
        continue;
      }

      console.log(`✅ Runway requirements met (${qualifyingRunways.length} qualifying runways)`);
      
      // STEP 3: Check variable rules (weather, wind, approaches)
      const qualifications = {
        passed: true,
        runway_ok: true,
        surface_ok: true,
        lighting_ok: true,
        weather_ok: true,
        approach_ok: true,
        wind_ok: true,
      };
      
      const warnings: string[] = [];
      const technicalReasons: string[] = [];
      const rejectionDetails: RejectionDetail = {};
      let windAnalysis: RunwayWindAnalysis | undefined;
      let failureStage: RejectedAirport['failureStage'] | null = null;

      // Fetch weather data
      const tafData = await fetchTAFWithFallback(nearbyAirport.code);
      
      if (!tafData) {
        console.log(`❌ No TAF forecast available`);
        const rejected: RejectedAirport = {
          code: nearbyAirport.code,
          name: airnavData.name || nearbyAirport.code,
          distance_nm: nearbyAirport.distance_nm,
          groundTransportMinutes,
          failureStage: 'weather',
          rejectionReasons: ['Weather forecast not available'],
          details: {}
        };
        rejectedAirports.push(rejected);
        if (!firstRejectedAirport) firstRejectedAirport = rejected;
        continue;
      }

      const tafPeriods = parseTAFPeriods(tafData.raw);
      const relevantPeriod = findRelevantTafPeriod(tafPeriods, arrivalTime);
      
      if (!relevantPeriod) {
        console.log(`❌ No TAF for arrival time`);
        const rejected: RejectedAirport = {
          code: nearbyAirport.code,
          name: airnavData.name || nearbyAirport.code,
          distance_nm: nearbyAirport.distance_nm,
          groundTransportMinutes,
          failureStage: 'weather',
          rejectionReasons: ['Weather forecast not available for arrival time'],
          details: {}
        };
        rejectedAirports.push(rejected);
        if (!firstRejectedAirport) firstRejectedAirport = rejected;
        continue;
      }

      // Check ceiling
      if (relevantPeriod.ceiling !== null && relevantPeriod.ceiling !== undefined && relevantPeriod.ceiling < config.minimum_ceiling_ft) {
        qualifications.weather_ok = false;
        qualifications.passed = false;
        failureStage = 'weather';
        const technicalReason = `Ceiling ${relevantPeriod.ceiling}ft < ${config.minimum_ceiling_ft}ft minimum`;
        warnings.push(technicalReason);
        technicalReasons.push(technicalReason);
        rejectionDetails.ceiling_ft = relevantPeriod.ceiling;
        console.log(`❌ ${technicalReason}`);
      }

      // Check visibility
      const visibilitySM = parseFloat(relevantPeriod.visibility || '10');
      if (visibilitySM < config.minimum_visibility_sm) {
        qualifications.weather_ok = false;
        qualifications.passed = false;
        if (!failureStage) failureStage = 'weather';
        const technicalReason = `Visibility ${visibilitySM}SM < ${config.minimum_visibility_sm}SM minimum`;
        warnings.push(technicalReason);
        technicalReasons.push(technicalReason);
        rejectionDetails.visibility_sm = visibilitySM;
        console.log(`❌ ${technicalReason}`);
      }

      // Check approaches if IFR
      if (relevantPeriod.flightCategory === 'IFR' || relevantPeriod.flightCategory === 'LIFR') {
        if (config.ifr_requires_instrument_approach && !airnavData.has_instrument_approach) {
          qualifications.approach_ok = false;
          qualifications.passed = false;
          if (!failureStage) failureStage = 'approaches';
          const technicalReason = `IFR requires instrument approach (${relevantPeriod.flightCategory})`;
          warnings.push(technicalReason);
          technicalReasons.push(technicalReason);
          console.log(`❌ ${technicalReason}`);
        }
      }

      // Check wind
      if (qualifyingRunways.length > 0 && relevantPeriod.wind) {
        const windData = {
          direction: relevantPeriod.wind.direction === 'VRB' ? -1 : relevantPeriod.wind.direction,
          speed: relevantPeriod.wind.speed,
          gust: relevantPeriod.wind.gust
        };

        windAnalysis = analyzeBestRunway(windData, qualifyingRunways) || undefined;
        
        if (windAnalysis) {
          console.log(`📊 Best runway ${windAnalysis.runway}: ${windAnalysis.totalWind}kt total, ${windAnalysis.crosswind}kt crosswind`);

          if (windAnalysis.totalWind > config.max_wind_kt) {
            qualifications.wind_ok = false;
            qualifications.passed = false;
            if (!failureStage) failureStage = 'wind';
            const technicalReason = `Wind ${windAnalysis.totalWind}kt > ${config.max_wind_kt}kt limit`;
            warnings.push(technicalReason);
            technicalReasons.push(technicalReason);
            rejectionDetails.wind_kt = windAnalysis.totalWind;
            rejectionDetails.runway = windAnalysis.runway;
            console.log(`❌ ${technicalReason}`);
          }
          
          if (windAnalysis.crosswind > config.max_crosswind_kt) {
            qualifications.wind_ok = false;
            qualifications.passed = false;
            if (!failureStage) failureStage = 'wind';
            const technicalReason = `Crosswind ${windAnalysis.crosswind}kt > ${config.max_crosswind_kt}kt limit on ${windAnalysis.runway}`;
            warnings.push(technicalReason);
            technicalReasons.push(technicalReason);
            rejectionDetails.crosswind_kt = windAnalysis.crosswind;
            rejectionDetails.runway = windAnalysis.runway;
            console.log(`❌ ${technicalReason}`);
          }

          if (qualifications.wind_ok) {
            console.log(`✅ Wind within limits`);
          }
        }
      }

      // If this airport failed variable rules, add to rejected and continue
      if (!qualifications.passed) {
        console.log(`❌ ${nearbyAirport.code} failed variable rules: ${technicalReasons.join(', ')}`);
        const rejected: RejectedAirport = {
          code: nearbyAirport.code,
          name: airnavData.name || nearbyAirport.code,
          distance_nm: nearbyAirport.distance_nm,
          groundTransportMinutes,
          failureStage: failureStage || 'weather',
          rejectionReasons: technicalReasons.map(r => formatUserFriendlyReason(r, rejectionDetails)),
          details: rejectionDetails
        };
        rejectedAirports.push(rejected);
        if (!firstRejectedAirport) firstRejectedAirport = rejected;
        continue; // CASCADE: Try next airport
      }

      // ✅ SUCCESS: This airport passes all requirements!
      console.log(`✅ ${nearbyAirport.code} FULLY QUALIFIED - stopping search`);
      
      const violatedGuidelines: string[] = [];
      const qualifiedAirport: QualifiedAirport = {
        code: nearbyAirport.code,
        name: airnavData.name || nearbyAirport.code,
        lat: airnavData.lat || 0,
        lng: airnavData.lng || 0,
        distance_nm: nearbyAirport.distance_nm,
        elevation_ft: airnavData.elevation_ft || 0,
        qualifications,
        warnings,
        best_runway: qualifyingRunways[0],
        windAnalysis: windAnalysis ? {
          runway: windAnalysis.runway,
          crosswind: windAnalysis.crosswind,
          headwind: windAnalysis.headwind,
          totalWind: windAnalysis.totalWind
        } : undefined,
        requiresChiefPilotApproval: false,
        violatedGuidelines
      };

      qualifiedAirports.push(qualifiedAirport);

      // Determine if this is an alternate (not the first airport we tried within boundary)
      const isAlternate = rejectedAirports.length > 0;
      
      // Build preferred airport info if this is an alternate
      let preferredAirport: typeof result.preferredAirport | undefined;
      if (isAlternate && firstRejectedAirport) {
        preferredAirport = {
          code: firstRejectedAirport.code,
          name: firstRejectedAirport.name,
          distance_nm: firstRejectedAirport.distance_nm,
          groundTransportMinutes: firstRejectedAirport.groundTransportMinutes,
          whyRejected: firstRejectedAirport.rejectionReasons
        };
        console.log(`ℹ️ Selected alternate: ${nearbyAirport.code} - preferred was ${firstRejectedAirport.code}`);
        console.log(`   Preferred rejected because: ${firstRejectedAirport.rejectionReasons.join(', ')}`);
      }

      const result: AirportSelectionResult = {
        selectedAirport: qualifiedAirport,
        isAlternate,
        preferredAirport,
        rejectedAirports,
        searchBoundary: {
          maxGroundTimeMinutes,
          airportsTried: rejectedAirports.length + 1,
          airportsWithinBoundary: airportsWithinBoundary
        },
        airports: qualifiedAirports,
        configUsed: config
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If we get here, no airports within boundary passed all requirements
    console.log(`⚠️ NO QUALIFIED AIRPORTS FOUND within ${maxGroundTimeMinutes}min ground transport`);
    console.log(`   Tried ${rejectedAirports.length} airports within boundary`);
    
    // Select least-worst option from those we tried
    let selectedAirport: QualifiedAirport | null = null;
    if (rejectedAirports.length > 0) {
      // Pick the closest one with fewest violations
      const leastBad = rejectedAirports.reduce((best, current) => {
        // Prefer closer airports
        if (current.distance_nm < best.distance_nm - 5) return current;
        if (best.distance_nm < current.distance_nm - 5) return best;
        // If similar distance, prefer fewer reasons
        return current.rejectionReasons.length < best.rejectionReasons.length ? current : best;
      });

      console.log(`⚠️ Selecting least-worst option: ${leastBad.code}`);
      console.log(`   Violations: ${leastBad.rejectionReasons.join(', ')}`);

      // Create a qualified airport object but mark it as requiring approval
      selectedAirport = {
        code: leastBad.code,
        name: leastBad.name,
        lat: 0, // Would need to fetch from airnavData
        lng: 0,
        distance_nm: leastBad.distance_nm,
        elevation_ft: 0,
        qualifications: {
          passed: false,
          runway_ok: leastBad.failureStage !== 'runway',
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
    }

    const result: AirportSelectionResult = {
      selectedAirport,
      isAlternate: false,
      preferredAirport: firstRejectedAirport ? {
        code: firstRejectedAirport.code,
        name: firstRejectedAirport.name,
        distance_nm: firstRejectedAirport.distance_nm,
        groundTransportMinutes: firstRejectedAirport.groundTransportMinutes,
        whyRejected: firstRejectedAirport.rejectionReasons
      } : undefined,
      rejectedAirports,
      searchBoundary: {
        maxGroundTimeMinutes,
        airportsTried: rejectedAirports.length,
        airportsWithinBoundary: airportsWithinBoundary
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
