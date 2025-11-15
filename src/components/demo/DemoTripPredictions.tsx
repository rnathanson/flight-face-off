import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Target, MapPin, Plane, Clock } from 'lucide-react';

export const DemoTripPredictions = () => {
  const scenarios = [
    {
      type: 'Worst Case',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      time: '4h 15m - 4h 45m',
      confidence: 78,
      factors: [
        'Potential weather delays at destination',
        'Evening rush hour traffic in NYC area',
        'Possible ATC delays into RDU',
      ],
    },
    {
      type: 'Likely Scenario',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      time: '3h 30m - 3h 45m',
      confidence: 92,
      factors: [
        'Normal weather conditions expected',
        'Optimal routing via J79 airway',
        'Mid-afternoon departure - good traffic windows',
      ],
    },
    {
      type: 'Best Case',
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      time: '2h 50m - 3h 10m',
      confidence: 85,
      factors: [
        'Favorable tailwinds at altitude',
        'Light traffic at all ground segments',
        'Direct routing available',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">AI-Powered Trip Predictions</CardTitle>
              <CardDescription className="mt-2">
                Intelligent time estimation using historical data and real-time conditions
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              Based on 47 similar flights
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">Northwell Health Manhasset</p>
                <p className="text-sm text-muted-foreground">Manhasset, NY → KHPN (13nm)</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Plane className="w-5 h-5 text-muted-foreground rotate-90" />
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">Duke University Hospital</p>
                <p className="text-sm text-muted-foreground">Durham, NC → KRDU (8nm)</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <Card 
                  key={scenario.type} 
                  className={`${scenario.bgColor} ${scenario.borderColor} border-2 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${scenario.color}`} />
                      <CardTitle className="text-base">{scenario.type}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Clock className={`w-4 h-4 ${scenario.color}`} />
                      <span className="text-2xl font-bold text-foreground">{scenario.time}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold">{scenario.confidence}%</span>
                      </div>
                      <Progress value={scenario.confidence} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Key Factors</p>
                      <ul className="space-y-1.5">
                        {scenario.factors.map((factor, idx) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className={`mt-1 w-1 h-1 rounded-full ${scenario.color} bg-current flex-shrink-0`} />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-card border border-border rounded-lg">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">AI Recommendation</p>
                <p className="text-sm text-muted-foreground">
                  Based on historical analysis of similar routes, departing between 2:00 PM - 3:00 PM provides 
                  the highest success rate (94%) with optimal ground traffic conditions at both locations. 
                  Current weather patterns support the <span className="font-semibold text-success">Likely Scenario</span> prediction.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
