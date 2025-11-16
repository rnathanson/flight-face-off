import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchAndParseAirNav } from '../_shared/airnav-parser.ts';
import { parseMETAR, getWeatherDelayMinutes } from '../_shared/metar-parser.ts';
import { parseRoute, getFAARoute } from '../_shared/route-parser.ts';
import { fetchWindsAloft, fetchAverageWindsAlongRoute } from '../_shared/winds-aloft-fetcher.ts';

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
      pickupLocation,
      deliveryLocation,
      departureDateTime,
      passengers = 4,
      preferredPickupAirport,
      preferredDestinationAirport
    } = await req.json();

    console.log('Calculating 5-leg trip from KFRG home base...');
    console.log('Route: KFRG → Pickup Airport (flight) → Pickup Hospital (ground) → Pickup Airport (ground) → Destination Airport (flight) → Delivery Hospital (ground)');

    // KFRG home base
    const KFRG = {
      code: 'KFRG',
      name: 'Republic Airport',
      lat: 40.7289,
      lng: -73.4134,
      elevation_ft: 82,
      best_runway: '14/32'
    };

    // Get flight ops config
    const { data: config, error: configError } = await supabase
      .from('flight_ops_config')
      .select('*')
      .single();

    if (configError || !config) {
      console.error('Failed to load flight ops config:', configError);
      throw new Error('Flight operations configuration not found');
    }

    console.log(`Using config: cruise=${config.cruise_speed_ktas}kts, climb=${config.climb_rate_fpm}fpm, descent=${config.descent_rate_fpm}fpm`);

    // Calculate distances from KFRG (50nm threshold for Long Island)
    console.log('Pickup Location:', { lat: pickupLocation.lat, lng: pickupLocation.lng, display: pickupLocation.displayName });
    console.log('Delivery Location:', { lat: deliveryLocation.lat, lng: deliveryLocation.lng, display: deliveryLocation.displayName });
    
    const pickupDistanceFromKFRG = calculateDistance(KFRG.lat, KFRG.lng, pickupLocation.lat, pickupLocation.lng);
    const deliveryDistanceFromKFRG = calculateDistance(KFRG.lat, KFRG.lng, deliveryLocation.lat, deliveryLocation.lng);
    
    const isPickupOnLongIsland = pickupDistanceFromKFRG <= 50;
    const isDeliveryOnLongIsland = deliveryDistanceFromKFRG <= 50;

    console.log(`Pickup ${isPickupOnLongIsland ? 'IS' : 'IS NOT'} on Long Island (${pickupDistanceFromKFRG.toFixed(1)}nm from KFRG)`);
    console.log(`Delivery ${isDeliveryOnLongIsland ? 'IS' : 'IS NOT'} on Long Island (${deliveryDistanceFromKFRG.toFixed(1)}nm from KFRG)`);

    // Determine pickup and destination airports
    let pickupAirport = KFRG;
    let destinationAirport = KFRG;

    // Check if user specified a preferred pickup airport
    if (preferredPickupAirport) {
      console.log(`User specified preferred pickup airport: ${preferredPickupAirport}`);
      const { data: airportData } = await supabase
        .from('airports')
        .select('*')
        .eq('icao_code', preferredPickupAirport.toUpperCase())
        .single();
      
      if (airportData) {
        pickupAirport = {
          code: airportData.icao_code,
          name: airportData.name,
          lat: airportData.lat,
          lng: airportData.lng,
          elevation_ft: airportData.elevation_ft,
          best_runway: 'N/A'
        };
        console.log(`Using preferred pickup airport: ${pickupAirport.code} (${pickupAirport.name})`);
      } else {
        console.log(`Preferred pickup airport ${preferredPickupAirport} not found in database, using automatic selection`);
      }
    }

    // If no preferred airport or not found, use automatic selection
    if (!preferredPickupAirport || pickupAirport.code === KFRG.code) {
      // If pickup is NOT on Long Island, find nearest qualified airport
      if (!isPickupOnLongIsland) {
        const pickupAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
          body: { location: pickupLocation, maxDistance: 50 }
        });
        const pickupAirports = pickupAirportsResponse.data?.qualified || [];
        if (pickupAirports.length > 0) {
          pickupAirport = pickupAirports[0];
        }
      }
    }

    // Check if user specified a preferred destination airport
    if (preferredDestinationAirport) {
      console.log(`User specified preferred destination airport: ${preferredDestinationAirport}`);
      const { data: airportData } = await supabase
        .from('airports')
        .select('*')
        .eq('icao_code', preferredDestinationAirport.toUpperCase())
        .single();
      
      if (airportData) {
        destinationAirport = {
          code: airportData.icao_code,
          name: airportData.name,
          lat: airportData.lat,
          lng: airportData.lng,
          elevation_ft: airportData.elevation_ft,
          best_runway: 'N/A'
        };
        console.log(`Using preferred destination airport: ${destinationAirport.code} (${destinationAirport.name})`);
      } else {
        console.log(`Preferred destination airport ${preferredDestinationAirport} not found in database, using automatic selection`);
      }
    }

    // If no preferred airport or not found, use automatic selection
    if (!preferredDestinationAirport || destinationAirport.code === KFRG.code) {
      // If delivery is NOT on Long Island, find nearest qualified airport  
      // BUT if delivery IS on Long Island, destination airport should ALWAYS be KFRG
      if (!isDeliveryOnLongIsland) {
        const deliveryAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
          body: { location: deliveryLocation, maxDistance: 50 }
        });
        const deliveryAirports = deliveryAirportsResponse.data?.qualified || [];
        if (deliveryAirports.length > 0) {
          destinationAirport = deliveryAirports[0];
        }
      } else {
        // Delivery IS on Long Island, so destination airport is KFRG
        destinationAirport = KFRG;
      }
    }

    console.log(`Selected Airports - Pickup: ${pickupAirport.code} (${pickupAirport.name}), Destination: ${destinationAirport.code} (${destinationAirport.name})`);
    console.log(`Flight Route: KFRG → ${pickupAirport.code} → ${destinationAirport.code}`);

    // Traffic calculation
    const departureTime = new Date(departureDateTime);
    const departureHour = departureTime.getHours();
    const dayOfWeek = departureTime.getDay();
    const isRushHour = (departureHour >= 7 && departureHour <= 9) || (departureHour >= 16 && departureHour <= 19);
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    let trafficMultiplier = 1.0;
    if (isRushHour && isWeekday) {
      trafficMultiplier = 1.4;
    } else if (departureHour >= 6 && departureHour <= 20) {
      trafficMultiplier = 1.15;
    }
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      trafficMultiplier *= 0.9;
    }

    // === LEG 1: KFRG to Pickup Airport (FLIGHT) ===
    let leg1RouteString = await getFAARoute(KFRG.code, pickupAirport.code, supabase);
    let leg1RouteDistance = null;
    let leg1RouteWaypoints = null;
    let leg1RouteSource = 'great-circle';

    if (leg1RouteString && pickupAirport.code !== KFRG.code) {
      console.log(`Leg 1 FAA route: ${leg1RouteString}`);
      try {
        const parsedRoute = await parseRoute(leg1RouteString, KFRG, pickupAirport, supabase);
        leg1RouteDistance = parsedRoute.totalDistanceNM;
        leg1RouteWaypoints = parsedRoute.waypoints;
        leg1RouteSource = 'faa-preferred';
        console.log(`Leg 1 parsed ${parsedRoute.waypoints.length} waypoints, distance: ${leg1RouteDistance.toFixed(1)}nm`);
      } catch (error) {
        console.warn('Failed to parse leg 1 route:', error);
      }
    }

    const leg1FlightDistance = pickupAirport.code === KFRG.code ? 0 : (leg1RouteDistance || calculateDistance(
      KFRG.lat,
      KFRG.lng,
      pickupAirport.lat,
      pickupAirport.lng
    ));

    // Get airport weather data
    const [kfrgData, pickupAirportData, destinationAirportData] = await Promise.all([
      fetchAndParseAirNav(KFRG.code, false),
      pickupAirport.code !== KFRG.code ? fetchAndParseAirNav(pickupAirport.code, false) : Promise.resolve(null),
      destinationAirport.code !== KFRG.code && destinationAirport.code !== pickupAirport.code ? fetchAndParseAirNav(destinationAirport.code, false) : Promise.resolve(null)
    ]);

    // Leg 1 is outbound - use current METAR for both airports
    const leg1FlightResult = pickupAirport.code === KFRG.code 
      ? { minutes: 0, weatherDelay: 0, headwind: 0, cruiseAltitude: 0, cruiseWinds: null }
      : await calculateFlightTime(
          leg1FlightDistance,
          config,
          kfrgData,
          pickupAirportData || kfrgData,
          KFRG,
          pickupAirport,
          false, // Use METAR for arrival
          pickupAirport.code,
          leg1RouteWaypoints || undefined
        );

    // === LEG 2: Pickup Airport to Pickup Hospital (GROUND) ===
    const leg2Data = await calculateGroundSegmentEnhanced(
      { lat: pickupAirport.lat, lng: pickupAirport.lng },
      pickupLocation,
      trafficMultiplier,
      supabase,
      departureTime
    );

    // === LEG 3: Pickup Hospital back to Pickup Airport (GROUND) ===
    const leg3Data = await calculateGroundSegmentEnhanced(
      pickupLocation,
      { lat: pickupAirport.lat, lng: pickupAirport.lng },
      trafficMultiplier,
      supabase,
      departureTime
    );

    // === LEG 4: Pickup Airport to Destination Airport (FLIGHT) ===
    let leg4RouteString = await getFAARoute(pickupAirport.code, destinationAirport.code, supabase);
    let leg4RouteDistance = null;
    let leg4RouteWaypoints = null;
    let leg4RouteSource = 'great-circle';

    if (leg4RouteString && pickupAirport.code !== destinationAirport.code) {
      console.log(`Leg 4 FAA route: ${leg4RouteString}`);
      try {
        const parsedRoute = await parseRoute(leg4RouteString, pickupAirport, destinationAirport, supabase);
        leg4RouteDistance = parsedRoute.totalDistanceNM;
        leg4RouteWaypoints = parsedRoute.waypoints;
        leg4RouteSource = 'faa-preferred';
        console.log(`Leg 4 parsed ${parsedRoute.waypoints.length} waypoints, distance: ${leg4RouteDistance.toFixed(1)}nm`);
      } catch (error) {
        console.warn('Failed to parse leg 4 route:', error);
      }
    }

    const leg4FlightDistance = pickupAirport.code === destinationAirport.code ? 0 : (leg4RouteDistance || calculateDistance(
      pickupAirport.lat,
      pickupAirport.lng,
      destinationAirport.lat,
      destinationAirport.lng
    ));

    // Leg 4 is return flight - use TAF for arrival forecast if available
    const leg4FlightResult = pickupAirport.code === destinationAirport.code 
      ? { minutes: 0, weatherDelay: 0, headwind: 0, cruiseAltitude: 0, cruiseWinds: null }
      : await calculateFlightTime(
          leg4FlightDistance,
          config,
          pickupAirportData || kfrgData,
          destinationAirportData || kfrgData,
          pickupAirport,
          destinationAirport,
          true, // Use TAF for arrival (forecasted conditions)
          destinationAirport.code,
          leg4RouteWaypoints || undefined
        );

    // === LEG 5: Destination Airport to Delivery Hospital (GROUND) ===
    const leg5Data = await calculateGroundSegmentEnhanced(
      { lat: destinationAirport.lat, lng: destinationAirport.lng },
      deliveryLocation,
      trafficMultiplier,
      supabase,
      departureTime
    );

    // Build segments
    const groundHandlingTime = config.ground_handling_time_min || 15;
    
    const segments = [
      ...(pickupAirport.code !== KFRG.code ? [{
        type: 'flight' as const,
        from: `${KFRG.code} (Home Base)`,
        to: `${pickupAirport.code} (Pickup Airport)`,
        duration: leg1FlightResult.minutes,
        distance: leg1FlightDistance,
        route: leg1RouteSource
      }] : []),
      ...(pickupAirport.code !== KFRG.code ? [{
        type: 'ground_handling' as const,
        from: `${pickupAirport.code} (Pickup Airport)`,
        to: `${pickupAirport.code} (Pickup Airport)`,
        duration: groundHandlingTime,
        distance: 0,
        description: 'Patient loading & refueling'
      }] : []),
      {
        type: 'ground' as const,
        from: `${pickupAirport.code}${pickupAirport.code === KFRG.code ? ' (Home Base)' : ' (Pickup Airport)'}`,
        to: 'Pickup Hospital',
        duration: leg2Data.duration,
        distance: leg2Data.distance,
        traffic: leg2Data.source,
        polyline: leg2Data.polyline
      },
      {
        type: 'ground' as const,
        from: 'Pickup Hospital',
        to: `${pickupAirport.code} (Pickup Airport)`,
        duration: leg3Data.duration,
        distance: leg3Data.distance,
        traffic: leg3Data.source,
        polyline: leg3Data.polyline
      },
      ...(pickupAirport.code !== destinationAirport.code ? [{
        type: 'flight' as const,
        from: `${pickupAirport.code} (Pickup Airport)`,
        to: `${destinationAirport.code}${destinationAirport.code === KFRG.code ? ' (Home Base)' : ' (Destination Airport)'}`,
        duration: leg4FlightResult.minutes,
        distance: leg4FlightDistance,
        route: leg4RouteSource
      }] : []),
      ...(pickupAirport.code !== destinationAirport.code ? [{
        type: 'ground_handling' as const,
        from: `${destinationAirport.code}${destinationAirport.code === KFRG.code ? ' (Home Base)' : ' (Destination Airport)'}`,
        to: `${destinationAirport.code}${destinationAirport.code === KFRG.code ? ' (Home Base)' : ' (Destination Airport)'}`,
        duration: groundHandlingTime,
        distance: 0,
        description: 'Patient unloading'
      }] : []),
      {
        type: 'ground' as const,
        from: `${destinationAirport.code}${destinationAirport.code === KFRG.code ? ' (Home Base)' : ' (Destination Airport)'}`,
        to: 'Delivery Hospital',
        duration: leg5Data.duration,
        distance: leg5Data.distance,
        traffic: leg5Data.source,
        polyline: leg5Data.polyline
      }
    ];

    console.log(`🏥 Ground handling: ${groundHandlingTime}min added at pickup${pickupAirport.code !== destinationAirport.code ? ` and destination airports` : ' airport'}`);

    const totalTime = segments.reduce((sum, seg) => sum + seg.duration, 0);
    const arrivalTime = new Date(departureTime.getTime() + totalTime * 60 * 1000);

    // Calculate conditions for dynamic factors
    const totalWeatherDelay = leg1FlightResult.weatherDelay + leg4FlightResult.weatherDelay;
    const maxHeadwind = Math.max(leg1FlightResult.headwind, leg4FlightResult.headwind);
    const hasRealTimeTraffic = leg2Data.hasTrafficData && leg3Data.hasTrafficData && leg5Data.hasTrafficData;
    
    // Determine routing quality
    let routingQuality: 'faa-preferred' | 'great-circle' | 'mixed' = 'great-circle';
    if (leg1RouteSource === 'faa-preferred' && leg4RouteSource === 'faa-preferred') {
      routingQuality = 'faa-preferred';
    } else if (leg1RouteSource === 'faa-preferred' || leg4RouteSource === 'faa-preferred') {
      routingQuality = 'mixed';
    }
    
    // Determine traffic level
    let trafficLevel: 'light' | 'normal' | 'heavy' = 'normal';
    if (trafficMultiplier < 1.2) trafficLevel = 'light';
    else if (trafficMultiplier > 1.4) trafficLevel = 'heavy';

    // Generate advisories
    const advisories = generateAdvisories(totalWeatherDelay, maxHeadwind, trafficMultiplier);

    // Confidence score
    let confidence = 85;
    if (routingQuality === 'faa-preferred') confidence += 5;
    if (kfrgData?.metar) confidence += 5;
    if (hasRealTimeTraffic) confidence += 5;

    // Get airport addresses via reverse geocoding
    let pickupAirportAddress = '';
    let destinationAirportAddress = '';
    
    try {
      const pickupGeocode = await supabase.functions.invoke('geocode-google', {
        body: { query: `${pickupAirport.lat},${pickupAirport.lng}`, limit: 1 }
      });
      if (pickupGeocode.data && pickupGeocode.data.length > 0) {
        pickupAirportAddress = pickupGeocode.data[0].address || pickupGeocode.data[0].display_name || '';
      }
    } catch (err) {
      console.error('Failed to geocode pickup airport:', err);
    }

    try {
      const destGeocode = await supabase.functions.invoke('geocode-google', {
        body: { query: `${destinationAirport.lat},${destinationAirport.lng}`, limit: 1 }
      });
      if (destGeocode.data && destGeocode.data.length > 0) {
        destinationAirportAddress = destGeocode.data[0].address || destGeocode.data[0].display_name || '';
      }
    } catch (err) {
      console.error('Failed to geocode destination airport:', err);
    }

    const result = {
      segments,
      totalTime,
      arrivalTime: arrivalTime.toISOString(),
      confidence,
      conditions: {
        weatherDelay: totalWeatherDelay,
        maxHeadwind,
        hasRealTimeTraffic,
        routingQuality,
        trafficLevel,
        cruiseWinds: {
          leg1: leg1FlightResult.cruiseWinds ?? null,
          leg4: leg4FlightResult.cruiseWinds ?? null
        }
      },
      route: {
        homeBase: KFRG,
        pickupLocation,
        deliveryLocation,
        pickupAirport: {
          code: pickupAirport.code,
          name: pickupAirport.name,
          lat: pickupAirport.lat,
          lng: pickupAirport.lng,
          elevation_ft: pickupAirport.elevation_ft,
          runway: pickupAirport.best_runway,
          address: pickupAirportAddress,
          distance_from_pickup: calculateDistance(pickupAirport.lat, pickupAirport.lng, pickupLocation.lat, pickupLocation.lng)
        },
        destinationAirport: {
          code: destinationAirport.code,
          name: destinationAirport.name,
          lat: destinationAirport.lat,
          lng: destinationAirport.lng,
          elevation_ft: destinationAirport.elevation_ft,
          runway: destinationAirport.best_runway,
          address: destinationAirportAddress,
          distance_from_delivery: calculateDistance(destinationAirport.lat, destinationAirport.lng, deliveryLocation.lat, deliveryLocation.lng)
        },
        // Legacy compatibility fields
        departureAirport: {
          code: pickupAirport.code,
          name: pickupAirport.name,
          lat: pickupAirport.lat,
          lng: pickupAirport.lng
        },
        arrivalAirport: {
          code: destinationAirport.code,
          name: destinationAirport.name,
          lat: destinationAirport.lat,
          lng: destinationAirport.lng
        }
      },
      advisories
    };

    console.log(`Total trip time: ${totalTime} minutes (${Math.floor(totalTime / 60)}h ${totalTime % 60}m)`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Trip calculation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseTAFWind(tafString: string): { direction: number | 'VRB'; speed: number } | null {
  if (!tafString) return null;
  
  // TAF format: wind is similar to METAR (e.g., "28015G22KT" or "VRB05KT")
  // Extract the first wind group after the timestamp
  const windMatch = tafString.match(/(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/);
  if (windMatch) {
    return {
      direction: windMatch[1] === 'VRB' ? 'VRB' : parseInt(windMatch[1], 10),
      speed: parseInt(windMatch[2], 10)
    };
  }
  return null;
}

async function calculateFlightTime(
  distanceNM: number,
  config: any,
  departureData: any,
  arrivalData: any,
  departureAirport: any,
  arrivalAirport: any,
  useArrivalTAF: boolean = false,
  nearestAirport?: string,
  routeWaypoints?: Array<{lat: number, lng: number, code?: string}>
): Promise<{ minutes: number; weatherDelay: number; headwind: number; cruiseAltitude: number; cruiseWinds: any | null }> {
  const forecastHours = 0;
  if (distanceNM === 0) return { minutes: 0, weatherDelay: 0, headwind: 0, cruiseAltitude: 0, cruiseWinds: null };

  // Determine altitude based on distance
  let cruiseAltitudeFt: number;
  if (distanceNM < 100) {
    cruiseAltitudeFt = config.altitude_rules.under_100nm.max_ft;
  } else if (distanceNM < 350) {
    cruiseAltitudeFt = config.altitude_rules['100_to_350nm'].max_ft;
  } else {
    cruiseAltitudeFt = config.altitude_rules.over_350nm.max_ft;
  }

  // Parse departure weather (always use METAR for weather delays and surface winds)
  let headwind = 0;
  let weatherDelay = 0;
  let departureMetar = null;
  let arrivalMetar = null;
  let arrivalWind = null;

  if (departureData?.metar) {
    departureMetar = parseMETAR(departureData.metar.raw);
    if (departureMetar) {
      weatherDelay += getWeatherDelayMinutes(departureMetar);
    }
  }

  // For arrival: use TAF if requested (return flight), otherwise METAR
  if (useArrivalTAF && arrivalData?.taf) {
    // Parse wind from TAF for forecasted conditions
    const tafWind = parseTAFWind(arrivalData.taf.raw);
    if (tafWind) {
      arrivalWind = tafWind;
    }
    // Still check METAR for weather delay estimate if no TAF weather parsing
    if (arrivalData?.metar) {
      arrivalMetar = parseMETAR(arrivalData.metar.raw);
      if (arrivalMetar) {
        weatherDelay += getWeatherDelayMinutes(arrivalMetar) * 0.7; // Reduce impact since it's forecast
      }
    }
  } else if (arrivalData?.metar) {
    arrivalMetar = parseMETAR(arrivalData.metar.raw);
    if (arrivalMetar) {
      weatherDelay += getWeatherDelayMinutes(arrivalMetar);
      arrivalWind = arrivalMetar.wind;
    }
  }

  // Calculate course for headwind component
  const course = calculateCourse(
    departureAirport.lat,
    departureAirport.lng,
    arrivalAirport.lat,
    arrivalAirport.lng
  );

  // Calculate climb/descent distances for wind sampling
  const climbRateFpm = config.climb_rate_fpm || 3000;
  const descentRateFpm = config.descent_rate_fpm || 2000;
  const speedBelowFL100 = config.speed_below_fl100_kias || 250;
  
  const climbPhaseMin = cruiseAltitudeFt / climbRateFpm;
  const descentPhaseMin = cruiseAltitudeFt / descentRateFpm;
  const climbPhaseNM = (speedBelowFL100 * 0.8 * climbPhaseMin) / 60;
  const descentPhaseNM = (speedBelowFL100 * 0.9 * descentPhaseMin) / 60;

  // Build waypoint array for multi-point wind sampling
  let windSampleWaypoints: Array<{lat: number, lng: number, code?: string}>;

  if (routeWaypoints && routeWaypoints.length >= 2) {
    windSampleWaypoints = routeWaypoints;
    console.log(`Using ${routeWaypoints.length} route waypoints for wind sampling`);
  } else {
    windSampleWaypoints = [
      { lat: departureAirport.lat, lng: departureAirport.lng, code: departureAirport.code },
      { lat: arrivalAirport.lat, lng: arrivalAirport.lng, code: arrivalAirport.code }
    ];
    console.log('Using departure/arrival endpoints for wind sampling');
  }

  // Fetch averaged winds along route using multi-point sampling
  let cruiseWinds = null;
  try {
    cruiseWinds = await fetchAverageWindsAlongRoute(
      windSampleWaypoints,
      cruiseAltitudeFt,
      distanceNM,
      climbPhaseNM,
      descentPhaseNM
    );
    
    if (cruiseWinds) {
      console.log(`✓ Averaged winds from ${cruiseWinds.sampleCount} points using stations: ${cruiseWinds.stations?.join(', ')}`);
      console.log(`  Result: ${cruiseWinds.direction}° @ ${cruiseWinds.speed}kt`);
    }
  } catch (error) {
    console.warn('Failed to fetch route-averaged winds, calculation will use fallback:', error);
  }

  // Calculate headwind component using winds aloft for cruise or fallback to surface winds
  if (cruiseWinds) {
    // Use winds aloft for the main flight calculation
    if (cruiseWinds.direction === 'VRB') {
      // Light and variable winds - minimal headwind component
      headwind = 0;
      console.log(`Cruise winds at ${cruiseAltitudeFt}ft: Light and variable (${cruiseWinds.speed}kts) from station ${cruiseWinds.station}`);
    } else {
      headwind = calculateHeadwindComponent(
        cruiseWinds.direction,
        cruiseWinds.speed,
        course
      );
      console.log(`Cruise winds at ${cruiseAltitudeFt}ft: ${cruiseWinds.direction}° at ${cruiseWinds.speed}kts = ${headwind.toFixed(1)}kt headwind component on course ${course.toFixed(0)}°`);
    }
  } else {
    // Fallback to surface winds (old method)
    if (departureMetar && arrivalWind) {
      const depWindDir = typeof departureMetar.wind.direction === 'number' ? departureMetar.wind.direction : 0;
      const arrWindDir = typeof arrivalWind.direction === 'number' ? arrivalWind.direction : 0;
      
      const depHeadwind = calculateHeadwindComponent(
        depWindDir,
        departureMetar.wind.speed,
        course
      );
      const arrHeadwind = calculateHeadwindComponent(
        arrWindDir,
        arrivalWind.speed,
        course
      );
      headwind = (depHeadwind + arrHeadwind) / 2;
    } else if (departureMetar) {
      const depWindDir = typeof departureMetar.wind.direction === 'number' ? departureMetar.wind.direction : 0;
      headwind = calculateHeadwindComponent(
        depWindDir,
        departureMetar.wind.speed,
        course
      );
    } else if (arrivalWind) {
      const arrWindDir = typeof arrivalWind.direction === 'number' ? arrivalWind.direction : 0;
      headwind = calculateHeadwindComponent(
        arrWindDir,
        arrivalWind.speed,
        course
      );
    }
  }

  // Calculate flight time with proper altitude-based performance
  const climbTimeMin = cruiseAltitudeFt / config.climb_rate_fpm;
  const descentTimeMin = cruiseAltitudeFt / config.descent_rate_fpm;
  
  // Realistic climb/descent distance: aircraft maintains forward speed while climbing/descending
  const climbAvgSpeed = 320; // ktas average during climb (between 200 and 440)
  const descentAvgSpeed = 370; // ktas average during descent (higher than climb, stepped down)
  const climbNM = (climbTimeMin / 60) * climbAvgSpeed;
  const descentNM = (descentTimeMin / 60) * descentAvgSpeed;
  
  const cruiseDistanceNM = Math.max(0, distanceNM * 1.05 - climbNM - descentNM);
  // Negative headwind = tailwind, which increases groundspeed
  const cruiseSpeed = config.cruise_speed_ktas || 440; // Fallback to PC-24 default
  const cruiseGroundSpeed = Math.max(50, cruiseSpeed - headwind); // Clamp to minimum 50 kt
  const cruiseTimeMin = cruiseDistanceNM / cruiseGroundSpeed * 60;
  
  console.log(`✈️  CLIMB: ${climbTimeMin.toFixed(1)}min covering ${climbNM.toFixed(1)}nm @ ${climbAvgSpeed}ktas avg`);
  console.log(`✈️  CRUISE: ${cruiseDistanceNM.toFixed(1)}nm @ ${cruiseGroundSpeed.toFixed(1)}kt GS (${cruiseSpeed}kt - ${headwind.toFixed(1)}kt headwind) = ${cruiseTimeMin.toFixed(1)}min`);
  console.log(`✈️  DESCENT: ${descentTimeMin.toFixed(1)}min covering ${descentNM.toFixed(1)}nm @ ${descentAvgSpeed}ktas avg`);
  
  // Add taxi time (taxi-out + taxi-in = 2 operations per flight leg)
  const taxiTimeTotal = (config.taxi_time_per_airport_min || 5) * 2;
  console.log(`🚕 TAXI: ${taxiTimeTotal}min (${config.taxi_time_per_airport_min || 5}min × 2 airports)`);
  
  const totalMinutes = Math.round(climbTimeMin + cruiseTimeMin + descentTimeMin + weatherDelay + taxiTimeTotal);
  
  return {
    minutes: totalMinutes,
    weatherDelay,
    headwind,
    cruiseAltitude: cruiseAltitudeFt,
    cruiseWinds: cruiseWinds
  };
}

// Polyline decoder function for Google Maps encoded polylines
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    // Return as [lng, lat] for Mapbox
    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

async function calculateGroundSegmentEnhanced(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  trafficMultiplier: number,
  supabase: any,
  departureTime?: Date
): Promise<{ duration: number; distance: number; source: string; polyline?: number[][]; hasTrafficData?: boolean }> {
  try {
    console.log('Calculating ground segment using Google Maps...');
    
    // Call route-google edge function
    const { data, error } = await supabase.functions.invoke('route-google', {
      body: {
        origin: { lat: from.lat, lon: from.lng },
        destination: { lat: to.lat, lon: to.lng },
        departureTime: departureTime?.toISOString()
      }
    });
    
    if (error) throw error;
    
    if (data && data.distance && data.duration) {
      console.log('Google Maps route found:', {
        distance: data.distance,
        duration: data.duration,
        hasTraffic: data.hasTrafficData
      });
      
      // Decode polyline to coordinates array
      const coordinates = data.polyline ? decodePolyline(data.polyline) : undefined;
      
      return {
        duration: Math.round(data.duration),
        distance: Math.round(data.distance * 10) / 10,
        source: 'google_maps',
        polyline: coordinates,
        hasTrafficData: data.hasTrafficData || false
      };
    }
  } catch (error) {
    console.warn('Google Maps routing failed, using heuristic:', error);
  }
  
  // Fallback heuristic
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng) * 1.15092;
  const baseTime = (distance / 45) * 60;
  const adjustedTime = baseTime * trafficMultiplier;
  
  console.log('Using heuristic routing for ground segment');
  
  return {
    duration: Math.round(adjustedTime),
    distance: Math.round(distance * 10) / 10,
    source: 'heuristic'
  };
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateCourse(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const course = Math.atan2(y, x) * 180 / Math.PI;
  return (course + 360) % 360;
}

function calculateHeadwindComponent(windDir: number, windSpeed: number, course: number): number {
  // Calculate bearing difference: phi in range [-180, 180]
  let phi = ((windDir - course + 540) % 360) - 180;
  
  // Convert to radians and calculate headwind component
  // Positive = headwind, Negative = tailwind
  const headwind = windSpeed * Math.cos(phi * Math.PI / 180);
  
  return headwind;
}

function generateAdvisories(weatherDelay: number, headwind: number, trafficMultiplier: number): string[] {
  const advisories: string[] = [];
  
  if (weatherDelay > 10) {
    advisories.push('⚠️ Significant weather delays expected');
  }
  if (headwind > 20) {
    advisories.push('🌬️ Strong headwinds may increase flight time');
  }
  if (trafficMultiplier > 1.3) {
    advisories.push('🚦 Heavy traffic expected on ground segments');
  }
  
  return advisories;
}
