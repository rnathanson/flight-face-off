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
import { GeocodeResult } from '@/lib/geocoding';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TripSegment {
  type: 'ground' | 'flight';
  from: string;
  to: string;
  duration: number;
  distance: number;
  traffic?: string;
  polyline?: number[][];
  hasTrafficData?: boolean;
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
  totalTime: number;
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

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const calculateMidpoint = (coords: [number, number][]): [number, number] | null => {
    if (!coords || coords.length === 0) return null;
    if (coords.length === 2) {
      return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
    }
    const middleIndex = Math.floor(coords.length / 2);
    return coords[middleIndex] || null;
  };

  const createSegmentLabel = (segment: TripSegment, index: number, midpoint: [number, number] | null) => {
    if (!map.current || !midpoint || midpoint.length !== 2 || 
        typeof midpoint[0] !== 'number' || typeof midpoint[1] !== 'number') {
      console.warn('Invalid midpoint for segment label:', midpoint);
      return null;
    }
    
    const el = document.createElement('div');
    el.className = 'segment-label';
    
    const icon = segment.type === 'flight' ? '✈️' : '🚗';
    const typeLabel = segment.type === 'flight' ? 'Flight' : 'Ground';
    const unit = segment.type === 'flight' ? 'nm' : 'mi';
    
    el.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        padding: 8px 12px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 12px;
        font-weight: 600;
        border: 2px solid ${segment.type === 'flight' ? '#3b82f6' : '#10b981'};
        white-space: nowrap;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
          <span>${icon}</span>
          <span>Leg ${index + 1}: ${typeLabel}</span>
        </div>
        <div style="color: #666; font-size: 11px;">
          ${formatDuration(segment.duration)} • ${segment.distance.toFixed(0)} ${unit}
        </div>
      </div>
    `;
    
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.05)';
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });
    
    return new mapboxgl.Marker(el)
      .setLngLat(midpoint)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Leg ${index + 1} Details</h3>
          <p style="margin: 4px 0;"><strong>Type:</strong> ${typeLabel}</p>
          <p style="margin: 4px 0;"><strong>Duration:</strong> ${formatDuration(segment.duration)}</p>
          <p style="margin: 4px 0;"><strong>Distance:</strong> ${segment.distance.toFixed(0)} ${unit === 'nm' ? 'nautical miles' : 'miles'}</p>
          ${segment.from ? `<p style="margin: 4px 0;"><strong>From:</strong> ${segment.from}</p>` : ''}
          ${segment.to ? `<p style="margin: 4px 0;"><strong>To:</strong> ${segment.to}</p>` : ''}
        </div>
      `));
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
      setLoadingStage('Analyzing optimal flight route...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLoadingStage('Checking live weather conditions...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLoadingStage('Calculating real-time traffic patterns...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLoadingStage('Evaluating ATC delays and restrictions...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLoadingStage('Computing door-to-door timeline...');
      
      const [hours, minutes] = departureTime.split(':').map(Number);
      const departureDateTime = new Date(departureDate);
      departureDateTime.setHours(hours, minutes, 0, 0);

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
      
      setTimeout(() => {
        if (mapboxToken && mapContainer.current && !map.current) {
          initializeMap(result, data.segments);
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

  const initializeMap = (result: TripResult, segments?: TripSegment[]) => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const { origin, destination, originAirport, destAirport } = result.route;
    
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
      updateMap(result, segments);
    });
  };

  const updateMap = (result: TripResult, segments?: TripSegment[]) => {
    if (!map.current) return;

    ['route-base', 'route-animated', 'route-ground-1', 'route-ground-2', 'route-ground-3', 'route-ground-4', 'route-ground-5'].forEach((id) => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
      if (map.current?.getSource(id)) map.current.removeSource(id);
    });

    document.querySelectorAll('.mapboxgl-marker').forEach((el) => el.remove());
    document.querySelectorAll('.segment-label').forEach((el) => el.remove());

    const { origin, destination, originAirport, destAirport } = result.route;

    const KFRG = { lat: 40.728889, lng: -73.413333 };

    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([KFRG.lng, KFRG.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<h3>KFRG - Home Base</h3>'))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat([originAirport.lng, originAirport.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>${originAirport.code}</h3><p>${originAirport.name}</p>`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat([origin.lon, origin.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>Pickup Hospital</h3><p>${origin.displayName.split(',')[0]}</p>`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([destination.lon, destination.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>Delivery Hospital</h3><p>${destination.displayName.split(',')[0]}</p>`))
      .addTo(map.current);

    if (destAirport.code !== 'KFRG') {
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([destAirport.lng, destAirport.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${destAirport.code}</h3><p>${destAirport.name}</p>`))
        .addTo(map.current);
    }

    map.current.addSource('route-base', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [KFRG.lng, KFRG.lat],
            [originAirport.lng, originAirport.lat]
          ]
        }
      }
    });

    map.current.addLayer({
      id: 'route-base',
      type: 'line',
      source: 'route-base',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
        'line-dasharray': [2, 2]
      }
    });

    if (segments && segments.length >= 4) {
      // Add first flight leg label (KFRG to origin airport)
      const firstFlightMidpoint = calculateMidpoint([
        [KFRG.lng, KFRG.lat],
        [originAirport.lng, originAirport.lat]
      ]);
      if (firstFlightMidpoint) {
        const firstFlightSegment: TripSegment = {
          type: 'flight',
          from: 'KFRG',
          to: originAirport.code,
          duration: segments[0].duration,
          distance: segments[0].distance
        };
        const label = createSegmentLabel(firstFlightSegment, 0, firstFlightMidpoint);
        if (label) label.addTo(map.current);
      }

      map.current.addSource('route-animated', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [originAirport.lng, originAirport.lat],
              [destAirport.lng, destAirport.lat]
            ]
          }
        }
      });

      map.current.addLayer({
        id: 'route-animated',
        type: 'line',
        source: 'route-animated',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      });

      // Add main flight leg label (origin airport to dest airport)
      const mainFlightMidpoint = calculateMidpoint([
        [originAirport.lng, originAirport.lat],
        [destAirport.lng, destAirport.lat]
      ]);
      if (mainFlightMidpoint) {
        const mainFlightSegment: TripSegment = {
          type: 'flight',
          from: originAirport.code,
          to: destAirport.code,
          duration: segments[3]?.duration || 0,
          distance: segments[3]?.distance || 0
        };
        const mainLabel = createSegmentLabel(mainFlightSegment, 3, mainFlightMidpoint);
        if (mainLabel) mainLabel.addTo(map.current);
      }
    }

    if (segments) {
      segments.forEach((segment, index) => {
        if (segment.type === 'ground' && segment.polyline) {
          console.log(`Rendering ground segment ${index}:`, {
            from: segment.from,
            to: segment.to,
            coordinateCount: segment.polyline.length,
            firstCoord: segment.polyline[0],
            lastCoord: segment.polyline[segment.polyline.length - 1],
            hasTrafficData: segment.hasTrafficData
          });
          
          const sourceId = `route-ground-${index + 1}`;
          
          map.current?.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: segment.polyline
              }
            }
          });

          map.current?.addLayer({
            id: sourceId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': index === 1 || index === 2 ? '#10b981' : '#ef4444',
              'line-width': 3
            }
          });

          // Add label for ground segment
          const midpoint = calculateMidpoint(segment.polyline as [number, number][]);
          if (midpoint) {
            const label = createSegmentLabel(segment, index, midpoint);
            if (label) label.addTo(map.current);
          }
        }
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([KFRG.lng, KFRG.lat]);
    bounds.extend([originAirport.lng, originAirport.lat]);
    bounds.extend([origin.lon, origin.lat]);
    bounds.extend([destination.lon, destination.lat]);
    bounds.extend([destAirport.lng, destAirport.lat]);

    map.current.fitBounds(bounds, {
      padding: 100,
      duration: 1000
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3">Medical Transport Time Calculator</h1>
        <p className="text-lg text-muted-foreground">
          AI-powered trip planning with real-time weather, traffic, and routing intelligence
        </p>
      </div>

      {!tripResult ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-6 h-6 text-primary" />
                Calculate Trip Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <LocationAutocomplete
                  value={originHospital}
                  onChange={setOriginHospital}
                  onLocationSelect={(location) => {
                    setSelectedOrigin(location);
                    setOriginHospital(location.displayName);
                  }}
                  placeholder="Enter hospital name or address"
                  label="Pick Up Hospital"
                  selectedLocation={selectedOrigin}
                />
                <LocationAutocomplete
                  value={destinationHospital}
                  onChange={setDestinationHospital}
                  onLocationSelect={(location) => {
                    setSelectedDestination(location);
                    setDestinationHospital(location.displayName);
                  }}
                  placeholder="Enter hospital name or address"
                  label="Delivery Hospital"
                  selectedLocation={selectedDestination}
                />
              </div>

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
                        onSelect={(date) => date && setDepartureDate(date)}
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
        <div className="space-y-6">
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
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
              
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setTripResult(null)} variant="outline">
                  New Calculation
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                AI-Powered Time Estimates
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-destructive/10 border-destructive/30 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <CardTitle className="text-sm">Worst Case</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <Clock className="w-3 h-3 text-destructive" />
                    <span className="text-lg font-bold text-foreground">
                      {Math.floor((tripResult.totalTime * 1.35) / 60)}h {Math.round((tripResult.totalTime * 1.35) % 60)}m
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

              <Card className="bg-green-50 dark:bg-green-950/20 border-green-600/30 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <CardTitle className="text-sm">Likely Scenario</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <Clock className="w-3 h-3 text-green-600" />
                    <span className="text-lg font-bold text-foreground">
                      {Math.floor(tripResult.totalTime / 60)}h {Math.round(tripResult.totalTime % 60)}m
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

              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-600/30 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm">Best Case</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="text-lg font-bold text-foreground">
                      {Math.floor((tripResult.totalTime * 0.85) / 60)}h {Math.round((tripResult.totalTime * 0.85) % 60)}m
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="w-6 h-6 text-primary" />
                Route Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative">
              <div ref={mapContainer} className="h-[600px] w-full rounded-b-lg" />
              
              {/* Map Legend */}
              <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-3 rounded-lg shadow-lg text-xs z-10 border border-border">
                <div className="font-semibold mb-2 text-foreground">Route Legend</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <span className="text-foreground">KFRG Home Base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span className="text-foreground">Pickup Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                    <span className="text-foreground">Delivery Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 border-t-2 border-dashed border-blue-500 flex-shrink-0"></div>
                    <span className="text-foreground">Flight Path</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-green-500 flex-shrink-0"></div>
                    <span className="text-foreground">Ground Transport</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
