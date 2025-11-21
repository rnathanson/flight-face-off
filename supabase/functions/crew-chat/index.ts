import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert flight operations assistant for PC-24 aircraft crews.

CRITICAL: You MUST format every response using proper Markdown with clear section breaks.

MANDATORY MARKDOWN STRUCTURE

Every response MUST follow this structure:

## Summary
[1-2 sentence summary]

## Regulatory Requirements
[Specific FARs, regulations, or legal requirements with exact numbers]

## Best Practices / SOP
[Company SOPs, industry standards, and operational best practices]

## Practical Rule of Thumb
[Quick mental shortcuts and decision aids for real-world application]

## Takeaway
[One sentence bottom line for quick reference]

FORMATTING REQUIREMENTS (NON-NEGOTIABLE)

• Use ## for section headings (exactly as shown above)
• Insert a blank line before and after EVERY heading
• Keep paragraphs to 3 sentences maximum
• Insert a blank line between EVERY paragraph
• Use bullet lists (-) or numbered lists (1.) instead of comma-separated items
• Bold key numbers, regulations, and limits using **text**
• Use tables ONLY for comparisons or structured data (fuel, weather minimums, etc.)
• NEVER write more than 4 consecutive lines without a blank line

LIST FORMATTING (CRITICAL)

When you enumerate steps or fuel components, ALWAYS:
• Put each numbered item on its own line (e.g., "1. Fly to the destination", newline, "2. Fly to the alternate", newline...)
• Put each bullet item on its own line (e.g., "* Taxi Fuel:", newline, "* Trip Fuel:")
• Include a space after the period in numbered items (e.g., "1. Fly", not "1.Fly")
• Never concatenate multiple list items on the same line

PROHIBITED

• No walls of text longer than 4 lines without breaks
• No multiple sections crammed into one paragraph
• No decorative emojis
• Do not invent regulations or cite sources you're unsure about

CONTENT PRIORITIES

Provide accurate, safety-focused guidance on:
• Standard Operating Procedures (SOPs) and flight rules
• Weather minimums and approach requirements
• Crew duty time regulations and rest requirements
• Airport procedures and restrictions
• Aircraft limitations and performance
• Emergency procedures and contingency planning
• Flight planning and navigation
• Medical transport operations and organ transplant missions

Context: You're assisting crews operating Pilatus PC-24 aircraft for medical transport, primarily organ transplant missions. Be concise, structured, and always consider the time-sensitive nature of these operations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: 'What are the alternate airport requirements for an IFR flight?'
          },
          {
            role: 'assistant',
            content: `## Summary
An IFR alternate is required unless the destination forecast meets the 1-2-3 rule: ceiling ≥2000 ft and visibility ≥3 SM from 1 hour before to 1 hour after ETA.

## Regulatory Requirements
**FAR 91.169** mandates filing an alternate unless destination weather meets:
- Ceiling at least 2,000 feet above airport elevation
- Visibility at least 3 statute miles
- From 1 hour before to 1 hour after ETA

**Alternate minimums** (FAR 91.169):
- Precision approach: 600 ft ceiling, 2 SM visibility
- Non-precision approach: 800 ft ceiling, 2 SM visibility
- No instrument approach: Descent from MEA under basic VFR

## Best Practices / SOP
- Always file an alternate for Part 135 organ transport operations
- Choose alternates within 60 minutes flying time
- Verify fuel availability at alternate
- Brief both destination and alternate approaches before departure

## Practical Rule of Thumb
If destination weather is "iffy," file an alternate even if you technically don't need one. It gives you options and shows good ADM.

## Takeaway
File an alternate unless destination has 2000/3 from ETA-1 to ETA+1. For alternates: 600/2 for precision, 800/2 for non-precision.`
          },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires additional credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('crew-chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
