-- Create flight operations configuration table
CREATE TABLE IF NOT EXISTS public.flight_ops_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Airport Requirements
  min_runway_length_ft integer NOT NULL DEFAULT 4000,
  min_runway_width_ft integer NOT NULL DEFAULT 100,
  requires_paved_surface boolean NOT NULL DEFAULT true,
  acceptable_surfaces text[] NOT NULL DEFAULT ARRAY['ASPH', 'CONC'],
  requires_lighting boolean NOT NULL DEFAULT true,
  
  -- IFR Requirements
  ifr_requires_instrument_approach boolean NOT NULL DEFAULT true,
  acceptable_approaches text[] NOT NULL DEFAULT ARRAY['ILS', 'RNAV', 'LOC', 'VOR'],
  minimum_ceiling_ft integer NOT NULL DEFAULT 500,
  minimum_visibility_sm numeric NOT NULL DEFAULT 1.0,
  
  -- Flight Performance
  cruise_speed_ktas integer NOT NULL DEFAULT 440,
  climb_rate_fpm integer NOT NULL DEFAULT 3000,
  descent_rate_fpm integer NOT NULL DEFAULT 2000,
  speed_below_fl100_kias integer NOT NULL DEFAULT 250,
  speed_above_fl100_kias integer NOT NULL DEFAULT 280,
  
  -- Altitude Rules (JSON for different haul lengths)
  altitude_rules jsonb NOT NULL DEFAULT '{
    "under_100nm": {"min_ft": 8000, "max_ft": 10000},
    "100_to_350nm": {"min_ft": 18000, "max_ft": 24000},
    "over_350nm": {"min_ft": 28000, "max_ft": 45000}
  }'::jsonb,
  
  -- Operational Factors
  taxi_time_major_airport_min integer NOT NULL DEFAULT 20,
  taxi_time_regional_airport_min integer NOT NULL DEFAULT 10,
  taxi_time_private_fbo_min integer NOT NULL DEFAULT 5,
  takeoff_landing_buffer_min integer NOT NULL DEFAULT 15,
  
  -- PC-24 Specific
  max_range_nm integer NOT NULL DEFAULT 2000,
  fuel_capacity_lbs integer NOT NULL DEFAULT 6560,
  fuel_burn_cruise_lbs_per_hr integer NOT NULL DEFAULT 900,
  reserve_fuel_minutes integer NOT NULL DEFAULT 45
);

-- Enable RLS
ALTER TABLE public.flight_ops_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY "Admins can manage flight ops config"
ON public.flight_ops_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read config
CREATE POLICY "Anyone can read flight ops config"
ON public.flight_ops_config
FOR SELECT
TO authenticated
USING (true);

-- Insert default configuration
INSERT INTO public.flight_ops_config (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Update timestamp trigger
CREATE TRIGGER update_flight_ops_config_updated_at
BEFORE UPDATE ON public.flight_ops_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();