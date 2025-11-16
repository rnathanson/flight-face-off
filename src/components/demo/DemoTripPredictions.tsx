import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { AlertTriangle, CheckCircle, Target, MapPin, Plane, Clock, Loader2, User, Users, X, Heart } from 'lucide-react';
import { GeocodeResult } from '@/lib/geocoding';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TripData } from '@/types/trip';
import { cn } from '@/lib/utils';

interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance_nm?: number;
}

interface TripCalculation {
  origin: GeocodeResult;
  destination: GeocodeResult;
  originAirport: Airport;
  destAirport: Airport;
  baseTime: number;
}

interface MedicalPersonnel {
  id: string;
  full_name: string;
  role: string;
  specialty?: string;
  total_missions: number;
  success_rate: number;
}

interface CrewMember {
  id: string;
  full_name: string;
  role: string;
  is_chief_pilot: boolean;
  total_missions: number;
  success_rate: number;
}

interface MissionType {
  id: string;
  organ_type: string;
  min_viability_hours: number;
  max_viability_hours: number;
}

interface SuccessAnalysis {
  overallSuccess: number;
  crewScore: number;
  medicalTeamScore: number;
  routeScore: number;
  viabilityScore: number;
  viabilityStatus: 'safe' | 'warning' | 'critical';
  viabilityUsedPercent: number;
  insights: Array<{
    type: string;
    title: string;
    message: string;
    score: number;
    status?: string;
  }>;
  suggestions: string[];
  crewMembers: CrewMember[];
  leadDoctor: MedicalPersonnel;
  surgicalTeam: MedicalPersonnel[];
  coordinator?: MedicalPersonnel;
  missionType: MissionType;
}

interface DemoTripPredictionsProps {
  initialTripData?: TripData | null;
}

export const DemoTripPredictions = ({ initialTripData }: DemoTripPredictionsProps) => {
  const [originHospital, setOriginHospital] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<GeocodeResult | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<GeocodeResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [tripCalc, setTripCalc] = useState<TripCalculation | null>(null);
  
  // New state for organ selection and team
  const [organType, setOrganType] = useState<string>('');
  const [missionTypes, setMissionTypes] = useState<MissionType[]>([]);
  const [leadDoctorSearch, setLeadDoctorSearch] = useState('');
  const [selectedLeadDoctor, setSelectedLeadDoctor] = useState<MedicalPersonnel | null>(null);
  const [leadDoctorSuggestions, setLeadDoctorSuggestions] = useState<MedicalPersonnel[]>([]);
  const [surgicalTeam, setSurgicalTeam] = useState<MedicalPersonnel[]>([]);
  const [surgeonSearch, setSurgeonSearch] = useState('');
  const [surgeonSuggestions, setSurgeonSuggestions] = useState<MedicalPersonnel[]>([]);
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [selectedCoordinator, setSelectedCoordinator] = useState<MedicalPersonnel | null>(null);
  const [coordinatorSuggestions, setCoordinatorSuggestions] = useState<MedicalPersonnel[]>([]);
  const [availableCrew, setAvailableCrew] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember[]>([]);
  const [successAnalysis, setSuccessAnalysis] = useState<SuccessAnalysis | null>(null);
  const [caseNumber, setCaseNumber] = useState('');
  const [caseData, setCaseData] = useState<any>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [customSurgeonName, setCustomSurgeonName] = useState('');
  
  const { toast } = useToast();

  // Fetch mission types and available crew on mount
  useEffect(() => {
    const fetchData = async () => {
      const { data: missionData } = await supabase
        .from('mission_types')
        .select('*')
        .order('organ_type');
      if (missionData) {
        setMissionTypes(missionData);
      }

      const { data: crewData } = await supabase
        .from('crew_members')
        .select('*')
        .order('full_name');
      if (crewData) {
        setAvailableCrew(crewData);
        // Pre-select top 2 by success rate
        const topCrew = [...crewData].sort((a, b) => b.success_rate - a.success_rate).slice(0, 2);
        setSelectedCrew(topCrew);
      }
    };
    fetchData();
  }, []);

  // Search medical personnel with debounce
  useEffect(() => {
    if (leadDoctorSearch.length < 2) {
      setLeadDoctorSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase.functions.invoke('search-medical-personnel', {
        body: { searchTerm: leadDoctorSearch, role: 'lead_doctor' }
      });
      if (data?.results) {
        setLeadDoctorSuggestions(data.results);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [leadDoctorSearch]);

  useEffect(() => {
    if (surgeonSearch.length < 2) {
      setSurgeonSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase.functions.invoke('search-medical-personnel', {
        body: { searchTerm: surgeonSearch, role: 'surgeon' }
      });
      if (data?.results) {
        setSurgeonSuggestions(data.results);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [surgeonSearch]);

  useEffect(() => {
    if (coordinatorSearch.length < 2) {
      setCoordinatorSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase.functions.invoke('search-medical-personnel', {
        body: { searchTerm: coordinatorSearch, role: 'coordinator' }
      });
      if (data?.results) {
        setCoordinatorSuggestions(data.results);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [coordinatorSearch]);

  const findNearestAirport = async (lat: number, lng: number): Promise<Airport> => {
    const { data, error } = await supabase.functions.invoke('find-nearest-airport', {
      body: { lat, lng, maxDistance: 100 }
    });

    if (error || !data) {
      throw new Error('Failed to find nearest airport');
    }

    return {
      code: data.airport,
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      distance_nm: data.distance_nm
    };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3440.065;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateFlightTime = (distanceNM: number): number => {
    const cruiseSpeed = 440;
    const flightTimeMinutes = (distanceNM / cruiseSpeed) * 60;
    const taxiTime = 20;
    return Math.round(flightTimeMinutes + taxiTime);
  };

  const handleCalculate = async () => {
    if (!selectedOrigin || !selectedDestination) {
      toast({
        title: "Missing Information",
        description: "Please select both origin and destination hospitals",
        variant: "destructive",
      });
      return;
    }

    if (!organType) {
      toast({
        title: "Missing Information",
        description: "Please select an organ type",
        variant: "destructive",
      });
      return;
    }

    if (!selectedLeadDoctor) {
      toast({
        title: "Missing Information",
        description: "Please select a lead doctor",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);
    setSuccessAnalysis(null);

    try {
      const originAirport = await findNearestAirport(selectedOrigin.lat, selectedOrigin.lon);
      const destAirport = await findNearestAirport(selectedDestination.lat, selectedDestination.lon);

      const flightDistance = calculateDistance(
        originAirport.lat,
        originAirport.lng,
        destAirport.lat,
        destAirport.lng
      );
      const flightTime = calculateFlightTime(flightDistance);
      const originGroundTime = Math.round((originAirport.distance_nm || 10) * 2.5);
      const destGroundTime = Math.round((destAirport.distance_nm || 10) * 2.5);
      const baseTime = originGroundTime + flightTime + destGroundTime;

      setTripCalc({
        origin: selectedOrigin,
        destination: selectedDestination,
        originAirport,
        destAirport,
        baseTime,
      });

      const { data: analysis } = await supabase.functions.invoke('calculate-mission-success', {
        body: {
          crewMemberIds: selectedCrew.map(c => c.id),
          leadDoctorId: selectedLeadDoctor.id,
          surgicalTeamIds: surgicalTeam.map(s => s.id),
          coordinatorId: selectedCoordinator?.id,
          organType,
          estimatedTimeMinutes: baseTime,
          originHospital: selectedOrigin.displayName,
          destinationHospital: selectedDestination.displayName,
        }
      });

      if (analysis) {
        setSuccessAnalysis(analysis);
      }

      toast({
        title: "Mission Analysis Complete",
        description: "AI predictions generated successfully",
      });
    } catch (error) {
      console.error('Error calculating trip:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate trip details",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const addSurgeon = (surgeon: MedicalPersonnel) => {
    if (!surgicalTeam.find(s => s.id === surgeon.id)) {
      setSurgicalTeam([...surgicalTeam, surgeon]);
      setSurgeonSearch('');
      setSurgeonSuggestions([]);
    }
  };

  const addCustomSurgeon = () => {
    const trimmedName = customSurgeonName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast({
        title: "Invalid Name",
        description: "Surgeon name must be between 2 and 100 characters",
        variant: "destructive",
      });
      return;
    }

    const customSurgeon: MedicalPersonnel = {
      id: `custom-${Date.now()}`,
      full_name: trimmedName,
      role: 'surgeon',
      specialty: 'General Surgery',
      total_missions: 0,
      success_rate: 90,
    };

    setSurgicalTeam([...surgicalTeam, customSurgeon]);
    setCustomSurgeonName('');
    toast({
      title: "Surgeon Added",
      description: `${trimmedName} has been added to the surgical team`,
    });
  };

  const removeSurgeon = (id: string) => {
    setSurgicalTeam(surgicalTeam.filter(s => s.id !== id));
  };

  const toggleCrewSelection = (crew: CrewMember) => {
    if (selectedCrew.find(c => c.id === crew.id)) {
      setSelectedCrew(selectedCrew.filter(c => c.id !== crew.id));
    } else if (selectedCrew.length < 2) {
      setSelectedCrew([...selectedCrew, crew]);
    } else {
      toast({
        title: "Maximum Crew Size",
        description: "You can only select 2 pilots per mission",
        variant: "destructive",
      });
    }
  };

  const lookupCaseNumber = () => {
    const trimmedCase = caseNumber.trim();
    if (trimmedCase.length < 3 || trimmedCase.length > 20) {
      toast({
        title: "Invalid Case Number",
        description: "Case number must be between 3 and 20 characters",
        variant: "destructive",
      });
      return;
    }

    setLoadingCase(true);
    
    // Simulate CRM lookup with fake data
    setTimeout(() => {
      const mockData = {
        caseNumber: trimmedCase,
        patientId: `PT-${Math.floor(Math.random() * 10000)}`,
        organType: ['heart', 'liver', 'lungs', 'kidneys', 'pancreas'][Math.floor(Math.random() * 5)],
        priority: ['Standard', 'Urgent', 'Critical'][Math.floor(Math.random() * 3)],
        insurance: ['Medicare', 'Blue Cross', 'Aetna', 'UnitedHealthcare'][Math.floor(Math.random() * 4)],
        policyNumber: `POL-${Math.floor(Math.random() * 100000)}`,
        originHospital: 'Northwell Health - Lenox Hill Hospital',
        destinationHospital: 'Johns Hopkins Hospital',
        leadPhysician: 'Dr. Sarah Chen',
        coordinatorNotes: 'Patient is stable. Time-sensitive case. Insurance pre-authorized for air transport.',
        previousTransports: Math.floor(Math.random() * 3),
      };
      
      setCaseData(mockData);
      setOrganType(mockData.organType);
      setLoadingCase(false);
      
      toast({
        title: "Case Retrieved",
        description: `Case ${trimmedCase} loaded successfully from CRM`,
      });
    }, 1200);
  };

  const selectedMissionType = missionTypes.find(mt => mt.organ_type === organType);

  return (
    <div className="space-y-6">
      <Card className="shadow-card animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            AI-Powered Trip Intelligence
          </CardTitle>
          <CardDescription>
            Advanced mission planning with organ viability tracking and success prediction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Case Number Lookup */}
          <div className="space-y-2">
            <Label>Case Number (Optional - CRM Integration)</Label>
            <div className="flex gap-2">
              <Input
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value.toUpperCase())}
                placeholder="Enter case number (e.g., TXP-2024-001)"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && lookupCaseNumber()}
              />
              <Button 
                onClick={lookupCaseNumber}
                disabled={loadingCase || caseNumber.length < 3}
                variant="secondary"
              >
                {loadingCase ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Lookup'
                )}
              </Button>
            </div>
            {caseData && (
              <div className="mt-3 p-4 bg-accent/10 rounded-md border border-accent/20 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Case Details Retrieved
                  </h4>
                  <Badge variant={caseData.priority === 'Critical' ? 'destructive' : caseData.priority === 'Urgent' ? 'secondary' : 'default'}>
                    {caseData.priority}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Patient ID:</span>
                    <p className="font-medium">{caseData.patientId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organ Type:</span>
                    <p className="font-medium capitalize">{caseData.organType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Insurance:</span>
                    <p className="font-medium">{caseData.insurance}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Policy #:</span>
                    <p className="font-medium">{caseData.policyNumber}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-accent/20">
                  <span className="text-muted-foreground text-xs">Coordinator Notes:</span>
                  <p className="text-sm mt-1">{caseData.coordinatorNotes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origin Hospital</Label>
              <LocationAutocomplete
                value={originHospital}
                onChange={setOriginHospital}
                onLocationSelect={(result) => {
                  setSelectedOrigin(result);
                  setOriginHospital(result.displayName);
                }}
                placeholder="Search origin hospital..."
                label="Origin Hospital"
              />
            </div>
            <div className="space-y-2">
              <Label>Destination Hospital</Label>
              <LocationAutocomplete
                value={destinationHospital}
                onChange={setDestinationHospital}
                onLocationSelect={(result) => {
                  setSelectedDestination(result);
                  setDestinationHospital(result.displayName);
                }}
                placeholder="Search destination hospital..."
                label="Destination Hospital"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Organ Type / Mission Profile</Label>
            <Select value={organType} onValueChange={setOrganType}>
              <SelectTrigger>
                <SelectValue placeholder="Select organ type..." />
              </SelectTrigger>
              <SelectContent>
                {missionTypes.map((mt) => (
                  <SelectItem key={mt.id} value={mt.organ_type}>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span className="capitalize">{mt.organ_type}</span>
                      <span className="text-muted-foreground text-xs">
                        ({mt.min_viability_hours}-{mt.max_viability_hours}h viability)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMissionType && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Heart className="w-4 h-4" />
                <span>
                  Viability Window: {selectedMissionType.min_viability_hours}-{selectedMissionType.max_viability_hours} hours
                </span>
              </div>
            )}
          </div>

          {/* Flight Crew Selection */}
          <div className="space-y-2">
            <Label>Flight Crew (Select 2 Pilots)</Label>
            <div className="grid md:grid-cols-2 gap-2">
              {availableCrew.map((crew) => {
                const isSelected = selectedCrew.find(c => c.id === crew.id);
                return (
                  <button
                    key={crew.id}
                    onClick={() => toggleCrewSelection(crew)}
                    className={cn(
                      "p-3 rounded-md border-2 text-left transition-all hover:scale-[1.02]",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          Captain {crew.full_name}
                          {crew.is_chief_pilot && " 🛡️"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {crew.total_missions} missions • {crew.success_rate}% success
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedCrew.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedCrew.length}/2 pilots selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Lead Doctor</Label>
            <div className="relative">
              <Input
                value={selectedLeadDoctor ? selectedLeadDoctor.full_name : leadDoctorSearch}
                onChange={(e) => {
                  setLeadDoctorSearch(e.target.value);
                  if (selectedLeadDoctor) setSelectedLeadDoctor(null);
                }}
                placeholder="Search for lead doctor..."
              />
              {leadDoctorSuggestions.length > 0 && !selectedLeadDoctor && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                  {leadDoctorSuggestions.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedLeadDoctor(doc);
                        setLeadDoctorSearch('');
                        setLeadDoctorSuggestions([]);
                      }}
                      className="w-full p-3 text-left hover:bg-accent/50 transition-colors"
                    >
                      <p className="font-medium text-sm">{doc.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.specialty} • {doc.total_missions} missions • {doc.success_rate}% success
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedLeadDoctor && (
              <div className="p-3 bg-primary/10 rounded-md">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedLeadDoctor.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedLeadDoctor.specialty} • {selectedLeadDoctor.total_missions} missions • {selectedLeadDoctor.success_rate}% success
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Surgical Team (Optional)</Label>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  value={surgeonSearch}
                  onChange={(e) => setSurgeonSearch(e.target.value)}
                  placeholder="Search for surgeon in database..."
                />
                {surgeonSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                    {surgeonSuggestions.map((surgeon) => (
                      <button
                        key={surgeon.id}
                        onClick={() => addSurgeon(surgeon)}
                        className="w-full p-3 text-left hover:bg-accent/50 transition-colors"
                        disabled={surgicalTeam.some(s => s.id === surgeon.id)}
                      >
                        <p className="font-medium text-sm">{surgeon.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {surgeon.specialty} • {surgeon.total_missions} missions • {surgeon.success_rate}% success
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add Custom Surgeon */}
              <div className="flex gap-2">
                <Input
                  value={customSurgeonName}
                  onChange={(e) => setCustomSurgeonName(e.target.value)}
                  placeholder="Or add surgeon not in database..."
                  maxLength={100}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomSurgeon()}
                />
                <Button 
                  onClick={addCustomSurgeon}
                  disabled={customSurgeonName.trim().length < 2}
                  variant="outline"
                  size="sm"
                >
                  Add
                </Button>
              </div>
            </div>
            
            {surgicalTeam.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {surgicalTeam.map((surgeon) => (
                  <Badge key={surgeon.id} variant="secondary" className="gap-2">
                    {surgeon.full_name}
                    {surgeon.id.startsWith('custom-') && (
                      <span className="text-xs text-muted-foreground">(Custom)</span>
                    )}
                    <button
                      onClick={() => removeSurgeon(surgeon.id)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Transplant Coordinator (Optional)</Label>
            <div className="relative">
              <Input
                value={selectedCoordinator ? selectedCoordinator.full_name : coordinatorSearch}
                onChange={(e) => {
                  setCoordinatorSearch(e.target.value);
                  if (selectedCoordinator) setSelectedCoordinator(null);
                }}
                placeholder="Search for coordinator..."
              />
              {coordinatorSuggestions.length > 0 && !selectedCoordinator && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                  {coordinatorSuggestions.map((coord) => (
                    <button
                      key={coord.id}
                      onClick={() => {
                        setSelectedCoordinator(coord);
                        setCoordinatorSearch('');
                        setCoordinatorSuggestions([]);
                      }}
                      className="w-full p-3 text-left hover:bg-accent/50 transition-colors"
                    >
                      <p className="font-medium text-sm">{coord.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {coord.total_missions} missions • {coord.success_rate}% coordination success
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCoordinator && (
              <div className="p-3 bg-secondary/10 rounded-md">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedCoordinator.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCoordinator.total_missions} missions • {selectedCoordinator.success_rate}% success
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleCalculate} 
            disabled={calculating || !selectedOrigin || !selectedDestination || !organType || !selectedLeadDoctor || selectedCrew.length !== 2}
            className="w-full"
            size="lg"
          >
            {calculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating AI Predictions...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Generate AI Mission Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {successAnalysis && tripCalc && (
        <div className="space-y-4 animate-fade-in">
          <Card className="shadow-elevated bg-gradient-to-br from-card to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Mission Success Prediction</span>
                <Badge variant={successAnalysis.overallSuccess >= 90 ? "default" : successAnalysis.overallSuccess >= 75 ? "secondary" : "destructive"} className="text-lg px-4 py-1">
                  {successAnalysis.overallSuccess}%
                </Badge>
              </CardTitle>
              <CardDescription>
                AI-powered analysis based on crew, medical team, route, and organ viability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Flight Crew</span>
                    <span className="font-medium">{successAnalysis.crewScore}%</span>
                  </div>
                  <Progress value={successAnalysis.crewScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Medical Team</span>
                    <span className="font-medium">{successAnalysis.medicalTeamScore}%</span>
                  </div>
                  <Progress value={successAnalysis.medicalTeamScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium">{successAnalysis.routeScore}%</span>
                  </div>
                  <Progress value={successAnalysis.routeScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Viability</span>
                    <span className="font-medium">{successAnalysis.viabilityScore}%</span>
                  </div>
                  <Progress value={successAnalysis.viabilityScore} className="h-2" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Organ Viability Timeline</span>
                  <Badge variant={successAnalysis.viabilityStatus === 'safe' ? 'default' : successAnalysis.viabilityStatus === 'warning' ? 'secondary' : 'destructive'}>
                    {successAnalysis.viabilityUsedPercent.toFixed(0)}% of window used
                  </Badge>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      successAnalysis.viabilityStatus === 'safe' && "bg-success",
                      successAnalysis.viabilityStatus === 'warning' && "bg-warning",
                      successAnalysis.viabilityStatus === 'critical' && "bg-destructive"
                    )}
                    style={{ width: `${Math.min(successAnalysis.viabilityUsedPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Procurement</span>
                  <span>{(tripCalc.baseTime / 60).toFixed(1)}h transport</span>
                  <span>{successAnalysis.missionType.max_viability_hours}h max</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {successAnalysis.insights.map((insight, idx) => (
              <Card key={idx} className="shadow-card animate-scale-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {insight.type === 'crew' && <Plane className="w-4 h-4 text-primary" />}
                    {insight.type === 'medical' && <User className="w-4 h-4 text-primary" />}
                    {insight.type === 'route' && <MapPin className="w-4 h-4 text-primary" />}
                    {insight.type === 'viability' && <Clock className="w-4 h-4 text-primary" />}
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insight.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {successAnalysis.suggestions.length > 0 && (
            <Card className="shadow-card animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {successAnalysis.viabilityStatus === 'critical' ? (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {successAnalysis.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Flight Route Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">Origin</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tripCalc.originAirport.name} ({tripCalc.originAirport.code})</p>
                  <p className="text-xs text-muted-foreground">{tripCalc.originAirport.distance_nm?.toFixed(1)} NM from hospital</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">Destination</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tripCalc.destAirport.name} ({tripCalc.destAirport.code})</p>
                  <p className="text-xs text-muted-foreground">{tripCalc.destAirport.distance_nm?.toFixed(1)} NM from hospital</p>
                </div>
              </div>
              <div className="p-3 bg-accent/10 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Estimated Time</span>
                  <span className="text-lg font-bold text-primary">{Math.floor(tripCalc.baseTime / 60)}h {tripCalc.baseTime % 60}m</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!tripCalc && !calculating && (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Enter trip details and select your medical team to generate AI-powered mission analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};