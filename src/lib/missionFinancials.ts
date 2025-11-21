import { TripData } from '@/types/trip';

interface MissionCosts {
  fuel: number;
  crew: number;
  maintenance: number;
  airportFees: number;
  groundTransport: number;
  insurance: number;
  permits: number;
  total: number;
}

interface MissionRevenue {
  baseReimbursement: number;
  distanceMultiplier: number;
  total: number;
}

interface MissionROI {
  costs: MissionCosts;
  revenue: MissionRevenue;
  grossProfit: number;
  profitMargin: number;
  riskAdjustedROI: number;
  successRate: number;
}

/**
 * Calculate realistic mission costs for medical aviation
 * Based on Vision Jet operations and typical medical flight expenses
 */
export function calculateMissionCosts(tripData: TripData): MissionCosts {
  const flightDistanceNM = (tripData.originAirport?.distance_nm || 0) + (tripData.destAirport?.distance_nm || 0);
  
  // Use organ transport time by default, or estimated time
  const missionTimeMinutes = tripData.organTransportTime || tripData.estimatedTimeMinutes || 0;
  const estimatedFlightHours = missionTimeMinutes > 0 ? missionTimeMinutes / 60 : flightDistanceNM / 300;
  
  // Fuel cost calculation
  // Vision Jet burns ~60 gallons/hour at 300 knots cruise
  // Jet A fuel costs approximately $6/gallon
  const fuelGallons = estimatedFlightHours * 60;
  const fuel = Math.round(fuelGallons * 6);
  
  // Crew cost calculation
  // 2 pilots + medical staff, minimum $2,500, scales with flight time
  const crewHourlyRate = 450;
  const crew = Math.max(2500, Math.round(estimatedFlightHours * crewHourlyRate));
  
  // Maintenance cost per flight hour
  // Based on engine reserves, airframe maintenance, inspections
  const maintenance = Math.round(estimatedFlightHours * 800);
  
  // Airport fees
  // Landing fees, handling fees, FBO services
  // Scales with distance and airport size
  const baseFees = 1500;
  const distanceFactor = Math.round((flightDistanceNM / 100) * 200);
  const airportFees = baseFees + distanceFactor;
  
  // Ground transport (ambulance at both ends)
  const groundTransport = 2000;
  
  // Insurance per mission
  const insurance = 1500;
  
  // Permits and coordination
  const permits = 500;
  
  const total = fuel + crew + maintenance + airportFees + groundTransport + insurance + permits;
  
  return {
    fuel,
    crew,
    maintenance,
    airportFees,
    groundTransport,
    insurance,
    permits,
    total,
  };
}

/**
 * Calculate expected revenue based on organ type and Medicare/insurance reimbursement
 */
export function calculateMissionRevenue(tripData: TripData): MissionRevenue {
  const flightDistanceNM = (tripData.originAirport?.distance_nm || 0) + (tripData.destAirport?.distance_nm || 0);
  const organType = tripData.missionType?.organ_type?.toLowerCase() || 'kidney';
  
  // Base reimbursement rates by organ type
  let baseReimbursement = 180000; // Default for kidney/lung
  
  if (organType.includes('heart') || organType.includes('liver')) {
    baseReimbursement = 275000;
  } else if (organType.includes('lung') || organType.includes('kidney')) {
    baseReimbursement = 200000;
  } else if (organType.includes('pancreas')) {
    baseReimbursement = 165000;
  } else {
    baseReimbursement = 135000;
  }
  
  // Distance multiplier for longer trips (increased urgency/complexity)
  const distanceMultiplier = 1 + (flightDistanceNM / 2000);
  const total = Math.round(baseReimbursement * distanceMultiplier);
  
  return {
    baseReimbursement,
    distanceMultiplier,
    total,
  };
}

/**
 * Calculate complete ROI analysis with risk adjustment
 */
export function calculateROI(tripData: TripData): MissionROI {
  const costs = calculateMissionCosts(tripData);
  const revenue = calculateMissionRevenue(tripData);
  
  const grossProfit = revenue.total - costs.total;
  const profitMargin = (grossProfit / revenue.total) * 100;
  const successRate = tripData.overallSuccess || 85;
  const riskAdjustedROI = grossProfit * (successRate / 100);
  
  return {
    costs,
    revenue,
    grossProfit,
    profitMargin,
    riskAdjustedROI,
    successRate,
  };
}
