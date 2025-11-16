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

    // Parse METAR (ROBUST)
    const metarData = parseMETAR(html, airportCode);
    if (metarData) {
      result.metar = metarData;
      console.log(`✓ AirNav METAR: station=${metarData.source_airport}, dist=${metarData.distance_nm}nm, sample='${metarData.raw.substring(0, 80)}...'`);
    } else {
      console.log(`⚠️ No METAR found in AirNav for ${airportCode}`);
    }

    // Parse TAF (ROBUST)
    const tafData = parseTAF(html, airportCode);
    if (tafData) {
      result.taf = tafData;
      console.log(`✓ AirNav TAF: station=${tafData.source_airport}, dist=${tafData.distance_nm}nm, sample='${tafData.raw.substring(0, 80)}...'`);
    } else {
      console.log(`⚠️ No TAF found in AirNav for ${airportCode}`);
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

      const contextStart = Math.max(0, runwayMatch.index - 300);
      const contextEnd = Math.min(html.length, runwayMatch.index + 300);
      const context = html.substring(contextStart, contextEnd);
      const lighted = /LIGHTED|LIGHTING|MIRL|HIRL|REIL|VASI|PAPI/i.test(context);

      if (surface === 'ASPH' || surface === 'CONC') {
        result.has_paved = true;
      }

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
  // Strategy 1: Find METAR table and parse rows
  const metarTableMatch = html.match(/<th[^>]*>\s*METARs?\s*<\/th>[\s\S]{0,5000}?<\/table>/i);
  
  if (metarTableMatch) {
    const tableHtml = metarTableMatch[0];
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      
      // Skip header row
      if (/<th[^>]*>/i.test(rowHtml)) continue;
      
      // Extract cell content
      const cellMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (!cellMatch) continue;
      
      // Clean HTML: <br> → newline, strip tags, normalize whitespace
      let metarText = cellMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract distance if present
      const distMatch = metarText.match(/\((\d+(?:\.\d+)?)\s*nm\s*(?:away)?\)/i);
      const distance = distMatch ? parseFloat(distMatch[1]) : 0;
      
      // Remove distance text
      metarText = metarText.replace(/\s*\(\d+(?:\.\d+)?\s*nm\s*(?:away)?\)/gi, '').trim();
      
      // Extract source airport from METAR text itself
      const stationMatch = metarText.match(/\b([A-Z0-9]{4})\s+\d{6}Z/);
      const sourceAirport = stationMatch ? stationMatch[1] : airportCode.toUpperCase();
      
      // Validate it's a real METAR (must have timestamp)
      if (/\b[A-Z0-9]{4}\s+\d{6}Z/.test(metarText) && metarText.length > 20) {
        return {
          raw: metarText,
          source_airport: sourceAirport,
          distance_nm: distance
        };
      }
    }
  }

  // Strategy 2: Raw text search fallback
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
  // Strategy 1: Find TAF table and parse rows
  const tafTableMatch = html.match(/<th[^>]*>\s*TAFs?\s*<\/th>[\s\S]{0,5000}?<\/table>/i);
  
  if (tafTableMatch) {
    const tableHtml = tafTableMatch[0];
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      
      // Skip header row
      if (/<th[^>]*>/i.test(rowHtml)) continue;
      
      // Extract cell content
      const cellMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (!cellMatch) continue;
      
      // Clean HTML
      let tafText = cellMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract distance
      const distMatch = tafText.match(/\((\d+(?:\.\d+)?)\s*nm\s*(?:away)?\)/i);
      const distance = distMatch ? parseFloat(distMatch[1]) : 0;
      
      // Remove distance text
      tafText = tafText.replace(/\s*\(\d+(?:\.\d+)?\s*nm\s*(?:away)?\)/gi, '').trim();
      
      // Extract source airport
      const stationMatch = tafText.match(/\b([A-Z0-9]{4})\s+\d{6}Z/);
      const sourceAirport = stationMatch ? stationMatch[1] : airportCode.toUpperCase();
      
      // Ensure TAF prefix
      if (!/^TAF\s/i.test(tafText) && /\b[A-Z0-9]{4}\s+\d{6}Z/.test(tafText)) {
        tafText = `TAF ${tafText}`;
      }
      
      // Validate it's a real TAF
      if (/\b[A-Z0-9]{4}\s+\d{6}Z/.test(tafText) && tafText.length > 30) {
        return {
          raw: tafText,
          source_airport: sourceAirport,
          distance_nm: distance
        };
      }
    }
  }

  // Strategy 2: Raw text search fallback
  const rawTafMatch = html.match(/TAF\s+([A-Z0-9]{4})[\s\S]{30,500}?(?=<\/(?:pre|td|tr|table)>|TAF\s+[A-Z0-9]{4}|$)/i);
  if (rawTafMatch) {
    return {
      raw: rawTafMatch[0].trim(),
      source_airport: rawTafMatch[1],
      distance_nm: 0
    };
  }

  return undefined;
}
