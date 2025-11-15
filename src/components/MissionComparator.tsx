import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plane, Clock, Fuel, DollarSign, Award } from 'lucide-react';
import { compareMissions, formatTime, formatCost } from '@/lib/flightCalculations';
import { ComparisonResult } from '@/types/aircraft';
import { DEFAULT_CONFIG } from '@/types/aircraft';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { GeocodeResult, geocodeRoute } from '@/lib/geocoding';

export function MissionComparator() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromLocation, setFromLocation] = useState<GeocodeResult | undefined>();
  const [toLocation, setToLocation] = useState<GeocodeResult | undefined>();
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        const element = resultsRef.current;
        if (element) {
          const absoluteElementTop = element.getBoundingClientRect().top + window.scrollY;
          const offset = 100; // Small fixed offset for breathing room
          window.scrollTo({ top: absoluteElementTop - offset, behavior: 'smooth' });
        }
      }, 150);
    }
  }, [result]);

  const handleCompare = async () => {
    if (!fromLocation || !toLocation || fromLocation.placeId === 0 || toLocation.placeId === 0) {
      alert('Please select valid locations from the suggestions');
      return;
    }
    
    setLoading(true);
    setResult(null); // Clear previous results immediately
    
    try {
      const route = await geocodeRoute(fromLocation, toLocation);
      
      // Load config from localStorage to get latest admin values
      const savedConfig = localStorage.getItem('aircraftConfig');
      const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
      
      const comparison = compareMissions(
        route.distance,
        1,
        0,
        config.sr22,
        config.jet,
        config.headwindKts
      );
      setResult(comparison);
    } catch (error) {
      console.error('Route calculation error:', error);
      alert('Failed to calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canCompare = fromLocation && toLocation && fromLocation.placeId > 0 && toLocation.placeId > 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 gradient-sky">
      <div className="max-w-6xl w-full space-y-8 animate-slide-up">
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-display font-bold text-primary">
            Mission Match
          </h1>
          <p className="text-xl text-muted-foreground">
            Which Cirrus wins your trip?
          </p>
        </div>

        <Card className="p-8 shadow-elevated">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <LocationAutocomplete
              value={from}
              onChange={setFrom}
              onLocationSelect={setFromLocation}
              placeholder="Enter city or address"
              label="From"
              selectedLocation={fromLocation}
            />
            <LocationAutocomplete
              value={to}
              onChange={setTo}
              onLocationSelect={setToLocation}
              placeholder="Enter city or address"
              label="To"
              selectedLocation={toLocation}
            />
          </div>

          <Button
            onClick={handleCompare}
            disabled={!canCompare || loading}
            className="w-full h-14 text-lg font-semibold gradient-accent hover:opacity-90 transition-smooth"
          >
            {loading ? 'Calculating...' : 'Compare!'}
          </Button>
        </Card>

        {result && (
          <div className="grid grid-cols-2 gap-8 animate-scale-in" ref={resultsRef}>
            {/* SR22 Card */}
            <Card className="p-8 border-2 border-sr22 shadow-elevated hover:shadow-2xl transition-smooth">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-display font-bold text-sr22">SR22</h3>
                    <p className="text-sm text-muted-foreground">Piston Power</p>
                  </div>
                  <Plane className="w-12 h-12 text-sr22 sr22-glow" />
                </div>

                <div className="space-y-4">
                  <MetricRow icon={Clock} label="Flight Time" value={formatTime(result.sr22.time)} />
                  <MetricRow icon={Fuel} label="Fuel Used" value={`${result.sr22.fuel} gal`} />
                  <MetricRow icon={DollarSign} label="Trip Cost" value={formatCost(result.sr22.cost)} />
                  {result.sr22.stops > 0 && (
                    <div className="text-sm text-warning flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {result.sr22.stops} fuel stop{result.sr22.stops > 1 ? 's' : ''} needed
                    </div>
                  )}
                  {result.sr22.stops === 0 && (
                    <div className="text-sm text-success flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Nonstop capable
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Vision Jet Card */}
            <Card className="p-8 border-2 border-jet shadow-elevated hover:shadow-2xl transition-smooth">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-display font-bold text-jet">Vision Jet</h3>
                    <p className="text-sm text-muted-foreground">Jet Performance</p>
                  </div>
                  <Plane className="w-12 h-12 text-jet jet-glow" />
                </div>

                <div className="space-y-4">
                  <MetricRow icon={Clock} label="Flight Time" value={formatTime(result.jet.time)} />
                  <MetricRow icon={Fuel} label="Fuel Used" value={`${result.jet.fuel} gal`} />
                  <MetricRow icon={DollarSign} label="Trip Cost" value={formatCost(result.jet.cost)} />
                  {result.jet.stops > 0 && (
                    <div className="text-sm text-warning flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {result.jet.stops} fuel stop{result.jet.stops > 1 ? 's' : ''} needed
                    </div>
                  )}
                  {result.jet.stops === 0 && (
                    <div className="text-sm text-success flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Nonstop? You bet.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {result && (
          <Card className="p-6 bg-primary text-primary-foreground shadow-elevated animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Award className="w-8 h-8" />
                <div>
                  <h3 className="text-2xl font-display font-bold">
                    {result.winner === 'VisionJet' && `Jet wins — saves ${formatTime(result.timeSaved)}`}
                    {result.winner === 'SR22' && 'SR22 holds its own on this one!'}
                    {result.winner === 'tie' && 'Close match — both are great choices!'}
                  </h3>
                  <p className="text-sm opacity-90">
                    Cost difference: {formatCost(Math.abs(result.costDifference))}
                    {result.costDifference > 0 ? ' more for the Jet' : ' more for the SR22'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
