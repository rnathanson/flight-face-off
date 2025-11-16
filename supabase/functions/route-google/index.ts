import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

interface GoogleDirectionsResult {
  routes: Array<{
    legs: Array<{
      distance: { value: number };
      duration: { value: number };
      duration_in_traffic?: { value: number };
      steps: Array<{
        html_instructions: string;
        distance: { value: number };
        duration: { value: number };
      }>;
    }>;
    overview_polyline: { points: string };
  }>;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, departureTime } = await req.json();

    if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination coordinates are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Google Directions request:', { origin, destination, departureTime });

    // Build request parameters
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lon}`,
      destination: `${destination.lat},${destination.lon}`,
      mode: 'driving',
      traffic_model: 'best_guess',
      key: GOOGLE_MAPS_KEY!,
    });

    // Always use current time + 5 minutes for traffic data
    // This ensures we never get "departure_time is in the past" errors
    // and provides accurate current traffic conditions
    const futureTimestamp = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);
    params.append('departure_time', futureTimestamp.toString());

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Google Maps API error:', response.status, response.statusText);
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data: GoogleDirectionsResult = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Directions error:', data.status);
      console.error('Full Google API response:', JSON.stringify(data, null, 2));
      console.error('Request URL (key redacted):', url.replace(GOOGLE_MAPS_KEY!, 'REDACTED'));
      throw new Error(`Google Directions error: ${data.status}`);
    }

    if (!data.routes || data.routes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No route found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Use traffic duration if available, otherwise use standard duration
    const durationSeconds = leg.duration_in_traffic?.value || leg.duration.value;
    const distanceMeters = leg.distance.value;

    const result = {
      distance: distanceMeters / 1000, // Convert to km
      duration: durationSeconds / 60, // Convert to minutes
      polyline: route.overview_polyline.points,
      source: 'google_maps',
      hasTrafficData: !!leg.duration_in_traffic,
    };

    console.log('Google Directions response:', {
      distance: result.distance,
      duration: result.duration,
      hasTrafficData: result.hasTrafficData,
    });

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Routing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Routing failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
