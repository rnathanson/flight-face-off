-- Create enum for medical roles
CREATE TYPE medical_role AS ENUM ('lead_doctor', 'surgeon', 'coordinator');

-- Create enum for viability status
CREATE TYPE viability_status AS ENUM ('safe', 'warning', 'critical');

-- Create crew_members table
CREATE TABLE public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Captain',
  is_chief_pilot BOOLEAN NOT NULL DEFAULT false,
  total_missions INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical_personnel table
CREATE TABLE public.medical_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role medical_role NOT NULL,
  specialty TEXT,
  total_missions INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mission_types table
CREATE TABLE public.mission_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organ_type TEXT NOT NULL UNIQUE,
  min_viability_hours INTEGER NOT NULL,
  max_viability_hours INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create missions table
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_hospital TEXT NOT NULL,
  destination_hospital TEXT NOT NULL,
  origin_lat NUMERIC NOT NULL,
  origin_lng NUMERIC NOT NULL,
  destination_lat NUMERIC NOT NULL,
  destination_lng NUMERIC NOT NULL,
  organ_type TEXT NOT NULL,
  estimated_time_minutes INTEGER NOT NULL,
  actual_time_minutes INTEGER,
  crew_member_ids UUID[] NOT NULL,
  lead_doctor_id UUID NOT NULL,
  surgical_team_ids UUID[],
  coordinator_id UUID,
  predicted_success_rate NUMERIC(5,2) NOT NULL,
  actual_success BOOLEAN,
  viability_status viability_status NOT NULL,
  mission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mission_analytics table
CREATE TABLE public.mission_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_combo_hash TEXT NOT NULL,
  route_hash TEXT NOT NULL,
  organ_type TEXT NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  avg_time_variance NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pilot_combo_hash, route_hash, organ_type)
);

-- Enable RLS
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Anyone can read
CREATE POLICY "Anyone can read crew members" ON public.crew_members FOR SELECT USING (true);
CREATE POLICY "Anyone can read medical personnel" ON public.medical_personnel FOR SELECT USING (true);
CREATE POLICY "Anyone can read mission types" ON public.mission_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read missions" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Anyone can read mission analytics" ON public.mission_analytics FOR SELECT USING (true);

-- Admins can manage all
CREATE POLICY "Admins can manage crew members" ON public.crew_members FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage medical personnel" ON public.medical_personnel FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage mission types" ON public.mission_types FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage missions" ON public.missions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage mission analytics" ON public.mission_analytics FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Anyone can insert missions (for demo purposes)
CREATE POLICY "Anyone can insert missions" ON public.missions FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_medical_personnel_role ON public.medical_personnel(role);
CREATE INDEX idx_medical_personnel_full_name ON public.medical_personnel(full_name);
CREATE INDEX idx_mission_analytics_pilot_combo ON public.mission_analytics(pilot_combo_hash);
CREATE INDEX idx_missions_organ_type ON public.missions(organ_type);
CREATE INDEX idx_missions_mission_date ON public.missions(mission_date);

-- Seed crew members (5 pilots)
INSERT INTO public.crew_members (full_name, is_chief_pilot, total_missions, success_rate) VALUES
  ('Annmarie Stasi', false, 142, 94.37),
  ('Christopher Coogan', false, 168, 92.26),
  ('William Kiriluk', false, 156, 95.51),
  ('Graham Newcomb', false, 134, 91.79),
  ('Sean Stefenak', true, 189, 96.30);

-- Seed medical personnel (30 fake doctors)
INSERT INTO public.medical_personnel (full_name, role, specialty, total_missions, success_rate) VALUES
  ('Dr. Sarah Chen', 'lead_doctor', 'Cardiothoracic Surgery', 156, 96.15),
  ('Dr. Michael Rodriguez', 'lead_doctor', 'Transplant Surgery', 142, 94.37),
  ('Dr. Emily Johnson', 'lead_doctor', 'Hepatobiliary Surgery', 138, 95.65),
  ('Dr. James Williams', 'lead_doctor', 'Cardiothoracic Surgery', 167, 93.41),
  ('Dr. Lisa Anderson', 'lead_doctor', 'Transplant Surgery', 151, 96.69),
  ('Dr. Robert Martinez', 'lead_doctor', 'Pulmonary Surgery', 129, 94.57),
  ('Dr. Jennifer Taylor', 'lead_doctor', 'Nephrology', 145, 97.24),
  ('Dr. David Brown', 'lead_doctor', 'Hepatobiliary Surgery', 134, 95.52),
  
  ('Dr. Amanda Wilson', 'surgeon', 'General Surgery', 98, 93.88),
  ('Dr. Christopher Lee', 'surgeon', 'Vascular Surgery', 112, 94.64),
  ('Dr. Michelle Garcia', 'surgeon', 'Cardiothoracic Surgery', 87, 96.55),
  ('Dr. Daniel Thomas', 'surgeon', 'Transplant Surgery', 105, 92.38),
  ('Dr. Rebecca Moore', 'surgeon', 'General Surgery', 93, 95.16),
  ('Dr. Matthew Jackson', 'surgeon', 'Vascular Surgery', 89, 94.38),
  ('Dr. Laura White', 'surgeon', 'Thoracic Surgery', 96, 96.88),
  ('Dr. Kevin Harris', 'surgeon', 'Transplant Surgery', 108, 93.52),
  ('Dr. Stephanie Clark', 'surgeon', 'General Surgery', 91, 95.60),
  ('Dr. Brian Lewis', 'surgeon', 'Cardiothoracic Surgery', 99, 94.95),
  ('Dr. Nicole Walker', 'surgeon', 'Vascular Surgery', 85, 96.47),
  ('Dr. Andrew Hall', 'surgeon', 'Transplant Surgery', 102, 92.16),
  ('Dr. Jessica Allen', 'surgeon', 'General Surgery', 94, 95.74),
  ('Dr. Ryan Young', 'surgeon', 'Thoracic Surgery', 88, 94.32),
  
  ('Emily Carter', 'coordinator', 'Transplant Coordination', 167, 97.01),
  ('Marcus Thompson', 'coordinator', 'Transplant Coordination', 154, 96.75),
  ('Sofia Rodriguez', 'coordinator', 'Transplant Coordination', 178, 98.31),
  ('Nathan Kim', 'coordinator', 'Transplant Coordination', 149, 96.64),
  ('Isabella Martinez', 'coordinator', 'Transplant Coordination', 163, 97.55),
  ('Alexander Wright', 'coordinator', 'Transplant Coordination', 171, 96.49),
  ('Olivia Bennett', 'coordinator', 'Transplant Coordination', 158, 97.47),
  ('Ethan Foster', 'coordinator', 'Transplant Coordination', 145, 96.55);

-- Seed mission types from organ viability data
INSERT INTO public.mission_types (organ_type, min_viability_hours, max_viability_hours) VALUES
  ('heart', 4, 6),
  ('liver', 8, 12),
  ('lungs', 4, 6),
  ('kidneys', 24, 36),
  ('pancreas', 0, 12);

-- Seed some historical mission analytics (for demo)
INSERT INTO public.mission_analytics (pilot_combo_hash, route_hash, organ_type, success_count, total_count, avg_time_variance) VALUES
  ('pilot_1_2', 'route_nyc_boston', 'heart', 28, 30, 5.3),
  ('pilot_1_3', 'route_nyc_boston', 'heart', 25, 26, 3.8),
  ('pilot_2_4', 'route_nyc_philly', 'liver', 32, 34, 6.2),
  ('pilot_3_5', 'route_boston_dc', 'lungs', 19, 20, 4.1),
  ('pilot_1_5', 'route_nyc_dc', 'kidneys', 42, 43, 2.9),
  ('pilot_2_3', 'route_philly_boston', 'heart', 21, 23, 7.4);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crew_members_updated_at BEFORE UPDATE ON public.crew_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_personnel_updated_at BEFORE UPDATE ON public.medical_personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mission_types_updated_at BEFORE UPDATE ON public.mission_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();