import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, Plane } from 'lucide-react';
import { RacingVisualization } from '@/components/RacingVisualization';
import { calculateDistance, formatTime } from '@/lib/flightCalculations';
import nassauFlyersLogo from '@/assets/nassau-flyers-logo.webp';
interface Destination {
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  description: string;
  tripType: string;
}
const FARMINGDALE = {
  lat: 40.7324,
  lon: -73.4454
};
const POPULAR_DESTINATIONS: Destination[] = [{
  name: 'Miami',
  city: 'Miami',
  state: 'Florida',
  lat: 25.7617,
  lon: -80.1918,
  description: 'South Beach weekend getaway',
  tripType: 'Weekend Trip'
}, {
  name: 'Chicago',
  city: 'Chicago',
  state: 'Illinois',
  lat: 41.8781,
  lon: -87.6298,
  description: 'Business meeting in the Loop',
  tripType: 'Day Trip'
}, {
  name: "Martha's Vineyard",
  city: "Martha's Vineyard",
  state: 'Massachusetts',
  lat: 41.3893,
  lon: -70.6065,
  description: 'Island escape',
  tripType: 'Weekend Trip'
}, {
  name: 'Charleston',
  city: 'Charleston',
  state: 'South Carolina',
  lat: 32.7765,
  lon: -79.9311,
  description: 'Historic downtown exploration',
  tripType: 'Long Weekend'
}, {
  name: 'Mackinac Island',
  city: 'Mackinac Island',
  state: 'Michigan',
  lat: 45.8491,
  lon: -84.6173,
  description: 'Summer family vacation',
  tripType: 'Week Trip'
}, {
  name: 'Nantucket',
  city: 'Nantucket',
  state: 'Massachusetts',
  lat: 41.2835,
  lon: -70.0995,
  description: 'Quick island hop',
  tripType: 'Day Trip'
}];
export function SpeedGallery() {
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const calculateTimes = (destination: Destination) => {
    const distance = calculateDistance(FARMINGDALE.lat, FARMINGDALE.lon, destination.lat, destination.lon);

    // SR22: 183 kts cruise (with 5kt headwind = 178 kts ground speed)
    const sr22Time = Math.round(distance / 178 * 60);

    // Vision Jet: 300 kts cruise (with 5kt headwind = 295 kts ground speed)
    const jetTime = Math.round(distance / 295 * 60);

    // Commercial: 500 kts + 4 hour overhead
    const commercialFlightTime = Math.round(distance / 500 * 60);
    const commercialTime = commercialFlightTime + 240; // 4 hour overhead

    // Driving: 60 mph average (convert nm to statute miles)
    const drivingTime = Math.round(distance * 1.15078 / 60 * 60);
    return {
      distance: Math.round(distance),
      sr22Time,
      jetTime,
      commercialTime,
      drivingTime
    };
  };
  return <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 gradient-light">
      <div className="max-w-7xl w-full space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-primary">
            SPEED GALLERY
          </h1>
          <p className="text-base md:text-xl text-muted-foreground tracking-wide">
            SEE THE SPEED ADVANTAGE IN ACTION
          </p>
          <p className="text-sm text-muted-foreground">
            Popular destinations from Farmingdale (KFRG)
          </p>
        </div>

        {!selectedDestination ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {POPULAR_DESTINATIONS.map(destination => {
          const times = calculateTimes(destination);
          return <Card key={destination.name} className="p-4 md:p-6 shadow-elevated bg-card hover:shadow-glow transition-smooth cursor-pointer group" onClick={() => setSelectedDestination(destination)}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-primary group-hover:text-accent transition-smooth">
                          {destination.city}
                        </h3>
                        <p className="text-sm text-muted-foreground">{destination.state}</p>
                      </div>
                      <MapPin className="w-6 h-6 text-accent" />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {destination.description}
                    </p>

                    <div className="pt-4 border-t border-border space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Plane className="w-4 h-4 text-jet rotate-90" />
                        <span className="text-muted-foreground">Vision Jet:</span>
                        <span className="font-bold text-jet">{formatTime(times.jetTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Plane className="w-4 h-4 text-sr22 rotate-90" />
                        <span className="text-muted-foreground">SR22:</span>
                        <span className="font-bold text-sr22">{formatTime(times.sr22Time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Commercial:</span>
                        <span className="font-bold">{formatTime(times.commercialTime)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full">
                        {destination.tripType}
                      </span>
                    </div>
                  </div>
                </Card>;
        })}
          </div> : <div className="space-y-6 animate-scale-in">
            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">
                    Farmingdale → {selectedDestination.city}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {calculateTimes(selectedDestination).distance} nm • {selectedDestination.tripType}
                  </p>
                </div>
                <button onClick={() => setSelectedDestination(null)} className="w-full md:w-auto px-6 py-3 bg-muted hover:bg-muted/80 rounded-lg font-semibold transition-smooth">
                  ← Back
                </button>
              </div>

              <RacingVisualization sr22Time={calculateTimes(selectedDestination).sr22Time} jetTime={calculateTimes(selectedDestination).jetTime} commercialTime={calculateTimes(selectedDestination).commercialTime} distance={calculateTimes(selectedDestination).distance} showCommercial={true} autoStart={false} />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 md:p-6 bg-card shadow-elevated">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-jet">
                    <Plane className="w-6 h-6 rotate-90" />
                    <span className="font-bold text-sm">Vision Jet</span>
                  </div>
                  <p className="text-3xl font-bold text-jet">
                    {formatTime(calculateTimes(selectedDestination).jetTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">300 kts cruise</p>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-card shadow-elevated">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sr22">
                    <Plane className="w-6 h-6 rotate-90" />
                    <span className="font-bold text-sm">SR22 G7+</span>
                  </div>
                  <p className="text-3xl font-bold text-sr22">
                    {formatTime(calculateTimes(selectedDestination).sr22Time)}
                  </p>
                  <p className="text-xs text-muted-foreground">183 kts cruise</p>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-card shadow-elevated">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Plane className="w-6 h-6 rotate-90" />
                    <span className="font-bold text-sm">Commercial</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {formatTime(calculateTimes(selectedDestination).commercialTime)}
                  </p>
                  <p className="text-xs text-destructive">+4hr overhead</p>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-card shadow-elevated">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-6 h-6" />
                    <span className="font-bold text-sm">Driving</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {formatTime(calculateTimes(selectedDestination).drivingTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">60 mph avg</p>
                </div>
              </Card>
            </div>

            <Card className="p-4 md:p-6 lg:p-8 gradient-accent text-white shadow-elevated">
              <div className="text-center space-y-3">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold uppercase">
                  The Vision Jet saves {formatTime(calculateTimes(selectedDestination).commercialTime - calculateTimes(selectedDestination).jetTime)}
                </h3>
                <p className="text-base md:text-lg opacity-90">
                  Leave when you want. Arrive refreshed. No TSA lines, no connections, no hassle.
                </p>
              </div>
            </Card>
          </div>}
      </div>
    </div>;
}