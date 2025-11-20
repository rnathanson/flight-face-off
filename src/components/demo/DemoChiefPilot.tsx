import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Mail, FileText, TrendingUp } from 'lucide-react';
import { TripData } from '@/types/trip';

interface DemoChiefPilotProps {
  tripData?: TripData | null;
}

export const DemoChiefPilot = ({ tripData }: DemoChiefPilotProps) => {
  if (!tripData) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Trip Data Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Enter a trip in the Trip AI tab to see chief pilot operational oversight and approval workflow.
          </p>
        </CardContent>
      </Card>
    );
  }

  const missionId = `DIS-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
  
  const pendingApprovals = [
    {
      id: missionId,
      route: `${tripData.originAirport?.code} → ${tripData.destAirport?.code}`,
      reason: 'Weather monitoring required',
      confidence: 85,
      roi: 7200,
      priority: 'high',
      time: 'Just now',
    },
  ];

  const recentDispatches = [
    { id: 'DIS-2024-046', status: 'completed', route: 'KHPN → KBOS', outcome: 'Success', time: '3h ago' },
    { id: 'DIS-2024-045', status: 'in-progress', route: 'KTEB → KCLT', outcome: 'En Route', time: '1h ago' },
    { id: 'DIS-2024-044', status: 'completed', route: 'KHPN → KPHL', outcome: 'Success', time: '5h ago' },
    { id: 'DIS-2024-043', status: 'completed', route: 'KTEB → KIAD', outcome: 'Delayed - Success', time: '8h ago' },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Chief Pilot Operations Dashboard</CardTitle>
              <CardDescription className="mt-2">
                Approval workflow and operational oversight
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-warning/10">
                <AlertTriangle className="w-3 h-3 mr-1" />
                2 Pending
              </Badge>
              <Badge variant="outline" className="bg-success/10">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                12 Today
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Pending Approval
              </TabsTrigger>
              <TabsTrigger value="recent">
                <Clock className="w-4 h-4 mr-2" />
                Recent Activity
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingApprovals.map((dispatch) => (
                <Card key={dispatch.id} className="border-warning/30 bg-warning/5">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{dispatch.id}</h3>
                            <Badge variant="outline" className={dispatch.priority === 'high' ? 'border-destructive text-destructive' : 'border-warning text-warning'}>
                              {dispatch.priority.toUpperCase()} PRIORITY
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{dispatch.route} • Requested {dispatch.time}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-2" />
                            View Full Brief
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 bg-card rounded-lg border border-border">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold">Requires Approval:</p>
                            <p className="text-sm text-muted-foreground">{dispatch.reason}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground mb-1">AI Confidence</p>
                          <p className="text-xl font-bold">{dispatch.confidence}%</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground mb-1">Projected ROI</p>
                          <p className="text-xl font-bold">${dispatch.roi.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground mb-1">Success Rate</p>
                          <p className="text-xl font-bold">89%</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 bg-success hover:bg-success/90">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve Dispatch
                        </Button>
                        <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10">
                          <XCircle className="w-4 h-4 mr-2" />
                          Deny with Feedback
                        </Button>
                        <Button variant="outline">
                          <Mail className="w-4 h-4 mr-2" />
                          Request Info
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingApprovals.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="text-lg font-semibold">All caught up!</p>
                  <p className="text-sm text-muted-foreground mt-1">No dispatches pending approval</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch ID</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDispatches.map((dispatch) => (
                      <TableRow key={dispatch.id}>
                        <TableCell className="font-semibold">{dispatch.id}</TableCell>
                        <TableCell>{dispatch.route}</TableCell>
                        <TableCell>
                          <Badge variant={dispatch.status === 'completed' ? 'outline' : 'secondary'}>
                            {dispatch.status === 'completed' ? (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                              <Clock className="w-3 h-3 mr-1" />
                            )}
                            {dispatch.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={dispatch.outcome.includes('Success') ? 'text-success' : 'text-muted-foreground'}>
                            {dispatch.outcome}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{dispatch.time}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Today's Dispatches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">12</p>
                    <p className="text-xs text-success">+3 vs. yesterday</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">94%</p>
                    <p className="text-xs text-success">+2% this week</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Avg ROI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">$7.2K</p>
                    <p className="text-xs text-success">+8% this month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Active Crews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">8</p>
                    <p className="text-xs text-muted-foreground">2 on duty</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekly Performance Summary</CardTitle>
                  <CardDescription>Key metrics and insights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                      <div>
                        <p className="font-semibold text-success">Strong Week</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          48 successful dispatches this week with 94% on-time rate. Average crew utilization at optimal 72%.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Top Performing Routes:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• KHPN → KBOS: 8 flights, 100% success</li>
                      <li>• KTEB → KPHL: 6 flights, 100% success</li>
                      <li>• KHPN → KRDU: 4 flights, 100% success</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
