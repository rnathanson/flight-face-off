-- Add organ viability time frames to flight ops config
ALTER TABLE flight_ops_config
ADD COLUMN organ_viability_hours jsonb NOT NULL DEFAULT '{
  "heart": {"min": 4, "max": 6},
  "lungs": {"min": 4, "max": 6},
  "liver": {"min": 8, "max": 12},
  "pancreas": {"min": 0, "max": 12},
  "kidneys": {"min": 24, "max": 36}
}'::jsonb;