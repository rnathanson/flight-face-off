import { TripSegment } from './segment-builder.ts';

export interface ScenarioResult {
  conservative: number;
  expected: number;
  optimistic: number;
}

/**
 * Generate conservative and optimistic time scenarios with AI validation
 */
export async function generateScenarios(params: {
  totalTime: number;
  segments: TripSegment[];
  weatherDelays: number;
  maxHeadwind: number;
  trafficMultiplier: number;
  routingQuality: 'faa-preferred' | 'great-circle' | 'mixed';
  hasRealTimeTraffic: boolean;
  supabase: any;
}): Promise<ScenarioResult> {
  const {
    totalTime,
    segments,
    weatherDelays,
    maxHeadwind,
    trafficMultiplier,
    routingQuality,
    hasRealTimeTraffic,
    supabase
  } = params;

  // Calculate preliminary scenario times with proportional adjustments
  let conservativeTime = totalTime;
  let optimisticTime = totalTime;
  
  segments.forEach(seg => {
    if (seg.type === 'flight') {
      const distanceNM = seg.distance || 0;
      let conservativeMultiplier = 1.15;
      let optimisticMultiplier = 0.90;
      
      if (distanceNM > 50) { conservativeMultiplier = 1.20; optimisticMultiplier = 0.88; }
      if (distanceNM > 200) { conservativeMultiplier = 1.25; optimisticMultiplier = 0.85; }
      
      conservativeTime += seg.duration * (conservativeMultiplier - 1);
      optimisticTime -= seg.duration * (1 - optimisticMultiplier);
    } else if (seg.type === 'ground') {
      const durationMin = seg.duration;
      let conservativeMultiplier = 1.30;
      let optimisticMultiplier = 0.90;
      
      if (durationMin > 20) { conservativeMultiplier = 1.40; optimisticMultiplier = 0.88; }
      if (durationMin > 45) { conservativeMultiplier = 1.50; optimisticMultiplier = 0.85; }
      
      conservativeTime += seg.duration * (conservativeMultiplier - 1);
      optimisticTime -= seg.duration * (1 - optimisticMultiplier);
    }
  });
  
  conservativeTime = Math.round(conservativeTime);
  optimisticTime = Math.round(optimisticTime);
  
  console.log(`📊 Preliminary scenarios: Conservative ${conservativeTime}min, Expected ${totalTime}min, Optimistic ${optimisticTime}min`);
  
  // AI validation with historical learning
  try {
    const routeComplexity = segments.length > 4 ? 'complex' : segments.length > 2 ? 'moderate' : 'simple';
    const weatherConditions = weatherDelays > 10 ? 'challenging' : maxHeadwind > 20 ? 'windy' : 'typical';
    
    const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-trip-scenarios', {
      body: {
        expectedTime: totalTime,
        conservativeTime,
        optimisticTime,
        segments: segments.map(s => ({
          type: s.type,
          duration: s.duration,
          distance: s.distance
        })),
        routeComplexity,
        weatherConditions
      }
    });
    
    if (validationError) {
      console.warn('⚠️  AI validation failed, using calculated scenarios:', validationError);
    } else if (validationResult) {
      if (!validationResult.isRealistic) {
        console.log(`🤖 AI adjusted scenarios: ${validationResult.reasoning}`);
        
        if (validationResult.adjustedConservative) {
          conservativeTime = Math.round(validationResult.adjustedConservative);
        }
        if (validationResult.adjustedOptimistic) {
          optimisticTime = Math.round(validationResult.adjustedOptimistic);
        }
      } else {
        console.log(`✅ AI validated scenarios: ${validationResult.reasoning}`);
      }
    }
  } catch (validationError) {
    console.warn('⚠️  Scenario validation error, using calculated values:', validationError);
  }
  
  console.log(`✨ Final scenarios: Conservative ${conservativeTime}min (+${((conservativeTime-totalTime)/totalTime*100).toFixed(1)}%), Expected ${totalTime}min, Optimistic ${optimisticTime}min (-${((totalTime-optimisticTime)/totalTime*100).toFixed(1)}%)`);
  
  return {
    conservative: conservativeTime,
    expected: totalTime,
    optimistic: optimisticTime
  };
}
