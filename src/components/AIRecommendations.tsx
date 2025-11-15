import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function AIRecommendations() {
  const [openItems, setOpenItems] = useState<string[]>(['1']); // First one open by default
  
  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Mock demo data with robust action sequences
  const recommendations = [
    {
      id: '1',
      lead_name: 'Dr. Michael Patterson',
      company: 'HealthCorp Medical',
      aircraft_interest: ['SF50'],
      recommendation_type: 'follow_up',
      action_text: 'Send SF50 performance comparison video',
      reasoning: 'Dr. Patterson has opened the calculator 47 times focusing on Miami-Nashville routes. High engagement indicates readiness for detailed performance data.',
      confidence_score: 94,
      priority: 'high',
      suggested_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      next_actions: [
        '1. Email SF50 vs commercial comparison for his specific route',
        '2. Schedule call to discuss JetStream Platinum package',
        '3. Send case study: Dr. Robert Martinez (look-alike who converted)',
        '4. Offer demo flight within 48 hours'
      ],
    },
    {
      id: '2',
      lead_name: 'Paul Stevenson',
      company: 'TechVentures Capital',
      aircraft_interest: ['SF50', 'SR22T'],
      recommendation_type: 'escalate',
      action_text: 'Schedule demo flight with senior sales',
      reasoning: 'Paul has compared SR22T vs SF50 31 times. Pattern shows decision paralysis - needs hands-on experience to convert. Look-alikes with similar behavior converted after demo.',
      confidence_score: 87,
      priority: 'high',
      suggested_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      next_actions: [
        '1. Propose demo flight with Mike Thompson testimonial (look-alike)',
        '2. Send ownership economics breakdown (leaseback focus)',
        '3. Address decision paralysis: "SF50 vs SR22T decision framework"',
        '4. Escalate to senior sales for relationship building'
      ],
    },
    {
      id: '3',
      lead_name: 'Robert Chen',
      company: 'Chen Tech Solutions',
      aircraft_interest: ['SF50'],
      recommendation_type: 'pricing',
      action_text: 'Send financing options and payment structures',
      reasoning: 'Robert is in closing stage with 88% probability. Calculator activity shows interest in various payment structures - accelerate with concrete numbers. Fast responder (< 2hr avg) = ready to act.',
      confidence_score: 91,
      priority: 'high',
      suggested_date: new Date().toISOString(),
      next_actions: [
        '1. Send personalized financing proposal within 4 hours',
        '2. Include multiple financing scenarios',
        '3. Offer pricing lock for 7 days',
        '4. Schedule closing call for this week'
      ],
    },
    {
      id: '4',
      lead_name: 'Jennifer Martinez',
      company: 'Martinez Realty Group',
      aircraft_interest: ['SR22T'],
      recommendation_type: 'content',
      action_text: 'Share SR22T owner testimonial from real estate sector',
      reasoning: 'Jennifer is in real estate. Look-alike analysis shows real estate professionals respond well to peer success stories.',
      confidence_score: 78,
      priority: 'medium',
      suggested_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      next_actions: [
        '1. Send video testimonial from Sarah Johnson (real estate, SR22T owner)',
        '2. Highlight tax advantages for business use',
        '3. Offer to connect with current real estate owner in her region'
      ],
    },
    {
      id: '5',
      lead_name: 'Sarah Thompson',
      company: 'Thompson Consulting',
      aircraft_interest: ['SR22'],
      recommendation_type: 'nurture',
      action_text: 'Re-engage with CAPS safety article',
      reasoning: 'Sarah has gone cold (14 days no contact). Low calculator engagement suggests safety concerns. CAPS content may reignite interest.',
      confidence_score: 62,
      priority: 'low',
      suggested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      next_actions: [
        '1. Send CAPS safety record article',
        '2. Offer safety seminar invitation',
        '3. Low-pressure check-in call'
      ],
    },
  ];

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'urgent': 'bg-destructive/10 text-destructive border-destructive/20',
      'high': 'bg-warning/10 text-warning border-warning/20',
      'medium': 'bg-sr22-color/10 text-[hsl(var(--sr22-color))] border-[hsl(var(--sr22-color))]/20',
      'low': 'bg-muted text-muted-foreground border-border',
    };
    return colors[priority] || colors['medium'];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-warning" />
          AI-Powered Recommendations
        </h3>
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          78% Success Rate
        </Badge>
      </div>

      <div className="grid gap-4">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="p-5 hover:shadow-lg transition-shadow bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {rec.recommendation_type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs font-semibold text-success ml-auto">
                    {rec.confidence_score}% confidence
                  </span>
                </div>

                {/* Lead Info */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{rec.lead_name}</span>
                  {rec.company && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{rec.company}</span>
                    </>
                  )}
                  {rec.aircraft_interest && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex gap-1">
                        {rec.aircraft_interest.map((aircraft: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {aircraft}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Action Details with Sequence */}
                <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg border-l-2 border-primary">
                  <div className="font-medium mb-1">{rec.action_text}</div>
                  <div className="text-sm text-muted-foreground mb-3">{rec.reasoning}</div>
                  
                  {rec.next_actions && rec.next_actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-xs font-semibold mb-2 text-primary">Recommended Action Sequence:</div>
                      <div className="space-y-1">
                        {rec.next_actions.map((action: string, idx: number) => (
                          <div key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">→</span>
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timing */}
                {rec.suggested_date && (
                  <div className="text-xs text-muted-foreground">
                    Suggested: {new Date(rec.suggested_date).toLocaleDateString()} at{' '}
                    {new Date(rec.suggested_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button size="sm" className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </Button>
                <Button size="sm" variant="ghost">
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
