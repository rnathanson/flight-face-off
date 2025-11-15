import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plane, Clock, Fuel, DollarSign, Award, Gauge, Target, X, Users, Luggage } from 'lucide-react';
import { compareMissions, formatTime, formatCost, calculateAvailableFuel } from '@/lib/flightCalculations';
import { ComparisonResult } from '@/types/aircraft';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { FlightPathVisualization } from '@/components/FlightPathVisualization';
import { PerformanceBar } from '@/components/PerformanceBar';
import { GeocodeResult, geocodeRoute } from '@/lib/geocoding';
import { useConfig } from '@/context/ConfigContext';
import { PartnershipCTA } from '@/components/FloatingPartnershipCTA';
import nassauFlyersLogo from '@/assets/nassau-flyers-logo.webp';
export function EnhancedMissionComparator() {
  const [from, setFrom] = useState('Farmingdale, New York');
  const [to, setTo] = useState('');
  const [fromLocation, setFromLocation] = useState<GeocodeResult | undefined>({
    displayName: 'Farmingdale, New York',
    lat: 40.7324,
    lon: -73.4454,
    placeId: 1
  });
  const [toLocation, setToLocation] = useState<GeocodeResult | undefined>();
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(0);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shimmerOnce, setShimmerOnce] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Use centralized config from context
  const { config } = useConfig();

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

  // Remove shimmer class after animation
  useEffect(() => {
    if (shimmerOnce) {
      const timer = setTimeout(() => setShimmerOnce(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [shimmerOnce]);
  const handleCompare = async () => {
    if (!fromLocation || !toLocation || fromLocation.placeId === 0 || toLocation.placeId === 0) {
      alert('Please select valid locations from the suggestions');
      return;
    }

    // Reset animation states but keep showing results section
    setResult(null);
    setDistance(0);
    setShowVerdict(false);
    setShowAnimation(false);
    setShimmerOnce(true);
    setLoading(true);
    
    try {
      const route = await geocodeRoute(fromLocation, toLocation);
      setDistance(route.distance);

      const comparison = compareMissions(route.distance, passengers, bags, config.sr22, config.jet, config.headwindKts);
      setResult(comparison);

      // Start animation
      setShowAnimation(true);
    } catch (error) {
      console.error('Route calculation error:', error);
      alert('Failed to calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canCompare = fromLocation && toLocation && fromLocation.placeId > 0 && toLocation.placeId > 0;

  // Calculate additional metrics
  const costPerNM = result ? {
    sr22: result.sr22.cost / distance,
    jet: result.jet.cost / distance
  } : null;
  const fuelEfficiency = result ? {
    sr22: result.sr22.fuel / distance,
    jet: result.jet.fuel / distance
  } : null;

  // Calculate available fuel for each aircraft based on weight
  const sr22AvailableFuel = result ? calculateAvailableFuel(config.sr22, passengers, bags) : 0;
  const jetAvailableFuel = result ? calculateAvailableFuel(config.jet, passengers, bags) : 0;

  // Calculate mission payload for Vision Jet
  const jetPayload = passengers * config.jet.avgPersonWeight + bags * config.jet.avgBagWeight;
  return <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 gradient-light">
      <div className="max-w-7xl w-full space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-primary">Your mission. Your Cirrus</h1>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground">Compare the SR22 and SF50 for your mission, balancing speed, comfort, capability, and cost.</p>
          
        </div>

        <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <LocationAutocomplete value={from} onChange={setFrom} onLocationSelect={setFromLocation} placeholder="Enter city or address" label="From" selectedLocation={fromLocation} />
            <LocationAutocomplete value={to} onChange={setTo} onLocationSelect={setToLocation} placeholder="Enter city or address" label="To" selectedLocation={toLocation} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Passengers (including pilot)
                </label>
                <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                  {passengers}
                </Badge>
              </div>
              <Slider
                value={[passengers]}
                onValueChange={(value) => setPassengers(value[0])}
                min={1}
                max={7}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>7</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Luggage className="w-4 h-4" />
                  Bags
                </label>
                <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                  {bags}
                </Badge>
              </div>
              <Slider
                value={[bags]}
                onValueChange={(value) => setBags(value[0])}
                min={0}
                max={7}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>7</span>
              </div>
            </div>
          </div>

          <Button onClick={handleCompare} disabled={!canCompare || loading} className="w-full h-14 md:h-16 text-lg md:text-xl font-bold gradient-accent hover:shadow-glow transition-smooth uppercase tracking-wider text-foreground">
            {loading ? 'Calculating...' : 'Compare Missions'}
          </Button>
        </Card>

        {result && (
      // Only show results if at least one aircraft can make it
      !result.sr22.canMakeIt && !result.jet.canMakeIt ? <Card className="p-8 bg-destructive/10 border-destructive shadow-elevated animate-scale-in">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-display font-bold text-destructive mb-2 uppercase">
                  Mission Not Possible
                </h3>
                <p className="text-muted-foreground">
                  Neither aircraft can handle this load. Please reduce passengers or bags.
                </p>
                <Button onClick={() => { setResult(null); setTo(''); setToLocation(undefined); }} variant="outline" className="mt-4">
                  Try Different Mission
                </Button>
              </div>
            </Card> : <div className="space-y-6" ref={resultsRef}>
            
            {/* Flight Path Visualization - Combined */}
            {showAnimation && (
              <div className="animate-scale-in">
                <FlightPathVisualization from={fromLocation.displayName} to={toLocation.displayName} distance={distance} sr22Stops={result.sr22.canMakeIt ? result.sr22.stops : -1} jetStops={result.jet.canMakeIt ? result.jet.stops : -1} sr22Range={sr22AvailableFuel > 0 ? sr22AvailableFuel * 0.8 / config.sr22.fuelFlow * (config.sr22.cruiseSpeed - config.headwindKts) : 0} jetRange={jetAvailableFuel > 0 ? jetAvailableFuel * 0.8 / config.jet.fuelFlow * (config.jet.cruiseSpeed - config.headwindKts) : 0} showAnimation={showAnimation} onAnimationComplete={() => setShowVerdict(true)} />
              </div>
            )}

            {/* Verdict - Moved below timeline - Only show after animation */}
            {showVerdict && <Card className={`p-4 md:p-6 lg:p-8 text-white shadow-elevated animate-scale-in ${shimmerOnce ? 'shimmer-once' : ''} ${result.isCloseCall ? 'bg-accent' : result.winner === 'VisionJet' ? 'bg-[hsl(217,40%,58%)]' : result.winner === 'SR22' ? 'bg-[hsl(180,38%,65%)]' : 'gradient-accent'}`}>
                <div className="flex flex-col gap-6">
                  {result.isCloseCall ? <>
                      <div className="flex items-center justify-center gap-4">
                        <Gauge className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20" />
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold uppercase">Close Call</h3>
                      </div>
                      <p className="text-center text-white/90 text-base">
                        Both aircraft handle this mission well — your choice depends on what you value:
                      </p>
                      <div className="grid grid-cols-2 gap-8 mt-4">
                        <div className="text-center space-y-2">
                          <p className="font-bold text-xl">Vision Jet: More Capability</p>
                          <p className="text-white/90 text-sm">Premium cabin, more capable, seats more</p>
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-bold text-xl">SR22: Lower Cost</p>
                          <p className="text-white/90 text-sm">More airports, efficient</p>
                        </div>
                      </div>
                    </> : <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
                      <Gauge className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex-shrink-0" />
                      <div>
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold mb-3 uppercase">
                          {result.winner === 'VisionJet' ? `Jet wins — saves ${formatTime(result.timeSaved)}` : result.winner === 'SR22' ? 'SR22 wins — Best value for this mission!' : "It's a close call!"}
                        </h3>
                      </div>
                    </div>}
                </div>
              </Card>}

            {/* Performance Comparison Bars */}
            <Card className="p-4 md:p-6 shadow-elevated bg-card animate-scale-in">
              <h3 className="text-xl font-display font-bold mb-6 text-center uppercase">Performance Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <PerformanceBar label="Speed (knots)" sr22Value={183} jetValue={300} unit="kts" />
                <PerformanceBar label="Cost per Mile" sr22Value={parseFloat(costPerNM!.sr22.toFixed(2))} jetValue={parseFloat(costPerNM!.jet.toFixed(2))} unit="$/nm" lowerIsBetter />
              </div>
            </Card>

            {/* Aircraft Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-scale-in">
              {/* SR22 Card */}
              <Card className="p-4 md:p-6 lg:p-8 border-2 border-sr22 shadow-elevated hover:shadow-2xl transition-smooth bg-card relative overflow-hidden">
                {/* Not Viable Overlay */}
                {!result.sr22.canMakeIt && <div className="absolute inset-0 bg-destructive/90 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <X className="w-32 h-32 text-white" strokeWidth={4} />
                      <p className="text-2xl font-bold text-white uppercase tracking-wider">Cannot complete mission</p>
                    </div>
                  </div>}
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-display font-bold text-sr22 uppercase">SR22</h3>
                      <p className="text-sm text-muted-foreground">G7+ Piston</p>
                    </div>
                    <Plane className="w-12 h-12 md:w-16 md:h-16 text-sr22 sr22-glow" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard icon={Clock} label="Time" value={formatTime(result.sr22.time)} />
                    <MetricCard icon={Fuel} label="Fuel" value={`${result.sr22.fuel} gal`} />
                    <MetricCard icon={DollarSign} label="Cost" value={formatCost(result.sr22.cost)} />
                    <MetricCard icon={Target} label="$/NM" value={`$${costPerNM!.sr22.toFixed(2)}`} />
                  </div>

                  {result.sr22.stops > 0 && result.sr22.canMakeIt && <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-2 text-warning">
                      <Award className="w-5 h-5" />
                      <span className="text-sm font-semibold">{result.sr22.stops} fuel stop{result.sr22.stops > 1 ? 's' : ''} needed</span>
                    </div>}
                  {result.sr22.stops === 0 && result.sr22.canMakeIt && (result.sr22.fuelMarginPercent !== undefined && result.sr22.fuelMarginPercent >= 5 ? <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2 text-success">
                        <Award className="w-5 h-5" />
                        <span className="text-sm font-semibold">Nonstop? You bet.</span>
                      </div> : <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-2 text-warning">
                        <Award className="w-5 h-5" />
                        <span className="text-sm font-semibold">Possibly nonstop</span>
                      </div>)}
                </div>
              </Card>

              {/* Vision Jet Card */}
              <Card className="p-4 md:p-6 lg:p-8 border-2 border-jet shadow-elevated hover:shadow-2xl transition-smooth bg-card relative overflow-hidden">
                {/* Not Viable Overlay */}
                {!result.jet.canMakeIt && <div className="absolute inset-0 bg-destructive/90 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <X className="w-32 h-32 text-white" strokeWidth={4} />
                      <p className="text-2xl font-bold text-white uppercase tracking-wider">Cannot complete mission</p>
                    </div>
                  </div>}
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-display font-bold text-jet uppercase">Vision Jet</h3>
                      <p className="text-sm text-muted-foreground">SF50 G2+ Jet</p>
                    </div>
                    <Plane className="w-12 h-12 md:w-16 md:h-16 text-jet jet-glow" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard icon={Clock} label="Time" value={formatTime(result.jet.time)} />
                    <MetricCard icon={Fuel} label="Fuel" value={`${result.jet.fuel} gal`} />
                    <MetricCard icon={DollarSign} label="Cost" value={formatCost(result.jet.cost)} />
                    <MetricCard icon={Target} label="$/NM" value={`$${costPerNM!.jet.toFixed(2)}`} />
                  </div>

                  {result.jet.stops > 0 && result.jet.canMakeIt && <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-2 text-warning">
                      <Award className="w-5 h-5" />
                      <span className="text-sm font-semibold">{result.jet.stops} fuel stop{result.jet.stops > 1 ? 's' : ''} needed</span>
                    </div>}
                  {result.jet.stops === 0 && result.jet.canMakeIt && (result.jet.fuelMarginPercent !== undefined && result.jet.fuelMarginPercent >= 5 ? <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2 text-success">
                        <Award className="w-5 h-5" />
                        <span className="text-sm font-semibold">Nonstop? You bet.</span>
                      </div> : <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-2 text-warning">
                        <Award className="w-5 h-5" />
                        <span className="text-sm font-semibold">Possibly nonstop</span>
                      </div>)}
                </div>
              </Card>
            </div>

            {/* Inline CTA */}
            <PartnershipCTA variant="inline" />
          </div>)}
      </div>
    </div>;
}
function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return <div className="p-4 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>;
}