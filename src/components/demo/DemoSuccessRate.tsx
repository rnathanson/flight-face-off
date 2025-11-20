import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, TrendingUp, Shield, Calculator, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TripData } from '@/types/trip';

interface DemoSuccessRateProps {
  tripData?: TripData | null;
}

export const DemoSuccessRate = ({ tripData }: DemoSuccessRateProps) => {
  if (!tripData) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calculator className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Trip Data Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Enter a trip in the Trip AI tab to see success rate predictions and risk analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overallSuccess = tripData.overallSuccess || 85;
  const viabilityPercent = tripData.viabilityUsedPercent || 65;
  const distance = (tripData.originAirport?.distance_nm || 0) + (tripData.destAirport?.distance_nm || 0);
  
  // Extract risk factors from insights or create based on trip data
  const insights = tripData.insights || [];
  const riskFactors = insights.map(insight => {
    const isGood = insight.status === 'success' || insight.score > 85;
    return {
      name: insight.title,
      risk: isGood ? 'Low' : insight.score > 70 ? 'Moderate' : 'High',
      score: insight.score,
      color: isGood ? 'text-success' : insight.score > 70 ? 'text-warning' : 'text-destructive',
      bgColor: isGood ? 'bg-success/10' : insight.score > 70 ? 'bg-warning/10' : 'bg-destructive/10',
    };
  });

  // Add viability as a risk factor if not already present
  if (!riskFactors.find(r => r.name.toLowerCase().includes('viability'))) {
    riskFactors.push({
      name: 'Organ Viability Window',
      risk: viabilityPercent < 70 ? 'Low' : viabilityPercent < 85 ? 'Moderate' : 'High',
      score: Math.max(10, 100 - viabilityPercent),
      color: viabilityPercent < 70 ? 'text-success' : viabilityPercent < 85 ? 'text-warning' : 'text-destructive',
      bgColor: viabilityPercent < 70 ? 'bg-success/10' : viabilityPercent < 85 ? 'bg-warning/10' : 'bg-destructive/10',
    });
  }

  // Generate historical data based on organ type (in real app, this would come from database)
  const organType = tripData.missionType?.organ_type || 'kidney';
  const baseSuccess = organType.toLowerCase().includes('heart') ? 88 : 
                      organType.toLowerCase().includes('liver') ? 87 : 
                      organType.toLowerCase().includes('lung') ? 85 : 90;
  
  const historicalData = [
    { month: 'Jan', success: baseSuccess - 3, total: 18 },
    { month: 'Feb', success: baseSuccess + 1, total: 15 },
    { month: 'Mar', success: baseSuccess - 2, total: 22 },
    { month: 'Apr', success: baseSuccess, total: 24 },
    { month: 'May', success: baseSuccess + 2, total: 21 },
    { month: 'Jun', success: baseSuccess + 1, total: 19 },
  ];

  const similarFlights = [
    { status: 'Success', count: Math.round(overallSuccess / 10), color: 'hsl(var(--success))' },
    { status: 'Delayed', count: Math.max(1, Math.round((100 - overallSuccess) / 15)), color: 'hsl(var(--warning))' },
    { status: 'Failed', count: Math.max(0, Math.round((100 - overallSuccess) / 20)), color: 'hsl(var(--destructive))' },
  ];

  const confidenceLevel = overallSuccess >= 90 ? 'High' : overallSuccess >= 80 ? 'Good' : overallSuccess >= 70 ? 'Moderate' : 'Low';
  const confidenceColor = overallSuccess >= 90 ? 'success' : overallSuccess >= 80 ? 'primary' : overallSuccess >= 70 ? 'warning' : 'destructive';

  return (
    <div className="space-y-6">
      <Card className={`shadow-card border-${confidenceColor}/20`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Success Rate Prediction</CardTitle>
              <CardDescription className="mt-2">
                AI-powered success probability for this {organType} transplant mission
              </CardDescription>
            </div>
            <Badge className={`bg-${confidenceColor}/20 text-${confidenceColor} border-${confidenceColor}/30`}>
              {confidenceLevel} Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className={`text-center p-8 bg-gradient-to-br from-${confidenceColor}/10 to-${confidenceColor}/5 rounded-lg border border-${confidenceColor}/20`}>
              <Shield className={`w-12 h-12 text-${confidenceColor} mx-auto mb-3`} />
              <div className={`text-5xl font-bold text-${confidenceColor} mb-2`}>{overallSuccess}%</div>
              <p className="text-sm text-muted-foreground">Predicted Success Rate</p>
              <p className="text-xs text-muted-foreground mt-1">For this specific mission profile</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Risk Assessment</h3>
              </div>
              {riskFactors.slice(0, 4).map((factor) => (
                <div key={factor.name} className={`p-3 rounded-lg border ${factor.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{factor.name}</span>
                    <Badge variant="outline" className={factor.color}>
                      {factor.risk} Risk
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={factor.score} className="h-1.5" />
                    <span className="text-xs font-semibold w-10 text-right">{factor.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historical Success Trend</CardTitle>
                <CardDescription>Last 6 months of similar missions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[80, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="success" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--success))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Last 10 Similar Transports</CardTitle>
                <CardDescription>Same route and organ type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={similarFlights}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {similarFlights.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">{similarFlights[0]?.count || 0} successful deliveries</span>
                  </div>
                  {similarFlights[1] && similarFlights[1].count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      <span className="text-muted-foreground">{similarFlights[1].count} delayed but organ remained viable</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">AI Analysis</p>
                <p className="text-sm text-muted-foreground">
                  This mission profile shows strong success indicators. The 6.2-hour organ viability window 
                  provides comfortable margin for the predicted 3.5-hour transport time. Historical data shows 
                  this route has excellent reliability with only minor weather-related delays occurring in 1 of 10 cases, 
                  none of which compromised organ viability.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
