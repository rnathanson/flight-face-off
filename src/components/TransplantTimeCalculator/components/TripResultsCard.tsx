import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Plane, AlertCircle } from 'lucide-react';
import { TripResult } from '../types';
import { formatDuration } from '../utils/timeFormatters';

interface TripResultsCardProps {
  tripResult: TripResult;
  showFullTrip: boolean;
  onToggleFullTrip: (value: boolean) => void;
  onNewCalculation: () => void;
  onShowChiefPilotModal: () => void;
}

export function TripResultsCard(props: TripResultsCardProps) {
  const { tripResult } = props;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl mb-2">Trip Summary</CardTitle>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>From: {tripResult.pickup_airport.name} ({tripResult.pickup_airport.code})</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>To: {tripResult.destination_airport.name} ({tripResult.destination_airport.code})</span>
              </div>
            </div>
          </div>
          {tripResult.chiefPilotApproval && (
            <Button
              variant="outline"
              size="sm"
              onClick={props.onShowChiefPilotModal}
              className="gap-2"
            >
              <Plane className="h-4 w-4" />
              Chief Pilot Approval
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Time Display */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Optimistic</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatDuration(tripResult.optimistic_time_minutes)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Arrives: {new Date(tripResult.optimistic_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
            <div className="text-sm text-muted-foreground mb-1">Expected</div>
            <div className="text-3xl font-bold text-primary">
              {formatDuration(tripResult.total_time_minutes)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Arrives: {new Date(tripResult.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Conservative</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatDuration(tripResult.conservative_time_minutes)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Arrives: {new Date(tripResult.conservative_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Toggle and Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              id="full-trip"
              checked={props.showFullTrip}
              onCheckedChange={props.onToggleFullTrip}
            />
            <Label htmlFor="full-trip" className="cursor-pointer">
              Show Full Trip (including ground travel to/from airports)
            </Label>
          </div>
          <Button onClick={props.onNewCalculation} variant="outline">
            New Calculation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
