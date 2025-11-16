import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

interface GoogleGeocodeResult {
  results: Array<{
    formatted_address: string;
    place_id: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 5 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Google Geocoding request:', { query, limit });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Google Maps API error:', response.status, response.statusText);
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data: GoogleGeocodeResult = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Geocoding error:', data.status);
      throw new Error(`Google Geocoding error: ${data.status}`);
    }

    // Transform Google results to match our interface
    const results = data.results.slice(0, limit).map(result => ({
      lat: result.geometry.location.lat.toString(),
      lon: result.geometry.location.lng.toString(),
      display_name: result.formatted_address,
      place_id: result.place_id,
    }));

    console.log('Google Geocoding response:', results.length, 'results');

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Geocoding failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
