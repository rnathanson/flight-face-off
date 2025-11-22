import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchAndParseAirNav } from '../_shared/airnav-parser.ts';
import { parseMETAR, getWeatherDelayMinutes } from '../_shared/metar-parser.ts';
import { parseRoute, getFAARoute } from '../_shared/route-parser.ts';
import { fetchWindsAloft, fetchAverageWindsAlongRoute } from '../_shared/winds-aloft-fetcher.ts';
import { calculateDistance } from '../_shared/geo-utils.ts';

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

    const { 
      pickupLocation,
      deliveryLocation,
      departureDateTime,
      passengers = 4,
      preferredPickupAirport,
      preferredDestinationAirport
    } = await req.json();

    // Parse departure time and ensure it's in UTC
    const departureTimeUTC = new Date(departureDateTime);
    console.log(`🛫 Departure time (UTC): ${departureTimeUTC.toISOString()}`);
    console.log(`🛫 Departure time (Local): ${new Date(departureDateTime).toLocaleString()}`);

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
    
    // Track approval requirements
    let requiresChiefPilotApproval = false;
    let approvalReasons: string[] = [];
    let pickupAirportApprovalData: any = null;
    let deliveryAirportApprovalData: any = null;
    let pickupAirportSelection: any = null;
    let deliveryAirportSelection: any = null;

    // Check if user specified a preferred pickup airport
    let usingPreferredPickupAirport = false;
    if (preferredPickupAirport) {
      console.log(`✈️  FORCED preferred pickup airport: ${preferredPickupAirport}`);
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
        usingPreferredPickupAirport = true;
        console.log(`✓ Using FORCED pickup airport: ${pickupAirport.code} (${pickupAirport.name})`);
        console.log(`⚡ Skipping find-qualified-airports call for preferred airport`);
      } else {
        console.log(`⚠️  Preferred pickup airport ${preferredPickupAirport} not found in database, falling back to automatic selection`);
      }
    }

    // Only use automatic selection if no preferred airport was specified or found
    if (!usingPreferredPickupAirport && !isPickupOnLongIsland) {
      // Estimate flight time from KFRG to pickup location
      const pickupFlightDistanceNM = calculateDistance(
        KFRG.lat, KFRG.lng, 
        pickupLocation.lat, pickupLocation.lng
      );
      const pickupFlightMinutes = Math.ceil((pickupFlightDistanceNM / config.cruise_speed_ktas) * 60) + 15; // +15min for climb/taxi
      const pickupArrivalTimeUTC = new Date(departureTimeUTC.getTime() + pickupFlightMinutes * 60000);

      console.log(`📍 Estimated arrival at pickup airport: ${pickupArrivalTimeUTC.toISOString()} (${pickupFlightMinutes}min flight)`);

      const pickupAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
        body: { 
          location: pickupLocation, 
          maxGroundTimeMinutes: 60, // Changed from maxDistance to time-based
          departureTimeUTC: departureTimeUTC.toISOString(),
          estimatedArrivalTimeUTC: pickupArrivalTimeUTC.toISOString()
        }
      });
      
      const airportSelection = pickupAirportsResponse.data;
      pickupAirportSelection = airportSelection; // Store for chief pilot approval details
      
      if (airportSelection?.selectedAirport) {
        pickupAirport = airportSelection.selectedAirport;
        pickupAirportApprovalData = airportSelection.selectedAirport;
        
        // Store alternate airport info for display
        if (airportSelection.isAlternate && airportSelection.preferredAirport) {
          console.log(`ℹ️ Using alternate pickup airport ${pickupAirport.code} - preferred was ${airportSelection.preferredAirport.code}`);
          console.log(`Rejection reasons: ${airportSelection.preferredAirport.whyRejected.join(', ')}`);
        }
        
        // Check if approval is required
        if (pickupAirportApprovalData.requiresChiefPilotApproval) {
          requiresChiefPilotApproval = true;
          if (pickupAirportApprovalData.violatedGuidelines) {
            approvalReasons.push(...pickupAirportApprovalData.violatedGuidelines.map((g: string) => `pickup_${g}`));
          }
        }
      } else if (airportSelection?.airports && airportSelection.airports.length > 0) {
        // Fallback: use the first airport from the list (shouldn't happen after fix above)
        console.log('⚠️ WARNING: No selectedAirport but airports available - using first option');
        pickupAirport = airportSelection.airports[0];
        requiresChiefPilotApproval = true;
        approvalReasons.push('pickup_no_qualified_airports');
      }
    }

    // Check if user specified a preferred destination airport
    let usingPreferredDestinationAirport = false;
    if (preferredDestinationAirport) {
      console.log(`✈️  FORCED preferred destination airport: ${preferredDestinationAirport}`);
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
        usingPreferredDestinationAirport = true;
        console.log(`✓ Using FORCED destination airport: ${destinationAirport.code} (${destinationAirport.name})`);
        console.log(`⚡ Skipping find-qualified-airports call for preferred airport`);
      } else {
        console.log(`⚠️  Preferred destination airport ${preferredDestinationAirport} not found in database, falling back to automatic selection`);
      }
    }

    // Only use automatic selection if no preferred airport was specified or found
    if (!usingPreferredDestinationAirport) {
      if (!isDeliveryOnLongIsland) {
        // After pickup, add ground time + patient loading
        const loadingMinutes = 30; // Estimate for patient loading/prep
        const pickupToDeliveryDepartureTime = new Date(
          departureTimeUTC.getTime() + 
          Math.ceil((calculateDistance(KFRG.lat, KFRG.lng, pickupLocation.lat, pickupLocation.lng) / config.cruise_speed_ktas) * 60 + 15) * 60000 +
          loadingMinutes * 60000
        );

        // Estimate flight time from pickup to delivery
        const deliveryFlightDistanceNM = calculateDistance(
          pickupLocation.lat, pickupLocation.lng,
          deliveryLocation.lat, deliveryLocation.lng
        );
        const deliveryFlightMinutes = Math.ceil((deliveryFlightDistanceNM / config.cruise_speed_ktas) * 60) + 15;
        const deliveryArrivalTimeUTC = new Date(
          pickupToDeliveryDepartureTime.getTime() + deliveryFlightMinutes * 60000
        );

        console.log(`📍 Estimated arrival at delivery airport: ${deliveryArrivalTimeUTC.toISOString()} (${deliveryFlightMinutes}min flight)`);

        const deliveryAirportsResponse = await supabase.functions.invoke('find-qualified-airports', {
          body: { 
            location: deliveryLocation, 
            maxGroundTimeMinutes: 60, // Changed from maxDistance to time-based
            departureTimeUTC: pickupToDeliveryDepartureTime.toISOString(),
            estimatedArrivalTimeUTC: deliveryArrivalTimeUTC.toISOString()
          }
        });
        
        const deliverySelection = deliveryAirportsResponse.data;
        deliveryAirportSelection = deliverySelection; // Store for chief pilot approval details
        
        if (deliverySelection?.selectedAirport) {
          destinationAirport = deliverySelection.selectedAirport;
          deliveryAirportApprovalData = deliverySelection.selectedAirport;
          
          if (deliverySelection.isAlternate && deliverySelection.preferredAirport) {
            console.log(`ℹ️ Using alternate delivery airport ${destinationAirport.code} - preferred was ${deliverySelection.preferredAirport.code}`);
            console.log(`Rejection reasons: ${deliverySelection.preferredAirport.whyRejected.join(', ')}`);
          }
          
          if (deliveryAirportApprovalData.requiresChiefPilotApproval) {
            requiresChiefPilotApproval = true;
            if (deliveryAirportApprovalData.violatedGuidelines) {
              approvalReasons.push(...deliveryAirportApprovalData.violatedGuidelines.map((g: string) => `delivery_${g}`));
            }
          }
        } else if (deliverySelection?.airports && deliverySelection.airports.length > 0) {
          // Fallback: use the first airport from the list (shouldn't happen after fix above)
          console.log('⚠️ WARNING: No selectedAirport but airports available - using first option');
          destinationAirport = deliverySelection.airports[0];
          requiresChiefPilotApproval = true;
          approvalReasons.push('delivery_no_qualified_airports');
        }
      } else {
        // Delivery IS on Long Island, so destination airport is KFRG
        destinationAirport = KFRG;
      }
    }

    console.log(`Selected Airports - Pickup: ${pickupAirport.code} (${pickupAirport.name}), Destination: ${destinationAirport.code} (${destinationAirport.name})`);
    console.log(`Flight Route: KFRG → ${pickupAirport.code} → ${destinationAirport.code}`);
    console.log(`⏱️  PERFORMANCE: Airport selection completed in ${Date.now() - startTime}ms`);

    // === DEPARTURE WIND CHECK (BLOCKING) ===
    console.log(`\n🛫 Checking departure wind limits at ${KFRG.code}...`);
    const departureWeather = await fetchAndParseAirNav(KFRG.code, true, supabase); // weatherOnly=true
    
    if (departureWeather?.metar) {
      const metarRaw = departureWeather.metar.raw;
      console.log(`METAR for ${KFRG.code}: ${metarRaw.substring(0, 80)}`);
      
      // Extract wind from METAR
      const vrbMatch = metarRaw.match(/\bVRB(\d{2,3})(?:G(\d{2,3}))?KT\b/);
      const calmMatch = /\b00000KT\b/.test(metarRaw);
      const stdMatch = metarRaw.match(/\b(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/);
      
      let windDirection: number = 0;
      let windSpeed: number = 0;
      let windGust: number | undefined = undefined;
      
      if (vrbMatch) {
        windDirection = -1; // Variable
        windSpeed = parseInt(vrbMatch[1]);
        windGust = vrbMatch[2] ? parseInt(vrbMatch[2]) : undefined;
      } else if (calmMatch) {
        windDirection = 0;
        windSpeed = 0;
      } else if (stdMatch) {
        windDirection = parseInt(stdMatch[1]);
        windSpeed = parseInt(stdMatch[2]);
        windGust = stdMatch[3] ? parseInt(stdMatch[3]) : undefined;
      }
      
      if (windSpeed > 0 || windGust) {
        const effectiveWind = windGust || windSpeed;
        console.log(`Wind at ${KFRG.code}: ${windDirection === -1 ? 'VRB' : windDirection}${String(windSpeed).padStart(2, '0')}${windGust ? `G${windGust}` : ''}KT`);
        
        // Check against max wind limit
        if (effectiveWind > config.max_wind_kt) {
          const errorMsg = `Departure not permitted: wind ${effectiveWind}kt exceeds limit ${config.max_wind_kt}kt at ${KFRG.code}`;
          console.log(`❌ ${errorMsg}`);
          return new Response(JSON.stringify({
            error: 'Departure wind limits exceeded',
            details: {
              airport: KFRG.code,
              wind: `${windDirection === -1 ? 'VRB' : String(windDirection).padStart(3, '0')}${String(windSpeed).padStart(2, '0')}${windGust ? `G${windGust}` : ''}KT`,
              effectiveWind: `${effectiveWind}kt`,
              limit: `${config.max_wind_kt}kt`,
              message: errorMsg
            }
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Check crosswind if we have runways
        if (departureWeather.runways && departureWeather.runways.length > 0) {
          let lowestCrosswind = Infinity;
          let bestRunway = departureWeather.runways[0];
          
          // Variable winds - worst case is full wind speed as crosswind
          if (windDirection === -1) {
            lowestCrosswind = effectiveWind;
          } else {
            for (const runway of departureWeather.runways) {
              const runwayHeading = parseInt(runway.name) * 10;
              const angleDiff = Math.abs(windDirection - runwayHeading);
              const angleRad = (angleDiff * Math.PI) / 180;
              const crosswind = Math.abs(Math.round(effectiveWind * Math.sin(angleRad)));
              
              if (crosswind < lowestCrosswind) {
                lowestCrosswind = crosswind;
                bestRunway = runway;
              }
            }
          }
          
          if (lowestCrosswind > config.max_crosswind_kt) {
            const errorMsg = `Departure not permitted: crosswind ${lowestCrosswind}kt on runway ${bestRunway.name} exceeds limit ${config.max_crosswind_kt}kt at ${KFRG.code}`;
            console.log(`❌ ${errorMsg}`);
            return new Response(JSON.stringify({
              error: 'Departure crosswind limits exceeded',
              details: {
                airport: KFRG.code,
                runway: bestRunway.name,
                wind: `${windDirection === -1 ? 'VRB' : String(windDirection).padStart(3, '0')}${String(windSpeed).padStart(2, '0')}${windGust ? `G${windGust}` : ''}KT`,
                crosswind: `${lowestCrosswind}kt`,
                limit: `${config.max_crosswind_kt}kt`,
                message: errorMsg
              }
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          console.log(`✅ Departure wind check passed: wind ${effectiveWind}kt, crosswind ${lowestCrosswind}kt on RWY ${bestRunway.name}`);
        }
      } else {
        console.log(`✅ Calm winds at ${KFRG.code}, no wind restrictions`);
      }
    } else {
      console.log(`⚠️ No METAR data for ${KFRG.code}, proceeding without departure wind check`);
    }

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

    // Get airport weather data (with caching for airport info, live weather)
    const [kfrgData, pickupAirportData, destinationAirportData] = await Promise.all([
      fetchAndParseAirNav(KFRG.code, false, supabase),
      pickupAirport.code !== KFRG.code ? fetchAndParseAirNav(pickupAirport.code, false, supabase) : Promise.resolve(null),
      destinationAirport.code !== KFRG.code && destinationAirport.code !== pickupAirport.code ? fetchAndParseAirNav(destinationAirport.code, false, supabase) : Promise.resolve(null)
    ]);
    console.log(`⏱️  PERFORMANCE: Weather data fetched in ${Date.now() - startTime}ms`);

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
          leg1RouteWaypoints || undefined,
          departureDateTime
        );

    // === PARALLEL: Calculate all ground routes simultaneously ===
    console.log('⚡ Calculating ground routes in parallel...');
    const [leg2Data, leg3Data, leg5Data] = await Promise.all([
      // LEG 2: Pickup Airport to Pickup Hospital
      calculateGroundSegmentEnhanced(
        { lat: pickupAirport.lat, lng: pickupAirport.lng },
        pickupLocation,
        trafficMultiplier,
        supabase,
        departureTime
      ),
      // LEG 3: Pickup Hospital back to Pickup Airport
      calculateGroundSegmentEnhanced(
        pickupLocation,
        { lat: pickupAirport.lat, lng: pickupAirport.lng },
        trafficMultiplier,
        supabase,
        departureTime
      ),
      // LEG 5: Destination Airport to Delivery Hospital (calculated early)
      calculateGroundSegmentEnhanced(
        { lat: destinationAirport.lat, lng: destinationAirport.lng },
        deliveryLocation,
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
          leg4RouteWaypoints || undefined,
          departureDateTime
        );

    // LEG 5 already calculated in parallel above

    // Build segments with polylines for all flight legs
    const segments = [
      ...(pickupAirport.code !== KFRG.code ? [{
        type: 'flight' as const,
        from: `${KFRG.code} (Home Base)`,
        to: `${pickupAirport.code} (Pickup Airport)`,
        duration: leg1FlightResult.minutes,
        distance: leg1FlightDistance,
        route: leg1RouteSource,
        polyline: [[KFRG.lng, KFRG.lat], [pickupAirport.lng, pickupAirport.lat]]
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
        route: leg4RouteSource,
        polyline: [[pickupAirport.lng, pickupAirport.lat], [destinationAirport.lng, destinationAirport.lat]]
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

    // Get airport addresses by name/code (more reliable than coordinates)
    let pickupAirportAddress = '';
    let destinationAirportAddress = '';
    
    try {
      const searchQuery = `${pickupAirport.name} ${pickupAirport.code} Airport`;
      console.log(`Geocoding pickup airport: ${searchQuery}`);
      
      const pickupGeocode = await supabase.functions.invoke('geocode-google', {
        body: { query: searchQuery, limit: 1 }
      });
      if (pickupGeocode.data && pickupGeocode.data.length > 0) {
        pickupAirportAddress = pickupGeocode.data[0].address || pickupGeocode.data[0].display_name || '';
        console.log(`✅ Pickup airport address: ${pickupAirportAddress}`);
      }
    } catch (err) {
      console.error('Failed to geocode pickup airport:', err);
    }

    try {
      const searchQuery = `${destinationAirport.name} ${destinationAirport.code} Airport`;
      console.log(`Geocoding destination airport: ${searchQuery}`);
      
      const destGeocode = await supabase.functions.invoke('geocode-google', {
        body: { query: searchQuery, limit: 1 }
      });
      if (destGeocode.data && destGeocode.data.length > 0) {
        destinationAirportAddress = destGeocode.data[0].address || destGeocode.data[0].display_name || '';
        console.log(`✅ Destination airport address: ${destinationAirportAddress}`);
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
      advisories,
      chiefPilotApproval: {
        required: requiresChiefPilotApproval,
        reasons: approvalReasons,
        pickupAirport: pickupAirportApprovalData ? {
          code: pickupAirportApprovalData.code,
          name: pickupAirportApprovalData.name,
          requiresApproval: pickupAirportApprovalData.requiresChiefPilotApproval,
          violatedGuidelines: pickupAirportApprovalData.violatedGuidelines || [],
          wouldHaveSelected: pickupAirportSelection?.closestRejected ? {
            code: pickupAirportSelection.closestRejected.code,
            name: pickupAirportSelection.closestRejected.name,
            reasons: pickupAirportSelection.closestRejected.rejectionReasons
          } : null,
          rejectedAirports: pickupAirportSelection?.rejectedAirports?.slice(0, 5).map((a: any) => ({
            code: a.code,
            name: a.name,
            distance_nm: a.distance_nm,
            groundTransportMinutes: a.groundTransportMinutes,
            reasons: a.rejectionReasons,
            failureStage: a.failureStage
          })) || []
        } : null,
        deliveryAirport: deliveryAirportApprovalData ? {
          code: deliveryAirportApprovalData.code,
          name: deliveryAirportApprovalData.name,
          requiresApproval: deliveryAirportApprovalData.requiresChiefPilotApproval,
          violatedGuidelines: deliveryAirportApprovalData.violatedGuidelines || [],
          wouldHaveSelected: deliveryAirportSelection?.closestRejected ? {
            code: deliveryAirportSelection.closestRejected.code,
            name: deliveryAirportSelection.closestRejected.name,
            reasons: deliveryAirportSelection.closestRejected.rejectionReasons
          } : null,
          rejectedAirports: deliveryAirportSelection?.rejectedAirports?.slice(0, 5).map((a: any) => ({
            code: a.code,
            name: a.name,
            distance_nm: a.distance_nm,
            groundTransportMinutes: a.groundTransportMinutes,
            reasons: a.rejectionReasons,
            failureStage: a.failureStage
          })) || []
        } : null
      }
    };

    console.log(`Total trip time: ${totalTime} minutes (${Math.floor(totalTime / 60)}h ${totalTime % 60}m)`);
    
    // Log segment polyline info for debugging
    segments.forEach((seg, i) => {
      console.log(`Segment ${i} (${seg.type}): polyline has ${seg.polyline?.length || 0} points`);
    });

    // ============= AI SCENARIO VALIDATION =============
    // Calculate preliminary scenario times with proportional adjustments
    let conservativeTime = totalTime;
    let optimisticTime = totalTime;
    
    segments.forEach(seg => {
      if (seg.type === 'flight') {
        const distanceNM = seg.distance;
        let conservativeMultiplier = 1.15;
        let optimisticMultiplier = 0.90;
        
        if (distanceNM > 50) { conservativeMultiplier = 1.20; optimisticMultiplier = 0.88; }
        if (distanceNM > 200) { conservativeMultiplier = 1.25; optimisticMultiplier = 0.85; }
        
        conservativeTime += seg.duration * (conservativeMultiplier - 1);
        optimisticTime -= seg.duration * (1 - optimisticMultiplier);
      } else if (seg.type === 'ground') {
        const durationMin = seg.duration;
        let conservativeMultiplier = 1.30;
        let optimisticMultiplier = 0.90;
        
        if (durationMin > 20) { conservativeMultiplier = 1.40; optimisticMultiplier = 0.88; }
        if (durationMin > 45) { conservativeMultiplier = 1.50; optimisticMultiplier = 0.85; }
        
        conservativeTime += seg.duration * (conservativeMultiplier - 1);
        optimisticTime -= seg.duration * (1 - optimisticMultiplier);
      }
    });
    
    conservativeTime = Math.round(conservativeTime);
    optimisticTime = Math.round(optimisticTime);
    
    console.log(`📊 Preliminary scenarios: Conservative ${conservativeTime}min, Expected ${totalTime}min, Optimistic ${optimisticTime}min`);
    
    // AI validation with historical learning
    try {
      const routeComplexity = segments.length > 4 ? 'complex' : segments.length > 2 ? 'moderate' : 'simple';
      const weatherConditions = totalWeatherDelay > 10 ? 'challenging' : maxHeadwind > 20 ? 'windy' : 'typical';
      
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-trip-scenarios', {
        body: {
          expectedTime: totalTime,
          conservativeTime,
          optimisticTime,
          segments: segments.map(s => ({
            type: s.type,
            duration: s.duration,
            distance: s.distance
          })),
          routeComplexity,
          weatherConditions
        }
      });
      
      if (validationError) {
        console.warn('⚠️  AI validation failed, using calculated scenarios:', validationError);
      } else if (validationResult) {
        if (!validationResult.isRealistic) {
          console.log(`🤖 AI adjusted scenarios: ${validationResult.reasoning}`);
          
          if (validationResult.adjustedConservative) {
            conservativeTime = Math.round(validationResult.adjustedConservative);
          }
          if (validationResult.adjustedOptimistic) {
            optimisticTime = Math.round(validationResult.adjustedOptimistic);
          }
        } else {
          console.log(`✅ AI validated scenarios: ${validationResult.reasoning}`);
        }
      }
    } catch (validationError) {
      console.warn('⚠️  Scenario validation error, using calculated values:', validationError);
    }
    
    console.log(`✨ Final scenarios: Conservative ${conservativeTime}min (+${((conservativeTime-totalTime)/totalTime*100).toFixed(1)}%), Expected ${totalTime}min, Optimistic ${optimisticTime}min (-${((totalTime-optimisticTime)/totalTime*100).toFixed(1)}%)`);
    
    // Add scenarios to result
    const resultWithScenarios = {
      ...result,
      scenarios: {
        conservative: conservativeTime,
        expected: totalTime,
        optimistic: optimisticTime
      }
    };
    
    console.log(`⏱️  PERFORMANCE: Total calculation time: ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify(resultWithScenarios), {
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
  routeWaypoints?: Array<{lat: number, lng: number, code?: string}>,
  departureDateTime?: string
): Promise<{ 
  minutes: number; 
  weatherDelay: number; 
  headwind: number; 
  cruiseAltitude: number; 
  cruiseWinds: any | null;
  breakdown?: {
    climbMinutes: number;
    cruiseMinutes: number;
    descentMinutes: number;
    taxiMinutes: number;
  };
  cruiseDetails?: {
    cruiseTAS: number;
    cruiseGroundSpeed: number;
    cruiseDistanceNM: number;
  };
}> {
  // Calculate hours until departure based on current time and departure time
  let forecastHours = 0;
  if (departureDateTime) {
    const now = new Date();
    const departureTime = new Date(departureDateTime);
    const hoursUntilDeparture = Math.max(0, (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    // Round to nearest NOAA forecast period (6, 12, 18, 24)
    if (hoursUntilDeparture >= 21) forecastHours = 24;
    else if (hoursUntilDeparture >= 15) forecastHours = 18;
    else if (hoursUntilDeparture >= 9) forecastHours = 12;
    else if (hoursUntilDeparture >= 3) forecastHours = 6;
    else forecastHours = 0; // Use current conditions for flights < 3 hours away
    
    console.log(`Flight departure in ${hoursUntilDeparture.toFixed(1)} hours, using ${forecastHours}hr forecast`);
  }
  if (distanceNM === 0) return { 
    minutes: 0, 
    weatherDelay: 0, 
    headwind: 0, 
    cruiseAltitude: 0, 
    cruiseWinds: null,
    breakdown: {
      climbMinutes: 0,
      cruiseMinutes: 0,
      descentMinutes: 0,
      taxiMinutes: 0
    },
    cruiseDetails: {
      cruiseTAS: 0,
      cruiseGroundSpeed: 0,
      cruiseDistanceNM: 0
    }
  };

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

  // Fetch multi-altitude wind profile for climb, cruise, and descent phases
  let climbHeadwind = 0;
  let cruiseHeadwind = 0;
  let descentHeadwind = 0;
  let cruiseWinds = null;
  
  try {
    // Define altitude bands for climb phase (based on actual PC24 climb profile)
    const climbBands = [
      { altitude: 6000, timeMinutes: 2.0 },   // 0-6k ft
      { altitude: 12000, timeMinutes: 2.0 },  // 6-12k ft
      { altitude: 18000, timeMinutes: 2.0 },  // 12-18k ft
      { altitude: 24000, timeMinutes: 2.3 },  // 18-24k ft
      { altitude: 34000, timeMinutes: 3.8 },  // 24-34k ft
      { altitude: Math.min(cruiseAltitudeFt, 45000), timeMinutes: 4.9 }  // 34k-cruise
    ].filter(band => band.altitude <= cruiseAltitudeFt);
    
    // Define altitude bands for descent phase (reverse order)
    const descentBands = [
      { altitude: Math.min(cruiseAltitudeFt, 45000), timeMinutes: 5.5 },  // cruise-34k ft
      { altitude: 34000, timeMinutes: 4.2 },  // 34-24k ft
      { altitude: 24000, timeMinutes: 2.9 },  // 24-18k ft
      { altitude: 18000, timeMinutes: 2.9 },  // 18-12k ft
      { altitude: 12000, timeMinutes: 2.9 },  // 12-6k ft
      { altitude: 6000, timeMinutes: 2.9 }    // 6k-0 ft
    ].filter(band => band.altitude <= cruiseAltitudeFt);
    
    console.log(`🌬️ Fetching multi-altitude wind profile:`);
    console.log(`   Climb bands: ${climbBands.map(b => `${b.altitude}ft`).join(', ')}`);
    console.log(`   Cruise: ${cruiseAltitudeFt}ft`);
    console.log(`   Descent bands: ${descentBands.map(b => `${b.altitude}ft`).join(', ')}`);
    
    // Fetch winds for climb phase
    const climbWindPromises = climbBands.map(band => 
      fetchAverageWindsAlongRoute(
        windSampleWaypoints,
        band.altitude,
        distanceNM,
        climbPhaseNM,
        descentPhaseNM,
        forecastHours
      ).then(winds => ({ ...band, winds }))
    );
    
    // Fetch winds for cruise phase
    const cruiseWindPromise = fetchAverageWindsAlongRoute(
      windSampleWaypoints,
      cruiseAltitudeFt,
      distanceNM,
      climbPhaseNM,
      descentPhaseNM,
      forecastHours
    );
    
    // Fetch winds for descent phase
    const descentWindPromises = descentBands.map(band => 
      fetchAverageWindsAlongRoute(
        windSampleWaypoints,
        band.altitude,
        distanceNM,
        climbPhaseNM,
        descentPhaseNM,
        forecastHours
      ).then(winds => ({ ...band, winds }))
    );
    
    // Await all wind fetches in parallel
    const [climbResults, cruiseResult, descentResults] = await Promise.all([
      Promise.all(climbWindPromises),
      cruiseWindPromise,
      Promise.all(descentWindPromises)
    ]);
    
    cruiseWinds = cruiseResult;
    
    // Calculate time-weighted headwind for climb phase
    let totalClimbHeadwindTime = 0;
    let totalClimbTime = 0;
    
    for (const band of climbResults) {
      if (band.winds && band.winds.direction !== 'VRB') {
        const headwindComponent = calculateHeadwindComponent(
          band.winds.direction,
          band.winds.speed,
          course
        );
        totalClimbHeadwindTime += headwindComponent * band.timeMinutes;
        totalClimbTime += band.timeMinutes;
        console.log(`   Climb @ ${band.altitude}ft: ${band.winds.direction}° @ ${band.winds.speed}kt = ${headwindComponent.toFixed(1)}kt headwind (weight: ${band.timeMinutes.toFixed(1)}min)`);
      }
    }
    
    climbHeadwind = totalClimbTime > 0 ? totalClimbHeadwindTime / totalClimbTime : 0;
    console.log(`   ✈️ CLIMB weighted avg: ${climbHeadwind.toFixed(1)}kt headwind across ${totalClimbTime.toFixed(1)} min`);
    
    // Calculate headwind for cruise phase
    if (cruiseWinds) {
      if (cruiseWinds.direction === 'VRB') {
        cruiseHeadwind = 0;
        console.log(`   ✈️ CRUISE @ ${cruiseAltitudeFt}ft: Light and variable (${cruiseWinds.speed}kt)`);
      } else {
        cruiseHeadwind = calculateHeadwindComponent(
          cruiseWinds.direction,
          cruiseWinds.speed,
          course
        );
        console.log(`   ✈️ CRUISE @ ${cruiseAltitudeFt}ft: ${cruiseWinds.direction}° @ ${cruiseWinds.speed}kt = ${cruiseHeadwind.toFixed(1)}kt headwind`);
      }
    }
    
    // Calculate time-weighted headwind for descent phase
    let totalDescentHeadwindTime = 0;
    let totalDescentTime = 0;
    
    for (const band of descentResults) {
      if (band.winds && band.winds.direction !== 'VRB') {
        const headwindComponent = calculateHeadwindComponent(
          band.winds.direction,
          band.winds.speed,
          course
        );
        totalDescentHeadwindTime += headwindComponent * band.timeMinutes;
        totalDescentTime += band.timeMinutes;
        console.log(`   Descent @ ${band.altitude}ft: ${band.winds.direction}° @ ${band.winds.speed}kt = ${headwindComponent.toFixed(1)}kt headwind (weight: ${band.timeMinutes.toFixed(1)}min)`);
      }
    }
    
    descentHeadwind = totalDescentTime > 0 ? totalDescentHeadwindTime / totalDescentTime : 0;
    console.log(`   ✈️ DESCENT weighted avg: ${descentHeadwind.toFixed(1)}kt headwind across ${totalDescentTime.toFixed(1)} min`);
    
  } catch (error) {
    console.warn('Failed to fetch multi-altitude winds, using fallback:', error);
    
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
      const avgHeadwind = (depHeadwind + arrHeadwind) / 2;
      
      // Apply same wind to all phases as fallback
      climbHeadwind = avgHeadwind;
      cruiseHeadwind = avgHeadwind;
      descentHeadwind = avgHeadwind;
    } else if (departureMetar) {
      const depWindDir = typeof departureMetar.wind.direction === 'number' ? departureMetar.wind.direction : 0;
      const avgHeadwind = calculateHeadwindComponent(
        depWindDir,
        departureMetar.wind.speed,
        course
      );
      climbHeadwind = avgHeadwind;
      cruiseHeadwind = avgHeadwind;
      descentHeadwind = avgHeadwind;
    } else if (arrivalWind) {
      const arrWindDir = typeof arrivalWind.direction === 'number' ? arrivalWind.direction : 0;
      const avgHeadwind = calculateHeadwindComponent(
        arrWindDir,
        arrivalWind.speed,
        course
      );
      climbHeadwind = avgHeadwind;
      cruiseHeadwind = avgHeadwind;
      descentHeadwind = avgHeadwind;
    }
  }
  
  // Keep backward compatibility with legacy headwind variable
  const headwind = cruiseHeadwind;

  // Calculate flight time with proper altitude-based performance and phase-specific winds
  const climbTimeMin = cruiseAltitudeFt / config.climb_rate_fpm;
  const descentTimeMin = cruiseAltitudeFt / config.descent_rate_fpm;
  
  // Apply phase-specific winds to groundspeed calculations
  const climbAvgTAS = 320; // ktas average during climb (between 200 and 440)
  const descentAvgTAS = 370; // ktas average during descent (higher than climb, stepped down)
  
  // Calculate ground speeds with phase-specific headwinds
  const climbGroundSpeed = Math.max(50, climbAvgTAS - climbHeadwind);
  const descentGroundSpeed = Math.max(50, descentAvgTAS - descentHeadwind);
  
  const climbNM = (climbTimeMin / 60) * climbGroundSpeed;
  const descentNM = (descentTimeMin / 60) * descentGroundSpeed;
  
  const cruiseDistanceNM = Math.max(0, distanceNM * 1.05 - climbNM - descentNM);
  const cruiseSpeed = config.cruise_speed_ktas || 440; // Fallback to PC-24 default
  const cruiseGroundSpeed = Math.max(50, cruiseSpeed - cruiseHeadwind);
  const cruiseTimeMin = cruiseDistanceNM / cruiseGroundSpeed * 60;
  
  console.log(`✈️  CLIMB: ${climbTimeMin.toFixed(1)}min covering ${climbNM.toFixed(1)}nm @ ${climbGroundSpeed.toFixed(1)}kt GS (${climbAvgTAS}kt - ${climbHeadwind.toFixed(1)}kt headwind)`);
  console.log(`✈️  CRUISE: ${cruiseDistanceNM.toFixed(1)}nm @ ${cruiseGroundSpeed.toFixed(1)}kt GS (${cruiseSpeed}kt - ${cruiseHeadwind.toFixed(1)}kt headwind) = ${cruiseTimeMin.toFixed(1)}min`);
  console.log(`✈️  DESCENT: ${descentTimeMin.toFixed(1)}min covering ${descentNM.toFixed(1)}nm @ ${descentGroundSpeed.toFixed(1)}kt GS (${descentAvgTAS}kt - ${descentHeadwind.toFixed(1)}kt headwind)`);
  
  // Add taxi time (taxi-out + taxi-in = 2 operations per flight leg)
  const taxiTimeTotal = (config.taxi_time_per_airport_min ?? 0) * 2;
  console.log(`🚕 TAXI: ${taxiTimeTotal}min (${config.taxi_time_per_airport_min ?? 0}min × 2 airports)`);
  
  let totalMinutes = Math.round(climbTimeMin + cruiseTimeMin + descentTimeMin + weatherDelay + taxiTimeTotal);
  
  // Apply conservatism factor for long legs if configured
  const longLegThresholdNM = 500;
  const longLegTimeFactor = config.long_leg_time_factor ?? 1.0;
  
  // Only apply conservatism factor for long legs WITH HEADWINDS
  // Tailwind legs don't need the factor (or could use < 1.0)
  if (distanceNM > longLegThresholdNM && longLegTimeFactor !== 1.0 && headwind > 0) {
    const originalMinutes = totalMinutes;
    totalMinutes = Math.round(totalMinutes * longLegTimeFactor);
    console.log(`⚠️  LONG LEG HEADWIND FACTOR: ${originalMinutes}min × ${longLegTimeFactor} = ${totalMinutes}min (${distanceNM.toFixed(0)}nm, ${headwind.toFixed(0)}kt headwind)`);
  } else if (distanceNM > longLegThresholdNM && headwind < 0) {
    console.log(`✅  LONG LEG TAILWIND: No factor applied (${distanceNM.toFixed(0)}nm, ${Math.abs(headwind).toFixed(0)}kt tailwind)`);
  }
  
  return {
    minutes: totalMinutes,
    weatherDelay,
    headwind,
    cruiseAltitude: cruiseAltitudeFt,
    cruiseWinds: cruiseWinds,
    breakdown: {
      climbMinutes: Math.round(climbTimeMin),
      cruiseMinutes: Math.round(cruiseTimeMin),
      descentMinutes: Math.round(descentTimeMin),
      taxiMinutes: taxiTimeTotal
    },
    cruiseDetails: {
      cruiseTAS: cruiseSpeed,
      cruiseGroundSpeed: Math.round(cruiseGroundSpeed),
      cruiseDistanceNM: Math.round(cruiseDistanceNM)
    }
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
      hasTraffic: data.hasTrafficData,
      hasPolyline: !!data.polyline,
      polylineLength: data.polyline?.length
    });
      
      // Decode polyline to coordinates array
    const coordinates = data.polyline ? decodePolyline(data.polyline) : undefined;
    console.log(`  Decoded ${coordinates?.length || 0} coordinate points`);
      
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
