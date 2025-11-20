import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Plane, Users, MapPin, Cloud, AlertTriangle, Phone, Clock, Heart } from 'lucide-react';
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
                    {tripData.missionType?.organ_type || 'Organ'} Transport - {tripData.originHospital} → {tripData.destinationHospital}
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
                    <p className="font-semibold">{tripData.crewMembers?.[0]?.full_name || 'Not Assigned'}</p>
                    <p className="text-sm text-muted-foreground">
                      {tripData.crewMembers?.[0]?.is_chief_pilot ? 'Chief Pilot' : tripData.crewMembers?.[0]?.role || 'Pilot'}
                      {tripData.crewMembers?.[0] && ` • ${tripData.crewMembers[0].total_missions} missions`}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Second in Command (SIC)</p>
                    <p className="font-semibold">{tripData.crewMembers?.[1]?.full_name || 'Not Assigned'}</p>
                    <p className="text-sm text-muted-foreground">
                      {tripData.crewMembers?.[1]?.role || 'Co-Pilot'}
                      {tripData.crewMembers?.[1] && ` • ${tripData.crewMembers[1].total_missions} missions`}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Responsibilities:</p>
                  <ul className="space-y-1 ml-4">
                    <li className="text-muted-foreground">• <span className="font-medium text-foreground">{tripData.crewMembers?.[0]?.full_name || 'PIC'}:</span> Primary pick-up coordination at {tripData.originHospital}</li>
                    <li className="text-muted-foreground">• <span className="font-medium text-foreground">{tripData.crewMembers?.[1]?.full_name || 'SIC'}:</span> Delivery coordination at {tripData.destinationHospital}</li>
                    <li className="text-muted-foreground">• <span className="font-medium text-foreground">Both:</span> Maintain organ temperature monitoring throughout flight</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Medical Team */}
            {(tripData.leadDoctor || tripData.surgicalTeam) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Medical Team</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tripData.leadDoctor && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm font-semibold text-primary mb-1">Lead Doctor</p>
                      <p className="font-semibold">{tripData.leadDoctor.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tripData.leadDoctor.specialty || tripData.leadDoctor.role} • {tripData.leadDoctor.total_missions} missions • {(tripData.leadDoctor.success_rate * 100).toFixed(1)}% success rate
                      </p>
                    </div>
                  )}
                  {tripData.surgicalTeam && tripData.surgicalTeam.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Surgical Team:</p>
                        <div className="grid gap-2">
                          {tripData.surgicalTeam.map((member, idx) => (
                            <div key={member.id} className="p-2 bg-muted/50 rounded">
                              <p className="text-sm font-medium">{member.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.specialty || member.role} • {member.total_missions} missions
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

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
                      <p className="font-semibold">{tripData.originHospital}</p>
                      <p className="text-sm text-muted-foreground">
                        Ground transport {tripData.originAirport?.distance_nm?.toFixed(0)}nm to {tripData.originAirport?.code} ({tripData.originAirport?.name})
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 border-l-2 border-primary/30 pl-6 py-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Plane className="w-4 h-4" />
                      Flight: {tripData.originAirport?.code} → {tripData.destAirport?.code}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Est. Flight Time: {Math.floor((tripData.estimatedTimeMinutes || 0) / 60)}h {(tripData.estimatedTimeMinutes || 0) % 60}m
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{tripData.destAirport?.code} ({tripData.destAirport?.name})</p>
                      <p className="text-sm text-muted-foreground">
                        Ground transport {tripData.destAirport?.distance_nm?.toFixed(0)}nm to {tripData.destinationHospital}
                      </p>
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
                    <p className="text-sm font-semibold mb-2">{tripData.originAirport?.code} - Departure</p>
                    <div className="bg-success/10 p-3 rounded-lg border border-success/20">
                      <p className="text-sm font-mono">VFR: 5000 BKN, 10SM, Wind 280/12</p>
                      <p className="text-xs text-muted-foreground mt-1">Excellent conditions (Demo data)</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-2">{tripData.destAirport?.code} - Arrival</p>
                    <div className="bg-warning/10 p-3 rounded-lg border border-warning/20">
                      <p className="text-sm font-mono">MVFR: 1200 OVC, 5SM, Wind 180/08</p>
                      <p className="text-xs text-muted-foreground mt-1">ILS approach expected (Demo data)</p>
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
                  {(() => {
                    const now = new Date();
                    const groundTime1 = 45; // mins
                    const wheelsUp = new Date(now.getTime() + groundTime1 * 60000);
                    const midpoint = new Date(wheelsUp.getTime() + ((tripData.estimatedTimeMinutes || 0) / 2) * 60000);
                    const wheelsDown = new Date(wheelsUp.getTime() + (tripData.estimatedTimeMinutes || 0) * 60000);
                    const groundTime2 = 35; // mins
                    const complete = new Date(wheelsDown.getTime() + groundTime2 * 60000);
                    
                    return (
                      <>
                        <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-16 text-sm font-semibold text-primary">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                          <p className="text-sm">Depart {tripData.originHospital} facility with organ</p>
                        </div>
                        <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-16 text-sm font-semibold text-primary">{wheelsUp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                          <p className="text-sm"><span className="font-semibold">WHEELS UP</span> - Call dispatch confirming departure</p>
                        </div>
                        <div className="flex gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                          <div className="w-16 text-sm font-semibold text-warning">{midpoint.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                          <p className="text-sm"><span className="font-semibold">Required check-in:</span> Midpoint update to dispatch and {tripData.destinationHospital} surgical team</p>
                        </div>
                        <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-16 text-sm font-semibold text-primary">{wheelsDown.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                          <p className="text-sm"><span className="font-semibold">WHEELS DOWN</span> - Call {tripData.destinationHospital} transport team for ground coordination</p>
                        </div>
                        <div className="flex gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
                          <div className="w-16 text-sm font-semibold text-success">{complete.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                          <p className="text-sm"><span className="font-semibold">MISSION COMPLETE</span> - Organ delivered to {tripData.destinationHospital} surgical team</p>
                        </div>
                      </>
                    );
                  })()}
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
                    <p className="font-semibold text-destructive mb-1">{tripData.destinationHospital} Surgical Team</p>
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
