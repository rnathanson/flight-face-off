-- Add more surgeons with varied organ-specific experience
-- This ensures we have surgeons with diverse success rates for each organ type

-- First, let's add surgeons with high success rates (90-100%)
INSERT INTO medical_personnel (full_name, role, specialty, total_missions, success_rate, organ_experience, hospital_partnerships)
VALUES 
  ('Dr. Marcus Thompson', 'surgeon', 'Cardiothoracic Surgery', 178, 97.75, 
   '{"heart": {"missions": 89, "success_rate": 98}, "liver": {"missions": 12, "success_rate": 92}, "lungs": {"missions": 67, "success_rate": 97}, "kidneys": {"missions": 8, "success_rate": 87}, "pancreas": {"missions": 2, "success_rate": 100}}'::jsonb,
   '{"Johns Hopkins Hospital": 42, "Mayo Clinic": 38, "Cleveland Clinic": 28}'::jsonb),
   
  ('Dr. Rachel Kim', 'surgeon', 'Hepatobiliary Surgery', 165, 96.36, 
   '{"heart": {"missions": 5, "success_rate": 80}, "liver": {"missions": 98, "success_rate": 97}, "lungs": {"missions": 4, "success_rate": 75}, "kidneys": {"missions": 45, "success_rate": 96}, "pancreas": {"missions": 13, "success_rate": 92}}'::jsonb,
   '{"UCLA Medical Center": 52, "NYU Langone Health": 38, "Massachusetts General Hospital": 35}'::jsonb),
   
  ('Dr. Jonathan Wells', 'surgeon', 'Pulmonary Surgery', 152, 95.39, 
   '{"heart": {"missions": 8, "success_rate": 87}, "liver": {"missions": 6, "success_rate": 83}, "lungs": {"missions": 102, "success_rate": 96}, "kidneys": {"missions": 28, "success_rate": 93}, "pancreas": {"missions": 8, "success_rate": 87}}'::jsonb,
   '{"Cleveland Clinic": 48, "Johns Hopkins Hospital": 42, "Stanford Health": 32}'::jsonb);

-- Add surgeons with good success rates (85-89%)
INSERT INTO medical_personnel (full_name, role, specialty, total_missions, success_rate, organ_experience, hospital_partnerships)
VALUES 
  ('Dr. Sofia Martinez', 'surgeon', 'Transplant Surgery', 143, 88.81, 
   '{"heart": {"missions": 38, "success_rate": 89}, "liver": {"missions": 42, "success_rate": 90}, "lungs": {"missions": 25, "success_rate": 88}, "kidneys": {"missions": 28, "success_rate": 86}, "pancreas": {"missions": 10, "success_rate": 90}}'::jsonb,
   '{"Mayo Clinic": 35, "UCLA Medical Center": 28, "NYU Langone Health": 25}'::jsonb),
   
  ('Dr. Kevin Park', 'surgeon', 'Cardiothoracic Surgery', 138, 87.68, 
   '{"heart": {"missions": 72, "success_rate": 89}, "liver": {"missions": 8, "success_rate": 75}, "lungs": {"missions": 48, "success_rate": 87}, "kidneys": {"missions": 8, "success_rate": 87}, "pancreas": {"missions": 2, "success_rate": 100}}'::jsonb,
   '{"Johns Hopkins Hospital": 38, "Cleveland Clinic": 32, "Stanford Health": 28}'::jsonb),
   
  ('Dr. Nina Patel', 'surgeon', 'Nephrology', 147, 86.39, 
   '{"heart": {"missions": 4, "success_rate": 75}, "liver": {"missions": 22, "success_rate": 86}, "lungs": {"missions": 6, "success_rate": 83}, "kidneys": {"missions": 102, "success_rate": 87}, "pancreas": {"missions": 13, "success_rate": 85}}'::jsonb,
   '{"Massachusetts General Hospital": 45, "NYU Langone Health": 38, "UCLA Medical Center": 32}'::jsonb);

-- Add surgeons with moderate success rates (80-84%)
INSERT INTO medical_personnel (full_name, role, specialty, total_missions, success_rate, organ_experience, hospital_partnerships)
VALUES 
  ('Dr. Thomas Chen', 'surgeon', 'General Surgery', 129, 83.72, 
   '{"heart": {"missions": 18, "success_rate": 83}, "liver": {"missions": 32, "success_rate": 84}, "lungs": {"missions": 22, "success_rate": 82}, "kidneys": {"missions": 38, "success_rate": 84}, "pancreas": {"missions": 19, "success_rate": 84}}'::jsonb,
   '{"Stanford Health": 32, "UCLA Medical Center": 28, "Mayo Clinic": 25}'::jsonb),
   
  ('Dr. Patricia Moore', 'surgeon', 'Transplant Surgery', 124, 82.26, 
   '{"heart": {"missions": 28, "success_rate": 82}, "liver": {"missions": 28, "success_rate": 82}, "lungs": {"missions": 32, "success_rate": 84}, "kidneys": {"missions": 22, "success_rate": 81}, "pancreas": {"missions": 14, "success_rate": 78}}'::jsonb,
   '{"Cleveland Clinic": 28, "Johns Hopkins Hospital": 25, "Massachusetts General Hospital": 22}'::jsonb),
   
  ('Dr. Robert Chang', 'surgeon', 'Hepatobiliary Surgery', 118, 81.36, 
   '{"heart": {"missions": 6, "success_rate": 83}, "liver": {"missions": 68, "success_rate": 82}, "lungs": {"missions": 8, "success_rate": 75}, "kidneys": {"missions": 28, "success_rate": 82}, "pancreas": {"missions": 8, "success_rate": 75}}'::jsonb,
   '{"NYU Langone Health": 32, "UCLA Medical Center": 28, "Stanford Health": 22}'::jsonb);

-- Add surgeons with lower success rates (75-79%)
INSERT INTO medical_personnel (full_name, role, specialty, total_missions, success_rate, organ_experience, hospital_partnerships)
VALUES 
  ('Dr. Lauren Foster', 'surgeon', 'General Surgery', 108, 78.70, 
   '{"heart": {"missions": 22, "success_rate": 77}, "liver": {"missions": 18, "success_rate": 78}, "lungs": {"missions": 28, "success_rate": 79}, "kidneys": {"missions": 32, "success_rate": 81}, "pancreas": {"missions": 8, "success_rate": 75}}'::jsonb,
   '{"Massachusetts General Hospital": 28, "Stanford Health": 22, "Mayo Clinic": 18}'::jsonb),
   
  ('Dr. Samuel Brooks', 'surgeon', 'Cardiothoracic Surgery', 102, 77.45, 
   '{"heart": {"missions": 58, "success_rate": 78}, "liver": {"missions": 6, "success_rate": 67}, "lungs": {"missions": 32, "success_rate": 78}, "kidneys": {"missions": 4, "success_rate": 75}, "pancreas": {"missions": 2, "success_rate": 50}}'::jsonb,
   '{"Johns Hopkins Hospital": 28, "Cleveland Clinic": 22, "NYU Langone Health": 18}'::jsonb),
   
  ('Dr. Michelle Garcia', 'surgeon', 'Transplant Surgery', 98, 76.53, 
   '{"heart": {"missions": 18, "success_rate": 77}, "liver": {"missions": 22, "success_rate": 77}, "lungs": {"missions": 18, "success_rate": 78}, "kidneys": {"missions": 28, "success_rate": 75}, "pancreas": {"missions": 12, "success_rate": 75}}'::jsonb,
   '{"UCLA Medical Center": 25, "Stanford Health": 22, "Mayo Clinic": 18}'::jsonb);

-- Update existing surgeons who have no organ experience data
UPDATE medical_personnel 
SET organ_experience = '{"heart": {"missions": 15, "success_rate": 80}, "liver": {"missions": 22, "success_rate": 82}, "lungs": {"missions": 18, "success_rate": 79}, "kidneys": {"missions": 28, "success_rate": 83}, "pancreas": {"missions": 12, "success_rate": 75}}'::jsonb,
    hospital_partnerships = '{"Cleveland Clinic": 18, "Johns Hopkins Hospital": 15, "Massachusetts General Hospital": 12}'::jsonb
WHERE role = 'surgeon' AND (organ_experience IS NULL OR organ_experience = '{}'::jsonb OR 
      (organ_experience->>'heart' IS NULL OR (organ_experience->'heart'->>'missions')::int = 0));