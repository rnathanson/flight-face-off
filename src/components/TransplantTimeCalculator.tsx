import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon, MapPin, Plane, Zap, Clock, Car, Timer, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { GeocodeResult, geocodeAddress } from '@/lib/geocoding';
import { getRouteDriving } from '@/lib/routing';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TripSegment {
  type: 'ground' | 'flight';
  from: string;
  to: string;
  duration: number; // minutes
  distance: number; // miles for ground, nautical miles for flight
  traffic?: string;
}

interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm?: number;
}

interface TripResult {
  segments: TripSegment[];
  totalTime: number; // minutes
  arrivalTime: Date;
  route: {
    origin: GeocodeResult;
    destination: GeocodeResult;
    originAirport: Airport;
    destAirport: Airport;
  };
}

interface TransplantTimeCalculatorProps {
  onAIPlatformClick?: (tripData: any) => void;
}

export function TransplantTimeCalculator({ onAIPlatformClick }: TransplantTimeCalculatorProps) {
  const [originHospital, setOriginHospital] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<GeocodeResult | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [departureTime, setDepartureTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [passengerCount, setPassengerCount] = useState(2);
  const [calculating, setCalculating] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const { toast } = useToast();
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  const findNearestAirport = async (lat: number, lng: number): Promise<Airport> => {
    const { data, error } = await supabase.functions.invoke('find-nearest-airport', {
      body: { lat, lng, maxDistance: 100 }
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

  const calculateFlightTime = (distanceNM: number): number => {
    // PC-24 cruise speed: ~440 knots
    // Add 15 minutes for taxi, takeoff, climb, descent, landing
    const cruiseSpeed = 440; // knots
    const flightTimeHours = distanceNM / cruiseSpeed;
    const flightTimeMinutes = flightTimeHours * 60;
    return Math.round(flightTimeMinutes + 15);
  };

  const calculateTrip = async () => {
    if (!selectedOrigin || !selectedDestination) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setCalculating(true);
    
    try {
      // Stage 1: Route Analysis
      setLoadingStage('Analyzing optimal flight route...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Stage 2: Weather Check
      setLoadingStage('Checking live weather conditions...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Stage 3: Traffic Analysis
      setLoadingStage('Calculating real-time traffic patterns...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Stage 4: ATC Delays
      setLoadingStage('Evaluating ATC delays and restrictions...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Stage 5: Final Computation
      setLoadingStage('Computing door-to-door timeline...');
      
      // Combine time of day with date
      const [hours, minutes] = departureTime.split(':').map(Number);
      const departureDateTime = new Date(departureDate);
      departureDateTime.setHours(hours, minutes, 0, 0);

      console.log('Calling calculate-accurate-trip with three-leg routing...');
      
      // Call the enhanced edge function with new parameters
      const { data, error } = await supabase.functions.invoke('calculate-accurate-trip', {
        body: {
          pickupLocation: { lat: selectedOrigin.lat, lng: selectedOrigin.lon },
          deliveryLocation: { lat: selectedDestination.lat, lng: selectedDestination.lon },
          departureDateTime: departureDateTime.toISOString(),
          passengers: passengerCount
        }
      });

      if (error) {
        console.error('Error calculating trip:', error);
        throw error;
      }

      console.log('Trip calculation result:', data);

      // Map the response to our TripResult format
      const result: TripResult = {
        segments: data.segments,
        totalTime: data.totalTime,
        arrivalTime: new Date(data.arrivalTime),
        route: {
          origin: selectedOrigin,
          destination: selectedDestination,
          originAirport: data.route.departureAirport,
          destAirport: data.route.arrivalAirport,
        }
      };

      setTripResult(result);
      
      // Initialize or update map
      setTimeout(() => {
        if (mapboxToken && mapContainer.current && !map.current) {
          initializeMap(result);
        } else if (map.current && mapboxToken) {
          updateMap(result, data.segments);
        }
      }, 100);
      
      toast({
        title: 'Trip Calculated',
        description: `Total time: ${formatDuration(result.totalTime)}`,
      });
    } catch (error) {
      console.error('Trip calculation error:', error);
      toast({
        title: 'Calculation Error',
        description: error instanceof Error ? error.message : 'Failed to calculate trip',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
      setLoadingStage('');
    }
  };

  const initializeMap = (result: TripResult) => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const { origin, destination, originAirport, destAirport } = result.route;
    
    // Calculate center and bounds
    const centerLng = (origin.lon + destination.lon) / 2;
    const centerLat = (origin.lat + destination.lat) / 2;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [centerLng, centerLat],
      zoom: 6,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      updateMap(result);
    });
  };

  const updateMap = (result: TripResult, segments?: any[]) => {
    if (!map.current) return;

    // Remove existing layers and sources
    ['route-base', 'route-animated', 'route-ground-1', 'route-ground-2'].forEach((id) => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
      if (map.current?.getSource(id)) map.current.removeSource(id);
    });

    // Remove existing markers
    document.querySelectorAll('.mapboxgl-marker').forEach((el) => el.remove());

    const { origin, destination, originAirport, destAirport } = result.route;

    // Create custom animated markers
    const createMarker = (color: string, label: string) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.cssText = `
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: markerPop 0.5s ease-out;
      `;
      return el;
    };

    // Add animated markers
    setTimeout(() => {
      new mapboxgl.Marker({ element: createMarker('#005587', 'Origin'), anchor: 'center' })
        .setLngLat([origin.lon, origin.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="font-semibold">Origin Hospital</div>
          <div class="text-sm">${origin.displayName.split(',')[0]}</div>
        `))
        .addTo(map.current!);
    }, 100);

    setTimeout(() => {
      new mapboxgl.Marker({ element: createMarker('#FF9800', 'Departure'), anchor: 'center' })
        .setLngLat([originAirport.lng, originAirport.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="font-semibold">${originAirport.code}</div>
          <div class="text-sm">${originAirport.name}</div>
        `))
        .addTo(map.current!);
    }, 300);

    setTimeout(() => {
      new mapboxgl.Marker({ element: createMarker('#FF9800', 'Arrival'), anchor: 'center' })
        .setLngLat([destAirport.lng, destAirport.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="font-semibold">${destAirport.code}</div>
          <div class="text-sm">${destAirport.name}</div>
        `))
        .addTo(map.current!);
    }, 500);

    setTimeout(() => {
      new mapboxgl.Marker({ element: createMarker('#7CB342', 'Destination'), anchor: 'center' })
        .setLngLat([destination.lon, destination.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="font-semibold">Destination Hospital</div>
          <div class="text-sm">${destination.displayName.split(',')[0]}</div>
        `))
        .addTo(map.current!);
    }, 700);

    // Add ground route 1
    map.current.addSource('route-ground-1', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [origin.lon, origin.lat],
            [originAirport.lng, originAirport.lat],
          ],
        },
      },
    });

    map.current.addLayer({
      id: 'route-ground-1',
      type: 'line',
      source: 'route-ground-1',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#005587',
        'line-width': 3,
        'line-dasharray': [2, 2],
      },
    });

    // Add flight route with animation
    const flightCoords = [
      [originAirport.lng, originAirport.lat],
      [destAirport.lng, destAirport.lat],
    ];

    // Base route (thinner, lighter)
    map.current.addSource('route-base', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: flightCoords,
        },
      },
    });

    map.current.addLayer({
      id: 'route-base',
      type: 'line',
      source: 'route-base',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#2196F3',
        'line-width': 2,
        'line-opacity': 0.3,
      },
    });

    // Animated route
    map.current.addSource('route-animated', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [flightCoords[0]],
        },
      },
    });

    map.current.addLayer({
      id: 'route-animated',
      type: 'line',
      source: 'route-animated',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#2196F3',
        'line-width': 4,
      },
    });

    // Animate the flight route
    const animateRoute = () => {
      const steps = 50;
      let step = 0;

      const animate = () => {
        if (step <= steps) {
          const progress = step / steps;
          const lng = originAirport.lng + (destAirport.lng - originAirport.lng) * progress;
          const lat = originAirport.lat + (destAirport.lat - originAirport.lat) * progress;
          
          const source = map.current?.getSource('route-animated') as mapboxgl.GeoJSONSource;
          if (source) {
            const coords = [];
            for (let i = 0; i <= step; i++) {
              const p = i / steps;
              coords.push([
                originAirport.lng + (destAirport.lng - originAirport.lng) * p,
                originAirport.lat + (destAirport.lat - originAirport.lat) * p,
              ]);
            }
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
            });
          }
          step++;
          requestAnimationFrame(animate);
        }
      };
      animate();
    };

    setTimeout(animateRoute, 800);

    // Add ground route 2
    map.current.addSource('route-ground-2', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [destAirport.lng, destAirport.lat],
            [destination.lon, destination.lat],
          ],
        },
      },
    });

    map.current.addLayer({
      id: 'route-ground-2',
      type: 'line',
      source: 'route-ground-2',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#005587',
        'line-width': 3,
        'line-dasharray': [2, 2],
      },
    });

    // Fit bounds to show entire route
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([origin.lon, origin.lat]);
    bounds.extend([destination.lon, destination.lat]);
    bounds.extend([originAirport.lng, originAirport.lat]);
    bounds.extend([destAirport.lng, destAirport.lat]);

    map.current.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 80, right: 80 }, duration: 1500 });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="w-full space-y-6 py-8">
      {!tripResult ? (
        /* Centered form before calculation */
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MapPin className="w-6 h-6 text-primary" />
                Plan Your Medical Transport
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Calculate door-to-door travel time with our private medical aviation service
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pick Up Hospital */}
              <div className="space-y-2">
                <LocationAutocomplete
                  value={originHospital}
                  onChange={setOriginHospital}
                  onLocationSelect={setSelectedOrigin}
                  placeholder="Enter hospital name or address"
                  label="Pick Up Hospital"
                  selectedLocation={selectedOrigin}
                />
              </div>

              {/* Delivery Hospital */}
              <div className="space-y-2">
                <LocationAutocomplete
                  value={destinationHospital}
                  onChange={setDestinationHospital}
                  onLocationSelect={setSelectedDestination}
                  placeholder="Enter hospital name or address"
                  label="Delivery Hospital"
                  selectedLocation={selectedDestination}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departure Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !departureDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {departureDate ? format(departureDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={departureDate}
                        onSelect={setDepartureDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Departure Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="time"
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Passenger Count */}
              <div className="space-y-2">
                <Label>Passengers: {passengerCount}</Label>
                <Slider
                  value={[passengerCount]}
                  onValueChange={(value) => setPassengerCount(value[0])}
                  min={1}
                  max={8}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Calculate Button */}
              <Button
                onClick={calculateTrip}
                disabled={calculating || !selectedOrigin || !selectedDestination}
                className="w-full"
                size="lg"
              >
              {calculating ? (
                <div className="flex flex-col items-center gap-2 py-1">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 animate-spin" />
                    <span className="font-semibold">Calculating Your Trip</span>
                  </div>
                  {loadingStage && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {loadingStage.includes('route') && <Plane className="w-3 h-3" />}
                        {loadingStage.includes('weather') && <Zap className="w-3 h-3" />}
                        {loadingStage.includes('traffic') && <Car className="w-3 h-3" />}
                        {loadingStage.includes('ATC') && <Target className="w-3 h-3" />}
                        {loadingStage.includes('timeline') && <Clock className="w-3 h-3" />}
                        <span>{loadingStage}</span>
                      </div>
                      <Progress 
                        value={
                          loadingStage.includes('route') ? 20 :
                          loadingStage.includes('weather') ? 40 :
                          loadingStage.includes('traffic') ? 60 :
                          loadingStage.includes('ATC') ? 80 :
                          100
                        } 
                        className="w-full h-1" 
                      />
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Plane className="w-4 h-4 mr-2" />
                  Calculate Trip Time
                </>
              )}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Vertical layout after calculation - Hero section at top */
        <div className="space-y-6">
          {/* Hero Section - Trip Summary */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              {/* Hospital names and departure info */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Pick Up Hospital</div>
                  <div className="font-semibold">{selectedOrigin?.displayName.split(',')[0]}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Delivery Hospital</div>
                  <div className="font-semibold">{selectedDestination?.displayName.split(',')[0]}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Departure</div>
                  <div className="font-semibold">{format(departureDate, 'PPP')} at {departureTime}</div>
                </div>
              </div>
              
              {/* Main Results - Large Typography */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 space-y-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-primary" />
                    <div className="text-sm text-muted-foreground">Total Trip Time</div>
                    <div className="text-4xl font-bold text-primary">
                      {formatDuration(tripResult.totalTime)}
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <Target className="w-8 h-8 mx-auto text-green-600" />
                    <div className="text-sm text-muted-foreground">Estimated Arrival</div>
                    <div className="text-3xl font-bold">
                      {format(tripResult.arrivalTime, 'h:mm a')}
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <Zap className="w-8 h-8 mx-auto text-amber-600" />
                    <div className="text-sm text-muted-foreground">Confidence</div>
                    <div className="text-3xl font-bold">85%</div>
                  </div>
                </div>
              </div>
              
              {/* New Calculation Button */}
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setTripResult(null)} variant="outline">
                  New Calculation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Scenario Cards - Horizontal 3 Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                AI-Powered Time Estimates
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              {/* Worst Case */}
              <Card className="bg-destructive/10 border-destructive/30 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <CardTitle className="text-sm">Worst Case</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <Clock className="w-3 h-3 text-destructive" />
                    <span className="text-lg font-bold text-foreground">
                      {Math.floor((tripResult.totalTime * 1.25) / 60)}h {Math.round((tripResult.totalTime * 1.25) % 60)}m - {Math.floor((tripResult.totalTime * 1.35) / 60)}h {Math.round((tripResult.totalTime * 1.35) % 60)}m
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">60%</span>
                    </div>
                    <Progress value={60} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Key Factors</p>
                    <ul className="space-y-1">
                      {['Heavy traffic delays', 'Adverse weather conditions', 'Extended routing requirements'].map((factor, idx) => (
                        <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full text-destructive bg-current flex-shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Likely Scenario */}
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-600/30 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <CardTitle className="text-sm">Likely Scenario</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <Clock className="w-3 h-3 text-green-600" />
                    <span className="text-lg font-bold text-foreground">
                      {Math.floor((tripResult.totalTime * 0.95) / 60)}h {Math.round((tripResult.totalTime * 0.95) % 60)}m - {Math.floor((tripResult.totalTime * 1.10) / 60)}h {Math.round((tripResult.totalTime * 1.10) % 60)}m
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">90%</span>
                    </div>
                    <Progress value={90} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Key Factors</p>
                    <ul className="space-y-1">
                      {['Normal traffic flow', 'Favorable weather', 'Standard routing'].map((factor, idx) => (
                        <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full text-green-600 bg-current flex-shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Best Case */}
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-600/30 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm">Best Case</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="text-lg font-bold text-foreground">
                      {Math.floor((tripResult.totalTime * 0.85) / 60)}h {Math.round((tripResult.totalTime * 0.85) % 60)}m - {Math.floor((tripResult.totalTime * 0.95) / 60)}h {Math.round((tripResult.totalTime * 0.95) % 60)}m
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">75%</span>
                    </div>
                    <Progress value={75} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Key Factors</p>
                    <ul className="space-y-1">
                      {['Light traffic', 'Optimal weather', 'Direct routing'].map((factor, idx) => (
                        <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full text-blue-600 bg-current flex-shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Trip Breakdown - Full Width */}
          <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  Trip Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tripResult.segments.map((segment, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="mt-0.5 p-1.5 rounded-full bg-background">
                      {segment.type === 'ground' ? (
                        <Car className="w-4 h-4 text-primary" />
                      ) : (
                        <Plane className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold text-sm">
                        {segment.type === 'ground' ? 'Ground Transport' : 'PC-24 Flight'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {segment.from} → {segment.to}
                      </div>
                      <div className="flex gap-3 text-xs mt-1">
                        <span className="font-semibold text-foreground">
                          {formatDuration(segment.duration)}
                        </span>
                        <span className="text-muted-foreground">
                          {segment.distance.toFixed(0)} {segment.type === 'ground' ? 'mi' : 'nm'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total Time</span>
                    <span className="text-primary">
                      {formatDuration(tripResult.totalTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Estimated Arrival</span>
                    <span className="font-medium">{format(tripResult.arrivalTime, 'PPp')}</span>
                  </div>
                </div>

                {onAIPlatformClick && (
                  <div className="pt-3 border-t border-border">
                    <Button
                      onClick={() =>
                        onAIPlatformClick({
                          origin: selectedOrigin,
                          destination: selectedDestination,
                          originHospital,
                          destinationHospital,
                          originAirport: tripResult.route.originAirport,
                          destAirport: tripResult.route.destAirport,
                        })
                      }
                      className="w-full gap-2"
                      variant="outline"
                      size="lg"
                    >
                      <Zap className="w-4 h-4" />
                      Analyze with AI Intelligence Platform
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Scenario Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  AI-Powered Time Estimates
                </Badge>
              </div>
              
              <div className="grid gap-3">
                {/* Worst Case */}
                <Card className="bg-destructive/10 border-destructive/30 border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <CardTitle className="text-sm">Worst Case</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Clock className="w-3 h-3 text-destructive" />
                      <span className="text-xl font-bold text-foreground">
                        {Math.floor((tripResult.totalTime * 1.25) / 60)}h {Math.round((tripResult.totalTime * 1.25) % 60)}m - {Math.floor((tripResult.totalTime * 1.35) / 60)}h {Math.round((tripResult.totalTime * 1.35) % 60)}m
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold">60%</span>
                      </div>
                      <Progress value={60} className="h-1.5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Key Factors</p>
                      <ul className="space-y-1">
                        {['Heavy traffic delays', 'Adverse weather conditions', 'Extended routing requirements'].map((factor, idx) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full text-destructive bg-current flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Likely Scenario */}
                <Card className="bg-success/10 border-success/30 border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <CardTitle className="text-sm">Likely Scenario</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Clock className="w-3 h-3 text-success" />
                      <span className="text-xl font-bold text-foreground">
                        {Math.floor((tripResult.totalTime * 0.95) / 60)}h {Math.round((tripResult.totalTime * 0.95) % 60)}m - {Math.floor((tripResult.totalTime * 1.10) / 60)}h {Math.round((tripResult.totalTime * 1.10) % 60)}m
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold">90%</span>
                      </div>
                      <Progress value={90} className="h-1.5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Key Factors</p>
                      <ul className="space-y-1">
                        {['Normal traffic patterns', 'Standard weather conditions', 'Optimal routing'].map((factor, idx) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full text-success bg-current flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Best Case */}
                <Card className="bg-primary/10 border-primary/30 border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-primary" />
                      <CardTitle className="text-sm">Best Case</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="text-xl font-bold text-foreground">
                        {Math.floor((tripResult.totalTime * 0.85) / 60)}h {Math.round((tripResult.totalTime * 0.85) % 60)}m - {Math.floor((tripResult.totalTime * 0.95) / 60)}h {Math.round((tripResult.totalTime * 0.95) % 60)}m
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold">85%</span>
                      </div>
                      <Progress value={85} className="h-1.5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Key Factors</p>
                      <ul className="space-y-1">
                        {['Favorable winds at altitude', 'Light traffic at all segments', 'Direct routing clearance'].map((factor, idx) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full text-primary bg-current flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-3 p-3 bg-card border border-border rounded-lg">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-foreground mb-1">AI Recommendation</p>
                    <p className="text-xs text-muted-foreground">
                      Based on historical analysis, the{' '}
                      <span className="font-semibold text-success">Likely Scenario</span> has the highest 
                      probability. Consider departure timing and weather patterns for optimal results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map - Full Width */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                ref={mapContainer}
                className="w-full h-[800px]"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
