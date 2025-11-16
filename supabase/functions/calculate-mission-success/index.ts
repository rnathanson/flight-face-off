import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      crewMemberIds,
      leadDoctorId,
      surgicalTeamIds,
      coordinatorId,
      organType,
      estimatedTimeMinutes,
      originHospital,
      destinationHospital,
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch crew members
    const { data: crewMembers } = await supabase
      .from('crew_members')
      .select('*')
      .in('id', crewMemberIds);

    // Fetch lead doctor
    const { data: leadDoctor } = await supabase
      .from('medical_personnel')
      .select('*')
      .eq('id', leadDoctorId)
      .single();

    // Fetch surgical team
    const { data: surgicalTeam } = await supabase
      .from('medical_personnel')
      .select('*')
      .in('id', surgicalTeamIds || []);

    // Fetch coordinator if provided
    let coordinator = null;
    if (coordinatorId) {
      const { data } = await supabase
        .from('medical_personnel')
        .select('*')
        .eq('id', coordinatorId)
        .single();
      coordinator = data;
    }

    // Fetch mission type for viability
    const { data: missionType } = await supabase
      .from('mission_types')
      .select('*')
      .eq('organ_type', organType)
      .single();

    // Calculate crew score (30% weight)
    const crewScore = crewMembers && crewMembers.length > 0
      ? crewMembers.reduce((sum, crew) => sum + (crew.success_rate || 90), 0) / crewMembers.length
      : 90;

    // Calculate medical team score (25% weight)
    const leadDoctorScore = leadDoctor?.success_rate || 90;
    const surgicalTeamScore = surgicalTeam && surgicalTeam.length > 0
      ? surgicalTeam.reduce((sum, surgeon) => sum + (surgeon.success_rate || 90), 0) / surgicalTeam.length
      : 90;
    const medicalTeamScore = (leadDoctorScore * 0.6) + (surgicalTeamScore * 0.4);

    // Calculate route score (25% weight) - simplified for now
    const routeScore = 92; // Base score, can be enhanced with historical data

    // Calculate viability score (20% weight)
    const estimatedTimeHours = estimatedTimeMinutes / 60;
    const maxViabilityHours = missionType?.max_viability_hours || 12;
    const viabilityUsedPercent = (estimatedTimeHours / maxViabilityHours) * 100;
    const viabilityScore = Math.max(0, 100 - Math.max(0, viabilityUsedPercent - 75));

    // Calculate overall success rate
    const overallSuccess = (
      (crewScore * 0.30) +
      (medicalTeamScore * 0.25) +
      (routeScore * 0.25) +
      (viabilityScore * 0.20)
    );

    // Generate insights
    const insights = [];
    
    // Crew insight
    if (crewMembers && crewMembers.length === 2) {
      const combinedMissions = crewMembers.reduce((sum, crew) => sum + (crew.total_missions || 0), 0);
      insights.push({
        type: 'crew',
        title: 'Flight Crew Performance',
        message: `Captain ${crewMembers[0].full_name} and Captain ${crewMembers[1].full_name} have a combined ${combinedMissions} missions with ${crewScore.toFixed(1)}% average success rate.`,
        score: crewScore,
      });
    }

    // Medical team insight
    if (leadDoctor) {
      insights.push({
        type: 'medical',
        title: 'Medical Team Expertise',
        message: `${leadDoctor.full_name} (${leadDoctor.specialty}) has completed ${leadDoctor.total_missions} transplants with ${leadDoctor.success_rate}% success rate.`,
        score: medicalTeamScore,
      });
    }

    // Route insight
    insights.push({
      type: 'route',
      title: 'Route Analysis',
      message: `The ${originHospital} to ${destinationHospital} route has favorable conditions for ${organType} transport.`,
      score: routeScore,
    });

    // Viability insight
    let viabilityStatus: 'safe' | 'warning' | 'critical' = 'safe';
    let viabilityMessage = '';
    
    if (viabilityUsedPercent < 75) {
      viabilityStatus = 'safe';
      viabilityMessage = `Excellent viability margin: ${(estimatedTimeHours).toFixed(1)}h transport time within ${maxViabilityHours}h window (${viabilityUsedPercent.toFixed(0)}% utilized).`;
    } else if (viabilityUsedPercent <= 100) {
      viabilityStatus = 'warning';
      viabilityMessage = `Tight viability margin: ${(estimatedTimeHours).toFixed(1)}h transport time within ${maxViabilityHours}h window (${viabilityUsedPercent.toFixed(0)}% utilized). Consider earlier departure.`;
    } else {
      viabilityStatus = 'critical';
      viabilityMessage = `CRITICAL: Transport time ${(estimatedTimeHours).toFixed(1)}h exceeds ${maxViabilityHours}h maximum viability window by ${(viabilityUsedPercent - 100).toFixed(0)}%. Immediate action required.`;
    }

    insights.push({
      type: 'viability',
      title: 'Organ Viability',
      message: viabilityMessage,
      score: viabilityScore,
      status: viabilityStatus,
    });

    // Generate suggestions
    const suggestions = [];
    
    if (overallSuccess < 85) {
      suggestions.push('Consider alternative crew pairing or earlier departure time to optimize success rate.');
    }
    
    if (viabilityUsedPercent > 90) {
      suggestions.push('Recommend departing 30-45 minutes earlier to improve organ viability margin.');
    }
    
    if (viabilityUsedPercent > 100) {
      suggestions.push('⚠️ URGENT: Current timeline exceeds organ viability. Immediate route optimization or alternative transport required.');
    }

    if (overallSuccess >= 90 && viabilityUsedPercent < 75) {
      suggestions.push('✓ Optimal mission configuration with excellent success probability and safe viability margin.');
    }

    return new Response(JSON.stringify({
      overallSuccess: parseFloat(overallSuccess.toFixed(2)),
      crewScore: parseFloat(crewScore.toFixed(2)),
      medicalTeamScore: parseFloat(medicalTeamScore.toFixed(2)),
      routeScore: parseFloat(routeScore.toFixed(2)),
      viabilityScore: parseFloat(viabilityScore.toFixed(2)),
      viabilityStatus,
      viabilityUsedPercent: parseFloat(viabilityUsedPercent.toFixed(2)),
      insights,
      suggestions,
      crewMembers,
      leadDoctor,
      surgicalTeam,
      coordinator,
      missionType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in calculate-mission-success:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});