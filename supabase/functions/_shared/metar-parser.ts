export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface ParsedMETAR {
  airport: string;
  timestamp: string;
  wind: {
    direction: number | 'VRB';
    speed: number;
    gust?: number;
  };
  visibility: number; // statute miles
  ceiling: number | null; // feet AGL
  temperature: number; // celsius
  dewpoint: number;
  altimeter: number; // inches Hg
  conditions: string[];
  flightCategory: FlightCategory;
  raw: string;
}

export function parseMETAR(metarString: string): ParsedMETAR | null {
  if (!metarString || metarString.length < 10) {
    return null;
  }

  try {
    const parts = metarString.split(/\s+/);
    
    const result: Partial<ParsedMETAR> = {
      raw: metarString,
      conditions: [],
      ceiling: null
    };

    // Airport code (first part)
    result.airport = parts[0];

    // Timestamp (DDHHMMZ format)
    const timestampMatch = metarString.match(/(\d{6}Z)/);
    if (timestampMatch) {
      result.timestamp = timestampMatch[1];
    }

    // Wind (e.g., "28015G22KT" or "VRB05KT")
    const windMatch = metarString.match(/(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/);
    if (windMatch) {
      result.wind = {
        direction: windMatch[1] === 'VRB' ? 'VRB' : parseInt(windMatch[1], 10),
        speed: parseInt(windMatch[2], 10),
        gust: windMatch[3] ? parseInt(windMatch[3], 10) : undefined
      };
    } else {
      result.wind = { direction: 0, speed: 0 };
    }

    // Visibility (e.g., "10SM" or "1/2SM")
    const visMatch = metarString.match(/(\d+(?:\/\d+)?|\d+\s+\d+\/\d+)SM/);
    if (visMatch) {
      const visString = visMatch[1].trim();
      if (visString.includes('/')) {
        const [num, denom] = visString.split('/').map(n => parseFloat(n));
        result.visibility = num / denom;
      } else if (visString.includes(' ')) {
        const parts = visString.split(' ');
        const whole = parseFloat(parts[0]);
        const [num, denom] = parts[1].split('/').map(n => parseFloat(n));
        result.visibility = whole + num / denom;
      } else {
        result.visibility = parseFloat(visString);
      }
    } else {
      result.visibility = 10; // Default to 10SM if not specified
    }

    // Sky conditions (e.g., "FEW025", "SCT050", "BKN100", "OVC015")
    const skyMatches = metarString.matchAll(/(FEW|SCT|BKN|OVC)(\d{3})/g);
    let lowestCeiling = null;
    
    for (const match of skyMatches) {
      const coverage = match[1];
      const altitude = parseInt(match[2], 10) * 100; // Convert to feet
      
      // BKN and OVC count as ceilings
      if ((coverage === 'BKN' || coverage === 'OVC') && 
          (lowestCeiling === null || altitude < lowestCeiling)) {
        lowestCeiling = altitude;
      }
    }
    result.ceiling = lowestCeiling;

    // Temperature/Dewpoint (e.g., "18/14" or "M05/M08")
    const tempMatch = metarString.match(/\s(M?\d{2})\/(M?\d{2})\s/);
    if (tempMatch) {
      result.temperature = parseTemperature(tempMatch[1]);
      result.dewpoint = parseTemperature(tempMatch[2]);
    }

    // Altimeter (e.g., "A3015")
    const altMatch = metarString.match(/A(\d{4})/);
    if (altMatch) {
      const alt = altMatch[1];
      result.altimeter = parseFloat(`${alt.substring(0, 2)}.${alt.substring(2)}`);
    }

    // Weather conditions (e.g., "RA", "BR", "-SN", "+TSRA")
    const wxPattern = /\s(-|\+)?(TS|SH|FZ|BL|DR|MI|BC|PR|VC)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)\s/g;
    const wxMatches = metarString.matchAll(wxPattern);
    for (const match of wxMatches) {
      result.conditions!.push(match[0].trim());
    }

    // Determine flight category
    result.flightCategory = determineFlightCategory(result.visibility!, result.ceiling);

    return result as ParsedMETAR;
  } catch (error) {
    console.error('Error parsing METAR:', error);
    return null;
  }
}

function parseTemperature(temp: string): number {
  if (temp.startsWith('M')) {
    return -parseInt(temp.substring(1), 10);
  }
  return parseInt(temp, 10);
}

function determineFlightCategory(visibility: number, ceiling: number | null): FlightCategory {
  // LIFR: Ceiling < 500 ft or visibility < 1 SM
  if ((ceiling !== null && ceiling < 500) || visibility < 1) {
    return 'LIFR';
  }
  
  // IFR: Ceiling 500-999 ft or visibility 1-2 SM
  if ((ceiling !== null && ceiling < 1000) || visibility < 3) {
    return 'IFR';
  }
  
  // MVFR: Ceiling 1000-3000 ft or visibility 3-5 SM
  if ((ceiling !== null && ceiling < 3000) || visibility <= 5) {
    return 'MVFR';
  }
  
  // VFR: Ceiling > 3000 ft and visibility > 5 SM
  return 'VFR';
}

export function getWeatherDelayMinutes(metar: ParsedMETAR): number {
  let delay = 0;

  // Flight category based delays
  switch (metar.flightCategory) {
    case 'LIFR':
      delay += 45;
      break;
    case 'IFR':
      delay += 25;
      break;
    case 'MVFR':
      delay += 10;
      break;
    case 'VFR':
      delay += 0;
      break;
  }

  // Wind delays
  if (metar.wind.speed > 25) {
    delay += 15;
  } else if (metar.wind.speed > 20) {
    delay += 10;
  }

  if (metar.wind.gust && metar.wind.gust > 30) {
    delay += 10;
  }

  // Weather conditions
  if (metar.conditions.some(c => c.includes('TS'))) {
    delay += 30; // Thunderstorms
  }
  if (metar.conditions.some(c => c.includes('SN') || c.includes('FZ'))) {
    delay += 20; // Snow or freezing
  }
  if (metar.conditions.some(c => c.includes('RA'))) {
    delay += 5; // Rain
  }

  return delay;
}
