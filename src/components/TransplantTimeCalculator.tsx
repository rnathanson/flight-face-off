import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon, Clock, MapPin, Plane, Car, Timer } from 'lucide-react';
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

export function TransplantTimeCalculator() {
  const [originHospital, setOriginHospital] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<GeocodeResult | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>();
  const [departureTime, setDepartureTime] = useState('12:00');
  const [passengerCount, setPassengerCount] = useState(2);
  const [calculating, setCalculating] = useState(false);
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
    if (!selectedOrigin || !selectedDestination || !departureDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setCalculating(true);
    try {
      // Find nearest airports
      const originAirport = await findNearestAirport(selectedOrigin.lat, selectedOrigin.lon);
      const destAirport = await findNearestAirport(selectedDestination.lat, selectedDestination.lon);

      console.log('Origin Airport:', originAirport);
      console.log('Destination Airport:', destAirport);

      // Calculate ground segments
      const groundSegment1 = await getRouteDriving(selectedOrigin, {
        lat: originAirport.lat,
        lon: originAirport.lng,
        displayName: originAirport.name,
        placeId: 0,
      });

      const groundSegment2 = await getRouteDriving(
        {
          lat: destAirport.lat,
          lon: destAirport.lng,
          displayName: destAirport.name,
          placeId: 0,
        },
        selectedDestination
      );

      // Calculate flight time
      const flightDistanceNM = Math.sqrt(
        Math.pow((destAirport.lat - originAirport.lat) * 60, 2) +
        Math.pow((destAirport.lng - originAirport.lng) * 60 * Math.cos(originAirport.lat * Math.PI / 180), 2)
      );
      const flightTime = calculateFlightTime(flightDistanceNM);

      // Combine time of day with date
      const [hours, minutes] = departureTime.split(':').map(Number);
      const departureDateTime = new Date(departureDate);
      departureDateTime.setHours(hours, minutes, 0, 0);

      // Build segments
      const segments: TripSegment[] = [
        {
          type: 'ground',
          from: selectedOrigin.displayName.split(',')[0],
          to: originAirport.code,
          duration: groundSegment1.durationMinutes,
          distance: groundSegment1.distanceMiles,
          traffic: 'Normal',
        },
        {
          type: 'flight',
          from: originAirport.code,
          to: destAirport.code,
          duration: flightTime,
          distance: flightDistanceNM,
        },
        {
          type: 'ground',
          from: destAirport.code,
          to: selectedDestination.displayName.split(',')[0],
          duration: groundSegment2.durationMinutes,
          distance: groundSegment2.distanceMiles,
          traffic: 'Normal',
        },
      ];

      const totalTime = segments.reduce((sum, seg) => sum + seg.duration, 0);
      const arrivalTime = new Date(departureDateTime.getTime() + totalTime * 60000);

      const result: TripResult = {
        segments,
        totalTime,
        arrivalTime,
        route: {
          origin: selectedOrigin,
          destination: selectedDestination,
          originAirport,
          destAirport,
        },
      };

      setTripResult(result);
      
      // Initialize or update map
      setTimeout(() => {
        if (mapboxToken && mapContainer.current && !map.current) {
          initializeMap(result);
        } else if (map.current && mapboxToken) {
          updateMap(result);
        }
      }, 100);
    } catch (error) {
      console.error('Trip calculation error:', error);
      toast({
        title: 'Calculation Error',
        description: error instanceof Error ? error.message : 'Failed to calculate trip',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
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

  const updateMap = (result: TripResult) => {
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
      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* Input Panel */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Origin Hospital */}
            <div className="space-y-2">
              <LocationAutocomplete
                value={originHospital}
                onChange={setOriginHospital}
                onLocationSelect={setSelectedOrigin}
                placeholder="Enter hospital name or address"
                label="Origin Hospital"
                selectedLocation={selectedOrigin}
              />
            </div>

            {/* Destination Hospital */}
            <div className="space-y-2">
              <LocationAutocomplete
                value={destinationHospital}
                onChange={setDestinationHospital}
                onLocationSelect={setSelectedDestination}
                placeholder="Enter hospital name or address"
                label="Destination Hospital"
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
              disabled={calculating || !selectedOrigin || !selectedDestination || !departureDate}
              className="w-full"
              size="lg"
            >
              {calculating ? (
                <>
                  <Timer className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Plane className="w-4 h-4 mr-2" />
                  Calculate Trip Time
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Map - Full Width on Large Screens */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div
              ref={mapContainer}
              className="w-full h-[600px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Trip Breakdown Below */}
      {tripResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Trip Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tripResult.segments.map((segment, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="mt-1 p-2 rounded-full bg-background">
                  {segment.type === 'ground' ? (
                    <Car className="w-5 h-5 text-primary" />
                  ) : (
                    <Plane className="w-5 h-5 text-success" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-lg">
                    {segment.type === 'ground' ? 'Ground Transport' : 'PC-24 Flight'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {segment.from} → {segment.to}
                  </div>
                  <div className="flex gap-4 text-sm mt-2">
                    <span className="font-semibold text-foreground">
                      {formatDuration(segment.duration)}
                    </span>
                    <span className="text-muted-foreground">
                      {segment.distance.toFixed(0)} {segment.type === 'ground' ? 'mi' : 'nm'}
                    </span>
                    {segment.traffic && (
                      <span className="text-muted-foreground">
                        Traffic: {segment.traffic}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xl font-bold">
                <span>Total Trip Time</span>
                <span className="text-primary">
                  {formatDuration(tripResult.totalTime)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                <span>Estimated Arrival</span>
                <span className="font-medium">{format(tripResult.arrivalTime, 'PPp')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
