import { GeocodeResult } from '@/lib/geocoding';

export interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm?: number;
}

export interface CrewMember {
  id: string;
  full_name: string;
  role: string;
  is_chief_pilot: boolean;
  total_missions: number;
  success_rate: number;
  organ_experience?: Record<string, {
    missions: number;
    success_rate: number;
  }>;
  airport_experience?: Record<string, number>;
}

export interface MedicalPersonnel {
  id: string;
  full_name: string;
  role: string;
  specialty?: string;
  total_missions: number;
  success_rate: number;
  organ_experience?: Record<string, {
    missions: number;
    success_rate: number;
  }>;
  hospital_partnerships?: Record<string, number>;
}

export interface MissionType {
  id: string;
  organ_type: string;
  min_viability_hours: number;
  max_viability_hours: number;
}

export interface TripData {
  origin: GeocodeResult;
  destination: GeocodeResult;
  originHospital: string;
  destinationHospital: string;
  originAirport?: Airport;
  destAirport?: Airport;
  // Success analysis data
  crewMembers?: CrewMember[];
  leadDoctor?: MedicalPersonnel;
  surgicalTeam?: MedicalPersonnel[];
  coordinator?: MedicalPersonnel;
  missionType?: MissionType;
  overallSuccess?: number;
  viabilityStatus?: 'safe' | 'warning' | 'critical';
  viabilityUsedPercent?: number;
  estimatedTimeMinutes?: number;
  departureTime?: string;
  insights?: Array<{
    type: string;
    title: string;
    message: string;
    score: number;
    status?: string;
  }>;
  suggestions?: string[];
  route?: any;
  // Segment mode for time calculation
  segmentMode?: 'organ-transport' | 'full-roundtrip';
  organTransportTime?: number;
  fullRoundtripTime?: number;
  positioningTime?: number;
}
