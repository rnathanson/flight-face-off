import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Plane, MapPin, Clock, Calendar, Users, Timer, Zap, Car, Target, Hospital, Navigation } from 'lucide-react';
import { GeocodeResult } from '@/lib/geocoding';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format, addMinutes } from 'date-fns';

interface TripSegment {
  type: 'flight' | 'ground' | 'hospital_stay';
  from: string;
  to: string;
  duration: number;
  distance: number;
  route?: string;
  traffic?: string;
  polyline?: string;
  note?: string;
}

interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

interface TripResult {
  segments: TripSegment[];
  totalTime: number;
  arrivalTime: string;
  advisories: string[];
  pickupAirport: Airport;
  destinationAirport: Airport;
  pickupLocation: GeocodeResult;
  deliveryLocation: GeocodeResult;
  departureTime: string;
}

interface TransplantTimeCalculatorProps {
  onAIPlatformClick?: () => void;
}

export const TransplantTimeCalculator = ({ onAIPlatformClick }: TransplantTimeCalculatorProps) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<GeocodeResult | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [passengers, setPassengers] = useState('4');
  const [calculating, setCalculating] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Failed to fetch Mapbox token:', error);
      }
    };
    fetchMapboxToken();

    const today = new Date();
    setDepartureDate(format(today, 'yyyy-MM-dd'));
    setDepartureTime(format(today, 'HH:mm'));
  }, []);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const loadingStages = [
    { message: 'Analyzing optimal flight route...', icon: Plane },
    { message: 'Analyzing weather patterns...', icon: Zap },
    { message: 'Analyzing traffic patterns...', icon: Car },
    { message: 'Calculating ground transport...', icon: Target },
    { message: 'Finalizing time estimates...', icon: Clock }
  ];

  const calculateTrip = async () => {
    if (!selectedOrigin || !selectedDestination) {
      toast({
        title: "Missing Information",
        description: "Please select both pickup and delivery locations",
        variant: "destructive"
      });
      return;
    }

    if (!departureDate || !departureTime) {
      toast({
        title: "Missing Information",
        description: "Please select departure date and time",
        variant: "destructive"
      });
      return;
    }

    setCalculating(true);
    setLoadingStage(0);

    // Simulate intelligent loading stages
    const stageInterval = setInterval(() => {
      setLoadingStage(prev => {
        if (prev >= 4) {
          clearInterval(stageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    try {
      const departureDateTime = `${departureDate}T${departureTime}:00`;
      
      // Validate the date format before sending
      const testDate = new Date(departureDateTime);
      if (isNaN(testDate.getTime())) {
        throw new Error('Invalid date or time selected');
      }
      
      console.log('Sending calculation request:', {
        departureDateTime,
        pickupLocation: selectedOrigin,
        deliveryLocation: selectedDestination,
        passengers: parseInt(passengers)
      });

      const { data, error } = await supabase.functions.invoke('calculate-accurate-trip', {
        body: {
          pickupLocation: selectedOrigin,
          deliveryLocation: selectedDestination,
          departureDateTime,
          passengers: parseInt(passengers)
        }
      });

      clearInterval(stageInterval);

      if (error) throw error;

      setTripResult({
        ...data,
        pickupLocation: selectedOrigin,
        deliveryLocation: selectedDestination,
        departureTime: departureDateTime
      });

      toast({
        title: "Trip Calculated",
        description: `Total time: ${formatDuration(data.totalTime)}`
      });

      // Initialize map after calculation
      if (mapboxToken && data) {
        setTimeout(() => initializeMap(data), 100);
      }
    } catch (error: any) {
      console.error('Calculation error:', error);
      const errorMessage = error?.message || error?.error || 'Unable to calculate trip time. Please try again.';
      toast({
        title: "Calculation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
      setLoadingStage(0);
    }
  };

  const initializeMap = (result: TripResult) => {
    if (!mapContainer.current || !mapboxToken) return;

    if (map.current) {
      map.current.remove();
    }

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-73.4134, 40.7289],
      zoom: 6
    });

    map.current.on('load', () => {
      updateMap(result);
    });
  };

  const updateMap = (result: TripResult) => {
    if (!map.current) return;

    const KFRG = { lng: -73.4134, lat: 40.7289 };

    // Add markers
    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([KFRG.lng, KFRG.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>KFRG Home Base</strong>'))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat([result.pickupAirport.lng, result.pickupAirport.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>${result.pickupAirport.code}</strong><br/>${result.pickupAirport.name}`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([result.pickupLocation.lon, result.pickupLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>Pickup Hospital</strong>'))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#8b5cf6' })
      .setLngLat([result.destinationAirport.lng, result.destinationAirport.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>${result.destinationAirport.code}</strong><br/>${result.destinationAirport.name}`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#f59e0b' })
      .setLngLat([result.deliveryLocation.lon, result.deliveryLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>Delivery Hospital</strong>'))
      .addTo(map.current);

    // Draw routes
    const flightSegments = result.segments.filter(s => s.type === 'flight');
    flightSegments.forEach((segment, index) => {
      const coords = segment.from.includes('KFRG') 
        ? [[KFRG.lng, KFRG.lat], [result.pickupAirport.lng, result.pickupAirport.lat]]
        : [[result.pickupAirport.lng, result.pickupAirport.lat], [result.destinationAirport.lng, result.destinationAirport.lat]];

      map.current?.addSource(`flight-${index}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords
          }
        }
      });

      map.current?.addLayer({
        id: `flight-${index}`,
        type: 'line',
        source: `flight-${index}`,
        layout: {},
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      });
    });

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([KFRG.lng, KFRG.lat]);
    bounds.extend([result.pickupAirport.lng, result.pickupAirport.lat]);
    bounds.extend([result.pickupLocation.lon, result.pickupLocation.lat]);
    bounds.extend([result.destinationAirport.lng, result.destinationAirport.lat]);
    bounds.extend([result.deliveryLocation.lon, result.deliveryLocation.lat]);

    map.current?.fitBounds(bounds, { padding: 100 });
  };

  const TimelineStep = ({ 
    time, 
    icon: Icon, 
    location, 
    legType, 
    duration, 
    distance,
    isFinal,
    note
  }: { 
    time: Date; 
    icon: any; 
    location: string; 
    legType?: string; 
    duration?: string; 
    distance?: string;
    isFinal?: boolean;
    note?: string;
  }) => (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center min-w-[80px]">
        <div className="text-sm font-semibold text-foreground">
          {format(time, 'hh:mm a')}
        </div>
        <div className="mt-2 p-2 rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {!isFinal && (
          <div className="w-0.5 h-16 bg-border my-2" />
        )}
      </div>
      <div className="flex-1 pb-6">
        <div className="font-semibold text-foreground">{location}</div>
        {note && (
          <div className="text-sm text-muted-foreground italic mt-1">
            {note}
          </div>
        )}
        {legType && (
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>{legType}</span>
            <span>•</span>
            <span>{duration}</span>
            {distance && distance !== '0 mi' && (
              <>
                <span>•</span>
                <span>{distance}</span>
              </>
            )}
          </div>
        )}
        {isFinal && (
          <Badge className="mt-2 bg-primary">
            Final Arrival
          </Badge>
        )}
      </div>
    </div>
  );

  const renderTimeline = () => {
    if (!tripResult) return null;

    const departureDateTime = new Date(tripResult.departureTime);
    const steps = [];
    let currentTime = departureDateTime;

    // Start at KFRG or first airport
    const isStartingFromKFRG = tripResult.segments.some(s => 
      s.type === 'flight' && s.from.includes('KFRG')
    );

    if (isStartingFromKFRG) {
      steps.push({
        time: currentTime,
        icon: Navigation,
        location: 'KFRG (Home Base)',
        legType: undefined,
        duration: undefined,
        distance: undefined
      });
    }

    // Process each segment
    tripResult.segments.forEach((segment, index) => {
      currentTime = addMinutes(currentTime, segment.duration);

      const segmentIcon = 
        segment.type === 'flight' ? Plane :
        segment.type === 'hospital_stay' ? Hospital :
        Car;

      const legTypeLabel = 
        segment.type === 'flight' ? 'Flight' :
        segment.type === 'hospital_stay' ? 'Hospital Stay' :
        'Ground Transport';

      const distanceLabel = segment.distance > 0 
        ? (segment.type === 'flight' ? `${Math.round(segment.distance)} nm` : `${segment.distance} mi`)
        : undefined;

      steps.push({
        time: currentTime,
        icon: segmentIcon,
        location: segment.to,
        legType: legTypeLabel,
        duration: formatDuration(segment.duration),
        distance: distanceLabel,
        isFinal: index === tripResult.segments.length - 1,
        note: segment.note
      });
    });

    return (
      <div className="space-y-2">
        {steps.map((step, index) => (
          <TimelineStep key={index} {...step} />
        ))}
      </div>
    );
  };

  if (!tripResult) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <MapPin className="h-8 w-8 text-primary" />
                Plan Your Medical Transport
              </h2>
              <p className="text-muted-foreground">Calculate door-to-door travel time with our private medical aviation service</p>
            </div>

            <div className="space-y-6">
              <LocationAutocomplete
                value={origin}
                onChange={setOrigin}
                onLocationSelect={setSelectedOrigin}
                placeholder="Enter hospital name or address"
                label="Origin Hospital"
              />

              <LocationAutocomplete
                value={destination}
                onChange={setDestination}
                onLocationSelect={setSelectedDestination}
                placeholder="Enter hospital name or address"
                label="Destination Hospital"
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="departure-date">
                    Departure Date
                  </Label>
                  <Input
                    id="departure-date"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departure-time">
                    Departure Time
                  </Label>
                  <Input
                    id="departure-time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passengers">
                  Passengers: {passengers}
                </Label>
                <Slider
                  id="passengers"
                  min={1}
                  max={6}
                  step={1}
                  value={[parseInt(passengers)]}
                  onValueChange={(value) => setPassengers(value[0].toString())}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={calculateTrip} 
                disabled={calculating || !selectedOrigin || !selectedDestination}
                size="lg"
                className="w-full"
              >
                {calculating ? (
                  <div className="flex items-center gap-3">
                    <Timer className="h-5 w-5 animate-pulse" />
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const StageIcon = loadingStages[loadingStage].icon;
                          return <StageIcon className="h-4 w-4" />;
                        })()}
                        <span>{loadingStages[loadingStage].message}</span>
                      </div>
                      <Progress value={(loadingStage + 1) * 20} className="h-1 w-64" />
                    </div>
                  </div>
                ) : (
                  <>
                    <Plane className="mr-2 h-5 w-5" />
                    Calculate Trip Time
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Hero Results Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Pick Up Hospital
              </div>
              <div className="font-semibold text-foreground">{tripResult.pickupLocation.displayName}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Hospital
              </div>
              <div className="font-semibold text-foreground">{tripResult.deliveryLocation.displayName}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Departure Time
              </div>
              <div className="font-semibold text-foreground">
                {format(new Date(tripResult.departureTime), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-border">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Total Trip Time</div>
              <div className="text-4xl font-bold text-primary">{formatDuration(tripResult.totalTime)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Estimated Arrival at Delivery Hospital</div>
              <div className="text-4xl font-bold text-foreground">
                {format(new Date(tripResult.arrivalTime), 'h:mm a')}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {format(new Date(tripResult.arrivalTime), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          {tripResult.advisories && tripResult.advisories.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-sm font-semibold mb-2">Advisories:</div>
              <div className="space-y-1">
                {tripResult.advisories.map((advisory, index) => (
                  <div key={index} className="text-sm text-muted-foreground">• {advisory}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <Button onClick={() => setTripResult(null)} variant="outline">
              Calculate New Trip
            </Button>
            {onAIPlatformClick && (
              <Button onClick={onAIPlatformClick} variant="default">
                View AI Intelligence Platform
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trip Breakdown - Compact Timeline */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Trip Timeline
            </h3>
            {renderTimeline()}
          </CardContent>
        </Card>

        {/* Map Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Route Visualization
            </h3>
            <div ref={mapContainer} className="w-full h-[500px] rounded-lg" />
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Home Base</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Pickup Airport</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Pickup Hospital</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Destination Airport</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Delivery Hospital</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
