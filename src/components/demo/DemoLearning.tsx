import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Database, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const DemoLearning = () => {
  const learningProgress = [
    { month: 'Month 1', dispatches: 12, accuracy: 65 },
    { month: 'Month 2', dispatches: 28, accuracy: 72 },
    { month: 'Month 3', dispatches: 45, accuracy: 79 },
    { month: 'Month 4', dispatches: 68, accuracy: 84 },
    { month: 'Month 5', dispatches: 92, accuracy: 87 },
    { month: 'Month 6', dispatches: 118, accuracy: 91 },
  ];

  const patternData = [
    { factor: 'Weather', impact: 23, count: 34 },
    { factor: 'Time of Day', impact: 18, count: 42 },
    { factor: 'Crew Experience', impact: 15, count: 28 },
    { factor: 'Route Traffic', impact: 12, count: 31 },
    { factor: 'Airport Ops', impact: 8, count: 19 },
  ];

  const insights = [
    {
      category: 'Weather Impact',
      finding: 'Traffic at KJFK between 4-6pm adds avg 23 min delay',
      confidence: 94,
      samples: 34,
      type: 'delay',
    },
    {
      category: 'Crew Performance',
      finding: 'Capt. Mitchell + FO Rodriguez pairing shows 15% faster ground ops',
      confidence: 88,
      samples: 12,
      type: 'success',
    },
    {
      category: 'Route Optimization',
      finding: 'KHPN → KRDU: Afternoon departures 21% more reliable than morning',
      confidence: 92,
      samples: 28,
      type: 'success',
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">AI Learning & Pattern Recognition</CardTitle>
                <Badge className="bg-primary/20 text-primary">
                  <Brain className="w-3 h-3 mr-1" />
                  Active Learning
                </Badge>
              </div>
              <CardDescription className="mt-2">
                System intelligence improves with every dispatch
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Total Dispatches</p>
                </div>
                <p className="text-3xl font-bold">118</p>
                <p className="text-xs text-muted-foreground mt-1">Training samples</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
                </div>
                <p className="text-3xl font-bold">91%</p>
                <p className="text-xs text-success mt-1">+26% since start</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-5 h-5 text-secondary" />
                  <p className="text-sm text-muted-foreground">Patterns Found</p>
                </div>
                <p className="text-3xl font-bold">47</p>
                <p className="text-xs text-muted-foreground mt-1">Correlations identified</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-warning" />
                  <p className="text-sm text-muted-foreground">Live Updates</p>
                </div>
                <p className="text-3xl font-bold">Real-time</p>
                <p className="text-xs text-muted-foreground mt-1">Continuous learning</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Learning Progress Over Time</CardTitle>
                <CardDescription>Prediction accuracy improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={learningProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="dispatches" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Dispatches"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pattern Recognition Analysis</CardTitle>
                <CardDescription>Factors affecting dispatch outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={patternData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="factor" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="impact" fill="hsl(var(--primary))" name="Avg Impact (min)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI-Discovered Insights</CardTitle>
              <CardDescription>Automatically identified patterns from historical data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${insight.type === 'success' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {insight.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-warning" />
                      )}
                      <h4 className="font-semibold">{insight.category}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {insight.confidence}% confidence
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {insight.samples} samples
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.finding}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">How AI Learning Works</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold mb-1">Data Collection</p>
                  <p className="text-muted-foreground">
                    Every dispatch captures timing, weather, crew, route, and outcome data
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold mb-1">Pattern Recognition</p>
                  <p className="text-muted-foreground">
                    AI identifies correlations between variables and outcomes using machine learning
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold mb-1">Prediction Improvement</p>
                  <p className="text-muted-foreground">
                    System adjusts time estimates, success rates, and confidence scores based on learned patterns
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="font-semibold mb-1">Continuous Feedback</p>
                  <p className="text-muted-foreground">
                    Post-flight feedback and chief pilot notes train the system to recognize edge cases
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
