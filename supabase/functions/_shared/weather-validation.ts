import { fetchAndParseAirNav } from './airnav-parser.ts';
import { calculateHeadwindComponent } from './wind-utils.ts';

export interface WeatherValidationResult {
  isValid: boolean;
  errorMessage?: string;
  metarData?: any;
}

export interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  elevation_ft?: number;
  best_runway?: string;
}

/**
 * Validate departure weather conditions against operational limits
 */
export async function validateDepartureWeather(
  airport: Airport,
  config: any,
  supabase: any
): Promise<WeatherValidationResult> {
  console.log(`\n🛫 Checking departure wind limits at ${airport.code}...`);
  
  const departureWeather = await fetchAndParseAirNav(airport.code, true, supabase);
  
  if (!departureWeather?.metar) {
    console.log(`⚠️ No METAR data for ${airport.code}, proceeding without departure wind check`);
    return { isValid: true };
  }

  const metarRaw = departureWeather.metar.raw;
  console.log(`METAR for ${airport.code}: ${metarRaw.substring(0, 80)}`);
  
  // Extract wind from METAR
  const vrbMatch = metarRaw.match(/\bVRB(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  const calmMatch = /\b00000KT\b/.test(metarRaw);
  const stdMatch = metarRaw.match(/\b(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  
  let windDirection: number = 0;
  let windSpeed: number = 0;
  let windGust: number | undefined = undefined;
  
  if (vrbMatch) {
    windDirection = -1; // Variable
    windSpeed = parseInt(vrbMatch[1]);
    windGust = vrbMatch[2] ? parseInt(vrbMatch[2]) : undefined;
  } else if (calmMatch) {
    windDirection = 0;
    windSpeed = 0;
  } else if (stdMatch) {
    windDirection = parseInt(stdMatch[1]);
    windSpeed = parseInt(stdMatch[2]);
    windGust = stdMatch[3] ? parseInt(stdMatch[3]) : undefined;
  }
  
  if (windSpeed > 0 || windGust) {
    const effectiveWind = windGust || windSpeed;
    console.log(`Wind at ${airport.code}: ${windDirection === -1 ? 'VRB' : windDirection}${String(windSpeed).padStart(2, '0')}${windGust ? `G${windGust}` : ''}KT`);
    
    // Check against max wind limit
    if (effectiveWind > config.max_wind_kt) {
      const errorMsg = `Departure not permitted: wind ${effectiveWind}kt exceeds limit ${config.max_wind_kt}kt at ${airport.code}`;
      console.log(`❌ ${errorMsg}`);
      return {
        isValid: false,
        errorMessage: errorMsg,
        metarData: {
          airport: airport.code,
          wind: `${windDirection === -1 ? 'VRB' : String(windDirection).padStart(3, '0')}${String(windSpeed).padStart(2, '0')}${windGust ? `G${windGust}` : ''}KT`,
          effectiveWind: `${effectiveWind}kt`,
          limit: `${config.max_wind_kt}kt`
        }
      };
    }
    
    // Check crosswind if we have runways
    if (departureWeather.runways && departureWeather.runways.length > 0) {
      let lowestCrosswind = Infinity;
      let bestRunway = departureWeather.runways[0];
      
      // Variable winds - worst case is full wind speed as crosswind
      if (windDirection === -1) {
        lowestCrosswind = effectiveWind;
      } else {
        for (const runway of departureWeather.runways) {
          const runwayHeading = parseInt(runway.name) * 10;
          const angleDiff = Math.abs(windDirection - runwayHeading);
          const angleRad = (angleDiff * Math.PI) / 180;
          const crosswind = Math.abs(Math.round(effectiveWind * Math.sin(angleRad)));
          
          if (crosswind < lowestCrosswind) {
            lowestCrosswind = crosswind;
            bestRunway = runway;
          }
        }
      }
      
      if (lowestCrosswind > config.max_crosswind_kt) {
        const errorMsg = `Departure not permitted: crosswind ${lowestCrosswind}kt on runway ${bestRunway.name} exceeds limit ${config.max_crosswind_kt}kt at ${airport.code}`;
        console.log(`❌ ${errorMsg}`);
        return {
          isValid: false,
          errorMessage: errorMsg,
          metarData: {
            airport: airport.code,
            runway: bestRunway.name,
            wind: `${windDirection === -1 ? 'VRB' : String(windDirection).padStart(3, '0')}${String(windSpeed).padStart(2, '0')}${windGust ? `G${windGust}` : ''}KT`,
            crosswind: `${lowestCrosswind}kt`,
            limit: `${config.max_crosswind_kt}kt`
          }
        };
      }
      
      console.log(`✅ Departure wind check passed: wind ${effectiveWind}kt, crosswind ${lowestCrosswind}kt on RWY ${bestRunway.name}`);
    }
  } else {
    console.log(`✅ Calm winds at ${airport.code}, no wind restrictions`);
  }
  
  return { isValid: true };
}
