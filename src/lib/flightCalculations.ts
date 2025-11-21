import { AircraftConfig, FlightResult, ComparisonResult, DEFAULT_CONFIG } from '@/types/aircraft';

// Commercial flight result interface
export interface CommercialFlightResult {
  time: number; // door-to-door minutes
  cost: number; // total cost
  breakdown: {
    flightTime: number;
    overheadTime: number; // 4 hours
    ticketCost: number;
    baggageFees: number;
    groundTransport: number;
  };
}

// Driving result interface
export interface DrivingResult {
  time: number; // door-to-door minutes
  cost: number; // total cost
  distance: number; // statute miles
  breakdown: {
    drivingTime: number;
    fuelCost: number;
    wearAndTear: number; // IRS mileage rate minus fuel
  };
}

// Calculate driving time and cost from nautical miles (fallback/heuristic)
export function calculateDriving(distance: number): DrivingResult {
  // Convert nautical miles to statute miles
  const straightLineMiles = distance * 1.15078;
  
  // Road factor: actual driving distance is typically 1.3x straight-line distance
  // This accounts for roads not being straight, detours, etc.
  const roadFactor = 1.3;
  const actualDrivingMiles = straightLineMiles * roadFactor;
  
  // Average driving speed including stops, traffic, rest breaks (50 mph is more realistic)
  const avgSpeed = 50;
  const drivingTime = (actualDrivingMiles / avgSpeed) * 60; // minutes
  
  // IRS mileage rate is $0.67/mile (includes fuel, wear, maintenance)
  const irsRate = 0.67;
  const fuelCostPerMile = 0.15; // ~$3.50/gal at 23 mpg
  const wearAndTearPerMile = irsRate - fuelCostPerMile;
  
  const fuelCost = actualDrivingMiles * fuelCostPerMile;
  const wearAndTear = actualDrivingMiles * wearAndTearPerMile;
  const totalCost = Math.round(actualDrivingMiles * irsRate);
  
  return {
    time: Math.round(drivingTime),
    cost: totalCost,
    distance: Math.round(actualDrivingMiles),
    breakdown: {
      drivingTime: Math.round(drivingTime),
      fuelCost: Math.round(fuelCost),
      wearAndTear: Math.round(wearAndTear)
    }
  };
}

// Calculate driving from real route data (OSRM)
export function calculateDrivingFromRoute(distanceMiles: number, durationMinutes: number): DrivingResult {
  // IRS mileage rate is $0.67/mile (includes fuel, wear, maintenance)
  const irsRate = 0.67;
  const fuelCostPerMile = 0.15; // ~$3.50/gal at 23 mpg
  const wearAndTearPerMile = irsRate - fuelCostPerMile;
  
  const fuelCost = distanceMiles * fuelCostPerMile;
  const wearAndTear = distanceMiles * wearAndTearPerMile;
  const totalCost = Math.round(distanceMiles * irsRate);
  
  return {
    time: Math.round(durationMinutes),
    cost: totalCost,
    distance: Math.round(distanceMiles),
    breakdown: {
      drivingTime: Math.round(durationMinutes),
      fuelCost: Math.round(fuelCost),
      wearAndTear: Math.round(wearAndTear)
    }
  };
}

// Calculate commercial flight time and cost
export function calculateCommercialFlight(distance: number, passengers: number, bags: number): CommercialFlightResult {
  // Commercial jet cruise speed ~500 kts
  const cruiseSpeed = 500;
  const flightTime = (distance / cruiseSpeed) * 60; // minutes
  
  // 4 hour overhead (TSA, boarding, connections, deplaning, baggage claim, ground transport)
  const overheadTime = 240;
  
  // Cost calculations
  const costPerMile = 0.20; // Average commercial fare
  const ticketCost = distance * costPerMile * passengers;
  const baggageFees = bags * 100; // $100 per bag
  const groundTransport = 200; // Uber/taxi to/from airports
  
  const totalCost = Math.round(ticketCost + baggageFees + groundTransport);
  const totalTime = Math.round(flightTime + overheadTime);
  
  return {
    time: totalTime,
    cost: totalCost,
    breakdown: {
      flightTime: Math.round(flightTime),
      overheadTime,
      ticketCost: Math.round(ticketCost),
      baggageFees,
      groundTransport
    }
  };
}

// Validate payload/range for Vision Jet
function validatePayloadRange(
  payload: number,
  distance: number,
  aircraft: 'SR22' | 'VisionJet',
  config: AircraftConfig
): { isRealistic: boolean; warning?: string } {
  if (aircraft === 'VisionJet' && config.payloadRangeFormula) {
    const sum = payload + distance;
    const buffer = 50; // 50 nm buffer
    if (sum > config.payloadRangeFormula.constant + buffer) {
      return {
        isRealistic: false,
        warning: `Mission may require tech stop. Payload (${payload} lbs) + Range (${Math.round(distance)} nm) = ${sum}, exceeds SF50 rule of thumb (~${config.payloadRangeFormula.constant}).`
      };
    }
  }
  return { isRealistic: true };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Haversine formula for great circle distance
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function calculateAvailableFuel(
  config: AircraftConfig,
  passengers: number,
  bags: number
): number {
  // Calculate weight of people and bags
  const peopleWeight = passengers * config.avgPersonWeight;
  const bagsWeight = bags * config.avgBagWeight;
  const totalPassengerBagWeight = peopleWeight + bagsWeight;
  
  // Calculate available weight for fuel
  const availableWeightForFuel = config.maxUsefulLoad - totalPassengerBagWeight;
  
  // Convert to gallons (can't exceed physical tank capacity)
  const availableFuelGallons = Math.min(
    availableWeightForFuel / config.fuelWeightPerGallon,
    config.usableFuel
  );
  
  return Math.max(0, availableFuelGallons); // Can't be negative
}

export function calculateFlight(
  distance: number,
  config: AircraftConfig,
  aircraft: 'SR22' | 'VisionJet',
  passengers: number,
  bags: number,
  headwindKts: number = 5,
  taxiTimePerAirportMin: number = 0
): FlightResult {
  // 1. Check if aircraft can handle the load (weight and capacity)
  const peopleWeight = passengers * config.avgPersonWeight;
  const bagsWeight = bags * config.avgBagWeight;
  const zeroFuelWeight = config.emptyWeight + peopleWeight + bagsWeight;
  
  // Check capacity limits
  if (passengers > config.maxPassengers || bags > config.maxBags) {
    return {
      aircraft,
      time: 0,
      fuel: 0,
      cost: 0,
      stops: 999,
      canMakeIt: false,
      runwayOk: false,
    };
  }
  
  // Check gross weight limits
  if (zeroFuelWeight > config.maxTakeoffWeight) {
    return {
      aircraft,
      time: 0,
      fuel: 0,
      cost: 0,
      stops: 999,
      canMakeIt: false,
      runwayOk: false,
    };
  }
  
  const maxFuelByWeight = (config.maxTakeoffWeight - zeroFuelWeight) / config.fuelWeightPerGallon;
  const availableFuel = Math.min(maxFuelByWeight, config.usableFuel);
  
  // 2. Calculate trip fuel (simplified method)
  const effectiveGroundSpeed = config.cruiseSpeed - headwindKts;
  const cruiseTimeHours = distance / effectiveGroundSpeed;
  const tripFuel = cruiseTimeHours * config.fuelFlow;
  
  // 3. Add taxi (from config), contingency, and reserve
  const taxiTimeMinutesTotal = taxiTimePerAirportMin * 2; // origin + destination
  const taxiTimeHours = taxiTimeMinutesTotal / 60;
  const taxiFuel = taxiTimeHours * config.fuelFlow;
  const contingency = Math.max(tripFuel * 0.05, config.contingencyFuelMin);
  const totalFuelNeeded = tripFuel + taxiFuel + contingency + config.reserveFuel;
  
  // 4. Calculate range per leg (max distance on one tank)
  const fuelAvailableForTrip = availableFuel - taxiFuel - config.reserveFuel;
  const maxTripFuelPerLeg = fuelAvailableForTrip - config.contingencyFuelMin;
  const maxCruiseTimePerLeg = maxTripFuelPerLeg / config.fuelFlow;
  const rangePerLeg = maxCruiseTimePerLeg * effectiveGroundSpeed;
  
  // 5. Calculate number of stops
  let stops = 0;
  const MAX_PRACTICAL_STOPS = 4; // More than 4 stops is impractical
  
  if (rangePerLeg <= 0 || availableFuel < (taxiFuel + config.reserveFuel + 10)) {
    stops = 999; // Can't make flight with this load
  } else if (distance > rangePerLeg) {
    stops = Math.ceil(distance / rangePerLeg) - 1;
    // If too many stops needed, mark as not viable
    if (stops > MAX_PRACTICAL_STOPS) {
      stops = 999;
    }
  }
  
  // 6. Calculate times - include taxi time from config + fuel stops
  const flightTimeMinutes = cruiseTimeHours * 60;
  const totalTime = Math.round(flightTimeMinutes + taxiTimeMinutesTotal + (stops * 45)); // 45 min per fuel stop
  
  // 7. Calculate costs based on total engine hours (flight + taxi)
  const totalEngineHours = (flightTimeMinutes + taxiTimeMinutesTotal) / 60;
  const hourlyCost = config.maintenanceCost;
  const totalCost = Math.round((totalEngineHours * hourlyCost) / 10) * 10; // Round to $10
  
  // 8. Calculate fuel margin for nonstop flights
  let fuelMarginPercent: number | undefined;
  if (stops === 0 && availableFuel > 0) {
    // How much extra fuel capacity do we have beyond what's needed?
    fuelMarginPercent = ((availableFuel - totalFuelNeeded) / totalFuelNeeded) * 100;
  }
  
  return {
    aircraft,
    time: totalTime,
    fuel: Math.ceil(totalFuelNeeded), // Return total fuel including taxi, contingency, reserve
    cost: totalCost,
    stops,
    canMakeIt: stops < 999,
    runwayOk: true,
    fuelMarginPercent,
  };
}

export function compareMissions(
  distance: number,
  passengers: number,
  bags: number,
  sr22Config: AircraftConfig,
  jetConfig: AircraftConfig,
  headwindKts: number,
  taxiTimePerAirportMin: number = 0
): ComparisonResult {
  const sr22 = calculateFlight(distance, sr22Config, 'SR22', passengers, bags, headwindKts, taxiTimePerAirportMin);
  const jet = calculateFlight(distance, jetConfig, 'VisionJet', passengers, bags, headwindKts, taxiTimePerAirportMin);
  
  const timeSaved = sr22.time - jet.time;
  const costDifference = jet.cost - sr22.cost;
  
  // Check capacity constraints
  const sr22CanFit = passengers <= sr22Config.maxPassengers && bags <= sr22Config.maxBags;
  const jetCanFit = passengers <= jetConfig.maxPassengers && bags <= jetConfig.maxBags;
  
  // Check if weight limits allow flight
  const sr22AvailableFuel = calculateAvailableFuel(sr22Config, passengers, bags);
  const jetAvailableFuel = calculateAvailableFuel(jetConfig, passengers, bags);
  const sr22WeightOk = sr22AvailableFuel > 10; // Need at least 10 gallons
  const jetWeightOk = jetAvailableFuel > 10;
  
  // Validate payload/range for Vision Jet
  const payload = (passengers * jetConfig.avgPersonWeight) + (bags * jetConfig.avgBagWeight);
  const payloadRangeCheck = validatePayloadRange(payload, distance, 'VisionJet', jetConfig);
  
  let winner: 'SR22' | 'VisionJet' | 'tie' = 'tie';
  
  // If one can't fit due to capacity or weight, the other wins
  if ((!sr22CanFit || !sr22WeightOk) && (jetCanFit && jetWeightOk)) {
    winner = 'VisionJet';
  } else if ((sr22CanFit && sr22WeightOk) && (!jetCanFit || !jetWeightOk)) {
    winner = 'SR22';
  } else if (sr22CanFit && jetCanFit && sr22WeightOk && jetWeightOk) {
    // Both can fit, compare performance
    
    // Calculate time savings as percentage of SR22 flight time
    const timeSavingsPercent = (timeSaved / sr22.time) * 100;
    // Calculate cost savings as percentage
    const costSavingsPercent = (costDifference / jet.cost) * 100;
    
    // SR22 wins if it's significantly cheaper (60%+) and only moderately slower (within 25%)
    if (costSavingsPercent >= 60 && timeSavingsPercent <= 25) {
      winner = 'SR22';
    }
    // SR22 wins if it's much cheaper AND time difference is small
    else if (costDifference > 800 && timeSaved < 20) {
      winner = 'SR22';
    }
    // Vision Jet wins if it saves considerable time (>20% faster or >45 min)
    else if (timeSavingsPercent > 20 || timeSaved > 45) {
      winner = 'VisionJet';
    } 
    // Vision Jet wins if it requires fewer stops (big operational advantage)
    else if (jet.stops < sr22.stops) {
      winner = 'VisionJet';
    }
    // SR22 wins if same stops but much cheaper
    else if (sr22.stops === jet.stops && costDifference > 500) {
      winner = 'SR22';
    }
    // Otherwise it's truly a close match
  }
  
  // Detect close call scenarios
  const isCloseCall = 
    // Time-based close call: within 30 minutes either way
    (Math.abs(timeSaved) <= 30) ||
    // Value-based close call: SR22 is 60%+ cheaper but Jet saves meaningful time (15-45 min)
    (costDifference / jet.cost >= 0.6 && timeSaved >= 15 && timeSaved <= 45);
  
  return {
    sr22,
    jet,
    winner,
    timeSaved,
    costDifference,
    payloadRangeWarning: payloadRangeCheck.warning, // Add warning to result
    isCloseCall,
  };
}

export function calculateTimeValue(
  timeSavedMinutes: number,
  timeValuePerHour: number
): number {
  return Math.round((timeSavedMinutes / 60) * timeValuePerHour);
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatCost(dollars: number): string {
  return `$${dollars.toLocaleString()}`;
}
