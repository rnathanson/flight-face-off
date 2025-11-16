import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

interface PlaceAutocompletePrediction {
  description: string;
  place_id: string;
}

interface PlaceAutocompleteResult {
  predictions: PlaceAutocompletePrediction[];
  status: string;
}

interface PlaceDetailsResult {
  result: {
    name: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    types: string[];
  };
  status: string;
}

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

    console.log('Google Places Autocomplete request:', { query, limit });

    // Step 1: Get place predictions from Autocomplete API
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;
    
    const autocompleteResponse = await fetch(autocompleteUrl);
    
    if (!autocompleteResponse.ok) {
      console.error('Google Places API error:', autocompleteResponse.status);
      throw new Error(`Google Places API error: ${autocompleteResponse.status}`);
    }

    const autocompleteData: PlaceAutocompleteResult = await autocompleteResponse.json();

    if (autocompleteData.status === 'ZERO_RESULTS') {
      console.log('No results from Places API, using Geocoding API fallback');
      return await geocodingFallback(query, limit);
    }

    if (autocompleteData.status !== 'OK') {
      console.error('Google Places error:', autocompleteData.status);
      throw new Error(`Google Places error: ${autocompleteData.status}`);
    }

    // Step 2: Get details for each place
    const predictions = autocompleteData.predictions.slice(0, limit);
    const detailsPromises = predictions.map(async (prediction) => {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=name,formatted_address,geometry,types,business_status&key=${GOOGLE_MAPS_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData: PlaceDetailsResult = await detailsResponse.json();
      
      if (detailsData.status !== 'OK') {
        console.warn(`Failed to get details for ${prediction.place_id}:`, detailsData.status);
        return null;
      }

      const result = detailsData.result;
      
      // Determine if we have a named place or just an address
      const addressFirstPart = result.formatted_address?.split(',')[0].trim();
      const hasPlaceName = result.name && result.name !== addressFirstPart;
      
      let placeName = hasPlaceName 
        ? result.name
        : addressFirstPart || prediction.description.split(',')[0];
      
      // If we only have an address (no named place), try to find a business at this location
      if (!hasPlaceName) {
        try {
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;
          const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&key=${GOOGLE_MAPS_KEY}`;
          
          const nearbyResponse = await fetch(nearbyUrl);
          const nearbyData = await nearbyResponse.json();
          
          if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
            // Look for a hospital or prominent business at this exact location
            const nearbyPlace = nearbyData.results.find((place: any) => 
              place.types?.includes('hospital') || 
              place.types?.includes('health') ||
              place.types?.includes('doctor')
            ) || nearbyData.results[0];
            
            if (nearbyPlace && nearbyPlace.name && nearbyPlace.name !== addressFirstPart) {
              placeName = nearbyPlace.name;
              console.log(`Found nearby place: ${placeName} at ${addressFirstPart}`);
            }
          }
        } catch (error) {
          console.warn('Nearby search failed:', error);
          // Continue with address-based name
        }
      }
      
      // Always provide both name and full address for comprehensive display
      return {
        name: placeName,
        address: result.formatted_address,
        display_name: result.formatted_address,
        lat: result.geometry.location.lat.toString(),
        lon: result.geometry.location.lng.toString(),
        place_id: prediction.place_id,
      };
    });

    const results = (await Promise.all(detailsPromises)).filter(r => r !== null);

    console.log('Google Places response:', results.length, 'results');

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

// Fallback to Geocoding API when Places API returns no results
async function geocodingFallback(query: string, limit: number) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.status}`);
  }

  const data: GoogleGeocodeResult = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Geocoding error: ${data.status}`);
  }

  const results = data.results.slice(0, limit).map(result => {
    // For geocoding results, use the first part of the address as the name
    const addressFirstPart = result.formatted_address?.split(',')[0].trim();
    
    return {
      name: addressFirstPart,
      address: result.formatted_address,
      display_name: result.formatted_address,
      lat: result.geometry.location.lat.toString(),
      lon: result.geometry.location.lng.toString(),
      place_id: result.place_id,
    };
  });

  return new Response(
    JSON.stringify(results),
    { 
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } 
    }
  );
}
