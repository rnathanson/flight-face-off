import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  calculateScenario, 
  calculateSF50Scenario, 
  applyFractionalOwnership,
  LeasebackInputs,
  SF50Inputs 
} from '@/lib/leasebackCalculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface CalculatorScenario {
  aircraft: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet';
  share: 1 | 0.5 | 0.333 | 0.25;
  aircraftCost: number;
  downPaymentPercent: number;
  loanTermYears: number;
  monthlyHours: number;
  leasebackIncluded: boolean;
  monthlyNetCost: number;
  monthlyGrossCost: number;
  equity3Year: number;
}

interface MiniOwnershipCalculatorProps {
  onScenarioChange: (scenario: CalculatorScenario) => void;
  initialAircraft?: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet';
  initialShare?: 1 | 0.5 | 0.333 | 0.25;
  showLeasebackOption?: boolean;
}

export function MiniOwnershipCalculator({
  onScenarioChange,
  initialAircraft = 'SR22',
  initialShare = 1,
  showLeasebackOption = true
}: MiniOwnershipCalculatorProps) {
  const [aircraft, setAircraft] = useState<'SR20' | 'SR22' | 'SF50' | 'OwnersFleet'>(initialAircraft);
  const [share, setShare] = useState<1 | 0.5 | 0.333 | 0.25>(initialShare);
  const [aircraftCost, setAircraftCost] = useState(aircraft === 'SR22' ? 800000 : 3500000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [loanTermYears, setLoanTermYears] = useState(15);
  const [monthlyHours, setMonthlyHours] = useState(40);
  const [leasebackIncluded, setLeasebackIncluded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<any>(null);

  useEffect(() => {
    // Update aircraft cost and share when aircraft type changes
    if (aircraft === 'SR22') {
      setAircraftCost(800000);
      // SR22 can have 1, 0.5, or 0.25 shares
      if (share === 0.333) setShare(0.25);
    } else if (aircraft === 'SF50') {
      setAircraftCost(3500000);
      // SF50 can only have 0.5, 0.333, or 0.25 shares (default to 0.25)
      if (share === 1) setShare(0.25);
    } else {
      setAircraftCost(1250000); // Owner's Fleet
      // Owner's Fleet can only have 0.5, 0.333, or 0.25 shares (default to 0.25)
      if (share === 1) setShare(0.25);
    }
  }, [aircraft]);

  useEffect(() => {
    // Calculate financing first
    const financing = {
      loanAmount: aircraftCost * (1 - downPaymentPercent / 100),
      downPayment: aircraftCost * (downPaymentPercent / 100),
      monthlyPayment: 0
    };
    
    if (financing.loanAmount > 0) {
      const monthlyRate = 7.5 / 100 / 12;
      const numberOfPayments = loanTermYears * 12;
      financing.monthlyPayment = 
        (financing.loanAmount * monthlyRate) / 
        (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
    }

    let results;
    if (aircraft === 'SR22') {
      const leasebackInputs: LeasebackInputs = {
        aircraftCost,
        downPaymentPercent,
        interestRate: 7.5,
        loanTermYears,
        parkingCost: 200,
        insuranceAnnual: 12000,
        managementFee: 1200,
        subscriptions: 250,
        tciTraining: 0,
        maintenancePerHour: 95,
        pilotServicesRate: 100,
        rentalRevenueRate: 475,
        ownerUsageRate: 190,
        fuelBurnPerHour: 17,
        fuelPricePerGallon: 6.5,
        ownershipShare: share
      };

      const scenario = {
        scenarioType: (leasebackIncluded ? 'leaseback' : 'standard') as 'standard' | 'leaseback',
        rentalHours: leasebackIncluded ? 40 : 0,
        ownerHours: monthlyHours,
        pilotServicesHours: 0
      };

      results = calculateScenario(leasebackInputs, scenario, financing);
    } else {
      // Both SF50 and Owner's Fleet use same calculation logic
      const sf50Inputs: SF50Inputs = {
        aircraftCost,
        downPaymentPercent,
        interestRate: 7.5,
        loanTermYears,
        hangarCost: 800,
        insuranceAnnual: 28000,
        managementFee: 2500,
        subscriptions: 500,
        cleaningMonthly: 0,
        pilotServicesAnnual: 0,
        professionalServicesAnnual: 0,
        pilotPoolContribution: 0,
        jetstreamHourly: 250,
        fuelBurnPerHour: 65,
        fuelPricePerGallon: 6.5,
        typeRatingInitial: 0,
        typeRatingRecurrent: 0,
        ownershipShare: share
      };

      const sf50Scenario = {
        ownerHours: monthlyHours,
        ownerFlown: true,
        pilotServicesHours: 0
      };

      results = calculateSF50Scenario(sf50Inputs, sf50Scenario, financing);
    }

    setCalculatedResults(results);

    // Calculate monthly net cost
    const monthlyNetCost = aircraft === 'SR22' 
      ? Math.abs(results.netMonthlyCashFlow)
      : Math.abs(results.netMonthlyCashFlow);
    
    const monthlyGrossCost = aircraft === 'SR22'
      ? (results.fixedCosts + results.ownerUsageCosts + results.maintenanceCosts + results.debtService)
      : (results.fixedMonthlyCosts + results.variableHourlyCosts + results.debtService);

    const scenario: CalculatorScenario = {
      aircraft,
      share,
      aircraftCost: aircraftCost * share,
      downPaymentPercent,
      loanTermYears,
      monthlyHours,
      leasebackIncluded,
      monthlyNetCost,
      monthlyGrossCost,
      equity3Year: (aircraftCost * 0.85 * share) - (aircraftCost * (downPaymentPercent / 100) * share)
    };

    onScenarioChange(scenario);
  }, [aircraft, share, aircraftCost, downPaymentPercent, loanTermYears, monthlyHours, leasebackIncluded, onScenarioChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="p-6 space-y-6 bg-gradient-to-br from-background to-muted/20">
      <div>
        <h3 className="text-lg font-semibold mb-2">Let's explore a scenario together</h3>
        <p className="text-sm text-muted-foreground">
          This helps you understand the real monthly cost and value of ownership
        </p>
      </div>

      {/* Aircraft Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Aircraft</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={aircraft === 'SR22' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setAircraft('SR22')}
          >
            SR22
          </Button>
          <Button
            variant={aircraft === 'SF50' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setAircraft('SF50')}
          >
            Vision Jet
          </Button>
          <Button
            variant={aircraft === 'OwnersFleet' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setAircraft('OwnersFleet')}
          >
            Owner's Fleet
          </Button>
        </div>
      </div>

      {/* Ownership Share */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Ownership Share</Label>
        <div className="space-y-2">
          {aircraft === 'SR22' ? (
            <>
              <Slider
                value={[share === 1 ? 100 : share === 0.5 ? 50 : 25]}
                onValueChange={(value) => {
                  const val = value[0];
                  if (val >= 75) setShare(1);
                  else if (val >= 37.5) setShare(0.5);
                  else setShare(0.25);
                }}
                min={25}
                max={100}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1/4 Share</span>
                <span>1/2 Share</span>
                <span>Full</span>
              </div>
              <p className="text-center font-semibold">
                {share === 1 ? 'Full Ownership (100%)' : share === 0.5 ? 'Half Share (50%)' : 'Quarter Share (25%)'}
              </p>
            </>
          ) : (
            <>
              <Slider
                value={[share === 0.5 ? 50 : share === 0.333 ? 33 : 25]}
                onValueChange={(value) => {
                  const val = value[0];
                  if (val >= 42) setShare(0.5);
                  else if (val >= 29) setShare(0.333);
                  else setShare(0.25);
                }}
                min={25}
                max={50}
                step={8}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1/4 Share</span>
                <span>1/3 Share</span>
                <span>1/2 Share</span>
              </div>
              <p className="text-center font-semibold">
                {share === 0.5 ? 'Half Share (50%)' : share === 0.333 ? 'Third Share (33%)' : 'Quarter Share (25%)'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Down Payment */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Down Payment: {downPaymentPercent}%</Label>
        <Slider
          value={[downPaymentPercent]}
          onValueChange={(value) => setDownPaymentPercent(value[0])}
          min={10}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Loan Term */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Loan Term: {loanTermYears} years</Label>
        <Slider
          value={[loanTermYears]}
          onValueChange={(value) => setLoanTermYears(value[0])}
          min={10}
          max={20}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10 years</span>
          <span>20 years</span>
        </div>
      </div>

      {/* Monthly Hours */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Expected Flying Hours: {monthlyHours} hrs/month</Label>
        <Slider
          value={[monthlyHours]}
          onValueChange={(value) => setMonthlyHours(value[0])}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 hrs</span>
          <span>100 hrs</span>
        </div>
      </div>

      {/* Leaseback Option */}
      {showLeasebackOption && (
        <div className="flex items-center justify-between">
          <Label htmlFor="leaseback" className="text-sm font-medium">Include Leaseback Revenue</Label>
          <Switch
            id="leaseback"
            checked={leasebackIncluded}
            onCheckedChange={setLeasebackIncluded}
          />
        </div>
      )}

      {/* Results Display */}
      {calculatedResults && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-semibold text-base">💰 Your Monthly Ownership Picture</h4>
          
          <div className="space-y-2 text-sm">
            <TooltipProvider>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  Aircraft Financing
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This builds equity - you're buying an asset, not just spending</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="font-medium">{formatCurrency(calculatedResults.debtService)}</span>
              </div>

              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  Insurance & Management
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Protection and professional management of your asset</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="font-medium">
                  {aircraft === 'SR22' 
                    ? formatCurrency(calculatedResults.fixedCosts)
                    : formatCurrency(calculatedResults.fixedMonthlyCosts)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Operations ({monthlyHours} hrs)</span>
                <span className="font-medium">
                  {aircraft === 'SR22'
                    ? formatCurrency(calculatedResults.ownerUsageCosts + calculatedResults.maintenanceCosts)
                    : formatCurrency(calculatedResults.variableHourlyCosts)}
                </span>
              </div>

              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Monthly Cost</span>
                <span>
                  {aircraft === 'SR22'
                    ? formatCurrency(calculatedResults.fixedCosts + calculatedResults.ownerUsageCosts + calculatedResults.maintenanceCosts + calculatedResults.debtService)
                    : formatCurrency(calculatedResults.fixedMonthlyCosts + calculatedResults.variableHourlyCosts + calculatedResults.debtService)}
                </span>
              </div>

              {aircraft === 'SR22' && leasebackIncluded && calculatedResults.rentalRevenue > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      💰 Leaseback Revenue
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Offset costs by making your aircraft available when you're not flying</p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <span className="font-medium">-{formatCurrency(calculatedResults.rentalRevenue)}</span>
                  </div>

                  <div className="border-t pt-2 flex justify-between font-bold text-lg text-primary">
                    <span>🎯 Your Net Monthly</span>
                    <span>{formatCurrency(Math.abs(calculatedResults.netMonthlyCashFlow))}</span>
                  </div>
                </>
              )}
              
              {aircraft === 'SF50' && (
                <div className="border-t pt-2 flex justify-between font-bold text-lg text-primary">
                  <span>🎯 Your Net Monthly</span>
                  <span>{formatCurrency(Math.abs(calculatedResults.netMonthlyCashFlow))}</span>
                </div>
              )}

              <div className="flex justify-between text-sm text-muted-foreground pt-2">
                <span className="flex items-center gap-1">
                  💎 Building Equity (3 years)
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Based on 85% resale value after 3 years (typical Cirrus market)</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency((aircraftCost * 0.85 * share) - (aircraftCost * (downPaymentPercent / 100) * share))}
                </span>
              </div>
            </TooltipProvider>
          </div>

          {/* Expandable Details */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-sm">
                <span>Show me the details</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Purchase Price ({share === 1 ? 'Full' : share === 0.5 ? '1/2' : '1/4'} Share)</span>
                <span>{formatCurrency(aircraftCost * share)}</span>
              </div>
              <div className="flex justify-between">
                <span>Down Payment ({downPaymentPercent}%)</span>
                <span>{formatCurrency(aircraftCost * share * (downPaymentPercent / 100))}</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Amount</span>
                <span>{formatCurrency(aircraftCost * share * (1 - downPaymentPercent / 100))}</span>
              </div>
              <div className="flex justify-between">
                <span>Interest Rate</span>
                <span>7.5%</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance (Annual)</span>
                <span>{formatCurrency((aircraft === 'SR22' ? 12000 : 28000) * share)}</span>
              </div>
              <div className="flex justify-between">
                <span>Management Fee (Monthly)</span>
                <span>{formatCurrency((aircraft === 'SR22' ? 1200 : 2500) * share)}</span>
              </div>
              <div className="flex justify-between">
                <span>Operations Cost per Hour</span>
                <span>{formatCurrency(aircraft === 'SR22' ? 285 : 1600)}</span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </Card>
  );
}
