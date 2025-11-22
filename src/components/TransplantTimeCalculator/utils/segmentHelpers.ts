import { TripSegment } from '../types';

export function calculateMidpoint(coords: [number, number][]): [number, number] | null {
  if (!coords || coords.length === 0) return null;
  if (coords.length === 2) {
    return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
  }
  const middleIndex = Math.floor(coords.length / 2);
  return coords[middleIndex] || null;
}

export function filterSegments(
  segments: TripSegment[],
  showFullTrip: boolean
): { displaySegments: TripSegment[]; timeToPickup: number } {
  const pickupHospitalIndex = segments.findIndex(seg => 
    seg.to.toLowerCase().includes('pickup hospital')
  );
  const deliveryHospitalIndex = segments.findIndex(seg => 
    seg.to.toLowerCase().includes('delivery hospital')
  );
  
  const displaySegments = showFullTrip 
    ? segments 
    : segments.slice(pickupHospitalIndex + 1, deliveryHospitalIndex + 1);
    
  const timeToPickup = segments
    .slice(0, pickupHospitalIndex + 1)
    .reduce((sum, seg) => sum + seg.duration, 0);
    
  return { displaySegments, timeToPickup };
}

export function createSegmentLabel(
  segment: TripSegment,
  index: number,
  isFullTrip: boolean
): HTMLDivElement {
  const label = document.createElement('div');
  label.className = 'bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border-2 border-primary/20 text-sm font-medium whitespace-nowrap';
  
  const segmentNumber = isFullTrip ? index + 1 : index + 1;
  const typeIcon = segment.type === 'flight' ? '✈️' : '🚗';
  const durationText = `${Math.round(segment.duration)} min`;
  
  label.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-lg">${typeIcon}</span>
      <div>
        <div class="font-bold text-primary">${segmentNumber}. ${segment.type === 'flight' ? 'Flight' : 'Ground'}</div>
        <div class="text-xs text-muted-foreground">${durationText}</div>
      </div>
    </div>
  `;
  
  return label;
}
