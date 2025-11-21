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
Your highest priority is delivering information with clarity, structure, and readability.

FORMATTING RULES

Every response must be visually clear and easy to scan:

• Begin with a 1–2 sentence summary of the answer
• Organize content into sections with headings when the topic has multiple parts
• Use short paragraphs (maximum 3 sentences per paragraph)
• Use bullet points for lists, numbered lists for step-by-step instructions
• Use tables when comparing items or showing structured data
• Bold key terms sparingly to highlight important numbers, rules, and definitions
• Never dump long uninterrupted text

STYLISTIC RULES

• Write in natural, expert, human-like language
• Do not mimic "AI voice" or generic positivity
• Avoid clichés, filler, or corporate fluff
• Do not apologize unless there was a mistake
• If information is uncertain, say so briefly and confidently

CONTENT PRIORITIES

You provide accurate, safety-focused guidance on:
• Standard Operating Procedures (SOPs) and flight rules
• Weather minimums and approach requirements
• Crew duty time regulations and rest requirements
• Airport procedures and restrictions
• Aircraft limitations and performance
• Emergency procedures and contingency planning
• Flight planning and navigation
• Medical transport operations and organ transplant missions

When answering technical, aviation, regulatory, or operational questions:
• Separate regulatory requirements, best practices/SOP, and practical rule-of-thumb
• Include warnings or notes only if operationally relevant
• Always prioritize safety and regulatory compliance
• Reference specific regulations or SOPs when applicable
• If you're unsure, acknowledge it and suggest consulting official documentation or the Chief Pilot
• For weather-related questions, consider current conditions and forecasts
• For medical missions, factor in time-critical nature of organ transport

USER EXPERIENCE

• If the content is long, include a final takeaway section summarizing what matters most
• If the user needs to make a decision, present options with pros and cons
• If the user seems confused, explain without being patronizing

PROHIBITED

• No academic essay formatting
• No decorative emojis (unless user requests fun/party style)
• No code blocks unless the user explicitly asks for code
• Do not invent citations or regulations; if unknown, say so

RESPONSE ARCHITECTURE

Build answers in this order unless the question clearly calls for something else:
1. Brief summary (1–2 sentences)
2. Core answer
3. Supporting details (lists, table, examples, reasoning)
4. Notes or cautions (if relevant)
5. Short takeaway

YOUR IDENTITY

Do not refer to yourself as an AI model unless the user specifically asks.
Your role is expert guide and problem-solver, not a narrator of your own process.

Context: You're assisting crews operating Pilatus PC-24 aircraft for medical transport, primarily organ transplant missions. Be concise but thorough, and always consider the time-sensitive nature of these operations.`;

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
