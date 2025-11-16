export interface TAFPeriod {
  validFrom: Date;
  validTo: Date;
  wind?: {
    direction: number | 'VRB';
    speed: number;
    gust?: number;
  };
  visibility?: string;
  ceiling?: number;
  raw: string;
}

/**
 * Parse TAF into time-bounded forecast periods
 * Handles base conditions, FM (FROM), TEMPO, BECMG
 */
export function parseTAFPeriods(tafRaw: string): TAFPeriod[] {
  const periods: TAFPeriod[] = [];
  
  // Extract valid period (e.g., "1612/1712" = 16th 12Z to 17th 12Z)
  const validMatch = tafRaw.match(/(\d{4})\/(\d{4})/);
  if (!validMatch) {
    console.log('⚠️ No valid period found in TAF, using current time as base');
    return [];
  }
  
  const validFromStr = validMatch[1]; // e.g., "1612"
  const validToStr = validMatch[2];   // e.g., "1712"
  
  const baseValidFrom = parseTAFTime(validFromStr);
  const baseValidTo = parseTAFTime(validToStr);
  
  // Extract base conditions (everything before first FM/TEMPO/BECMG)
  const baseConditionsMatch = tafRaw.match(/(\d{4})\/(\d{4})\s+(.*?)(?=\s+(?:FM|TEMPO|BECMG)\d{6}|$)/s);
  const baseConditions = baseConditionsMatch ? baseConditionsMatch[3].trim() : '';
  
  // Base period
  periods.push({
    validFrom: baseValidFrom,
    validTo: baseValidTo,
    wind: extractWindFromSegment(baseConditions),
    visibility: extractVisibilityFromSegment(baseConditions),
    ceiling: extractCeilingFromSegment(baseConditions),
    raw: baseConditions
  });
  
  // Parse FM groups (FROM - replaces all previous conditions)
  const fmPattern = /FM(\d{6})\s+(.*?)(?=\s+(?:FM|TEMPO|BECMG)\d{6}|$)/gs;
  let fmMatch;
  
  while ((fmMatch = fmPattern.exec(tafRaw)) !== null) {
    const fmTime = parseTAFTime(fmMatch[1]);
    const fmConditions = fmMatch[2].trim();
    
    periods.push({
      validFrom: fmTime,
      validTo: baseValidTo, // FM extends to end of TAF unless overridden
      wind: extractWindFromSegment(fmConditions),
      visibility: extractVisibilityFromSegment(fmConditions),
      ceiling: extractCeilingFromSegment(fmConditions),
      raw: `FM${fmMatch[1]} ${fmConditions}`
    });
  }
  
  // Sort periods by validFrom
  periods.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  
  console.log(`📅 Parsed ${periods.length} TAF periods`);
  if (periods.length > 0) {
    periods.forEach((p, i) => {
      console.log(`  Period ${i + 1}: ${p.validFrom.toISOString()} to ${p.validTo.toISOString()} - Wind: ${p.wind?.direction}° at ${p.wind?.speed}kt`);
    });
  }
  
  return periods;
}

/**
 * Find the TAF period that is valid for the target time
 */
export function findRelevantTafPeriod(periods: TAFPeriod[], targetTime: Date): TAFPeriod | null {
  if (periods.length === 0) {
    return null;
  }
  
  // Find period where targetTime falls within validFrom and validTo
  for (let i = periods.length - 1; i >= 0; i--) {
    const period = periods[i];
    if (targetTime >= period.validFrom && targetTime <= period.validTo) {
      console.log(`✓ Selected TAF period valid from ${period.validFrom.toISOString()} to ${period.validTo.toISOString()}`);
      return period;
    }
  }
  
  // If no exact match, use the last period (most recent forecast)
  console.log(`⚠️ Target time outside TAF valid periods, using latest period`);
  return periods[periods.length - 1];
}

/**
 * Parse TAF timestamp like "161200" or "1612" to Date
 * Assumes current month/year
 */
function parseTAFTime(timeStr: string): Date {
  const now = new Date();
  const day = parseInt(timeStr.substring(0, 2), 10);
  const hour = parseInt(timeStr.substring(2, 4), 10);
  const minute = timeStr.length >= 6 ? parseInt(timeStr.substring(4, 6), 10) : 0;
  
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minute));
}

function extractWindFromSegment(segment: string): { direction: number | 'VRB'; speed: number; gust?: number } | undefined {
  // Variable winds
  const vrbMatch = segment.match(/\bVRB(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (vrbMatch) {
    return {
      direction: 'VRB',
      speed: parseInt(vrbMatch[1], 10),
      gust: vrbMatch[2] ? parseInt(vrbMatch[2], 10) : undefined
    };
  }
  
  // Calm winds
  if (/\b00000KT\b/.test(segment)) {
    return { direction: 0, speed: 0 };
  }
  
  // Standard winds
  const windMatch = segment.match(/\b(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (windMatch) {
    return {
      direction: parseInt(windMatch[1], 10),
      speed: parseInt(windMatch[2], 10),
      gust: windMatch[3] ? parseInt(windMatch[3], 10) : undefined
    };
  }
  
  return undefined;
}

function extractVisibilityFromSegment(segment: string): string | undefined {
  const visMatch = segment.match(/\b(P6SM|([0-9\/]+)SM)\b/);
  return visMatch ? visMatch[1] : undefined;
}

function extractCeilingFromSegment(segment: string): number | undefined {
  // Find lowest BKN or OVC layer
  const cloudPattern = /\b(BKN|OVC)(\d{3})\b/g;
  let match;
  let lowestCeiling: number | undefined = undefined;
  
  while ((match = cloudPattern.exec(segment)) !== null) {
    const ceilingFt = parseInt(match[2], 10) * 100;
    if (lowestCeiling === undefined || ceilingFt < lowestCeiling) {
      lowestCeiling = ceilingFt;
    }
  }
  
  return lowestCeiling;
}
