import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Plane, MapPin, Users, Luggage, RotateCcw, Clock, TrendingUp, DollarSign, Wind } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useConfig } from '@/context/ConfigContext';
import { calculateFlight, formatTime, formatCost } from '@/lib/flightCalculations';
import type { AircraftConfig } from '@/types/aircraft';
import { useIsMobile } from '@/hooks/use-mobile';
import { FLIGHT_HISTORY_AIRPORTS, KFRG_LOCATION } from '@/lib/airportCoordinates';

const RangeAirportExplorer = () => {
  const { config } = useConfig();
  const isMobile = useIsMobile();
  const sr22Config = config.sr22;
  const jetConfig = config.jet;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const departureMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [departurePoint, setDeparturePoint] = useState({ lng: -73.4134, lat: 40.7288 }); // KFRG - Republic Airport, Long Island
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(0);
  const [sr22WindKts, setSr22WindKts] = useState(0); // SR22 wind (lower altitude)
  const [sr22WindInput, setSr22WindInput] = useState('0');
  const [jetWindKts, setJetWindKts] = useState(0); // Vision Jet wind (higher altitude)
  const [jetWindInput, setJetWindInput] = useState('0');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFlightHistory, setShowFlightHistory] = useState(false);

  // Calculate actual non-stop ranges and flight times based on payload and wind
  const calculateNonStopRange = (aircraft: 'SR22' | 'VisionJet'): { range: number; time: number } => {
    const config = aircraft === 'SR22' ? sr22Config : jetConfig;
    const windKts = aircraft === 'SR22' ? sr22WindKts : jetWindKts;
    
    // Binary search to find maximum non-stop distance
    let low = 0;
    let high = 2000; // Start with reasonable max
    let maxRange = 0;
    let flightTime = 0;
    
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const result = calculateFlight(mid, config, aircraft, passengers, bags, windKts);
      
      if (result.canMakeIt && result.stops === 0) {
        maxRange = mid;
        flightTime = result.time;
        low = mid;
      } else {
        high = mid;
      }
    }
    
    return { range: maxRange, time: flightTime };
  };

  // Calculate 2-hour range for SR22
  const calculateTwoHourRange = (): number => {
    const targetTime = 120; // 2 hours in minutes
    const windKts = sr22WindKts;
    
    // Binary search to find distance achievable in 2 hours
    let low = 0;
    let high = 1000;
    let twoHourRange = 0;
    
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const result = calculateFlight(mid, sr22Config, 'SR22', passengers, bags, windKts);
      
      if (result.canMakeIt && result.time <= targetTime) {
        twoHourRange = mid;
        low = mid;
      } else {
        high = mid;
      }
    }
    
    return twoHourRange;
  };

  const sr22Data = useMemo(() => calculateNonStopRange('SR22'), [passengers, bags, sr22WindKts, sr22Config]);
  const jetData = useMemo(() => calculateNonStopRange('VisionJet'), [passengers, bags, jetWindKts, jetConfig]);
  const sr22TwoHourRange = useMemo(() => calculateTwoHourRange(), [passengers, bags, sr22WindKts, sr22Config]);

  // Aircraft specifications with dynamic ranges and flight times
  const aircraft = [
    {
      name: 'SR22',
      range: sr22Data.range,
      time: sr22Data.time,
      color: '#FF6B6B',
      fillColor: 'rgba(255, 107, 107, 0.15)',
    },
    {
      name: 'Vision Jet',
      range: jetData.range,
      time: jetData.time,
      color: '#4ECDC4',
      fillColor: 'rgba(78, 205, 196, 0.15)',
    },
  ];

  useEffect(() => {
    const fetchMapboxToken = async () => {
      const { data } = await supabase.functions.invoke('get-mapbox-token');
      if (data?.token) {
        setMapboxToken(data.token);
      }
    };
    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [departurePoint.lng, departurePoint.lat],
      zoom: isMobile ? 2.5 : 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Wait for map to fully load before allowing layer operations
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Add draggable departure marker
    departureMarker.current = new mapboxgl.Marker({ 
      color: '#FFD700',
      draggable: true 
    })
      .setLngLat([departurePoint.lng, departurePoint.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          '<strong>Departure Point</strong><br/><em>Drag to reposition</em>'
        )
      )
      .addTo(map.current);

    // Update departure point when marker is dragged
    departureMarker.current.on('dragend', () => {
      const lngLat = departureMarker.current!.getLngLat();
      setDeparturePoint({ lng: lngLat.lng, lat: lngLat.lat });
      map.current?.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 4 });
    });

    // Click handler for destination selection
    map.current.on('click', (e) => {
      setSelectedPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    return () => {
      setMapLoaded(false);
      departureMarker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update range circles when payload or departure changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.isStyleLoaded()) return;

    // Remove existing circle layers
    aircraft.forEach((ac) => {
      if (map.current?.getLayer(`${ac.name}-circle`)) {
        map.current.removeLayer(`${ac.name}-circle`);
      }
      if (map.current?.getLayer(`${ac.name}-circle-outline`)) {
        map.current.removeLayer(`${ac.name}-circle-outline`);
      }
      if (map.current?.getSource(`${ac.name}-source`)) {
        map.current.removeSource(`${ac.name}-source`);
      }
    });

    // Remove 2-hour SR22 circle if it exists
    if (map.current?.getLayer('sr22-2hour-circle-outline')) {
      map.current.removeLayer('sr22-2hour-circle-outline');
    }
    if (map.current?.getLayer('sr22-2hour-label')) {
      map.current.removeLayer('sr22-2hour-label');
    }
    if (map.current?.getSource('sr22-2hour-label-source')) {
      map.current.removeSource('sr22-2hour-label-source');
    }
    if (map.current?.getSource('sr22-2hour-source')) {
      map.current.removeSource('sr22-2hour-source');
    }

    // Add updated range circles (below flight history lines)
    aircraft.forEach((ac) => {
      const radiusInMeters = ac.range * 1852;
      
      map.current?.addSource(`${ac.name}-source`, {
        type: 'geojson',
        data: createGeoJSONCircle([departurePoint.lng, departurePoint.lat], radiusInMeters),
      });

      map.current?.addLayer({
        id: `${ac.name}-circle`,
        type: 'fill',
        source: `${ac.name}-source`,
        paint: {
          'fill-color': ac.fillColor,
          'fill-opacity': 0.3,
        },
      });

      map.current?.addLayer({
        id: `${ac.name}-circle-outline`,
        type: 'line',
        source: `${ac.name}-source`,
        paint: {
          'line-color': ac.color,
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });
    });

    // Add 2-hour SR22 dashed circle
    const twoHourRadiusInMeters = sr22TwoHourRange * 1852;
    const twoHourCircleData = createGeoJSONCircle([departurePoint.lng, departurePoint.lat], twoHourRadiusInMeters);
    
    map.current?.addSource('sr22-2hour-source', {
      type: 'geojson',
      data: twoHourCircleData,
    });

    map.current?.addLayer({
      id: 'sr22-2hour-circle-outline',
      type: 'line',
      source: 'sr22-2hour-source',
      paint: {
        'line-color': '#FF6B6B',
        'line-width': 2,
        'line-opacity': 0.6,
        'line-dasharray': [4, 4],
      },
    });

    // Add label for 2-hour SR22 circle
    if (twoHourCircleData.geometry.type === 'Polygon') {
      const labelPoint = twoHourCircleData.geometry.coordinates[0][16]; // Point on the circle for label
      
      map.current?.addSource('sr22-2hour-label-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            label: '2 Hour SR22'
          },
          geometry: {
            type: 'Point',
            coordinates: labelPoint
          }
        }
      });

      map.current?.addLayer({
        id: 'sr22-2hour-label',
        type: 'symbol',
        source: 'sr22-2hour-label-source',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#FF6B6B',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        },
      });
    }

  }, [mapLoaded, departurePoint, passengers, bags, sr22WindKts, jetWindKts, sr22Data.range, jetData.range, sr22TwoHourRange]);

  // Add/remove flight history visualization
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.isStyleLoaded()) return;

    const FLIGHT_HISTORY_LAYER = 'flight-history-lines';
    const FLIGHT_HISTORY_SOURCE = 'flight-history-source';
    const FLIGHT_HISTORY_MARKERS_LAYER = 'flight-history-markers';
    const FLIGHT_HISTORY_MARKERS_SOURCE = 'flight-history-markers-source';
    const FLIGHT_HISTORY_LABELS_LAYER = 'flight-history-labels';

    if (showFlightHistory) {
      // Create GeoJSON for flight lines
      const lineFeatures = FLIGHT_HISTORY_AIRPORTS.map(airport => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [KFRG_LOCATION.lng, KFRG_LOCATION.lat],
            [airport.lng, airport.lat]
          ]
        }
      }));

      // Create GeoJSON for airport markers
      const markerFeatures = FLIGHT_HISTORY_AIRPORTS.map(airport => ({
        type: 'Feature' as const,
        properties: {
          code: airport.code,
          name: airport.name
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [airport.lng, airport.lat]
        }
      }));

      // Add lines source and layer
      if (!map.current.getSource(FLIGHT_HISTORY_SOURCE)) {
        map.current.addSource(FLIGHT_HISTORY_SOURCE, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: lineFeatures
          }
        });
      }

      if (!map.current.getLayer(FLIGHT_HISTORY_LAYER)) {
        map.current.addLayer({
          id: FLIGHT_HISTORY_LAYER,
          type: 'line',
          source: FLIGHT_HISTORY_SOURCE,
          paint: {
            'line-color': '#FF1493', // Magenta
            'line-width': 2,
            'line-opacity': 0.7
          }
        });
      }

      // Add markers source and layer
      if (!map.current.getSource(FLIGHT_HISTORY_MARKERS_SOURCE)) {
        map.current.addSource(FLIGHT_HISTORY_MARKERS_SOURCE, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: markerFeatures
          }
        });
      }

      if (!map.current.getLayer(FLIGHT_HISTORY_MARKERS_LAYER)) {
        map.current.addLayer({
          id: FLIGHT_HISTORY_MARKERS_LAYER,
          type: 'circle',
          source: FLIGHT_HISTORY_MARKERS_SOURCE,
          paint: {
            'circle-radius': 5,
            'circle-color': '#2D2D2D',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF'
          }
        });
      }

      // Add labels layer
      if (!map.current.getLayer(FLIGHT_HISTORY_LABELS_LAYER)) {
        map.current.addLayer({
          id: FLIGHT_HISTORY_LABELS_LAYER,
          type: 'symbol',
          source: FLIGHT_HISTORY_MARKERS_SOURCE,
          layout: {
            'text-field': ['get', 'code'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 10,
            'text-offset': [0, -1.5],
            'text-anchor': 'bottom'
          },
          paint: {
            'text-color': '#FFFFFF',
            'text-halo-color': '#2D2D2D',
            'text-halo-width': 2
          }
        });
      }
    } else {
      // Remove flight history layers and sources
      if (map.current.getLayer(FLIGHT_HISTORY_LABELS_LAYER)) {
        map.current.removeLayer(FLIGHT_HISTORY_LABELS_LAYER);
      }
      if (map.current.getLayer(FLIGHT_HISTORY_MARKERS_LAYER)) {
        map.current.removeLayer(FLIGHT_HISTORY_MARKERS_LAYER);
      }
      if (map.current.getLayer(FLIGHT_HISTORY_LAYER)) {
        map.current.removeLayer(FLIGHT_HISTORY_LAYER);
      }
      if (map.current.getSource(FLIGHT_HISTORY_MARKERS_SOURCE)) {
        map.current.removeSource(FLIGHT_HISTORY_MARKERS_SOURCE);
      }
      if (map.current.getSource(FLIGHT_HISTORY_SOURCE)) {
        map.current.removeSource(FLIGHT_HISTORY_SOURCE);
      }
    }
  }, [mapLoaded, showFlightHistory]);


  // Resize map on window resize for robustness
  useEffect(() => {
    const onResize = () => map.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Calculate distance in nautical miles
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3440.065;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const resetToKFRG = () => {
    const kfrg = { lng: -73.4134, lat: 40.7288 };
    setDeparturePoint(kfrg);
    departureMarker.current?.setLngLat([kfrg.lng, kfrg.lat]);
    map.current?.flyTo({ center: [kfrg.lng, kfrg.lat], zoom: 4 });
  };

  // Calculate performance comparison metrics
  const calculateComparison = () => {
    const sr22FuelUsed = (sr22Data.time / 60) * sr22Config.fuelFlow;
    const jetFuelUsed = (jetData.time / 60) * jetConfig.fuelFlow;

    const sr22CostAtMaxRange = sr22FuelUsed * (sr22Config.maintenanceCost / sr22Config.fuelFlow);
    const jetCostAtMaxRange = jetFuelUsed * (jetConfig.maintenanceCost / jetConfig.fuelFlow);

    const sr22CostPerNM = sr22Data.range > 0 ? sr22CostAtMaxRange / sr22Data.range : 0;
    const jetCostPerNM = jetData.range > 0 ? jetCostAtMaxRange / jetData.range : 0;

    // Calculate how long Vision Jet takes to fly SR22's max range for fair comparison
    const jetToSR22Range = calculateFlight(sr22Data.range, jetConfig, 'VisionJet', passengers, bags, jetWindKts);
    
    // Time saved by Vision Jet flying to SR22's max range
    const timeDifference = sr22Data.time - jetToSR22Range.time;

    return {
      rangeDifference: jetData.range - sr22Data.range,
      timeDifference,
      sr22Cost: sr22CostAtMaxRange,
      jetCost: jetCostAtMaxRange,
      sr22CostPerNM,
      jetCostPerNM,
    };
  };

  const comparison = calculateComparison();

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Non-Stop Range Explorer</h2>
        <p className="text-muted-foreground">
          Explore maximum non-stop range based on payload • Drag the gold pin to change departure point
        </p>
      </div>

      <div className="grid gap-4 flex-1 grid-cols-1 lg:grid-cols-3">
        {/* Map */}
        <div className="relative rounded-lg overflow-hidden shadow-lg min-h-[480px] md:min-h-[600px] lg:col-span-2">
          <div ref={mapContainer} className="absolute inset-0" />
        </div>

        {/* Info Panel */}
        <div className="space-y-4 overflow-auto">
          
          {/* Payload Inputs */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Mission Payload</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetToKFRG}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to KFRG
              </Button>
            </div>
            
            {/* Flight History Toggle */}
            <div className="flex items-center justify-between p-3 mb-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF1493]" />
                <Label htmlFor="flight-history" className="text-sm font-medium cursor-pointer">
                  Show Flight History
                </Label>
              </div>
              <Switch
                id="flight-history"
                checked={showFlightHistory}
                onCheckedChange={setShowFlightHistory}
              />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Passengers
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                      {passengers}
                    </Badge>
                  </div>
                </div>
                <Slider
                  value={[passengers]}
                  onValueChange={(value) => setPassengers(value[0])}
                  min={1}
                  max={7}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>1</span>
                  <span>7</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Luggage className="w-4 h-4" />
                    Bags
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                      {bags}
                    </Badge>
                  </div>
                </div>
                <Slider
                  value={[bags]}
                  onValueChange={(value) => setBags(value[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <Label htmlFor="sr22-wind" className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4" />
                    SR22 Wind
                  </Label>
                  <Input
                    id="sr22-wind"
                    type="text"
                    value={sr22WindInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSr22WindInput(value);
                      
                      if (value === '' || value === '-') {
                        setSr22WindKts(0);
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num) && num >= -999 && num <= 999) {
                          setSr22WindKts(num);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (sr22WindInput === '' || sr22WindInput === '-') {
                        setSr22WindInput('0');
                      } else {
                        setSr22WindInput(sr22WindKts.toString());
                      }
                    }}
                    className="w-full"
                    placeholder="0 kts"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    +/- kts
                  </p>
                </div>

                <div>
                  <Label htmlFor="jet-wind" className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4" />
                    Jet Wind
                  </Label>
                  <Input
                    id="jet-wind"
                    type="text"
                    value={jetWindInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setJetWindInput(value);
                      
                      if (value === '' || value === '-') {
                        setJetWindKts(0);
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num) && num >= -999 && num <= 999) {
                          setJetWindKts(num);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (jetWindInput === '' || jetWindInput === '-') {
                        setJetWindInput('0');
                      } else {
                        setJetWindInput(jetWindKts.toString());
                      }
                    }}
                    className="w-full"
                    placeholder="0 kts"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    +/- kts
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Non-Stop Ranges
            </h3>
            <div className="space-y-3">
              {aircraft.map((ac) => (
                <div key={ac.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ac.name}</span>
                    <Badge style={{ backgroundColor: ac.color }}>{ac.range} nm</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Flight Time: {formatTime(ac.time)} non-stop
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {selectedPoint && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Selected Location
              </h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="text-muted-foreground">Coordinates</div>
                  <div className="font-mono">
                    {selectedPoint.lat.toFixed(4)}°, {selectedPoint.lng.toFixed(4)}°
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground mb-2">Distance from Departure</div>
                  <div className="font-semibold">
                    {calculateDistance(
                      departurePoint.lat,
                      departurePoint.lng,
                      selectedPoint.lat,
                      selectedPoint.lng
                    ).toFixed(0)}{' '}
                    nm
                  </div>
                </div>
                <div className="space-y-2">
                  {aircraft.map((ac) => {
                    const distance = calculateDistance(
                      departurePoint.lat,
                      departurePoint.lng,
                      selectedPoint.lat,
                      selectedPoint.lng
                    );
                    const canReach = distance <= ac.range;
                    return (
                      <div
                        key={ac.name}
                        className="flex items-center justify-between p-2 rounded border"
                        style={{
                          borderColor: canReach ? ac.color : 'var(--border)',
                          backgroundColor: canReach ? ac.fillColor : 'transparent',
                        }}
                      >
                        <span className="font-medium">{ac.name}</span>
                        {canReach ? (
                          <Badge variant="default" className="bg-green-600">
                            ✓ Non-Stop
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Fuel Stop Needed</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Comparison
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Plane className="w-4 h-4" />
                  <span>Range Advantage</span>
                </div>
                <div className="font-semibold text-right">
                  {comparison.rangeDifference > 0 ? '+' : ''}{comparison.rangeDifference} nm
                </div>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Time Difference</span>
                </div>
                <div className="font-semibold text-right">
                  {comparison.timeDifference > 0 
                    ? `Jet saves ${formatTime(comparison.timeDifference)}` 
                    : `SR22 saves ${formatTime(Math.abs(comparison.timeDifference))}`
                  }
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Cost at Max Range
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SR22</span>
                  <span className="font-mono">${Math.round(comparison.sr22Cost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vision Jet</span>
                  <span className="font-mono">${Math.round(comparison.jetCost).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Cost per Nautical Mile
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SR22</span>
                  <span className="font-mono">${comparison.sr22CostPerNM.toFixed(2)}/nm</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vision Jet</span>
                  <span className="font-mono">${comparison.jetCostPerNM.toFixed(2)}/nm</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper function to create GeoJSON circle
function createGeoJSONCircle(
  center: [number, number],
  radiusInMeters: number,
  points = 64
): GeoJSON.Feature<GeoJSON.Geometry> {
  const coords = {
    latitude: center[1],
    longitude: center[0],
  };

  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
    properties: {},
  };
}

export default RangeAirportExplorer;
