import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrganExperience {
  missions: number;
  success_rate: number;
}

interface CrewMember {
  id: string;
  full_name: string;
  organ_experience: Record<string, OrganExperience>;
  airport_experience: Record<string, number>;
}

interface MedicalPersonnel {
  id: string;
  full_name: string;
  role: string;
  organ_experience: Record<string, OrganExperience>;
  hospital_partnerships: Record<string, number>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      organType,
      crewMemberIds = [],
      leadDoctorId,
      surgicalTeamIds = [],
      coordinatorId,
      totalTimeMinutes, // Real trip time from calculate-accurate-trip
      distance, // Keep for backwards compatibility
      originAirportCode,
      destAirportCode,
      originHospital,
      destHospital,
    } = await req.json();

    // Fetch crew data if provided
    let crewMembers: CrewMember[] = [];
    if (crewMemberIds.length > 0) {
      const { data } = await supabase
        .from('crew_members')
        .select('*')
        .in('id', crewMemberIds);
      crewMembers = data || [];
    }

    // Fetch medical personnel
    let leadDoctor: MedicalPersonnel | null = null;
    let surgeons: MedicalPersonnel[] = [];
    let coordinator: MedicalPersonnel | null = null;

    if (leadDoctorId) {
      const { data } = await supabase
        .from('medical_personnel')
        .select('*')
        .eq('id', leadDoctorId)
        .single();
      leadDoctor = data;
    }

    if (surgicalTeamIds.length > 0) {
      const { data } = await supabase
        .from('medical_personnel')
        .select('*')
        .in('id', surgicalTeamIds);
      surgeons = data || [];
    }

    if (coordinatorId) {
      const { data } = await supabase
        .from('medical_personnel')
        .select('*')
        .eq('id', coordinatorId)
        .single();
      coordinator = data;
    }

    // Phase 1: Calculate team-based prediction
    let crewScore = 50;
    let medicalTeamScore = 50;
    let organSpecificInsights: any = {};

    if (organType && crewMembers.length > 0) {
      const crewOrganExp = crewMembers.map(c => c.organ_experience?.[organType] || { missions: 0, success_rate: 0 });
      const avgCrewSuccess = crewOrganExp.reduce((sum, exp) => sum + exp.success_rate, 0) / crewMembers.length;
      const totalCrewMissions = crewOrganExp.reduce((sum, exp) => sum + exp.missions, 0);
      
      crewScore = avgCrewSuccess;
      
      organSpecificInsights.crew = crewMembers.map(c => {
        const exp = c.organ_experience?.[organType] || { missions: 0, success_rate: 0 };
        return `${c.full_name}: ${exp.missions} ${organType} missions, ${exp.success_rate}% success`;
      }).join(' | ');

      organSpecificInsights.crewSummary = `Combined ${totalCrewMissions} ${organType} missions with ${avgCrewSuccess.toFixed(1)}% success rate`;
    }

    if (organType && leadDoctor) {
      const doctorExp = leadDoctor.organ_experience?.[organType] || { missions: 0, success_rate: 0 };
      medicalTeamScore = doctorExp.success_rate;
      
      organSpecificInsights.leadDoctor = `${leadDoctor.full_name}: ${doctorExp.missions} ${organType} transplants, ${doctorExp.success_rate}% success`;

      if (surgeons.length > 0) {
        const surgeonExps = surgeons.map(s => {
          const exp = s.organ_experience?.[organType] || { missions: 0, success_rate: 0 };
          return { name: s.full_name, ...exp };
        });
        
        const avgSurgeonSuccess = surgeonExps.reduce((sum, exp) => sum + exp.success_rate, 0) / surgeons.length;
        medicalTeamScore = (doctorExp.success_rate * 0.6 + avgSurgeonSuccess * 0.4);
        
        organSpecificInsights.surgeons = surgeonExps.map(s => 
          `${s.name}: ${s.missions} ${organType} cases, ${s.success_rate}% success`
        );
      }
    }

    if (coordinator && organType) {
      const coordExp = coordinator.organ_experience?.[organType] || { missions: 0, success_rate: 0 };
      organSpecificInsights.coordinator = `${coordinator.full_name}: ${coordExp.missions} ${organType} coordinations, ${coordExp.success_rate}% success`;
    }

    // Base prediction
    let basePrediction = 50;
    if (organType) {
      const organBaselines: Record<string, number> = {
        heart: 85,
        liver: 87,
        lungs: 82,
        kidneys: 90,
        pancreas: 83
      };
      const baselineScore = organBaselines[organType] || 85;
      
      if (crewMembers.length > 0 && leadDoctor) {
        basePrediction = (crewScore * 0.4) + (medicalTeamScore * 0.4) + (baselineScore * 0.2);
      } else if (crewMembers.length > 0) {
        basePrediction = (crewScore * 0.6) + (baselineScore * 0.4);
      } else if (leadDoctor) {
        basePrediction = (medicalTeamScore * 0.6) + (baselineScore * 0.4);
      } else {
        basePrediction = baselineScore;
      }
    }

    // Phase 2: Logistics enhancement
    let airportFamiliarityScore = 0;
    let hospitalPartnershipScore = 0;
    let distanceComplexityScore = 0;
    let logisticsInsights: any = {};

    if (originAirportCode && destAirportCode && crewMembers.length > 0) {
      const originFamiliarity = crewMembers.map(c => c.airport_experience?.[originAirportCode] || 0);
      const destFamiliarity = crewMembers.map(c => c.airport_experience?.[destAirportCode] || 0);
      
      const avgOrigin = originFamiliarity.reduce((a, b) => a + b, 0) / crewMembers.length;
      const avgDest = destFamiliarity.reduce((a, b) => a + b, 0) / crewMembers.length;
      
      airportFamiliarityScore = Math.min(100, ((avgOrigin + avgDest) / 2) * 4);
      
      const originLevel = avgOrigin > 15 ? "High" : avgOrigin > 8 ? "Moderate" : "Limited";
      const destLevel = avgDest > 15 ? "High" : avgDest > 8 ? "Moderate" : "Limited";
      
      logisticsInsights.airportFamiliarity = `${originLevel} familiarity with ${originAirportCode} (avg ${avgOrigin.toFixed(0)} missions) | ${destLevel} familiarity with ${destAirportCode} (avg ${avgDest.toFixed(0)} missions)`;
    }

    if ((originHospital || destHospital) && leadDoctor) {
      const partnerships = leadDoctor.hospital_partnerships || {};
      let totalPartnershipScore = 0;
      let partnershipCount = 0;
      
      if (originHospital && partnerships[originHospital]) {
        totalPartnershipScore += Math.min(100, partnerships[originHospital] * 2);
        partnershipCount++;
        logisticsInsights.originHospital = `${leadDoctor.full_name} has completed ${partnerships[originHospital]} cases with ${originHospital}`;
      }
      
      if (destHospital && partnerships[destHospital]) {
        totalPartnershipScore += Math.min(100, partnerships[destHospital] * 2);
        partnershipCount++;
        logisticsInsights.destHospital = `${leadDoctor.full_name} has completed ${partnerships[destHospital]} cases with ${destHospital}`;
      }
      
      hospitalPartnershipScore = partnershipCount > 0 ? totalPartnershipScore / partnershipCount : 0;
    }

    // CRITICAL: Calculate viability penalty - this is the most important factor
    let viabilityPenaltyMultiplier = 1.0;
    let estimatedHours = 0;
    
    // Use real trip time if provided, otherwise fall back to distance estimate
    if (totalTimeMinutes && organType) {
      estimatedHours = totalTimeMinutes / 60;
      console.log(`Using real trip time: ${totalTimeMinutes} minutes = ${estimatedHours.toFixed(2)} hours`);
    } else if (distance && organType) {
      estimatedHours = distance / 440; // Fallback estimate using rough cruise speed
      console.log(`Using distance estimate: ${distance} NM = ${estimatedHours.toFixed(2)} hours`);
    }
    
    if (estimatedHours > 0 && organType) {
      const viabilityHours: Record<string, number> = {
        heart: 6,
        liver: 12,
        lungs: 6,
        kidneys: 36,
        pancreas: 12
      };
      
      const maxViableHours = viabilityHours[organType] || 12;
      const viabilityRatio = estimatedHours / maxViableHours;
      
      distanceComplexityScore = Math.max(0, 100 - (viabilityRatio * 100));
      
      // Exponential penalty as viability approaches limit
      // 0-60%: no penalty (multiplier = 1.0)
      // 60-80%: moderate penalty (multiplier drops to 0.7)
      // 80-95%: severe penalty (multiplier drops to 0.4)
      // 95-100%: critical penalty (multiplier drops to 0.25)
      // >100%: extreme penalty (multiplier = 0.15)
      if (viabilityRatio <= 0.6) {
        viabilityPenaltyMultiplier = 1.0;
      } else if (viabilityRatio <= 0.8) {
        // Linear drop from 1.0 to 0.7
        viabilityPenaltyMultiplier = 1.0 - ((viabilityRatio - 0.6) / 0.2) * 0.3;
      } else if (viabilityRatio <= 0.95) {
        // Steeper drop from 0.7 to 0.4
        viabilityPenaltyMultiplier = 0.7 - ((viabilityRatio - 0.8) / 0.15) * 0.3;
      } else if (viabilityRatio <= 1.0) {
        // Critical drop from 0.4 to 0.25
        viabilityPenaltyMultiplier = 0.4 - ((viabilityRatio - 0.95) / 0.05) * 0.15;
      } else {
        // Exceeded window - cap at 15% success max
        viabilityPenaltyMultiplier = 0.15;
      }
      
      const distanceText = distance ? `${distance.toFixed(0)} NM distance, ` : '';
      logisticsInsights.routeComplexity = `${distanceText}~${estimatedHours.toFixed(1)} hours total trip time (${(viabilityRatio * 100).toFixed(0)}% of ${organType} viability window)`;
      logisticsInsights.viabilityPenalty = `${(viabilityPenaltyMultiplier * 100).toFixed(0)}% success multiplier due to viability constraints`;
    }

    // Calculate enhanced prediction with logistics
    let enhancedPrediction = basePrediction;
    if (airportFamiliarityScore > 0 || hospitalPartnershipScore > 0 || distanceComplexityScore > 0) {
      const logisticsWeight = 0.15; // Reduced from 0.2 since viability is now separate
      const logisticsScore = (
        (airportFamiliarityScore > 0 ? airportFamiliarityScore * 0.5 : 0) +
        (hospitalPartnershipScore > 0 ? hospitalPartnershipScore * 0.5 : 0)
      ) / (
        (airportFamiliarityScore > 0 ? 0.5 : 0) +
        (hospitalPartnershipScore > 0 ? 0.5 : 0)
      );
      
      enhancedPrediction = basePrediction * (1 - logisticsWeight) + logisticsScore * logisticsWeight;
    }
    
    // CRITICAL: Apply viability penalty as the final step - this overrides everything
    enhancedPrediction = enhancedPrediction * viabilityPenaltyMultiplier;

    // Determine confidence
    let confidence: 'low' | 'medium' | 'high' = 'low';
    const hasTeam = crewMembers.length > 0 && leadDoctor;
    const hasLogistics = originAirportCode && destAirportCode;
    
    if (hasTeam && hasLogistics) confidence = 'high';
    else if (hasTeam || hasLogistics) confidence = 'medium';

    // Find optimal team
    const { data: allCrew } = await supabase.from('crew_members').select('*').limit(5);
    const { data: allDoctors } = await supabase.from('medical_personnel').select('*').eq('role', 'lead_doctor').limit(5);
    
    let optimalCrew: any[] = [];
    let optimalDoctor: any = null;
    let optimalReasoning = '';
    
    if (organType && allCrew && allDoctors) {
      optimalCrew = (allCrew as CrewMember[])
        .sort((a, b) => {
          const aExp = a.organ_experience?.[organType]?.success_rate || 0;
          const bExp = b.organ_experience?.[organType]?.success_rate || 0;
          return bExp - aExp;
        })
        .slice(0, 2);
      
      optimalDoctor = (allDoctors as MedicalPersonnel[])
        .sort((a, b) => {
          const aExp = a.organ_experience?.[organType]?.success_rate || 0;
          const bExp = b.organ_experience?.[organType]?.success_rate || 0;
          return bExp - aExp;
        })[0];
      
      const optimalCrewAvg = optimalCrew.reduce((sum, c) => 
        sum + (c.organ_experience?.[organType]?.success_rate || 0), 0) / 2;
      const optimalDoctorRate = optimalDoctor?.organ_experience?.[organType]?.success_rate || 0;
      
      optimalReasoning = `Highest combined ${organType} success rate: Crew avg ${optimalCrewAvg.toFixed(0)}%, Lead Doctor ${optimalDoctorRate}%`;
    }

    return new Response(
      JSON.stringify({
        overallPrediction: Math.round(enhancedPrediction),
        confidence,
        breakdown: {
          crewScore: Math.round(crewScore),
          medicalTeamScore: Math.round(medicalTeamScore),
          airportFamiliarityScore: Math.round(airportFamiliarityScore),
          hospitalPartnershipScore: Math.round(hospitalPartnershipScore),
          distanceComplexityScore: Math.round(distanceComplexityScore),
        },
        organSpecificInsights,
        logisticsInsights,
        optimalTeamSuggestion: {
          crew: optimalCrew,
          leadDoctor: optimalDoctor,
          reasoning: optimalReasoning,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating live prediction:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});