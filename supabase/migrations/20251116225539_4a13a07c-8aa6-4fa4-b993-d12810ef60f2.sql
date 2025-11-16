-- Create airport cache table for faster lookups
-- This caches AirNav data to avoid repeated scraping
CREATE TABLE IF NOT EXISTS public.airport_cache (
  airport_code TEXT PRIMARY KEY,
  name TEXT,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  elevation_ft INTEGER,
  has_jet_fuel BOOLEAN DEFAULT false,
  has_lighting BOOLEAN DEFAULT false,
  runways JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Create index for expiration checks
CREATE INDEX IF NOT EXISTS idx_airport_cache_expires ON public.airport_cache(expires_at);

-- Enable Row Level Security (public read-only data)
ALTER TABLE public.airport_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read airport cache
CREATE POLICY "Airport cache is publicly readable"
  ON public.airport_cache
  FOR SELECT
  USING (true);

-- Only service role can insert/update cache
CREATE POLICY "Service role can manage airport cache"
  ON public.airport_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment explaining cache strategy
COMMENT ON TABLE public.airport_cache IS 'Caches AirNav airport data for 7 days to reduce scraping. Weather data is NEVER cached - always fetched live.';