import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchAndParseAirNav } from '../_shared/airnav-parser.ts';
import { parseMETAR } from '../_shared/metar-parser.ts';

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
}

// Extract wind from METAR/TAF string
function extractWind(weatherData: string): WindData | null {
  const match = weatherData.match(/(\d{3})(\d{2,3})(G(\d{2,3}))?KT/);
  if (!match) return null;
  
  return {
    direction: parseInt(match[1]),
    speed: parseInt(match[2]),
    gust: match[4] ? parseInt(match[4]) : undefined
  };
}

// Calculate crosswind component
function calculateCrosswind(windSpeed: number, windDir: number, runwayHeading: number): number {
  const angleDiff = Math.abs(windDir - runwayHeading);
  const angleRad = (angleDiff * Math.PI) / 180;
  return Math.abs(Math.round(windSpeed * Math.sin(angleRad)));
}

// Calculate headwind component (negative = tailwind)
function calculateHeadwind(windSpeed: number, windDir: number, runwayHeading: number): number {
  const angleDiff = Math.abs(windDir - runwayHeading);
  const angleRad = (angleDiff * Math.PI) / 180;
  return Math.round(windSpeed * Math.cos(angleRad));
}

// Get runway heading from runway name (e.g., "14" -> 140, "01L" -> 10)
function getRunwayHeading(runwayName: string): number {
  const digits = runwayName.match(/\d+/)?.[0];
  if (!digits) return 0;
  return parseInt(digits) * 10;
}

// Find best runway considering crosswind
function analyzeBestRunway(wind: WindData, runways: any[]): RunwayWindAnalysis | null {
  if (runways.length === 0) return null;
  
  const windSpeed = wind.gust || wind.speed; // Use gust if present
  
  let bestAnalysis: RunwayWindAnalysis | null = null;
  let lowestCrosswind = Infinity;
  
  for (const runway of runways) {
    const heading = getRunwayHeading(runway.name);
    const crosswind = calculateCrosswind(windSpeed, wind.direction, heading);
    const headwind = calculateHeadwind(windSpeed, wind.direction, heading);
    
    const analysis: RunwayWindAnalysis = {
      runway: runway.name,
      crosswind,
      headwind,
      totalWind: windSpeed
    };
    
    if (crosswind < lowestCrosswind) {
      lowestCrosswind = crosswind;
      bestAnalysis = analysis;
    }
  }
  
  return bestAnalysis;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { location, maxDistance = 50, requireDaylight = false } = await req.json();

    console.log(`Finding qualified airports near ${location.lat}, ${location.lng}`);

    // Get flight ops config
    const { data: configData, error: configError } = await supabase
      .from('flight_ops_config')
      .select('*')
      .single();

    if (configError) {
      console.error('Config error:', configError);
      throw new Error('Failed to load flight ops configuration');
    }

    const config = configData;

    // Import static airport coordinates
    const AIRPORT_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
      // Major airports (sample - you'll need the full list)
      'KJFK': { lat: 40.6398, lng: -73.7789, name: 'John F Kennedy Intl' },
      'KFRG': { lat: 40.7288, lng: -73.4134, name: 'Republic Airport' }, // Preferred over KLGA
      'KEWR': { lat: 40.6925, lng: -74.1687, name: 'Newark Liberty Intl' },
      'KTEB': { lat: 40.8501, lng: -74.0608, name: 'Teterboro' },
      'KBOS': { lat: 42.3656, lng: -71.0096, name: 'Boston Logan Intl' },
      'KPHL': { lat: 39.8719, lng: -75.2411, name: 'Philadelphia Intl' },
      'KBWI': { lat: 39.1754, lng: -76.6683, name: 'Baltimore Washington Intl' },
      'KDCA': { lat: 38.8521, lng: -77.0377, name: 'Ronald Reagan Washington' },
      'KIAD': { lat: 38.9445, lng: -77.4558, name: 'Washington Dulles Intl' },
      'KRDU': { lat: 35.8776, lng: -78.7875, name: 'Raleigh-Durham Intl' },
      'KHKY': { lat: 35.7411, lng: -81.3895, name: 'Hickory Regional' },
      'KCLT': { lat: 35.2140, lng: -80.9431, name: 'Charlotte Douglas Intl' },
      'KATL': { lat: 33.6407, lng: -84.4277, name: 'Hartsfield-Jackson Atlanta' },
      'KMCO': { lat: 28.4294, lng: -81.3089, name: 'Orlando Intl' },
      'KMIA': { lat: 25.7959, lng: -80.2870, name: 'Miami Intl' },
      'KFLL': { lat: 26.0726, lng: -80.1528, name: 'Fort Lauderdale Intl' },
      'KTPA': { lat: 27.9755, lng: -82.5332, name: 'Tampa Intl' },
    };

    // Find nearby airports
    const nearbyAirports: Array<{ code: string; name: string; lat: number; lng: number; distance_nm: number }> = [];

    for (const [code, airport] of Object.entries(AIRPORT_COORDS)) {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        airport.lat,
        airport.lng
      );

      if (distance <= maxDistance) {
        nearbyAirports.push({
          code,
          name: airport.name,
          lat: airport.lat,
          lng: airport.lng,
          distance_nm: distance
        });
      }
    }

    // Sort by distance
    nearbyAirports.sort((a, b) => a.distance_nm - b.distance_nm);

    console.log(`Found ${nearbyAirports.length} airports within ${maxDistance}nm`);

    // Qualify each airport
    const qualifiedAirports: QualifiedAirport[] = [];
    const rejectedAirports: QualifiedAirport[] = [];

    for (const airport of nearbyAirports.slice(0, 10)) { // Check top 10 closest
      console.log(`Qualifying airport ${airport.code}...`);

      const airnavData = await fetchAndParseAirNav(airport.code, false);
      
      if (!airnavData) {
        console.log(`No AirNav data for ${airport.code}`);
        continue;
      }

      const qualifications = {
        passed: true,
        runway_ok: false,
        surface_ok: false,
        lighting_ok: false,
        weather_ok: true,
        approach_ok: true,
        wind_ok: true
      };

      const warnings: string[] = [];

      // Check runways
      const acceptableSurfaces = config.acceptable_surfaces || ['ASPH', 'CONC'];
      const qualifyingRunways = airnavData.runways.filter(runway => 
        runway.length_ft >= config.min_runway_length_ft &&
        runway.width_ft >= config.min_runway_width_ft &&
        (!config.requires_paved_surface || acceptableSurfaces.includes(runway.surface)) &&
        (!requireDaylight || !config.requires_lighting || runway.lighted)
      );

      if (qualifyingRunways.length > 0) {
        qualifications.runway_ok = true;
        qualifications.surface_ok = true;
        qualifications.lighting_ok = true;
      } else {
        qualifications.passed = false;
        if (airnavData.runways.length === 0) {
          warnings.push('No runway data available');
        } else {
          const longestRunway = airnavData.runways.reduce((max, rw) => 
            rw.length_ft > max.length_ft ? rw : max
          );
          if (longestRunway.length_ft < config.min_runway_length_ft) {
            warnings.push(`Longest runway ${longestRunway.length_ft}ft < ${config.min_runway_length_ft}ft required`);
          }
          if (longestRunway.width_ft < config.min_runway_width_ft) {
            warnings.push(`Runway width ${longestRunway.width_ft}ft < ${config.min_runway_width_ft}ft required`);
          }
          if (config.requires_paved_surface && !acceptableSurfaces.includes(longestRunway.surface)) {
            warnings.push(`Surface ${longestRunway.surface} not acceptable`);
          }
          if (requireDaylight && config.requires_lighting && !longestRunway.lighted) {
            warnings.push('Runway lighting required for night operations');
          }
        }
      }

      // Use TAF for forecast weather (preferred for arrivals), fallback to METAR
      const weatherData = airnavData.taf || airnavData.metar;
      let windAnalysis: RunwayWindAnalysis | null = null;

      if (weatherData) {
        const weatherParsed = parseMETAR(weatherData.raw);
        if (weatherParsed) {
          // Check IFR conditions
          if (weatherParsed.flightCategory === 'IFR' || weatherParsed.flightCategory === 'LIFR') {
            // Check IFR requirements
            if (config.ifr_requires_instrument_approach) {
              const hasApproach = airnavData.has_ils || airnavData.has_rnav;
              if (!hasApproach) {
                qualifications.approach_ok = false;
                qualifications.passed = false;
                warnings.push('IFR conditions but no instrument approach available');
              }
            }

            if (weatherParsed.ceiling !== null && weatherParsed.ceiling < config.minimum_ceiling_ft) {
              qualifications.weather_ok = false;
              qualifications.passed = false;
              warnings.push(`Ceiling ${weatherParsed.ceiling}ft below minimum ${config.minimum_ceiling_ft}ft`);
            }

            if (weatherParsed.visibility < config.minimum_visibility_sm) {
              qualifications.weather_ok = false;
              qualifications.passed = false;
              warnings.push(`Visibility ${weatherParsed.visibility}SM below minimum ${config.minimum_visibility_sm}SM`);
            }
          }
        }

        // Check wind limits if we have qualifying runways
        if (qualifyingRunways.length > 0) {
          const windData = extractWind(weatherData.raw);
          if (windData) {
            windAnalysis = analyzeBestRunway(windData, qualifyingRunways);
            
            if (windAnalysis) {
              // Check total wind limit
              if (windAnalysis.totalWind > config.max_wind_kt) {
                qualifications.wind_ok = false;
                qualifications.passed = false;
                warnings.push(`Wind ${windAnalysis.totalWind}kt exceeds limit of ${config.max_wind_kt}kt (best runway: ${windAnalysis.runway})`);
              }
              
              // Check crosswind limit
              if (windAnalysis.crosswind > config.max_crosswind_kt) {
                qualifications.wind_ok = false;
                qualifications.passed = false;
                warnings.push(`Crosswind ${windAnalysis.crosswind}kt exceeds limit of ${config.max_crosswind_kt}kt on runway ${windAnalysis.runway}`);
              }
            }
          }
        }
      }

      const qualifiedAirport: QualifiedAirport = {
        code: airport.code,
        name: airnavData.name || airport.name,
        lat: airnavData.lat || airport.lat,
        lng: airnavData.lng || airport.lng,
        distance_nm: airport.distance_nm,
        elevation_ft: airnavData.elevation_ft || 0,
        qualifications,
        warnings,
        best_runway: qualifyingRunways.length > 0 ? qualifyingRunways[0] : undefined,
        windAnalysis: windAnalysis ? {
          runway: windAnalysis.runway,
          crosswind: windAnalysis.crosswind,
          headwind: windAnalysis.headwind,
          totalWind: windAnalysis.totalWind
        } : undefined
      };

      if (qualifications.passed) {
        qualifiedAirports.push(qualifiedAirport);
      } else {
        rejectedAirports.push(qualifiedAirport);
      }
    }

    console.log(`Qualified: ${qualifiedAirports.length}, Rejected: ${rejectedAirports.length}`);

    return new Response(
      JSON.stringify({
        qualified: qualifiedAirports,
        rejected: rejectedAirports,
        config_used: {
          min_runway_length_ft: config.min_runway_length_ft,
          min_runway_width_ft: config.min_runway_width_ft,
          requires_paved_surface: config.requires_paved_surface
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
