import { fetchAndParseAirNav } from './airnav-parser.ts';

export interface TAFData {
  raw: string;
  source_airport: string;
  distance_nm: number;
  decoded?: any;
}

/**
 * 3-Tier TAF Fallback Strategy:
 * 1. CheckWX Direct Lookup
 * 2. CheckWX Radius Search (100nm, max 200nm)
 * 3. AirNav Web Scraping
 */
export async function fetchTAFWithFallback(airportCode: string): Promise<TAFData | null> {
  const icao = airportCode.toUpperCase();
  
  // Tier 1: CheckWX Direct Lookup
  console.log(`🔍 Tier 1: Attempting CheckWX direct lookup for ${icao}`);
  const directTAF = await fetchCheckWXDirect(icao);
  if (directTAF) {
    console.log(`✅ CheckWX direct: Found TAF for ${icao} (distance=0nm)`);
    return directTAF;
  }
  
  // Tier 2: CheckWX Radius Search
  console.log(`🔍 Tier 2: Attempting CheckWX radius search for ${icao} (100nm)`);
  const radiusTAF = await fetchCheckWXRadius(icao);
  if (radiusTAF) {
    console.log(`✅ CheckWX radius: Found TAF from ${radiusTAF.source_airport} (distance=${radiusTAF.distance_nm}nm)`);
    return radiusTAF;
  }
  
  // Tier 3: AirNav Fallback
  console.log(`🔍 Tier 3: Attempting AirNav web scraping for ${icao}`);
  const airnavData = await fetchAndParseAirNav(icao, true); // weatherOnly = true
  if (airnavData?.taf) {
    console.log(`✅ AirNav: Found TAF from ${airnavData.taf.source_airport} (distance=${airnavData.taf.distance_nm}nm)`);
    return airnavData.taf;
  }
  
  // If we have METAR from AirNav, return it as fallback
  if (airnavData?.metar) {
    console.log(`⚠️ No TAF found, using METAR from ${airnavData.metar.source_airport} (distance=${airnavData.metar.distance_nm}nm)`);
    return {
      raw: airnavData.metar.raw,
      source_airport: airnavData.metar.source_airport,
      distance_nm: airnavData.metar.distance_nm
    };
  }
  
  console.log(`❌ No TAF or METAR found for ${icao} after all fallbacks`);
  return null;
}

async function fetchCheckWXDirect(icao: string): Promise<TAFData | null> {
  const apiKey = Deno.env.get('CHECKWX_API_KEY');
  if (!apiKey) {
    console.log('⚠️ CHECKWX_API_KEY not configured, skipping CheckWX');
    return null;
  }
  
  try {
    const response = await fetch(`https://api.checkwx.com/taf/${icao}/decoded`, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`CheckWX direct failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.results === 0 || !data.data || data.data.length === 0) {
      console.log(`CheckWX: No TAF available for ${icao}`);
      return null;
    }
    
    const taf = data.data[0];
    
    // Build raw TAF string from decoded data
    const rawTAF = buildRawTAFFromDecoded(taf);
    
    return {
      raw: rawTAF,
      source_airport: taf.icao || icao,
      distance_nm: 0,
      decoded: taf
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`CheckWX direct error: ${msg}`);
    return null;
  }
}

async function fetchCheckWXRadius(icao: string): Promise<TAFData | null> {
  const apiKey = Deno.env.get('CHECKWX_API_KEY');
  if (!apiKey) {
    return null;
  }
  
  try {
    const response = await fetch(`https://api.checkwx.com/taf/${icao}/radius/100/decoded`, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`CheckWX radius failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.results === 0 || !data.data || data.data.length === 0) {
      console.log(`CheckWX: No TAF within 100nm of ${icao}`);
      return null;
    }
    
    // Find closest TAF within 200nm hard limit
    let closestTAF = null;
    let minDistance = 200;
    
    for (const taf of data.data) {
      const distance = taf.distance?.nautical || 999;
      if (distance < minDistance) {
        minDistance = distance;
        closestTAF = taf;
      }
    }
    
    if (!closestTAF || minDistance >= 200) {
      console.log(`CheckWX: All TAFs beyond 200nm limit`);
      return null;
    }
    
    const rawTAF = buildRawTAFFromDecoded(closestTAF);
    
    return {
      raw: rawTAF,
      source_airport: closestTAF.icao || icao,
      distance_nm: minDistance,
      decoded: closestTAF
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`CheckWX radius error: ${msg}`);
    return null;
  }
}

/**
 * Build a raw TAF string from CheckWX decoded data
 * This allows us to use existing wind extraction logic
 */
function buildRawTAFFromDecoded(decoded: any): string {
  const parts: string[] = [];
  
  parts.push('TAF');
  parts.push(decoded.icao || 'UNKN');
  
  if (decoded.timestamp?.issued) {
    const issued = new Date(decoded.timestamp.issued);
    const day = String(issued.getUTCDate()).padStart(2, '0');
    const hour = String(issued.getUTCHours()).padStart(2, '0');
    const min = String(issued.getUTCMinutes()).padStart(2, '0');
    parts.push(`${day}${hour}${min}Z`);
  }
  
  if (decoded.forecast && decoded.forecast.length > 0) {
    const firstPeriod = decoded.forecast[0];
    
    // Wind
    if (firstPeriod.wind) {
      const w = firstPeriod.wind;
      const dir = w.variable ? 'VRB' : String(w.degrees || 0).padStart(3, '0');
      const spd = String(w.speed_kts || 0).padStart(2, '0');
      const gust = w.gust_kts ? `G${String(w.gust_kts).padStart(2, '0')}` : '';
      parts.push(`${dir}${spd}${gust}KT`);
    }
    
    // Visibility
    if (firstPeriod.visibility) {
      const vis = firstPeriod.visibility;
      if (vis.miles_float > 6) {
        parts.push('P6SM');
      } else {
        parts.push(`${vis.miles}SM`);
      }
    }
    
    // Clouds
    if (firstPeriod.clouds && firstPeriod.clouds.length > 0) {
      for (const cloud of firstPeriod.clouds) {
        const code = cloud.code || 'SKC';
        const alt = cloud.base_feet_agl ? String(Math.round(cloud.base_feet_agl / 100)).padStart(3, '0') : '';
        parts.push(alt ? `${code}${alt}` : code);
      }
    }
  }
  
  return parts.join(' ');
}
