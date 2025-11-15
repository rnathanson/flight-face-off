// Flight history airports - places we've flown from KFRG
export interface Airport {
  code: string;
  lat: number;
  lng: number;
  name: string;
}

export const FLIGHT_HISTORY_AIRPORTS: Airport[] = [
  { code: 'KDLH', lat: 46.8420, lng: -92.1936, name: 'Duluth International' },
  { code: 'KATW', lat: 44.2581, lng: -88.5191, name: 'Appleton International' },
  { code: 'KBUU', lat: 44.5388, lng: -89.8468, name: 'Burlington Municipal' },
  { code: 'KGYY', lat: 41.5179, lng: -87.4128, name: 'Gary/Chicago International' },
  { code: 'KMBS', lat: 43.5329, lng: -84.0796, name: 'MBS International' },
  { code: 'KIAG', lat: 43.1073, lng: -78.9462, name: 'Niagara Falls International' },
  { code: 'KRME', lat: 43.2656, lng: -75.4069, name: 'Griffiss International' },
  { code: 'KALB', lat: 42.7483, lng: -73.8017, name: 'Albany International' },
  { code: '6B0', lat: 42.5709, lng: -71.1234, name: 'Minute Man Airfield' },
  { code: 'KPWM', lat: 43.6462, lng: -70.3093, name: 'Portland International Jetport' },
  { code: 'KBHB', lat: 44.4507, lng: -68.3616, name: 'Hancock County-Bar Harbor' },
  { code: 'KBED', lat: 42.4700, lng: -71.2890, name: 'Laurence G. Hanscom Field' },
  { code: 'KGON', lat: 41.3301, lng: -72.0451, name: 'Groton-New London' },
  { code: 'KFOK', lat: 40.7318, lng: -72.6318, name: 'Francis S. Gabreski' },
  { code: 'KACY', lat: 39.4576, lng: -74.5772, name: 'Atlantic City International' },
  { code: 'KORF', lat: 36.8946, lng: -76.2012, name: 'Norfolk International' },
  { code: 'KPIA', lat: 40.6642, lng: -89.6933, name: 'General Wayne A. Downing Peoria' },
  { code: 'KMFD', lat: 40.8214, lng: -82.5166, name: 'Mansfield Lahm Regional' },
  { code: 'KAGC', lat: 40.3546, lng: -79.9302, name: 'Allegheny County' },
  { code: 'N30', lat: 40.8252, lng: -74.4147, name: 'Andover Airport' },
  { code: 'N12', lat: 40.8794, lng: -74.5847, name: 'Randall Airport' },
  { code: 'KHGR', lat: 39.7079, lng: -77.7295, name: 'Hagerstown Regional' },
  { code: 'KJYO', lat: 39.0778, lng: -77.5583, name: 'Leesburg Executive' },
  { code: 'KLYH', lat: 37.3267, lng: -79.2004, name: 'Lynchburg Regional' },
  { code: 'KBMI', lat: 40.4762, lng: -88.9159, name: 'Central Illinois Regional' },
  { code: 'KLCK', lat: 39.7438, lng: -83.8152, name: 'Rickenbacker International' },
  { code: 'KTYS', lat: 35.8110, lng: -83.9940, name: 'McGhee Tyson' },
  { code: 'KJWN', lat: 33.9829, lng: -83.8493, name: 'Winder-Barrow' },
  { code: 'KMQY', lat: 35.4358, lng: -84.5625, name: 'Smyrna Airport' },
  { code: 'KMMI', lat: 35.0618, lng: -85.2016, name: 'McMinn County' },
  { code: 'KROG', lat: 36.3819, lng: -89.5729, name: 'Rogers Municipal' },
  { code: 'KCXW', lat: 32.5171, lng: -93.0730, name: 'Shreveport Downtown' },
  { code: 'KDTS', lat: 32.5162, lng: -93.7450, name: 'Destin Executive' },
  { code: 'KSAV', lat: 32.1276, lng: -81.2021, name: 'Savannah/Hilton Head International' },
  { code: 'KCHS', lat: 32.8986, lng: -80.0405, name: 'Charleston International' },
  { code: 'KFLO', lat: 34.1854, lng: -79.7239, name: 'Florence Regional' },
  { code: 'KVRB', lat: 27.6556, lng: -80.4179, name: 'Vero Beach Regional' },
  { code: 'KVDF', lat: 30.7822, lng: -83.1933, name: 'Valdosta Regional' },
  { code: 'KSRQ', lat: 27.3954, lng: -82.5544, name: 'Sarasota-Bradenton International' },
  { code: 'KDED', lat: 26.1772, lng: -80.2308, name: 'Deerfield Beach Airport' },
  { code: '7FL6', lat: 26.1986, lng: -80.2325, name: 'Pompano Beach Airpark' },
  { code: 'KRWI', lat: 41.9222, lng: -71.4903, name: 'Rocky Hill Airport' },
  { code: '59B', lat: 42.6009, lng: -71.3180, name: 'Minute Man Air Field' },
  { code: 'CYPD', lat: 49.2542, lng: -57.0414, name: 'Port Hope Simpson Airport' },
];

export const KFRG_LOCATION = { lng: -73.4134, lat: 40.7288 }; // Republic Airport, Long Island
