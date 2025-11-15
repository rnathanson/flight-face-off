import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, DollarSign, Users, Briefcase, TrendingUp, AlertCircle } from 'lucide-react';
import { compareMissions, formatTime, formatCost, calculateCommercialFlight, calculateDriving, calculateDrivingFromRoute } from '@/lib/flightCalculations';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { RacingVisualization } from '@/components/RacingVisualization';
import { GeocodeResult, geocodeRoute } from '@/lib/geocoding';
import { getRouteDriving } from '@/lib/routing';
import { useConfig } from '@/context/ConfigContext';
import { PartnershipCTA } from '@/components/FloatingPartnershipCTA';
import nassauFlyersLogo from '@/assets/nassau-flyers-logo.webp';
export function TimeMoneyCalculator() {
  const {
    config
  } = useConfig();
  const [from, setFrom] = useState('Farmingdale, New York');
  const [to, setTo] = useState('');
  const [fromLocation, setFromLocation] = useState<GeocodeResult | undefined>({
    displayName: 'Farmingdale, New York',
    lat: 40.7324,
    lon: -73.4454,
    placeId: 1
  });
  const [toLocation, setToLocation] = useState<GeocodeResult | undefined>();
  const [hourlyRates, setHourlyRates] = useState([300]);
  const [tripsPerYear, setTripsPerYear] = useState([12]);
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(2);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [routeSource, setRouteSource] = useState<'osrm' | 'heuristic'>('heuristic');
  const resultsRef = useRef<HTMLDivElement>(null);

  // Utility function to get role label based on hourly rate
  const getRoleLabel = (rate: number): string => {
    if (rate < 250) return "Associate";
    if (rate < 500) return "Manager";
    if (rate < 850) return "Senior Staff";
    if (rate < 1200) return "Executive";
    return "C-Suite";
  };

  // Update hourly rates array when passengers change
  useEffect(() => {
    if (hourlyRates.length < passengers) {
      // Add new rates at default value
      const newRates = [...hourlyRates];
      while (newRates.length < passengers) {
        newRates.push(300);
      }
      setHourlyRates(newRates);
    } else if (hourlyRates.length > passengers) {
      // Remove excess rates
      setHourlyRates(hourlyRates.slice(0, passengers));
    }
  }, [passengers]);

  // Calculate total hourly value
  const totalHourlyValue = hourlyRates.reduce((sum, rate) => sum + rate, 0);

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        const element = resultsRef.current;
        if (element) {
          const absoluteElementTop = element.getBoundingClientRect().top + window.scrollY;
          const offset = 100; // Small fixed offset for breathing room
          window.scrollTo({
            top: absoluteElementTop - offset,
            behavior: 'smooth'
          });
        }
      }, 150);
    }
  }, [result]);
  const handleCalculate = async () => {
    if (!fromLocation || !toLocation || fromLocation.placeId === 0 || toLocation.placeId === 0) {
      alert('Please select valid locations from the suggestions');
      return;
    }
    setLoading(true);
    setResult(null); // Clear previous results immediately

    try {
      const route = await geocodeRoute(fromLocation, toLocation);
      const gaComparison = compareMissions(route.distance, passengers, bags, config.sr22, config.jet, config.headwindKts);
      const commercial = calculateCommercialFlight(route.distance, passengers, bags);

      // Get real driving route data from OSRM
      const drivingRoute = await getRouteDriving(fromLocation, toLocation);
      setRouteSource(drivingRoute.source);
      const driving = drivingRoute.source === 'osrm' ? calculateDrivingFromRoute(drivingRoute.distanceMiles, drivingRoute.durationMinutes) : calculateDriving(route.distance);

      // Determine if driving is a realistic option (under 6 hours)
      const showDriving = drivingRoute.durationMinutes <= 360;

      // Calculate ROI metrics (compare against the best baseline - either commercial or driving)
      const baseline = showDriving && driving.time < commercial.time ? driving : commercial;
      const sr22TimeSaved = baseline.time - gaComparison.sr22.time;
      const jetTimeSaved = baseline.time - gaComparison.jet.time;
      const sr22TimeValue = sr22TimeSaved / 60 * totalHourlyValue;
      const jetTimeValue = jetTimeSaved / 60 * totalHourlyValue;
      const sr22NetCost = gaComparison.sr22.cost - baseline.cost - sr22TimeValue;
      const jetNetCost = gaComparison.jet.cost - baseline.cost - jetTimeValue;
      const sr22AnnualSavings = -sr22NetCost * tripsPerYear[0];
      const jetAnnualSavings = -jetNetCost * tripsPerYear[0];
      setResult({
        distance: route.distance,
        commercial,
        driving,
        showDriving,
        routeSource: drivingRoute.source,
        sr22: gaComparison.sr22,
        jet: gaComparison.jet,
        sr22TimeSaved,
        jetTimeSaved,
        sr22TimeValue,
        jetTimeValue,
        sr22NetCost,
        jetNetCost,
        sr22AnnualSavings,
        jetAnnualSavings
      });
    } catch (error) {
      console.error('Route calculation error:', error);
      alert('Failed to calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const canCalculate = fromLocation && toLocation && fromLocation.placeId > 0 && toLocation.placeId > 0;
  return <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 gradient-light">
      <div className="max-w-7xl w-full space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-primary">What's your time worth?</h1>
          <p className="text-base md:text-xl text-muted-foreground tracking-wide">See how much time and money you save when you fly Cirrus with Nassau Flyers</p>
        </div>

        <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <LocationAutocomplete value={from} onChange={setFrom} onLocationSelect={setFromLocation} placeholder="Enter city or address" label="From" selectedLocation={fromLocation} />
              <LocationAutocomplete value={to} onChange={setTo} onLocationSelect={setToLocation} placeholder="Enter city or address" label="To" selectedLocation={toLocation} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Passengers
                </label>
                <Input type="number" min="1" max="7" value={passengers} onChange={e => setPassengers(Number(e.target.value))} className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Bags
                </label>
                <Input type="number" min="0" max="10" value={bags} onChange={e => setBags(Number(e.target.value))} className="h-12" />
              </div>
              <div className="sm:col-span-2 lg:col-span-2 space-y-2">
                <label className="text-sm font-medium">Trips per Year</label>
                <div className="flex items-center gap-4">
                  <Slider value={tripsPerYear} onValueChange={setTripsPerYear} min={2} max={50} step={1} className="flex-1" />
                  <span className="text-2xl font-bold text-accent w-16 text-right">{tripsPerYear[0]}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium uppercase tracking-wide">
                  {passengers > 1 ? 'Combined Hourly Business Value' : 'Your Hourly Business Value'}
                </label>
                <span className="text-2xl md:text-3xl font-bold text-accent">{formatCost(totalHourlyValue)}/hr</span>
              </div>

              {passengers === 1 ? <>
                  <Slider value={hourlyRates} onValueChange={setHourlyRates} min={100} max={1500} step={50} className="py-4" />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="uppercase tracking-wider">Associate</span>
                    <span className="text-accent font-medium">{getRoleLabel(hourlyRates[0])}</span>
                    <span className="uppercase tracking-wider">CEO</span>
                  </div>
                </> : <div className="space-y-4">
                  {hourlyRates.map((rate, index) => <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium uppercase tracking-wide">
                          Passenger {index + 1}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{getRoleLabel(rate)}</span>
                          <span className="text-lg font-bold text-accent">{formatCost(rate)}/hr</span>
                        </div>
                      </div>
                      <Slider value={[rate]} onValueChange={value => {
                  const newRates = [...hourlyRates];
                  newRates[index] = value[0];
                  setHourlyRates(newRates);
                }} min={100} max={1500} step={50} className="py-2" />
                    </div>)}
                  
                  {/* Breakdown Summary */}
                  
                </div>}
            </div>

            <Button onClick={handleCalculate} disabled={!canCalculate || loading} className="w-full h-14 md:h-16 text-lg md:text-xl font-bold gradient-accent hover:shadow-glow transition-smooth uppercase tracking-wider">
              {loading ? 'Calculating...' : 'Calculate ROI'}
            </Button>
          </div>
        </Card>

        {result && <div className="space-y-6" ref={resultsRef}>
            {/* Racing Animation */}
            <Card className="p-6 shadow-elevated bg-card animate-scale-in">
              <h3 className="text-xl font-display font-bold mb-4 text-center uppercase">The Race</h3>
              <RacingVisualization sr22Time={result.sr22.time} jetTime={result.jet.time} commercialTime={result.commercial.time} drivingTime={result.showDriving ? result.driving.time : undefined} distance={result.distance} showCommercial={true} showDriving={result.showDriving} autoStart={true} />
            </Card>

            {/* Comparison Grid - 3 or 4 columns depending on driving distance */}
            <div className={`grid gap-6 animate-scale-in ${result.showDriving ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {/* Driving (conditionally shown) */}
              {result.showDriving && <Card className="p-4 md:p-6 shadow-elevated bg-card border-2 border-muted-foreground/20">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-xl md:text-2xl font-bold text-muted-foreground uppercase mb-2">Driving</h3>
                      <p className="text-xs text-muted-foreground">{result.driving.distance} miles</p>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Door-to-Door Time</span>
                        <span className="font-bold">{formatTime(result.driving.time)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cost per Trip</span>
                        <span className="font-bold">{formatCost(result.driving.cost)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Annual Cost</span>
                        <span className="font-bold text-destructive">{formatCost(result.driving.cost * tripsPerYear[0])}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Hassle Factors:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Driver fatigue</li>
                        <li>• Traffic delays</li>
                        <li>• Weather conditions</li>
                        <li>• Rest stops needed</li>
                      </ul>
                    </div>
                  </div>
                </Card>}

              {/* Commercial */}
              <Card className="p-4 md:p-6 shadow-elevated bg-card border-2 border-muted-foreground/20">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl md:text-2xl font-bold text-muted-foreground uppercase mb-2">Commercial</h3>
                    <p className="text-xs text-muted-foreground">Economy Class</p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Door-to-Door Time</span>
                      <span className="font-bold">{formatTime(result.commercial.time)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cost per Trip</span>
                      <span className="font-bold">{formatCost(result.commercial.cost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Cost</span>
                      <span className="font-bold text-destructive">{formatCost(result.commercial.cost * tripsPerYear[0])}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 italic mt-2">
                      Includes ground transport/parking + bag fees
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Hassle Factors:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 4hr overhead (TSA, connections)</li>
                      <li>• No schedule flexibility</li>
                      <li>• Limited baggage</li>
                      <li>• Ground transport delays</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* SR22 */}
              <Card className="p-4 md:p-6 shadow-elevated bg-card border-2 border-sr22/40">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl md:text-2xl font-bold text-sr22 uppercase mb-2">SR22 G7+</h3>
                    <p className="text-xs text-muted-foreground">Piston Aircraft</p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Door-to-Door Time</span>
                      <span className="font-bold">{formatTime(result.sr22.time)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cost per Trip</span>
                      <span className="font-bold">{formatCost(result.sr22.cost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Cost</span>
                      <span className="font-bold text-destructive">{formatCost(result.sr22.cost * tripsPerYear[0])}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Time Saved per Trip</span>
                      <span className="font-bold text-success">+{formatTime(result.sr22TimeSaved)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Time Saved</span>
                      <span className="font-bold text-success">+{formatTime(result.sr22TimeSaved * tripsPerYear[0])}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Time Value (Annual)</span>
                      <span className="font-bold text-success">{formatCost(Math.round(result.sr22TimeValue * tripsPerYear[0]))}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">
                        {result.sr22AnnualSavings > 0 ? 'Net Savings per Trip' : 'Per-Trip Investment'}
                      </span>
                      <span className={`font-bold text-lg ${result.sr22AnnualSavings > 0 ? 'text-success' : 'text-foreground'}`}>
                        {result.sr22AnnualSavings > 0 ? '+' : ''}{formatCost(Math.abs(Math.round(result.sr22AnnualSavings / tripsPerYear[0])))}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Vision Jet */}
              <Card className="p-4 md:p-6 shadow-elevated bg-card border-2 border-jet/40">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl md:text-2xl font-bold text-jet uppercase mb-2">Vision Jet</h3>
                    <p className="text-xs text-muted-foreground">SF50 G2+ Jet</p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Door-to-Door Time</span>
                      <span className="font-bold">{formatTime(result.jet.time)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cost per Trip</span>
                      <span className="font-bold">{formatCost(result.jet.cost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Cost</span>
                      <span className="font-bold text-destructive">{formatCost(result.jet.cost * tripsPerYear[0])}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Time Saved per Trip</span>
                      <span className="font-bold text-success">+{formatTime(result.jetTimeSaved)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Time Saved</span>
                      <span className="font-bold text-success">+{formatTime(result.jetTimeSaved * tripsPerYear[0])}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Time Value (Annual)</span>
                      <span className="font-bold text-success">{formatCost(Math.round(result.jetTimeValue * tripsPerYear[0]))}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">
                        {result.jetAnnualSavings > 0 ? 'Net Savings per Trip' : 'Per-Trip Investment'}
                      </span>
                      <span className={`font-bold text-lg ${result.jetAnnualSavings > 0 ? 'text-success' : 'text-foreground'}`}>
                        {result.jetAnnualSavings > 0 ? '+' : ''}{formatCost(Math.abs(Math.round(result.jetAnnualSavings / tripsPerYear[0])))}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Summary Card */}
            <Card className="p-4 md:p-6 lg:p-8 gradient-accent text-white shadow-elevated animate-scale-in">
              <div className="space-y-4">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold uppercase text-center">
                  {result.jetAnnualSavings > 0 || result.sr22AnnualSavings > 0 ? 'Fly Smarter With Nassau Flyers' : `Save ${Math.round(result.jetTimeSaved * tripsPerYear[0] / 60)} hours annually`}
                </h3>
                <p className="text-base md:text-lg lg:text-xl opacity-90 text-center">
                  {result.jetAnnualSavings > 0 || result.sr22AnnualSavings > 0 ? `Save more than ${formatCost(Math.round(result.jetAnnualSavings))} and ${Math.round(Math.max(result.jetTimeSaved * tripsPerYear[0], result.sr22TimeSaved * tripsPerYear[0]) / 60)} hours a year while boosting your productivity and comfort.` : 'Your time, flexibility & comfort are worth more than the fare difference'}
                </p>
                
                {!(result.jetAnnualSavings > 0 || result.sr22AnnualSavings > 0) && <div className="text-center text-lg opacity-90 pt-2">
                    <p>
                      SR22: {formatCost(Math.abs(Math.round(result.sr22AnnualSavings / tripsPerYear[0])))} per trip • Vision Jet: {formatCost(Math.abs(Math.round(result.jetAnnualSavings / tripsPerYear[0])))} per trip
                    </p>
                  </div>}
                
                <div className="flex items-start gap-3 bg-white/10 p-4 rounded-lg mt-6">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">Tax Advantages for Business Owners:</p>
                    <p className="opacity-90">
                      With Section 179 and bonus depreciation, aircraft ownership offers significant tax advantages. 
                      Consult your tax advisor for details specific to your situation.
                    </p>
                  </div>
                </div>

                {passengers > 1 && <div className="text-center text-sm opacity-90 pt-4 border-t border-white/20">
                    <p className="font-semibold">Productivity Multiplier:</p>
                    <p>
                      {passengers} {passengers > 1 ? 'people' : 'person'} × {formatTime(result.jetTimeSaved)} saved = {formatTime(result.jetTimeSaved * passengers)} of team productivity per trip
                    </p>
                  </div>}
              </div>
            </Card>

            {/* Inline CTA */}
            <PartnershipCTA variant="inline" />
          </div>}
      </div>
    </div>;
}