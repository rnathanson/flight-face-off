import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Medal } from "lucide-react";

interface Referrer {
  id: string;
  name: string;
  referralCount: number;
  influenceScore: number;
  pipelineGenerated: number;
  conversionRate: number;
  customerType: string;
}

interface ReferralDetail {
  id: string;
  name: string;
  status: string;
  pipelineValue: number;
  daysInPipeline: number;
}

interface InfluenceBreakdown {
  networkSize: number;
  networkPoints: number;
  responseTimeHours: number;
  responsePoints: number;
  closeRate: number;
  closeRatePoints: number;
  avgDealSize: number;
  dealSizePoints: number;
}

const mockReferrers: Referrer[] = [
  { id: '2', name: 'Paul Stevenson', referralCount: 3, influenceScore: 88, pipelineGenerated: 8500000, conversionRate: 67, customerType: 'active_owner' },
  { id: '1', name: 'Dr. Richard Patterson', referralCount: 2, influenceScore: 72, pipelineGenerated: 4200000, conversionRate: 50, customerType: 'repeat_customer' },
  { id: '5', name: 'Jennifer Martinez', referralCount: 2, influenceScore: 65, pipelineGenerated: 3800000, conversionRate: 100, customerType: 'active_owner' },
  { id: '6', name: 'Robert Chen', referralCount: 1, influenceScore: 58, pipelineGenerated: 2100000, conversionRate: 100, customerType: 'repeat_customer' },
  { id: '7', name: 'David Wu', referralCount: 1, influenceScore: 48, pipelineGenerated: 1900000, conversionRate: 0, customerType: 'active_owner' },
];

const referrerDetails: Record<string, {
  referrals: ReferralDetail[];
  influenceBreakdown: InfluenceBreakdown;
}> = {
  '2': {
    referrals: [
      { id: '3', name: 'Marcus Johnson', status: 'Qualified', pipelineValue: 2800000, daysInPipeline: 23 },
      { id: '22', name: 'Angela White', status: 'Negotiating', pipelineValue: 3200000, daysInPipeline: 67 },
      { id: '4', name: 'Emily Chen', status: 'Demo Scheduled', pipelineValue: 2500000, daysInPipeline: 12 },
    ],
    influenceBreakdown: {
      networkSize: 28,
      networkPoints: 35,
      responseTimeHours: 2.3,
      responsePoints: 25,
      closeRate: 67,
      closeRatePoints: 20,
      avgDealSize: 2.8,
      dealSizePoints: 8,
    }
  },
  '1': {
    referrals: [
      { id: '2', name: 'Paul Stevenson', status: 'Qualified', pipelineValue: 2800000, daysInPipeline: 45 },
      { id: '12', name: 'Amy Foster', status: 'Closing', pipelineValue: 1400000, daysInPipeline: 89 },
    ],
    influenceBreakdown: {
      networkSize: 18,
      networkPoints: 28,
      responseTimeHours: 4.1,
      responsePoints: 18,
      closeRate: 50,
      closeRatePoints: 15,
      avgDealSize: 2.1,
      dealSizePoints: 11,
    }
  },
  '5': {
    referrals: [
      { id: '6', name: 'Robert Chen', status: 'Closing', pipelineValue: 2100000, daysInPipeline: 34 },
      { id: '14', name: 'Sandra Lee', status: 'Qualified', pipelineValue: 1700000, daysInPipeline: 18 },
    ],
    influenceBreakdown: {
      networkSize: 22,
      networkPoints: 30,
      responseTimeHours: 1.8,
      responsePoints: 28,
      closeRate: 100,
      closeRatePoints: 30,
      avgDealSize: 1.9,
      dealSizePoints: 7,
    }
  },
  '6': {
    referrals: [
      { id: '14', name: 'Sandra Lee', status: 'Qualified', pipelineValue: 2100000, daysInPipeline: 56 },
    ],
    influenceBreakdown: {
      networkSize: 15,
      networkPoints: 22,
      responseTimeHours: 3.2,
      responsePoints: 20,
      closeRate: 100,
      closeRatePoints: 30,
      avgDealSize: 2.1,
      dealSizePoints: 6,
    }
  },
  '7': {
    referrals: [
      { id: '18', name: 'Kevin Park', status: 'Contacted', pipelineValue: 1900000, daysInPipeline: 8 },
    ],
    influenceBreakdown: {
      networkSize: 12,
      networkPoints: 18,
      responseTimeHours: 5.5,
      responsePoints: 12,
      closeRate: 0,
      closeRatePoints: 0,
      avgDealSize: 1.9,
      dealSizePoints: 18,
    }
  },
};

export const ReferralLeaderboard = () => {
  const [timePeriod, setTimePeriod] = useState<string>("all-time");
  const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Award className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-orange-600" />;
    return <span className="text-xs text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Referral Leaderboard</CardTitle>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Referrals</TableHead>
                <TableHead className="text-center">Influence</TableHead>
                <TableHead className="text-right">Pipeline Value</TableHead>
                <TableHead className="text-center">Conv. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReferrers.map((referrer, index) => (
                <TableRow 
                  key={referrer.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedReferrer(referrer)}
                >
                  <TableCell className="font-medium">
                    {getRankIcon(index)}
                  </TableCell>
                  <TableCell className="font-medium">{referrer.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{referrer.referralCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">{referrer.influenceScore}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${(referrer.pipelineGenerated / 1000000).toFixed(1)}M
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm ${
                      referrer.conversionRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    }`}>
                      {referrer.conversionRate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReferrer} onOpenChange={() => setSelectedReferrer(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReferrer?.name}'s Referral Profile</DialogTitle>
          </DialogHeader>
          
          {selectedReferrer && referrerDetails[selectedReferrer.id] && (
            <div className="space-y-6">
              {/* Influence Score Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Influence Score: {selectedReferrer.influenceScore}</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Network Size</span>
                      <span className="font-medium">
                        {referrerDetails[selectedReferrer.id].influenceBreakdown.networkSize} connections 
                        ({referrerDetails[selectedReferrer.id].influenceBreakdown.networkPoints} pts)
                      </span>
                    </div>
                    <Progress value={referrerDetails[selectedReferrer.id].influenceBreakdown.networkPoints} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Response Time</span>
                      <span className="font-medium">
                        Avg {referrerDetails[selectedReferrer.id].influenceBreakdown.responseTimeHours}h 
                        ({referrerDetails[selectedReferrer.id].influenceBreakdown.responsePoints} pts)
                      </span>
                    </div>
                    <Progress value={referrerDetails[selectedReferrer.id].influenceBreakdown.responsePoints} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Close Rate</span>
                      <span className="font-medium">
                        {referrerDetails[selectedReferrer.id].influenceBreakdown.closeRate}% 
                        ({referrerDetails[selectedReferrer.id].influenceBreakdown.closeRatePoints} pts)
                      </span>
                    </div>
                    <Progress value={referrerDetails[selectedReferrer.id].influenceBreakdown.closeRatePoints} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Avg Deal Size</span>
                      <span className="font-medium">
                        ${referrerDetails[selectedReferrer.id].influenceBreakdown.avgDealSize}M 
                        ({referrerDetails[selectedReferrer.id].influenceBreakdown.dealSizePoints} pts)
                      </span>
                    </div>
                    <Progress value={referrerDetails[selectedReferrer.id].influenceBreakdown.dealSizePoints} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Referrals Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Referrals ({referrerDetails[selectedReferrer.id].referrals.length})
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Pipeline Value</TableHead>
                      <TableHead className="text-right">Days in Pipeline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrerDetails[selectedReferrer.id].referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">{referral.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{referral.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(referral.pipelineValue / 1000000).toFixed(1)}M
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {referral.daysInPipeline} days
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
