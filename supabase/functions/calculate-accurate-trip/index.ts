import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchAndParseAirNav } from '../_shared/airnav-parser.ts';
import { parseMETAR, getWeatherDelayMinutes } from '../_shared/metar-parser.ts';
import { parseRoute, getFAARoute } from '../_shared/route-parser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      originLocation, 
      destinationLocation,
      departureDateTime,
      passengers = 4
    } = await req.json();

    console.log('Calculating accurate trip...');

    // Get flight ops config
    const { data: config } = await supabase
      .from('flight_ops_config')
      .select('*')
      .single();

    // Step 1: Find qualified airports
    const findAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
      body: { location: originLocation, maxDistance: 50 }
    });

    const originAirports = findAirportsResponse.data?.qualified || [];
    
    const destAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
      body: { location: destinationLocation, maxDistance: 50 }
    });

    const destAirports = destAirportsResponse.data?.qualified || [];

    if (originAirports.length === 0 || destAirports.length === 0) {
      throw new Error('No qualified airports found within range');
    }

    const originAirport = originAirports[0];
    const destAirport = destAirports[0];

    console.log(`Using airports: ${originAirport.code} -> ${destAirport.code}`);

    // Step 2: Try to get FAA preferred route
    let routeString = await getFAARoute(originAirport.code, destAirport.code, supabase);
    let routeDistanceNM = null;
    let routeSource = 'great-circle';

    if (routeString) {
      console.log(`Found FAA preferred route: ${routeString}`);
      try {
        const parsedRoute = await parseRoute(routeString, originAirport, destAirport, supabase);
        routeDistanceNM = parsedRoute.totalDistanceNM;
        routeSource = 'faa-preferred';
      } catch (error) {
        console.warn('Failed to parse route, using great-circle:', error);
        routeString = null;
      }
    }

    // Step 3: Get detailed airport data and weather
    const [originData, destData] = await Promise.all([
      fetchAndParseAirNav(originAirport.code, false),
      fetchAndParseAirNav(destAirport.code, false)
    ]);

    // Step 4: Calculate ground segments with enhanced OSRM and traffic
    const departureTime = new Date(departureDateTime);
    const departureHour = departureTime.getHours();
    const dayOfWeek = departureTime.getDay();
    const isRushHour = (departureHour >= 7 && departureHour <= 9) || (departureHour >= 16 && departureHour <= 19);
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    // Smart traffic multiplier
    let trafficMultiplier = 1.0;
    if (isRushHour && isWeekday) {
      trafficMultiplier = 1.4;
    } else if (departureHour >= 6 && departureHour <= 20) {
      trafficMultiplier = 1.15;
    }
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      trafficMultiplier *= 0.9;
    }

    // Calculate ground distance using enhanced OSRM API
    const groundOriginData = await calculateGroundSegmentEnhanced(
      originLocation,
      { lat: originAirport.lat, lng: originAirport.lng },
      trafficMultiplier
    );

    const groundDestData = await calculateGroundSegmentEnhanced(
      { lat: destAirport.lat, lng: destAirport.lng },
      destinationLocation,
      trafficMultiplier
    );

    // Step 5: Calculate flight segment
    const straightLineDistance = calculateDistance(
      originAirport.lat,
      originAirport.lng,
      destAirport.lat,
      destAirport.lng
    );
    
    // Use route distance if available
    const flightDistance = routeDistanceNM || straightLineDistance;

    // Determine altitude and calculate flight
    let cruiseAltitudeFt: number;
    if (flightDistance < 100) {
      cruiseAltitudeFt = config.altitude_rules.under_100nm.max_ft;
    } else if (flightDistance < 350) {
      cruiseAltitudeFt = config.altitude_rules['100_to_350nm'].max_ft;
    } else {
      cruiseAltitudeFt = config.altitude_rules.over_350nm.max_ft;
    }

    // Calculate headwind from weather
    let headwind = 0;
    let weatherDelay = 0;
    let originMetar = null;
    let destMetar = null;

    if (originData?.metar) {
      originMetar = parseMETAR(originData.metar.raw);
      if (originMetar) {
        weatherDelay += getWeatherDelayMinutes(originMetar);
      }
    }

    if (destData?.metar) {
      destMetar = parseMETAR(destData.metar.raw);
      if (destMetar) {
        weatherDelay += getWeatherDelayMinutes(destMetar);
      }
    }

    // Calculate course
    const course = calculateCourse(
      originAirport.lat,
      originAirport.lng,
      destAirport.lat,
      destAirport.lng
    );

    // Average wind if both available
    if (originMetar && destMetar) {
      const originHeadwind = calculateHeadwindComponent(
        originMetar.wind.direction,
        originMetar.wind.speed,
        course
      );
      const destHeadwind = calculateHeadwindComponent(
        destMetar.wind.direction,
        destMetar.wind.speed,
        course
      );
      headwind = (originHeadwind + destHeadwind) / 2;
    } else if (originMetar) {
      headwind = calculateHeadwindComponent(
        originMetar.wind.direction,
        originMetar.wind.speed,
        course
      );
    }

    // Calculate flight time with altitude-based performance
    const climbTimeMin = cruiseAltitudeFt / config.climb_rate_fpm;
    const descentTimeMin = cruiseAltitudeFt / config.descent_rate_fpm;
    
    // Distance covered during climb/descent
    const climbNM = (config.speed_below_fl100_kias * 0.8 * climbTimeMin) / 60;
    const descentNM = (config.speed_below_fl100_kias * 0.9 * descentTimeMin) / 60;
    
    // Cruise distance (add 5% for routing)
    const cruiseNM = Math.max(0, flightDistance * 1.05 - climbNM - descentNM);
    const cruiseGroundSpeed = config.cruise_speed_ktas - headwind;
    const cruiseTimeMin = (cruiseNM / cruiseGroundSpeed) * 60;

    // Taxi and buffer times
    const taxiTimeMin = config.taxi_time_regional_airport_min * 1.5; // Origin + destination
    const bufferTimeMin = config.takeoff_landing_buffer_min;

    const totalFlightTimeMin = climbTimeMin + cruiseTimeMin + descentTimeMin + taxiTimeMin + bufferTimeMin + weatherDelay;

    // Step 6: Calculate total trip time
    const totalTripTimeMin = groundOriginData.timeMinutes + totalFlightTimeMin + groundDestData.timeMinutes;
    const arrivalTime = new Date(departureTime.getTime() + totalTripTimeMin * 60000);

    // Calculate confidence score
    let confidence = 95;
    if (weatherDelay > 15) confidence -= 10;
    if (headwind > 20) confidence -= 10;
    if (trafficMultiplier > 1.2) confidence -= 5;
    if (!originMetar || !destMetar) confidence -= 10;
    if (routeSource === 'great-circle') confidence -= 5;

    const result = {
      totalTimeMinutes: Math.round(totalTripTimeMin),
      arrivalTime: arrivalTime.toISOString(),
      confidence: Math.max(50, confidence),
      routeSource,
      routeString: routeString || 'Direct',
      segments: [
        {
          type: 'ground',
          name: 'Hospital to Airport',
          timeMinutes: Math.round(groundOriginData.timeMinutes),
          distance_miles: groundOriginData.distanceMiles,
          distance_nm: originAirport.distance_nm,
          polyline: groundOriginData.polyline,
          notes: trafficMultiplier > 1.3 ? 'Heavy traffic expected' : 'Moderate traffic'
        },
        {
          type: 'flight',
          name: 'Flight',
          timeMinutes: Math.round(totalFlightTimeMin),
          distance_nm: flightDistance,
          straightLineDistance_nm: straightLineDistance,
          details: {
            climb: Math.round(climbTimeMin),
            cruise: Math.round(cruiseTimeMin),
            descent: Math.round(descentTimeMin),
            taxi: Math.round(taxiTimeMin),
            buffer: bufferTimeMin,
            weatherDelay: Math.round(weatherDelay)
          },
          altitude: `${Math.round(cruiseAltitudeFt / 100) >= 180 ? 'FL' : ''}${Math.round(cruiseAltitudeFt / 100)}`,
          headwind: Math.round(headwind),
          route: routeString || 'Direct'
        },
        {
          type: 'ground',
          name: 'Airport to Hospital',
          timeMinutes: Math.round(groundDestData.timeMinutes),
          distance_miles: groundDestData.distanceMiles,
          distance_nm: destAirport.distance_nm,
          polyline: groundDestData.polyline,
          notes: 'Normal traffic'
        }
      ],
      airports: {
        origin: {
          code: originAirport.code,
          name: originAirport.name,
          elevation_ft: originAirport.elevation_ft,
          runway: originAirport.best_runway
        },
        destination: {
          code: destAirport.code,
          name: destAirport.name,
          elevation_ft: destAirport.elevation_ft,
          runway: destAirport.best_runway
        }
      },
      weather: {
        origin: originMetar ? {
          category: originMetar.flightCategory,
          wind: `${originMetar.wind.direction}° at ${originMetar.wind.speed}kts`,
          visibility: `${originMetar.visibility}SM`,
          ceiling: originMetar.ceiling ? `${originMetar.ceiling}ft` : 'Clear'
        } : null,
        destination: destMetar ? {
          category: destMetar.flightCategory,
          wind: `${destMetar.wind.direction}° at ${destMetar.wind.speed}kts`,
          visibility: `${destMetar.visibility}SM`,
          ceiling: destMetar.ceiling ? `${destMetar.ceiling}ft` : 'Clear'
        } : null
      },
      advisories: generateAdvisories(originMetar, destMetar, headwind, weatherDelay, trafficMultiplier)
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Enhanced ground segment calculation with OSRM
async function calculateGroundSegmentEnhanced(
  origin: any,
  dest: any,
  trafficMultiplier: number
): Promise<{ timeMinutes: number; distanceMiles: number; polyline?: string }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=polyline`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('OSRM API failed');
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }
    
    const route = data.routes[0];
    const distanceMiles = route.distance / 1609.344;
    const baseTimeMinutes = route.duration / 60;
    const timeMinutes = baseTimeMinutes * trafficMultiplier;
    
    return {
      timeMinutes,
      distanceMiles,
      polyline: route.geometry
    };
  } catch (error) {
    console.warn('OSRM failed, using heuristic:', error);
    const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
    const distanceMiles = distance * 1.15078;
    const roadMiles = distanceMiles * 1.3;
    const baseTimeMinutes = (roadMiles / 50) * 60;
    return {
      timeMinutes: baseTimeMinutes * trafficMultiplier,
      distanceMiles: roadMiles
    };
  }
}

async function calculateGroundSegment(origin: any, dest: any, trafficMultiplier: number): Promise<number> {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`;
  const response = await fetch(osrmUrl);
  const data = await response.json();
  
  if (data.routes && data.routes[0]) {
    const baseTimeMin = data.routes[0].duration / 60;
    return baseTimeMin * trafficMultiplier;
  }
  
  return 30; // Fallback
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateCourse(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const course = Math.atan2(y, x) * 180 / Math.PI;
  return (course + 360) % 360;
}

function calculateHeadwindComponent(direction: number | 'VRB', speed: number, course: number): number {
  if (direction === 'VRB' || speed === 0) return 0;
  let angleDiff = Math.abs(direction - course);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  return Math.round(speed * Math.cos((angleDiff * Math.PI) / 180));
}

function generateAdvisories(originMetar: any, destMetar: any, headwind: number, weatherDelay: number, trafficMultiplier: number): string[] {
  const advisories: string[] = [];
  
  if (headwind > 20) advisories.push(`⚠️ Strong headwinds (${Math.round(headwind)}kts) will increase flight time`);
  if (weatherDelay > 20) advisories.push('⚠️ Significant weather delays expected');
  if (trafficMultiplier > 1.2) advisories.push('🚗 Heavy traffic expected during ground transport');
  if (originMetar && originMetar.flightCategory !== 'VFR') advisories.push(`☁️ Origin weather: ${originMetar.flightCategory}`);
  if (destMetar && destMetar.flightCategory !== 'VFR') advisories.push(`☁️ Destination weather: ${destMetar.flightCategory}`);
  if (!originMetar || !destMetar) advisories.push('ℹ️ Weather data incomplete - estimates may vary');
  
  return advisories;
}
