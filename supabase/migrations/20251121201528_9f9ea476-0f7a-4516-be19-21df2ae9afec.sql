-- Remove time buffer by setting long_leg_time_factor to 1.0
UPDATE flight_ops_config 
SET long_leg_time_factor = 1.0;