import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AIRPORT_COORDS, calculateDistance } from "../_shared/airport-data.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, maxDistance = 100 } = await req.json();
    
    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Finding nearest airport to ${lat}, ${lng}`);

    // Calculate distances to all known airports
    const airportsWithDistance = Object.entries(AIRPORT_COORDS).map(([code, airport]) => ({
      code,
      name: airport.name || code,
      lat: airport.lat,
      lng: airport.lng,
      distance: calculateDistance(lat, lng, airport.lat, airport.lng),
    }));

    // Sort by distance and filter by max distance
    const nearbyAirports = airportsWithDistance
      .filter(a => a.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    if (nearbyAirports.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No airports found within range' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return the nearest airport
    const nearest = nearbyAirports[0];
    console.log(`Nearest airport: ${nearest.code} (${nearest.distance.toFixed(1)} nm)`);

    return new Response(
      JSON.stringify({
        airport: nearest.code,
        name: nearest.name,
        lat: nearest.lat,
        lng: nearest.lng,
        distance_nm: parseFloat(nearest.distance.toFixed(1)),
        alternatives: nearbyAirports.slice(1, 4), // Include up to 3 alternatives
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error finding nearest airport:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
