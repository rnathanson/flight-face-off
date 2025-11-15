import { Database } from '@/integrations/supabase/types';

type PartnershipProfile = Database['public']['Tables']['partnership_interest_profiles']['Row'];

export interface MatchFactors {
  aircraftMatch: boolean;
  shareMatch: boolean;
  timelineAlignment: number; // 0-100
  scheduleCompatibility: number; // 0-100
  pilotMix: 'excellent' | 'good' | 'poor';
  combinedDays: number;
  leasebackAlignment: 'aligned' | 'mixed' | 'opposed';
  budgetCompatibility: number; // 0-100
}

export interface MatchResult {
  profile1Id: string;
  profile2Id: string;
  score: number; // 0-100
  factors: MatchFactors;
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
}

function hasCommonAircraft(p1: PartnershipProfile, p2: PartnershipProfile): boolean {
  // Handle owners_fleet compatibility
  if (p1.aircraft_preference.includes('owners_fleet') || p2.aircraft_preference.includes('owners_fleet')) {
    return true; // Fleet matches with everything
  }
  return p1.aircraft_preference.some(a => p2.aircraft_preference.includes(a));
}

function sharesAddUp(p1: PartnershipProfile, p2: PartnershipProfile): boolean {
  const p1Shares = p1.ownership_share_preferences;
  const p2Shares = p2.ownership_share_preferences;
  
  for (const s1 of p1Shares) {
    for (const s2 of p2Shares) {
      if (s1 === 0.5 && s2 === 0.5) return true; // Two halves
      if (Number(s1) + Number(s2) === 1) return true; // Any combination that makes whole
    }
  }
  return false;
}

function calculateTimelineAlignment(p1: PartnershipProfile, p2: PartnershipProfile): number {
  const timelineMap: Record<string, number> = {
    'immediate': 0,
    '3_6_months': 4.5,
    '6_12_months': 9,
    '12_plus_months': 15
  };
  
  const diff = Math.abs(timelineMap[p1.purchase_timeline] - timelineMap[p2.purchase_timeline]);
  
  if (diff <= 3) return 100;
  if (diff >= 8) return 0;
  return 100 - ((diff - 3) / 5) * 100;
}

function calculateScheduleCompatibility(p1: PartnershipProfile, p2: PartnershipProfile): number {
  if ((p1.typical_flying_time === 'weekdays' && p2.typical_flying_time === 'weekends') ||
      (p1.typical_flying_time === 'weekends' && p2.typical_flying_time === 'weekdays')) {
    return 100; // Perfect complementary
  }
  
  if (p1.typical_flying_time === 'both' || p2.typical_flying_time === 'both' ||
      p1.typical_flying_time === 'varies' || p2.typical_flying_time === 'varies') {
    return 70; // Flexible, workable
  }
  
  if (p1.typical_flying_time === p2.typical_flying_time) {
    return 40; // Potential conflicts
  }
  
  return 50; // Mixed
}

function calculatePilotCompatibility(p1: PartnershipProfile, p2: PartnershipProfile): { score: number; mix: 'excellent' | 'good' | 'poor' } {
  const p1Pilot = p1.pilot_status === 'licensed';
  const p2Pilot = p2.pilot_status === 'licensed';
  
  if (p1Pilot && p2Pilot) return { score: 80, mix: 'good' }; // Both pilots
  if (p1Pilot || p2Pilot) return { score: 100, mix: 'excellent' }; // One pilot, one non-pilot
  return { score: 40, mix: 'poor' }; // Both non-pilots
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
  
  if (percentDiff <= 10) return 100; // Within 10%
  if (percentDiff <= 25) return 80;  // Within 25%
  if (percentDiff <= 50) return 50;  // Within 50%
  return 30; // Very different budgets
}

export function calculateCompatibility(
  profile1: PartnershipProfile,
  profile2: PartnershipProfile
): MatchResult {
  let score = 0;
  const warnings: string[] = [];
  
  // Critical Factors (60 points possible)
  
  // 1. Aircraft Type Match (20 points) - MUST MATCH
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
        combinedDays: 0,
        leasebackAlignment: 'opposed',
        budgetCompatibility: 0
      },
      recommendation: 'poor',
      warnings: ['Different aircraft preferences - not compatible']
    };
  }
  score += 20;
  
  // 2. Complementary Shares (20 points) - MUST ADD UP
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
        combinedDays: 0,
        leasebackAlignment: 'opposed',
        budgetCompatibility: 0
      },
      recommendation: 'poor',
      warnings: ['Share preferences do not add up to complete ownership']
    };
  }
  score += 20;
  
  // 3. Timeline Alignment (20 points)
  const timelineAlignment = calculateTimelineAlignment(profile1, profile2);
  score += timelineAlignment * 0.2;
  
  // Important Factors (30 points possible)
  
  // 4. Pilot Status Compatibility (10 points)
  const pilotResult = calculatePilotCompatibility(profile1, profile2);
  score += pilotResult.score * 0.1;
  if (bothNonPilots(profile1, profile2)) {
    warnings.push("Both are non-pilots - will require expensive pilot services");
    score -= 5;
  }
  
  // 5. Usage Pattern Compatibility (10 points)
  const scheduleScore = calculateScheduleCompatibility(profile1, profile2);
  score += scheduleScore * 0.1;
  
  // Check combined days per month
  const totalDays = (profile1.usage_frequency_days || 0) + (profile2.usage_frequency_days || 0);
  if (totalDays > 20) {
    warnings.push(`Combined ${totalDays} days/mo may cause scheduling conflicts`);
    score -= 10;
  } else if (totalDays < 10) {
    warnings.push(`Low combined usage (${totalDays} days/mo) - excellent for partnership`);
    score += 5;
  }
  
  // 6. Leaseback Alignment (10 points)
  const leasebackResult = calculateLeasebackAlignment(profile1, profile2);
  score += leasebackResult.score * 0.1;
  
  // Nice-to-Have Factors (10 points possible)
  
  // 7. Budget Compatibility (5 points)
  const budgetScore = calculateBudgetCompatibility(profile1, profile2);
  score += budgetScore * 0.05;
  
  // 8. Flexibility Factors (5 points)
  if (profile1.scheduling_flexibility === 'very_flexible' && 
      profile2.scheduling_flexibility === 'very_flexible') {
    score += 5;
  }
  
  // Determine recommendation
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
    combinedDays: totalDays,
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

export function findTopMatches(
  profile: PartnershipProfile,
  allProfiles: PartnershipProfile[],
  limit: number = 5
): MatchResult[] {
  return allProfiles
    .filter(p => p.id !== profile.id)
    .filter(p => p.status === 'new' || p.status === 'contacted')
    .map(p => calculateCompatibility(profile, p))
    .filter(m => m.score > 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
