export interface RunwayData {
  name: string;
  length_ft: number;
  width_ft: number;
  surface: string;
  lighted: boolean;
}

export interface METARData {
  raw: string;
  source_airport: string;
  distance_nm: number;
}

export interface TAFData {
  raw: string;
  source_airport: string;
  distance_nm: number;
}

export interface AirNavAirportData {
  airport: string;
  name: string;
  lat: number;
  lng: number;
  elevation_ft: number;
  runways: RunwayData[];
  has_paved: boolean;
  has_ils: boolean;
  has_rnav: boolean;
  metar?: METARData;
  taf?: TAFData;
}

export async function fetchAndParseAirNav(
  airportCode: string,
  weatherOnly: boolean = false
): Promise<AirNavAirportData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://www.airnav.com/airport/${airportCode.toUpperCase()}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`AirNav fetch failed: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Check if airport not found
    if (html.includes('not found in the database')) {
      console.log(`Airport ${airportCode} not found in AirNav`);
      return null;
    }

    const result: Partial<AirNavAirportData> = {
      airport: airportCode.toUpperCase(),
      runways: [],
      has_paved: false,
      has_ils: false,
      has_rnav: false
    };

    // Parse airport name from title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const titleParts = titleMatch[1].split(' - ');
      if (titleParts.length > 1) {
        result.name = titleParts[1].trim();
      }
    }

    // Parse coordinates
    const coordMatch = html.match(/(\d{2}-\d{2}-[\d.]+[NS])\s*\/?\s*(\d{2,3}-\d{2}-[\d.]+[EW])/);
    if (coordMatch) {
      result.lat = parseCoordinate(coordMatch[1]);
      result.lng = parseCoordinate(coordMatch[2]);
    } else {
      // Try decimal format
      const decimalMatch = html.match(/Latitude:\s*([-\d.]+).*?Longitude:\s*([-\d.]+)/is);
      if (decimalMatch) {
        result.lat = parseFloat(decimalMatch[1]);
        result.lng = parseFloat(decimalMatch[2]);
      }
    }

    // Parse elevation
    const elevMatch = html.match(/Elevation:\s*(\d+)\s*(?:ft|feet)/i);
    if (elevMatch) {
      result.elevation_ft = parseInt(elevMatch[1], 10);
    }

    // Parse METAR
    const metarData = parseMETAR(html, airportCode);
    if (metarData) {
      result.metar = metarData;
    }

    // Parse TAF
    const tafData = parseTAF(html, airportCode);
    if (tafData) {
      result.taf = tafData;
    }

    // If weather-only mode, return early
    if (weatherOnly) {
      return result as AirNavAirportData;
    }

    // Parse runways
    const runwayPattern = /<h4>Runway\s+(\d{1,2}[LRC]?(?:\/\d{1,2}[LRC]?)?)<\/h4>[\s\S]{0,500}?Dimensions:.*?(\d{3,5})\s*x\s*(\d{2,3})\s*ft[\s\S]{0,500}?Surface:.*?(ASPH|CONC|TURF|DIRT|GRAVEL|GRASS|SAND|WATER)/gis;
    
    let runwayMatch;
    while ((runwayMatch = runwayPattern.exec(html)) !== null) {
      const runwayName = runwayMatch[1];
      const length = parseInt(runwayMatch[2], 10);
      const width = parseInt(runwayMatch[3], 10);
      const surface = runwayMatch[4].toUpperCase();

      // Check for lighting in context
      const contextStart = Math.max(0, runwayMatch.index - 300);
      const contextEnd = Math.min(html.length, runwayMatch.index + 300);
      const context = html.substring(contextStart, contextEnd);
      const lighted = /LIGHTED|LIGHTING|MIRL|HIRL|REIL|VASI|PAPI/i.test(context);

      // Track if we have paved runways
      if (surface === 'ASPH' || surface === 'CONC') {
        result.has_paved = true;
      }

      // Split runway names (e.g., "12/30" -> ["12", "30"])
      const runwayNames = runwayName.split('/');
      runwayNames.forEach(name => {
        result.runways!.push({
          name: name.trim(),
          length_ft: length,
          width_ft: width,
          surface: surface,
          lighted: lighted
        });
      });
    }

    // Check for approach systems
    result.has_ils = /ILS/i.test(html);
    result.has_rnav = /RNAV|GPS/i.test(html);

    return result as AirNavAirportData;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error fetching AirNav data for ${airportCode}:`, error);
    return null;
  }
}

function parseCoordinate(coord: string): number {
  // Parse DD-MM-SS.SSS format (e.g., "29-57-06.8740N")
  const match = coord.match(/(\d{2,3})-(\d{2})-([\d.]+)([NSEW])/);
  if (!match) return 0;

  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseFloat(match[3]);
  const direction = match[4];

  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

function parseMETAR(html: string, airportCode: string): METARData | undefined {
  // Try table-based parsing first
  const metarTableMatch = html.match(/<th[^>]*>METAR<\/th>\s*<td[^>]*>([^<]+)<\/td>/i);
  if (metarTableMatch) {
    let metarText = metarTableMatch[1].trim();
    
    // Extract distance if present
    const distMatch = metarText.match(/\((\d+)\s*nm\s*away\)/i);
    const distance = distMatch ? parseInt(distMatch[1], 10) : 0;
    
    // Clean up METAR text
    metarText = metarText.replace(/\s*\(\d+\s*nm\s*away\)/i, '').trim();
    
    if (metarText.length > 10) {
      return {
        raw: metarText,
        source_airport: airportCode,
        distance_nm: distance
      };
    }
  }

  // Fallback: raw text search
  const rawMetarMatch = html.match(/\b([A-Z0-9]{4})\s+(\d{6}Z)\s+[^\n<]{20,}/);
  if (rawMetarMatch) {
    return {
      raw: rawMetarMatch[0].trim(),
      source_airport: rawMetarMatch[1],
      distance_nm: 0
    };
  }

  return undefined;
}

function parseTAF(html: string, airportCode: string): TAFData | undefined {
  // Try table-based parsing first
  const tafTableMatch = html.match(/<th[^>]*>TAF<\/th>\s*<td[^>]*>([^<]+)<\/td>/i);
  if (tafTableMatch) {
    let tafText = tafTableMatch[1].trim();
    
    const distMatch = tafText.match(/\((\d+)\s*nm\s*away\)/i);
    const distance = distMatch ? parseInt(distMatch[1], 10) : 0;
    
    tafText = tafText.replace(/\s*\(\d+\s*nm\s*away\)/i, '').trim();
    
    if (tafText.length > 10) {
      return {
        raw: tafText,
        source_airport: airportCode,
        distance_nm: distance
      };
    }
  }

  // Fallback: raw text search
  const rawTafMatch = html.match(/TAF\s+([A-Z0-9]{4})\s+(\d{6}Z)\s+[^\n<]{20,}/);
  if (rawTafMatch) {
    return {
      raw: rawTafMatch[0].trim(),
      source_airport: rawTafMatch[1],
      distance_nm: 0
    };
  }

  return undefined;
}
