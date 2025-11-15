-- Table for FAA Preferred Routes
CREATE TABLE IF NOT EXISTS public.faa_preferred_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_airport text NOT NULL,
  destination_airport text NOT NULL,
  route_string text NOT NULL,
  altitude_low text,
  altitude_high text,
  hours text,
  type text,
  area text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(origin_airport, destination_airport, altitude_low, altitude_high)
);

CREATE INDEX IF NOT EXISTS idx_faa_routes_origin_dest ON public.faa_preferred_routes(origin_airport, destination_airport);

-- Table for Airports (from OurAirports data)
CREATE TABLE IF NOT EXISTS public.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icao_code text UNIQUE NOT NULL,
  iata_code text,
  name text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  elevation_ft integer,
  has_instrument_approach boolean DEFAULT false,
  has_lighting boolean DEFAULT false,
  airport_type text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airports_icao ON public.airports(icao_code);
CREATE INDEX IF NOT EXISTS idx_airports_location ON public.airports(lat, lng);

-- Table for Runways
CREATE TABLE IF NOT EXISTS public.runways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_icao text NOT NULL REFERENCES public.airports(icao_code) ON DELETE CASCADE,
  runway_number text NOT NULL,
  length_ft integer NOT NULL,
  width_ft integer NOT NULL,
  surface text NOT NULL,
  is_lighted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runways_airport ON public.runways(airport_icao);

-- Table for Navigation Waypoints
CREATE TABLE IF NOT EXISTS public.nav_waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waypoint_code text UNIQUE NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  waypoint_type text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nav_waypoints_code ON public.nav_waypoints(waypoint_code);

-- Enable RLS
ALTER TABLE public.faa_preferred_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_waypoints ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can read FAA routes" ON public.faa_preferred_routes FOR SELECT USING (true);
CREATE POLICY "Anyone can read airports" ON public.airports FOR SELECT USING (true);
CREATE POLICY "Anyone can read runways" ON public.runways FOR SELECT USING (true);
CREATE POLICY "Anyone can read waypoints" ON public.nav_waypoints FOR SELECT USING (true);

-- Admin can manage all data
CREATE POLICY "Admins can manage FAA routes" ON public.faa_preferred_routes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage airports" ON public.airports FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage runways" ON public.runways FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage waypoints" ON public.nav_waypoints FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));