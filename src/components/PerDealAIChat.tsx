import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PerDealAIChatProps {
  lead: any;
}

// Helper function to get comprehensive lead context
const getLeadContext = (lead: any) => {
  const name = lead.full_name;
  
  // Lead-specific psychological profiles and context
  const leadContexts: Record<string, any> = {
    'Marcus Johnson': {
      psychProfile: ['Detail-Oriented', 'Data-Driven', 'Risk-Averse'],
      primaryConcerns: 'Safety record and operating costs',
      decisionMaker: 'Solo decision, but discusses major purchases with spouse',
      businessUse: '75%',
      routes: 'Austin to Dallas, Houston medical conferences',
      networkInfluence: 'John Smith (N555JS) is close friend and strong advocate. Sarah Thompson (CTC connection) provides peer validation.',
      conversionPath: 'Demo flight → Detailed cost analysis → Financing approval → Close (avg 45 days)',
      lookAlikes: 'Medical professionals who closed in 38-52 days with safety-first messaging',
      fastestClose: 'Emphasize CAPS safety system, provide detailed TCO spreadsheet, offer John Smith testimonial call',
      recentActivity: '47 calculator opens (heavy analysis mode), opened safety whitepaper 3 times, 18min call about maintenance costs'
    },
    'Dr. Richard Patterson': {
      psychProfile: ['Status-Seeker', 'Early Adopter', 'Visionary'],
      primaryConcerns: 'Exclusivity, prestige, and cutting-edge technology',
      decisionMaker: 'Solo decision, entrepreneurial mindset',
      businessUse: '60%',
      routes: 'Naples to Miami, Tampa business meetings, Caribbean weekend trips',
      networkInfluence: 'Robert Chen (88% probability) and Jennifer Martinez (SR22T owner) are hangar neighbors. Strong peer influence.',
      conversionPath: 'VIP demo → Delivery timeline urgency → Exclusive positioning → Close (avg 28 days)',
      lookAlikes: 'Entrepreneurs who closed quickly with exclusivity messaging and delivery urgency',
      fastestClose: 'Position as executive choice, emphasize limited delivery slots, arrange demo with hangar neighbor owners',
      recentActivity: '38 calculator opens, requested VIP brochure, 22min call about Naples delivery timeline'
    },
    'Paul Stevenson': {
      psychProfile: ['Value Hunter', 'Analytical', 'Conservative Spender'],
      primaryConcerns: 'Operating costs, fuel efficiency, resale value',
      decisionMaker: 'Consults with spouse and financial advisor',
      businessUse: '40%',
      routes: 'Phoenix to Las Vegas, California coast trips, occasional Aspen',
      networkInfluence: 'Limited aviation network, no close owner connections yet',
      conversionPath: 'Cost analysis → Partnership exploration → Leaseback evaluation → Extended nurture (avg 65 days)',
      lookAlikes: 'Cost-conscious buyers who needed detailed ROI and partnership options',
      fastestClose: 'Provide comprehensive TCO vs alternatives, explore partnership to reduce costs, show leaseback revenue potential',
      recentActivity: '52 calculator opens (cost-focused), opened partnership guide, 15min call about leaseback'
    },
    'Jennifer Martinez': {
      psychProfile: ['Returning Customer', 'Confident', 'Performance-Oriented'],
      primaryConcerns: 'Speed, range capabilities, upgrade path',
      decisionMaker: 'Solo decision, experienced aircraft owner',
      businessUse: '85%',
      routes: 'Texas regional sales territory, frequent 300-400nm trips',
      networkInfluence: 'Michael Davis (N333MD) influenced her SR22T purchase. Strong Cirrus loyalty.',
      conversionPath: 'Trade-in evaluation → Performance comparison → Quick close (avg 21 days)',
      lookAlikes: 'SR22 upgraders who closed quickly with trade-in + performance focus',
      fastestClose: 'Emphasize jet speed advantage (2x faster), strong trade-in value, Michael Davis peer validation',
      recentActivity: '29 calculator opens, requested trade-in appraisal, 31min call about SF50 performance vs SR22T'
    },
    'Robert Chen': {
      psychProfile: ['Tech Enthusiast', 'Innovation-Focused', 'Quick Decision Maker'],
      primaryConcerns: 'Avionics, automation, modern technology',
      decisionMaker: 'Solo decision, tech entrepreneur mindset',
      businessUse: '70%',
      routes: 'Silicon Valley to LA, Seattle tech conferences, Tahoe weekends',
      networkInfluence: 'Dr. Richard Patterson (hangar neighbor, high probability). Active in tech aviation groups.',
      conversionPath: 'Tech demo → Avionics deep-dive → Fast close (avg 24 days)',
      lookAlikes: 'Tech entrepreneurs who closed quickly with innovation messaging',
      fastestClose: 'Highlight Garmin Perspective Touch+, CAPS innovation, position as aviation tech leader',
      recentActivity: '33 calculator opens, downloaded avionics guide, 26min call about autopilot capabilities'
    }
  };
  
  return leadContexts[name] || {
    psychProfile: ['Engaged Prospect'],
    primaryConcerns: 'Aircraft ownership evaluation',
    decisionMaker: 'Evaluating options',
    businessUse: '50%',
    routes: 'Regional travel',
    networkInfluence: 'Building aviation connections',
    conversionPath: 'Standard sales process',
    lookAlikes: 'Similar prospects in evaluation phase',
    fastestClose: 'Demo flight and personalized ROI analysis',
    recentActivity: 'Active engagement with calculator and materials'
  };
};

// Helper function to generate contextual responses
const generateResponse = (input: string, lead: any, context: any) => {
  const lowerInput = input.toLowerCase();
  const name = lead.full_name;
  
  // Objection handling
  if (lowerInput.includes('objection') || lowerInput.includes('concern')) {
    return `PRIMARY CONCERN: ${context.primaryConcerns}

RECOMMENDED APPROACH:
${context.fastestClose}

SUPPORTING DATA:
Look-alikes: ${context.lookAlikes} responded best to this approach.

LEVERAGE POINTS:
${context.networkInfluence}`;
  }
  
  // Next steps
  if (lowerInput.includes('next step') || lowerInput.includes('recommend')) {
    return `CURRENT STATUS:
${name} has ${lead.calculator_opens} calculator opens - ${lead.calculator_opens > 40 ? 'deep analysis mode' : 'active evaluation'}

IMMEDIATE ACTIONS:
1. ${context.fastestClose.split(',')[0]}
2. Leverage network: ${context.networkInfluence}
3. ${context.recentActivity}

TIMELINE:
${context.conversionPath}
Act within 24 hours for maximum momentum.`;
  }
  
  // Timing and close strategy
  if (lowerInput.includes('close') || lowerInput.includes('timing') || lowerInput.includes('when')) {
    const avgDays = context.conversionPath.match(/(\d+)\s*days/)?.[1] || '45';
    return `DEAL VELOCITY:
${context.conversionPath} pattern. Average: ${avgDays} days.

FASTEST CLOSE TACTICS:
${context.fastestClose}

KEY ACCELERATORS:
${context.networkInfluence ? `Network leverage (${context.networkInfluence.split('.')[0]}), ` : ''}Demo flight (cuts 15 days), delivery urgency (cuts 8 days)

Current probability: ${lead.probability_score}%
Strike within 48-72 hours.`;
  }
  
  // Network and relationships
  if (lowerInput.includes('network') || lowerInput.includes('influence') || lowerInput.includes('relationship')) {
    return `NETWORK INTELLIGENCE FOR ${name.toUpperCase()}:

${context.networkInfluence}

LEVERAGE STRATEGY:
Arrange a three-way call or hangar visit. Peer validation from satisfied owners is 3x more effective than sales messaging for ${context.psychProfile[0]} personality types.

BUSINESS USE ANGLE:
${context.businessUse} suggests focusing on operational efficiency stories.`;
  }
  
  // Why interested / motivation
  if (lowerInput.includes('why') || lowerInput.includes('motivat') || lowerInput.includes('interest')) {
    return `PSYCHOLOGICAL PROFILE:
${context.psychProfile.join(', ')}

PRIMARY DRIVERS:
${context.primaryConcerns}

BUSINESS USE:
${context.businessUse} - Flying ${context.routes}

DECISION STYLE:
${context.decisionMaker}

RECENT ACTIVITY:
${context.recentActivity}`;
  }
  
  // Messaging strategy
  if (lowerInput.includes('messag') || lowerInput.includes('communication') || lowerInput.includes('talk')) {
    return `MESSAGING STRATEGY FOR ${name.toUpperCase()}:

Based on ${context.psychProfile.join(', ')} profile:

LEAD WITH:
${context.primaryConcerns}

COMMUNICATION STYLE:
${context.psychProfile.includes('Detail-Oriented') ? 'Data-heavy, analytical, detailed ROI' : context.psychProfile.includes('Status-Seeker') ? 'Prestige-focused, exclusivity, peer validation' : 'Clear value proposition, practical benefits'}

PROOF POINTS:
${context.lookAlikes}

KEY TACTICS:
- Use specific numbers and timelines
- Reference network connections
- ${context.psychProfile.includes('Status-Seeker') ? 'Emphasize exclusivity and peer ownership' : context.psychProfile.includes('Detail-Oriented') ? 'Provide data and detailed analysis' : 'Focus on value and practicality'}`;
  }
  
  // Budget
  if (lowerInput.includes('budget') || lowerInput.includes('afford') || lowerInput.includes('price')) {
    return `BUDGET INDICATORS:
Profession: ${lead.profession}
Business use: ${context.businessUse}

FINANCIAL APPROACH:
${context.psychProfile.includes('Value Hunter') ? 'Cost-conscious profile - financing and leaseback will be key' : context.psychProfile.includes('Status-Seeker') ? 'Status-oriented profile - budget less of a concern than exclusivity' : 'Standard financing approach appropriate'}

STRATEGY:
${context.fastestClose.includes('TCO') ? 'Lead with total cost of ownership vs alternatives' : context.fastestClose.includes('trade-in') ? 'Emphasize strong trade-in value' : 'Focus on value delivered, not price'}`;
  }
  
  // Competitive positioning
  if (lowerInput.includes('competit') || lowerInput.includes('vs') || lowerInput.includes('alternative')) {
    return `For ${name}'s ${context.businessUse} business use on routes like ${context.routes}, position the SF50 as:\n\n**vs. Other Jets:** Single-pilot, lower operating costs, CAPS safety\n**vs. High-performance props:** 2x faster, pressurized, jet prestige\n**vs. Fractional:** Full ownership control, ${context.businessUse} business use tax benefits\n\nTheir ${context.psychProfile[0]} profile responds best to ${context.psychProfile.includes('Detail-Oriented') ? 'detailed cost comparisons and efficiency data' : context.psychProfile.includes('Status-Seeker') ? 'prestige and exclusivity arguments' : 'practical performance benefits'}.`;
  }
  
  // Default contextual response
  return `I have complete context on ${name}'s deal:\n\n**Profile:** ${context.psychProfile.join(', ')}\n**Concerns:** ${context.primaryConcerns}\n**Network:** ${context.networkInfluence}\n**Stage:** ${context.conversionPath}\n\nI can help with: objection handling, next steps, timing strategy, messaging, network leverage, competitive positioning, or budget discussions. What would you like to explore?`;
};

export function PerDealAIChat({ lead }: PerDealAIChatProps) {
  const context = getLeadContext(lead);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `I have full context on ${lead.full_name}. What would you like help with? I can advise on objections, next steps, timing, messaging, network leverage, or competitive positioning.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('sales-chat', {
        body: { 
          messages: [...messages, { role: 'user', content: input }],
          leadContext: {
            name: lead.full_name,
            psychProfile: context.psychProfile,
            primaryConcerns: context.primaryConcerns,
            decisionMaker: context.decisionMaker,
            businessUse: context.businessUse,
            routes: context.routes,
            networkInfluence: context.networkInfluence,
            conversionPath: context.conversionPath,
            lookAlikes: context.lookAlikes,
            fastestClose: context.fastestClose,
            recentActivity: context.recentActivity
          }
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error calling sales-chat:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-96 flex flex-col bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 border-b border-border bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-semibold">Deal Coach</span>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            Deal Context Loaded
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Knows all details about {lead.full_name}'s deal and 54 similar conversion paths
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Analyzing deal context...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about objections, next steps, timing..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} size="icon" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
