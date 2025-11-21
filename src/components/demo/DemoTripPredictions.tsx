import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { AlertTriangle, CheckCircle, Target, MapPin, Plane, Clock, Loader2, User, Users, X, Heart, ChevronsUpDown, Check, Wind, Droplets, Layers, Zap, RotateCcw } from 'lucide-react';
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
  organ_experience?: Record<string, {
    missions: number;
    success_rate: number;
  }>;
  hospital_partnerships?: Record<string, number>;
}
interface CrewMember {
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
interface MissionType {
  id: string;
  organ_type: string;
  min_viability_hours: number;
  max_viability_hours: number;
}
interface LivePrediction {
  overallPrediction: number;
  confidence: 'low' | 'medium' | 'high';
  breakdown: {
    crewScore: number;
    medicalTeamScore: number;
    airportFamiliarityScore: number;
    hospitalPartnershipScore: number;
    distanceComplexityScore: number;
  };
  organSpecificInsights: {
    crew?: string;
    crewSummary?: string;
    leadDoctor?: string;
    surgeons?: string[];
    coordinator?: string;
  };
  logisticsInsights: {
    airportFamiliarity?: string;
    originHospital?: string;
    destHospital?: string;
    routeComplexity?: string;
  };
  optimalTeamSuggestion: {
    crew: CrewMember[];
    leadDoctor: MedicalPersonnel | null;
    reasoning: string;
  };
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
  onTripCalculated?: (data: TripData) => void;
}
export const DemoTripPredictions = ({
  initialTripData,
  onTripCalculated
}: DemoTripPredictionsProps) => {
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
  const [surgeonInputs, setSurgeonInputs] = useState<string[]>(['']);
  const [activeSurgeonInput, setActiveSurgeonInput] = useState<number>(0);
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [selectedCoordinator, setSelectedCoordinator] = useState<MedicalPersonnel | null>(null);
  const [coordinatorSuggestions, setCoordinatorSuggestions] = useState<MedicalPersonnel[]>([]);
  const [leadDoctorOpen, setLeadDoctorOpen] = useState(false);
  const [coordinatorOpen, setCoordinatorOpen] = useState(false);
  const [surgeonOpen, setSurgeonOpen] = useState(false);
  const [availableCrew, setAvailableCrew] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember[]>([]);
  const [successAnalysis, setSuccessAnalysis] = useState<SuccessAnalysis | null>(null);
  const [caseNumber, setCaseNumber] = useState('');
  const [caseData, setCaseData] = useState<any>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [livePrediction, setLivePrediction] = useState<LivePrediction | null>(null);
  const [calculatingLive, setCalculatingLive] = useState(false);
  const [segmentMode, setSegmentMode] = useState<'organ-transport' | 'full-roundtrip'>('organ-transport');
  const {
    toast
  } = useToast();
  
  // Restore state from initialTripData when provided
  useEffect(() => {
    if (initialTripData) {
      setOriginHospital(initialTripData.originHospital || '');
      setDestinationHospital(initialTripData.destinationHospital || '');
      setSelectedOrigin(initialTripData.origin || null);
      setSelectedDestination(initialTripData.destination || null);
      setOrganType(initialTripData.missionType?.organ_type || '');
      setSelectedLeadDoctor(initialTripData.leadDoctor || null);
      setSurgicalTeam(initialTripData.surgicalTeam || []);
      setSelectedCoordinator(initialTripData.coordinator || null);
      setSelectedCrew(initialTripData.crewMembers || []);
      
      // Reconstruct tripCalc from TripData if available
      if (initialTripData.originAirport && initialTripData.destAirport) {
        setTripCalc({
          origin: initialTripData.origin,
          destination: initialTripData.destination,
          originAirport: initialTripData.originAirport,
          destAirport: initialTripData.destAirport,
          baseTime: initialTripData.estimatedTimeMinutes || 0
        });
      }
    }
  }, [initialTripData]);
  
  // Organ icon mapping
  const getOrganIcon = (organType: string) => {
    const iconMap: { [key: string]: typeof Heart } = {
      heart: Heart,
      lungs: Wind,
      kidneys: Droplets,
      liver: Layers,
      pancreas: Zap,
    };
    return iconMap[organType.toLowerCase()] || Heart;
  };

  // Fetch mission types and available crew on mount
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: missionData
      } = await supabase.from('mission_types').select('*').order('organ_type');
      if (missionData) {
        setMissionTypes(missionData);
      }
      const {
        data: crewData
      } = await supabase.from('crew_members').select('*').order('full_name');
      if (crewData) {
        setAvailableCrew(crewData as unknown as CrewMember[]);
        // Don't pre-select crew - let user choose based on organ-specific stats
      }
    };
    fetchData();
  }, []);

  // Search medical personnel with debounce
  useEffect(() => {
    if (leadDoctorSearch.length < 2 && !leadDoctorOpen) {
      setLeadDoctorSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const {
        data
      } = await supabase.functions.invoke('search-medical-personnel', {
        body: {
          searchTerm: leadDoctorSearch || '',
          role: 'lead_doctor'
        }
      });
      if (data?.results) {
        const sorted = [...data.results].sort((a, b) => {
          if (!organType) return 0;
          const aExp = a.organ_experience?.[organType as keyof typeof a.organ_experience];
          const bExp = b.organ_experience?.[organType as keyof typeof b.organ_experience];
          const aRate = (aExp && typeof aExp === 'object' && 'success_rate' in aExp) ? aExp.success_rate : 0;
          const bRate = (bExp && typeof bExp === 'object' && 'success_rate' in bExp) ? bExp.success_rate : 0;
          const aMissions = (aExp && typeof aExp === 'object' && 'missions' in aExp) ? aExp.missions : 0;
          const bMissions = (bExp && typeof bExp === 'object' && 'missions' in bExp) ? bExp.missions : 0;
          
          // Sort by success rate first, then by number of missions
          if (bRate !== aRate) return bRate - aRate;
          return bMissions - aMissions;
        });
        setLeadDoctorSuggestions(sorted);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [leadDoctorSearch, leadDoctorOpen, organType]);
  useEffect(() => {
    const currentInput = surgeonInputs[activeSurgeonInput];
    if ((currentInput && currentInput.length < 2) && !surgeonOpen) {
      setSurgeonSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const {
        data
      } = await supabase.functions.invoke('search-medical-personnel', {
        body: {
          searchTerm: currentInput || '',
          role: 'surgeon'
        }
      });
      if (data?.results) {
        const sorted = [...data.results].sort((a, b) => {
          if (!organType) return 0;
          const aExp = a.organ_experience?.[organType as keyof typeof a.organ_experience];
          const bExp = b.organ_experience?.[organType as keyof typeof b.organ_experience];
          const aRate = (aExp && typeof aExp === 'object' && 'success_rate' in aExp) ? aExp.success_rate : 0;
          const bRate = (bExp && typeof bExp === 'object' && 'success_rate' in bExp) ? bExp.success_rate : 0;
          const aMissions = (aExp && typeof aExp === 'object' && 'missions' in aExp) ? aExp.missions : 0;
          const bMissions = (bExp && typeof bExp === 'object' && 'missions' in bExp) ? bExp.missions : 0;
          
          // Sort by success rate first, then by number of missions
          if (bRate !== aRate) return bRate - aRate;
          return bMissions - aMissions;
        });
        setSurgeonSuggestions(sorted);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [surgeonInputs, activeSurgeonInput, surgeonOpen, organType]);
  useEffect(() => {
    if (coordinatorSearch.length < 2 && !coordinatorOpen) {
      setCoordinatorSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const {
        data
      } = await supabase.functions.invoke('search-medical-personnel', {
        body: {
          searchTerm: coordinatorSearch || '',
          role: 'coordinator'
        }
      });
      if (data?.results) {
        const sorted = [...data.results].sort((a, b) => {
          if (!organType) return 0;
          const aExp = a.organ_experience?.[organType as keyof typeof a.organ_experience];
          const bExp = b.organ_experience?.[organType as keyof typeof b.organ_experience];
          const aRate = (aExp && typeof aExp === 'object' && 'success_rate' in aExp) ? aExp.success_rate : 0;
          const bRate = (bExp && typeof bExp === 'object' && 'success_rate' in bExp) ? bExp.success_rate : 0;
          const aMissions = (aExp && typeof aExp === 'object' && 'missions' in aExp) ? aExp.missions : 0;
          const bMissions = (bExp && typeof bExp === 'object' && 'missions' in bExp) ? bExp.missions : 0;
          
          // Sort by success rate first, then by number of missions
          if (bRate !== aRate) return bRate - aRate;
          return bMissions - aMissions;
        });
        setCoordinatorSuggestions(sorted);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [coordinatorSearch, coordinatorOpen, organType]);

  // Real-time live prediction calculation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (organType || selectedCrew.length > 0 || selectedLeadDoctor) {
        setCalculatingLive(true);
        try {
          const {
            data,
            error
          } = await supabase.functions.invoke('calculate-live-prediction', {
            body: {
              organType: organType || undefined,
              crewMemberIds: selectedCrew.map(c => c.id),
              leadDoctorId: selectedLeadDoctor?.id,
              surgicalTeamIds: surgicalTeam.map(s => s.id),
              coordinatorId: selectedCoordinator?.id,
              totalTimeMinutes: tripCalc?.baseTime, // Use real trip time if available
              distance: tripCalc?.originAirport?.distance_nm, // Fallback for estimation
              originAirportCode: tripCalc?.originAirport?.code,
              destAirportCode: tripCalc?.destAirport?.code,
              originHospital: originHospital || undefined,
              destHospital: destinationHospital || undefined
            }
          });
          if (data && !error) {
            setLivePrediction(data);
          }
        } catch (e) {
          console.error('Live prediction error:', e);
        } finally {
          setCalculatingLive(false);
        }
      } else {
        setLivePrediction(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [organType, selectedCrew, selectedLeadDoctor, surgicalTeam, selectedCoordinator, tripCalc, originHospital, destinationHospital]);
  const findNearestAirport = async (lat: number, lng: number): Promise<Airport> => {
    const {
      data,
      error
    } = await supabase.functions.invoke('find-nearest-airport', {
      body: {
        lat,
        lng,
        maxDistance: 100
      }
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
  // Removed duplicate calculation functions - we now use calculate-accurate-trip edge function
  const handleCalculate = async () => {
    if (!selectedOrigin || !selectedDestination) {
      toast({
        title: "Missing Information",
        description: "Please select both pick up and delivery hospitals",
        variant: "destructive"
      });
      return;
    }
    if (!organType) {
      toast({
        title: "Missing Information",
        description: "Please select an organ type",
        variant: "destructive"
      });
      return;
    }
    if (!selectedLeadDoctor) {
      toast({
        title: "Missing Information",
        description: "Please select a lead doctor",
        variant: "destructive"
      });
      return;
    }
    setCalculating(true);
    setSuccessAnalysis(null);
    try {
      // Use the accurate trip calculator to get real trip time with weather, traffic, winds, etc.
      console.log('Calling calculate-accurate-trip for accurate trip data...');
      const { data: tripData, error: tripError } = await supabase.functions.invoke(
        'calculate-accurate-trip',
        {
          body: {
            pickupLocation: {
              lat: selectedOrigin.lat,
              lng: selectedOrigin.lon,
              displayName: selectedOrigin.displayName,
              address: selectedOrigin.address
            },
            deliveryLocation: {
              lat: selectedDestination.lat,
              lng: selectedDestination.lon,
              displayName: selectedDestination.displayName,
              address: selectedDestination.address
            },
            departureDateTime: new Date().toISOString(),
            passengers: 2, // Pilot + Medical personnel
            segmentMode: segmentMode
          }
        }
      );

      if (tripError) {
        console.error('Trip calculation error:', tripError);
        toast({
          title: "Calculation Error",
          description: "Failed to calculate trip details",
          variant: "destructive"
        });
        setCalculating(false);
        return;
      }

      if (!tripData || !tripData.totalTime) {
        toast({
          title: "Calculation Error",
          description: "No trip data returned",
          variant: "destructive"
        });
        setCalculating(false);
        return;
      }

      console.log('Trip calculation complete:', {
        totalTime: tripData.totalTime,
        pickupAirport: tripData.route?.pickupAirport?.code,
        destinationAirport: tripData.route?.destinationAirport?.code
      });

      // Store trip calculation for display
      setTripCalc({
        origin: selectedOrigin,
        destination: selectedDestination,
        originAirport: {
          code: tripData.route.pickupAirport?.code || 'UNKNOWN',
          name: tripData.route.pickupAirport?.name || 'Unknown',
          lat: tripData.route.pickupAirport?.lat || 0,
          lng: tripData.route.pickupAirport?.lng || 0,
          distance_nm: tripData.route.pickupAirport?.distance_from_pickup || 0
        },
        destAirport: {
          code: tripData.route.destinationAirport?.code || 'UNKNOWN',
          name: tripData.route.destinationAirport?.name || 'Unknown',
          lat: tripData.route.destinationAirport?.lat || 0,
          lng: tripData.route.destinationAirport?.lng || 0,
          distance_nm: tripData.route.destinationAirport?.distance_from_delivery || 0
        },
        baseTime: tripData.totalTime
      });

      // Calculate mission success using accurate trip time
      const {
        data: analysis
      } = await supabase.functions.invoke('calculate-mission-success', {
        body: {
          crewMemberIds: selectedCrew.map(c => c.id),
          leadDoctorId: selectedLeadDoctor.id,
          surgicalTeamIds: surgicalTeam.map(s => s.id),
          coordinatorId: selectedCoordinator?.id,
          organType,
          estimatedTimeMinutes: tripData.totalTime, // Use real trip time
          originHospital: selectedOrigin.displayName,
          destinationHospital: selectedDestination.displayName
        }
      });
      if (analysis) {
        setSuccessAnalysis(analysis);
        
        // Call the callback to notify parent about the calculated trip
        if (onTripCalculated) {
          onTripCalculated({
            origin: selectedOrigin,
            destination: selectedDestination,
            originHospital: selectedOrigin.displayName,
            destinationHospital: selectedDestination.displayName,
            originAirport: {
              code: tripData.route.pickupAirport?.code || 'UNKNOWN',
              name: tripData.route.pickupAirport?.name || 'Unknown',
              lat: tripData.route.pickupAirport?.lat || 0,
              lng: tripData.route.pickupAirport?.lng || 0,
              distance_nm: tripData.route.pickupAirport?.distance_from_pickup || 0
            },
            destAirport: {
              code: tripData.route.destinationAirport?.code || 'UNKNOWN',
              name: tripData.route.destinationAirport?.name || 'Unknown',
              lat: tripData.route.destinationAirport?.lat || 0,
              lng: tripData.route.destinationAirport?.lng || 0,
              distance_nm: tripData.route.destinationAirport?.distance_from_delivery || 0
            },
            // Include success analysis data
            crewMembers: analysis.crewMembers,
            leadDoctor: analysis.leadDoctor,
            surgicalTeam: analysis.surgicalTeam,
            coordinator: analysis.coordinator,
            missionType: analysis.missionType,
            overallSuccess: analysis.overallSuccess,
            viabilityStatus: analysis.viabilityStatus,
            viabilityUsedPercent: analysis.viabilityUsedPercent,
            estimatedTimeMinutes: tripData.totalTime,
            departureTime: new Date().toISOString(),
            insights: analysis.insights,
            suggestions: analysis.suggestions,
            route: tripData.route,
            // Include segment timing data
            segmentMode: segmentMode,
            organTransportTime: tripData.timing?.organTransportTime,
            fullRoundtripTime: tripData.timing?.fullRoundtripTime,
            positioningTime: tripData.timing?.positioningTime
          });
        }
      }
      toast({
        title: "Mission Analysis Complete",
        description: "AI predictions generated successfully"
      });
    } catch (error) {
      console.error('Error calculating trip:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate trip details",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };
  const addSurgeon = (surgeon: MedicalPersonnel, inputIndex: number) => {
    if (!surgicalTeam.find(s => s.id === surgeon.id)) {
      setSurgicalTeam([...surgicalTeam, surgeon]);
      // Clear the input and suggestions
      const newInputs = [...surgeonInputs];
      newInputs[inputIndex] = '';
      setSurgeonInputs(newInputs);
      setSurgeonSuggestions([]);
    }
  };
  const addCustomSurgeon = (inputIndex: number) => {
    const trimmedName = surgeonInputs[inputIndex].trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast({
        title: "Invalid Name",
        description: "Surgeon name must be between 2 and 100 characters",
        variant: "destructive"
      });
      return;
    }
    const customSurgeon: MedicalPersonnel = {
      id: `custom-${Date.now()}`,
      full_name: trimmedName,
      role: 'surgeon',
      specialty: 'General Surgery',
      total_missions: 0,
      success_rate: 90
    };
    setSurgicalTeam([...surgicalTeam, customSurgeon]);
    const newInputs = [...surgeonInputs];
    newInputs[inputIndex] = '';
    setSurgeonInputs(newInputs);
    toast({
      title: "Surgeon Added",
      description: `${trimmedName} has been added to the surgical team`
    });
  };
  const addSurgeonInput = () => {
    setSurgeonInputs([...surgeonInputs, '']);
    setActiveSurgeonInput(surgeonInputs.length);
  };
  const removeSurgeonInput = (index: number) => {
    if (surgeonInputs.length > 1) {
      const newInputs = surgeonInputs.filter((_, i) => i !== index);
      setSurgeonInputs(newInputs);
      if (activeSurgeonInput >= newInputs.length) {
        setActiveSurgeonInput(Math.max(0, newInputs.length - 1));
      }
    }
  };
  const updateSurgeonInput = (index: number, value: string) => {
    const newInputs = [...surgeonInputs];
    newInputs[index] = value;
    setSurgeonInputs(newInputs);
    setActiveSurgeonInput(index);
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
        variant: "destructive"
      });
    }
  };
  const lookupCaseNumber = () => {
    const trimmedCase = caseNumber.trim();
    if (trimmedCase.length < 3 || trimmedCase.length > 20) {
      toast({
        title: "Invalid Case Number",
        description: "Case number must be between 3 and 20 characters",
        variant: "destructive"
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
        previousTransports: Math.floor(Math.random() * 3)
      };
      setCaseData(mockData);
      setOrganType(mockData.organType);
      setLoadingCase(false);
      toast({
        title: "Case Retrieved",
        description: `Case ${trimmedCase} loaded successfully from CRM`
      });
    }, 1200);
  };
  
  const handleReset = () => {
    setOrganType('');
    setSelectedOrigin(null);
    setSelectedDestination(null);
    setOriginHospital('');
    setDestinationHospital('');
    setSelectedCrew([]);
    setSelectedLeadDoctor(null);
    setSurgicalTeam([]);
    setSelectedCoordinator(null);
    setCaseNumber('');
    setCaseData(null);
    setSuccessAnalysis(null);
    setLivePrediction(null);
    setTripCalc(null);
    toast({
      title: "Scenario Reset",
      description: "All selections have been cleared.",
    });
  };
  
  const selectedMissionType = missionTypes.find(mt => mt.organ_type === organType);
  return <div className="space-y-6">
      <Card className="shadow-card animate-fade-in">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                AI-Powered Trip Intelligence
              </CardTitle>
              <CardDescription>
                Advanced mission planning with organ viability tracking and success prediction
              </CardDescription>
            </div>
            
            <div className="flex items-start gap-3">
              {/* Reset Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              
              {/* Compact Success Rate Counter - Top Right */}
              {livePrediction && (
                <div className="flex flex-col items-end gap-1 min-w-[120px]">
                  <div className="text-xs text-muted-foreground font-medium mb-0.5">Predicted Success Rate</div>
                  <div className={`text-4xl font-bold leading-none ${
                    livePrediction.overallPrediction >= 85 ? 'text-success' :
                    livePrediction.overallPrediction >= 70 ? 'text-warning' :
                    'text-destructive'
                  }`}>
                    {calculatingLive ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : (
                      `${livePrediction.overallPrediction}%`
                    )}
                  </div>
                  <Badge 
                    variant={
                      livePrediction.confidence === 'high' ? 'default' :
                      livePrediction.confidence === 'medium' ? 'secondary' :
                      'outline'
                    }
                    className="text-xs"
                  >
                    {livePrediction.confidence === 'high' ? 'High' : 
                     livePrediction.confidence === 'medium' ? 'Medium' : 
                     'Low'} Confidence
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organ Type and Case Number Row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Organ Type Selection - Left */}
            <div className="space-y-2">
              <Label>Organ Type / Mission Profile</Label>
              <Select value={organType} onValueChange={setOrganType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organ type..." />
                </SelectTrigger>
                <SelectContent>
                  {missionTypes.map(mt => {
                    const OrganIcon = getOrganIcon(mt.organ_type);
                    return (
                      <SelectItem key={mt.id} value={mt.organ_type}>
                        <div className="flex items-center gap-2">
                          <OrganIcon className="w-4 h-4" />
                          <span className="capitalize">{mt.organ_type}</span>
                          <span className="text-muted-foreground text-xs">
                            ({mt.min_viability_hours}-{mt.max_viability_hours}h viability)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedMissionType && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  {(() => {
                    const OrganIcon = getOrganIcon(selectedMissionType.organ_type);
                    return <OrganIcon className="w-4 h-4" />;
                  })()}
                  <span>
                    Viability Window: {selectedMissionType.min_viability_hours}-{selectedMissionType.max_viability_hours} hours
                  </span>
                </div>
              )}
              
              {/* Segment Mode Checkbox */}
              <div className="flex items-start gap-3 mt-3 p-3 bg-muted/50 rounded-md">
                <Checkbox 
                  id="segment-mode" 
                  checked={segmentMode === 'organ-transport'}
                  onCheckedChange={(checked) => setSegmentMode(checked ? 'organ-transport' : 'full-roundtrip')}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="segment-mode"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Show organ transport time only (pickup to delivery)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Uncheck to see full round-trip including positioning flights from home base
                  </p>
                </div>
              </div>
            </div>

            {/* Case Number Lookup - Right */}
            <div className="space-y-2">
              <Label>Case Number (Optional - CRM)</Label>
              <div className="flex gap-2">
                <Input value={caseNumber} onChange={e => setCaseNumber(e.target.value.toUpperCase())} placeholder="e.g., TXP-2024-001" maxLength={20} onKeyDown={e => e.key === 'Enter' && lookupCaseNumber()} className="max-w-xs" />
                <Button onClick={lookupCaseNumber} disabled={loadingCase || caseNumber.length < 3} variant="secondary" size="sm">
                  {loadingCase ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Lookup
                    </> : 'Lookup'}
                </Button>
              </div>
            </div>
          </div>

          {/* Case Data Display - Full Width Below */}
          {caseData && <div className="p-4 bg-accent/10 rounded-md border border-accent/20 space-y-2 animate-fade-in">
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
            </div>}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pick up Hospital</Label>
              <LocationAutocomplete value={originHospital} onChange={setOriginHospital} onLocationSelect={result => {
              setSelectedOrigin(result);
              setOriginHospital(result.displayName);
            }} placeholder="Search pick up hospital..." label="Pick up Hospital" />
            </div>
            <div className="space-y-2">
              <Label>Delivery Hospital</Label>
              <LocationAutocomplete value={destinationHospital} onChange={setDestinationHospital} onLocationSelect={result => {
              setSelectedDestination(result);
              setDestinationHospital(result.displayName);
            }} placeholder="Search delivery hospital..." label="Delivery Hospital" />
            </div>
          </div>

          {/* Flight Crew Selection */}
          <div className="space-y-2">
            <Label>Flight Crew (Select 2 Pilots)</Label>
            {!organType}
            <div className="grid md:grid-cols-2 gap-2">
              {availableCrew.map(crew => {
              const isSelected = selectedCrew.find(c => c.id === crew.id);
              return <button key={crew.id} onClick={() => toggleCrewSelection(crew)} className={cn("p-3 rounded-md border-2 text-left transition-all hover:scale-[1.02]", isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50")}>
                    <div className="flex items-center gap-2">
                      {isSelected ? <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" /> : <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {crew.full_name}
                          {crew.is_chief_pilot && " 🛡️"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {organType && crew.organ_experience?.[organType] ? <>
                              {organType.charAt(0).toUpperCase() + organType.slice(1)}: {crew.organ_experience[organType].missions} missions • {crew.organ_experience[organType].success_rate}% success
                            </> : <span className="text-muted-foreground/50">Select organ type to view stats</span>}
                        </p>
                      </div>
                    </div>
                  </button>;
            })}
            </div>
            {selectedCrew.length > 0 && <p className="text-xs text-muted-foreground">
                {selectedCrew.length}/2 pilots selected
              </p>}
          </div>

          {/* Medical Team - 2 Column Layout */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Lead Doctor */}
            <div className="space-y-2">
              <Label>Lead Doctor</Label>
              {!selectedLeadDoctor ? (
                <Popover open={leadDoctorOpen} onOpenChange={setLeadDoctorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={leadDoctorOpen}
                      className="w-full justify-between"
                    >
                      Select lead doctor...
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                    <Command>
                      <CommandInput placeholder="Search doctors..." value={leadDoctorSearch} onValueChange={setLeadDoctorSearch} />
                      <CommandList>
                        <CommandEmpty>No doctor found.</CommandEmpty>
                        <CommandGroup>
                          {leadDoctorSuggestions.map((doc) => (
                            <CommandItem
                              key={doc.id}
                              value={doc.full_name}
                              onSelect={() => {
                                setSelectedLeadDoctor(doc);
                                setLeadDoctorOpen(false);
                                setLeadDoctorSearch('');
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{doc.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.specialty && <span className="mr-1">{doc.specialty}</span>}
                                  {organType && doc.organ_experience?.[organType] ? (
                                    <>
                                      • {organType.charAt(0).toUpperCase() + organType.slice(1)}: {doc.organ_experience[organType].missions} cases • {doc.organ_experience[organType].success_rate}% success
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground/50">• Select organ type to view experience</span>
                                  )}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedLeadDoctor.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedLeadDoctor.specialty && <span className="mr-1">{selectedLeadDoctor.specialty}</span>}
                        {organType && selectedLeadDoctor.organ_experience?.[organType] ? (
                          <>
                            • {organType.charAt(0).toUpperCase() + organType.slice(1)}: {selectedLeadDoctor.organ_experience[organType].missions} cases • {selectedLeadDoctor.organ_experience[organType].success_rate}% success
                          </>
                        ) : (
                          <span className="text-muted-foreground/50">• Select organ type to view experience</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedLeadDoctor(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Surgical Team */}
            <div className="space-y-2">
              <Label>Surgical Team (Optional)</Label>
              <Popover open={surgeonOpen} onOpenChange={setSurgeonOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    Add surgeon...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                  <Command>
                    <CommandInput placeholder="Search surgeons..." value={surgeonInputs[0]} onValueChange={(value) => updateSurgeonInput(0, value)} />
                    <CommandList>
                      <CommandEmpty>No surgeon found.</CommandEmpty>
                      <CommandGroup>
                        {surgeonSuggestions.map((surgeon) => (
                          <CommandItem
                            key={surgeon.id}
                            value={surgeon.full_name}
                            onSelect={() => {
                              if (!surgicalTeam.some(s => s.id === surgeon.id)) {
                                addSurgeon(surgeon, 0);
                              }
                            }}
                            disabled={surgicalTeam.some(s => s.id === surgeon.id)}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{surgeon.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {surgeon.specialty && <span className="mr-1">{surgeon.specialty}</span>}
                                {organType && surgeon.organ_experience?.[organType] ? (
                                  <>
                                    • {organType.charAt(0).toUpperCase() + organType.slice(1)}: {surgeon.organ_experience[organType].missions} cases • {surgeon.organ_experience[organType].success_rate}% success
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/50">• Select organ type to view experience</span>
                                )}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {surgicalTeam.length > 0 && (
                <div className="space-y-2">
                  {surgicalTeam.map(surgeon => (
                    <div key={surgeon.id} className="p-3 bg-secondary/10 rounded-md border border-secondary/20">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-secondary" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{surgeon.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {surgeon.specialty && <span className="mr-1">{surgeon.specialty}</span>}
                            {organType && surgeon.organ_experience?.[organType] ? (
                              <>
                                • {organType.charAt(0).toUpperCase() + organType.slice(1)}: {surgeon.organ_experience[organType].missions} cases • {surgeon.organ_experience[organType].success_rate}% success
                              </>
                            ) : (
                              <span className="text-muted-foreground/50">• Select organ type to view experience</span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeSurgeon(surgeon.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coordinator */}
          <div className="space-y-2">
            <Label>Transplant Coordinator (Optional)</Label>
            {!selectedCoordinator ? (
              <Popover open={coordinatorOpen} onOpenChange={setCoordinatorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={coordinatorOpen}
                    className="w-full justify-between"
                  >
                    Select coordinator...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                  <Command>
                    <CommandInput placeholder="Search coordinators..." value={coordinatorSearch} onValueChange={setCoordinatorSearch} />
                    <CommandList>
                      <CommandEmpty>No coordinator found.</CommandEmpty>
                      <CommandGroup>
                        {coordinatorSuggestions.map((coord) => (
                          <CommandItem
                            key={coord.id}
                            value={coord.full_name}
                            onSelect={() => {
                              setSelectedCoordinator(coord);
                              setCoordinatorOpen(false);
                              setCoordinatorSearch('');
                            }}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{coord.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {organType && coord.organ_experience?.[organType] ? (
                                  <>
                                    {organType.charAt(0).toUpperCase() + organType.slice(1)}: {coord.organ_experience[organType].missions} cases • {coord.organ_experience[organType].success_rate}% success
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/50">Select organ type to view experience</span>
                                )}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="p-3 bg-secondary/10 rounded-md border border-secondary/20">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedCoordinator.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {organType && selectedCoordinator.organ_experience?.[organType] ? (
                        <>
                          {organType.charAt(0).toUpperCase() + organType.slice(1)}: {selectedCoordinator.organ_experience[organType].missions} cases • {selectedCoordinator.organ_experience[organType].success_rate}% success
                        </>
                      ) : (
                        <span className="text-muted-foreground/50">Select organ type to view experience</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedCoordinator(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Prediction Breakdown - Above Generate Button */}
          {livePrediction && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  AI Prediction Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Success Score */}
                <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                  <span className="text-sm font-medium text-muted-foreground">Overall Success Rate</span>
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${
                      livePrediction.overallPrediction >= 85 ? 'text-success' :
                      livePrediction.overallPrediction >= 70 ? 'text-warning' :
                      'text-destructive'
                    }`}>
                      {livePrediction.overallPrediction}%
                    </div>
                    <Badge 
                      variant={
                        livePrediction.confidence === 'high' ? 'default' :
                        livePrediction.confidence === 'medium' ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {livePrediction.confidence === 'high' ? 'High' : 
                       livePrediction.confidence === 'medium' ? 'Medium' : 
                       'Low'} Confidence
                    </Badge>
                  </div>
                </div>

                {/* Breakdown Scores */}
                {(livePrediction.breakdown.crewScore > 0 || livePrediction.breakdown.medicalTeamScore > 0) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Team Performance Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {livePrediction.breakdown.crewScore > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Flight Crew Score</Label>
                          <div className="flex items-center justify-between">
                            <Progress value={livePrediction.breakdown.crewScore} className="flex-1 h-2" />
                            <span className="ml-2 text-sm font-semibold">{livePrediction.breakdown.crewScore}%</span>
                          </div>
                        </div>
                      )}
                      {livePrediction.breakdown.medicalTeamScore > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Medical Team Score</Label>
                          <div className="flex items-center justify-between">
                            <Progress value={livePrediction.breakdown.medicalTeamScore} className="flex-1 h-2" />
                            <span className="ml-2 text-sm font-semibold">{livePrediction.breakdown.medicalTeamScore}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Optimal Team Suggestion */}
                {livePrediction.optimalTeamSuggestion.crew.length > 0 && livePrediction.optimalTeamSuggestion.leadDoctor && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-semibold text-sm">Recommended Optimal Team</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong className="text-muted-foreground">Flight Crew:</strong>
                        <div className="mt-1 space-y-1">
                          {livePrediction.optimalTeamSuggestion.crew.map(c => (
                            <div key={c.id} className="flex items-center justify-between text-xs">
                              <span>• {c.full_name}</span>
                              {c.organ_experience && organType && (
                                <Badge variant="outline" className="text-xs">
                                  {c.organ_experience[organType]?.success_rate || 0}% success
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong className="text-muted-foreground">Lead Doctor:</strong>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span>• {livePrediction.optimalTeamSuggestion.leadDoctor.full_name}</span>
                          {livePrediction.optimalTeamSuggestion.leadDoctor.organ_experience && organType && (
                            <Badge variant="outline" className="text-xs">
                              {livePrediction.optimalTeamSuggestion.leadDoctor.organ_experience[organType]?.success_rate || 0}% success
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-2">
                      {livePrediction.optimalTeamSuggestion.reasoning}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button onClick={handleCalculate} disabled={calculating || !selectedOrigin || !selectedDestination || !organType || !selectedLeadDoctor || selectedCrew.length !== 2} className="w-full" size="lg">
            {calculating ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating AI Predictions...
              </> : <>
                <Target className="mr-2 h-4 w-4" />
                Generate AI Mission Analysis
              </>}
          </Button>
        </CardContent>
      </Card>

      {successAnalysis && tripCalc && <div className="space-y-4 animate-fade-in">
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
                  <div className={cn("h-full transition-all duration-500", successAnalysis.viabilityStatus === 'safe' && "bg-success", successAnalysis.viabilityStatus === 'warning' && "bg-warning", successAnalysis.viabilityStatus === 'critical' && "bg-destructive")} style={{
                width: `${Math.min(successAnalysis.viabilityUsedPercent, 100)}%`
              }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Procurement</span>
                  <span>{tripCalc.baseTime ? (tripCalc.baseTime / 60).toFixed(1) : '0'}h transport</span>
                  <span>{successAnalysis.missionType.max_viability_hours}h max</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {successAnalysis.insights.map((insight, idx) => <Card key={idx} className="shadow-card animate-scale-in">
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
              </Card>)}
          </div>

          {successAnalysis.suggestions.length > 0 && <Card className="shadow-card animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {successAnalysis.viabilityStatus === 'critical' ? <AlertTriangle className="w-5 h-5 text-destructive" /> : <CheckCircle className="w-5 h-5 text-success" />}
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {successAnalysis.suggestions.map((suggestion, idx) => <div key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{suggestion}</p>
                  </div>)}
              </CardContent>
            </Card>}

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
                  <span className="text-lg font-bold text-primary">
                    {tripCalc.baseTime ? `${Math.floor(tripCalc.baseTime / 60)}h ${tripCalc.baseTime % 60}m` : 'Calculating...'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

      {!tripCalc && !calculating && <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Enter trip details and select your medical team to generate AI-powered mission analysis
            </p>
          </CardContent>
        </Card>}
    </div>;
};