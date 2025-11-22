import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Car, Plane } from 'lucide-react';
import { TripSegment } from '../types';
import { filterSegments } from '../utils/segmentHelpers';
import { formatDuration } from '../utils/timeFormatters';

interface TripBreakdownCardProps {
  segments: TripSegment[];
  showFullTrip: boolean;
  departureTime: string;
}

export function TripBreakdownCard(props: TripBreakdownCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const { displaySegments, timeToPickup } = filterSegments(props.segments, props.showFullTrip);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Trip Breakdown</CardTitle>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            {displaySegments.map((segment, index) => {
              const cumulativeTime = displaySegments
                .slice(0, index + 1)
                .reduce((sum, seg) => sum + seg.duration, 0);
              
              const arrivalTime = new Date(props.departureTime);
              arrivalTime.setMinutes(arrivalTime.getMinutes() + timeToPickup + cumulativeTime);

              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {segment.type === 'flight' ? (
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <Plane className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                        <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={segment.type === 'flight' ? 'default' : 'secondary'}>
                        {segment.type === 'flight' ? 'Flight' : 'Ground'}
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {segment.from} → {segment.to}
                      </span>
                    </div>
                    
                    {segment.distance_nm && (
                      <p className="text-xs text-muted-foreground">
                        Distance: {segment.distance_nm.toFixed(1)} nm
                      </p>
                    )}

                    {segment.flight_details && (
                      <div className="text-xs text-muted-foreground mt-1 space-x-3">
                        <span>Alt: {segment.flight_details.altitude_ft.toLocaleString()} ft</span>
                        <span>GS: {Math.round(segment.flight_details.groundspeed_kt)} kt</span>
                        <span>Headwind: {Math.round(segment.flight_details.headwind_kt)} kt</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-semibold">
                      {formatDuration(segment.duration)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Arrive: {arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
