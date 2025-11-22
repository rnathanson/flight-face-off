import { parseMETAR, getWeatherDelayMinutes } from './metar-parser.ts';
import { fetchAverageWindsAlongRoute } from './winds-aloft-fetcher.ts';
import { calculateCourse } from './geo-utils.ts';
import { calculateHeadwindComponent } from './wind-utils.ts';

export interface FlightTimeResult {
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
}

/**
 * Parse wind information from TAF string
 */
function parseTAFWind(tafString: string): { direction: number | 'VRB'; speed: number } | null {
  if (!tafString) return null;
  
  const windMatch = tafString.match(/(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/);
  if (windMatch) {
    return {
      direction: windMatch[1] === 'VRB' ? 'VRB' : parseInt(windMatch[1], 10),
      speed: parseInt(windMatch[2], 10)
    };
  }
  return null;
}

/**
 * Calculate detailed flight time with climb/cruise/descent phases and multi-altitude winds
 */
export async function calculateFlightTime(
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
): Promise<FlightTimeResult> {
  // Calculate hours until departure for forecast selection
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
    else forecastHours = 0;
    
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
    const tafWind = parseTAFWind(arrivalData.taf.raw);
    if (tafWind) {
      arrivalWind = tafWind;
    }
    if (arrivalData?.metar) {
      arrivalMetar = parseMETAR(arrivalData.metar.raw);
      if (arrivalMetar) {
        weatherDelay += getWeatherDelayMinutes(arrivalMetar) * 0.7;
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
    // Define altitude bands for climb phase
    const climbBands = [
      { altitude: 6000, timeMinutes: 2.0 },
      { altitude: 12000, timeMinutes: 2.0 },
      { altitude: 18000, timeMinutes: 2.0 },
      { altitude: 24000, timeMinutes: 2.3 },
      { altitude: 34000, timeMinutes: 3.8 },
      { altitude: Math.min(cruiseAltitudeFt, 45000), timeMinutes: 4.9 }
    ].filter(band => band.altitude <= cruiseAltitudeFt);
    
    // Define altitude bands for descent phase
    const descentBands = [
      { altitude: Math.min(cruiseAltitudeFt, 45000), timeMinutes: 5.5 },
      { altitude: 34000, timeMinutes: 4.2 },
      { altitude: 24000, timeMinutes: 2.9 },
      { altitude: 18000, timeMinutes: 2.9 },
      { altitude: 12000, timeMinutes: 2.9 },
      { altitude: 6000, timeMinutes: 2.9 }
    ].filter(band => band.altitude <= cruiseAltitudeFt);
    
    console.log(`🌬️ Fetching multi-altitude wind profile:`);
    console.log(`   Climb bands: ${climbBands.map(b => `${b.altitude}ft`).join(', ')}`);
    console.log(`   Cruise: ${cruiseAltitudeFt}ft`);
    console.log(`   Descent bands: ${descentBands.map(b => `${b.altitude}ft`).join(', ')}`);
    
    // Fetch winds for all phases in parallel
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
    
    const cruiseWindPromise = fetchAverageWindsAlongRoute(
      windSampleWaypoints,
      cruiseAltitudeFt,
      distanceNM,
      climbPhaseNM,
      descentPhaseNM,
      forecastHours
    );
    
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
    
    // Fallback to surface winds
    if (departureMetar && arrivalWind) {
      const depWindDir = typeof departureMetar.wind.direction === 'number' ? departureMetar.wind.direction : 0;
      const arrWindDir = typeof arrivalWind.direction === 'number' ? arrivalWind.direction : 0;
      
      const depHeadwind = calculateHeadwindComponent(depWindDir, departureMetar.wind.speed, course);
      const arrHeadwind = calculateHeadwindComponent(arrWindDir, arrivalWind.speed, course);
      const avgHeadwind = (depHeadwind + arrHeadwind) / 2;
      
      climbHeadwind = avgHeadwind;
      cruiseHeadwind = avgHeadwind;
      descentHeadwind = avgHeadwind;
    } else if (departureMetar) {
      const depWindDir = typeof departureMetar.wind.direction === 'number' ? departureMetar.wind.direction : 0;
      const avgHeadwind = calculateHeadwindComponent(depWindDir, departureMetar.wind.speed, course);
      climbHeadwind = avgHeadwind;
      cruiseHeadwind = avgHeadwind;
      descentHeadwind = avgHeadwind;
    } else if (arrivalWind) {
      const arrWindDir = typeof arrivalWind.direction === 'number' ? arrivalWind.direction : 0;
      const avgHeadwind = calculateHeadwindComponent(arrWindDir, arrivalWind.speed, course);
      climbHeadwind = avgHeadwind;
      cruiseHeadwind = avgHeadwind;
      descentHeadwind = avgHeadwind;
    }
  }
  
  const headwind = cruiseHeadwind;

  // Calculate flight time with phase-specific performance
  const climbTimeMin = cruiseAltitudeFt / config.climb_rate_fpm;
  const descentTimeMin = cruiseAltitudeFt / config.descent_rate_fpm;
  
  const climbAvgTAS = 320;
  const descentAvgTAS = 370;
  
  const climbGroundSpeed = Math.max(50, climbAvgTAS - climbHeadwind);
  const descentGroundSpeed = Math.max(50, descentAvgTAS - descentHeadwind);
  
  const climbNM = (climbTimeMin / 60) * climbGroundSpeed;
  const descentNM = (descentTimeMin / 60) * descentGroundSpeed;
  
  const cruiseDistanceNM = Math.max(0, distanceNM * 1.05 - climbNM - descentNM);
  const cruiseSpeed = config.cruise_speed_ktas || 440;
  const cruiseGroundSpeed = Math.max(50, cruiseSpeed - cruiseHeadwind);
  const cruiseTimeMin = cruiseDistanceNM / cruiseGroundSpeed * 60;
  
  console.log(`✈️  CLIMB: ${climbTimeMin.toFixed(1)}min covering ${climbNM.toFixed(1)}nm @ ${climbGroundSpeed.toFixed(1)}kt GS (${climbAvgTAS}kt - ${climbHeadwind.toFixed(1)}kt headwind)`);
  console.log(`✈️  CRUISE: ${cruiseDistanceNM.toFixed(1)}nm @ ${cruiseGroundSpeed.toFixed(1)}kt GS (${cruiseSpeed}kt - ${cruiseHeadwind.toFixed(1)}kt headwind) = ${cruiseTimeMin.toFixed(1)}min`);
  console.log(`✈️  DESCENT: ${descentTimeMin.toFixed(1)}min covering ${descentNM.toFixed(1)}nm @ ${descentGroundSpeed.toFixed(1)}kt GS (${descentAvgTAS}kt - ${descentHeadwind.toFixed(1)}kt headwind)`);
  
  const taxiTimeTotal = (config.taxi_time_per_airport_min ?? 0) * 2;
  console.log(`🚕 TAXI: ${taxiTimeTotal}min (${config.taxi_time_per_airport_min ?? 0}min × 2 airports)`);
  
  let totalMinutes = Math.round(climbTimeMin + cruiseTimeMin + descentTimeMin + weatherDelay + taxiTimeTotal);
  
  // Apply conservatism factor for long legs with headwinds
  const longLegThresholdNM = 500;
  const longLegTimeFactor = config.long_leg_time_factor ?? 1.0;
  
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
