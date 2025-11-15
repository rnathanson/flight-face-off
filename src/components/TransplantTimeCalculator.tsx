import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon, Clock, MapPin, Plane, Car } from 'lucide-react';
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

interface TripResult {
  segments: TripSegment[];
  totalTime: number; // minutes
  arrivalTime: Date;
  route: {
    origin: GeocodeResult;
    destination: GeocodeResult;
    originAirport: { code: string; name: string; lat: number; lon: number };
    destAirport: { code: string; name: string; lat: number; lon: number };
  };
}

export function TransplantTimeCalculator() {
  const [originHospital, setOriginHospital] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
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

  const calculateTrip = async () => {
    if (!originHospital || !destinationHospital || !departureDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setCalculating(true);
    try {
      // Geocode hospitals
      const origin = await geocodeAddress(originHospital);
      const destination = await geocodeAddress(destinationHospital);

      // Find nearest airports (mock data for now - you'll provide real service)
      const originAirport = { code: 'KJFK', name: 'JFK International', lat: 40.6413, lon: -73.7781 };
      const destAirport = { code: 'KBOS', name: 'Boston Logan', lat: 42.3656, lon: -71.0096 };

      // Calculate ground segments
      const groundSegment1 = await getRouteDriving(origin, {
        lat: originAirport.lat,
        lon: originAirport.lon,
        displayName: originAirport.name,
        placeId: 0,
      });

      const groundSegment2 = await getRouteDriving(
        {
          lat: destAirport.lat,
          lon: destAirport.lon,
          displayName: destAirport.name,
          placeId: 0,
        },
        destination
      );

      // Calculate flight time (mock - you'll provide real calculation)
      const flightDistance = 185; // nautical miles
      const flightTime = 75; // minutes

      // Combine time of day with date
      const [hours, minutes] = departureTime.split(':').map(Number);
      const departureDateTime = new Date(departureDate);
      departureDateTime.setHours(hours, minutes, 0, 0);

      const totalMinutes =
        groundSegment1.durationMinutes + flightTime + groundSegment2.durationMinutes;
      const arrivalTime = new Date(departureDateTime.getTime() + totalMinutes * 60000);

      const result: TripResult = {
        segments: [
          {
            type: 'ground',
            from: origin.displayName,
            to: originAirport.name,
            duration: groundSegment1.durationMinutes,
            distance: groundSegment1.distanceMiles,
            traffic: 'Moderate',
          },
          {
            type: 'flight',
            from: originAirport.code,
            to: destAirport.code,
            duration: flightTime,
            distance: flightDistance,
          },
          {
            type: 'ground',
            from: destAirport.name,
            to: destination.displayName,
            duration: groundSegment2.durationMinutes,
            distance: groundSegment2.distanceMiles,
            traffic: 'Light',
          },
        ],
        totalTime: totalMinutes,
        arrivalTime,
        route: {
          origin,
          destination,
          originAirport,
          destAirport,
        },
      };

      setTripResult(result);
      
      // Initialize map after getting results
      if (mapboxToken && mapContainer.current && !map.current) {
        initializeMap(result);
      } else if (map.current && mapboxToken) {
        updateMap(result);
      }
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

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [result.route.origin.lon, result.route.origin.lat],
      zoom: 6,
    });

    map.current.on('load', () => {
      updateMap(result);
    });
  };

  const updateMap = (result: TripResult) => {
    if (!map.current) return;

    // Remove existing layers and sources
    ['route-ground-1', 'route-flight', 'route-ground-2'].forEach((id) => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
      if (map.current?.getSource(id)) map.current.removeSource(id);
    });

    // Remove existing markers
    document.querySelectorAll('.mapboxgl-marker').forEach((el) => el.remove());

    const { origin, destination, originAirport, destAirport } = result.route;

    // Add markers
    new mapboxgl.Marker({ color: '#005587' })
      .setLngLat([origin.lon, origin.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Origin</strong><br>${origin.displayName}`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#7CB342' })
      .setLngLat([destination.lon, destination.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Destination</strong><br>${destination.displayName}`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#FF9800' })
      .setLngLat([originAirport.lon, originAirport.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>${originAirport.code}</strong><br>${originAirport.name}`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#FF9800' })
      .setLngLat([destAirport.lon, destAirport.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>${destAirport.code}</strong><br>${destAirport.name}`))
      .addTo(map.current);

    // Add route lines
    // Ground segment 1
    map.current.addSource('route-ground-1', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [origin.lon, origin.lat],
            [originAirport.lon, originAirport.lat],
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
        'line-width': 4,
        'line-dasharray': [2, 2],
      },
    });

    // Flight segment
    map.current.addSource('route-flight', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [originAirport.lon, originAirport.lat],
            [destAirport.lon, destAirport.lat],
          ],
        },
      },
    });

    map.current.addLayer({
      id: 'route-flight',
      type: 'line',
      source: 'route-flight',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#7CB342',
        'line-width': 5,
      },
    });

    // Ground segment 2
    map.current.addSource('route-ground-2', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [destAirport.lon, destAirport.lat],
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
        'line-width': 4,
        'line-dasharray': [2, 2],
      },
    });

    // Fit bounds to show entire route
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([origin.lon, origin.lat]);
    bounds.extend([destination.lon, destination.lat]);
    bounds.extend([originAirport.lon, originAirport.lat]);
    bounds.extend([destAirport.lon, destAirport.lat]);

    map.current.fitBounds(bounds, { padding: 80 });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
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
                onLocationSelect={() => {}}
                placeholder="Enter hospital name or address"
                label="Origin Hospital"
              />
            </div>

            {/* Destination Hospital */}
            <div className="space-y-2">
              <LocationAutocomplete
                value={destinationHospital}
                onChange={setDestinationHospital}
                onLocationSelect={() => {}}
                placeholder="Enter hospital name or address"
                label="Destination Hospital"
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
              <Label>Passengers (excluding 2 pilots)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[passengerCount]}
                  onValueChange={([value]) => setPassengerCount(value)}
                  min={0}
                  max={8}
                  step={1}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-primary w-8 text-center">
                  {passengerCount}
                </span>
              </div>
            </div>

            {/* Calculate Button */}
            <Button
              onClick={calculateTrip}
              disabled={calculating}
              className="w-full"
              size="lg"
            >
              {calculating ? 'Calculating...' : 'Calculate Trip Time'}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        {tripResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-success" />
                Trip Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tripResult.segments.map((segment, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="mt-1">
                    {segment.type === 'ground' ? (
                      <Car className="w-5 h-5 text-primary" />
                    ) : (
                      <Plane className="w-5 h-5 text-success" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">
                      {segment.type === 'ground' ? 'Ground Transport' : 'PC-24 Flight'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {segment.from} → {segment.to}
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">
                        {formatDuration(segment.duration)}
                      </span>
                      {' • '}
                      {segment.distance.toFixed(0)} {segment.type === 'ground' ? 'mi' : 'nm'}
                      {segment.traffic && (
                        <>
                          {' • '}
                          <span className="text-muted-foreground">
                            Traffic: {segment.traffic}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total Trip Time</span>
                  <span className="text-primary">
                    {formatDuration(tripResult.totalTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                  <span>Estimated Arrival</span>
                  <span>{format(tripResult.arrivalTime, 'PPp')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map */}
      {tripResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Route Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={mapContainer}
              className="w-full h-[500px] rounded-lg overflow-hidden"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
