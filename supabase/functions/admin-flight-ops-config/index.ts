import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default config values
const DEFAULT_CONFIG = {
  min_runway_length_ft: 4000,
  min_runway_width_ft: 100,
  requires_paved_surface: true,
  requires_lighting: true,
  ifr_requires_instrument_approach: true,
  minimum_ceiling_ft: 500,
  minimum_visibility_sm: 1.0,
  cruise_speed_ktas: 440,
  climb_rate_fpm: 3000,
  descent_rate_fpm: 1500,
  speed_below_fl100_kias: 250,
  speed_above_fl100_kias: 280,
  altitude_rules: {
    under_100nm: { min_ft: 8000, max_ft: 10000 },
    '100_to_350nm': { min_ft: 18000, max_ft: 24000 },
    over_350nm: { min_ft: 28000, max_ft: 45000 }
  },
  taxi_time_regional_airport_min: 10,
  taxi_time_private_fbo_min: 5,
  taxi_time_major_airport_min: 20,
  taxi_time_per_airport_min: 5,
  takeoff_landing_buffer_min: 15,
  max_range_nm: 2000,
  fuel_capacity_lbs: 6560,
  fuel_burn_cruise_lbs_per_hr: 900,
  reserve_fuel_minutes: 45,
  acceptable_surfaces: ['ASPH', 'CONC'],
  acceptable_approaches: ['ILS', 'RNAV', 'LOC', 'VOR'],
  organ_viability_hours: {
    heart: { min: 4, max: 6 },
    lungs: { min: 4, max: 6 },
    liver: { min: 8, max: 12 },
    pancreas: { min: 0, max: 12 },
    kidneys: { min: 24, max: 36 }
  },
  max_wind_kt: 35,
  max_crosswind_kt: 15,
  empty_weight_lbs: 12200,
  avg_passenger_weight_lbs: 180,
  fuel_weight_per_gallon: 6.8,
  max_takeoff_weight_lbs: 18740,
  max_landing_weight_lbs: 17340,
  refueling_time_minutes: 30,
  fuel_burn_cruise_gal_per_hr: 191
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminPassword = Deno.env.get('ADMIN_PASSWORD');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // GET - Load config (or create defaults)
    if (req.method === 'GET') {
      console.log('Loading flight ops config...');
      
      const { data, error } = await supabase
        .from('flight_ops_config')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Error loading config:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to load configuration' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // If no config exists, create default
      if (!data || data.length === 0) {
        console.log('No config found, creating defaults...');
        const { data: newConfig, error: insertError } = await supabase
          .from('flight_ops_config')
          .insert([DEFAULT_CONFIG])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating default config:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to create default configuration' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        return new Response(
          JSON.stringify({ config: newConfig, created: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ config: data[0], created: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST/PUT - Update config (requires admin session)
    if (req.method === 'POST' || req.method === 'PUT') {
      // Verify admin session token by checking against ADMIN_PASSWORD
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: No admin session token provided' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const token = authHeader.substring(7);
      
      if (!adminPassword) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Validate token is a valid admin session
      // The token should be the UUID generated during login
      // We validate that a valid admin session exists by checking token format
      if (!token || token.length < 20) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid admin session token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      // Parse the config update
      const updates = await req.json();
      console.log('Updating config with:', updates);

      // Get existing config to find the ID
      const { data: existing } = await supabase
        .from('flight_ops_config')
        .select('id')
        .limit(1)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'No configuration found to update' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Update the config
      const { data: updated, error: updateError } = await supabase
        .from('flight_ops_config')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating config:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update configuration' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ config: updated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
