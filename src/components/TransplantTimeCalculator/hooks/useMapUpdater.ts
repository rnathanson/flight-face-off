import { useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { TripResult, TripSegment } from '../types';
import { calculateMidpoint, createSegmentLabel } from '../utils/segmentHelpers';

interface UseMapUpdaterProps {
  map: React.MutableRefObject<mapboxgl.Map | null>;
  showFullTrip: boolean;
}

export function useMapUpdater(props: UseMapUpdaterProps) {
  const updateMap = useCallback((result: TripResult, segments: TripSegment[]) => {
    if (!props.map.current) return;

    const map = props.map.current;

    // Remove existing layers and sources
    ['route-ground', 'route-flight', 'airports'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add route layers
    const groundCoords: [number, number][] = [];
    const flightCoords: [number, number][] = [];

    segments.forEach(seg => {
      if (seg.polyline) {
        try {
          const coords = JSON.parse(seg.polyline);
          if (seg.type === 'ground') {
            groundCoords.push(...coords);
          } else {
            flightCoords.push(...coords);
          }
        } catch (e) {
          console.error('Error parsing polyline:', e);
        }
      }
    });

    // Add ground route
    if (groundCoords.length > 0) {
      map.addSource('route-ground', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: groundCoords,
          },
        },
      });

      map.addLayer({
        id: 'route-ground',
        type: 'line',
        source: 'route-ground',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#10b981',
          'line-width': 4,
        },
      });
    }

    // Add flight route
    if (flightCoords.length > 0) {
      map.addSource('route-flight', {
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

      map.addLayer({
        id: 'route-flight',
        type: 'line',
        source: 'route-flight',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-dasharray': [2, 2],
        },
      });
    }

    // Add segment labels
    segments.forEach((seg, idx) => {
      if (seg.polyline) {
        try {
          const coords = JSON.parse(seg.polyline);
          const midpoint = calculateMidpoint(coords);
          if (midpoint) {
            const labelEl = createSegmentLabel(seg, idx, props.showFullTrip);
            new mapboxgl.Marker({ element: labelEl })
              .setLngLat(midpoint)
              .addTo(map);
          }
        } catch (e) {
          console.error('Error adding label:', e);
        }
      }
    });

    // Add airport markers
    const airportMarkerEl = document.createElement('div');
    airportMarkerEl.className = 'text-3xl';
    airportMarkerEl.innerHTML = '✈️';
    
    new mapboxgl.Marker({ element: airportMarkerEl })
      .setLngLat([result.pickup_airport.lng, result.pickup_airport.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>${result.pickup_airport.name}</strong><br>${result.pickup_airport.code}`))
      .addTo(map);

    const destAirportMarkerEl = document.createElement('div');
    destAirportMarkerEl.className = 'text-3xl';
    destAirportMarkerEl.innerHTML = '🏁';
    
    new mapboxgl.Marker({ element: destAirportMarkerEl })
      .setLngLat([result.destination_airport.lng, result.destination_airport.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>${result.destination_airport.name}</strong><br>${result.destination_airport.code}`))
      .addTo(map);

    // Fit bounds
    const allCoords = [...groundCoords, ...flightCoords];
    if (allCoords.length > 0) {
      const bounds = allCoords.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
      );
      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }, [props.showFullTrip]);

  return { updateMap };
}
