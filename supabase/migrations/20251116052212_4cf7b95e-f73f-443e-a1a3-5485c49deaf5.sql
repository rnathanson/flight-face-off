-- Add ground handling time configuration field
ALTER TABLE flight_ops_config 
ADD COLUMN ground_handling_time_min integer NOT NULL DEFAULT 15;

COMMENT ON COLUMN flight_ops_config.ground_handling_time_min IS 'Ground handling time for patient loading/unloading, refueling, and other ground operations at pickup/delivery airports';