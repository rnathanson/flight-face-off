// Owner's Fleet Calculations - Dual Aircraft Ownership Model (SR22 + SF50)

export interface OwnersFleetInputs {
  // Purchase (Both SR22 and SF50)
  sr22AircraftCost: number;
  sf50AircraftCost: number;
  interestRate: number;
  downPaymentPercent: number;
  loanTermYears: number;
  
  // JetStream Package (prepaid maintenance for SF50)
  jetstreamPackage?: '2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs';
  aircraftCostBaseSF50?: number; // Editable SF50 base cost
  aircraftCostBaseSR22?: number; // Editable SR22 base cost
  
  // Fixed Costs (Combined for both aircraft)
  hangarCost: number; // Covers both aircraft
  insuranceAnnual: number; // For SF50
  managementFee: number; // Management of both aircraft
  subscriptions: number;
  cleaningMonthly: number; // SF50 cleaning
  pilotServicesAnnual: number; // Professional pilot services (always applies)
  professionalServicesAnnual: number; // Legal, Financial & Administration
  pilotPoolContribution: number; // ALWAYS applies for Owner's Fleet
  
  // Variable Costs - SF50 (JetStream is prepaid, so only fuel is variable)
  sf50JetstreamHourly: number; // Set to 0 for prepaid model
  sf50FuelBurnPerHour: number;
  sf50FuelPricePerGallon: number;
  
  // Variable Costs - SR22
  sr22FuelBurnPerHour: number;
  sr22FuelPricePerGallon: number;
  sr22MaintenancePerHour: number;
  
  // Fractional ownership
  ownershipShare?: number; // 1, 0.5, or 0.25
}

export interface OwnersFleetScenarioInputs {
  sr22HoursMonth: number;
  sf50HoursMonth: number;
}

export interface OwnersFleetResults {
  // SR22 Variable Costs
  sr22VariableCosts: number; // Monthly
  sr22DirectFlightCost: number; // Per hour
  
  // SF50 Variable Costs
  sf50VariableCosts: number; // Monthly
  sf50DirectFlightCost: number; // Per hour
  
  // Individual Fixed Costs (monthly)
  parking: number;
  insurance: number;
  management: number;
  subscriptions: number;
  cleaning: number;
  pilotServices: number;
  professionalServices: number;
  pilotPoolContribution: number;
  
  // Fixed Costs
  fixedMonthlyCosts: number;
  
  // Totals
  totalVariableCosts: number; // Monthly
  totalMonthlyOperating: number;
  debtService: number;
  netMonthlyCashFlow: number;
  totalHoursFlown: number;
  
  // Annual
  annualCashFlow: number;
  annualFixedCosts: number;
  annualVariableCosts: number;
  annualTotalCost: number;
}

export interface FinancingDetails {
  loanAmount: number;
  downPayment: number;
  monthlyPayment: number;
}

// Fractional ownership discount logic
function applyFractionalOwnership(
  cost: number, 
  share: number, 
  costType: 'standard' | 'parking' | 'insurance' | 'noDiscount'
): number {
  if (share === 1) return cost;
  
  switch(costType) {
    case 'parking':
    case 'insurance':
      return cost * share * 1.2; // Reduce by share, then add 20%
    case 'noDiscount':
      return cost; // No change for management & professional pilot services
    case 'standard':
    default:
      return cost * share; // Standard proportional reduction
  }
}

export function calculateFinancing(
  aircraftCost: number,
  downPaymentPercent: number,
  interestRate: number,
  loanTermYears: number
): FinancingDetails {
  const downPayment = aircraftCost * (downPaymentPercent / 100);
  const loanAmount = aircraftCost - downPayment;
  
  if (loanAmount <= 0 || interestRate <= 0) {
    return {
      loanAmount,
      downPayment,
      monthlyPayment: 0,
    };
  }
  
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;
  
  const monthlyPayment = 
    (loanAmount * monthlyRate) / 
    (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
  
  return {
    loanAmount,
    downPayment,
    monthlyPayment,
  };
}

export function calculateOwnersFleetScenario(
  inputs: OwnersFleetInputs,
  scenario: OwnersFleetScenarioInputs,
  financing: FinancingDetails
): OwnersFleetResults {
  const share = inputs.ownershipShare || 1;
  
  // Apply fractional ownership to fixed costs
  const parking = applyFractionalOwnership(inputs.hangarCost, share, 'parking');
  const insurance = applyFractionalOwnership(inputs.insuranceAnnual, share, 'insurance') / 12;
  const management = applyFractionalOwnership(inputs.managementFee, share, 'noDiscount');
  const subscriptions = applyFractionalOwnership(inputs.subscriptions, share, 'standard');
  const cleaning = applyFractionalOwnership(inputs.cleaningMonthly, share, 'standard');
  
  // Pilot services: share × 1.2 for professionally flown (Owner's Fleet is always professionally flown)
  const pilotServices = applyFractionalOwnership(inputs.pilotServicesAnnual, share, 'insurance') / 12;
  
  // Professional services: standard discount
  const professionalServices = applyFractionalOwnership(inputs.professionalServicesAnnual, share, 'standard') / 12;
  
  // Pilot Pool Contribution: ALWAYS applies for Owner's Fleet, standard discount
  const pilotPoolContribution = applyFractionalOwnership(inputs.pilotPoolContribution, share, 'standard') / 12;
  
  // Variable costs (no discount on hourly flying costs)
  const sf50FuelCostPerHour = inputs.sf50FuelBurnPerHour * inputs.sf50FuelPricePerGallon;
  const sf50VariablePerHour = sf50FuelCostPerHour + inputs.sf50JetstreamHourly;
  
  const sr22FuelCostPerHour = inputs.sr22FuelBurnPerHour * inputs.sr22FuelPricePerGallon;
  const sr22VariablePerHour = sr22FuelCostPerHour + inputs.sr22MaintenancePerHour;
  
  // Monthly variable costs
  const sf50VariableCosts = scenario.sf50HoursMonth * sf50VariablePerHour;
  const sr22VariableCosts = scenario.sr22HoursMonth * sr22VariablePerHour;
  const totalVariableCosts = sf50VariableCosts + sr22VariableCosts;
  
  // Monthly fixed costs - Pilot Pool ALWAYS included for Owner's Fleet
  const fixedMonthlyCosts = 
    parking +
    insurance +
    management +
    subscriptions +
    cleaning +
    pilotServices +
    professionalServices +
    pilotPoolContribution;
  
  // Totals
  const totalMonthlyOperating = fixedMonthlyCosts + totalVariableCosts;
  const debtService = financing.monthlyPayment;
  const netMonthlyCashFlow = -(totalMonthlyOperating + debtService);
  
  const totalHoursFlown = scenario.sr22HoursMonth + scenario.sf50HoursMonth;
  
  // Annual calculations
  const annualFixedCosts = fixedMonthlyCosts * 12;
  const annualVariableCosts = totalVariableCosts * 12;
  const annualTotalCost = annualFixedCosts + annualVariableCosts + (debtService * 12);
  
  return {
    sr22VariableCosts,
    sr22DirectFlightCost: sr22VariablePerHour,
    sf50VariableCosts,
    sf50DirectFlightCost: sf50VariablePerHour,
    parking,
    insurance,
    management,
    subscriptions,
    cleaning,
    pilotServices,
    professionalServices,
    pilotPoolContribution,
    fixedMonthlyCosts,
    totalVariableCosts,
    totalMonthlyOperating,
    debtService,
    netMonthlyCashFlow,
    totalHoursFlown,
    annualCashFlow: netMonthlyCashFlow * 12,
    annualFixedCosts,
    annualVariableCosts,
    annualTotalCost,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
