
-- Migration: 20251016155544
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for aircraft configurations
CREATE TABLE public.aircraft_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aircraft_configs ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see the config)
CREATE POLICY "Anyone can read configs" 
ON public.aircraft_configs 
FOR SELECT 
USING (true);

-- Public write access (anyone can update configs)
CREATE POLICY "Anyone can insert configs" 
ON public.aircraft_configs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update configs" 
ON public.aircraft_configs 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_aircraft_configs_updated_at
BEFORE UPDATE ON public.aircraft_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251016175955
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table to store role assignments
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update aircraft_configs RLS policies for proper security
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read configs" ON public.aircraft_configs;
DROP POLICY IF EXISTS "Anyone can insert configs" ON public.aircraft_configs;
DROP POLICY IF EXISTS "Anyone can update configs" ON public.aircraft_configs;

-- Create new secure policies
-- Public read access (everyone can use the app)
CREATE POLICY "Anyone can read configs"
  ON public.aircraft_configs
  FOR SELECT
  USING (true);

-- Only admins can modify configs
CREATE POLICY "Only admins can insert configs"
  ON public.aircraft_configs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update configs"
  ON public.aircraft_configs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete configs"
  ON public.aircraft_configs
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20251017123836
-- Create custom_quotes table for personalized calculator links
CREATE TABLE public.custom_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_slug TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'expired')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Purchase & Financing
  aircraft_cost NUMERIC NOT NULL,
  down_payment_percent NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  loan_term_years INTEGER NOT NULL,
  
  -- Flying Hours
  owner_hours INTEGER NOT NULL,
  rental_hours INTEGER NOT NULL,
  pilot_services_hours INTEGER NOT NULL,
  is_non_pilot BOOLEAN NOT NULL DEFAULT false,
  
  -- Parking
  parking_type TEXT NOT NULL CHECK (parking_type IN ('tiedown', 'hangar')),
  
  -- Fixed Costs (all stored to allow full customization per quote)
  insurance_annual NUMERIC NOT NULL,
  management_fee NUMERIC NOT NULL,
  subscriptions NUMERIC NOT NULL,
  tci_training NUMERIC NOT NULL,
  maintenance_per_hour NUMERIC NOT NULL,
  tiedown_cost NUMERIC NOT NULL,
  hangar_cost NUMERIC NOT NULL,
  
  -- Revenue Rates
  rental_revenue_rate NUMERIC NOT NULL,
  owner_usage_rate NUMERIC NOT NULL,
  pilot_services_rate NUMERIC NOT NULL
);

-- Enable RLS
ALTER TABLE public.custom_quotes ENABLE ROW LEVEL SECURITY;

-- Create index on slug for fast lookups
CREATE INDEX idx_custom_quotes_slug ON public.custom_quotes(unique_slug);

-- Admins can do everything
CREATE POLICY "Admins can manage all quotes"
ON public.custom_quotes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Public can read quotes by slug (for customer access)
CREATE POLICY "Public can view quotes by slug"
ON public.custom_quotes
FOR SELECT
USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_custom_quotes_updated_at
BEFORE UPDATE ON public.custom_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251017133504
-- Allow anyone to insert custom quotes (for public save calculator feature)
CREATE POLICY "Anyone can create quotes"
ON public.custom_quotes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Migration: 20251017160121
-- Rename custom_quotes table to custom_ownership_estimates
ALTER TABLE public.custom_quotes RENAME TO custom_ownership_estimates;

-- Update RLS policies (they should automatically follow the table rename, but let's be explicit)
-- The policies will remain the same, just commenting for clarity:
-- 1. Admins can manage all estimates
-- 2. Anyone can create estimates  
-- 3. Public can view estimates by slug

-- Recreate the update trigger with the new table name
DROP TRIGGER IF EXISTS update_custom_quotes_updated_at ON public.custom_ownership_estimates;

CREATE TRIGGER update_custom_ownership_estimates_updated_at
BEFORE UPDATE ON public.custom_ownership_estimates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251017205311
-- Add inputs_locked column to custom_ownership_estimates table
ALTER TABLE public.custom_ownership_estimates 
ADD COLUMN inputs_locked boolean DEFAULT false;

-- Migration: 20251018001836
-- Create secure view tracking function
CREATE OR REPLACE FUNCTION public.increment_estimate_view(_estimate_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE custom_ownership_estimates
  SET view_count = view_count + 1,
      last_viewed_at = now(),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE id = _estimate_id;
END;
$$ LANGUAGE plpgsql;

-- Ensure UPDATE policy prevents direct client updates (only admins can update directly)
DROP POLICY IF EXISTS "Public can update their own quotes" ON custom_ownership_estimates;

-- Create policy to allow the increment function to work
GRANT EXECUTE ON FUNCTION public.increment_estimate_view(uuid) TO anon, authenticated;

-- Add RLS policy to ensure only admins can directly UPDATE estimates
CREATE POLICY "Only admins can update estimates directly"
ON custom_ownership_estimates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Ensure admin users can be created - create a helper function for initial admin setup
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
$$;

-- Migration: 20251018002534
-- Note: To create your first admin user, you'll need to:
-- 1. Sign up via the admin login page at /admin-login with your admin email/password
-- 2. Then run this SQL with your user ID to grant admin access:

-- EXAMPLE (replace 'your-user-id-here' with actual UUID from auth.users):
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'admin')
-- ON CONFLICT DO NOTHING;

-- To find your user ID after signing up, you can query:
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Migration: 20251018010148
-- Add aircraft type and SF50-specific fields to custom_ownership_estimates

-- 1. Add aircraft_type column (default to SR22 for existing records)
ALTER TABLE custom_ownership_estimates 
ADD COLUMN aircraft_type TEXT DEFAULT 'SR22' 
CHECK (aircraft_type IN ('SR22', 'SF50'));

-- 2. Add SF50-specific fields
ALTER TABLE custom_ownership_estimates 
ADD COLUMN cleaning_monthly NUMERIC DEFAULT 0,
ADD COLUMN pilot_services_annual NUMERIC DEFAULT 0,
ADD COLUMN jetstream_hourly NUMERIC DEFAULT 0;

-- 3. Update existing estimates to SR22 (ensuring backward compatibility)
UPDATE custom_ownership_estimates 
SET aircraft_type = 'SR22' 
WHERE aircraft_type IS NULL;

-- 4. Make aircraft_type non-nullable after backfill
ALTER TABLE custom_ownership_estimates 
ALTER COLUMN aircraft_type SET NOT NULL;

-- Migration: 20251018014928
-- Add ownership_share column to custom_ownership_estimates table
ALTER TABLE public.custom_ownership_estimates
ADD COLUMN ownership_share numeric NOT NULL DEFAULT 1
CHECK (ownership_share IN (1, 0.5, 0.333, 0.25));

COMMENT ON COLUMN public.custom_ownership_estimates.ownership_share IS 'Fractional ownership share: 1 (full), 0.5 (1/2), 0.333 (1/3), or 0.25 (1/4)';

-- Migration: 20251020150440
-- Create partnership_interest_profiles table
CREATE TABLE partnership_interest_profiles (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'matched', 'purchased', 'inactive')),
  
  -- Contact Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'either')),
  
  -- Aircraft Interest
  aircraft_preference TEXT[] NOT NULL,
  ownership_share_preferences NUMERIC[] NOT NULL,
  share_flexible BOOLEAN DEFAULT false,
  
  -- Calculator Scenario (saved from mini calculator)
  calculated_aircraft TEXT,
  calculated_share NUMERIC,
  calculated_aircraft_cost NUMERIC,
  calculated_down_payment_percent NUMERIC,
  calculated_loan_term_years INTEGER,
  calculated_monthly_hours INTEGER,
  calculated_leaseback_included BOOLEAN,
  calculated_monthly_net_cost NUMERIC,
  calculated_monthly_gross_cost NUMERIC,
  calculated_equity_3year NUMERIC,
  
  -- Pilot Profile
  pilot_status TEXT NOT NULL CHECK (pilot_status IN ('licensed', 'non_pilot', 'in_training')),
  pilot_certificate_type TEXT,
  training_completion_date DATE,
  expected_monthly_hours INTEGER NOT NULL,
  mission_profiles TEXT[] NOT NULL,
  
  -- Leaseback Interest
  leaseback_interest TEXT NOT NULL CHECK (leaseback_interest IN ('very_interested', 'somewhat', 'not_interested', 'need_info')),
  
  -- Usage & Availability
  typical_flying_time TEXT NOT NULL CHECK (typical_flying_time IN ('weekdays', 'weekends', 'both', 'varies')),
  scheduling_flexibility TEXT NOT NULL CHECK (scheduling_flexibility IN ('very_flexible', 'somewhat_flexible', 'not_flexible')),
  sharing_comfort TEXT CHECK (sharing_comfort IN ('multiple_coowners', 'one_coowner', 'carefully_matched')),
  
  -- Timeline
  purchase_timeline TEXT NOT NULL CHECK (purchase_timeline IN ('immediate', '1_3_months', '3_6_months', '6_12_months', '12_plus_months')),
  previous_aircraft_owner BOOLEAN DEFAULT false,
  
  -- Additional Info
  additional_notes TEXT,
  admin_notes TEXT,
  
  -- Matching Metadata
  match_pool UUID[],
  matched_with UUID[],
  match_scores JSONB DEFAULT '{}',
  compatibility_version INTEGER DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX idx_partnership_profiles_status ON partnership_interest_profiles(status);
CREATE INDEX idx_partnership_profiles_aircraft ON partnership_interest_profiles USING GIN(aircraft_preference);
CREATE INDEX idx_partnership_profiles_timeline ON partnership_interest_profiles(purchase_timeline);
CREATE INDEX idx_partnership_profiles_created ON partnership_interest_profiles(created_at DESC);

-- Enable RLS
ALTER TABLE partnership_interest_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all profiles"
  ON partnership_interest_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create partnership_groups table
CREATE TABLE partnership_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Group Details
  group_name TEXT,
  aircraft_type TEXT NOT NULL CHECK (aircraft_type IN ('SR22', 'SF50')),
  total_shares_needed NUMERIC NOT NULL,
  shares_filled NUMERIC DEFAULT 0,
  
  -- Status Tracking
  status TEXT DEFAULT 'forming' CHECK (status IN ('forming', 'committed', 'aircraft_ordered', 'delivered', 'dissolved')),
  aircraft_order_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  aircraft_tail_number TEXT,
  
  -- Member Profiles
  member_profile_ids UUID[] NOT NULL,
  
  -- Admin Notes
  admin_notes TEXT,
  
  CONSTRAINT shares_sum_valid CHECK (shares_filled <= total_shares_needed)
);

CREATE INDEX idx_partnership_groups_status ON partnership_groups(status);
CREATE INDEX idx_partnership_groups_aircraft ON partnership_groups(aircraft_type);

-- Enable RLS
ALTER TABLE partnership_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage groups"
  ON partnership_groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_partnership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_partnership_profiles_updated_at
BEFORE UPDATE ON partnership_interest_profiles
FOR EACH ROW
EXECUTE FUNCTION update_partnership_updated_at();

CREATE TRIGGER update_partnership_groups_updated_at
BEFORE UPDATE ON partnership_groups
FOR EACH ROW
EXECUTE FUNCTION update_partnership_updated_at();

-- Migration: 20251020181215
-- Add new fields to partnership_interest_profiles for improved matching

-- Add passenger composition fields
ALTER TABLE partnership_interest_profiles
ADD COLUMN IF NOT EXISTS passenger_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS typical_passenger_count text;

-- Drop the pilot_certificate_type column if it exists (no longer needed)
ALTER TABLE partnership_interest_profiles
DROP COLUMN IF EXISTS pilot_certificate_type;

-- Update aircraft_preference to support 'owners_fleet' option
-- (Already text[] so no schema change needed, just usage change)

-- Add comment for documentation
COMMENT ON COLUMN partnership_interest_profiles.passenger_types IS 'Array of passenger types: solo, family, business_partners, friends';
COMMENT ON COLUMN partnership_interest_profiles.typical_passenger_count IS 'Typical passenger count per trip: 0-1, 2-3, 4-5, 6+';

-- Migration: 20251020200554
-- Update partnership_interest_profiles table to replace hours-based metrics with frequency-based metrics

-- Remove old hours-based fields and add new frequency fields
ALTER TABLE partnership_interest_profiles 
  DROP COLUMN IF EXISTS expected_monthly_hours,
  ADD COLUMN IF NOT EXISTS usage_frequency_days integer,
  ADD COLUMN IF NOT EXISTS usage_seasonal_pattern text CHECK (usage_seasonal_pattern IN ('consistent', 'higher_fall_winter', 'higher_spring_summer', 'custom')),
  ADD COLUMN IF NOT EXISTS fall_winter_days integer,
  ADD COLUMN IF NOT EXISTS spring_summer_days integer;

-- Update calculated fields to remove monthly hours
ALTER TABLE partnership_interest_profiles 
  DROP COLUMN IF EXISTS calculated_monthly_hours;

-- Migration: 20251025230212
-- Add allow_share_selection field to custom_ownership_estimates
ALTER TABLE custom_ownership_estimates 
ADD COLUMN allow_share_selection boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN custom_ownership_estimates.allow_share_selection IS 'Allow customer to change ownership share when viewing estimate';

-- Migration: 20251027195619
-- Add SF50-specific columns to custom_ownership_estimates table
ALTER TABLE custom_ownership_estimates
ADD COLUMN IF NOT EXISTS sf50_owner_flown boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fuel_burn_per_hour numeric DEFAULT 80,
ADD COLUMN IF NOT EXISTS fuel_price_per_gallon numeric DEFAULT 6.50,
ADD COLUMN IF NOT EXISTS pilot_services_hourly numeric DEFAULT 200,
ADD COLUMN IF NOT EXISTS pilot_pool_contribution numeric DEFAULT 25000;

-- Migration: 20251027210421
-- Relax aircraft_type check constraint to include SR20 and OwnersFleet
ALTER TABLE public.custom_ownership_estimates
  DROP CONSTRAINT IF EXISTS custom_ownership_estimates_aircraft_type_check;

ALTER TABLE public.custom_ownership_estimates
  ADD CONSTRAINT custom_ownership_estimates_aircraft_type_check
  CHECK (aircraft_type = ANY (ARRAY['SR20','SR22','SF50','OwnersFleet']));

-- Migration: 20251027215333
-- Add Owner's Fleet dual hours columns for tracking SR22 and SF50 hours separately
ALTER TABLE custom_ownership_estimates
ADD COLUMN ownersfleet_sr22_hours integer NOT NULL DEFAULT 0,
ADD COLUMN ownersfleet_sf50_hours integer NOT NULL DEFAULT 0;

-- Migration: 20251027220342
-- Add SR22 Pilot Services Hours column for Owner's Fleet estimates
ALTER TABLE public.custom_ownership_estimates
ADD COLUMN ownersfleet_sr22_pilot_services_hours integer NOT NULL DEFAULT 0;

-- Migration: 20251029214125
-- Add JetStream package selection field to custom_ownership_estimates
ALTER TABLE custom_ownership_estimates 
ADD COLUMN jetstream_package TEXT 
DEFAULT '2yr-300hrs'
CHECK (jetstream_package IN ('2yr-300hrs', '3yr-450hrs', '3yr-600hrs'));

-- Migration: 20251029215519
-- Add new fields for SF50 configuration
ALTER TABLE custom_ownership_estimates 
ADD COLUMN IF NOT EXISTS base_aircraft_cost NUMERIC DEFAULT 3500000,
ADD COLUMN IF NOT EXISTS include_jetstream_reserve BOOLEAN DEFAULT false;

-- Migration: 20251029221310
-- Add include_jetstream_reserve column to custom_ownership_estimates table
ALTER TABLE custom_ownership_estimates 
ADD COLUMN IF NOT EXISTS include_jetstream_reserve boolean DEFAULT false;

-- Migration: 20251029221733
-- Rename base_aircraft_cost to aircraft_cost_base for consistency
ALTER TABLE custom_ownership_estimates 
RENAME COLUMN base_aircraft_cost TO aircraft_cost_base;

-- Migration: 20251113174017
-- Create sales_leads table
CREATE TABLE public.sales_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contact Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  title TEXT,
  
  -- Lead Details
  aircraft_interest TEXT[] NOT NULL DEFAULT '{}', -- SR20, SR22, SR22T, SF50
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, demo_scheduled, negotiating, closing, won, lost
  probability_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  temperature TEXT NOT NULL DEFAULT 'warm', -- hot, warm, cold
  
  -- Financial
  estimated_value NUMERIC,
  pricing_tier TEXT, -- standard, premium, fleet
  
  -- Demographics (parsed from conversations)
  profession TEXT,
  age_range TEXT,
  location TEXT,
  flying_experience TEXT, -- student, private, commercial, atp
  
  -- Engagement Metrics
  calculator_opens INTEGER NOT NULL DEFAULT 0,
  email_opens INTEGER NOT NULL DEFAULT 0,
  call_duration_minutes INTEGER NOT NULL DEFAULT 0,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  
  -- AI Insights
  persona_type TEXT, -- doctor, business_owner, corporate_fleet, retiree
  look_alike_ids UUID[],
  recommended_talk_track TEXT,
  objections_detected TEXT[],
  
  -- Assignment
  assigned_to TEXT,
  escalated_to TEXT,
  escalation_reason TEXT,
  
  -- Notes
  admin_notes TEXT
);

-- Create lead_activities table for interaction tracking
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- email, call, calculator_view, meeting, demo
  description TEXT NOT NULL,
  sentiment_score NUMERIC, -- -1.0 to 1.0
  duration_minutes INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create ai_recommendations table
CREATE TABLE public.ai_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- follow_up, escalate, send_content, schedule_demo
  action_text TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  confidence_score INTEGER NOT NULL, -- 0-100
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, dismissed
  
  -- Timing
  suggested_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create communication_transcripts table
CREATE TABLE public.communication_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL, -- email, phone, meeting
  direction TEXT NOT NULL, -- inbound, outbound
  
  subject TEXT,
  transcript TEXT NOT NULL,
  summary TEXT,
  
  -- AI Analysis
  key_phrases TEXT[],
  sentiment_overall NUMERIC, -- -1.0 to 1.0
  objections_mentioned TEXT[],
  competitor_mentions TEXT[],
  buying_signals TEXT[],
  
  -- Metadata
  participants TEXT[],
  duration_minutes INTEGER
);

-- Create sales_metrics table for aggregated KPIs
CREATE TABLE public.sales_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metric_date DATE NOT NULL,
  
  -- Pipeline Metrics
  total_pipeline_value NUMERIC NOT NULL DEFAULT 0,
  total_leads INTEGER NOT NULL DEFAULT 0,
  qualified_leads INTEGER NOT NULL DEFAULT 0,
  active_opportunities INTEGER NOT NULL DEFAULT 0,
  
  -- Conversion Metrics
  conversion_rate NUMERIC NOT NULL DEFAULT 0,
  avg_days_to_close INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  
  -- AI Metrics
  ai_recommendation_success_rate NUMERIC NOT NULL DEFAULT 0,
  avg_response_time_hours INTEGER NOT NULL DEFAULT 0,
  
  -- Quota
  monthly_quota NUMERIC NOT NULL DEFAULT 0,
  quota_attainment NUMERIC NOT NULL DEFAULT 0
);

-- Create competitor_mentions table
CREATE TABLE public.competitor_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES public.communication_transcripts(id) ON DELETE CASCADE,
  
  competitor_name TEXT NOT NULL, -- Piper, Cessna, Diamond, etc.
  context TEXT NOT NULL,
  sentiment TEXT, -- positive, neutral, negative
  battle_card_link TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_mentions ENABLE ROW LEVEL SECURITY;

-- Create policies (admin only)
CREATE POLICY "Admins can manage sales_leads" ON public.sales_leads FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage lead_activities" ON public.lead_activities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage ai_recommendations" ON public.ai_recommendations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage communication_transcripts" ON public.communication_transcripts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage sales_metrics" ON public.sales_metrics FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage competitor_mentions" ON public.competitor_mentions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger function (reuse existing)
CREATE TRIGGER update_sales_leads_updated_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_sales_leads_status ON public.sales_leads(status);
CREATE INDEX idx_sales_leads_probability ON public.sales_leads(probability_score DESC);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_ai_recommendations_lead_id ON public.ai_recommendations(lead_id);
CREATE INDEX idx_ai_recommendations_status ON public.ai_recommendations(status);
CREATE INDEX idx_transcripts_lead_id ON public.communication_transcripts(lead_id);

-- Migration: 20251113182041
-- Create customer purchase history table
CREATE TABLE public.customer_purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.sales_leads(id) ON DELETE CASCADE NOT NULL,
  purchase_date DATE NOT NULL,
  delivery_date DATE,
  aircraft_type TEXT NOT NULL CHECK (aircraft_type IN ('SR22', 'SR22T', 'SF50')),
  aircraft_tail_number TEXT,
  order_value NUMERIC NOT NULL,
  configuration_changes_count INTEGER DEFAULT 0,
  configuration_changes_details JSONB DEFAULT '[]'::jsonb,
  delivery_delay_days INTEGER DEFAULT 0,
  post_sale_support_tickets INTEGER DEFAULT 0,
  post_sale_satisfaction_score NUMERIC CHECK (post_sale_satisfaction_score >= 1 AND post_sale_satisfaction_score <= 10),
  finicky_score NUMERIC DEFAULT 0 CHECK (finicky_score >= 0 AND finicky_score <= 100),
  notes TEXT,
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'delivered', 'active_owner', 'sold')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer relationships table
CREATE TABLE public.customer_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_a_id UUID REFERENCES public.sales_leads(id) ON DELETE CASCADE NOT NULL,
  customer_b_id UUID REFERENCES public.sales_leads(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('friend', 'business_partner', 'family', 'same_ctc', 'referral', 'professional_network')),
  relationship_strength NUMERIC DEFAULT 50 CHECK (relationship_strength >= 0 AND relationship_strength <= 100),
  discovered_method TEXT CHECK (discovered_method IN ('manual_entry', 'ai_detected', 'referral_code', 'location_correlation', 'communication_analysis')),
  ctc_location TEXT,
  discovered_date TIMESTAMPTZ DEFAULT now(),
  last_interaction_date TIMESTAMPTZ,
  mutual_influence_score NUMERIC DEFAULT 50 CHECK (mutual_influence_score >= 0 AND mutual_influence_score <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_a_id, customer_b_id)
);

-- Extend sales_leads table with new columns
ALTER TABLE public.sales_leads
ADD COLUMN customer_type TEXT DEFAULT 'new_lead' CHECK (customer_type IN ('new_lead', 'repeat_customer', 'active_owner', 'past_owner')),
ADD COLUMN total_lifetime_value NUMERIC DEFAULT 0,
ADD COLUMN relationship_count INTEGER DEFAULT 0,
ADD COLUMN influence_score NUMERIC DEFAULT 0 CHECK (influence_score >= 0 AND influence_score <= 100),
ADD COLUMN referral_count INTEGER DEFAULT 0,
ADD COLUMN home_base_ctc TEXT;

-- Enable RLS
ALTER TABLE public.customer_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase history
CREATE POLICY "Admins can manage purchase history"
  ON public.customer_purchase_history
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for relationships
CREATE POLICY "Admins can manage relationships"
  ON public.customer_relationships
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_customer_purchase_history_updated_at
  BEFORE UPDATE ON public.customer_purchase_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_customer_purchase_history_customer_id ON public.customer_purchase_history(customer_id);
CREATE INDEX idx_customer_relationships_customer_a ON public.customer_relationships(customer_a_id);
CREATE INDEX idx_customer_relationships_customer_b ON public.customer_relationships(customer_b_id);
CREATE INDEX idx_sales_leads_customer_type ON public.sales_leads(customer_type);
CREATE INDEX idx_sales_leads_home_base_ctc ON public.sales_leads(home_base_ctc);

-- Migration: 20251115030550
-- Add new columns to sales_leads for rich persona profile data
ALTER TABLE sales_leads
ADD COLUMN psychological_traits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN communication_analysis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN response_speed TEXT,
ADD COLUMN engagement_pattern TEXT,
ADD COLUMN communication_style TEXT,
ADD COLUMN persona_stats JSONB DEFAULT '{}'::jsonb;

-- Migration: 20251115041015
-- Drop sales-related tables that are not being used (keeping hard-coded data in components)

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS public.competitor_mentions CASCADE;
DROP TABLE IF EXISTS public.communication_transcripts CASCADE;
DROP TABLE IF EXISTS public.ai_recommendations CASCADE;
DROP TABLE IF EXISTS public.lead_activities CASCADE;
DROP TABLE IF EXISTS public.customer_purchase_history CASCADE;
DROP TABLE IF EXISTS public.customer_relationships CASCADE;
DROP TABLE IF EXISTS public.sales_metrics CASCADE;
DROP TABLE IF EXISTS public.sales_leads CASCADE;
