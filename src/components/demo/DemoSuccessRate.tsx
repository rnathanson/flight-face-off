import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, XCircle, TrendingUp, Shield } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const DemoSuccessRate = () => {
  const overallSuccess = 89;
  
  const riskFactors = [
    { name: 'Distance', risk: 'Low', score: 92, color: 'text-success', bgColor: 'bg-success/10' },
    { name: 'Weather Conditions', risk: 'Moderate', score: 78, color: 'text-warning', bgColor: 'bg-warning/10' },
    { name: 'Time of Day', risk: 'Low', score: 88, color: 'text-success', bgColor: 'bg-success/10' },
    { name: 'Organ Viability Window', risk: 'Low', score: 95, color: 'text-success', bgColor: 'bg-success/10' },
  ];

  const historicalData = [
    { month: 'Jan', success: 87, total: 23 },
    { month: 'Feb', success: 91, total: 19 },
    { month: 'Mar', success: 85, total: 26 },
    { month: 'Apr', success: 89, total: 28 },
    { month: 'May', success: 92, total: 25 },
    { month: 'Jun', success: 90, total: 22 },
  ];

  const similarFlights = [
    { status: 'Success', count: 9, color: 'hsl(var(--success))' },
    { status: 'Delayed', count: 1, color: 'hsl(var(--warning))' },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-success/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Success Rate Prediction</CardTitle>
              <CardDescription className="mt-2">
                AI-powered success probability for this transplant mission
              </CardDescription>
            </div>
            <Badge className="bg-success/20 text-success border-success/30">
              High Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="text-center p-8 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
              <Shield className="w-12 h-12 text-success mx-auto mb-3" />
              <div className="text-5xl font-bold text-success mb-2">{overallSuccess}%</div>
              <p className="text-sm text-muted-foreground">Predicted Success Rate</p>
              <p className="text-xs text-muted-foreground mt-1">For similar transplant missions</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Risk Assessment</h3>
              </div>
              {riskFactors.map((factor) => (
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
                    <span className="text-muted-foreground">9 successful deliveries</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <span className="text-muted-foreground">1 delayed but organ remained viable</span>
                  </div>
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
