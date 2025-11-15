import { GeocodeResult } from '@/lib/geocoding';

export interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm?: number;
}

export interface TripData {
  origin: GeocodeResult;
  destination: GeocodeResult;
  originHospital: string;
  destinationHospital: string;
  originAirport?: Airport;
  destAirport?: Airport;
}
