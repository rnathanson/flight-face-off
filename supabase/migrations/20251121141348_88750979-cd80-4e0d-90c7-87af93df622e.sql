-- Add long_leg_time_factor column to flight_ops_config table
ALTER TABLE flight_ops_config 
ADD COLUMN IF NOT EXISTS long_leg_time_factor NUMERIC DEFAULT 1.12;

-- Update the existing config row to set the factor to 1.12 for better ForeFlight alignment
UPDATE flight_ops_config 
SET long_leg_time_factor = 1.12;