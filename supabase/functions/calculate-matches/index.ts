import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PartnershipProfile {
  id: string;
  full_name: string;
  email: string;
  aircraft_preference: string[];
  ownership_share_preferences: number[];
  pilot_status: string;
  expected_monthly_hours: number;
  purchase_timeline: string;
  leaseback_interest: string;
  typical_flying_time: string;
  scheduling_flexibility: string;
  sharing_comfort: string | null;
  calculated_monthly_net_cost: number | null;
  status: string;
}

interface MatchFactors {
  aircraftMatch: boolean;
  shareMatch: boolean;
  timelineAlignment: number;
  scheduleCompatibility: number;
  pilotMix: 'excellent' | 'good' | 'poor';
  combinedHours: number;
  leasebackAlignment: 'aligned' | 'mixed' | 'opposed';
  budgetCompatibility: number;
}

interface MatchResult {
  profile1Id: string;
  profile2Id: string;
  score: number;
  factors: MatchFactors;
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
}

function hasCommonAircraft(p1: PartnershipProfile, p2: PartnershipProfile): boolean {
  return p1.aircraft_preference.some(a => p2.aircraft_preference.includes(a));
}

function sharesAddUp(p1: PartnershipProfile, p2: PartnershipProfile): boolean {
  const p1Shares = p1.ownership_share_preferences;
  const p2Shares = p2.ownership_share_preferences;
  
  for (const s1 of p1Shares) {
    for (const s2 of p2Shares) {
      if (s1 === 0.5 && s2 === 0.5) return true;
      if (Number(s1) + Number(s2) === 1) return true;
    }
  }
  return false;
}

function calculateTimelineAlignment(p1: PartnershipProfile, p2: PartnershipProfile): number {
  const timelineMap: Record<string, number> = {
    'immediate': 0,
    '1_3_months': 2,
    '3_6_months': 4.5,
    '6_12_months': 9,
    '12_plus_months': 15
  };
  
  const diff = Math.abs(timelineMap[p1.purchase_timeline] - timelineMap[p2.purchase_timeline]);
  
  if (diff <= 3) return 100;
  if (diff >= 6) return 0;
  return 100 - ((diff - 3) / 3) * 100;
}

function calculateScheduleCompatibility(p1: PartnershipProfile, p2: PartnershipProfile): number {
  if ((p1.typical_flying_time === 'weekdays' && p2.typical_flying_time === 'weekends') ||
      (p1.typical_flying_time === 'weekends' && p2.typical_flying_time === 'weekdays')) {
    return 100;
  }
  
  if (p1.typical_flying_time === 'both' || p2.typical_flying_time === 'both') {
    return 70;
  }
  
  if (p1.typical_flying_time === p2.typical_flying_time) {
    return 40;
  }
  
  return 50;
}

function calculatePilotCompatibility(p1: PartnershipProfile, p2: PartnershipProfile): { score: number; mix: 'excellent' | 'good' | 'poor' } {
  const p1Pilot = p1.pilot_status === 'licensed';
  const p2Pilot = p2.pilot_status === 'licensed';
  
  if (p1Pilot && p2Pilot) return { score: 80, mix: 'good' };
  if (p1Pilot || p2Pilot) return { score: 100, mix: 'excellent' };
  return { score: 40, mix: 'poor' };
}

function bothNonPilots(p1: PartnershipProfile, p2: PartnershipProfile): boolean {
  return p1.pilot_status === 'non_pilot' && p2.pilot_status === 'non_pilot';
}

function calculateLeasebackAlignment(p1: PartnershipProfile, p2: PartnershipProfile): { score: number; alignment: 'aligned' | 'mixed' | 'opposed' } {
  const leasebackScore: Record<string, number> = {
    'very_interested': 3,
    'somewhat': 2,
    'need_info': 1,
    'not_interested': 0
  };
  
  const p1Score = leasebackScore[p1.leaseback_interest] || 0;
  const p2Score = leasebackScore[p2.leaseback_interest] || 0;
  const diff = Math.abs(p1Score - p2Score);
  
  if (diff === 0) return { score: 100, alignment: 'aligned' };
  if (diff === 1) return { score: 70, alignment: 'mixed' };
  if (diff === 2) return { score: 40, alignment: 'mixed' };
  return { score: 20, alignment: 'opposed' };
}

function calculateBudgetCompatibility(p1: PartnershipProfile, p2: PartnershipProfile): number {
  if (!p1.calculated_monthly_net_cost || !p2.calculated_monthly_net_cost) return 50;
  
  const diff = Math.abs(Number(p1.calculated_monthly_net_cost) - Number(p2.calculated_monthly_net_cost));
  const avg = (Number(p1.calculated_monthly_net_cost) + Number(p2.calculated_monthly_net_cost)) / 2;
  const percentDiff = (diff / avg) * 100;
  
  if (percentDiff <= 10) return 100;
  if (percentDiff <= 25) return 80;
  if (percentDiff <= 50) return 50;
  return 30;
}

function calculateCompatibility(profile1: PartnershipProfile, profile2: PartnershipProfile): MatchResult {
  let score = 0;
  const warnings: string[] = [];
  
  const aircraftMatch = hasCommonAircraft(profile1, profile2);
  if (!aircraftMatch) {
    return {
      profile1Id: profile1.id,
      profile2Id: profile2.id,
      score: 0,
      factors: {
        aircraftMatch: false,
        shareMatch: false,
        timelineAlignment: 0,
        scheduleCompatibility: 0,
        pilotMix: 'poor',
        combinedHours: 0,
        leasebackAlignment: 'opposed',
        budgetCompatibility: 0
      },
      recommendation: 'poor',
      warnings: ['Different aircraft preferences - not compatible']
    };
  }
  score += 20;
  
  const shareMatch = sharesAddUp(profile1, profile2);
  if (!shareMatch) {
    return {
      profile1Id: profile1.id,
      profile2Id: profile2.id,
      score: 0,
      factors: {
        aircraftMatch: true,
        shareMatch: false,
        timelineAlignment: 0,
        scheduleCompatibility: 0,
        pilotMix: 'poor',
        combinedHours: 0,
        leasebackAlignment: 'opposed',
        budgetCompatibility: 0
      },
      recommendation: 'poor',
      warnings: ['Share preferences do not add up to complete ownership']
    };
  }
  score += 20;
  
  const timelineAlignment = calculateTimelineAlignment(profile1, profile2);
  score += timelineAlignment * 0.2;
  
  const pilotResult = calculatePilotCompatibility(profile1, profile2);
  score += pilotResult.score * 0.1;
  if (bothNonPilots(profile1, profile2)) {
    warnings.push("Both are non-pilots - will require expensive pilot services");
    score -= 5;
  }
  
  const scheduleScore = calculateScheduleCompatibility(profile1, profile2);
  score += scheduleScore * 0.1;
  
  const totalHours = profile1.expected_monthly_hours + profile2.expected_monthly_hours;
  if (totalHours > 100) {
    warnings.push(`Combined ${totalHours} hrs/mo may cause scheduling conflicts`);
    score -= 10;
  } else if (totalHours < 50) {
    warnings.push(`Low combined usage (${totalHours} hrs/mo) - excellent for partnership`);
    score += 5;
  }
  
  const leasebackResult = calculateLeasebackAlignment(profile1, profile2);
  score += leasebackResult.score * 0.1;
  
  const budgetScore = calculateBudgetCompatibility(profile1, profile2);
  score += budgetScore * 0.05;
  
  if (profile1.scheduling_flexibility === 'very_flexible' && 
      profile2.scheduling_flexibility === 'very_flexible') {
    score += 5;
  }
  
  let recommendation: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 85) recommendation = 'excellent';
  else if (score >= 70) recommendation = 'good';
  else if (score >= 50) recommendation = 'fair';
  else recommendation = 'poor';
  
  const factors: MatchFactors = {
    aircraftMatch,
    shareMatch,
    timelineAlignment,
    scheduleCompatibility: scheduleScore,
    pilotMix: pilotResult.mix,
    combinedHours: totalHours,
    leasebackAlignment: leasebackResult.alignment,
    budgetCompatibility: budgetScore
  };
  
  return {
    profile1Id: profile1.id,
    profile2Id: profile2.id,
    score: Math.round(score),
    factors,
    recommendation,
    warnings
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { profileId } = await req.json();
    
    console.log(`Calculating matches for profile: ${profileId}`);

    // Get the profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('partnership_interest_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError) throw profileError;

    // Get all other active profiles
    const { data: allProfiles, error: profilesError } = await supabaseClient
      .from('partnership_interest_profiles')
      .select('*')
      .neq('id', profileId)
      .in('status', ['new', 'contacted', 'qualified']);

    if (profilesError) throw profilesError;

    // Calculate compatibility scores
    const matches = allProfiles
      .map(p => calculateCompatibility(profile, p))
      .filter(m => m.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Store match scores in the profile
    const matchScores = matches.reduce((acc, match) => {
      acc[match.profile2Id] = match.score;
      return acc;
    }, {} as Record<string, number>);

    await supabaseClient
      .from('partnership_interest_profiles')
      .update({ 
        match_scores: matchScores,
        match_pool: matches.map(m => m.profile2Id)
      })
      .eq('id', profileId);

    console.log(`Found ${matches.length} matches for profile ${profileId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchCount: matches.length,
        topMatches: matches.slice(0, 5)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error calculating matches:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
