import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { TripResult } from '../types';

export function useMapInitialization() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
          mapboxgl.accessToken = data.token;
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  const initializeMap = (result: TripResult) => {
    if (!mapContainer.current || !mapboxToken) return;

    const allCoords: [number, number][] = result.segments
      .filter(seg => seg.polyline)
      .flatMap(seg => {
        try {
          const coords = JSON.parse(seg.polyline!);
          return coords;
        } catch {
          return [];
        }
      });

    if (allCoords.length === 0) return;

    const bounds = allCoords.reduce(
      (bounds, coord) => bounds.extend(coord as [number, number]),
      new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
    );

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      bounds: bounds,
      fitBoundsOptions: { padding: 50 },
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  };

  return {
    mapContainer,
    map,
    mapboxToken,
    initializeMap,
  };
}
