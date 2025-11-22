import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchAndParseAirNav } from '../_shared/airnav-parser.ts';
import { parseRoute, getFAARoute } from '../_shared/route-parser.ts';
import { calculateDistance } from '../_shared/geo-utils.ts';
import { selectTripAirports } from '../_shared/airport-selection.ts';
import { validateDepartureWeather } from '../_shared/weather-validation.ts';
import { calculateFlightTime } from '../_shared/flight-calculator.ts';
import { calculateGroundRoute, calculateTrafficMultiplier } from '../_shared/ground-route-calculator.ts';
import { buildTripSegments, geocodeAirport, generateAdvisories } from '../_shared/segment-builder.ts';
import { generateScenarios } from '../_shared/scenario-generator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log('⏱️  PERFORMANCE: Trip calculation started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.json();

    const {
      pickupLocation = rawBody.origin,
      deliveryLocation = rawBody.destination,
      departureDateTime = rawBody.departureTime,
      passengers = 4,
      preferredPickupAirport,
      preferredDestinationAirport,
    } = rawBody;

    if (!pickupLocation || !deliveryLocation || !departureDateTime) {
      console.error('Missing required trip parameters:', {
        hasPickupLocation: !!pickupLocation,
        hasDeliveryLocation: !!deliveryLocation,
        departureDateTime,
      });
      return new Response(JSON.stringify({ error: 'Missing required trip parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const departureTimeUTC = new Date(departureDateTime);
    if (isNaN(departureTimeUTC.getTime())) {
      console.error('Invalid departureDateTime value received:', departureDateTime);
      return new Response(JSON.stringify({ error: 'Invalid departure time' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🛫 Departure time (UTC): ${departureTimeUTC.toISOString()}`);
    console.log(`🛫 Departure time (Local): ${new Date(departureTimeUTC).toLocaleString()}`);

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

    // === AIRPORT SELECTION ===
    const airportSelection = await selectTripAirports({
      pickupLocation,
      deliveryLocation,
      departureTimeUTC,
      preferredPickupAirport,
      preferredDestinationAirport,
      homeBase: KFRG,
      config,
      supabase
    });

    const { pickupAirport, destinationAirport, requiresChiefPilotApproval, approvalData, approvalReasons } = airportSelection;
    console.log(`⏱️  PERFORMANCE: Airport selection completed in ${Date.now() - startTime}ms`);

    // === DEPARTURE WEATHER VALIDATION (BLOCKING) ===
    const weatherValidation = await validateDepartureWeather(KFRG, config, supabase);
    
    if (!weatherValidation.isValid) {
      return new Response(JSON.stringify({
        error: weatherValidation.errorMessage?.includes('crosswind') ? 'Departure crosswind limits exceeded' : 'Departure wind limits exceeded',
        details: weatherValidation.metarData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === TRAFFIC CALCULATION ===
    const departureTime = new Date(departureDateTime);
    const trafficMultiplier = calculateTrafficMultiplier(departureTime);

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
      KFRG.lat, KFRG.lng, pickupAirport.lat, pickupAirport.lng
    ));

    // Get airport weather data
    const [kfrgData, pickupAirportData, destinationAirportData] = await Promise.all([
      fetchAndParseAirNav(KFRG.code, false, supabase),
      pickupAirport.code !== KFRG.code ? fetchAndParseAirNav(pickupAirport.code, false, supabase) : Promise.resolve(null),
      destinationAirport.code !== KFRG.code && destinationAirport.code !== pickupAirport.code ? fetchAndParseAirNav(destinationAirport.code, false, supabase) : Promise.resolve(null)
    ]);
    console.log(`⏱️  PERFORMANCE: Weather data fetched in ${Date.now() - startTime}ms`);

    const leg1FlightResult = pickupAirport.code === KFRG.code 
      ? { minutes: 0, weatherDelay: 0, headwind: 0, cruiseAltitude: 0, cruiseWinds: null }
      : await calculateFlightTime(
          leg1FlightDistance,
          config,
          kfrgData,
          pickupAirportData || kfrgData,
          KFRG,
          pickupAirport,
          false,
          pickupAirport.code,
          leg1RouteWaypoints || undefined,
          departureDateTime
        );

    // === PARALLEL: Calculate all ground routes ===
    console.log('⚡ Calculating ground routes in parallel...');
    const [leg2Data, leg3Data, leg5Data] = await Promise.all([
      calculateGroundRoute(
        { lat: pickupAirport.lat, lng: pickupAirport.lng },
        { lat: pickupLocation.lat, lng: pickupLocation.lng || pickupLocation.lon },
        trafficMultiplier,
        supabase,
        departureTime
      ),
      calculateGroundRoute(
        { lat: pickupLocation.lat, lng: pickupLocation.lng || pickupLocation.lon },
        { lat: pickupAirport.lat, lng: pickupAirport.lng },
        trafficMultiplier,
        supabase,
        departureTime
      ),
      calculateGroundRoute(
        { lat: destinationAirport.lat, lng: destinationAirport.lng },
        { lat: deliveryLocation.lat, lng: deliveryLocation.lng || deliveryLocation.lon },
        trafficMultiplier,
        supabase,
        departureTime
      )
    ]);
    console.log('✅ Ground routes calculated in parallel');
    console.log(`⏱️  PERFORMANCE: Ground routes completed in ${Date.now() - startTime}ms`);

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
      pickupAirport.lat, pickupAirport.lng, destinationAirport.lat, destinationAirport.lng
    ));

    const leg4FlightResult = pickupAirport.code === destinationAirport.code 
      ? { minutes: 0, weatherDelay: 0, headwind: 0, cruiseAltitude: 0, cruiseWinds: null }
      : await calculateFlightTime(
          leg4FlightDistance,
          config,
          pickupAirportData || kfrgData,
          destinationAirportData || kfrgData,
          pickupAirport,
          destinationAirport,
          true,
          destinationAirport.code,
          leg4RouteWaypoints || undefined,
          departureDateTime
        );

    // === BUILD SEGMENTS ===
    const segments = buildTripSegments({
      homeBase: KFRG,
      pickupAirport,
      destinationAirport,
      pickupLocation,
      deliveryLocation,
      leg1Flight: leg1FlightResult,
      leg2Ground: leg2Data,
      leg3Ground: leg3Data,
      leg4Flight: leg4FlightResult,
      leg5Ground: leg5Data,
      leg1Distance: leg1FlightDistance,
      leg4Distance: leg4FlightDistance,
      leg1RouteSource,
      leg4RouteSource
    });

    const totalTime = segments.reduce((sum, seg) => sum + seg.duration, 0);
    const arrivalTime = new Date(departureTime.getTime() + totalTime * 60 * 1000);

    // Calculate conditions
    const totalWeatherDelay = leg1FlightResult.weatherDelay + leg4FlightResult.weatherDelay;
    const maxHeadwind = Math.max(leg1FlightResult.headwind, leg4FlightResult.headwind);
    const hasRealTimeTraffic = !!(leg2Data.hasTrafficData && leg3Data.hasTrafficData && leg5Data.hasTrafficData);
    
    let routingQuality: 'faa-preferred' | 'great-circle' | 'mixed' = 'great-circle';
    if (leg1RouteSource === 'faa-preferred' && leg4RouteSource === 'faa-preferred') {
      routingQuality = 'faa-preferred';
    } else if (leg1RouteSource === 'faa-preferred' || leg4RouteSource === 'faa-preferred') {
      routingQuality = 'mixed';
    }
    
    let trafficLevel: 'light' | 'normal' | 'heavy' = 'normal';
    if (trafficMultiplier < 1.2) trafficLevel = 'light';
    else if (trafficMultiplier > 1.4) trafficLevel = 'heavy';

    const advisories = generateAdvisories(totalWeatherDelay, maxHeadwind, trafficMultiplier);

    let confidence = 85;
    if (routingQuality === 'faa-preferred') confidence += 5;
    if (kfrgData?.metar) confidence += 5;
    if (hasRealTimeTraffic) confidence += 5;

    // Geocode airports for addresses
    const [pickupAirportAddress, destinationAirportAddress] = await Promise.all([
      geocodeAirport(pickupAirport, supabase),
      geocodeAirport(destinationAirport, supabase)
    ]);

    console.log(`Total trip time: ${totalTime} minutes (${Math.floor(totalTime / 60)}h ${totalTime % 60}m)`);

    // === GENERATE SCENARIOS ===
    const scenarios = await generateScenarios({
      totalTime,
      segments,
      weatherDelays: totalWeatherDelay,
      maxHeadwind,
      trafficMultiplier,
      routingQuality,
      hasRealTimeTraffic,
      supabase
    });

    // === BUILD FINAL RESPONSE ===
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
          distance_from_pickup: calculateDistance(pickupAirport.lat, pickupAirport.lng, pickupLocation.lat, pickupLocation.lng || pickupLocation.lon)
        },
        destinationAirport: {
          code: destinationAirport.code,
          name: destinationAirport.name,
          lat: destinationAirport.lat,
          lng: destinationAirport.lng,
          elevation_ft: destinationAirport.elevation_ft,
          runway: destinationAirport.best_runway,
          address: destinationAirportAddress,
          distance_from_delivery: calculateDistance(destinationAirport.lat, destinationAirport.lng, deliveryLocation.lat, deliveryLocation.lng || deliveryLocation.lon)
        },
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
      advisories,
      chiefPilotApproval: {
        required: requiresChiefPilotApproval,
        reasons: approvalReasons,
        pickupAirport: approvalData.pickupAirportData ? {
          code: approvalData.pickupAirportData.code,
          name: approvalData.pickupAirportData.name,
          requiresApproval: approvalData.pickupAirportData.requiresChiefPilotApproval,
          violatedGuidelines: approvalData.pickupAirportData.violatedGuidelines || [],
          wouldHaveSelected: approvalData.pickupSelection?.closestRejected ? {
            code: approvalData.pickupSelection.closestRejected.code,
            name: approvalData.pickupSelection.closestRejected.name,
            reasons: approvalData.pickupSelection.closestRejected.rejectionReasons
          } : null,
          rejectedAirports: approvalData.pickupSelection?.rejectedAirports?.slice(0, 5).map((a: any) => ({
            code: a.code,
            name: a.name,
            distance_nm: a.distance_nm,
            groundTransportMinutes: a.groundTransportMinutes,
            reasons: a.rejectionReasons,
            failureStage: a.failureStage
          })) || []
        } : null,
        deliveryAirport: approvalData.deliveryAirportData ? {
          code: approvalData.deliveryAirportData.code,
          name: approvalData.deliveryAirportData.name,
          requiresApproval: approvalData.deliveryAirportData.requiresChiefPilotApproval,
          violatedGuidelines: approvalData.deliveryAirportData.violatedGuidelines || [],
          wouldHaveSelected: approvalData.deliverySelection?.closestRejected ? {
            code: approvalData.deliverySelection.closestRejected.code,
            name: approvalData.deliverySelection.closestRejected.name,
            reasons: approvalData.deliverySelection.closestRejected.rejectionReasons
          } : null,
          rejectedAirports: approvalData.deliverySelection?.rejectedAirports?.slice(0, 5).map((a: any) => ({
            code: a.code,
            name: a.name,
            distance_nm: a.distance_nm,
            groundTransportMinutes: a.groundTransportMinutes,
            reasons: a.rejectionReasons,
            failureStage: a.failureStage
          })) || []
        } : null
      },
      scenarios
    };

    console.log(`⏱️  PERFORMANCE: Total calculation time: ${Date.now() - startTime}ms`);

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
