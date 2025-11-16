
-- Add wind and crosswind limit fields to flight_ops_config
ALTER TABLE flight_ops_config 
ADD COLUMN IF NOT EXISTS max_wind_kt integer DEFAULT 35,
ADD COLUMN IF NOT EXISTS max_crosswind_kt integer DEFAULT 15;

-- Update existing config row if one exists
UPDATE flight_ops_config 
SET 
  max_wind_kt = COALESCE(max_wind_kt, 35),
  max_crosswind_kt = COALESCE(max_crosswind_kt, 15)
WHERE id IS NOT NULL;
