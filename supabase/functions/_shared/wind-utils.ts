/**
 * Shared wind calculation utilities for flight planning
 * Handles headwind/crosswind components, wind interpolation, and optimal altitude selection
 */

export interface WindsAloftData {
  altitude_ft: number;
  direction: number | 'VRB';
  speed_kts: number;
  temperature_c?: number;
}

/**
 * Calculate headwind component given wind direction, speed, and course
 * Positive value = headwind (slows aircraft down)
 * Negative value = tailwind (speeds aircraft up)
 * 
 * @param windDirection Wind direction in degrees (0-360) or 'VRB' for variable
 * @param windSpeed Wind speed in knots
 * @param course Aircraft true course in degrees (0-360)
 * @returns Headwind component in knots (+ = headwind, - = tailwind)
 */
export function calculateHeadwindComponent(
  windDirection: number | 'VRB',
  windSpeed: number,
  course: number
): number {
  if (windDirection === 'VRB' || windSpeed === 0) {
    return 0;
  }
  const angleDiff = ((windDirection - course + 180) % 360) - 180;
  return windSpeed * Math.cos(angleDiff * Math.PI / 180);
}

/**
 * Calculate crosswind component for runway operations
 * Used to check if crosswind exceeds aircraft limits
 * 
 * @param windDirection Wind direction in degrees (0-360) or 'VRB' for variable
 * @param windSpeed Wind speed in knots
 * @param runwayHeading Runway heading in degrees (0-360)
 * @returns Absolute crosswind component in knots
 */
export function calculateCrosswindComponent(
  windDirection: number | 'VRB',
  windSpeed: number,
  runwayHeading: number
): number {
  if (windDirection === 'VRB' || windSpeed === 0) {
    return 0;
  }
  const angleDiff = Math.abs(windDirection - runwayHeading);
  const effectiveAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff;
  return Math.abs(windSpeed * Math.sin(effectiveAngle * Math.PI / 180));
}

/**
 * Interpolate wind data between two altitude bands
 * Uses linear interpolation for direction and speed
 * 
 * @param lowerAltitude Lower altitude in feet
 * @param lowerWinds Wind data at lower altitude
 * @param upperAltitude Upper altitude in feet
 * @param upperWinds Wind data at upper altitude
 * @param targetAltitude Target altitude in feet
 * @returns Interpolated wind data
 */
export function interpolateWinds(
  lowerAltitude: number,
  lowerWinds: WindsAloftData,
  upperAltitude: number,
  upperWinds: WindsAloftData,
  targetAltitude: number
): WindsAloftData {
  if (lowerWinds.direction === 'VRB' || upperWinds.direction === 'VRB') {
    return {
      altitude_ft: targetAltitude,
      direction: 'VRB',
      speed_kts: 0,
      temperature_c: lowerWinds.temperature_c
    };
  }

  const ratio = (targetAltitude - lowerAltitude) / (upperAltitude - lowerAltitude);
  
  // Interpolate wind direction (handle wrap-around at 0/360)
  let dirDiff = (upperWinds.direction as number) - (lowerWinds.direction as number);
  if (dirDiff > 180) dirDiff -= 360;
  if (dirDiff < -180) dirDiff += 360;
  let interpolatedDir = (lowerWinds.direction as number) + dirDiff * ratio;
  if (interpolatedDir < 0) interpolatedDir += 360;
  if (interpolatedDir >= 360) interpolatedDir -= 360;
  
  // Interpolate wind speed
  const interpolatedSpeed = lowerWinds.speed_kts + 
    (upperWinds.speed_kts - lowerWinds.speed_kts) * ratio;
  
  // Interpolate temperature if available
  const interpolatedTemp = (lowerWinds.temperature_c !== undefined && 
                            upperWinds.temperature_c !== undefined)
    ? lowerWinds.temperature_c + (upperWinds.temperature_c - lowerWinds.temperature_c) * ratio
    : lowerWinds.temperature_c;

  return {
    altitude_ft: targetAltitude,
    direction: Math.round(interpolatedDir),
    speed_kts: Math.round(interpolatedSpeed),
    temperature_c: interpolatedTemp
  };
}

/**
 * Select optimal cruise altitude based on winds aloft data
 * Prefers altitudes with tailwinds or minimal headwinds
 * 
 * @param windsData Array of winds aloft data at different altitudes
 * @param course Aircraft true course in degrees
 * @param minAltitude Minimum acceptable altitude (from altitude rules)
 * @param maxAltitude Maximum acceptable altitude (from altitude rules)
 * @returns Object with selected altitude, wind data, headwind component, and reason
 */
export function selectOptimalCruiseAltitude(
  windsData: WindsAloftData[],
  course: number,
  minAltitude: number,
  maxAltitude: number
): {
  altitude: number;
  winds: WindsAloftData;
  headwind: number;
  reason: string;
} {
  // Filter winds to acceptable altitude range
  const acceptableWinds = windsData.filter(
    w => w.altitude_ft >= minAltitude && w.altitude_ft <= maxAltitude
  );

  if (acceptableWinds.length === 0) {
    // No wind data in range, use middle of range
    const midAltitude = Math.round((minAltitude + maxAltitude) / 2);
    return {
      altitude: midAltitude,
      winds: { altitude_ft: midAltitude, direction: 'VRB', speed_kts: 0 },
      headwind: 0,
      reason: 'No winds aloft data available, using mid-range altitude'
    };
  }

  // Calculate headwind for each altitude
  const altitudesWithHeadwind = acceptableWinds.map(w => ({
    ...w,
    headwind: calculateHeadwindComponent(w.direction, w.speed_kts, course)
  }));

  // Sort by headwind (most negative = best tailwind)
  altitudesWithHeadwind.sort((a, b) => a.headwind - b.headwind);

  const best = altitudesWithHeadwind[0];
  const reason = best.headwind < 0
    ? `Selected for ${Math.abs(best.headwind).toFixed(0)}kt tailwind`
    : `Selected for minimal ${best.headwind.toFixed(0)}kt headwind`;

  return {
    altitude: best.altitude_ft,
    winds: {
      altitude_ft: best.altitude_ft,
      direction: best.direction,
      speed_kts: best.speed_kts,
      temperature_c: best.temperature_c
    },
    headwind: best.headwind,
    reason
  };
}

/**
 * Average multiple wind samples (vector average)
 * Used to calculate average winds along a route or flight phase
 * 
 * @param windSamples Array of wind data samples
 * @returns Average wind direction and speed
 */
export function averageWinds(windSamples: WindsAloftData[]): WindsAloftData {
  if (windSamples.length === 0) {
    return { altitude_ft: 0, direction: 'VRB', speed_kts: 0 };
  }

  // Filter out variable winds
  const validWinds = windSamples.filter(w => w.direction !== 'VRB');
  if (validWinds.length === 0) {
    return { altitude_ft: 0, direction: 'VRB', speed_kts: 0 };
  }

  // Vector average: sum up u and v components
  let sumU = 0;
  let sumV = 0;
  validWinds.forEach(w => {
    const dir = w.direction as number;
    const rad = dir * Math.PI / 180;
    sumU += w.speed_kts * Math.sin(rad);
    sumV += w.speed_kts * Math.cos(rad);
  });

  const avgU = sumU / validWinds.length;
  const avgV = sumV / validWinds.length;

  // Convert back to direction and speed
  let avgDir = Math.atan2(avgU, avgV) * 180 / Math.PI;
  if (avgDir < 0) avgDir += 360;
  const avgSpeed = Math.sqrt(avgU * avgU + avgV * avgV);

  const avgAlt = validWinds.reduce((sum, w) => sum + w.altitude_ft, 0) / validWinds.length;

  return {
    altitude_ft: Math.round(avgAlt),
    direction: Math.round(avgDir),
    speed_kts: Math.round(avgSpeed)
  };
}
