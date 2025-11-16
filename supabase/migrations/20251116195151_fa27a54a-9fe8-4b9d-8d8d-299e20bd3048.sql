-- Add weight and balance configuration to flight_ops_config
ALTER TABLE flight_ops_config 
ADD COLUMN IF NOT EXISTS empty_weight_lbs INTEGER DEFAULT 12200,
ADD COLUMN IF NOT EXISTS avg_passenger_weight_lbs INTEGER DEFAULT 180,
ADD COLUMN IF NOT EXISTS fuel_weight_per_gallon NUMERIC DEFAULT 6.8,
ADD COLUMN IF NOT EXISTS max_takeoff_weight_lbs INTEGER DEFAULT 18740,
ADD COLUMN IF NOT EXISTS max_landing_weight_lbs INTEGER DEFAULT 17340,
ADD COLUMN IF NOT EXISTS refueling_time_minutes INTEGER DEFAULT 30;

-- Add fuel type tracking to airports
ALTER TABLE airports 
ADD COLUMN IF NOT EXISTS has_jet_fuel BOOLEAN DEFAULT NULL;

-- Add index for faster jet fuel queries
CREATE INDEX IF NOT EXISTS idx_airports_jet_fuel ON airports(has_jet_fuel) WHERE has_jet_fuel = true;