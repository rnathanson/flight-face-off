// All operating costs now come from admin configuration - no hard-coded values

export function applyFractionalOwnership(
  cost: number, 
  share: number, 
  costType: 'standard' | 'parking' | 'insurance' | 'tciTraining' | 'noDiscount'
): number {
  if (share === 1) return cost; // Full ownership, no adjustment
  
  switch(costType) {
    case 'parking':
    case 'insurance':
    case 'tciTraining':
      return cost * share * 1.2; // Reduce by share, then add 20%
    case 'noDiscount':
      return cost; // No change for pilot services & management fee
    case 'standard':
    default:
      return cost * share; // Standard proportional reduction
  }
}

export interface LeasebackInputs {
  // Purchase Assumptions
  aircraftCost: number;
  interestRate: number; // percentage
  downPaymentPercent: number; // percentage
  loanTermYears: number;
  
  // Parking
  parkingCost: number;
  
  // Nassau Flyers Fixed Rates (all from admin panel)
  insuranceAnnual: number;
  managementFee: number;
  subscriptions: number;
  tciTraining: number;
  maintenancePerHour: number; // per hour - from admin panel
  pilotServicesRate: number; // per hour - from admin panel
  rentalRevenueRate: number; // per hour - from admin panel
  ownerUsageRate: number; // per hour - what owner pays to use plane in leaseback - from admin panel
  
  // SR22 fuel costs (from admin panel)
  fuelBurnPerHour: number; // from admin panel
  fuelPricePerGallon: number; // from admin panel
  
  // Fractional ownership
  ownershipShare?: number; // 1, 0.5, or 0.25 (SR22: 1 or 0.5 only; SF50: 1, 0.5, or 0.25)
}

export interface ScenarioInputs {
  scenarioType: 'standard' | 'leaseback';
  rentalHours: number;
  ownerHours: number;
  pilotServicesHours: number;
}

export interface ScenarioResults {
  // Monthly
  totalHoursFlown: number;
  rentalRevenue: number;
  ownerUsageCosts: number;
  fixedCosts: number;
  netOperatingIncome: number;
  ownerFlightCosts: number;
  maintenanceCosts: number;
  debtService: number;
  netMonthlyCashFlow: number;
  costPerHour: number;
  directFlightCost: number;
  
  // Annual
  annualCashFlow: number;
  annualDepreciation: number;
}

export interface FinancingDetails {
  loanAmount: number;
  downPayment: number;
  monthlyPayment: number;
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

export function calculateScenario(
  inputs: LeasebackInputs,
  scenario: ScenarioInputs,
  financing: FinancingDetails
): ScenarioResults {
  const isLeaseback = scenario.rentalHours > 0;
  const share = inputs.ownershipShare || 1;
  
  // Apply fractional ownership to costs
  const parkingCost = applyFractionalOwnership(inputs.parkingCost, share, 'parking');
  const insuranceAnnual = applyFractionalOwnership(inputs.insuranceAnnual, share, 'insurance');
  const tciTraining = applyFractionalOwnership(inputs.tciTraining, share, 'tciTraining');
  const subscriptions = applyFractionalOwnership(inputs.subscriptions, share, 'standard');
  const maintenancePerHour = inputs.maintenancePerHour; // Use value from admin panel
  const managementFee = applyFractionalOwnership(inputs.managementFee, share, 'noDiscount');
  const pilotServicesRate = applyFractionalOwnership(inputs.pilotServicesRate, share, 'noDiscount');
  const rentalRevenueRate = inputs.rentalRevenueRate; // No share reduction on revenue rate
  const ownerUsageRate = inputs.ownerUsageRate; // No discount on owner usage rate
  
  // Monthly calculations
  const totalHoursFlown = scenario.rentalHours + scenario.ownerHours + scenario.pilotServicesHours;
  
  // Revenue on ALL hours when in leaseback (owner + rental), adjusted for ownership share
  const rentalRevenue = isLeaseback 
    ? (scenario.rentalHours + scenario.ownerHours) * rentalRevenueRate * share
    : 0;
  
  // Fixed costs - TCI Training only for leaseback
  const fixedCosts = 
    parkingCost +
    (insuranceAnnual / 12) +
    managementFee +
    subscriptions +
    (isLeaseback ? tciTraining : 0);
  
  const netOperatingIncome = rentalRevenue - fixedCosts;
  
  // Owner usage costs - what owner pays to fly in leaseback mode ($490/hr)
  const ownerUsageCosts = isLeaseback 
    ? scenario.ownerHours * ownerUsageRate 
    : 0;
  
  const ownerFlightCosts = scenario.pilotServicesHours * pilotServicesRate;
  
  // Maintenance costs - only for standard ownership (not leaseback)
  const maintenanceCosts = isLeaseback ? 0 : (scenario.ownerHours * maintenancePerHour);
  
  // Fuel costs - only for non-leaseback (leaseback already includes in owner usage rate)
  const fuelCosts = isLeaseback 
    ? 0 
    : (scenario.ownerHours * inputs.fuelBurnPerHour * inputs.fuelPricePerGallon);
  
  const debtService = financing.monthlyPayment;
  
  const netMonthlyCashFlow = netOperatingIncome - ownerUsageCosts - ownerFlightCosts - maintenanceCosts - fuelCosts - debtService;
  
  // Annual
  const annualCashFlow = netMonthlyCashFlow * 12;
  
  // Cost per hour - owner's all-in net cost after rental revenue
  // In leaseback: (fixed costs + owner usage costs + debt - rental revenue) / owner hours
  // Owner usage rate already includes fuel & maintenance, so don't double count
  // In standard: total monthly costs / owner hours
  const costPerHour = scenario.ownerHours > 0 
    ? Math.abs(netMonthlyCashFlow) / scenario.ownerHours
    : 0;
  
  // Direct flight cost per hour - In leaseback mode, show $490 owner usage rate instead
  const directFlightCost = isLeaseback 
    ? ownerUsageRate 
    : (inputs.fuelPricePerGallon * inputs.fuelBurnPerHour) + maintenancePerHour;
  
  return {
    totalHoursFlown,
    rentalRevenue,
    ownerUsageCosts,
    fixedCosts,
    netOperatingIncome,
    ownerFlightCosts,
    maintenanceCosts,
    debtService,
    netMonthlyCashFlow,
    costPerHour,
    directFlightCost,
    annualCashFlow,
    annualDepreciation: 0, // Not displayed, kept for interface compatibility
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

// SF50 Vision Jet Interfaces and Calculations
export interface SF50Inputs {
  // Purchase
  aircraftCost: number;
  interestRate: number;
  downPaymentPercent: number;
  loanTermYears: number;
  
  // Fixed Annual/Monthly Costs
  hangarCost: number;
  insuranceAnnual: number;
  managementFee: number;
  subscriptions: number;
  cleaningMonthly: number;
  pilotServicesAnnual: number;
  professionalServicesAnnual: number; // Legal, Financial & Administration
  pilotPoolContribution: number; // Annual contribution for owner flown with pilot services
  
  // Variable Hourly Costs
  jetstreamHourly: number;
  fuelBurnPerHour: number;
  fuelPricePerGallon: number;
  
  // Type Rating Costs
  typeRatingInitial: number;
  typeRatingRecurrent: number;
  
  // Fractional ownership
  ownershipShare?: number; // 1, 0.5, or 0.25
}

export interface SF50ScenarioInputs {
  ownerHours: number;
  ownerFlown: boolean; // Whether owner is flying themselves
  pilotServicesHours: number; // Pilot services hours when owner flown
}

export interface SF50Results {
  // Monthly
  totalHoursFlown: number;
  fixedMonthlyCosts: number;
  variableHourlyCosts: number;
  totalMonthlyOperating: number;
  debtService: number;
  netMonthlyCashFlow: number;
  costPerHour: number;
  directFlightCost: number; // Variable costs per hour only (fuel + JetStream)
  
  // Annual
  annualCashFlow: number;
  annualFixedCosts: number;
  annualVariableCosts: number;
  annualTotalCost: number;
}

export function calculateSF50Scenario(
  inputs: SF50Inputs,
  scenario: SF50ScenarioInputs,
  financing: FinancingDetails
): SF50Results {
  const share = inputs.ownershipShare || 1;
  
  // Apply fractional ownership to costs
  const hangarCost = applyFractionalOwnership(inputs.hangarCost, share, 'parking');
  const insuranceAnnual = applyFractionalOwnership(inputs.insuranceAnnual, share, 'insurance');
  const managementFee = applyFractionalOwnership(inputs.managementFee, share, 'noDiscount');
  const subscriptions = applyFractionalOwnership(inputs.subscriptions, share, 'standard');
  const cleaningMonthly = applyFractionalOwnership(inputs.cleaningMonthly, share, 'standard');
  // Pilot services: apply share × 1.2 for non-owner flown (professionally flown), no discount for owner flown
  const pilotServicesAnnual = applyFractionalOwnership(
    inputs.pilotServicesAnnual, 
    share, 
    scenario.ownerFlown ? 'noDiscount' : 'insurance'
  );
  const professionalServicesAnnual = applyFractionalOwnership(inputs.professionalServicesAnnual, share, 'standard');
  const pilotPoolContribution = applyFractionalOwnership(inputs.pilotPoolContribution, share, 'standard');
  // No discount on hourly flying costs (fuel + jetstream)
  // JetStream is now prepaid in purchase price, so set to 0
  const jetstreamHourly = 0; // Prepaid in purchase price
  const fuelCostPerHour = inputs.fuelBurnPerHour * inputs.fuelPricePerGallon;
  
  // Calculate if pilot pool contribution applies (owner flown with pilot services hours)
  const pilotPoolMonthly = (scenario.ownerFlown && scenario.pilotServicesHours > 0) 
    ? pilotPoolContribution / 12 
    : 0;
  
  // Type rating share calculation: 1/2=50%, 1/4=75%, full=100%
  const getTypeRatingShare = (share: number) => {
    if (share === 1) return 1; // Full share pays 100%
    if (share === 0.5) return 0.5; // Half share pays 50%
    if (share === 0.25) return 0.75; // Quarter share pays 75%
    return share; // Fallback
  };
  
  // Type rating costs for owner flown fractional ownership
  const typeRatingRecurrent = (scenario.ownerFlown && share < 1) 
    ? (inputs.typeRatingRecurrent * getTypeRatingShare(share)) / 12 
    : 0;
  
  // Monthly fixed costs
  const fixedMonthlyCosts = 
    hangarCost +
    (insuranceAnnual / 12) +
    managementFee +
    subscriptions +
    cleaningMonthly +
    (!scenario.ownerFlown ? (pilotServicesAnnual / 12) : 0) +
    (professionalServicesAnnual / 12) +
    pilotPoolMonthly +
    typeRatingRecurrent;
  
  // Variable costs (per hour flown)
  const totalVariablePerHour = fuelCostPerHour + jetstreamHourly;
  
  // Direct flight cost is just the variable costs per hour (fuel + JetStream)
  const directFlightCost = totalVariablePerHour;
  
  // Monthly variable costs (ownerHours is already monthly)
  const variableHourlyCosts = scenario.ownerHours * totalVariablePerHour;
  
  const totalMonthlyOperating = fixedMonthlyCosts + variableHourlyCosts;
  const debtService = financing.monthlyPayment;
  const netMonthlyCashFlow = -(totalMonthlyOperating + debtService);
  
  // Cost per hour calculation (includes all costs divided by monthly hours)
  const costPerHour = scenario.ownerHours > 0 
    ? (totalMonthlyOperating * 12 + debtService * 12) / (scenario.ownerHours * 12)
    : 0;
  
  // Annual calculations
  const annualFixedCosts = fixedMonthlyCosts * 12;
  const annualVariableCosts = (scenario.ownerHours * 12) * totalVariablePerHour;
  const annualTotalCost = annualFixedCosts + annualVariableCosts + (debtService * 12);
  
  return {
    totalHoursFlown: scenario.ownerHours,
    fixedMonthlyCosts,
    variableHourlyCosts,
    totalMonthlyOperating,
    debtService,
    netMonthlyCashFlow,
    costPerHour,
    directFlightCost,
    annualCashFlow: netMonthlyCashFlow * 12,
    annualFixedCosts,
    annualVariableCosts,
    annualTotalCost,
  };
}
