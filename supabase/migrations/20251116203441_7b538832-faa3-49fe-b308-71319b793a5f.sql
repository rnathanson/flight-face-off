-- Add organ-specific experience tracking to crew_members
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS organ_experience jsonb DEFAULT '{
  "heart": {"missions": 0, "success_rate": 0},
  "liver": {"missions": 0, "success_rate": 0},
  "lungs": {"missions": 0, "success_rate": 0},
  "kidneys": {"missions": 0, "success_rate": 0},
  "pancreas": {"missions": 0, "success_rate": 0}
}'::jsonb;

ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS airport_experience jsonb DEFAULT '{}'::jsonb;

-- Add organ-specific experience tracking to medical_personnel
ALTER TABLE medical_personnel ADD COLUMN IF NOT EXISTS organ_experience jsonb DEFAULT '{
  "heart": {"missions": 0, "success_rate": 0},
  "liver": {"missions": 0, "success_rate": 0},
  "lungs": {"missions": 0, "success_rate": 0},
  "kidneys": {"missions": 0, "success_rate": 0},
  "pancreas": {"missions": 0, "success_rate": 0}
}'::jsonb;

ALTER TABLE medical_personnel ADD COLUMN IF NOT EXISTS hospital_partnerships jsonb DEFAULT '{}'::jsonb;

-- Update existing crew members with realistic organ-specific experience
-- Annmarie Stasi - Strong in cardiac and kidneys
UPDATE crew_members 
SET organ_experience = '{
  "heart": {"missions": 45, "success_rate": 94},
  "liver": {"missions": 23, "success_rate": 91},
  "lungs": {"missions": 12, "success_rate": 88},
  "kidneys": {"missions": 34, "success_rate": 92},
  "pancreas": {"missions": 8, "success_rate": 87}
}'::jsonb,
airport_experience = '{"KJFK": 15, "KLGA": 12, "KTEB": 2, "KBOS": 22, "KPHL": 18, "KDCA": 14, "KBWI": 9}'::jsonb
WHERE full_name = 'Annmarie Stasi';

-- Christopher Coogan - Well-rounded
UPDATE crew_members 
SET organ_experience = '{
  "heart": {"missions": 32, "success_rate": 90},
  "liver": {"missions": 28, "success_rate": 89},
  "lungs": {"missions": 19, "success_rate": 91},
  "kidneys": {"missions": 25, "success_rate": 88},
  "pancreas": {"missions": 15, "success_rate": 86}
}'::jsonb,
airport_experience = '{"KJFK": 18, "KLGA": 8, "KTEB": 12, "KBOS": 15, "KPHL": 10, "KDCA": 20, "KBWI": 14}'::jsonb
WHERE full_name = 'Christopher Coogan';

-- Graham Newcomb - Excellent on heart and lungs
UPDATE crew_members 
SET organ_experience = '{
  "heart": {"missions": 52, "success_rate": 96},
  "liver": {"missions": 18, "success_rate": 90},
  "lungs": {"missions": 38, "success_rate": 95},
  "kidneys": {"missions": 22, "success_rate": 89},
  "pancreas": {"missions": 11, "success_rate": 88}
}'::jsonb,
airport_experience = '{"KJFK": 25, "KLGA": 16, "KTEB": 8, "KBOS": 30, "KPHL": 22, "KDCA": 18, "KBWI": 12}'::jsonb
WHERE full_name = 'Graham Newcomb';

-- Sean Stefenak - Chief Pilot, high experience across all
UPDATE crew_members 
SET organ_experience = '{
  "heart": {"missions": 67, "success_rate": 95},
  "liver": {"missions": 54, "success_rate": 93},
  "lungs": {"missions": 48, "success_rate": 94},
  "kidneys": {"missions": 61, "success_rate": 95},
  "pancreas": {"missions": 38, "success_rate": 92}
}'::jsonb,
airport_experience = '{"KJFK": 35, "KLGA": 28, "KTEB": 18, "KBOS": 42, "KPHL": 38, "KDCA": 32, "KBWI": 25}'::jsonb
WHERE full_name = 'Sean Stefenak' AND is_chief_pilot = true;

-- Taylor McKnight - Newer pilot, building experience
UPDATE crew_members 
SET organ_experience = '{
  "heart": {"missions": 18, "success_rate": 87},
  "liver": {"missions": 15, "success_rate": 85},
  "lungs": {"missions": 12, "success_rate": 86},
  "kidneys": {"missions": 20, "success_rate": 88},
  "pancreas": {"missions": 8, "success_rate": 84}
}'::jsonb,
airport_experience = '{"KJFK": 8, "KLGA": 5, "KTEB": 15, "KBOS": 12, "KPHL": 7, "KDCA": 6, "KBWI": 10}'::jsonb
WHERE full_name = 'Taylor McKnight';

-- Update medical personnel with organ-specific experience and hospital partnerships
-- Dr. Sarah Chen - Cardiothoracic specialist
UPDATE medical_personnel 
SET organ_experience = '{
  "heart": {"missions": 67, "success_rate": 89},
  "liver": {"missions": 5, "success_rate": 80},
  "lungs": {"missions": 34, "success_rate": 86},
  "kidneys": {"missions": 0, "success_rate": 0},
  "pancreas": {"missions": 2, "success_rate": 75}
}'::jsonb,
hospital_partnerships = '{"Johns Hopkins Hospital": 45, "NYU Langone Health": 32, "Massachusetts General Hospital": 28, "Cleveland Clinic": 15}'::jsonb
WHERE full_name = 'Dr. Sarah Chen';

-- Dr. Michael Rodriguez - Liver and kidney specialist
UPDATE medical_personnel 
SET organ_experience = '{
  "heart": {"missions": 8, "success_rate": 82},
  "liver": {"missions": 58, "success_rate": 92},
  "lungs": {"missions": 12, "success_rate": 84},
  "kidneys": {"missions": 52, "success_rate": 90},
  "pancreas": {"missions": 28, "success_rate": 88}
}'::jsonb,
hospital_partnerships = '{"Mayo Clinic": 38, "Johns Hopkins Hospital": 28, "UCLA Medical Center": 42, "NYU Langone Health": 22}'::jsonb
WHERE full_name = 'Dr. Michael Rodriguez';

-- Dr. Emily Washington - General transplant surgeon
UPDATE medical_personnel 
SET organ_experience = '{
  "heart": {"missions": 32, "success_rate": 87},
  "liver": {"missions": 38, "success_rate": 89},
  "lungs": {"missions": 28, "success_rate": 88},
  "kidneys": {"missions": 45, "success_rate": 91},
  "pancreas": {"missions": 22, "success_rate": 86}
}'::jsonb,
hospital_partnerships = '{"Massachusetts General Hospital": 48, "Cleveland Clinic": 35, "Johns Hopkins Hospital": 38, "Mount Sinai Hospital": 28}'::jsonb
WHERE full_name = 'Dr. Emily Washington';

-- Dr. James Kim - Lung specialist
UPDATE medical_personnel 
SET organ_experience = '{
  "heart": {"missions": 15, "success_rate": 84},
  "liver": {"missions": 18, "success_rate": 85},
  "lungs": {"missions": 62, "success_rate": 93},
  "kidneys": {"missions": 22, "success_rate": 87},
  "pancreas": {"missions": 10, "success_rate": 82}
}'::jsonb,
hospital_partnerships = '{"NYU Langone Health": 52, "Mayo Clinic": 28, "Cleveland Clinic": 42, "UCSF Medical Center": 35}'::jsonb
WHERE full_name = 'Dr. James Kim';

-- Dr. Lisa Thompson - Kidney and pancreas specialist
UPDATE medical_personnel 
SET organ_experience = '{
  "heart": {"missions": 5, "success_rate": 80},
  "liver": {"missions": 22, "success_rate": 86},
  "lungs": {"missions": 12, "success_rate": 83},
  "kidneys": {"missions": 68, "success_rate": 94},
  "pancreas": {"missions": 45, "success_rate": 91}
}'::jsonb,
hospital_partnerships = '{"UCLA Medical Center": 58, "Johns Hopkins Hospital": 42, "Massachusetts General Hospital": 35, "Mayo Clinic": 48}'::jsonb
WHERE full_name = 'Dr. Lisa Thompson';