import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, DollarSign, FileText } from "lucide-react";

interface FinancingInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aircraftCost: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  ownershipShare: 1 | 0.5 | 0.333 | 0.25;
  aircraftType: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet';
  disableShareSelection?: boolean;
  onApplyValues?: (values: {
    downPaymentPercent: number;
    interestRate: number;
    loanTermYears: number;
    ownershipShare: 1 | 0.5 | 0.333 | 0.25;
    resalePercent: number;
  }) => void;
}

export function FinancingInfoDialog({ 
  open, 
  onOpenChange, 
  aircraftCost: initialAircraftCost, 
  downPaymentPercent: initialDownPayment, 
  interestRate: initialInterestRate, 
  loanTermYears: initialLoanTerm,
  ownershipShare: initialOwnershipShare,
  aircraftType,
  disableShareSelection = false,
  onApplyValues 
}: FinancingInfoDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  // Interactive state - sync with props whenever they change
  const [aircraftCost, setAircraftCost] = useState(initialAircraftCost);
  const [downPaymentPercent, setDownPaymentPercent] = useState(30);
  const [interestRate, setInterestRate] = useState(6);
  const [loanTermYears, setLoanTermYears] = useState(15);
  const [ownershipShare, setOwnershipShare] = useState<1 | 0.5 | 0.333 | 0.25>(initialOwnershipShare);
  // Default resale percent: 95% for SF50, 85% for others
  const defaultResalePercent = aircraftType === 'SF50' ? 95 : 85;
  const [resalePercent, setResalePercent] = useState(defaultResalePercent);
  const [isEditingResale, setIsEditingResale] = useState(false);
  
  // Sync state with props when dialog opens or props change
  useEffect(() => {
    if (open) {
      setAircraftCost(initialAircraftCost);
      setDownPaymentPercent(30); // Always default to 30%
      setInterestRate(6); // Always default to 6%
      setLoanTermYears(15); // Always default to 15 years
      setOwnershipShare(initialOwnershipShare); // Use current share from calculator
      // Set default resale percent based on aircraft type
      const defaultResale = aircraftType === 'SF50' ? 95 : 85;
      setResalePercent(defaultResale);
      setIsEditingResale(false);
    }
  }, [open, initialAircraftCost, initialOwnershipShare, aircraftType]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideFinancingDialog', 'true');
    }
    onOpenChange(false);
  };
  
  const handleApply = () => {
    // Pass values back to parent
    if (onApplyValues) {
      onApplyValues({
        downPaymentPercent,
        interestRate,
        loanTermYears,
        ownershipShare,
        resalePercent
      });
    }
    handleClose();
  };

  // Calculate example values from actual inputs
  // Use ownership share to calculate the user's actual cost
  const effectiveAircraftCost = aircraftCost * ownershipShare;
  const downPaymentAmount = effectiveAircraftCost * (downPaymentPercent / 100);
  const financedAmount = effectiveAircraftCost - downPaymentAmount;
  
  // Simple monthly payment calculation (P * r * (1 + r)^n) / ((1 + r)^n - 1)
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = monthlyRate > 0 
    ? financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : financedAmount / numPayments;
  
  // Calculate principal and interest portions (approximate - early in loan)
  const firstMonthInterest = financedAmount * monthlyRate;
  const firstMonthPrincipal = monthlyPayment - firstMonthInterest;
  
  // Over 3 years
  const totalPrincipalPaid = firstMonthPrincipal * 36; // Simplified approximation
  const totalInterestPaid = (monthlyPayment * 36) - totalPrincipalPaid;
  
  // Resale at adjustable percentage (based on user's share)
  const resaleValue = effectiveAircraftCost * (resalePercent / 100);
  const remainingLoan = financedAmount - totalPrincipalPaid;
  const equityAfterSale = resaleValue - remainingLoan;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Plane className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Financing Calculator
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Adjust the inputs to see how financing affects your true ownership cost
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 py-4">
          {/* Left Side: Input Controls */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-muted/30 border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
              
              {/* Ownership Share */}
              {!disableShareSelection && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Ownership Share</Label>
                  <div className={`grid gap-2 ${aircraftType === 'SF50' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <Button
                      type="button"
                      size="sm"
                      variant={ownershipShare === 1 ? "secondary" : "ghost"}
                      onClick={() => setOwnershipShare(1)}
                      className="w-full h-8 text-xs"
                    >
                      Full
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={ownershipShare === 0.5 ? "secondary" : "ghost"}
                      onClick={() => setOwnershipShare(0.5)}
                      className="w-full h-8 text-xs"
                    >
                      1/2
                    </Button>
                    {aircraftType === 'SF50' && (
                      <Button
                        type="button"
                        size="sm"
                        variant={ownershipShare === 0.25 ? "secondary" : "ghost"}
                        onClick={() => setOwnershipShare(0.25)}
                        className="w-full h-8 text-xs"
                      >
                        1/4
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Aircraft Cost */}
              <div className="space-y-2">
                <Label htmlFor="aircraftCost" className="text-sm font-bold">
                  Purchase Price {ownershipShare < 1 && `(${ownershipShare === 0.5 ? '1/2' : '1/4'} Share: ${formatCurrency(effectiveAircraftCost)})`}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="aircraftCost"
                    type="text"
                    value={aircraftCost.toLocaleString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (!isNaN(Number(value))) {
                        setAircraftCost(Number(value));
                      }
                    }}
                    className="pl-7"
                  />
                </div>
              </div>

              {/* All three sliders/inputs in a single row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Down Payment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="downPayment" className="text-sm font-medium">
                      Down %
                    </Label>
                    <span className="text-sm font-semibold">{downPaymentPercent}%</span>
                  </div>
                  {/* Mobile: Input field */}
                  <div className="sm:hidden relative">
                    <Input
                      id="downPayment-mobile"
                      type="number"
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  {/* Desktop: Slider */}
                  <div className="hidden sm:block">
                    <Slider
                      id="downPayment"
                      value={[downPaymentPercent]}
                      onValueChange={([value]) => setDownPaymentPercent(value)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(aircraftCost * (downPaymentPercent / 100))}</p>
                  </div>
                </div>

                {/* Interest Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="interestRate" className="text-sm font-medium">
                      Rate %
                    </Label>
                    <span className="text-sm font-semibold">{interestRate.toFixed(2)}%</span>
                  </div>
                  {/* Mobile: Input field */}
                  <div className="sm:hidden relative">
                    <Input
                      id="interestRate-mobile"
                      type="number"
                      step="0.25"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      min={3}
                      max={12}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  {/* Desktop: Slider */}
                  <div className="hidden sm:block">
                    <Slider
                      id="interestRate"
                      value={[interestRate]}
                      onValueChange={([value]) => setInterestRate(value)}
                      min={3}
                      max={12}
                      step={0.25}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Loan Term */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="loanTerm" className="text-sm font-medium">
                      Term (yr)
                    </Label>
                    <span className="text-sm font-semibold">{loanTermYears} years</span>
                  </div>
                  {/* Mobile: Input field */}
                  <div className="sm:hidden">
                    <Input
                      id="loanTerm-mobile"
                      type="number"
                      value={loanTermYears}
                      onChange={(e) => setLoanTermYears(Number(e.target.value))}
                      min={5}
                      max={30}
                      step={5}
                    />
                  </div>
                  {/* Desktop: Slider */}
                  <div className="hidden sm:block">
                    <Slider
                      id="loanTerm"
                      value={[loanTermYears]}
                      onValueChange={([value]) => setLoanTermYears(value)}
                      min={5}
                      max={30}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Educational Content */}
            <div className="space-y-4">
              {/* Aircraft Retain Value Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Aircraft Retain Value</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Well-maintained Cirrus aircraft typically retain 75–90% of purchase price after three years.
                </p>
              </div>

              {/* Financing Builds Equity Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Financing Builds Equity</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Principal builds equity you recover at resale. Interest is your borrowing cost.
                </p>
              </div>

              {/* Tax Advantages */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Tax Advantages</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Section 179 and bonus depreciation may offset substantial purchase costs. Consult your tax advisor.
                </p>
              </div>
              
              {/* Bottom Line */}
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-sm font-semibold mb-1.5">The Bottom Line</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Don't mistake your monthly payment for your real cost. Financing a Cirrus builds equity in an aircraft that holds its value very well. Much of what you pay now comes back to you when you sell.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Live Calculation Results */}
          <div className="space-y-3 sm:space-y-4">
            {/* Example Calculation */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
            <p className="font-semibold text-sm">Your Numbers:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Purchase price{ownershipShare < 1 ? ` (${ownershipShare === 0.5 ? '1/2' : '1/4'} share)` : ''}:</span>
              <span className="font-semibold text-foreground text-right">{formatCurrency(effectiveAircraftCost)}</span>
              
              <span className="text-muted-foreground">Down payment:</span>
              <span className="font-semibold text-foreground text-right">{formatCurrency(downPaymentAmount)}</span>
              
              <span className="text-muted-foreground">Financed:</span>
              <span className="font-semibold text-foreground text-right">{formatCurrency(financedAmount)}</span>
              
              <span className="text-muted-foreground">Monthly payment:</span>
              <span className="font-semibold text-foreground text-right">{formatCurrency(monthlyPayment)}</span>
            </div>

            <div className="pt-3 border-t border-primary/20 space-y-2">
              <p className="font-semibold text-sm">After 3 Years:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-muted-foreground">Down payment:</span>
                <span className="text-foreground text-right">{formatCurrency(downPaymentAmount)}</span>
                
                <span className="text-muted-foreground">Loan payments:</span>
                <span className="text-foreground text-right">{formatCurrency(monthlyPayment * 36)}</span>
                
                <span className="text-muted-foreground text-xs pl-4">Principal paid:</span>
                <span className="text-muted-foreground text-xs text-right">{formatCurrency(totalPrincipalPaid)}</span>
                
                <span className="text-muted-foreground text-xs pl-4">Interest paid:</span>
                <span className="text-muted-foreground text-xs text-right">{formatCurrency(totalInterestPaid)}</span>
                
                <span className="font-semibold text-foreground border-t border-primary/20 pt-1.5">Total Spent:</span>
                <span className="font-semibold text-foreground text-right border-t border-primary/20 pt-1.5">{formatCurrency((monthlyPayment * 36) + downPaymentAmount)}</span>
                
                <span className="text-muted-foreground pt-1.5">
                  Resale value (
                  {isEditingResale ? (
                    <input
                      type="number"
                      value={resalePercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 0 && val <= 100) {
                          setResalePercent(val);
                        }
                      }}
                      onBlur={() => setIsEditingResale(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingResale(false);
                        }
                      }}
                      autoFocus
                      className="w-12 px-1 bg-background border border-primary rounded text-foreground text-center inline-block"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingResale(true)}
                      className="text-foreground hover:text-primary transition-colors cursor-pointer underline decoration-dotted"
                    >
                      {resalePercent}
                    </button>
                  )}
                  %):
                </span>
                <span className="text-foreground text-right pt-1.5">{formatCurrency(resaleValue)}</span>
                
                <span className="text-muted-foreground">Remaining loan:</span>
                <span className="text-muted-foreground text-right">{formatCurrency(remainingLoan)}</span>
                
                <span className="font-semibold text-green-600 dark:text-green-400 border-t border-primary/20 pt-1.5">Equity Recovered:</span>
                <span className="font-semibold text-green-600 dark:text-green-400 text-right border-t border-primary/20 pt-1.5">{formatCurrency(equityAfterSale)}</span>
                
                {/* Calculation breakdown */}
                <span className="text-muted-foreground text-xs pt-2 col-span-2">
                  Total Spent - Equity Recovered = True 3-Year Cost
                </span>
                
                <span className="font-semibold text-primary border-t-2 border-primary pt-1.5">True 3-Year Cost:</span>
                <span className="font-semibold text-primary text-right border-t-2 border-primary pt-1.5">
                  {(() => {
                    const totalSpent = (monthlyPayment * 36) + downPaymentAmount;
                    const netCost = totalSpent - equityAfterSale;
                    return netCost > 0 
                      ? formatCurrency(netCost)
                      : `(${formatCurrency(Math.abs(netCost))})`;
                  })()}
                </span>
              </div>
              
              {/* Side by side comparison */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-primary/20">
                <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency((monthlyPayment * 36) + downPaymentAmount)}</p>
                </div>
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">True 3-Year Cost</p>
                  <p className="text-xl font-bold text-primary">
                    {(() => {
                      const totalSpent = (monthlyPayment * 36) + downPaymentAmount;
                      const netCost = totalSpent - equityAfterSale;
                      return netCost > 0 
                        ? formatCurrency(netCost)
                        : `(${formatCurrency(Math.abs(netCost))})`;
                    })()}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-center text-muted-foreground italic pt-1">
                You spend {formatCurrency((monthlyPayment * 36) + downPaymentAmount)} in total, but after recovering equity, your true cost is {(() => {
                  const totalSpent = (monthlyPayment * 36) + downPaymentAmount;
                  const netCost = totalSpent - equityAfterSale;
                  return netCost > 0 
                    ? formatCurrency(netCost)
                    : formatCurrency(Math.abs(netCost)) + ' profit';
                })()} — before considering additional tax and depreciation value.
              </p>
            </div>
          </div>

          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <Button onClick={handleApply} size="lg" className="w-full">
            Apply & Close
          </Button>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="dontShowAgain" 
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <label 
                htmlFor="dontShowAgain" 
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Don't show this again
              </label>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
