export interface WeightCalculation {
  emptyWeight: number;
  pilotsWeight: number;
  passengersWeight: number;
  fuelWeight: number;
  totalWeight: number;
  isWithinTakeoffLimit: boolean;
  isWithinLandingLimit: boolean;
  maxTakeoffWeight: number;
  maxLandingWeight: number;
}

export interface FuelCalculation {
  fuelNeededGallons: number;
  fuelNeededLbs: number;
  maxFuelCapacityGallons: number;
  canCarryRequiredFuel: boolean;
  excessFuelLbs: number;
}

/**
 * Calculate aircraft weight for a given fuel load
 */
export function calculateWeight(
  config: any,
  passengers: number,
  fuelGallons: number
): WeightCalculation {
  const emptyWeight = config.empty_weight_lbs || 12200;
  const avgPassengerWeight = config.avg_passenger_weight_lbs || 180;
  const fuelWeightPerGallon = config.fuel_weight_per_gallon || 6.8;
  const maxTakeoffWeight = config.max_takeoff_weight_lbs || 18740;
  const maxLandingWeight = config.max_landing_weight_lbs || 17340;

  // Always include 2 pilots
  const pilotsWeight = 2 * avgPassengerWeight;
  const passengersWeight = passengers * avgPassengerWeight;
  const fuelWeight = fuelGallons * fuelWeightPerGallon;
  
  const totalWeight = emptyWeight + pilotsWeight + passengersWeight + fuelWeight;

  return {
    emptyWeight,
    pilotsWeight,
    passengersWeight,
    fuelWeight,
    totalWeight,
    isWithinTakeoffLimit: totalWeight <= maxTakeoffWeight,
    isWithinLandingLimit: totalWeight <= maxLandingWeight,
    maxTakeoffWeight,
    maxLandingWeight
  };
}

/**
 * Calculate fuel needed for a given distance
 */
export function calculateFuelNeeded(
  distanceNM: number,
  fuelBurnGalPerHour: number,
  cruiseSpeedKts: number,
  reserveMinutes: number
): number {
  // Time in hours for the flight
  const flightTimeHours = distanceNM / cruiseSpeedKts;
  
  // Reserve time in hours
  const reserveHours = reserveMinutes / 60;
  
  // Total fuel needed
  const totalFuelGallons = (flightTimeHours + reserveHours) * fuelBurnGalPerHour;
  
  return totalFuelGallons;
}

/**
 * Determine maximum fuel capacity given passenger load
 */
export function calculateMaxFuelCapacity(
  config: any,
  passengers: number
): number {
  const emptyWeight = config.empty_weight_lbs || 12200;
  const avgPassengerWeight = config.avg_passenger_weight_lbs || 180;
  const fuelWeightPerGallon = config.fuel_weight_per_gallon || 6.8;
  const maxTakeoffWeight = config.max_takeoff_weight_lbs || 18740;

  // Weight without fuel
  const pilotsWeight = 2 * avgPassengerWeight;
  const passengersWeight = passengers * avgPassengerWeight;
  const zeroFuelWeight = emptyWeight + pilotsWeight + passengersWeight;

  // Available weight for fuel
  const availableFuelWeight = maxTakeoffWeight - zeroFuelWeight;
  
  // Convert to gallons
  const maxFuelGallons = availableFuelWeight / fuelWeightPerGallon;

  return Math.max(0, maxFuelGallons);
}

/**
 * Check if a leg requires a fuel stop
 */
export function requiresFuelStop(
  legDistanceNM: number,
  maxFuelGallons: number,
  fuelBurnGalPerHour: number,
  cruiseSpeedKts: number,
  reserveMinutes: number
): FuelCalculation {
  const fuelNeededGallons = calculateFuelNeeded(
    legDistanceNM,
    fuelBurnGalPerHour,
    cruiseSpeedKts,
    reserveMinutes
  );

  const fuelWeightPerGallon = 6.8; // Standard Jet A weight
  const fuelNeededLbs = fuelNeededGallons * fuelWeightPerGallon;
  const canCarryRequiredFuel = fuelNeededGallons <= maxFuelGallons;
  const excessFuelLbs = (maxFuelGallons - fuelNeededGallons) * fuelWeightPerGallon;

  return {
    fuelNeededGallons,
    fuelNeededLbs,
    maxFuelCapacityGallons: maxFuelGallons,
    canCarryRequiredFuel,
    excessFuelLbs
  };
}

/**
 * Calculate maximum range given fuel capacity
 */
export function calculateMaxRange(
  fuelGallons: number,
  fuelBurnGalPerHour: number,
  cruiseSpeedKts: number,
  reserveMinutes: number
): number {
  const reserveHours = reserveMinutes / 60;
  const usableFuelHours = (fuelGallons / fuelBurnGalPerHour) - reserveHours;
  const rangeNM = usableFuelHours * cruiseSpeedKts;
  return Math.max(0, rangeNM);
}

/**
 * Calculate landing weight after burning fuel
 */
export function calculateLandingWeight(
  takeoffWeightCalculation: WeightCalculation,
  fuelBurnedGallons: number,
  fuelWeightPerGallon: number = 6.8
): { landingWeight: number; isWithinLimit: boolean } {
  const fuelBurnedLbs = fuelBurnedGallons * fuelWeightPerGallon;
  const landingWeight = takeoffWeightCalculation.totalWeight - fuelBurnedLbs;
  
  return {
    landingWeight,
    isWithinLimit: landingWeight <= takeoffWeightCalculation.maxLandingWeight
  };
}

/**
 * Find optimal fuel stop point along route
 */
export function calculateOptimalFuelStopPoint(
  totalDistanceNM: number,
  maxRangeNM: number
): number {
  // Stop at roughly 80% of max range for safety
  const safeRange = maxRangeNM * 0.8;
  
  if (totalDistanceNM <= safeRange) {
    return 0; // No stop needed
  }
  
  // If we need multiple stops, this returns the first stop distance
  return Math.min(safeRange, totalDistanceNM / 2);
}
