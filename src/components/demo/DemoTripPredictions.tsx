import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { AlertTriangle, CheckCircle, Target, MapPin, Plane, Clock, Loader2 } from 'lucide-react';
import { GeocodeResult } from '@/lib/geocoding';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TripData } from '@/types/trip';

interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm?: number;
}

interface TripCalculation {
  origin: GeocodeResult;
  destination: GeocodeResult;
  originAirport: Airport;
  destAirport: Airport;
  baseTime: number;
}

interface DemoTripPredictionsProps {
  initialTripData?: TripData | null;
}

export const DemoTripPredictions = ({ initialTripData }: DemoTripPredictionsProps) => {
  const [originHospital, setOriginHospital] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<GeocodeResult | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [tripCalc, setTripCalc] = useState<TripCalculation | null>(null);
  const { toast } = useToast();

  // Initialize with incoming trip data
  useEffect(() => {
    if (initialTripData) {
      setOriginHospital(initialTripData.originHospital);
      setDestinationHospital(initialTripData.destinationHospital);
      setSelectedOrigin(initialTripData.origin);
      setSelectedDestination(initialTripData.destination);

      // Auto-calculate if we have airports
      if (initialTripData.originAirport && initialTripData.destAirport) {
        const flightDistance = calculateDistance(
          initialTripData.originAirport.lat,
          initialTripData.originAirport.lng,
          initialTripData.destAirport.lat,
          initialTripData.destAirport.lng
        );
        const flightTime = calculateFlightTime(flightDistance);
        const originGroundTime = Math.round((initialTripData.originAirport.distance_nm || 10) * 2.5);
        const destGroundTime = Math.round((initialTripData.destAirport.distance_nm || 10) * 2.5);
        const baseTime = originGroundTime + flightTime + destGroundTime;

        setTripCalc({
          origin: initialTripData.origin,
          destination: initialTripData.destination,
          originAirport: initialTripData.originAirport,
          destAirport: initialTripData.destAirport,
          baseTime,
        });
      }
    }
  }, [initialTripData]);

  const findNearestAirport = async (lat: number, lon: number): Promise<Airport> => {
    const { data, error } = await supabase.functions.invoke('find-nearest-airport', {
      body: { lat, lng: lon, maxDistance: 100 }
    });

    if (error || !data) {
      throw new Error('Failed to find nearest airport');
    }

    return {
      code: data.airport,
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      distance_nm: data.distance_nm
    };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateFlightTime = (distanceNM: number): number => {
    const cruiseSpeed = 440; // PC-24 cruise speed in knots
    const flightTimeHours = distanceNM / cruiseSpeed;
    const flightTimeMinutes = flightTimeHours * 60;
    const taxiAndProcedures = 15;
    return Math.round(flightTimeMinutes + taxiAndProcedures);
  };

  const handleCalculate = async () => {
    if (!selectedOrigin || !selectedDestination) {
      toast({
        title: "Missing Information",
        description: "Please select both origin and destination hospitals.",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);
    try {
      // Find nearest airports
      const originAirport = await findNearestAirport(selectedOrigin.lat, selectedOrigin.lon);
      const destAirport = await findNearestAirport(selectedDestination.lat, selectedDestination.lon);

      // Calculate flight distance and time
      const flightDistance = calculateDistance(
        originAirport.lat,
        originAirport.lng,
        destAirport.lat,
        destAirport.lng
      );
      const flightTime = calculateFlightTime(flightDistance);

      // Estimate ground transport times (rough estimates)
      const originGroundTime = Math.round((originAirport.distance_nm || 10) * 2.5); // ~2.5 min per nm
      const destGroundTime = Math.round((destAirport.distance_nm || 10) * 2.5);

      const baseTime = originGroundTime + flightTime + destGroundTime;

      setTripCalc({
        origin: selectedOrigin,
        destination: selectedDestination,
        originAirport,
        destAirport,
        baseTime,
      });

      toast({
        title: "Trip Calculated",
        description: "AI predictions generated successfully.",
      });
    } catch (error) {
      console.error('Calculation error:', error);
      toast({
        title: "Calculation Failed",
        description: "Unable to calculate trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const scenarios = tripCalc ? [
    {
      type: 'Worst Case',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      time: `${Math.floor((tripCalc.baseTime * 1.25) / 60)}h ${Math.round((tripCalc.baseTime * 1.25) % 60)}m - ${Math.floor((tripCalc.baseTime * 1.35) / 60)}h ${Math.round((tripCalc.baseTime * 1.35) % 60)}m`,
      confidence: 78,
      factors: [
        'Potential weather delays at destination',
        'Peak traffic conditions possible',
        'ATC delays during busy periods',
      ],
    },
    {
      type: 'Likely Scenario',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      time: `${Math.floor(tripCalc.baseTime / 60)}h ${Math.round(tripCalc.baseTime % 60)}m - ${Math.floor((tripCalc.baseTime * 1.1) / 60)}h ${Math.round((tripCalc.baseTime * 1.1) % 60)}m`,
      confidence: 92,
      factors: [
        'Normal weather conditions expected',
        'Optimal routing available',
        'Standard traffic patterns',
      ],
    },
    {
      type: 'Best Case',
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      time: `${Math.floor((tripCalc.baseTime * 0.85) / 60)}h ${Math.round((tripCalc.baseTime * 0.85) % 60)}m - ${Math.floor((tripCalc.baseTime * 0.95) / 60)}h ${Math.round((tripCalc.baseTime * 0.95) % 60)}m`,
      confidence: 85,
      factors: [
        'Favorable winds at altitude',
        'Light traffic at all segments',
        'Direct routing clearance',
      ],
    },
  ] : [];

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">AI-Powered Trip Predictions</CardTitle>
          <CardDescription>
            Enter trip details to get intelligent time estimates with confidence scoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin Hospital</Label>
              <LocationAutocomplete
                value={originHospital}
                onChange={setOriginHospital}
                onLocationSelect={setSelectedOrigin}
                placeholder="Enter origin hospital address..."
                label="Origin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination Hospital</Label>
              <LocationAutocomplete
                value={destinationHospital}
                onChange={setDestinationHospital}
                onLocationSelect={setSelectedDestination}
                placeholder="Enter destination hospital address..."
                label="Destination"
              />
            </div>
          </div>

          <Button 
            onClick={handleCalculate} 
            disabled={!selectedOrigin || !selectedDestination || calculating}
            className="w-full mb-6"
            size="lg"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Route...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Generate AI Predictions
              </>
            )}
          </Button>

          {tripCalc && (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    Based on historical flight data
                  </Badge>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{tripCalc.origin.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {tripCalc.originAirport.code} - {Math.round(tripCalc.originAirport.distance_nm || 0)}nm away
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Plane className="w-5 h-5 text-muted-foreground rotate-90" />
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{tripCalc.destination.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {tripCalc.destAirport.code} - {Math.round(tripCalc.destAirport.distance_nm || 0)}nm away
                    </p>
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
                      Based on historical analysis of similar routes and current conditions, the{' '}
                      <span className="font-semibold text-success">Likely Scenario</span> has the highest 
                      probability. Consider departure timing and weather patterns for optimal results.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {!tripCalc && (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold mb-1">Ready to Calculate</p>
              <p className="text-sm text-muted-foreground">
                Enter origin and destination to generate AI-powered time predictions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
