export interface FlightOpsConfig {
  cruise_speed_ktas: number;
  climb_rate_fpm: number;
  descent_rate_fpm: number;
  speed_below_fl100_kias: number;
  speed_above_fl100_kias: number;
  altitude_rules: {
    under_100nm: { min_ft: number; max_ft: number };
    '100_to_350nm': { min_ft: number; max_ft: number };
    over_350nm: { min_ft: number; max_ft: number };
  };
  taxi_time_major_airport_min: number;
  taxi_time_regional_airport_min: number;
  taxi_time_private_fbo_min: number;
  takeoff_landing_buffer_min: number;
}

export interface FlightCalculationResult {
  totalTimeMinutes: number;
  segments: {
    climbTimeMin: number;
    cruiseTimeMin: number;
    descentTimeMin: number;
    taxiTimeMin: number;
    bufferTimeMin: number;
  };
  distances: {
    totalNM: number;
    climbNM: number;
    cruiseNM: number;
    descentNM: number;
  };
  altitudes: {
    cruiseAltitudeFt: number;
    cruiseLevel: string;
  };
  speeds: {
    climbAvgKIAS: number;
    cruiseKTAS: number;
    descentAvgKIAS: number;
  };
  fuelBurnLbs: number;
}

export interface FlightSegment {
  phase: 'climb' | 'cruise' | 'descent';
  altitude: number;
  distanceNM: number;
  timeMinutes: number;
  speedKts: number;
}

export function calculateRealisticFlightTime(
  distanceNM: number,
  config: FlightOpsConfig,
  headwindKts: number = 0,  // Legacy parameter: defaults to applying same wind to all phases
  originAirportSize: 'major' | 'regional' | 'private' = 'regional',
  destAirportSize: 'major' | 'regional' | 'private' = 'regional',
  routeDistanceNM?: number, // Actual route distance if available
  climbHeadwindKts?: number,  // Optional: specific headwind for climb phase
  cruiseHeadwindKts?: number, // Optional: specific headwind for cruise phase
  descentHeadwindKts?: number // Optional: specific headwind for descent phase
): FlightCalculationResult {
  // Use phase-specific winds if provided, otherwise use legacy single headwind for all phases
  const climbWind = climbHeadwindKts !== undefined ? climbHeadwindKts : headwindKts;
  const cruiseWind = cruiseHeadwindKts !== undefined ? cruiseHeadwindKts : headwindKts;
  const descentWind = descentHeadwindKts !== undefined ? descentHeadwindKts : headwindKts;
  // Use actual route distance if provided, otherwise add routing factor
  const actualDistanceNM = routeDistanceNM || (distanceNM * 1.05); // 5% routing factor
  
  // Determine cruise altitude based on distance
  let cruiseAltitudeFt: number;
  let cruiseLevel: string;

  if (actualDistanceNM < 100) {
    cruiseAltitudeFt = config.altitude_rules.under_100nm.max_ft;
    cruiseLevel = `${Math.round(cruiseAltitudeFt / 100)}`;
  } else if (actualDistanceNM < 350) {
    cruiseAltitudeFt = config.altitude_rules['100_to_350nm'].max_ft;
    cruiseLevel = `FL${Math.round(cruiseAltitudeFt / 100)}`;
  } else {
    cruiseAltitudeFt = config.altitude_rules.over_350nm.max_ft;
    cruiseLevel = `FL${Math.round(cruiseAltitudeFt / 100)}`;
  }

  // Calculate climb segment with phase-specific wind
  const climbTimeMin = cruiseAltitudeFt / config.climb_rate_fpm;
  
  // PC24-specific climb profile: 100nm in 17 minutes to FL450
  // Below 10,000 ft: ~3.5 minutes
  // Above 10,000 ft: ~13.5 minutes
  const timeBelow10k = Math.min(climbTimeMin, 10000 / 3000); // ~3.5 min at 3000 fpm
  const timeAbove10k = Math.max(0, climbTimeMin - timeBelow10k);
  
  // PC24 climbs at higher speeds than generic aircraft
  const avgTASBelow10k = 180; // Faster acceleration
  const avgTASAbove10k = 400; // High-speed climb
  
  // Apply climb headwind to ground speeds
  const avgGSBelow10k = Math.max(50, avgTASBelow10k - climbWind);
  const avgGSAbove10k = Math.max(50, avgTASAbove10k - climbWind);
  
  const climbDistanceBelow10k = (avgGSBelow10k * timeBelow10k) / 60;
  const climbDistanceAbove10k = (avgGSAbove10k * timeAbove10k) / 60;
  const climbNM = climbDistanceBelow10k + climbDistanceAbove10k;

  // Calculate descent segment with phase-specific wind
  const descentTimeMin = cruiseAltitudeFt / config.descent_rate_fpm;
  
  // PC24-specific descent profile: 150nm in 22 minutes from FL450
  // Above 10,000 ft: ~17 minutes
  // Below 10,000 ft: ~5 minutes
  const timeDescentAbove10k = Math.min(descentTimeMin, (cruiseAltitudeFt - 10000) / 2060);
  const timeDescentBelow10k = Math.max(0, descentTimeMin - timeDescentAbove10k);
  
  // PC24 descends at high speeds
  const avgTASDescentAbove10k = 420; // High-speed descent from cruise
  const avgTASDescentBelow10k = 360; // Still fast below 10k
  
  // Apply descent headwind to ground speeds
  const avgGSDescentAbove10k = Math.max(50, avgTASDescentAbove10k - descentWind);
  const avgGSDescentBelow10k = Math.max(50, avgTASDescentBelow10k - descentWind);
  
  const descentDistanceAbove10k = (avgGSDescentAbove10k * timeDescentAbove10k) / 60;
  const descentDistanceBelow10k = (avgGSDescentBelow10k * timeDescentBelow10k) / 60;
  const descentNM = descentDistanceAbove10k + descentDistanceBelow10k;

  // Calculate cruise segment with phase-specific wind
  const cruiseNM = Math.max(0, actualDistanceNM - climbNM - descentNM); // Use actual route distance
  const cruiseGroundSpeed = Math.max(50, config.cruise_speed_ktas - cruiseWind);
  const cruiseTimeMin = (cruiseNM / cruiseGroundSpeed) * 60;

  // Taxi time based on airport size
  let taxiTimeMin: number;
  switch (originAirportSize) {
    case 'major':
      taxiTimeMin = config.taxi_time_major_airport_min;
      break;
    case 'regional':
      taxiTimeMin = config.taxi_time_regional_airport_min;
      break;
    case 'private':
      taxiTimeMin = config.taxi_time_private_fbo_min;
      break;
  }

  // Add destination airport taxi time (typically shorter)
  switch (destAirportSize) {
    case 'major':
      taxiTimeMin += config.taxi_time_major_airport_min * 0.7;
      break;
    case 'regional':
      taxiTimeMin += config.taxi_time_regional_airport_min * 0.7;
      break;
    case 'private':
      taxiTimeMin += config.taxi_time_private_fbo_min * 0.7;
      break;
  }

  // Buffer time for takeoff and landing
  const bufferTimeMin = config.takeoff_landing_buffer_min;

  // Total flight time
  const totalTimeMinutes = climbTimeMin + cruiseTimeMin + descentTimeMin + taxiTimeMin + bufferTimeMin;

  // Estimate fuel burn (simplified)
  // PC24 burns approximately 900 lbs/hr at cruise
  const cruiseHours = cruiseTimeMin / 60;
  const climbDescentHours = (climbTimeMin + descentTimeMin) / 60;
  const fuelBurnLbs = (cruiseHours * 900) + (climbDescentHours * 1100); // Higher burn during climb

  return {
    totalTimeMinutes,
    segments: {
      climbTimeMin,
      cruiseTimeMin,
      descentTimeMin,
      taxiTimeMin,
      bufferTimeMin
    },
    distances: {
      totalNM: distanceNM * 1.05,
      climbNM,
      cruiseNM,
      descentNM
    },
    altitudes: {
      cruiseAltitudeFt,
      cruiseLevel
    },
    speeds: {
      climbAvgKIAS: (avgTASBelow10k + avgTASAbove10k) / 2,
      cruiseKTAS: config.cruise_speed_ktas,
      descentAvgKIAS: (avgTASDescentAbove10k + avgTASDescentBelow10k) / 2
    },
    fuelBurnLbs
  };
}

export function calculateHeadwindComponent(
  windDirection: number | 'VRB',
  windSpeed: number,
  courseDirection: number
): number {
  if (windDirection === 'VRB' || windSpeed === 0) {
    return 0;
  }

  // Calculate angle difference
  let angleDiff = Math.abs(windDirection - courseDirection);
  if (angleDiff > 180) {
    angleDiff = 360 - angleDiff;
  }

  // Headwind component (positive = headwind, negative = tailwind)
  const headwind = windSpeed * Math.cos((angleDiff * Math.PI) / 180);
  
  return Math.round(headwind);
}

export function estimateAirportSize(
  airportCode: string,
  runwayCount: number,
  longestRunwayFt: number
): 'major' | 'regional' | 'private' {
  // Major airports
  const majorAirports = ['JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'DEN', 'SFO', 'LAS', 'PHX', 'IAH', 'MIA', 'EWR', 'BOS', 'MCO', 'SEA'];
  if (majorAirports.some(code => airportCode.includes(code))) {
    return 'major';
  }

  // Use runway characteristics
  if (runwayCount >= 3 || longestRunwayFt > 10000) {
    return 'major';
  } else if (runwayCount >= 2 || longestRunwayFt > 6000) {
    return 'regional';
  } else {
    return 'private';
  }
}
