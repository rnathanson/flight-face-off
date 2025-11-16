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

interface AirportSelectionResult {
  selectedAirport: QualifiedAirport | null;
  isAlternate: boolean;
  closestRejected?: {
    code: string;
    name: string;
    distance_nm: number;
    rejectionReasons: string[];
    details: RejectionDetail;
  };
  airports: QualifiedAirport[];
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
      maxDistance = 100,
      departureTimeUTC,
      estimatedArrivalTimeUTC,
      requiresJetFuel = false 
    } = await req.json();

    const requireDaylight = false;

    const arrivalTime = estimatedArrivalTimeUTC 
      ? new Date(estimatedArrivalTimeUTC) 
      : new Date(Date.now() + 60 * 60000);

    console.log(`🕐 Using arrival time (UTC): ${arrivalTime.toISOString()}`);
    console.log(`Finding qualified airports near ${location.lat}, ${location.lng}`);

    const { data: configData, error: configError } = await supabase
      .from('flight_ops_config')
      .select('*')
      .single();

    if (configError) throw new Error('Failed to load flight ops configuration');

    const config = configData;

    console.log(`🔍 Searching AirNav for airports within ${maxDistance}nm`);
    
    const nearbyAirports = await searchNearbyAirports(location.lat, location.lng, maxDistance);

    console.log(`✓ Found ${nearbyAirports.length} airports via AirNav search`);

    // PHASE 1: Check Runway Dimensions Only (Progressive Search)
    console.log('\n🛫 PHASE 1: Checking runway dimensions (closest 5 first)...');
    
    interface RunwayQualifiedAirport {
      code: string;
      name: string;
      lat: number;
      lng: number;
      distance_nm: number;
      elevation_ft: number;
      airnavData: any;
      qualifyingRunways: any[];
      warnings: string[];
    }
    
    const runwayQualifiedAirports: RunwayQualifiedAirport[] = [];
    const acceptableSurfaces = config.acceptable_surfaces || ['ASPH', 'CONC'];

    // Helper to check a batch of airports in parallel
    const checkAirportBatch = async (airports: typeof nearbyAirports, batchNum: number) => {
      console.log(`\n🔄 Batch ${batchNum}: Checking ${airports.length} airports in parallel...`);
      
      const results = await Promise.allSettled(
        airports.map(async (airport) => {
          try {
            const airnavData = await fetchAndParseAirNav(airport.code, false, supabase);
            
            if (!airnavData) {
              console.log(`❌ ${airport.code}: No AirNav data`);
              return null;
            }

            if (requiresJetFuel && !airnavData.has_jet_fuel) {
              console.log(`❌ ${airport.code}: No Jet A fuel`);
              return null;
            }

            const qualifyingRunways = airnavData.runways.filter(runway => 
              runway.length_ft >= config.min_runway_length_ft &&
              runway.width_ft >= config.min_runway_width_ft &&
              (!config.requires_paved_surface || acceptableSurfaces.includes(runway.surface)) &&
              (!requireDaylight || !config.requires_lighting || runway.lighted)
            );

            if (qualifyingRunways.length > 0) {
              console.log(`✅ ${airport.code}: Passes runway checks (${qualifyingRunways.length} qualifying runways)`);
              return {
                code: airport.code,
                name: airnavData.name || airport.name || airport.code,
                lat: airnavData.lat || 0,
                lng: airnavData.lng || 0,
                distance_nm: airport.distance_nm,
                elevation_ft: airnavData.elevation_ft || 0,
                airnavData,
                qualifyingRunways,
                warnings: [] as string[]
              };
            } else {
              console.log(`❌ ${airport.code}: Fails runway checks`);
              return null;
            }
          } catch (error) {
            console.error(`Error checking ${airport.code}:`, error);
            return null;
          }
        })
      );

      // Collect successful results
      const qualified = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => (r as PromiseFulfilledResult<RunwayQualifiedAirport | null>).value!)
        .filter(Boolean);

      return qualified;
    };

    // Check closest 5 airports first
    const firstBatch = nearbyAirports.slice(0, 5);
    const firstBatchResults = await checkAirportBatch(firstBatch, 1);
    runwayQualifiedAirports.push(...firstBatchResults);

    // Early exit if we found airports close enough
    if (runwayQualifiedAirports.length > 0 && runwayQualifiedAirports[0].distance_nm <= 10) {
      console.log(`⚡ Early exit: Found perfect match within 10nm (${runwayQualifiedAirports[0].code})`);
    } else if (nearbyAirports.length > 5 && runwayQualifiedAirports.length < 3) {
      // Only check more if we have fewer than 3 options
      console.log(`📍 Expanding search to next 5 airports...`);
      const secondBatch = nearbyAirports.slice(5, 10);
      const secondBatchResults = await checkAirportBatch(secondBatch, 2);
      runwayQualifiedAirports.push(...secondBatchResults);
    }

    console.log(`\n✅ PHASE 1: ${runwayQualifiedAirports.length} airports pass runway checks`);
    
    const closestRunwayQualified = runwayQualifiedAirports[0] || null;
    if (closestRunwayQualified) {
      console.log(`📍 Closest runway-qualified: ${closestRunwayQualified.code} (${closestRunwayQualified.distance_nm.toFixed(1)}nm)`);
    }

    // PHASE 2: Check Weather, Wind, Approaches
    console.log('\n☁️ PHASE 2: Checking weather, wind, approaches...');
    
    const qualifiedAirports: QualifiedAirport[] = [];
    let closestRejectedInfo: {
      code: string;
      name: string;
      distance_nm: number;
      rejectionReasons: string[];
      details: RejectionDetail;
    } | undefined;

    for (const airport of runwayQualifiedAirports) {
      console.log(`\n📍 Qualifying ${airport.code} (${airport.distance_nm.toFixed(1)}nm)...`);

      const qualifications = {
        passed: true,
        runway_ok: true,
        surface_ok: true,
        lighting_ok: true,
        weather_ok: true,
        approach_ok: true,
        wind_ok: true
      };

      const warnings: string[] = [...airport.warnings];
      let windAnalysis: RunwayWindAnalysis | null = null;

      console.log(`🔍 Fetching weather...`);
      const tafData = await fetchTAFWithFallback(airport.code);
      
      if (!tafData) {
        console.log(`❌ No weather data`);
        qualifications.weather_ok = false;
        qualifications.passed = false;
        warnings.push('No weather data');
        
        if (!closestRejectedInfo && airport.code === closestRunwayQualified?.code) {
          closestRejectedInfo = {
            code: airport.code,
            name: airport.name,
            distance_nm: airport.distance_nm,
            rejectionReasons: ['No weather data available'],
            details: {}
          };
        }
        continue;
      }

      const tafPeriods = parseTAFPeriods(tafData.raw);
      
      if (tafPeriods.length === 0) {
        console.log(`❌ TAF parsing failed`);
        qualifications.weather_ok = false;
        qualifications.passed = false;
        warnings.push('TAF parsing failed');
        
        if (!closestRejectedInfo && airport.code === closestRunwayQualified?.code) {
          closestRejectedInfo = {
            code: airport.code,
            name: airport.name,
            distance_nm: airport.distance_nm,
            rejectionReasons: ['TAF parsing failed'],
            details: {}
          };
        }
        continue;
      }

      const relevantPeriod = findRelevantTafPeriod(tafPeriods, arrivalTime);
      
      if (!relevantPeriod) {
        console.log(`❌ No TAF for arrival time`);
        qualifications.weather_ok = false;
        qualifications.passed = false;
        warnings.push('No TAF for arrival time');
        
        if (!closestRejectedInfo && airport.code === closestRunwayQualified?.code) {
          closestRejectedInfo = {
            code: airport.code,
            name: airport.name,
            distance_nm: airport.distance_nm,
            rejectionReasons: ['No TAF forecast for arrival time'],
            details: {}
          };
        }
        continue;
      }

      const rejectionReasons: string[] = [];
      const rejectionDetails: RejectionDetail = {};

      // Check ceiling
      if (relevantPeriod.ceiling !== null && relevantPeriod.ceiling !== undefined && relevantPeriod.ceiling < config.minimum_ceiling_ft) {
        qualifications.weather_ok = false;
        qualifications.passed = false;
        const reason = `Ceiling ${relevantPeriod.ceiling}ft < ${config.minimum_ceiling_ft}ft minimum`;
        warnings.push(reason);
        rejectionReasons.push(reason);
        rejectionDetails.ceiling_ft = relevantPeriod.ceiling;
        console.log(`❌ ${reason}`);
      }

      // Check visibility
      const visibilitySM = parseFloat(relevantPeriod.visibility || '10');
      if (visibilitySM < config.minimum_visibility_sm) {
        qualifications.weather_ok = false;
        qualifications.passed = false;
        const reason = `Visibility ${visibilitySM}SM < ${config.minimum_visibility_sm}SM minimum`;
        warnings.push(reason);
        rejectionReasons.push(reason);
        rejectionDetails.visibility_sm = visibilitySM;
        console.log(`❌ ${reason}`);
      }

      // Check approaches if IFR
      if (relevantPeriod.flightCategory === 'IFR' || relevantPeriod.flightCategory === 'LIFR') {
        if (config.ifr_requires_instrument_approach && !airport.airnavData.has_instrument_approach) {
          qualifications.approach_ok = false;
          qualifications.passed = false;
          const reason = `IFR requires instrument approach (${relevantPeriod.flightCategory})`;
          warnings.push(reason);
          rejectionReasons.push(reason);
          console.log(`❌ ${reason}`);
        }
      }

      // Check wind
      if (airport.qualifyingRunways.length > 0 && relevantPeriod.wind) {
        const windData = {
          direction: relevantPeriod.wind.direction === 'VRB' ? -1 : relevantPeriod.wind.direction,
          speed: relevantPeriod.wind.speed,
          gust: relevantPeriod.wind.gust
        };

        windAnalysis = analyzeBestRunway(windData, airport.qualifyingRunways);
        
        if (windAnalysis) {
          console.log(`📊 Best runway ${windAnalysis.runway}: ${windAnalysis.totalWind}kt total, ${windAnalysis.crosswind}kt crosswind`);

          if (windAnalysis.totalWind > config.max_wind_kt) {
            qualifications.wind_ok = false;
            qualifications.passed = false;
            const reason = `Wind ${windAnalysis.totalWind}kt > ${config.max_wind_kt}kt limit`;
            warnings.push(reason);
            rejectionReasons.push(reason);
            rejectionDetails.wind_kt = windAnalysis.totalWind;
            rejectionDetails.runway = windAnalysis.runway;
            console.log(`❌ ${reason}`);
          }
          
          if (windAnalysis.crosswind > config.max_crosswind_kt) {
            qualifications.wind_ok = false;
            qualifications.passed = false;
            const reason = `Crosswind ${windAnalysis.crosswind}kt > ${config.max_crosswind_kt}kt limit on ${windAnalysis.runway}`;
            warnings.push(reason);
            rejectionReasons.push(reason);
            rejectionDetails.crosswind_kt = windAnalysis.crosswind;
            rejectionDetails.runway = windAnalysis.runway;
            console.log(`❌ ${reason}`);
          }

          if (qualifications.wind_ok) {
            console.log(`✅ Wind within limits`);
          }
        }
      }

      // Track closest rejected
      if (!qualifications.passed && !closestRejectedInfo && airport.code === closestRunwayQualified?.code) {
        closestRejectedInfo = {
          code: airport.code,
          name: airport.name,
          distance_nm: airport.distance_nm,
          rejectionReasons,
          details: rejectionDetails
        };
      }

      const violatedGuidelines: string[] = [];
      if (!qualifications.runway_ok) violatedGuidelines.push('runway');
      if (!qualifications.surface_ok) violatedGuidelines.push('surface');
      if (!qualifications.lighting_ok) violatedGuidelines.push('lighting');
      if (!qualifications.weather_ok) violatedGuidelines.push('weather');
      if (!qualifications.approach_ok) violatedGuidelines.push('approach');
      if (!qualifications.wind_ok) violatedGuidelines.push('wind');

      const qualifiedAirport: QualifiedAirport = {
        code: airport.code,
        name: airport.name,
        lat: airport.lat,
        lng: airport.lng,
        distance_nm: airport.distance_nm,
        elevation_ft: airport.elevation_ft,
        qualifications,
        warnings,
        best_runway: airport.qualifyingRunways[0],
        windAnalysis: windAnalysis ? {
          runway: windAnalysis.runway,
          crosswind: windAnalysis.crosswind,
          headwind: windAnalysis.headwind,
          totalWind: windAnalysis.totalWind
        } : undefined,
        requiresChiefPilotApproval: !qualifications.passed,
        violatedGuidelines
      };

      qualifiedAirports.push(qualifiedAirport);

      if (qualifications.passed) {
        console.log(`✅ ${airport.code} FULLY QUALIFIED`);
      } else {
        console.log(`⚠️ ${airport.code} requires approval: ${violatedGuidelines.join(', ')}`);
      }
    }

    qualifiedAirports.sort((a, b) => a.distance_nm - b.distance_nm);

    const selectedAirport = qualifiedAirports.find(a => a.qualifications.passed) || null;
    const isAlternate = selectedAirport && closestRunwayQualified 
      ? selectedAirport.code !== closestRunwayQualified.code 
      : false;

    console.log(`\n✅ PHASE 2: ${qualifiedAirports.filter(a => a.qualifications.passed).length} fully qualified`);
    
    if (selectedAirport) {
      console.log(`🎯 Selected: ${selectedAirport.code} (${selectedAirport.distance_nm.toFixed(1)}nm)${isAlternate ? ' [ALTERNATE]' : ''}`);
      if (isAlternate && closestRejectedInfo) {
        console.log(`ℹ️ Closest rejected: ${closestRejectedInfo.code} - ${closestRejectedInfo.rejectionReasons.join(', ')}`);
      }
    }

    const result: AirportSelectionResult = {
      selectedAirport,
      isAlternate,
      closestRejected: closestRejectedInfo,
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
