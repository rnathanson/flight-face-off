-- Phase 1: Safe cleanup of unused tables

-- Drop unused partnership tables
DROP TABLE IF EXISTS partnership_groups CASCADE;
DROP TABLE IF EXISTS partnership_interest_profiles CASCADE;

-- Drop unused aircraft_configs table and related policies/triggers
DROP TRIGGER IF EXISTS update_aircraft_configs_updated_at ON public.aircraft_configs;
DROP TABLE IF EXISTS aircraft_configs CASCADE;