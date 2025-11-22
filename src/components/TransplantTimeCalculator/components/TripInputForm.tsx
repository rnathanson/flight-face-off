import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { GeocodeResult } from '@/lib/geocoding';
import { CalendarIcon, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TripInputFormProps {
  originHospital: string;
  onOriginChange: (value: string) => void;
  destinationHospital: string;
  onDestinationChange: (value: string) => void;
  selectedOrigin: GeocodeResult | null;
  selectedDestination: GeocodeResult | null;
  onOriginSelect: (location: GeocodeResult) => void;
  onDestinationSelect: (location: GeocodeResult) => void;
  departureDate: Date;
  onDepartureDateChange: (date: Date) => void;
  departureTime: string;
  onDepartureTimeChange: (time: string) => void;
  passengerCount: number;
  onPassengerCountChange: (count: number) => void;
  calculating: boolean;
  onCalculate: () => void;
}

export function TripInputForm(props: TripInputFormProps) {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Plane className="h-6 w-6" />
          Calculate Trip Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Origin */}
          <div>
            <LocationAutocomplete
              value={props.originHospital}
              onChange={props.onOriginChange}
              onLocationSelect={props.onOriginSelect}
              placeholder="Enter hospital name or airport code (e.g., FRG, KFRG)"
              label="Pickup Location (Hospital or Airport)"
              selectedLocation={props.selectedOrigin}
            />
          </div>

          {/* Destination */}
          <div>
            <LocationAutocomplete
              value={props.destinationHospital}
              onChange={props.onDestinationChange}
              onLocationSelect={props.onDestinationSelect}
              placeholder="Enter hospital name or airport code (e.g., JFK, KJFK)"
              label="Delivery Location (Hospital or Airport)"
              selectedLocation={props.selectedDestination}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Departure Date */}
          <div className="space-y-2">
            <Label>Departure Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !props.departureDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {props.departureDate ? format(props.departureDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={props.departureDate}
                  onSelect={(date) => date && props.onDepartureDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Departure Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Departure Time</Label>
            <Input
              id="time"
              type="time"
              value={props.departureTime}
              onChange={(e) => props.onDepartureTimeChange(e.target.value)}
            />
          </div>
        </div>

        {/* Passenger Count */}
        <div className="space-y-2">
          <Label>Number of Passengers: {props.passengerCount}</Label>
          <Slider
            value={[props.passengerCount]}
            onValueChange={(value) => props.onPassengerCountChange(value[0])}
            min={1}
            max={6}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Including medical personnel and crew
          </p>
        </div>

        {/* Calculate Button */}
        <Button
          onClick={props.onCalculate}
          disabled={!props.selectedOrigin || !props.selectedDestination || props.calculating}
          className="w-full"
          size="lg"
        >
          {props.calculating ? 'Calculating...' : 'Calculate Trip Time'}
        </Button>
      </CardContent>
    </Card>
  );
}
