import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TripData } from '@/types/trip';
import { calculateROI } from '@/lib/missionFinancials';

interface DemoROIProps {
  tripData?: TripData | null;
}

export const DemoROI = ({ tripData }: DemoROIProps) => {
  if (!tripData) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <DollarSign className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Trip Data Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Enter a trip in the Trip AI tab to see financial analysis and ROI calculations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const roi = calculateROI(tripData);
  const { costs, revenue, grossProfit, profitMargin, riskAdjustedROI, successRate } = roi;

  const costBreakdown = [
    { name: 'Fuel', value: costs.fuel, color: 'hsl(var(--primary))' },
    { name: 'Crew', value: costs.crew, color: 'hsl(var(--accent))' },
    { name: 'Maintenance', value: costs.maintenance, color: 'hsl(var(--secondary))' },
    { name: 'Airport Fees', value: costs.airportFees, color: 'hsl(var(--muted))' },
    { name: 'Ground & Other', value: costs.groundTransport + costs.insurance + costs.permits, color: 'hsl(var(--border))' },
  ];

  const isProfitable = grossProfit > 0;
  const viabilityColor = tripData.viabilityStatus === 'safe' ? 'success' : 
                         tripData.viabilityStatus === 'warning' ? 'warning' : 'destructive';

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">ROI Analysis & Financial Overview</CardTitle>
              <CardDescription className="mt-2">
                Comprehensive financial breakdown with risk-adjusted projections
              </CardDescription>
            </div>
            <Badge className={isProfitable ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
              {isProfitable ? 'Profitable Mission' : 'Loss Expected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="border-2 border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Total Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">${costs.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Operational expenses</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-success/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">${revenue.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Medicare reimbursement</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Gross Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${isProfitable ? 'text-primary' : 'text-destructive'}`}>
                  ${grossProfit.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{profitMargin.toFixed(1)}% margin</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Breakdown</CardTitle>
                <CardDescription>Detailed operational expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {costBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold">${item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Details</CardTitle>
                <CardDescription>Insurance and reimbursement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Base Charge</span>
                    <span className="font-semibold">$12,500</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Insurance Type</span>
                    <Badge variant="outline">Medicare Part B</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reimbursement Rate</span>
                    <span className="font-semibold">94.4%</span>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total Revenue</span>
                    <span className="text-xl font-bold text-primary">${revenue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <p className="text-muted-foreground">Pre-authorized for reimbursement</p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <p className="text-muted-foreground">Average processing time: 14 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Risk-Adjusted ROI Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Gross ROI (No Risk Adjustment)</span>
                      <span className="text-2xl font-bold text-foreground">${grossProfit.toLocaleString()}</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <Badge className="bg-success/20 text-success border-success/30">
                        {successRate}%
                      </Badge>
                    </div>
                    <Progress value={successRate} className="h-2" />
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Risk-Adjusted ROI</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">${riskAdjustedROI}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Accounting for historical success probability
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Strong Success Indicators</p>
                      <p className="text-xs text-muted-foreground">
                        Similar missions show 89% success rate with minimal complications
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Favorable Conditions</p>
                      <p className="text-xs text-muted-foreground">
                        Weather, crew experience, and timing all support high success probability
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Risk Factor: Destination Weather</p>
                      <p className="text-xs text-muted-foreground">
                        MVFR conditions may cause minor delays (11% historical impact)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm">
                  <span className="font-semibold">Comparison to Average:</span> This mission's risk-adjusted ROI is{' '}
                  <span className="text-success font-semibold">15% above average</span> for similar routes. 
                  The combination of favorable conditions and proven crew performance supports a strong financial outcome.
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
