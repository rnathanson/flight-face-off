/**
 * Shared airport data and utilities
 * Single source of truth for coordinate caches and distance calculations
 */
import { calculateDistance } from './geo-utils.ts';

export { calculateDistance };

// Fast-path coordinate cache for common airports
export const AIRPORT_COORDS: Record<string, { lat: number; lng: number; name?: string }> = {
  // NY/CT/MA/RI Regional
  'KALB': { lat: 42.7483, lng: -73.8017, name: 'Albany International Airport' },
  'KFRG': { lat: 40.7289, lng: -73.4134, name: 'Republic Airport' },
  'KISP': { lat: 40.7952, lng: -73.1002, name: 'Long Island MacArthur Airport' },
  'KHWV': { lat: 41.0678, lng: -72.8498, name: 'Tweed New Haven Airport' },
  'KGON': { lat: 41.3308, lng: -72.0451, name: 'Groton-New London Airport' },
  'KMTP': { lat: 41.0762, lng: -71.9200, name: 'Montauk Airport' },
  'KBID': { lat: 41.7390, lng: -71.5804, name: 'Block Island State Airport' },
  '0B8': { lat: 41.2637, lng: -71.9616, name: 'Elizabeth Field' },
  'KWST': { lat: 41.3337, lng: -71.8033, name: 'Westerly State Airport' },
  'KOQU': { lat: 41.2919, lng: -71.4208, name: 'Quonset State Airport' },
  'KPVD': { lat: 41.7240, lng: -71.4281, name: 'Theodore Francis Green State Airport' },
  'KHVN': { lat: 41.2637, lng: -72.8868, name: 'Tweed New Haven Airport' },
  'KBDR': { lat: 41.1635, lng: -73.1261, name: 'Igor I. Sikorsky Memorial Airport' },
  'KOXC': { lat: 41.4786, lng: -72.6120, name: 'Waterbury-Oxford Airport' },
  'KPOU': { lat: 41.6266, lng: -73.8842, name: 'Dutchess County Airport' },
  'KHPN': { lat: 41.0670, lng: -73.7076, name: 'Westchester County Airport' },
  'KBDL': { lat: 41.9389, lng: -72.6832, name: 'Bradley International Airport' },
  'KORH': { lat: 42.2673, lng: -71.8757, name: 'Worcester Regional Airport' },
  'KBOS': { lat: 42.3643, lng: -71.0052, name: 'Boston Logan International Airport' },
  
  // Major Hubs
  'KJFK': { lat: 40.6398, lng: -73.7789, name: 'John F. Kennedy International Airport' },
  'KLGA': { lat: 40.7769, lng: -73.8740, name: 'LaGuardia Airport' },
  'KEWR': { lat: 40.6925, lng: -74.1687, name: 'Newark Liberty International Airport' },
  'KTEB': { lat: 40.8501, lng: -74.0609, name: 'Teterboro Airport' },
  'KPHL': { lat: 39.8721, lng: -75.2408, name: 'Philadelphia International Airport' },
  'KBWI': { lat: 39.1754, lng: -76.6683, name: 'Baltimore/Washington International Airport' },
  'KDCA': { lat: 38.8521, lng: -77.0377, name: 'Ronald Reagan Washington National Airport' },
  'KIAD': { lat: 38.9445, lng: -77.4558, name: 'Washington Dulles International Airport' },
  
  // Southeast Regional
  'KATL': { lat: 33.6367, lng: -84.4281, name: 'Hartsfield-Jackson Atlanta International Airport' },
  'KCLT': { lat: 35.2140, lng: -80.9431, name: 'Charlotte Douglas International Airport' },
  'KRDU': { lat: 35.8776, lng: -78.7875, name: 'Raleigh-Durham International Airport' },
  'KGSO': { lat: 36.0978, lng: -79.9373, name: 'Piedmont Triad International Airport' },
  'KAVL': { lat: 35.4362, lng: -82.5418, name: 'Asheville Regional Airport' },
  'KHKY': { lat: 35.7411, lng: -81.3895, name: 'Hickory Regional Airport' },
  'KBUY': { lat: 36.0484, lng: -79.4747, name: 'Burlington-Alamance Regional Airport' },
  'KHNZ': { lat: 36.2615, lng: -78.5783, name: 'Henderson-Oxford Airport' },
  'KTTA': { lat: 35.5825, lng: -79.1014, name: 'Sanford-Lee County Regional Airport' },
  'KJNX': { lat: 35.5404, lng: -78.3900, name: 'Johnston County Airport' },
  'KJAX': { lat: 30.4941, lng: -81.6879, name: 'Jacksonville International Airport' },
  'KMCO': { lat: 28.4294, lng: -81.3089, name: 'Orlando International Airport' },
  'KTPA': { lat: 27.9755, lng: -82.5332, name: 'Tampa International Airport' },
  'KMIA': { lat: 25.7932, lng: -80.2906, name: 'Miami International Airport' },
  'KFLL': { lat: 26.0726, lng: -80.1527, name: 'Fort Lauderdale-Hollywood International Airport' },
  'KSAV': { lat: 32.1276, lng: -81.2021, name: 'Savannah/Hilton Head International Airport' },
  'KCHS': { lat: 32.8986, lng: -80.0405, name: 'Charleston International Airport' },
  'KMYR': { lat: 33.6817, lng: -78.9283, name: 'Myrtle Beach International Airport' },
  'KTYS': { lat: 35.8109, lng: -83.9940, name: 'McGhee Tyson Airport' },
  'KBNA': { lat: 36.1245, lng: -86.6782, name: 'Nashville International Airport' },
  
  // West Coast
  'KSFO': { lat: 37.6213, lng: -122.3790, name: 'San Francisco International Airport' },
  'KLAX': { lat: 33.9425, lng: -118.4081, name: 'Los Angeles International Airport' },
  'KSEA': { lat: 47.4502, lng: -122.3088, name: 'Seattle-Tacoma International Airport' },
  'KPDX': { lat: 45.5887, lng: -122.5975, name: 'Portland International Airport' },
  'KSAN': { lat: 32.7336, lng: -117.1897, name: 'San Diego International Airport' },
  
  // Central
  'KORD': { lat: 41.9742, lng: -87.9073, name: 'Chicago O\'Hare International Airport' },
  'KMDW': { lat: 41.7868, lng: -87.7522, name: 'Chicago Midway International Airport' },
  'KDFW': { lat: 32.8998, lng: -97.0403, name: 'Dallas/Fort Worth International Airport' },
  'KIAH': { lat: 29.9902, lng: -95.3368, name: 'George Bush Intercontinental Airport' },
  'KDEN': { lat: 39.8561, lng: -104.6737, name: 'Denver International Airport' },
  'KPHX': { lat: 33.4343, lng: -112.0116, name: 'Phoenix Sky Harbor International Airport' },
  'KSLC': { lat: 40.7884, lng: -111.9778, name: 'Salt Lake City International Airport' },
  'KLAS': { lat: 36.0840, lng: -115.1537, name: 'Harry Reid International Airport' },
  'KMSP': { lat: 44.8848, lng: -93.2223, name: 'Minneapolis-St Paul International Airport' },
  'KSTL': { lat: 38.7487, lng: -90.3700, name: 'St. Louis Lambert International Airport' },
};
