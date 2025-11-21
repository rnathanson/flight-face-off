import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      expectedTime,
      conservativeTime,
      optimisticTime,
      segments,
      routeComplexity = 'moderate',
      weatherConditions = 'typical'
    } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get historical context for similar trips
    const lowerBound = expectedTime * 0.8;
    const upperBound = expectedTime * 1.2;
    
    const { data: historicalMissions } = await supabase
      .from('missions')
      .select('estimated_time_minutes, actual_time_minutes')
      .not('actual_time_minutes', 'is', null)
      .gte('estimated_time_minutes', lowerBound)
      .lte('estimated_time_minutes', upperBound)
      .gte('mission_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

    let historicalContext = '';
    let avgVariancePercent = 0;
    
    if (historicalMissions && historicalMissions.length > 0) {
      const variances = historicalMissions.map(m => 
        ((m.actual_time_minutes - m.estimated_time_minutes) / m.estimated_time_minutes) * 100
      );
      avgVariancePercent = variances.reduce((a, b) => a + b, 0) / variances.length;
      const stdDev = Math.sqrt(variances.reduce((sq, n) => sq + Math.pow(n - avgVariancePercent, 2), 0) / variances.length);
      
      historicalContext = `Based on ${historicalMissions.length} similar missions in the last 6 months:
- Average variance: ${avgVariancePercent.toFixed(1)}% (${avgVariancePercent > 0 ? 'trips typically run longer' : 'trips typically run shorter'})
- Standard deviation: ${stdDev.toFixed(1)}%`;
    } else {
      historicalContext = 'No historical data available for similar routes';
    }

    // Calculate current variances
    const conservativeDelta = ((conservativeTime - expectedTime) / expectedTime) * 100;
    const optimisticDelta = ((expectedTime - optimisticTime) / expectedTime) * 100;

    // Build segment summary
    const segmentSummary = segments.map((s: any) => {
      if (s.type === 'flight') {
        return `Flight: ${s.distance}nm, ${s.duration}min`;
      } else if (s.type === 'ground') {
        return `Ground: ${s.distance}mi, ${s.duration}min`;
      }
      return `${s.type}: ${s.duration}min`;
    }).join('\n');

    // AI Validation using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const validationPrompt = `You are a flight operations data scientist analyzing trip time predictions for medical organ transport missions. Your job is to ensure scenario spreads are realistic and trustworthy.

TRIP DATA:
- Expected time: ${expectedTime} minutes
- Conservative: ${conservativeTime} minutes (+${conservativeDelta.toFixed(1)}%)
- Optimistic: ${optimisticTime} minutes (-${optimisticDelta.toFixed(1)}%)

SEGMENT BREAKDOWN:
${segmentSummary}

HISTORICAL CONTEXT:
${historicalContext}

ROUTE CHARACTERISTICS:
- Complexity: ${routeComplexity}
- Weather: ${weatherConditions}
- Total segments: ${segments.length}

VALIDATION RULES:
1. Total conservative variance should NOT exceed +40% from expected
2. Total optimistic variance should NOT exceed -25% from expected  
3. For trips under 2 hours, total spread should not exceed 60 minutes
4. For trips over 4 hours, total spread should not exceed 2.5 hours
5. Flight segments: longer flights can have more variance (wind impact scales with distance)
6. Ground segments: longer drives can have more variance (traffic impact scales with time)
7. If historical data shows consistent bias (e.g., always 10% over), calibrate accordingly
8. Sanity check: Would a medical coordinator trust these numbers for organ transport planning?

TASK:
Analyze if the scenario spread is realistic and proportional. If the spread seems wild, unrealistic, or untrustworthy, suggest adjusted times that maintain proportionality but add guardrails.

Return ONLY valid JSON in this exact format:
{
  "isRealistic": true or false,
  "adjustedConservative": number or null,
  "adjustedOptimistic": number or null,
  "reasoning": "brief explanation"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: validationPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent validation
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI validation error:', aiResponse.status, errorText);
      
      // Fallback to basic guardrails if AI fails
      return new Response(JSON.stringify({
        isRealistic: applyBasicGuardrails(expectedTime, conservativeTime, optimisticTime),
        adjustedConservative: Math.min(conservativeTime, expectedTime * 1.4),
        adjustedOptimistic: Math.max(optimisticTime, expectedTime * 0.75),
        reasoning: 'AI unavailable, applied basic guardrails',
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '{}';
    
    // Parse AI response (handle both JSON and text responses)
    let validationResult;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, aiContent];
      validationResult = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      validationResult = {
        isRealistic: true,
        reasoning: 'Could not parse AI validation response, using original values'
      };
    }

    // Apply absolute caps as final safety net
    if (validationResult.adjustedConservative) {
      validationResult.adjustedConservative = Math.min(
        validationResult.adjustedConservative,
        expectedTime * 1.4 // Never more than +40%
      );
    }
    if (validationResult.adjustedOptimistic) {
      validationResult.adjustedOptimistic = Math.max(
        validationResult.adjustedOptimistic,
        expectedTime * 0.75 // Never less than -25%
      );
    }

    // Log for learning
    console.log('AI Scenario Validation:', {
      expectedTime,
      original: { conservativeTime, optimisticTime },
      adjusted: { 
        conservative: validationResult.adjustedConservative || conservativeTime,
        optimistic: validationResult.adjustedOptimistic || optimisticTime
      },
      reasoning: validationResult.reasoning,
      historicalContext: historicalMissions?.length || 0
    });

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-trip-scenarios:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isRealistic: true, // Fail open - don't block user
        reasoning: 'Validation error, using original values'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function applyBasicGuardrails(expected: number, conservative: number, optimistic: number): boolean {
  const conservativeDelta = (conservative - expected) / expected;
  const optimisticDelta = (expected - optimistic) / expected;
  
  // Check if within reasonable bounds
  return conservativeDelta <= 0.4 && optimisticDelta <= 0.25;
}
