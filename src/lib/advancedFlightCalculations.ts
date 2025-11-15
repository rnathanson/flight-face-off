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
  headwindKts: number = 0,
  originAirportSize: 'major' | 'regional' | 'private' = 'regional',
  destAirportSize: 'major' | 'regional' | 'private' = 'regional',
  routeDistanceNM?: number // Actual route distance if available
): FlightCalculationResult {
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

  // Calculate climb segment
  const climbTimeMin = cruiseAltitudeFt / config.climb_rate_fpm;
  
  // Average speed during climb (acceleration from 0 to cruise)
  // Below 10,000 ft: limited to 250 KIAS
  // Above 10,000 ft: accelerating to cruise speed
  const timeBelow10k = Math.min(climbTimeMin, 10000 / config.climb_rate_fpm);
  const timeAbove10k = Math.max(0, climbTimeMin - timeBelow10k);
  
  const avgSpeedBelow10k = config.speed_below_fl100_kias * 0.7; // Average during acceleration
  const avgSpeedAbove10k = (config.speed_above_fl100_kias + config.cruise_speed_ktas) / 2;
  
  const climbDistanceBelow10k = (avgSpeedBelow10k * timeBelow10k) / 60;
  const climbDistanceAbove10k = (avgSpeedAbove10k * timeAbove10k) / 60;
  const climbNM = climbDistanceBelow10k + climbDistanceAbove10k;

  // Calculate descent segment
  const descentTimeMin = cruiseAltitudeFt / config.descent_rate_fpm;
  
  // Average speed during descent
  const timeDescentAbove10k = Math.min(descentTimeMin, (cruiseAltitudeFt - 10000) / config.descent_rate_fpm);
  const timeDescentBelow10k = Math.max(0, descentTimeMin - timeDescentAbove10k);
  
  const avgSpeedDescentAbove10k = (config.cruise_speed_ktas + config.speed_above_fl100_kias) / 2;
  const avgSpeedDescentBelow10k = config.speed_below_fl100_kias * 0.85;
  
  const descentDistanceAbove10k = (avgSpeedDescentAbove10k * timeDescentAbove10k) / 60;
  const descentDistanceBelow10k = (avgSpeedDescentBelow10k * timeDescentBelow10k) / 60;
  const descentNM = descentDistanceAbove10k + descentDistanceBelow10k;

  // Calculate cruise segment
  const cruiseNM = Math.max(0, actualDistanceNM - climbNM - descentNM); // Use actual route distance
  const cruiseGroundSpeed = config.cruise_speed_ktas - headwindKts;
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
  // PC-24 burns approximately 900 lbs/hr at cruise
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
      climbAvgKIAS: (avgSpeedBelow10k + avgSpeedAbove10k) / 2,
      cruiseKTAS: config.cruise_speed_ktas,
      descentAvgKIAS: (avgSpeedDescentAbove10k + avgSpeedDescentBelow10k) / 2
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
