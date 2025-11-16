-- Add taxi time per airport configuration field
ALTER TABLE flight_ops_config 
ADD COLUMN taxi_time_per_airport_min integer NOT NULL DEFAULT 5;

COMMENT ON COLUMN flight_ops_config.taxi_time_per_airport_min IS 'Taxi time for one operation (taxi-out OR taxi-in) in minutes. Total time per flight leg = this value × 2';