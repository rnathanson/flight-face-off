export interface AircraftConfig {
  cruiseSpeed: number; // knots
  fuelFlow: number; // gallons per hour
  maintenanceCost: number; // $ per hour (includes fuel, maintenance, everything)
  range: number; // nautical miles
  minRunway: number; // feet
  fuelCapacity: number; // gallons (max fuel capacity)
  maxPassengers: number; // including pilot
  maxBags: number; // standard bags
  usableFuel: number; // gallons (accounting for reserves)
  maxUsefulLoad: number; // pounds (total weight capacity for fuel + people + bags)
  emptyWeight: number; // pounds (basic empty weight)
  fuelWeightPerGallon: number; // pounds per gallon (6 for 100LL, 6.7 for Jet-A)
  avgPersonWeight: number; // pounds (average person weight)
  avgBagWeight: number; // pounds (average bag weight)
  // Fuel planning
  taxiFuel: number; // gallons
  contingencyFuelMin: number; // gallons (floor value)
  reserveFuel: number; // gallons (legal reserve)
  // Weight & balance
  maxTakeoffWeight: number; // pounds (MTOW)
  // Payload & Range (optional - for PC24)
  payloadRangeFormula?: {
    constant: number; // 1600 for PC24
    description: string; // "Payload (lbs) + Range (nm) = 1600"
  };
}

export interface FlightResult {
  aircraft: 'SR22' | 'PC24';
  time: number; // minutes
  fuel: number; // gallons
  cost: number; // total cost
  stops: number;
  canMakeIt: boolean;
  runwayOk: boolean;
  fuelMarginPercent?: number; // Percentage of extra fuel capacity beyond required
}

export interface ComparisonResult {
  sr22: FlightResult;
  jet: FlightResult;
  winner: 'SR22' | 'PC24' | 'tie';
  timeSaved: number; // minutes
  costDifference: number;
  payloadRangeWarning?: string; // Warning about payload/range for PC24
  isCloseCall?: boolean; // True when time is within 30min OR SR22 is 60%+ cheaper
}

export const DEFAULT_CONFIG = {
  ownershipShare: 1 as 1 | 0.5 | 0.333 | 0.25, // Default to full ownership
  sr22: {
    cruiseSpeed: 172, // KTAS at 7000 ft
    fuelFlow: 18.5, // gph at cruise (7000 ft LOP)
    maintenanceCost: 250, // Avg cost per hour (includes fuel, maintenance, insurance, etc.)
    range: 850,
    minRunway: 2700,
    fuelCapacity: 92, // Total fuel capacity
    usableFuel: 92, // Usable fuel
    maxPassengers: 4, // Including pilot
    maxBags: 4,
    maxUsefulLoad: 1216, // pounds (max weight for fuel + people + bags)
    emptyWeight: 2434, // pounds
    fuelWeightPerGallon: 6, // pounds per gallon (100LL)
    avgPersonWeight: 185, // pounds
    avgBagWeight: 30, // pounds
    // Fuel planning
    taxiFuel: 1, // gallons
    contingencyFuelMin: 5, // gallons (floor)
    reserveFuel: 11, // gallons (45 min at 55% LOP)
    // Weight & balance
    maxTakeoffWeight: 3650, // pounds (MTOW)
  },
  jet: {
    cruiseSpeed: 308, // KTAS at FL310
    fuelFlow: 72, // gph at cruise (FL310) - realistic average of 60-65 gph range
    maintenanceCost: 1250, // Avg cost per hour (includes fuel, maintenance, insurance, etc.)
    range: 1200,
    minRunway: 4000,
    fuelCapacity: 305, // Total fuel capacity
    usableFuel: 296, // Usable fuel
    maxPassengers: 5, // Best to think of as 4-5 adult aircraft
    maxBags: 7,
    maxUsefulLoad: 2450, // pounds (max weight for fuel + people + bags)
    emptyWeight: 3550, // pounds
    fuelWeightPerGallon: 6.7, // pounds per gallon (Jet-A)
    avgPersonWeight: 185, // pounds
    avgBagWeight: 30, // pounds
    // Fuel planning
    taxiFuel: 6, // gallons (busy field default)
    contingencyFuelMin: 10, // gallons (floor)
        reserveFuel: 40, // gallons (45 min at long range cruise)
        // Weight & balance
        maxTakeoffWeight: 6000, // pounds (MTOW)
        // Payload & Range rule for PC24
        payloadRangeFormula: {
          constant: 1600,
          description: "Payload (lbs) + Range (nm) = 1600. With 800 lbs, expect ~800 nm with reserves. With 1000 lbs (5 pax + bags), expect ~600 nm."
        }
      },
  reserveMinutes: 45,
  timeValueDefault: 250,
  headwindKts: 5, // Conservative headwind assumption
  // SR22 Leaseback Configuration
  sr22Leaseback: {
    // Default Purchase & Financing
    defaultAircraftCost: 1159999,
    defaultDownPaymentPercent: 100,
    defaultInterestRate: 7,
    defaultLoanTermYears: 20,
    // Fixed Operating Rates
    insuranceAnnual: 13000,
    managementFee: 500,
    subscriptions: 175,
    tciTraining: 350,
    maintenancePerHour: 80,
    // Parking Costs
    tiedownCost: 525,
    hangarCost: 2300,
    // Revenue Rates
    rentalRevenueRate: 285,
    ownerUsageRate: 490,
    pilotServicesRate: 125,
  },
  // SR20 Leaseback Configuration
  sr20Leaseback: {
    // Default Purchase & Financing
    defaultAircraftCost: 750000,
    defaultDownPaymentPercent: 100,
    defaultInterestRate: 7,
    defaultLoanTermYears: 20,
    // Fixed Operating Rates
    insuranceAnnual: 10000,
    managementFee: 500,
    subscriptions: 175,
    tciTraining: 350,
    maintenancePerHour: 70,
    // Parking Costs
    tiedownCost: 525,
    hangarCost: 2300,
    // Revenue Rates
    rentalRevenueRate: 220,
    ownerUsageRate: 390,
    pilotServicesRate: 100,
  },
  // Tab visibility settings
  tabs: {
    missionMatch: { public: true, admin: true },
    missionROI: { public: true, admin: true },
    jetChallenge: { public: false, admin: false },
    rangeExplorer: { public: true, admin: true },
    leasebackCalculator: { public: false, admin: true },
  },
  // PC24 Ownership Configuration
  pc24Ownership: {
    // Purchase & Financing Defaults
    defaultAircraftCost: 3800000,
    defaultDownPaymentPercent: 100,
    defaultInterestRate: 6.0,
    defaultLoanTermYears: 20,
    defaultResalePercent: 95,      // PC24 specific resale percentage
    // Fixed Monthly Costs
    hangarCost: 3000,          // Only hangar for PC24, no tiedown option
    insuranceAnnual: 48000,    // Professionally flown insurance
    managementFee: 2500,
    subscriptions: 0,          // No subscriptions for PC24
    cleaningMonthly: 500,
    pilotServicesAnnual: 100000, // $100k salary (editable by admin)
    // Variable Hourly Costs
    jetstreamHourly: 625,      // JetStream prepaid program
    fuelBurnPerHour: 80,       // gallons/hour
    fuelPricePerGallon: 6.50,
    pilotServicesHourly: 200,  // Hourly rate when owner flown
    pilotPoolContribution: 25000, // Annual pilot pool contribution for owner flown with pilot services
    // Type Rating Costs (owner flown fractional ownership)
    typeRatingInitial: 31000,  // Initial type rating cost
    typeRatingRecurrent: 13000, // Annual recurrent type rating cost
    // Default Flying Hours (monthly)
    defaultOwnerHours: 15,
  },
  // JetStream Package Options
  jetstreamPackages: {
    '2yr-300hrs': {
      cost: 193900,
      years: 2,
      hours: 300,
      label: '2 years or 300 flight hours',
    },
    '3yr-450hrs': {
      cost: 281900,
      years: 3,
      hours: 450,
      label: '3 years or 450 flight hours',
    },
    '3yr-600hrs': {
      cost: 374900,
      years: 3,
      hours: 600,
      label: '3 years or 600 flight hours',
    },
  },
  // Owner's Fleet Configuration (identical to PC24 but different aircraft cost)
  ownersFleetOwnership: {
    // Purchase & Financing Defaults
    defaultAircraftCost: 1250000,
    defaultDownPaymentPercent: 100,
    defaultInterestRate: 6.0,
    defaultLoanTermYears: 20,
    // Fixed Monthly Costs
    hangarCost: 3000,          // Only hangar, no tiedown option
    insuranceAnnual: 48000,    // Professionally flown insurance
    managementFee: 2500,
    subscriptions: 0,
    cleaningMonthly: 500,
    pilotServicesAnnual: 100000, // $100k salary (editable by admin)
    professionalServicesAnnual: 30000, // Legal, Financial & Administration
    // PC24 Variable Hourly Costs
    pc24JetstreamHourly: 625,      // JetStream prepaid program
    pc24FuelBurnPerHour: 80,       // gallons/hour
    pc24FuelPricePerGallon: 6.50,
    pc24PilotServicesHourly: 200,  // Hourly rate when owner flown
    // SR22 Variable Hourly Costs
    sr22MaintenancePerHour: 110,   // Direct maintenance cost for SR22
    sr22FuelBurnPerHour: 18.5,     // gallons/hour
    sr22FuelPricePerGallon: 6.50,  // Avgas (100LL) price
    pilotPoolContribution: 25000, // Annual pilot pool contribution for owner flown with pilot services
    // Type Rating Costs (owner flown fractional ownership)
    typeRatingInitial: 31000,  // Initial type rating cost
    typeRatingRecurrent: 13000, // Annual recurrent type rating cost
    // Default Flying Hours (monthly)
    defaultOwnerHours: 15,
  }
};

export type ConfigType = typeof DEFAULT_CONFIG & {
  leaseback?: typeof DEFAULT_CONFIG.sr22Leaseback;
  sr20?: typeof DEFAULT_CONFIG.sr20Leaseback;
  pc24?: typeof DEFAULT_CONFIG.pc24Ownership;
  ownersFleet?: typeof DEFAULT_CONFIG.ownersFleetOwnership;
  jetstreamPackages?: typeof DEFAULT_CONFIG.jetstreamPackages;
};
