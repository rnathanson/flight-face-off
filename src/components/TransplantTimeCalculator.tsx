import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, MapPin, Plane, Zap, Clock, Car, Timer, AlertTriangle, CheckCircle, Target, ChevronDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { GeocodeResult } from '@/lib/geocoding';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TripSegment {
  type: 'ground' | 'flight';
  from: string;
  to: string;
  duration: number;
  distance: number;
  traffic?: string;
  polyline?: number[][];
  hasTrafficData?: boolean;
  route?: string;
}

interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm?: number;
  address?: string;
  distance_from_pickup?: number;
  distance_from_delivery?: number;
}

interface WindsAloftData {
  direction: number | 'VRB';
  speed: number;
  altitude: number;
  station: string;
  temperature?: number;
}

interface TripResult {
  segments: TripSegment[];
  totalTime: number;
  arrivalTime: Date;
  route?: {
    pickupLocation?: GeocodeResult;
    deliveryLocation?: GeocodeResult;
    pickupAirport?: Airport;
    destinationAirport?: Airport;
  };
  conditions?: {
    weatherDelay: number;
    maxHeadwind: number;
    hasRealTimeTraffic: boolean;
    routingQuality: 'faa-preferred' | 'great-circle' | 'mixed';
    trafficLevel: 'light' | 'normal' | 'heavy';
    cruiseWinds?: {
      leg1: WindsAloftData | null;
      leg4: WindsAloftData | null;
    };
  };
  chiefPilotApproval?: {
    required: boolean;
    reasons: string[];
    pickupAirport: { code: string; name: string; requiresApproval: boolean } | null;
    deliveryAirport: { code: string; name: string; requiresApproval: boolean } | null;
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
  const [preferredPickupAirport, setPreferredPickupAirport] = useState<string>('');
  const [preferredDestinationAirport, setPreferredDestinationAirport] = useState<string>('');
  const [showPickupAirportPrefs, setShowPickupAirportPrefs] = useState(false);
  const [showDestinationAirportPrefs, setShowDestinationAirportPrefs] = useState(false);
  const [showAirportInputs, setShowAirportInputs] = useState(false);
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
        console.log('Mapbox token loaded successfully');
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
    
    const icon = segment.type === 'flight' 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
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

    // Calculate offset based on segment position to prevent overlap
    let offset: [number, number] = [0, 0];
    if (segment.type === 'ground') {
      if (index === 0) { // First ground segment (pickup)
        offset = [-30, 20]; // Shift left and down
      } else { // Second ground segment (delivery)
        offset = [30, 20]; // Shift right and down
      }
    }
    
    return new mapboxgl.Marker(el, { offset })
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
          passengers: passengerCount,
          preferredPickupAirport: preferredPickupAirport || undefined,
          preferredDestinationAirport: preferredDestinationAirport || undefined
        }
      });

      if (error) {
        console.error('Error calculating trip:', error);
        throw error;
      }

      console.log('Chief Pilot Approval:', data.chiefPilotApproval);

      const result: TripResult = {
        segments: data.segments,
        totalTime: data.totalTime,
        arrivalTime: new Date(data.arrivalTime),
        route: {
          pickupLocation: selectedOrigin,
          deliveryLocation: selectedDestination,
          pickupAirport: data.route.pickupAirport,
          destinationAirport: data.route.destinationAirport,
        },
        conditions: data.conditions,
        chiefPilotApproval: data.chiefPilotApproval || null
      };

      setTripResult(result);
      
      // Initialize map after a delay to ensure container is rendered
      setTimeout(() => {
        if (mapboxToken && mapContainer.current) {
          if (!map.current) {
            console.log('Initializing new map');
            initializeMap(result, data.segments);
          } else {
            console.log('Updating existing map');
            // Force resize in case container dimensions changed
            map.current.resize();
            updateMap(result, data.segments);
          }
        }
      }, result.chiefPilotApproval?.required ? 500 : 100);
      
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
    if (!mapContainer.current || !mapboxToken) {
      console.log('Cannot initialize map:', { hasContainer: !!mapContainer.current, hasToken: !!mapboxToken });
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      const origin = result.route?.pickupLocation;
      const destination = result.route?.deliveryLocation;
      
      if (!origin || !destination) {
        console.log('Missing origin or destination for map');
        return;
      }
      
      const centerLng = (origin.lon + destination.lon) / 2;
      const centerLat = (origin.lat + destination.lat) / 2;

      console.log('Initializing map with center:', { centerLng, centerLat });

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [centerLng, centerLat],
        zoom: 6,
        attributionControl: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        updateMap(result, segments);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const updateMap = (result: TripResult, segments?: TripSegment[]) => {
    if (!map.current) {
      console.log('Map not initialized, skipping update');
      return;
    }

    console.log('Updating map with trip result:', {
      segmentCount: result.segments?.length,
      pickupAirport: result.route?.pickupAirport,
      destAirport: result.route?.destinationAirport,
      hasPolylines: result.segments?.some(s => s.polyline && s.polyline.length > 0)
    });

    ['route-base', 'route-animated', 'route-ground-1', 'route-ground-2', 'route-ground-3', 'route-ground-4', 'route-ground-5'].forEach((id) => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
      if (map.current?.getSource(id)) map.current.removeSource(id);
    });

    document.querySelectorAll('.mapboxgl-marker').forEach((el) => el.remove());
    document.querySelectorAll('.segment-label').forEach((el) => el.remove());

    const origin = result.route?.pickupLocation;
    const destination = result.route?.deliveryLocation;
    const pickupAirport = result.route?.pickupAirport;
    const destAirport = result.route?.destinationAirport;
    
    if (!origin || !destination) return;

    const KFRG = { lat: 40.728889, lng: -73.413333 };

    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([KFRG.lng, KFRG.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<h3>KFRG - Home Base</h3>'))
      .addTo(map.current);

    if (pickupAirport) {
      new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([pickupAirport.lng, pickupAirport.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${pickupAirport.code}</h3><p>${pickupAirport.name}</p>`))
        .addTo(map.current);
    }

    new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat([origin.lon, origin.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>Pickup Hospital</h3><p>${origin.displayName.split(',')[0]}</p>`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([destination.lon, destination.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>Delivery Hospital</h3><p>${destination.displayName.split(',')[0]}</p>`))
      .addTo(map.current);

    if (destAirport && destAirport.code !== 'KFRG') {
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([destAirport.lng, destAirport.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${destAirport.code}</h3><p>${destAirport.name}</p>`))
        .addTo(map.current);
    }

    if (pickupAirport) {
      map.current.addSource('route-base', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [KFRG.lng, KFRG.lat],
              [pickupAirport.lng, pickupAirport.lat]
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
    }

    if (segments && segments.length >= 4 && pickupAirport && destAirport) {
      // Add first flight leg label (KFRG to pickup airport)
      const firstFlightMidpoint = calculateMidpoint([
        [KFRG.lng, KFRG.lat],
        [pickupAirport.lng, pickupAirport.lat]
      ]);
      if (firstFlightMidpoint) {
        const firstFlightSegment: TripSegment = {
          type: 'flight',
          from: 'KFRG',
          to: pickupAirport.code,
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
              [pickupAirport.lng, pickupAirport.lat],
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

      // Add main flight leg label (pickup airport to dest airport)
      const mainFlightMidpoint = calculateMidpoint([
        [pickupAirport.lng, pickupAirport.lat],
        [destAirport.lng, destAirport.lat]
      ]);
      if (mainFlightMidpoint) {
        const mainFlightSegment: TripSegment = {
          type: 'flight',
          from: pickupAirport.code,
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
    if (pickupAirport) bounds.extend([pickupAirport.lng, pickupAirport.lat]);
    bounds.extend([origin.lon, origin.lat]);
    bounds.extend([destination.lon, destination.lat]);
    if (destAirport) bounds.extend([destAirport.lng, destAirport.lat]);

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
                    // Only set the display name if it's a valid selection
                    if (location.placeId !== '0') {
                      setOriginHospital(location.displayName);
                    }
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
                    // Only set the display name if it's a valid selection
                    if (location.placeId !== '0') {
                      setDestinationHospital(location.displayName);
                    }
                  }}
                  placeholder="Enter hospital name or address"
                  label="Delivery Hospital"
                  selectedLocation={selectedDestination}
                />
              </div>

              <Collapsible open={showAirportInputs} onOpenChange={setShowAirportInputs}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAirportInputs && "rotate-180")} />
                  Specify preferred airports (optional)
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pickup-airport" className="text-xs text-muted-foreground">
                        Pickup Airport
                      </Label>
                      <input
                        id="pickup-airport"
                        type="text"
                        value={preferredPickupAirport}
                        onChange={(e) => setPreferredPickupAirport(e.target.value.toUpperCase())}
                        placeholder="e.g. KRDU"
                        maxLength={4}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm uppercase placeholder:text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="destination-airport" className="text-xs text-muted-foreground">
                        Destination Airport
                      </Label>
                      <input
                        id="destination-airport"
                        type="text"
                        value={preferredDestinationAirport}
                        onChange={(e) => setPreferredDestinationAirport(e.target.value.toUpperCase())}
                        placeholder="e.g. KJFK"
                        maxLength={4}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm uppercase placeholder:text-xs"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

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
                className="w-full h-12"
                size="lg"
              >
                <div className="flex items-center gap-2">
                  <Plane className="w-5 h-5" />
                  <span className="font-semibold">Calculate Trip Time</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-b pb-6 mb-6">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">From:</div>
                  <div className="font-semibold text-sm">
                    {selectedOrigin?.displayName?.split(',')[0] || originHospital.split(',')[0]}
                  </div>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">To:</div>
                  <div className="font-semibold text-sm">
                    {selectedDestination?.displayName?.split(',')[0] || destinationHospital.split(',')[0]}
                  </div>
                </div>
                <div className="text-muted-foreground">•</div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm font-medium">{format(departureDate, 'MMM d')} at {departureTime}</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6">
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
                    <div className="flex items-center justify-center gap-2">
                      <Plane className="w-8 h-8 text-blue-600" />
                      {tripResult.chiefPilotApproval?.required && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-5 h-5 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">Chief pilot approval required</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Pickup Airport</div>
                    <div className="text-2xl font-bold">
                      {tripResult.route?.pickupAirport?.code || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tripResult.route?.pickupAirport?.distance_from_pickup !== undefined && 
                        `${tripResult.route.pickupAirport.distance_from_pickup.toFixed(1)} nm from pickup`
                      }
                    </div>
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



          <div className="border-t pt-4 mt-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Time Analysis</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-3">
              {/* Conservative Estimate */}
              <div className="border rounded-sm bg-card">
                <div className="px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conservative</span>
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className="text-2xl font-semibold text-foreground">
                    {Math.floor((tripResult.totalTime * 1.35) / 60)}h {Math.round((tripResult.totalTime * 1.35) % 60)}m
                  </div>
                </div>
              </div>

              {/* Expected Estimate */}
              <div className="border-2 rounded-sm bg-card border-primary/40">
                <div className="px-4 py-3 border-b bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">Expected</span>
                    <div className="h-1 w-1 rounded-full bg-primary" />
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className="text-2xl font-semibold text-foreground">
                    {Math.floor(tripResult.totalTime / 60)}h {Math.round(tripResult.totalTime % 60)}m
                  </div>
                </div>
              </div>

              {/* Optimistic Estimate */}
              <div className="border rounded-sm bg-card">
                <div className="px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Optimistic</span>
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className="text-2xl font-semibold text-foreground">
                    {Math.floor((tripResult.totalTime * 0.85) / 60)}h {Math.round((tripResult.totalTime * 0.85) % 60)}m
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leg-by-Leg Summary - Collapsible */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Plane className="w-6 h-6 text-primary" />
                      Trip Breakdown
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {tripResult.segments.length} segments • {formatDuration(tripResult.totalTime)}
                      </span>
                      <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    {tripResult.segments.map((segment, index) => {
                      const isPickupHospital = segment.to.toLowerCase().includes('pickup hospital');
                      const isDeliveryHospital = segment.to.toLowerCase().includes('delivery hospital');
                      
                      // Calculate time to pickup for subtotal after pickup hospital segment
                      let timeToPickupSubtotal = null;
                      if (isPickupHospital) {
                        const timeToPickup = tripResult.segments
                          .slice(0, index + 1)
                          .reduce((sum, seg) => sum + seg.duration, 0);
                        timeToPickupSubtotal = (
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg my-3">
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-sm">Time to Pick Up</span>
                            </div>
                            <div className="text-base font-semibold text-foreground">
                              {formatDuration(timeToPickup)}
                            </div>
                          </div>
                        );
                      }
                      
                      // Calculate time from pickup to delivery for subtotal after delivery hospital segment
                      let pickupToDeliverySubtotal = null;
                      if (isDeliveryHospital) {
                        const pickupIndex = tripResult.segments.findIndex(seg => 
                          seg.to.toLowerCase().includes('pickup hospital')
                        );
                        if (pickupIndex >= 0) {
                          const timeToDeliver = tripResult.segments
                            .slice(pickupIndex + 1, index + 1)
                            .reduce((sum, seg) => sum + seg.duration, 0);
                          pickupToDeliverySubtotal = (
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg my-3">
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">Time from Pick Up to Delivery</span>
                              </div>
                              <div className="text-base font-semibold text-foreground">
                                {formatDuration(timeToDeliver)}
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      return (
                        <React.Fragment key={index}>
                          <div 
                            className="p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-all"
                            style={{
                              borderLeft: `4px solid ${segment.type === 'flight' ? '#3b82f6' : '#10b981'}`
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {segment.type === 'flight' ? (
                                    <Plane className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <Car className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span className="font-semibold text-sm uppercase tracking-wide">
                                    {segment.type === 'flight' ? 'Flight' : 'Ground Transport'}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    Leg {index + 1}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2 text-base font-medium mb-1">
                                  <span className="text-foreground">{segment.from}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-foreground">{segment.to}</span>
                                </div>
                              </div>
                              
                              <div className="text-right space-y-1">
                                <div className="flex items-center gap-2 justify-end">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-lg font-bold text-foreground">
                                    {formatDuration(segment.duration)}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {segment.distance.toFixed(1)} {segment.type === 'flight' ? 'nm' : 'mi'}
                                </div>
                              </div>
                            </div>
                          </div>
                          {timeToPickupSubtotal}
                          {pickupToDeliverySubtotal}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Total Summary */}
                    <div className="pt-4 border-t-2 border-border">
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-primary" />
                          <span className="text-lg font-semibold">Total Trip Time</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {formatDuration(tripResult.totalTime)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Door to door
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Interactive Map */}
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

      {/* Loading Modal */}
      <Dialog open={calculating}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Calculating Trip</h3>
              {loadingStage && (
                <p className="text-sm text-muted-foreground">{loadingStage}</p>
              )}
            </div>
            {loadingStage && (
              <Progress 
                value={
                  loadingStage.includes('route') ? 20 :
                  loadingStage.includes('weather') ? 40 :
                  loadingStage.includes('traffic') ? 60 :
                  loadingStage.includes('ATC') ? 80 :
                  100
                } 
                className="w-full max-w-xs" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
