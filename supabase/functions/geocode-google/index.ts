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
      
      // Prefer hospitals/medical centers for the display name
      const nameLooksMedical = /hospital|medical|clinic|center|health/i.test(placeName || '');
      try {
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        if (!nameLooksMedical || !result.types?.includes('hospital')) {
          const nearHospitalUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=hospital&key=${GOOGLE_MAPS_KEY}`;
          const nearbyHospitalRes = await fetch(nearHospitalUrl);
          const nearbyHospital = await nearbyHospitalRes.json();

          let nearbyPlace = null;
          if (nearbyHospital.status === 'OK' && nearbyHospital.results && nearbyHospital.results.length > 0) {
            nearbyPlace = nearbyHospital.results[0];
          } else {
            // Fallback: try keyword-based medical search
            const nearMedicalUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&keyword=medical%20center|hospital|clinic|health&key=${GOOGLE_MAPS_KEY}`;
            const nearbyMedicalRes = await fetch(nearMedicalUrl);
            const nearbyMedical = await nearbyMedicalRes.json();
            if (nearbyMedical.status === 'OK' && nearbyMedical.results && nearbyMedical.results.length > 0) {
              nearbyPlace = nearbyMedical.results.find((p: any) => /hospital|medical|clinic|center|health/i.test(p.name)) || nearbyMedical.results[0];
            }
          }
          
          if (nearbyPlace && nearbyPlace.name && nearbyPlace.name !== addressFirstPart) {
            placeName = nearbyPlace.name;
            console.log(`Found nearby place: ${placeName} at ${addressFirstPart}`);
          }
        }
      } catch (error) {
        console.warn('Nearby search failed:', error);
        // Continue with existing placeName
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

    let results = (await Promise.all(detailsPromises)).filter(r => r !== null) as any[];

    // Prioritize hospitals/medical centers in the result ordering
    const score = (name: string) => {
      const n = (name || '').toLowerCase();
      let s = 0;
      if (/hospital/.test(n)) s += 100;
      if (/medical center|medical|clinic|university hospital|health/.test(n)) s += 50;
      return s;
    };

    results.sort((a, b) => score(b.name) - score(a.name));

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

  const results = await Promise.all(
    data.results.slice(0, limit).map(async (result) => {
      const addressFirstPart = result.formatted_address?.split(',')[0].trim();
      const lat = result.geometry.location.lat;
      const lng = result.geometry.location.lng;

      // Prefer a hospital near this result, else keep address label
      let placeName = addressFirstPart;
      try {
        const nearHospitalUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=hospital&key=${GOOGLE_MAPS_KEY}`;
        const nearbyHospitalRes = await fetch(nearHospitalUrl);
        const nearbyHospital = await nearbyHospitalRes.json();
        if (nearbyHospital.status === 'OK' && nearbyHospital.results && nearbyHospital.results.length > 0) {
          placeName = nearbyHospital.results[0].name || placeName;
        } else {
          const nearMedicalUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&keyword=medical%20center|hospital&key=${GOOGLE_MAPS_KEY}`;
          const nearbyMedicalRes = await fetch(nearMedicalUrl);
          const nearbyMedical = await nearbyMedicalRes.json();
          if (nearbyMedical.status === 'OK' && nearbyMedical.results && nearbyMedical.results.length > 0) {
            const preferred = nearbyMedical.results.find((p: any) => /hospital|medical|clinic|center/i.test(p.name)) || nearbyMedical.results[0];
            placeName = preferred.name || placeName;
          }
        }
      } catch (_) {}

      return {
        name: placeName,
        address: result.formatted_address,
        display_name: result.formatted_address,
        lat: lat.toString(),
        lon: lng.toString(),
        place_id: result.place_id,
      };
    })
  );

  return new Response(
    JSON.stringify(results),
    { 
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } 
    }
  );
}
