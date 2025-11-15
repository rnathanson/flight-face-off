import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD not configured');
      return new Response(
        JSON.stringify({ valid: false, error: 'Admin password not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const isValid = password === adminPassword;
    
    if (isValid) {
      // Generate simple session token
      const token = crypto.randomUUID();
      console.log('Admin password validated successfully');
      
      return new Response(
        JSON.stringify({ valid: true, token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Invalid admin password attempt');
      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error validating admin password:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Validation failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
