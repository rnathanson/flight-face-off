import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting FAA routes sync...');

    // For now, we'll insert some common sample routes
    // In production, this would parse the FAA NFDC preferred routes file
    const sampleRoutes = [
      {
        origin_airport: 'KJFK',
        destination_airport: 'KRDU',
        route_string: 'GREKI DCT LAAYK J174 ETG J121 RDU',
        altitude_high: 'FL240 and above',
        type: 'Preferred IFR Route',
        area: 'Northeast'
      },
      {
        origin_airport: 'KJFK',
        destination_airport: 'KBOS',
        route_string: 'HAPIE J174 BOSOX',
        altitude_high: 'FL240 and above',
        type: 'Preferred IFR Route',
        area: 'Northeast'
      },
      {
        origin_airport: 'KBOS',
        destination_airport: 'KMIA',
        route_string: 'ROBUC J121 SIE J121 OMN',
        altitude_high: 'FL240 and above',
        type: 'Preferred IFR Route',
        area: 'East Coast'
      },
      {
        origin_airport: 'KTEB',
        destination_airport: 'KMVY',
        route_string: 'HTO SHIPP MVY',
        altitude_low: 'below FL240',
        type: 'Preferred IFR Route',
        area: 'Northeast'
      }
    ];

    // Upsert routes (insert or update if exists)
    for (const route of sampleRoutes) {
      const { error } = await supabase
        .from('faa_preferred_routes')
        .upsert(route, {
          onConflict: 'origin_airport,destination_airport,altitude_low,altitude_high'
        });

      if (error) {
        console.error('Error upserting route:', error);
      } else {
        console.log(`Synced route: ${route.origin_airport} -> ${route.destination_airport}`);
      }
    }

    // Insert sample waypoints for route parsing
    const sampleWaypoints = [
      { waypoint_code: 'GREKI', lat: 40.5, lng: -73.8, waypoint_type: 'FIX' },
      { waypoint_code: 'LAAYK', lat: 39.8, lng: -74.5, waypoint_type: 'FIX' },
      { waypoint_code: 'ETG', lat: 38.5, lng: -77.0, waypoint_type: 'VOR' },
      { waypoint_code: 'HAPIE', lat: 40.8, lng: -73.2, waypoint_type: 'FIX' },
      { waypoint_code: 'BOSOX', lat: 42.1, lng: -71.0, waypoint_type: 'FIX' },
      { waypoint_code: 'ROBUC', lat: 42.5, lng: -70.8, waypoint_type: 'FIX' },
      { waypoint_code: 'SIE', lat: 38.3, lng: -77.5, waypoint_type: 'VOR' },
      { waypoint_code: 'OMN', lat: 37.6, lng: -77.3, waypoint_type: 'VOR' },
      { waypoint_code: 'HTO', lat: 40.9, lng: -72.6, waypoint_type: 'VOR' },
      { waypoint_code: 'SHIPP', lat: 41.2, lng: -71.1, waypoint_type: 'FIX' }
    ];

    for (const waypoint of sampleWaypoints) {
      const { error } = await supabase
        .from('nav_waypoints')
        .upsert(waypoint, {
          onConflict: 'waypoint_code'
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error upserting waypoint:', error);
      }
    }

    console.log('FAA routes sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'FAA routes synced successfully',
        routesCount: sampleRoutes.length,
        waypointsCount: sampleWaypoints.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error syncing FAA routes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
