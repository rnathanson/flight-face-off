-- Rename SF50 columns to PC24 in custom_ownership_estimates table
ALTER TABLE custom_ownership_estimates 
  RENAME COLUMN sf50_owner_flown TO pc24_owner_flown;

ALTER TABLE custom_ownership_estimates 
  RENAME COLUMN ownersfleet_sf50_hours TO ownersfleet_pc24_hours;

-- Update CHECK constraint to use PC24 instead of SF50
ALTER TABLE custom_ownership_estimates 
  DROP CONSTRAINT IF EXISTS custom_ownership_estimates_aircraft_type_check;

ALTER TABLE custom_ownership_estimates 
  ADD CONSTRAINT custom_ownership_estimates_aircraft_type_check 
  CHECK (aircraft_type IN ('SR20', 'SR22', 'PC24', 'OwnersFleet'));

-- Migrate existing data from 'SF50' to 'PC24'
UPDATE custom_ownership_estimates 
SET aircraft_type = 'PC24' 
WHERE aircraft_type = 'SF50';

-- Update flight_ops_config for accurate PC24 climb/descent performance
UPDATE flight_ops_config 
SET 
  climb_rate_fpm = 2650,  -- Adjusted to achieve ~100nm climb distance in 17min to FL450
  descent_rate_fpm = 2045  -- Adjusted to achieve ~150nm descent distance in 22min from FL450
WHERE id = (SELECT id FROM flight_ops_config LIMIT 1);