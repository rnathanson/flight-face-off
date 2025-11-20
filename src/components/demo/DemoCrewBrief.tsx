import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Plane, Users, MapPin, Cloud, AlertTriangle, Phone, Clock } from 'lucide-react';
import { TripData } from '@/types/trip';

interface DemoCrewBriefProps {
  tripData?: TripData | null;
}

export const DemoCrewBrief = ({ tripData }: DemoCrewBriefProps) => {
  if (!tripData) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Plane className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Trip Data Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Enter a trip in the Trip AI tab to generate a comprehensive mission briefing with real-time data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const missionId = `DIS-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
  const departureTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'EST' });

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Auto-Generated Crew Brief</CardTitle>
              <CardDescription className="mt-2">
                AI-powered comprehensive mission briefing
              </CardDescription>
            </div>
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Mission Brief {missionId}</h2>
                  <p className="text-primary-foreground/80 mt-1">
                    Organ Transport - {tripData.originHospital} → {tripData.destinationHospital}
                  </p>
                </div>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  TIME CRITICAL
                </Badge>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-primary-foreground/70">Route</p>
                  <p className="font-semibold">{tripData.originAirport?.code} → {tripData.destAirport?.code}</p>
                </div>
                <div>
                  <p className="text-primary-foreground/70">Departure</p>
                  <p className="font-semibold">{departureTime} EST</p>
                </div>
                <div>
                  <p className="text-primary-foreground/70">Distance</p>
                  <p className="font-semibold">
                    {((tripData.originAirport?.distance_nm || 0) + (tripData.destAirport?.distance_nm || 0)).toFixed(0)} nm
                  </p>
                </div>
              </div>
            </div>

            {/* Crew Assignments */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Crew Assignments</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-semibold text-primary mb-1">Pilot in Command (PIC)</p>
                    <p className="font-semibold">Capt. Sarah Mitchell</p>
                    <p className="text-sm text-muted-foreground">Type Rating: PC-24, ATP</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Second in Command (SIC)</p>
                    <p className="font-semibold">FO James Rodriguez</p>
                    <p className="text-sm text-muted-foreground">Type Rating: PC-24, Commercial</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Responsibilities:</p>
                  <ul className="space-y-1 ml-4">
                    <li className="text-muted-foreground">• <span className="font-medium text-foreground">Capt. Mitchell:</span> Primary pick-up coordination at Northwell Health</li>
                    <li className="text-muted-foreground">• <span className="font-medium text-foreground">FO Rodriguez:</span> Delivery coordination at Duke University Hospital</li>
                    <li className="text-muted-foreground">• <span className="font-medium text-foreground">Both:</span> Maintain organ temperature monitoring throughout flight</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Route Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Route & Alternates</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Northwell Health Manhasset, NY</p>
                      <p className="text-sm text-muted-foreground">Ground transport 13nm to KHPN (Westchester County)</p>
                    </div>
                  </div>
                  <div className="ml-4 border-l-2 border-primary/30 pl-6 py-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Plane className="w-4 h-4" />
                      Flight: KHPN → KRDU via J79 airway
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Distance: 412nm | Cruise: FL280 | Est. Flight Time: 1h 55m
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">KRDU (Raleigh-Durham International)</p>
                      <p className="text-sm text-muted-foreground">Ground transport 8nm to Duke University Hospital</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Alternate Airports
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-semibold">En Route: KIAD</p>
                      <p className="text-muted-foreground">Washington Dulles (143nm from origin)</p>
                      <p className="text-xs text-muted-foreground mt-1">Reason: Medical facility partnership</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-semibold">Destination: KGSO</p>
                      <p className="text-muted-foreground">Greensboro (47nm from KRDU)</p>
                      <p className="text-xs text-muted-foreground mt-1">Reason: Weather alternate, good facilities</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weather */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Weather Synopsis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-2">KHPN - Departure</p>
                    <div className="bg-success/10 p-3 rounded-lg border border-success/20">
                      <p className="text-sm font-mono">VFR: 5000 BKN, 10SM, Wind 280/12</p>
                      <p className="text-xs text-muted-foreground mt-1">Excellent conditions</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-2">KRDU - Arrival</p>
                    <div className="bg-warning/10 p-3 rounded-lg border border-warning/20">
                      <p className="text-sm font-mono">MVFR: 1200 OVC, 5SM, Wind 180/08</p>
                      <p className="text-xs text-muted-foreground mt-1">ILS approach expected</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm"><span className="font-semibold">SOP Requirement:</span> Per SOP 4.2.3, notify dispatch when ceiling below 1000ft. Current forecast shows improvement to 1800ft by arrival time.</p>
                </div>
              </CardContent>
            </Card>

            {/* Critical Milestones */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Critical Milestones & Check-ins</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-16 text-sm font-semibold text-primary">13:45</div>
                    <p className="text-sm">Depart Northwell Health facility with organ</p>
                  </div>
                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-16 text-sm font-semibold text-primary">14:30</div>
                    <p className="text-sm"><span className="font-semibold">WHEELS UP</span> - Call dispatch confirming departure</p>
                  </div>
                  <div className="flex gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="w-16 text-sm font-semibold text-warning">15:30</div>
                    <p className="text-sm"><span className="font-semibold">Required check-in:</span> Midpoint update to dispatch and Duke surgical team</p>
                  </div>
                  <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-16 text-sm font-semibold text-primary">16:25</div>
                    <p className="text-sm"><span className="font-semibold">WHEELS DOWN</span> - Call Duke transport team for ground coordination</p>
                  </div>
                  <div className="flex gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
                    <div className="w-16 text-sm font-semibold text-success">17:00</div>
                    <p className="text-sm"><span className="font-semibold">MISSION COMPLETE</span> - Organ delivered to Duke surgical team</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card className="border-destructive/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-destructive" />
                  <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-destructive mb-1">Chief Pilot</p>
                    <p className="font-mono">+1 (516) 555-0100</p>
                    <p className="text-muted-foreground">24/7 Operations</p>
                  </div>
                  <div>
                    <p className="font-semibold text-destructive mb-1">Dispatch Center</p>
                    <p className="font-mono">+1 (516) 555-0150</p>
                    <p className="text-muted-foreground">Flight Following</p>
                  </div>
                  <div>
                    <p className="font-semibold text-destructive mb-1">Duke Surgical Team</p>
                    <p className="font-mono">+1 (919) 555-0200</p>
                    <p className="text-muted-foreground">Direct Line</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
