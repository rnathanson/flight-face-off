export interface TripSegment {
  from: string;
  to: string;
  type: 'ground' | 'flight';
  distance_nm?: number;
  duration: number;
  arrival_time: string;
  polyline?: string;
  flight_details?: {
    altitude_ft: number;
    headwind_kt: number;
    groundspeed_kt: number;
    fuel_burn_lbs: number;
  };
}

export interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm?: number;
}

export interface WindsAloftData {
  altitude_ft: number;
  temp_c: number;
  wind_dir: number;
  wind_speed_kt: number;
}

export interface ChiefPilotApprovalReason {
  reason: string;
  details: string;
}

export interface ChiefPilotApproval {
  pickup_airport: {
    code: string;
    name: string;
    reasons: ChiefPilotApprovalReason[];
  };
  destination_airport: {
    code: string;
    name: string;
    reasons: ChiefPilotApprovalReason[];
  };
  rejected_airports?: Array<{
    code: string;
    name: string;
    reason: string;
  }>;
}

export interface TripResult {
  segments: TripSegment[];
  total_time_minutes: number;
  conservative_time_minutes: number;
  optimistic_time_minutes: number;
  arrival_time: string;
  conservative_arrival: string;
  optimistic_arrival: string;
  pickup_airport: Airport;
  destination_airport: Airport;
  departure_time: string;
  chiefPilotApproval?: ChiefPilotApproval;
}
