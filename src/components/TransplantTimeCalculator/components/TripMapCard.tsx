import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

interface TripMapCardProps {
  mapContainer: React.RefObject<HTMLDivElement>;
}

export function TripMapCard({ mapContainer }: TripMapCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Route Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <div ref={mapContainer} className="h-[600px] w-full rounded-b-lg" />
        
        {/* Map Legend */}
        <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-green-500"></div>
            <span>Ground Travel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-blue-500 border-dashed border-t-2 border-blue-500"></div>
            <span>Flight</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
