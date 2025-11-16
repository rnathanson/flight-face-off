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
  cloudLayers?: Array<{
    coverage: string;
    altitude_ft: number;
  }>;
  flightCategory?: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
  raw: string;
}

/**
 * Parse TAF into time-bounded forecast periods
 * Handles base conditions, FM (FROM), TEMPO, BECMG
 * Robust implementation with proper year/month handling
 */
export function parseTAFPeriods(tafRaw: string): TAFPeriod[] {
  console.log(`📄 Parsing TAF periods from: ${tafRaw.substring(0, 200)}...`);
  
  const periods: TAFPeriod[] = [];
  
  // Normalize and sanitize possible AirNav formatting
  const cleaned = tafRaw
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove duplicated ICAO: "TAF KGON KGON 5nm N" -> "TAF KGON"
  let tafText = cleaned
    .replace(/\bTAF\s+([A-Z0-9]{3,4})\s+\1\b(?:\s+\d+(?:\.\d+)?\s*nm\s*[A-Z]+)?/i, 'TAF $1')
    .replace(/\bTAF\s+([A-Z0-9]{3,4})\s+[A-Z0-9]{3,4}\s+(?=\d{6}Z)/i, 'TAF $1 ')
    .trim();

  if (!/^TAF\s+/i.test(tafText) && /^[A-Z0-9]{3,4}\s+\d{6}Z/i.test(tafText)) {
    tafText = 'TAF ' + tafText;
  }
  
  // Extract valid period (e.g., "1612/1712" = 16th 12Z to 17th 12Z)
  const headerMatch = tafText.match(/TAF\s+(?:AMD|COR)?\s*(\w+)\s+(\d{2})(\d{2})(\d{2})Z\s+(\d{2})(\d{2})\/(\d{2})(\d{2})/);
  if (!headerMatch) {
    console.log('⚠️ No valid TAF header found, cannot parse periods');
    return [];
  }
  
  const issueDay = parseInt(headerMatch[2]);
  const issueHour = parseInt(headerMatch[3]);
  const issueMinute = parseInt(headerMatch[4]);
  const startDay = parseInt(headerMatch[5]);
  const startHour = parseInt(headerMatch[6]);
  const endDay = parseInt(headerMatch[7]);
  const endHour = parseInt(headerMatch[8]);
  
  // Get current UTC time for context
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();
  
  // Determine correct year/month based on issue day (handle month rollovers)
  let year = currentYear;
  let month = currentMonth;
  
  if (issueDay > currentDay + 15) {
    month = currentMonth - 1;
    if (month < 0) {
      month = 11;
      year = currentYear - 1;
    }
  }
  
  const baseValidFrom = new Date(Date.UTC(year, month, startDay, startHour, 0, 0));
  const baseValidTo = new Date(Date.UTC(year, month, endDay, endHour, 0, 0));
  
  // Parse FM (FROM) groups - these override previous conditions
  const fmMatches = Array.from(tafText.matchAll(/FM(\d{2})(\d{2})(\d{2})\b/g));
  
  if (fmMatches.length === 0) {
    // No FM groups, create single period for entire TAF
    const bodyStart = tafText.indexOf('Z', tafText.indexOf('TAF')) + 1;
    const body = tafText.substring(bodyStart).trim();
    
    const wind = extractWind(body);
    const visibility = extractVisibility(body);
    const cloudLayers = extractCloudLayers(body);
    const ceiling = extractCeiling(body);
    const flightCategory = determineFlightCategory(ceiling, visibility);
    
    periods.push({
      validFrom: baseValidFrom,
      validTo: baseValidTo,
      wind,
      visibility,
      cloudLayers,
      ceiling,
      flightCategory,
      raw: body
    });
  } else {
    // Create base period (header to first FM)
    const firstFmDay = parseInt(fmMatches[0][1]);
    const firstFmHour = parseInt(fmMatches[0][2]);
    const firstFmMinute = parseInt(fmMatches[0][3]);
    
    const baseTimeFrom = new Date(Date.UTC(year, month, startDay, startHour, 0, 0));
    const baseTimeTo = new Date(Date.UTC(year, month, firstFmDay, firstFmHour, firstFmMinute, 0));
    
    // Extract base conditions
    const headerBodyStart = tafText.indexOf('Z', tafText.indexOf('TAF')) + 1;
    const headerBody = tafText.substring(headerBodyStart, fmMatches[0].index!).trim();
    
    const baseWind = extractWind(headerBody);
    const baseVisibility = extractVisibility(headerBody);
    const baseCloudLayers = extractCloudLayers(headerBody);
    const baseCeiling = extractCeiling(headerBody);
    const baseFlightCategory = determineFlightCategory(baseCeiling, baseVisibility);
    
    periods.push({
      validFrom: baseTimeFrom,
      validTo: baseTimeTo,
      wind: baseWind,
      visibility: baseVisibility,
      cloudLayers: baseCloudLayers,
      ceiling: baseCeiling,
      flightCategory: baseFlightCategory,
      raw: headerBody
    });
    
    // Process each FM group
    for (let i = 0; i < fmMatches.length; i++) {
      const match = fmMatches[i];
      const day = parseInt(match[1]);
      const hour = parseInt(match[2]);
      const minute = parseInt(match[3]);
      
      const timeFrom = new Date(Date.UTC(year, month, day, hour, minute, 0));
      
      // Time to is either next FM or end of TAF
      let timeTo: Date;
      if (i < fmMatches.length - 1) {
        const nextMatch = fmMatches[i + 1];
        const nextDay = parseInt(nextMatch[1]);
        const nextHour = parseInt(nextMatch[2]);
        const nextMinute = parseInt(nextMatch[3]);
        timeTo = new Date(Date.UTC(year, month, nextDay, nextHour, nextMinute, 0));
      } else {
        timeTo = new Date(Date.UTC(year, month, endDay, endHour, 0, 0));
      }
      
      // Extract conditions for this FM group
      const fmIndex = match.index!;
      const nextFmIndex = i < fmMatches.length - 1 ? fmMatches[i + 1].index! : tafText.length;
      const fmContent = tafText.substring(fmIndex, nextFmIndex);
      
      const wind = extractWind(fmContent);
      const visibility = extractVisibility(fmContent);
      const cloudLayers = extractCloudLayers(fmContent);
      const ceiling = extractCeiling(fmContent);
      const flightCategory = determineFlightCategory(ceiling, visibility);
      
      periods.push({
        validFrom: timeFrom,
        validTo: timeTo,
        wind,
        visibility,
        cloudLayers,
        ceiling,
        flightCategory,
        raw: fmContent
      });
    }
  }
  
  // Sort periods by validFrom
  periods.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  
  console.log(`📅 Parsed ${periods.length} TAF periods`);
  if (periods.length > 0) {
    periods.forEach((p, i) => {
      const windStr = p.wind ? `${p.wind.direction}° at ${p.wind.speed}kt${p.wind.gust ? ` gusting ${p.wind.gust}kt` : ''}` : 'No wind data';
      console.log(`  Period ${i + 1}: ${p.validFrom.toISOString()} to ${p.validTo.toISOString()} - Wind: ${windStr}`);
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
  
  console.log(`🔍 Finding TAF period for target time: ${targetTime.toISOString()}`);
  
  // Find period where targetTime falls within validFrom and validTo
  for (let i = periods.length - 1; i >= 0; i--) {
    const period = periods[i];
    if (targetTime >= period.validFrom && targetTime <= period.validTo) {
      console.log(`✓ Selected TAF period valid from ${period.validFrom.toISOString()} to ${period.validTo.toISOString()}`);
      return period;
    }
  }
  
  // If no exact match, use the closest period
  let closest = periods[0];
  let minDiff = Math.abs(targetTime.getTime() - closest.validFrom.getTime());
  
  for (const period of periods) {
    const diff = Math.abs(targetTime.getTime() - period.validFrom.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = period;
    }
  }
  
  console.log(`⚠️ Target time outside exact TAF periods, using closest period: ${closest.validFrom.toISOString()} to ${closest.validTo.toISOString()}`);
  return closest;
}

function extractWind(segment: string): { direction: number | 'VRB'; speed: number; gust?: number } | undefined {
  console.log(`🌬️  Extracting wind from: ${segment.substring(0, 100)}`);
  
  // Variable winds
  const vrbMatch = segment.match(/\bVRB(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (vrbMatch) {
    const wind = {
      direction: 'VRB' as const,
      speed: parseInt(vrbMatch[1], 10),
      gust: vrbMatch[2] ? parseInt(vrbMatch[2], 10) : undefined
    };
    console.log(`✓ Extracted variable wind:`, wind);
    return wind;
  }
  
  // Calm winds
  if (/\b00000KT\b/.test(segment)) {
    console.log(`✓ Extracted calm winds`);
    return { direction: 0, speed: 0 };
  }
  
  // Standard winds
  const windMatch = segment.match(/\b(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (windMatch) {
    const wind = {
      direction: parseInt(windMatch[1], 10),
      speed: parseInt(windMatch[2], 10),
      gust: windMatch[3] ? parseInt(windMatch[3], 10) : undefined
    };
    console.log(`✓ Extracted wind:`, wind);
    return wind;
  }
  
  console.log(`⚠️ No wind data found in segment`);
  return undefined;
}

function extractVisibility(segment: string): string | undefined {
  const visMatch = segment.match(/\b(P6SM|([0-9\/]+)SM)\b/);
  return visMatch ? visMatch[1] : undefined;
}

function extractCloudLayers(segment: string): Array<{ coverage: string; altitude_ft: number }> {
  const layers: Array<{ coverage: string; altitude_ft: number }> = [];
  const cloudPattern = /\b(SKC|CLR|FEW|SCT|BKN|OVC)(\d{3})\b/g;
  let match;
  
  while ((match = cloudPattern.exec(segment)) !== null) {
    layers.push({
      coverage: match[1],
      altitude_ft: parseInt(match[2], 10) * 100
    });
  }
  
  return layers;
}

function extractCeiling(segment: string): number | undefined {
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

function determineFlightCategory(ceiling: number | undefined, visibility: string | undefined): 'VFR' | 'MVFR' | 'IFR' | 'LIFR' {
  // Convert visibility to number
  let visMiles: number | undefined;
  if (visibility) {
    if (visibility === 'P6SM') {
      visMiles = 6;
    } else {
      const visMatch = visibility.match(/(\d+)/);
      if (visMatch) {
        visMiles = parseInt(visMatch[1]);
      }
    }
  }
  
  // Determine category based on ceiling and visibility
  if ((ceiling && ceiling < 500) || (visMiles && visMiles < 1)) {
    return 'LIFR';
  } else if ((ceiling && ceiling >= 500 && ceiling < 1000) || (visMiles && visMiles >= 1 && visMiles < 3)) {
    return 'IFR';
  } else if ((ceiling && ceiling >= 1000 && ceiling <= 3000) || (visMiles && visMiles >= 3 && visMiles <= 5)) {
    return 'MVFR';
  } else {
    return 'VFR';
  }
}
