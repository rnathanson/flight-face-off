import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Missing server configuration" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Authenticate user with JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Extract raw token from "Bearer <token>"
    const token = authHeader.replace("Bearer ", "");
    console.log("save-custom-estimate: auth header present:", !!authHeader);
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);


    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    console.log("save-custom-estimate: used token param, user:", !!user, "error:", userError?.message);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    console.log("save-custom-estimate: isAdmin:", isAdmin, "roleError:", roleError?.message);
    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }


    const body = await req.json();
    const { id, data } = body;

    // Validate required fields
    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "Data is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Use service role key for database operations
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: "Missing service key configuration" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Whitelist fields to prevent unexpected writes
    const allowedFields = [
      "customer_name",
      "customer_email",
      "notes",
      "status",
      "inputs_locked",
      "aircraft_type",
      "aircraft_cost",
      "down_payment_percent",
      "interest_rate",
      "loan_term_years",
      "owner_hours",
      "rental_hours",
      "pilot_services_hours",
      "is_non_pilot",
      "parking_type",
      "insurance_annual",
      "management_fee",
      "subscriptions",
      "tci_training",
      "maintenance_per_hour",
      "tiedown_cost",
      "hangar_cost",
      "rental_revenue_rate",
      "owner_usage_rate",
      "pilot_services_rate",
      "unique_slug",
      "allow_share_selection",
      "ownership_share",
      // SF50-specific fields
      "cleaning_monthly",
      "pilot_services_annual",
      "jetstream_hourly",
      "jetstream_package",
      "sf50_owner_flown",
      "fuel_burn_per_hour",
      "fuel_price_per_gallon",
      "pilot_services_hourly",
      "pilot_pool_contribution",
      "aircraft_cost_base",
      "include_jetstream_reserve",
      // Owner's Fleet dual hours fields
      "ownersfleet_sr22_hours",
      "ownersfleet_sf50_hours",
      "ownersfleet_sr22_pilot_services_hours",
    ];

    const sanitized: Record<string, unknown> = {};
    // Coerce integer-only fields to whole numbers to satisfy DB types
    const integerFields = new Set([
      "loan_term_years",
      "owner_hours",
      "rental_hours",
      "pilot_services_hours",
      "ownersfleet_sr22_hours",
      "ownersfleet_sf50_hours",
      "ownersfleet_sr22_pilot_services_hours",
    ]);

    for (const key of allowedFields) {
      if (key in data) {
        const value = data[key];
        
        // Validate string fields
        if (key === "customer_name" && typeof value === "string") {
          if (value.length > 100) {
            return new Response(
              JSON.stringify({ error: "customer_name must be less than 100 characters" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
        }
        
        if (key === "customer_email" && value && typeof value === "string") {
          if (value.length > 255) {
            return new Response(
              JSON.stringify({ error: "customer_email must be less than 255 characters" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
          // Basic email format check
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return new Response(
              JSON.stringify({ error: "Invalid email format" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
        }
        
        if (key === "notes" && value && typeof value === "string") {
          if (value.length > 1000) {
            return new Response(
              JSON.stringify({ error: "notes must be less than 1000 characters" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
        }
        
        // Validate aircraft_type
        if (key === "aircraft_type" && value && !["SR20", "SR22", "SF50", "OwnersFleet"].includes(value as string)) {
          return new Response(
            JSON.stringify({ error: "Invalid aircraft type" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // Validate jetstream_package
        if (key === "jetstream_package" && value && !["2yr-300hrs", "3yr-450hrs", "3yr-600hrs"].includes(value as string)) {
          return new Response(
            JSON.stringify({ error: "Invalid JetStream package" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Coerce integer DB fields safely
        if (integerFields.has(key)) {
          let num: number | null = null;
          if (typeof value === "number") {
            num = Math.round(value);
          } else if (typeof value === "string") {
            const parsed = parseFloat(value);
            num = Number.isFinite(parsed) ? Math.round(parsed) : null;
          }
          if (num === null || !Number.isFinite(num)) {
            return new Response(
              JSON.stringify({ error: `${key} must be a valid number` }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
          if (num < 0) {
            return new Response(
              JSON.stringify({ error: `${key} cannot be negative` }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
          sanitized[key] = num;
          continue;
        }
        
        sanitized[key] = value;
      }
    }
    
    // SF50-specific validation
    if (sanitized.aircraft_type === "SF50") {
      if (typeof sanitized.rental_hours === "number" && sanitized.rental_hours > 0) {
        return new Response(
          JSON.stringify({ error: "SF50 does not support leaseback (rental hours must be 0)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      if (typeof sanitized.pilot_services_hours === "number" && sanitized.pilot_services_hours > 0) {
        return new Response(
          JSON.stringify({ error: "SF50 does not support leaseback (pilot services hours must be 0)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    if (id) {
      console.log("save-custom-estimate: updating id", id, "with keys", Object.keys(sanitized));

      if (Object.keys(sanitized).length === 0) {
        console.warn("save-custom-estimate: no valid fields to update");
        return new Response(
          JSON.stringify({ error: "No valid fields to update" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { error } = await supabase
        .from("custom_ownership_estimates")
        .update(sanitized)
        .eq("id", id);

      if (error) {
        console.error("save-custom-estimate: update error", error.message, "code:", (error as any).code);
        return new Response(
          JSON.stringify({ error: error.message, code: (error as any).code }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Insert path requires unique_slug
    if (!("unique_slug" in sanitized)) {
      return new Response(
        JSON.stringify({ error: "unique_slug is required for new estimates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: inserted, error } = await supabase
      .from("custom_ownership_estimates")
      .insert(sanitized)
      .select("id")
      .single();

    if (error) {
      console.error("save-custom-estimate: insert error", error.message, "code:", (error as any).code);
      return new Response(
        JSON.stringify({ error: error.message, code: (error as any).code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: inserted.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});