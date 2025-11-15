import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plane, Award, CheckCircle2, Fuel } from 'lucide-react';
import { compareMissions, formatTime } from '@/lib/flightCalculations';
import { ComparisonResult } from '@/types/aircraft';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { GeocodeResult } from '@/lib/geocoding';
import { useConfig } from '@/context/ConfigContext';
import nassauFlyersLogo from '@/assets/nassau-flyers-logo.webp';

const CIRRUS_HQ: GeocodeResult = {
  lat: 46.8371,
  lon: -92.1836,
  displayName: 'Duluth, Minnesota, United States',
  placeId: 1,
};

export function JetChallenge() {
  const { config } = useConfig();
  const [destination, setDestination] = useState('');
  const [destinationLocation, setDestinationLocation] = useState<GeocodeResult | undefined>();
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [animating, setAnimating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (result && !animating && resultsRef.current) {
      setTimeout(() => {
        const element = resultsRef.current;
        if (element) {
          const absoluteElementTop = element.getBoundingClientRect().top + window.scrollY;
          const offset = 100; // Small fixed offset for breathing room
          window.scrollTo({ top: absoluteElementTop - offset, behavior: 'smooth' });
        }
      }, 150);
    }
  }, [result, animating]);

  const handleChallenge = async () => {
    if (!destinationLocation || destinationLocation.placeId === 0) {
      alert('Please select a valid destination from the suggestions');
      return;
    }
    
    setAnimating(true);
    setResult(null);
    
    try {
      // Calculate distance from Cirrus HQ to destination
      const distance = calculateDistance(
        CIRRUS_HQ.lat,
        CIRRUS_HQ.lon,
        destinationLocation.lat,
        destinationLocation.lon
      );
      
      // Add realistic animation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const comparison = compareMissions(distance, 1, 0, config.sr22, config.jet, config.headwindKts);
      setResult(comparison);
    } catch (error) {
      console.error('Challenge calculation error:', error);
      alert('Failed to calculate challenge. Please try again.');
      setResult(null);
    } finally {
      setAnimating(false);
    }
  };

  const canChallenge = destinationLocation && destinationLocation.placeId > 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 gradient-light">
      <div className="max-w-6xl w-full space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          <img src={nassauFlyersLogo} alt="Nassau Flyers" className="h-12 md:h-16 lg:h-20 mx-auto mb-2" />
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-primary">
            JET CHALLENGE
          </h1>
          <p className="text-base md:text-xl text-muted-foreground tracking-wide">
            COULD THE JET MAKE IT NONSTOP FROM DULUTH, MN?
          </p>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            Presented by Nassau Flyers • Cirrus Platinum Training Center
          </p>
        </div>

        <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
          <div className="space-y-6">
            <LocationAutocomplete
              value={destination}
              onChange={setDestination}
              onLocationSelect={setDestinationLocation}
              placeholder="Enter any destination"
              label="Where do you want to go?"
              selectedLocation={destinationLocation}
            />

            <Button
              onClick={handleChallenge}
              disabled={!canChallenge || animating}
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold gradient-accent hover:shadow-glow transition-smooth uppercase tracking-wider"
            >
              {animating ? 'Calculating Flight...' : "Let's See!"}
            </Button>
          </div>
        </Card>

        {animating && (
          <div className="flex items-center justify-center py-16 animate-scale-in">
            <div className="relative">
              <Plane className="w-24 h-24 text-jet jet-glow animate-pulse" />
              <p className="text-center mt-4 text-lg font-medium text-muted-foreground">
                Planning your route...
              </p>
            </div>
          </div>
        )}

        {result && !animating && (
          <div className="space-y-6 animate-scale-in" ref={resultsRef}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Vision Jet Result */}
              <Card className={`p-4 md:p-6 lg:p-8 border-2 shadow-elevated bg-card ${
                result.jet.canMakeIt ? 'border-jet bg-jet/5' : 'border-warning bg-warning/5'
              }`}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-jet uppercase">Vision Jet</h3>
                      <p className="text-sm text-muted-foreground">SF50 G2+</p>
                    </div>
                    <Plane className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-jet jet-glow" />
                  </div>

                  <div className="space-y-4">
                    {result.jet.canMakeIt ? (
                      <div className="flex items-start gap-3 p-5 bg-success/10 border border-success/30 rounded-lg">
                        <CheckCircle2 className="w-7 h-7 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-lg text-success uppercase">Nonstop capable!</p>
                          <p className="text-sm text-muted-foreground">
                            Flight time: {formatTime(result.jet.time)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-5 bg-warning/10 border border-warning/30 rounded-lg">
                        <Fuel className="w-7 h-7 text-warning flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-lg text-warning uppercase">
                            {result.jet.stops} fuel stop needed
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total time: {formatTime(result.jet.time)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>Runway compatible</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* SR22 Result */}
              <Card className={`p-4 md:p-6 lg:p-8 border-2 shadow-elevated bg-card ${
                result.sr22.canMakeIt ? 'border-sr22 bg-sr22/5' : 'border-warning bg-warning/5'
              }`}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-sr22 uppercase">SR22</h3>
                      <p className="text-sm text-muted-foreground">G7+ GTS</p>
                    </div>
                    <Plane className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-sr22 sr22-glow" />
                  </div>

                  <div className="space-y-4">
                    {result.sr22.canMakeIt ? (
                      <div className="flex items-start gap-3 p-5 bg-success/10 border border-success/30 rounded-lg">
                        <CheckCircle2 className="w-7 h-7 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-lg text-success uppercase">Can make it nonstop</p>
                          <p className="text-sm text-muted-foreground">
                            Flight time: {formatTime(result.sr22.time)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-5 bg-warning/10 border border-warning/30 rounded-lg">
                        <Fuel className="w-7 h-7 text-warning flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-lg text-warning uppercase">
                            {result.sr22.stops} fuel stop{result.sr22.stops > 1 ? 's' : ''} needed
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total time: {formatTime(result.sr22.time)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>Runway compatible</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Winner Banner */}
            <Card className="p-4 md:p-6 lg:p-8 gradient-accent text-white shadow-elevated">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
                <Award className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex-shrink-0" />
                <div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold mb-2 uppercase">
                    {result.jet.stops < result.sr22.stops && 'Jet Wins This One!'}
                    {result.jet.stops === result.sr22.stops && result.jet.stops === 0 && 'Both Can Make It!'}
                    {result.jet.stops === result.sr22.stops && result.jet.stops > 0 && 'Close Call!'}
                    {result.jet.stops > result.sr22.stops && 'SR22 Holds Strong!'}
                  </h3>
                  <p className="text-xl opacity-90">
                    {result.jet.stops === 0 && result.sr22.stops > 0 && 
                      `Jet flies nonstop while SR22 needs ${result.sr22.stops} stop${result.sr22.stops > 1 ? 's' : ''}. Time saved: ${formatTime(result.timeSaved)}`
                    }
                    {result.jet.stops === 0 && result.sr22.stops === 0 && 
                      `Both aircraft can make this trip nonstop! Jet saves ${formatTime(result.timeSaved)}.`
                    }
                    {result.jet.stops > 0 && 
                      'This mission exceeds single-stop range for the Jet.'
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {!result && !animating && (
          <div className="text-center py-16 space-y-6">
            <Plane className="w-20 h-20 text-muted-foreground mx-auto opacity-50" />
            <p className="text-lg text-muted-foreground">
              Enter a destination to see how the aircraft compare!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
