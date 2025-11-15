import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, Info, Check, Save, FileDown, Calculator, Settings } from "lucide-react";
import { SaveEstimateDialog } from "@/components/SaveEstimateDialog";
import { FinancingInfoDialog } from "@/components/FinancingInfoDialog";
import { SF50ConfigurationDialog } from "@/components/SF50ConfigurationDialog";
import { PartnershipCTA } from "@/components/FloatingPartnershipCTA";
import { calculateFinancing, calculateScenario, calculateSF50Scenario, formatCurrency, type LeasebackInputs, type ScenarioInputs, type SF50Inputs, type SF50ScenarioInputs } from "@/lib/leasebackCalculations";
import { calculateOwnersFleetScenario, type OwnersFleetInputs, type OwnersFleetScenarioInputs } from "@/lib/ownersFleetCalculations";
import { useConfig } from "@/context/ConfigContext";
import { generatePDF } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CONFIG } from "@/types/aircraft";
interface InitialValues {
  aircraftType?: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet';
  ownershipShare?: 1 | 0.5 | 0.333 | 0.25;
  aircraftCost?: number;
  downPaymentPercent?: number;
  interestRate?: number;
  loanTermYears?: number;
  ownerHours?: number;
  rentalHours?: number;
  pilotServicesHours?: number;
  isNonPilot?: boolean;
  parkingType?: 'tiedown' | 'hangar';
  jetstreamPackage?: '2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs';
  insuranceAnnual?: number;
  managementFee?: number;
  subscriptions?: number;
  tciTraining?: number;
  maintenancePerHour?: number;
  tiedownCost?: number;
  hangarCost?: number;
  rentalRevenueRate?: number;
  ownerUsageRate?: number;
  pilotServicesRate?: number;
  // SF50-specific fields
  cleaningMonthly?: number;
  pilotServicesAnnual?: number;
  professionalServicesAnnual?: number;
  pilotServicesHourly?: number; // For owner flown
  pilotPoolContribution?: number; // For owner flown with pilot services
  jetstreamHourly?: number;
  fuelBurnPerHour?: number;
  fuelPricePerGallon?: number;
  sf50OwnerFlown?: boolean; // Whether SF50 is owner-flown for this estimate
  aircraftCostBase?: number; // SF50 aircraft cost (editable)
  includeJetstreamReserve?: boolean; // Whether to include JetStream reserve in P&L
  // Owner's Fleet specific fields
  jetstreamPackageOwnersFleet?: '2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs'; // JetStream package for Owner's Fleet
  aircraftCostBaseSF50?: number; // SF50 aircraft cost for Owner's Fleet (editable)
  aircraftCostBaseSR22?: number; // SR22 aircraft cost for Owner's Fleet (editable)
  includeJetstreamReserveOwnersFleet?: boolean; // Whether to include JetStream reserve in Owner's Fleet P&L
  // Owner's Fleet dual-aircraft fields
  sr22HoursMonth?: number;
  sf50HoursMonth?: number;
  sr22PilotServicesHours?: number;
  flyingHoursMonth?: number;
  ownerHoursMonth?: number;
}
interface CalculatorValues {
  ownerHours: number;
  rentalHours: number;
  pilotServicesHours: number;
  isNonPilot: boolean;
  parkingType: 'tiedown' | 'hangar';
  aircraftCost: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  sf50OwnerFlown?: boolean;
  sf50PilotPoolContribution?: number;
}
interface LeasebackCalculatorProps {
  aircraftType?: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet'; // Keep OwnersFleet for backwards compatibility
  initialValues?: InitialValues;
  controlled?: boolean;
  values?: CalculatorValues;
  onValuesChange?: (values: CalculatorValues) => void;
  ownersFleetHours?: {
    sr22HoursMonth: number;
    sf50HoursMonth: number;
    sr22PilotServicesHours: number;
  };
  onOwnersFleetChange?: (vals: {
    sr22HoursMonth: number;
    sf50HoursMonth: number;
    sr22PilotServicesHours: number;
  }) => void;
  hideSaveButton?: boolean;
  inputsLocked?: boolean;
  customerName?: string;
  disableShareSelection?: boolean;
}
export function LeasebackCalculator({
  aircraftType: propAircraftType,
  initialValues,
  controlled = false,
  values: externalValues,
  onValuesChange,
  ownersFleetHours,
  onOwnersFleetChange,
  hideSaveButton = false,
  inputsLocked = false,
  customerName,
  disableShareSelection = false
}: LeasebackCalculatorProps = {}) {
  const {
    config
  } = useConfig();
  const {
    toast
  } = useToast();

  // Aircraft type state
  const [aircraftType, setAircraftType] = useState<'SR20' | 'SR22' | 'SF50' | 'OwnersFleet'>(propAircraftType || initialValues?.aircraftType || 'SR22');

  // Ownership share state
  const [ownershipShare, setOwnershipShare] = useState<1 | 0.5 | 0.333 | 0.25>(initialValues?.ownershipShare || 1);
  const sr20Config = config.sr20Leaseback;
  const leasebackConfig = config.sr22Leaseback;
  const sf50Config = config.sf50Ownership;
  const ownersFleetConfig = config.ownersFleetOwnership;

  // JetStream packages from config
  const jetstreamPackages = config.jetstreamPackages || DEFAULT_CONFIG.jetstreamPackages;

  // Internal state - SF50 and OwnersFleet ALWAYS default to hangar, SR20 ALWAYS tie-down
  const [internalParkingType, setInternalParkingType] = useState<'tiedown' | 'hangar'>(() => {
    // SR20 is always tie-down
    if (propAircraftType === 'SR20' || initialValues?.aircraftType === 'SR20') {
      return 'tiedown';
    }
    // If initial values specify parking type AND it's not SF50 or OwnersFleet, use that
    if (initialValues?.parkingType && initialValues?.aircraftType !== 'SF50' && initialValues?.aircraftType !== 'OwnersFleet' && propAircraftType !== 'SF50' && propAircraftType !== 'OwnersFleet') {
      return initialValues.parkingType;
    }
    // SF50 and OwnersFleet must always be hangar
    if (propAircraftType === 'SF50' || initialValues?.aircraftType === 'SF50' || propAircraftType === 'OwnersFleet' || initialValues?.aircraftType === 'OwnersFleet') {
      return 'hangar';
    }
    // Non-leaseback (owner only) defaults to hangar
    if (!initialValues?.rentalHours || initialValues.rentalHours === 0) {
      return 'hangar';
    }
    // Leaseback defaults to tie-down
    return 'tiedown';
  });
  const [internalOwnerHours, setInternalOwnerHours] = useState(initialValues?.ownerHours ?? 15);
  const [internalPilotServicesHours, setInternalPilotServicesHours] = useState(initialValues?.pilotServicesHours ?? 0);
  const [internalRentalHours, setInternalRentalHours] = useState(() => {
    const initialAircraftType = propAircraftType || initialValues?.aircraftType || 'SR22';
    if (initialValues?.rentalHours !== undefined) return initialValues.rentalHours;
    return initialAircraftType === 'SR20' ? 35 : 15;
  });
  const [internalIsNonPilot, setInternalIsNonPilot] = useState(initialValues?.isNonPilot ?? false);
  const [internalAircraftCost, setInternalAircraftCost] = useState(() => {
    const initialAircraftType = propAircraftType || initialValues?.aircraftType || 'SR22';
    if (initialAircraftType === 'SF50') {
      return initialValues?.aircraftCost ?? 3500000; // Base aircraft only, JetStream separate
    }
    const configForType = initialAircraftType === 'SR20' ? sr20Config : initialAircraftType === 'SR22' ? leasebackConfig : ownersFleetConfig;
    return initialValues?.aircraftCost ?? configForType.defaultAircraftCost;
  });
  const [internalInterestRate, setInternalInterestRate] = useState(() => {
    const initialAircraftType = propAircraftType || initialValues?.aircraftType || 'SR22';
    const configForType = initialAircraftType === 'SR20' ? sr20Config : initialAircraftType === 'SR22' ? leasebackConfig : initialAircraftType === 'SF50' ? sf50Config : ownersFleetConfig;
    return initialValues?.interestRate ?? configForType.defaultInterestRate;
  });
  const [internalDownPaymentPercent, setInternalDownPaymentPercent] = useState(initialValues?.downPaymentPercent ?? 100);
  const [internalLoanTermYears, setInternalLoanTermYears] = useState(() => {
    const initialAircraftType = propAircraftType || initialValues?.aircraftType || 'SR22';
    const configForType = initialAircraftType === 'SR20' ? sr20Config : initialAircraftType === 'SR22' ? leasebackConfig : initialAircraftType === 'SF50' ? sf50Config : ownersFleetConfig;
    return initialValues?.loanTermYears ?? configForType.defaultLoanTermYears;
  });

  // Ensure 100% down payment on initial mount when not provided
  useEffect(() => {
    if (!initialValues?.downPaymentPercent && internalDownPaymentPercent !== 100) {
      setInternalDownPaymentPercent(100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backend costs state - reactive to initialValues changes
  const activeConfig = aircraftType === 'SR20' ? sr20Config : aircraftType === 'SR22' ? leasebackConfig : sf50Config;
  const [backendCosts, setBackendCosts] = useState({
    insuranceAnnual: initialValues?.insuranceAnnual ?? activeConfig.insuranceAnnual,
    managementFee: initialValues?.managementFee ?? activeConfig.managementFee,
    subscriptions: initialValues?.subscriptions ?? (aircraftType === 'SF50' ? 0 : activeConfig.subscriptions),
    tciTraining: initialValues?.tciTraining ?? (aircraftType === 'SF50' ? 0 : (aircraftType === 'SR20' ? sr20Config : leasebackConfig).tciTraining),
    maintenancePerHour: initialValues?.maintenancePerHour ?? (aircraftType === 'SF50' ? 0 : (aircraftType === 'SR20' ? sr20Config : leasebackConfig).maintenancePerHour),
    tiedownCost: initialValues?.tiedownCost ?? leasebackConfig.tiedownCost,
    hangarCost: initialValues?.hangarCost ?? activeConfig.hangarCost,
    rentalRevenueRate: initialValues?.rentalRevenueRate ?? leasebackConfig.rentalRevenueRate,
    ownerUsageRate: initialValues?.ownerUsageRate ?? leasebackConfig.ownerUsageRate,
    pilotServicesRate: initialValues?.pilotServicesRate ?? leasebackConfig.pilotServicesRate,
    fuelBurnPerHour: initialValues?.fuelBurnPerHour ?? config.sr22.fuelFlow,
    fuelPricePerGallon: initialValues?.fuelPricePerGallon ?? 7
  });

  // SF50-specific state
  const [sf50Costs, setSF50Costs] = useState({
    cleaningMonthly: initialValues?.cleaningMonthly ?? sf50Config.cleaningMonthly,
    pilotServicesAnnual: initialValues?.pilotServicesAnnual ?? sf50Config.pilotServicesAnnual,
    professionalServicesAnnual: initialValues?.professionalServicesAnnual ?? (aircraftType === 'OwnersFleet' ? ownersFleetConfig.professionalServicesAnnual : 0),
    pilotServicesHourly: initialValues?.pilotServicesHourly ?? 200,
    // Default hourly rate for owner flown
    pilotPoolContribution: initialValues?.pilotPoolContribution ?? sf50Config.pilotPoolContribution,
    jetstreamHourly: initialValues?.jetstreamHourly ?? sf50Config.jetstreamHourly,
    fuelBurnPerHour: initialValues?.fuelBurnPerHour ?? sf50Config.fuelBurnPerHour,
    fuelPricePerGallon: initialValues?.fuelPricePerGallon ?? sf50Config.fuelPricePerGallon,
    typeRatingInitial: sf50Config.typeRatingInitial,
    typeRatingRecurrent: sf50Config.typeRatingRecurrent
  });

  // SF50 owner flown state
  const [sf50OwnerFlown, setSF50OwnerFlown] = useState<boolean>(initialValues?.sf50OwnerFlown ?? false);

  // JetStream package selection (separate for SF50 and Owner's Fleet)
  const [jetstreamPackage, setJetstreamPackage] = useState<'2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs'>(initialValues?.jetstreamPackage || '3yr-450hrs');
  const [jetstreamPackageOwnersFleet, setJetstreamPackageOwnersFleet] = useState<'2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs'>(initialValues?.jetstreamPackageOwnersFleet || '3yr-450hrs');

  // SF50 aircraft cost (editable) and JetStream reserve toggle
  const [aircraftCostBase, setAircraftCostBase] = useState(initialValues?.aircraftCostBase || 3500000);
  const [aircraftCostBaseSF50, setAircraftCostBaseSF50] = useState(initialValues?.aircraftCostBaseSF50 || 3500000);
  const [aircraftCostBaseSR22, setAircraftCostBaseSR22] = useState(initialValues?.aircraftCostBaseSR22 || 800000);
  const [includeJetstreamReserve, setIncludeJetstreamReserve] = useState(initialValues?.includeJetstreamReserve || false);
  const [includeJetstreamReserveOwnersFleet, setIncludeJetstreamReserveOwnersFleet] = useState(initialValues?.includeJetstreamReserveOwnersFleet || false);

  // SF50 configuration dialog states
  const [sf50ConfigOpen, setSf50ConfigOpen] = useState(false);
  const [sf50ConfigOpenOwnersFleet, setSf50ConfigOpenOwnersFleet] = useState(false);

  // Set sf50OwnerFlown based on aircraft type
  useEffect(() => {
    if (!controlled) {
      setSF50OwnerFlown(aircraftType === 'SF50' ? true : false);
    }
  }, [aircraftType, controlled]);

  // Keep internal state in sync when controlled values change
  useEffect(() => {
    if (controlled) {
      setSF50OwnerFlown(externalValues?.sf50OwnerFlown ?? false);
    }
  }, [controlled, externalValues?.sf50OwnerFlown]);

  // Helper functions for Owner's Fleet defaults and ranges (defined as regular functions)
  const getDefaultSF50Hours = (share: 1 | 0.5 | 0.333 | 0.25) => {
    if (share === 0.25) return 5;
    if (share === 0.333) return 8;
    if (share === 0.5) return 10;
    return 15; // Full ownership
  };
  const getDefaultSR22Hours = (share: 1 | 0.5 | 0.333 | 0.25) => {
    if (share === 0.25) return 7;
    if (share === 0.333) return 10;
    if (share === 0.5) return 10;
    return 15; // Full ownership
  };
  const getOwnersFleetHourRange = (share: 1 | 0.5 | 0.333 | 0.25) => {
    if (share === 0.5) return {
      min: 6,
      max: 20
    };
    if (share === 0.333) return {
      min: 5,
      max: 12
    };
    if (share === 0.25) return {
      min: 3,
      max: 10
    };
    return {
      min: 3,
      max: 30
    }; // Full ownership range
  };

  // Owner's Fleet dual-aircraft hours
  const [sr22HoursMonth, setSr22HoursMonth] = useState<number>(initialValues?.sr22HoursMonth ?? getDefaultSR22Hours(initialValues?.ownershipShare || 0.5));
  const [sf50HoursMonth, setSf50HoursMonth] = useState<number>(initialValues?.sf50HoursMonth ?? getDefaultSF50Hours(initialValues?.ownershipShare || 0.5));

  // Use controlled values for Owner's Fleet hours if provided
  const effectiveSr22HoursMonth = controlled && ownersFleetHours ? ownersFleetHours.sr22HoursMonth : sr22HoursMonth;
  const effectiveSf50HoursMonth = controlled && ownersFleetHours ? ownersFleetHours.sf50HoursMonth : sf50HoursMonth;

  // Owner's Fleet SR22 Pilot Services Hours (separate from SF50 which are automatic)
  const [sr22PilotServicesHours, setSr22PilotServicesHours] = useState<number>(initialValues?.sr22PilotServicesHours ?? 0);
  const effectiveSr22PilotServicesHours = controlled && ownersFleetHours ? ownersFleetHours.sr22PilotServicesHours : sr22PilotServicesHours;

  // Flying hours state for SR22
  const [flyingHoursMonth, setFlyingHoursMonth] = useState<number>(initialValues?.flyingHoursMonth ?? 0);
  const [ownerHoursMonth, setOwnerHoursMonth] = useState<number>(initialValues?.ownerHoursMonth ?? 0);

  // Update values when aircraft type changes
  useEffect(() => {
    const activeConfig = aircraftType === 'SR20' ? sr20Config : aircraftType === 'SR22' ? leasebackConfig : aircraftType === 'SF50' ? sf50Config : ownersFleetConfig;

    // Update backend costs based on aircraft type
    setBackendCosts({
      insuranceAnnual: activeConfig.insuranceAnnual,
      managementFee: activeConfig.managementFee,
      subscriptions: aircraftType === 'SF50' ? 0 : activeConfig.subscriptions,
      tciTraining: aircraftType === 'SF50' ? 0 : (aircraftType === 'SR20' ? sr20Config : leasebackConfig).tciTraining,
      maintenancePerHour: aircraftType === 'SR20' || aircraftType === 'SR22' ? (aircraftType === 'SR20' ? sr20Config : leasebackConfig).maintenancePerHour : 0,
      tiedownCost: aircraftType === 'SR20' ? sr20Config.tiedownCost : leasebackConfig.tiedownCost,
      hangarCost: activeConfig.hangarCost,
      rentalRevenueRate: aircraftType === 'SR20' ? sr20Config.rentalRevenueRate : leasebackConfig.rentalRevenueRate,
      ownerUsageRate: aircraftType === 'SR20' ? sr20Config.ownerUsageRate : leasebackConfig.ownerUsageRate,
      pilotServicesRate: aircraftType === 'SR20' ? sr20Config.pilotServicesRate : leasebackConfig.pilotServicesRate,
      fuelBurnPerHour: config.sr22.fuelFlow,
      fuelPricePerGallon: 7
    });

    // Update SF50-specific costs when switching to SF50
    if (aircraftType === 'SF50') {
      setSF50Costs({
        cleaningMonthly: sf50Config.cleaningMonthly,
        pilotServicesAnnual: sf50Config.pilotServicesAnnual,
        professionalServicesAnnual: 0,
        // SF50 does NOT have professional services
        pilotServicesHourly: sf50Config.pilotServicesHourly ?? 200,
        pilotPoolContribution: sf50Config.pilotPoolContribution,
        jetstreamHourly: sf50Config.jetstreamHourly,
        fuelBurnPerHour: sf50Config.fuelBurnPerHour,
        fuelPricePerGallon: sf50Config.fuelPricePerGallon,
        typeRatingInitial: sf50Config.typeRatingInitial,
        typeRatingRecurrent: sf50Config.typeRatingRecurrent
      });

      // Update aircraft cost and other financing values for SF50
      // Prefer initialValues if provided (for customer estimates), otherwise use defaults
      setInternalAircraftCost(initialValues?.aircraftCost ?? sf50Config.defaultAircraftCost);
      setInternalInterestRate(initialValues?.interestRate ?? sf50Config.defaultInterestRate);
      setInternalDownPaymentPercent(initialValues?.downPaymentPercent ?? 100);
      setInternalLoanTermYears(initialValues?.loanTermYears ?? sf50Config.defaultLoanTermYears);
      setInternalOwnerHours(initialValues?.ownerHours ?? sf50Config.defaultOwnerHours);
      setInternalRentalHours(0); // SF50 doesn't have leaseback
      setInternalParkingType('hangar'); // SF50 must use hangar
    } else if (aircraftType === 'OwnersFleet') {
      // Update Owner's Fleet costs (same as SF50 but WITH professional services)
      setSF50Costs({
        cleaningMonthly: ownersFleetConfig.cleaningMonthly,
        pilotServicesAnnual: ownersFleetConfig.pilotServicesAnnual,
        professionalServicesAnnual: ownersFleetConfig.professionalServicesAnnual,
        // Owner's Fleet HAS professional services
        pilotServicesHourly: ownersFleetConfig.sf50PilotServicesHourly ?? 200,
        pilotPoolContribution: ownersFleetConfig.pilotPoolContribution,
        jetstreamHourly: ownersFleetConfig.sf50JetstreamHourly,
        fuelBurnPerHour: ownersFleetConfig.sf50FuelBurnPerHour,
        fuelPricePerGallon: ownersFleetConfig.sf50FuelPricePerGallon,
        typeRatingInitial: ownersFleetConfig.typeRatingInitial,
        typeRatingRecurrent: ownersFleetConfig.typeRatingRecurrent
      });

      // Update aircraft cost and other financing values for Owner's Fleet
      setInternalAircraftCost(initialValues?.aircraftCost ?? ownersFleetConfig.defaultAircraftCost);
      setInternalInterestRate(initialValues?.interestRate ?? ownersFleetConfig.defaultInterestRate);
      setInternalDownPaymentPercent(initialValues?.downPaymentPercent ?? 100);
      setInternalLoanTermYears(initialValues?.loanTermYears ?? ownersFleetConfig.defaultLoanTermYears);
      setInternalOwnerHours(initialValues?.ownerHours ?? ownersFleetConfig.defaultOwnerHours);
      setInternalRentalHours(0); // Owner's Fleet doesn't have leaseback
      setInternalParkingType('hangar'); // Owner's Fleet must use hangar

      // Default to 1/2 share for Owner's Fleet if not provided in initialValues
      if (!initialValues?.ownershipShare) {
        setOwnershipShare(0.5);
      }
    } else {
      // Update aircraft cost and financing for SR20/SR22
      // Prefer initialValues if provided (for customer estimates), otherwise use defaults
      const activeLeasebackConfig = aircraftType === 'SR20' ? sr20Config : leasebackConfig;
      setInternalAircraftCost(initialValues?.aircraftCost ?? activeLeasebackConfig.defaultAircraftCost);
      setInternalInterestRate(initialValues?.interestRate ?? activeLeasebackConfig.defaultInterestRate);
      setInternalDownPaymentPercent(initialValues?.downPaymentPercent ?? 100);
      setInternalLoanTermYears(initialValues?.loanTermYears ?? activeLeasebackConfig.defaultLoanTermYears);
      setInternalOwnerHours(initialValues?.ownerHours ?? 15);
      setInternalRentalHours(initialValues?.rentalHours ?? (aircraftType === 'SR20' ? 35 : 15));
    }
  }, [aircraftType, sr20Config, leasebackConfig, sf50Config, ownersFleetConfig]);

  // Sync backend costs when initialValues change (for admin editing)
  useEffect(() => {
    if (initialValues) {
      // Get the appropriate defaults based on aircraft type
      const getDefault = (field: string) => {
        if (aircraftType === 'SR20') {
          return (sr20Config as any)[field];
        } else if (aircraftType === 'SR22') {
          return (leasebackConfig as any)[field];
        } else if (aircraftType === 'SF50') {
          return (sf50Config as any)[field];
        } else {
          return (ownersFleetConfig as any)[field];
        }
      };
      setBackendCosts({
        insuranceAnnual: initialValues.insuranceAnnual ?? getDefault('insuranceAnnual'),
        managementFee: initialValues.managementFee ?? getDefault('managementFee'),
        subscriptions: initialValues.subscriptions ?? (aircraftType === 'SF50' || aircraftType === 'OwnersFleet' ? 0 : getDefault('subscriptions')),
        tciTraining: initialValues.tciTraining ?? (aircraftType === 'SF50' || aircraftType === 'OwnersFleet' ? 0 : getDefault('tciTraining')),
        maintenancePerHour: initialValues.maintenancePerHour ?? (aircraftType === 'SF50' || aircraftType === 'OwnersFleet' ? 0 : getDefault('maintenancePerHour')),
        tiedownCost: initialValues.tiedownCost ?? getDefault('tiedownCost') ?? leasebackConfig.tiedownCost,
        hangarCost: initialValues.hangarCost ?? getDefault('hangarCost'),
        rentalRevenueRate: initialValues.rentalRevenueRate ?? (aircraftType === 'SF50' || aircraftType === 'OwnersFleet' ? 0 : getDefault('rentalRevenueRate')),
        ownerUsageRate: initialValues.ownerUsageRate ?? (aircraftType === 'SF50' || aircraftType === 'OwnersFleet' ? 0 : getDefault('ownerUsageRate')),
        pilotServicesRate: initialValues.pilotServicesRate ?? (aircraftType === 'SF50' || aircraftType === 'OwnersFleet' ? 0 : getDefault('pilotServicesRate')),
        fuelBurnPerHour: initialValues.fuelBurnPerHour ?? config.sr22.fuelFlow,
        fuelPricePerGallon: initialValues.fuelPricePerGallon ?? 7
      });
    }
  }, [initialValues, aircraftType, sr20Config, leasebackConfig, sf50Config, ownersFleetConfig, config]);

  // Sync SF50 costs when initialValues change (for admin editing SF50 estimates)
  useEffect(() => {
    if (initialValues && (aircraftType === 'SF50' || aircraftType === 'OwnersFleet')) {
      setSF50Costs(prev => ({
        ...prev,
        cleaningMonthly: initialValues.cleaningMonthly ?? prev.cleaningMonthly,
        pilotServicesAnnual: initialValues.pilotServicesAnnual ?? prev.pilotServicesAnnual,
        professionalServicesAnnual: initialValues.professionalServicesAnnual ?? prev.professionalServicesAnnual,
        pilotServicesHourly: initialValues.pilotServicesHourly ?? prev.pilotServicesHourly,
        jetstreamHourly: initialValues.jetstreamHourly ?? prev.jetstreamHourly,
        fuelBurnPerHour: initialValues.fuelBurnPerHour ?? prev.fuelBurnPerHour,
        fuelPricePerGallon: initialValues.fuelPricePerGallon ?? prev.fuelPricePerGallon,
        pilotPoolContribution: initialValues.pilotPoolContribution ?? prev.pilotPoolContribution
      }));
    }
  }, [initialValues, aircraftType]);

  // Use external values if controlled, otherwise use internal state
  const parkingType = controlled ? externalValues!.parkingType : internalParkingType;
  const ownerHours = controlled ? externalValues!.ownerHours : internalOwnerHours;
  const pilotServicesHours = controlled ? externalValues!.pilotServicesHours : internalPilotServicesHours;
  const rentalHours = controlled ? externalValues!.rentalHours : internalRentalHours;
  const isNonPilot = controlled ? externalValues!.isNonPilot : internalIsNonPilot;
  const aircraftCost = controlled ? externalValues!.aircraftCost : internalAircraftCost;
  const interestRate = controlled ? externalValues!.interestRate : internalInterestRate;
  const downPaymentPercent = controlled ? externalValues!.downPaymentPercent : internalDownPaymentPercent;
  const loanTermYears = controlled ? externalValues!.loanTermYears : internalLoanTermYears;

  // Setters that work for both controlled and uncontrolled modes
  const setParkingType = (value: 'tiedown' | 'hangar') => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        parkingType: value
      });
    } else {
      setInternalParkingType(value);
    }
  };
  const setOwnerHours = (value: number) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        ownerHours: value
      });
    } else {
      setInternalOwnerHours(value);
    }
  };
  const setPilotServicesHours = (value: number) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        pilotServicesHours: value
      });
    } else {
      setInternalPilotServicesHours(value);
    }
  };
  const setRentalHours = (value: number) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        rentalHours: value
      });
    } else {
      setInternalRentalHours(value);
    }
  };
  const setIsNonPilot = (value: boolean) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        isNonPilot: value
      });
    } else {
      setInternalIsNonPilot(value);
    }
  };
  const setAircraftCost = (value: number) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        aircraftCost: value
      });
    } else {
      setInternalAircraftCost(value);
    }
  };
  const setInterestRate = (value: number) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        interestRate: value
      });
    } else {
      setInternalInterestRate(value);
    }
  };
  const setDownPaymentPercent = (value: number) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        downPaymentPercent: value
      });
    } else {
      setInternalDownPaymentPercent(value);
    }
  };
  const setLoanTermYears = (value: number) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        loanTermYears: value
      });
    } else {
      setInternalLoanTermYears(value);
    }
  };
  const setSf50OwnerFlownValue = (value: boolean) => {
    if (controlled && onValuesChange) {
      onValuesChange({
        ...externalValues!,
        sf50OwnerFlown: value
      });
    }
    setSF50OwnerFlown(value);
  };

  // P&L View toggle
  const [plView, setPlView] = useState<'monthly' | 'annual'>('monthly');

  // Collapsible state
  const [ratesOpen, setRatesOpen] = useState(false);

  // Save estimate dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Financing info dialog
  const [financingDialogOpen, setFinancingDialogOpen] = useState(false);

  // Resale percent state (default 85%)
  const [resalePercent, setResalePercent] = useState(85);

  // Helper function to get valid owner hours range based on aircraft type and ownership share
  const getOwnerHoursRange = (aircraft: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet', share: 1 | 0.5 | 0.333 | 0.25): {
    min: number;
    max: number;
  } => {
    if (aircraft === 'SF50' || aircraft === 'OwnersFleet') {
      if (share === 1) return {
        min: 5,
        max: 300 / 12
      }; // 300 annual hours
      if (share === 0.5) return {
        min: 5,
        max: 150 / 12
      }; // 150 annual hours (12.5/month)
      if (share === 0.333) return {
        min: 3,
        max: 100 / 12
      }; // 100 annual hours (8.33/month)
      return {
        min: 2,
        max: 75 / 12
      }; // 1/4 share: 75 annual hours (6.25/month)
    } else {
      // SR22
      if (share === 1) return {
        min: 5,
        max: 40
      };
      return {
        min: 5,
        max: 20
      }; // 1/2 share (SR22 doesn't support 1/4)
    }
  };

  // Set default hours for Owner's Fleet on load
  useEffect(() => {
    if (aircraftType === 'OwnersFleet' && !initialValues) {
      setSf50HoursMonth(getDefaultSF50Hours(ownershipShare));
      setSr22HoursMonth(getDefaultSR22Hours(ownershipShare));
      setSr22PilotServicesHours(0); // Pilot services default to 0 to avoid confusion
    }
  }, [ownershipShare, aircraftType]);

  // Sync owner hours with the sum of SR22 and SF50 hours for Owner's Fleet
  useEffect(() => {
    if (aircraftType === 'OwnersFleet') {
      const totalHours = effectiveSr22HoursMonth + effectiveSf50HoursMonth;
      setOwnerHours(totalHours);
    }
  }, [aircraftType, effectiveSr22HoursMonth, effectiveSf50HoursMonth]);

  // Clamp values to new ranges when share changes (Owner's Fleet only)
  useEffect(() => {
    if (aircraftType !== 'OwnersFleet') return;
    const range = getOwnersFleetHourRange(ownershipShare);
    setSr22HoursMonth(prev => Math.min(range.max, Math.max(range.min, prev)));
    setSf50HoursMonth(prev => Math.min(range.max, Math.max(range.min, prev)));
  }, [ownershipShare, aircraftType]);

  // Validate and adjust owner hours when share or aircraft type changes
  useEffect(() => {
    const range = getOwnerHoursRange(aircraftType, ownershipShare);
    if (ownerHours < range.min) {
      setOwnerHours(range.min);
    } else if (ownerHours > range.max) {
      setOwnerHours(range.max);
    }
  }, [ownershipShare, aircraftType]);

  // PDF export handler
  const handleExportPDF = async () => {
    try {
      // Calculate breakdown values based on aircraft type
      const rentalOnlyRevenue = isLeaseback ? rentalHours * backendCosts.rentalRevenueRate : 0;
      const ownerUsageRevenue = isLeaseback ? ownerHours * backendCosts.rentalRevenueRate : 0;
      const totalRevenue = rentalOnlyRevenue + ownerUsageRevenue;

      // Handle different result types
      const variableCosts = 'ownerUsageCosts' in results ? results.ownerUsageCosts + results.ownerFlightCosts + results.maintenanceCosts : results.annualVariableCosts / 12;
      const fixedCosts = 'fixedCosts' in results ? results.fixedCosts : results.fixedMonthlyCosts;
      await generatePDF({
        customerName: customerName || 'Ownership Estimate',
        aircraftType,
        aircraftCost,
        downPaymentPercent,
        downPaymentAmount: financing.downPayment,
        loanAmount: financing.loanAmount,
        interestRate,
        loanTermYears,
        monthlyPayment: financing.monthlyPayment,
        ownerHours,
        rentalHours: isLeaseback ? rentalHours : 0,
        pilotServicesHours,
        isLeaseback,
        leasebackOutlook: leasebackOutlook.label,
        parkingType,
        parkingCost,
        plView,
        rentalRevenue: rentalOnlyRevenue,
        ownerUsageRevenue: ownerUsageRevenue,
        totalRevenue: totalRevenue,
        ownerUsageCost: 'ownerUsageCosts' in results ? results.ownerUsageCosts : 0,
        wearAndTear: 0,
        pilotServicesCost: 'ownerFlightCosts' in results ? results.ownerFlightCosts : 0,
        maintenanceCost: 'maintenanceCosts' in results ? results.maintenanceCosts : 0,
        totalVariableCosts: variableCosts,
        insuranceCost: backendCosts.insuranceAnnual / 12,
        managementCost: backendCosts.managementFee,
        subscriptionsCost: backendCosts.subscriptions,
        tciTrainingCost: backendCosts.tciTraining,
        totalFixedCosts: fixedCosts,
        monthlyLoanPayment: financing.monthlyPayment,
        netResult: plView === 'monthly' ? results.netMonthlyCashFlow : results.annualCashFlow,
        leasebackHourlyRate: backendCosts.ownerUsageRate,
        directFlightCost: results.costPerHour
      });
      toast({
        title: 'PDF Generated',
        description: 'Your ownership estimate has been downloaded.'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Helper to get leaseback outlook
  const getLeasebackOutlook = (hours: number, aircraft: 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet'): {
    label: string;
    color: string;
  } => {
    if (hours === 0) return {
      label: '',
      color: ''
    };

    // SR20 has different thresholds
    if (aircraft === 'SR20') {
      if (hours <= 27) return {
        label: 'Pessimistic',
        color: 'text-orange-600'
      };
      if (hours <= 42) return {
        label: 'Realistic',
        color: 'text-green-600'
      };
      return {
        label: 'Optimistic',
        color: 'text-blue-600'
      };
    }

    // SR22 thresholds
    if (hours <= 11) return {
      label: 'Pessimistic',
      color: 'text-orange-600'
    };
    if (hours <= 20) return {
      label: 'Realistic',
      color: 'text-green-600'
    };
    return {
      label: 'Optimistic',
      color: 'text-blue-600'
    };
  };
  const leasebackOutlook = getLeasebackOutlook(rentalHours, aircraftType);

  // Sync pilot services with owner hours when non-pilot checkbox is checked
  useEffect(() => {
    if (isNonPilot) {
      setPilotServicesHours(ownerHours);
    }
  }, [isNonPilot, ownerHours]);

  // Auto-update parking type when switching between leaseback and non-leaseback
  useEffect(() => {
    // Skip for SF50 and Owner's Fleet (always hangar), SR20 (always tie-down), or if inputs are locked
    if (aircraftType === 'SF50' || aircraftType === 'OwnersFleet' || aircraftType === 'SR20' || inputsLocked) return;

    // Non-leaseback (owner only) → hangar
    if (rentalHours === 0) {
      setParkingType('hangar');
    }
    // Leaseback → tie-down
    else if (rentalHours > 0) {
      setParkingType('tiedown');
    }
  }, [rentalHours, aircraftType, inputsLocked]);

  // Auto-detect leaseback mode (SF50 and Owner's Fleet never have leaseback)
  const isLeaseback = (aircraftType === 'SR20' || aircraftType === 'SR22') && rentalHours > 0;
  const isSF50OrOwnersFleet = aircraftType === 'SF50' || aircraftType === 'OwnersFleet';

  // Calculate SR22 variable costs for Owner's Fleet
  const calculateSR22DirectCosts = () => {
    const ownersFleetCfg = config.ownersFleetOwnership || DEFAULT_CONFIG.ownersFleetOwnership;
    const fuelGallons = effectiveSr22HoursMonth * (ownersFleetCfg.sr22FuelBurnPerHour || 18.5);
    const fuelCost = fuelGallons * (ownersFleetCfg.sr22FuelPricePerGallon || 6.50);
    const maintenanceCost = effectiveSr22HoursMonth * (ownersFleetCfg.sr22MaintenancePerHour || 110);
    const pilotServicesCost = sr22PilotServicesHours * (backendCosts.pilotServicesRate || 125);
    return {
      fuel: fuelCost,
      maintenance: maintenanceCost,
      pilotServices: pilotServicesCost,
      total: fuelCost + maintenanceCost + pilotServicesCost,
      costPerHour: effectiveSr22HoursMonth > 0 ? (fuelCost + maintenanceCost + pilotServicesCost) / effectiveSr22HoursMonth : 0
    };
  };

  // Calculate SF50 variable costs for Owner's Fleet
  const calculateSF50DirectCosts = () => {
    const ownersFleetCfg = config.ownersFleetOwnership || DEFAULT_CONFIG.ownersFleetOwnership;
    const fuelGallons = effectiveSf50HoursMonth * (ownersFleetCfg.sf50FuelBurnPerHour || 80);
    const fuelCost = fuelGallons * (ownersFleetCfg.sf50FuelPricePerGallon || 6.50);
    const jetStreamCost = effectiveSf50HoursMonth * (ownersFleetCfg.sf50JetstreamHourly || 625);
    return {
      fuel: fuelCost,
      jetStream: jetStreamCost,
      total: fuelCost + jetStreamCost,
      costPerHour: effectiveSf50HoursMonth > 0 ? (fuelCost + jetStreamCost) / effectiveSf50HoursMonth : 0
    };
  };
  const sr22DirectCosts = aircraftType === 'OwnersFleet' ? calculateSR22DirectCosts() : null;
  const sf50DirectCosts = aircraftType === 'OwnersFleet' ? calculateSF50DirectCosts() : null;
  const totalOwnersFleetHours = effectiveSr22HoursMonth + effectiveSf50HoursMonth;

  // Calculations - Apply fractional ownership to parking cost
  const baseParkingCost = parkingType === 'tiedown' ? backendCosts.tiedownCost : backendCosts.hangarCost;
  const parkingCost = ownershipShare < 1 ? baseParkingCost * ownershipShare * 1.2 : baseParkingCost;

  // Helper to apply fractional ownership logic (same as in ownersFleetCalculations.ts)
  const applyFractional = (cost: number, costType: 'standard' | 'parking' | 'insurance' | 'noDiscount') => {
    if (ownershipShare === 1) return cost;
    switch (costType) {
      case 'parking':
      case 'insurance':
        return cost * ownershipShare * 1.2;
      // Reduce by share, then add 20%
      case 'noDiscount':
        return cost;
      // No change for management
      case 'standard':
      default:
        return cost * ownershipShare;
      // Standard proportional reduction
    }
  };

  // Apply ownership share to aircraft cost for financing
  // Add initial type rating cost for SF50 owner flown fractional ownership
  // Type rating share calculation: 1/2=50%, 1/4=75%, full=100%
  const getTypeRatingShare = (share: number) => {
    if (share === 1) return 1; // Full share pays 100%
    if (share === 0.5) return 0.5; // Half share pays 50%
    if (share === 0.25) return 0.75; // Quarter share pays 75%
    return share; // Fallback
  };
  const initialTypeRatingCost = aircraftType === 'SF50' && sf50OwnerFlown && ownershipShare < 1 ? sf50Costs.typeRatingInitial * getTypeRatingShare(ownershipShare) : 0;

  // For SF50, add JetStream package cost to aircraft cost (now using editable aircraftCostBase)
  const totalAircraftInvestment = aircraftType === 'SF50' ? aircraftCostBase + jetstreamPackages[jetstreamPackage].cost : aircraftCost;

  // For Owner's Fleet, calculate total investment (SR22 + SF50 + JetStream)
  const totalOwnersFleetInvestment = aircraftType === 'OwnersFleet' ? aircraftCostBaseSR22 + aircraftCostBaseSF50 + jetstreamPackages[jetstreamPackageOwnersFleet].cost : 0;
  const effectiveAircraftCost = aircraftType === 'OwnersFleet' ? totalOwnersFleetInvestment * ownershipShare : totalAircraftInvestment * ownershipShare + initialTypeRatingCost;
  const financing = calculateFinancing(effectiveAircraftCost, downPaymentPercent, interestRate, loanTermYears);

  // Calculate Owner's Fleet results using dedicated calculator
  let ownersFleetResults;
  if (aircraftType === 'OwnersFleet') {
    const ownersFleetInputs: OwnersFleetInputs = {
      sr22AircraftCost: aircraftCostBaseSR22,
      sf50AircraftCost: aircraftCostBaseSF50,
      interestRate,
      downPaymentPercent,
      loanTermYears,
      jetstreamPackage: jetstreamPackageOwnersFleet,
      aircraftCostBaseSF50,
      aircraftCostBaseSR22,
      hangarCost: backendCosts.hangarCost,
      insuranceAnnual: backendCosts.insuranceAnnual,
      managementFee: backendCosts.managementFee,
      subscriptions: ownersFleetConfig.subscriptions,
      cleaningMonthly: sf50Costs.cleaningMonthly,
      pilotServicesAnnual: sf50Costs.pilotServicesAnnual,
      professionalServicesAnnual: sf50Costs.professionalServicesAnnual,
      pilotPoolContribution: sf50Costs.pilotPoolContribution,
      sf50JetstreamHourly: 0,
      // Prepaid model
      sf50FuelBurnPerHour: sf50Costs.fuelBurnPerHour,
      sf50FuelPricePerGallon: sf50Costs.fuelPricePerGallon,
      sr22FuelBurnPerHour: ownersFleetConfig.sr22FuelBurnPerHour,
      sr22FuelPricePerGallon: ownersFleetConfig.sr22FuelPricePerGallon,
      sr22MaintenancePerHour: DEFAULT_CONFIG.sr22Leaseback.maintenancePerHour,
      ownershipShare
    };
    const ownersFleetScenario: OwnersFleetScenarioInputs = {
      sr22HoursMonth,
      sf50HoursMonth
    };
    ownersFleetResults = calculateOwnersFleetScenario(ownersFleetInputs, ownersFleetScenario, financing);
  }

  // Choose calculation based on aircraft type
  const results = aircraftType === 'SF50' || aircraftType === 'OwnersFleet' ? calculateSF50Scenario({
    aircraftCost,
    interestRate,
    downPaymentPercent,
    loanTermYears,
    hangarCost: backendCosts.hangarCost,
    insuranceAnnual: backendCosts.insuranceAnnual,
    managementFee: backendCosts.managementFee,
    subscriptions: 0,
    cleaningMonthly: sf50Costs.cleaningMonthly,
    pilotServicesAnnual: sf50Costs.pilotServicesAnnual,
    professionalServicesAnnual: sf50Costs.professionalServicesAnnual,
    // Will be 0 for SF50, 30000 for Owner's Fleet
    pilotPoolContribution: sf50Costs.pilotPoolContribution,
    jetstreamHourly: sf50Costs.jetstreamHourly,
    fuelBurnPerHour: sf50Costs.fuelBurnPerHour,
    fuelPricePerGallon: sf50Costs.fuelPricePerGallon,
    typeRatingInitial: sf50Costs.typeRatingInitial,
    typeRatingRecurrent: sf50Costs.typeRatingRecurrent,
    ownershipShare
  }, {
    ownerHours,
    ownerFlown: aircraftType === 'SF50' ? sf50OwnerFlown : false,
    pilotServicesHours
  }, financing) : calculateScenario({
    aircraftCost,
    interestRate,
    downPaymentPercent,
    loanTermYears,
    parkingCost,
    insuranceAnnual: backendCosts.insuranceAnnual,
    managementFee: backendCosts.managementFee,
    subscriptions: backendCosts.subscriptions,
    tciTraining: backendCosts.tciTraining,
    maintenancePerHour: backendCosts.maintenancePerHour,
    pilotServicesRate: backendCosts.pilotServicesRate,
    rentalRevenueRate: backendCosts.rentalRevenueRate,
    ownerUsageRate: backendCosts.ownerUsageRate,
    fuelBurnPerHour: backendCosts.fuelBurnPerHour,
    fuelPricePerGallon: backendCosts.fuelPricePerGallon,
    ownershipShare
  }, {
    scenarioType: isLeaseback ? 'leaseback' : 'standard',
    rentalHours: isLeaseback ? rentalHours : 0,
    ownerHours,
    pilotServicesHours
  }, financing);

  // Type guard for result types
  const isSR22Result = (res: any): res is import("@/lib/leasebackCalculations").ScenarioResults => {
    return 'rentalRevenue' in res;
  };

  // Helper functions for P&L display
  const displayAmount = (monthly: number) => {
    return plView === 'monthly' ? formatCurrency(monthly) : formatCurrency(monthly * 12);
  };
  const displayHours = (monthly: number) => {
    return plView === 'monthly' ? `${monthly} hrs` : `${monthly * 12} hrs`;
  };

  // Safe accessors for different result types
  const getDirectFlightCost = () => isSR22Result(results) ? results.directFlightCost : results.directFlightCost;
  const getRentalRevenue = () => isSR22Result(results) ? results.rentalRevenue : 0;
  const getOwnerUsageCosts = () => isSR22Result(results) ? results.ownerUsageCosts : 0;
  const getMaintenanceCosts = () => isSR22Result(results) ? results.maintenanceCosts : 0;
  const getOwnerFlightCosts = () => isSR22Result(results) ? results.ownerFlightCosts : 0;
  const getFixedCosts = () => {
    if (aircraftType === 'OwnersFleet' && ownersFleetResults) {
      return ownersFleetResults.fixedMonthlyCosts;
    }
    return isSR22Result(results) ? results.fixedCosts : results.fixedMonthlyCosts;
  };

  // Calculate total variable costs for P&L display
  const getTotalVariableCosts = () => {
    if (aircraftType === 'SF50') {
      // SF50: fuel + optional jetstream reserve + pilot services (if hourly)
      const fuel = ownerHours * 80 * sf50Costs.fuelPricePerGallon;
      const jetstreamReserve = includeJetstreamReserve ? ownerHours * (jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours) : 0;
      const pilotServices = sf50OwnerFlown && pilotServicesHours > 0 ? pilotServicesHours * sf50Costs.pilotServicesHourly : 0;
      return fuel + jetstreamReserve + pilotServices;
    } else {
      // SR22: owner usage OR (fuel + maintenance) + pilot services
      if (isLeaseback) {
        return getOwnerUsageCosts() + getOwnerFlightCosts();
      } else {
        const fuel = ownerHours * backendCosts.fuelBurnPerHour * backendCosts.fuelPricePerGallon;
        return fuel + getMaintenanceCosts() + getOwnerFlightCosts();
      }
    }
  };

  // For Owner's Fleet, use calculated net cash flow
  const getOwnersFleetNetCashFlow = () => {
    if (aircraftType !== 'OwnersFleet' || !ownersFleetResults) {
      return 0;
    }
    return ownersFleetResults.netMonthlyCashFlow;
  };
  return <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold mb-2">
              {aircraftType === 'SF50' ? 'SF50' : aircraftType === 'OwnersFleet' ? "Owner's Fleet" : aircraftType === 'SR20' ? 'SR20' : 'SR22'} Ownership Calculator
            </h1>
            <p className="text-muted-foreground">
              Understand your aircraft ownership costs
            </p>
            {inputsLocked && <p className="text-xs text-muted-foreground mt-1">
                Configuration locked by Nassau Flyers
              </p>}
          </div>
          
          {/* Aircraft Type & Ownership Share Selector with Save Button */}
          {!controlled && <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                {!customerName && <Tabs value={aircraftType} onValueChange={val => setAircraftType(val as 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="SR20" className="text-xs px-3">SR20</TabsTrigger>
                    <TabsTrigger value="SR22" className="text-xs px-3">SR22</TabsTrigger>
                    <TabsTrigger value="SF50" className="text-xs px-3">SF50</TabsTrigger>
                    <TabsTrigger value="OwnersFleet" className="text-xs px-3">Owner's Fleet</TabsTrigger>
                  </TabsList>
                </Tabs>}
                
                {!disableShareSelection && <Tabs value={ownershipShare.toString()} onValueChange={val => setOwnershipShare(parseFloat(val) as 1 | 0.5 | 0.333 | 0.25)}>
                  <TabsList className="h-8">
                    {aircraftType === 'SR20' && <TabsTrigger value="1" className="text-xs px-3">Full</TabsTrigger>}
                    {aircraftType === 'SR22' && <TabsTrigger value="1" className="text-xs px-3">Full</TabsTrigger>}
                    {aircraftType === 'SF50' && <TabsTrigger value="1" className="text-xs px-3">Full</TabsTrigger>}
                    {aircraftType === 'OwnersFleet' && <TabsTrigger value="1" className="text-xs px-3">Full</TabsTrigger>}
                    <TabsTrigger value="0.5" className="text-xs px-3">1/2</TabsTrigger>
                    {(aircraftType === 'SF50' || aircraftType === 'OwnersFleet') && <TabsTrigger value="0.333" className="text-xs px-3">1/3</TabsTrigger>}
                    {aircraftType === 'OwnersFleet' && <TabsTrigger value="0.25" className="text-xs px-3">1/4</TabsTrigger>}
                  </TabsList>
                </Tabs>}
              </div>
              
              {!hideSaveButton && !inputsLocked && <Button onClick={() => setSaveDialogOpen(true)} variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  <Save className="mr-2 h-4 w-4" />
                  Save Estimate
                </Button>}
            </div>}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - User Controls */}
          <div className="space-y-6">
            {/* Purchase & Financing */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase & Financing</CardTitle>
                <CardDescription>Aircraft purchase and loan details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SF50 Purchase Price Breakdown */}
                {aircraftType === 'SF50' && <div className="space-y-4">
                    {/* Aircraft Cost - Now Editable with Config Button */}
                    <div className="space-y-2">
                      <Label>Aircraft Cost (SF50)</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input type="text" value={aircraftCostBase.toLocaleString()} onClick={() => !inputsLocked && setSf50ConfigOpen(true)} readOnly disabled={inputsLocked} className="pl-7 font-semibold cursor-pointer" />
                        </div>
                        
                      </div>
                    </div>

                    {/* JetStream Package Selection */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        JetStream Package
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="text-xs">
                                Comprehensive maintenance coverage including all scheduled and unscheduled maintenance, 
                                inspections, and parts. Whichever limit is reached first determines expiration.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      
                      <select value={jetstreamPackage} onChange={e => setJetstreamPackage(e.target.value as '2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs')} disabled={inputsLocked} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        {Object.entries(jetstreamPackages).map(([key, pkg]) => <option key={key} value={key}>
                            {pkg.label} — ${pkg.cost.toLocaleString()}
                          </option>)}
                      </select>
                      
                      {/* JetStream Expiration Notice */}
                      
                    </div>

                    {/* Total Purchase Price */}
                    <div className="space-y-2 pt-3 border-t-2 border-primary/20">
                      <Label className="text-base font-bold">Total Aircraft Investment</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="text" value={(aircraftCostBase + jetstreamPackages[jetstreamPackage].cost).toLocaleString()} readOnly className="pl-7 bg-primary/5 cursor-not-allowed font-bold text-lg border-2 border-primary/30" disabled />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aircraft + JetStream Package
                      </p>
                    </div>

                    {ownershipShare < 1 && <p className="text-sm text-muted-foreground pt-2">
                      Your {ownershipShare === 0.5 ? '1/2' : ownershipShare === 0.333 ? '1/3' : '1/4'} share{sf50OwnerFlown ? ' (Including Cost of Type Rating)' : ''}: <span className="font-semibold text-foreground">{formatCurrency(effectiveAircraftCost)}</span>
                    </p>}
                  </div>}

                {/* Owner's Fleet Dual Aircraft Purchase */}
                {aircraftType === 'OwnersFleet' && <div className="space-y-4">
                    {/* Aircraft Costs - Side by Side */}
                    <div className="space-y-2">
                      <Label>Aircraft Cost</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">SR22</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input type="text" value={aircraftCostBaseSR22.toLocaleString()} onChange={e => {
                          const value = e.target.value.replace(/,/g, '');
                          if (!isNaN(Number(value))) {
                            setAircraftCostBaseSR22(Number(value));
                          }
                        }} disabled={inputsLocked} className="pl-7 font-semibold" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">SF50</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input type="text" value={aircraftCostBaseSF50.toLocaleString()} onClick={() => !inputsLocked && setSf50ConfigOpenOwnersFleet(true)} readOnly disabled={inputsLocked} className="pl-7 font-semibold cursor-pointer" />
                            </div>
                            
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* JetStream Package Selection */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        JetStream Package (SF50)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="text-xs">
                                Comprehensive maintenance coverage including all scheduled and unscheduled maintenance, 
                                inspections, and parts. Whichever limit is reached first determines expiration.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      
                      <select value={jetstreamPackageOwnersFleet} onChange={e => setJetstreamPackageOwnersFleet(e.target.value as '2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs')} disabled={inputsLocked} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        {Object.entries(jetstreamPackages).map(([key, pkg]) => <option key={key} value={key}>
                            {pkg.label} — ${pkg.cost.toLocaleString()}
                          </option>)}
                      </select>
                      
                      {/* JetStream Expiration Notice */}
                      
                    </div>

                    {/* Total Purchase Price */}
                    <div className="space-y-2 pt-3 border-t-2 border-primary/20">
                      <Label className="text-base font-bold">Total Aircraft Investment</Label>
                      <div className="space-y-1 mb-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>SR22:</span>
                          <span>${aircraftCostBaseSR22.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SF50:</span>
                          <span>${aircraftCostBaseSF50.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>JetStream Package:</span>
                          <span>${jetstreamPackages[jetstreamPackageOwnersFleet].cost.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="text" value={(aircraftCostBaseSR22 + aircraftCostBaseSF50 + jetstreamPackages[jetstreamPackageOwnersFleet].cost).toLocaleString()} readOnly className="pl-7 bg-primary/5 cursor-not-allowed font-bold text-lg border-2 border-primary/30" disabled />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        SR22 + SF50 + JetStream Package
                      </p>
                    </div>

                    {ownershipShare < 1 && <p className="text-sm text-muted-foreground pt-2">
                      Your {ownershipShare === 0.5 ? '1/2' : ownershipShare === 0.333 ? '1/3' : '1/4'} share of total investment: <span className="font-semibold text-foreground">{formatCurrency((aircraftCostBaseSR22 + aircraftCostBaseSF50 + jetstreamPackages[jetstreamPackageOwnersFleet].cost) * ownershipShare)}</span>
                    </p>}
                  </div>}

                {/* Standard Aircraft Cost for SR20/SR22 */}
                {(aircraftType === 'SR20' || aircraftType === 'SR22') && <div className="space-y-2">
                    <Label htmlFor="aircraftCost">Aircraft Cost (Full Price)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input id="aircraftCost" type="text" value={aircraftCost.toLocaleString()} onChange={e => {
                    const value = e.target.value.replace(/,/g, '');
                    if (!isNaN(Number(value))) {
                      setAircraftCost(Number(value));
                    }
                  }} className="pl-7" disabled={inputsLocked} />
                    </div>
                    {ownershipShare < 1 && <p className="text-sm text-muted-foreground">
                        Your {ownershipShare === 0.5 ? '1/2' : ownershipShare === 0.333 ? '1/3' : '1/4'} share: <span className="font-semibold text-foreground">{formatCurrency(effectiveAircraftCost)}</span>
                      </p>}
                  </div>}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="downPayment">Down %</Label>
                    <div className="relative">
                      <Input id="downPayment" type="number" value={downPaymentPercent} readOnly onClick={() => setFinancingDialogOpen(true)} className="pr-7 cursor-pointer" disabled={inputsLocked} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Rate %</Label>
                    <div className="relative">
                      <Input id="interestRate" type="number" step="0.1" value={interestRate} readOnly onClick={() => setFinancingDialogOpen(true)} className="pr-7 cursor-pointer" disabled={inputsLocked} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loanTerm">Term (yr)</Label>
                    <Input id="loanTerm" type="number" value={loanTermYears} readOnly onClick={() => setFinancingDialogOpen(true)} className="cursor-pointer" disabled={inputsLocked} />
                  </div>
                </div>
                <div className="pt-2 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Monthly Payment:</span>
                    <span className="text-lg font-bold">{formatCurrency(financing.monthlyPayment)}</span>
                  </div>
                  
                  
                </div>
              </CardContent>
            </Card>

            {/* Flying Hours - Combined Sliders */}
            <Card>
              <CardHeader>
                <CardTitle>Flying Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Owner's Fleet Dual Aircraft Hours */}
                {aircraftType === 'OwnersFleet' && <>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>SR22 Hours per Month</Label>
                        <span className="text-sm font-semibold">
                          {effectiveSr22HoursMonth} hrs/mo
                        </span>
                      </div>
                        <Slider value={[effectiveSr22HoursMonth]} onValueChange={value => {
                    const rounded = Math.round(value[0]);
                    if (controlled && onOwnersFleetChange) {
                      onOwnersFleetChange({
                        sr22HoursMonth: rounded,
                        sf50HoursMonth: effectiveSf50HoursMonth,
                        sr22PilotServicesHours: effectiveSr22PilotServicesHours
                      });
                    } else {
                      setSr22HoursMonth(rounded);
                    }
                  }} min={getOwnersFleetHourRange(ownershipShare).min} max={getOwnersFleetHourRange(ownershipShare).max} step={1} disabled={inputsLocked} className={inputsLocked ? 'opacity-50 cursor-not-allowed' : ''} />
                      <p className="text-xs text-muted-foreground">
                        {ownershipShare === 1 && 'Allowed range: 3–30 hrs/mo for full ownership'}
                        {ownershipShare === 0.5 && 'Allowed range: 6–20 hrs/mo for 1/2 share'}
                        {ownershipShare === 0.333 && 'Allowed range: 5–12 hrs/mo for 1/3 share'}
                        {ownershipShare === 0.25 && 'Allowed range: 3–10 hrs/mo for 1/4 share'}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>SF50 Vision Jet Hours per Month</Label>
                        <span className="text-sm font-semibold">
                          {effectiveSf50HoursMonth} hrs/mo
                        </span>
                      </div>
                        <Slider value={[effectiveSf50HoursMonth]} onValueChange={value => {
                    const rounded = Math.round(value[0]);
                    if (controlled && onOwnersFleetChange) {
                      onOwnersFleetChange({
                        sr22HoursMonth: effectiveSr22HoursMonth,
                        sf50HoursMonth: rounded,
                        sr22PilotServicesHours: effectiveSr22PilotServicesHours
                      });
                    } else {
                      setSf50HoursMonth(rounded);
                    }
                  }} min={getOwnersFleetHourRange(ownershipShare).min} max={getOwnersFleetHourRange(ownershipShare).max} step={1} disabled={inputsLocked} className={inputsLocked ? 'opacity-50 cursor-not-allowed' : ''} />
                      <p className="text-xs text-muted-foreground">
                        {ownershipShare === 1 && 'Allowed range: 3–30 hrs/mo for full ownership'}
                        {ownershipShare === 0.5 && 'Allowed range: 6–20 hrs/mo for 1/2 share'}
                        {ownershipShare === 0.25 && 'Allowed range: 3–10 hrs/mo for 1/4 share'}
                      </p>
                    </div>
                    
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Label>SR22 Pilot Services Hours</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">SR22 Pilot Services Only</p>
                                  <p>All SF50 hours automatically include pilot services. This slider is for additional SR22 pilot services hours only.</p>
                                  <ul className="list-disc list-inside space-y-1 mt-1">
                                    <li>Hourly rate up to 10 hours per day</li>
                                    <li>Each trip includes 1 hour for pre/post flight duties</li>
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="text-sm font-semibold">
                          {effectiveSr22PilotServicesHours} hrs/mo ({effectiveSr22PilotServicesHours * 12}/yr)
                        </span>
                      </div>
                      <Slider value={[effectiveSr22PilotServicesHours]} onValueChange={value => {
                    const rounded = Math.round(value[0]);
                    if (controlled && onOwnersFleetChange) {
                      onOwnersFleetChange({
                        sr22HoursMonth: effectiveSr22HoursMonth,
                        sf50HoursMonth: effectiveSf50HoursMonth,
                        sr22PilotServicesHours: rounded
                      });
                    } else {
                      setSr22PilotServicesHours(rounded);
                    }
                  }} min={0} max={60} step={1} disabled={inputsLocked} className={inputsLocked ? 'opacity-50 cursor-not-allowed' : ''} />
                      <p className="text-xs text-muted-foreground">
                        SR22 only - Rate: {formatCurrency(backendCosts.pilotServicesRate)}/hr (All SF50 hours include pilot services)
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Monthly Hours</span>
                        <span className="text-lg font-bold text-primary">{totalOwnersFleetHours} hrs</span>
                      </div>
                    </div>
                  </>}
              
                {/* Owner Flown Checkbox - SR22 only (SR20 is always owner flown) */}
                {aircraftType === 'SR22' && <div className="flex items-center space-x-2 pb-2 border-b">
                    <Checkbox id="ownerFlown" checked={!isNonPilot} onCheckedChange={checked => setIsNonPilot(!(checked as boolean))} disabled={inputsLocked} />
                    <label htmlFor="ownerFlown" className={`text-sm font-medium ${inputsLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      Owner Flown
                    </label>
                  </div>}

                {/* Owner Flown Checkbox - SF50 only (not Owner's Fleet) */}
                {aircraftType === 'SF50' && <div className="flex items-center space-x-2 pb-2 border-b">
                    <Checkbox id="sf50OwnerFlown" checked={sf50OwnerFlown} onCheckedChange={checked => setSf50OwnerFlownValue(checked as boolean)} disabled={inputsLocked} />
                    <label htmlFor="sf50OwnerFlown" className={`text-sm font-medium ${inputsLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      Owner Flown
                    </label>
                  </div>}

                {/* Owner Hours Slider - SR20/SR22/SF50 only (not Owner's Fleet) */}
                {(aircraftType === 'SR20' || aircraftType === 'SR22' || aircraftType === 'SF50') && <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Owner Hours</Label>
                      <span className="text-sm font-semibold">
                        {ownerHours} hrs/mo ({ownerHours * 12}/yr)
                      </span>
                    </div>
                    <Slider value={[ownerHours]} onValueChange={value => setOwnerHours(Math.round(value[0]))} min={getOwnerHoursRange(aircraftType, ownershipShare).min} max={getOwnerHoursRange(aircraftType, ownershipShare).max} step={1} disabled={inputsLocked} className={inputsLocked ? 'opacity-50 cursor-not-allowed' : ''} />
                    {aircraftType === 'SF50'}
                  </div>}

                {/* Rental Hours Slider - SR20/SR22 only */}
                {(aircraftType === 'SR20' || aircraftType === 'SR22') && <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Leaseback Hours</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {rentalHours} hrs/mo ({rentalHours * 12}/yr)
                      </span>
                      {leasebackOutlook.label && <Badge variant="outline" className={leasebackOutlook.color}>
                          {leasebackOutlook.label}
                        </Badge>}
                    </div>
                  </div>
                  <Slider value={[rentalHours]} onValueChange={value => setRentalHours(Math.round(value[0]))} min={0} max={aircraftType === 'SR20' ? 60 : 40} step={1} disabled={inputsLocked} className={inputsLocked ? 'opacity-50 cursor-not-allowed' : ''} />
                    
                  </div>}

            {/* Pilot Services Slider - SR22 only */}
            {aircraftType === 'SR22' && <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Pilot Services</Label>
                <span className="text-sm font-semibold">
                  {pilotServicesHours} hrs/mo ({pilotServicesHours * 12}/yr)
                </span>
              </div>
              <Slider value={[pilotServicesHours]} onValueChange={value => {
                  if (!isNonPilot) {
                    setPilotServicesHours(Math.round(value[0]));
                  }
                }} min={0} max={60} step={1} disabled={isNonPilot} />
                <p className="text-xs text-muted-foreground">
                  Rate: {formatCurrency(backendCosts.pilotServicesRate)}/hr
                </p>
              </div>}

            {/* SF50 Pilot Services Slider - Only shown when owner flown is checked (not for Owner's Fleet) */}
            {aircraftType === 'SF50' && sf50OwnerFlown && <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label>Pilot Services Hours (SF50)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="text-xs space-y-1">
                            <p className="font-semibold">SF50 Pilot Services</p>
                            {sf50OwnerFlown ? <>
                                <p className="mb-2">Owner-flown SF50 with pilot services option</p>
                                <ul className="list-disc list-inside space-y-1 mt-1">
                                  <li>Pilot pool contribution: Fixed monthly cost to maintain pilots on staff and standby (training/type rating included)</li>
                                  <li>Hourly pilot services: Variable cost charged only when using a pilot</li>
                                  <li>Hourly rate up to 10 hours per day</li>
                                  <li>Each trip includes 1 hour for pre/post flight duties</li>
                                  <li>Day trips: Consider ground wait time</li>
                                  <li>Overnight trips: T&E billed at cost thereafter</li>
                                </ul>
                              </> : <>
                                <p className="mb-2">All SF50 hours include professional pilot services</p>
                                <ul className="list-disc list-inside space-y-1 mt-1">
                                  <li>Hourly rate up to 10 hours per day</li>
                                  <li>Each trip includes 1 hour for pre/post flight duties</li>
                                  <li>Day trips: Consider ground wait time</li>
                                  <li>Overnight trips: T&E billed at cost thereafter</li>
                                </ul>
                              </>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-sm font-semibold">
                    {pilotServicesHours} hrs/mo ({pilotServicesHours * 12}/yr)
                  </span>
                </div>
                <Slider value={[pilotServicesHours]} onValueChange={value => setPilotServicesHours(value[0])} min={0} max={60} step={1} disabled={inputsLocked} className={inputsLocked ? 'opacity-50 cursor-not-allowed' : ''} />
                  
                <p className="text-xs text-muted-foreground">
                  Rate: {formatCurrency(sf50Costs.pilotServicesHourly)}/hr
                </p>
              </div>}

            {/* Owner Flown Checkbox */}
              </CardContent>
            </Card>

            {/* Parking Selection - SR22 only (SR20 is always tie-down) */}
            {aircraftType === 'SR22' && <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RadioGroup value={parkingType} onValueChange={value => setParkingType(value as 'tiedown' | 'hangar')} className="flex gap-6" disabled={inputsLocked}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tiedown" id="tiedown" disabled={inputsLocked} />
                      <Label htmlFor="tiedown" className={`font-normal ${inputsLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        Tie Down
                      </Label>
                      {isLeaseback && parkingType === 'tiedown' && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium ml-2">
                          Recommended
                        </span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hangar" id="hangar" disabled={inputsLocked} />
                      <Label htmlFor="hangar" className={`font-normal ${inputsLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        Hangar
                      </Label>
                    </div>
                  </RadioGroup>
                  
                </CardContent>
              </Card>}

            {/* Your Cirrus. Our Expertise. */}
            <Card className="border-2 border-primary/20">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <p className="font-semibold text-base text-center">Your Cirrus. Our Expertise. One Seamlessly Unique Experience.</p>
                  
                  {/* Benefits Section - Simple List */}
                  <div className="pt-3 space-y-3">
                    {isLeaseback ? <>
                        {/* Top 7 benefits in two columns for Leaseback */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Full maintenance coverage
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      <strong>Exclusive to Nassau Flyers</strong> — Our comprehensive maintenance program covers all wear & tear and non-insured, non-warrantied items, serviced by on-site Cirrus factory technicians using genuine OEM parts. This program is only available at Nassau Flyers.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Cirrus Factory Service Center
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Your aircraft is maintained by Cirrus Aircraft factory-trained technicians using genuine Cirrus OEM parts. Nassau Flyers uniquely houses both flight operations and a Cirrus factory service center under one roof—ensuring dealer-level care for your investment.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span>Fleet-rate insurance</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Cirrus-certified pilot team
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      All Nassau Flyers pilots are Cirrus-certified and receive ongoing training to ensure the highest standards of safety and professionalism.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Personal flight department
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Consider us your personal aviation concierge. We proactively manage your flight logistics, handle any issues that arise, and ensure every flight goes smoothly. Your dedicated team is always just a call or text away, ready to assist 24/7.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Platinum Club membership
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Exclusive membership status with priority access to Nassau Flyers services and amenities.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Volume-discounted fuel pricing
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Benefit from Nassau Flyers' on-field location and volume purchasing power—enjoy fixed-rate, discounted fuel pricing with no surprises or complications.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Full line service staff
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Access to our entire ground support team for services like aircraft towing, baggage handling, lavatory servicing, and general assistance, ensuring a seamless experience on the ground.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                        </div>

                        {/* Remaining benefits - show collapsible for SR22, fully expanded for SR20 */}
                        {aircraftType === 'SR20' ? <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium mt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              <span>Digital maintenance records</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              <span>Dispatch & scheduling</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              <span>Single monthly accounting</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              <span>Platinum lounge access</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              <span>Logbook storage & management</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              <span className="flex items-center gap-1.5">
                                AD/SB compliance monitoring
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">
                                        Airworthiness Directive and Service Bulletin monitoring ensures your aircraft is always airworthy, legal, and compliant without you thinking about it.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </span>
                            </div>
                          </div> : <Collapsible>
                            <div className="flex justify-center">
                              <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
                                <span>See full benefits</span>
                                <ChevronDown className="h-3 w-3" />
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium mt-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                  <span>Digital maintenance records</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                  <span>Dispatch & scheduling</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                  <span>Single monthly accounting</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                  <span>Platinum lounge access</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                  <span>Logbook storage & management</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                  <span className="flex items-center gap-1.5">
                                    AD/SB compliance monitoring
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-xs">
                                            Airworthiness Directive and Service Bulletin monitoring ensures your aircraft is always airworthy, legal, and compliant without you thinking about it.
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </span>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>}
                      </> : <>
                        {/* Top 6 benefits in two columns for Standard Ownership */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Cirrus Factory Service Center
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Your aircraft is maintained by Cirrus Aircraft factory-trained technicians using genuine Cirrus OEM parts. Nassau Flyers uniquely houses both flight operations and a Cirrus factory service center under one roof—ensuring dealer-level care for your investment.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Cirrus-certified pilot team
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      All Nassau Flyers pilots are Cirrus-certified and receive ongoing training to ensure the highest standards of safety and professionalism.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Personal flight department
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Consider us your personal aviation concierge. We proactively manage your flight logistics, handle any issues that arise, and ensure every flight goes smoothly. Your dedicated team is always just a call or text away, ready to assist 24/7.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Platinum Club membership
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Exclusive membership status with priority access to Nassau Flyers services and amenities.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span>Digital maintenance records</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Volume-discounted fuel pricing
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Benefit from Nassau Flyers' on-field location and volume purchasing power—enjoy fixed-rate, discounted fuel pricing with no surprises or complications.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            <span className="flex items-center gap-1.5">
                              Full line service staff
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Access to our entire ground support team for services like aircraft towing, baggage handling, lavatory servicing, and general assistance, ensuring a seamless experience on the ground.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                        </div>

                        {/* Collapsible for remaining 5 benefits - centered */}
                        <Collapsible>
                          <div className="flex justify-center">
                            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
                              <span>See full benefits</span>
                              <ChevronDown className="h-3 w-3" />
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium mt-2">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                <span>Dispatch & scheduling</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                <span>Single monthly accounting</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                <span>Platinum lounge access</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                <span>Logbook storage & management</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                <span className="flex items-center gap-1.5">
                                  AD/SB compliance monitoring
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-xs">
                                          Airworthiness Directive and Service Bulletin monitoring ensures your aircraft is always airworthy, legal, and compliant without you thinking about it.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </span>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Financial Summary */}
          <div className="space-y-6">
            
            {/* Owner's Fleet Direct Cost Cards - Side by Side */}
            {aircraftType === 'OwnersFleet' && sr22DirectCosts && sf50DirectCosts && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SR22 Direct Costs Card */}
                <Card className="bg-background/60 backdrop-blur-sm border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base">
                      SR22 Direct Flight Costs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Flying Hours</span>
                      <span className="font-medium">{sr22HoursMonth} hrs/month</span>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Fuel</span>
                        <span>{formatCurrency(sr22DirectCosts.fuel)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Maintenance</span>
                        <span>{formatCurrency(sr22DirectCosts.maintenance)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(sr22DirectCosts.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                        <span className="text-muted-foreground">Cost per Hour</span>
                        <span className="font-bold text-primary">{formatCurrency(sr22DirectCosts.costPerHour)}/hr</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SF50 Direct Costs Card */}
                <Card className="bg-background/60 backdrop-blur-sm border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base">
                      SF50 Direct Flight Costs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Flying Hours</span>
                      <span className="font-medium">{sf50HoursMonth} hrs/month</span>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Fuel Only</span>
                        <span>{formatCurrency(sf50DirectCosts.fuel)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="italic">JetStream Prepaid</span>
                        <span className="italic">$0</span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(sf50DirectCosts.fuel)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                        <span className="text-muted-foreground">Cost per Hour</span>
                        <span className="font-bold text-primary">{formatCurrency(sf50DirectCosts.fuel / sf50HoursMonth)}/hr</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>}
            
            {/* Financial Summary */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  {isLeaseback ? 'Leaseback Program' : aircraftType === 'OwnersFleet' ? 'Combined Ownership Costs' : 'Cost Summary'}
                  {!isLeaseback && aircraftType === 'OwnersFleet' && <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Based on the estimated SR22 and SF50 hours selected</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/30 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Loan Payment</span>
                    {downPaymentPercent < 100 && <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" onClick={() => setFinancingDialogOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Learn about financing and equity</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>}
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(financing.monthlyPayment)}/mo</div>
                </div>

                {/* Prominent box changes based on mode */}
                {isLeaseback ?
              // Leaseback mode: Owner Usage Rate is prominent (like Direct Flight Cost)
              <>
                    <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">Owner Usage Rate (Net)</div>
                        <div className="text-3xl font-bold text-primary">
                          {formatCurrency(getDirectFlightCost() - backendCosts.rentalRevenueRate * ownershipShare)}/hr
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Pay ${getDirectFlightCost()}/hr, receive ${formatCurrency(backendCosts.rentalRevenueRate * ownershipShare)}/hr back
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-accent/30 border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {results.netMonthlyCashFlow > 0 ? 'Your Profit Per Hour' : 'Effective Cost Per Hour'}
                        </span>
                        <span className={`font-semibold ${results.netMonthlyCashFlow > 0 ? 'text-green-600' : ''}`}>
                          {results.netMonthlyCashFlow > 0 ? '+' : ''}{formatCurrency(Math.abs(results.costPerHour))}/hr
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Net of all costs and leaseback revenue
                      </div>
                    </div>
                  </> :
              // Standard ownership mode: Direct flight cost is prominent
              <>
                    {/* SF50 Side-by-side hourly cost comparison */}
                    {aircraftType === 'SF50' ? <div className="grid grid-cols-2 gap-3">
                        {/* Fuel Only */}
                        <div className="p-4 rounded-lg bg-secondary/30 border">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-2 flex items-center justify-center gap-1">
                              Cost Per Hour
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Direct fuel cost: {sf50Costs.fuelBurnPerHour} gph × ${sf50Costs.fuelPricePerGallon}/gal
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(sf50Costs.fuelBurnPerHour * sf50Costs.fuelPricePerGallon)}/hr
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              JetStream prepaid first {jetstreamPackages[jetstreamPackage].years} years
                            </div>
                          </div>
                        </div>

                        {/* Fuel + Reserve */}
                        <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-2 flex items-center justify-center gap-1">
                              Price Per Hour + JetStream Renewal
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                       After your initial {jetstreamPackages[jetstreamPackage].years}-year JetStream package expires, 
                                       you can choose to renew coverage. This shows the amount per hour you should set aside 
                                       to save for that renewal: ${jetstreamPackages[jetstreamPackage].cost.toLocaleString()} ÷ {jetstreamPackages[jetstreamPackage].hours} hours = {formatCurrency(jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours)}/hr
                                     </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(sf50Costs.fuelBurnPerHour * sf50Costs.fuelPricePerGallon + jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours)}/hr
                            </div>
                            
                          </div>
                        </div>
                      </div> : <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground mb-2">
                            {aircraftType === 'OwnersFleet' ? 'Blended Direct Flight Cost' : 'Direct Flight Cost'}
                          </div>
                          <div className="text-3xl font-bold text-primary">
                            {formatCurrency(aircraftType === 'OwnersFleet' && totalOwnersFleetHours > 0 ? (sr22DirectCosts!.total + sf50DirectCosts!.total) / totalOwnersFleetHours : getDirectFlightCost())}/hr
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {aircraftType === 'OwnersFleet' ? 'Weighted average across both aircraft' : 'Fuel + Maintenance'}
                          </div>
                        </div>
                      </div>}

                    {/* Note about JetStream reserve - only for SF50 */}
                    {aircraftType === 'SF50'}

                    <div className="p-3 rounded-lg bg-accent/30 border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {aircraftType === 'OwnersFleet' ? 'Effective Cost Per Hour (Combined)' : 'Effective Cost Per Hour'}
                        </span>
                        <span className="font-semibold">
                          {aircraftType === 'OwnersFleet' && totalOwnersFleetHours > 0 ? formatCurrency(Math.abs(getOwnersFleetNetCashFlow()) / totalOwnersFleetHours) : formatCurrency(results.costPerHour)}/hr
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {aircraftType === 'OwnersFleet' ? `All-in cost ÷ total hours flown (${totalOwnersFleetHours} hrs)` : 'Fixed + Variable Costs'}
                      </div>
                    </div>
                  </>}

                <div className="p-3 rounded-lg bg-secondary/30 border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {aircraftType === 'OwnersFleet' ? 'Monthly All-In Cost to Own & Fly Both Aircraft' : results.netMonthlyCashFlow > 0 ? 'Monthly Net Profit' : 'Monthly All In Cost To Own & Fly'}
                    </span>
                    <span className={`font-semibold ${results.netMonthlyCashFlow > 0 ? 'text-green-600' : ''}`}>
                      {results.netMonthlyCashFlow > 0 ? '+' : ''}{formatCurrency(Math.abs(results.netMonthlyCashFlow + financing.monthlyPayment))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed P&L Breakdown - Always Visible with Monthly/Annual Toggle */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed P&L Breakdown</CardTitle>
                <div className="flex items-center gap-4 mt-6">
                  <button onClick={() => setPlView('monthly')} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${plView === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                    Monthly
                  </button>
                  <button onClick={() => setPlView('annual')} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${plView === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                    Annual
                  </button>
                </div>
              </CardHeader>
              <CardContent className="font-mono text-sm">
                {isLeaseback && getRentalRevenue() > 0 && <>
                    <div className="mb-4">
                      <div className="font-semibold mb-2 text-base">REVENUE</div>
                      <div className="flex justify-between py-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                                Leaseback Revenue
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{displayHours(rentalHours)} × ${backendCosts.rentalRevenueRate}/hr × {ownershipShare * 100}% share</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-primary font-semibold">
                          {displayAmount(rentalHours * backendCosts.rentalRevenueRate * ownershipShare)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                                Owner Usage Credit
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{displayHours(ownerHours)} × ${backendCosts.rentalRevenueRate}/hr × {ownershipShare * 100}% share</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-primary font-semibold">
                          {displayAmount(ownerHours * backendCosts.rentalRevenueRate * ownershipShare)}
                        </span>
                      </div>
                      <div className="border-t border-border my-2"></div>
                      <div className="flex justify-between py-1 font-semibold">
                        <span>Total Revenue</span>
                        <span className="text-primary">{displayAmount(getRentalRevenue())}</span>
                      </div>
                    </div>
                  </>}

                <div className="mb-4">
                  <div className="font-semibold mb-2 text-base">
                    {aircraftType === 'OwnersFleet' ? 'VARIABLE COSTS - DIRECT FLIGHT COSTS' : 'VARIABLE COSTS'}
                  </div>
                  
                  {/* Owner's Fleet Combined Costs */}
                  {aircraftType === 'OwnersFleet' && sr22DirectCosts && sf50DirectCosts && <>
                      <div className="flex justify-between py-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                                SR22 Direct Flight Costs
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Fuel + Maintenance + Pilot Services (if selected)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="font-medium">{displayAmount(sr22DirectCosts.total)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                                SF50 Direct Flight Costs
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Fuel + JetStream</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="font-medium">{displayAmount(sf50DirectCosts.total)}</span>
                      </div>
                      <div className="border-t border-border my-2"></div>
                      <div className="flex justify-between py-1 font-semibold">
                        <span>Total Variable Costs</span>
                        <span className="text-primary">{displayAmount(sr22DirectCosts.total + sf50DirectCosts.total)}</span>
                      </div>
                    </>}
                  
                  {/* Fuel - SF50 only (not Owner's Fleet) */}
                  {aircraftType === 'SF50' && ownerHours > 0 && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Fuel
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{displayHours(ownerHours)} × 80 gph × ${sf50Costs.fuelPricePerGallon}/gal</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(ownerHours * 80 * sf50Costs.fuelPricePerGallon)}</span>
                    </div>}
                  
                  {/* Fuel - SR22 in non-leaseback mode */}
                  {aircraftType === 'SR22' && !isLeaseback && ownerHours > 0 && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Fuel
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{displayHours(ownerHours)} × {backendCosts.fuelBurnPerHour} gph × ${backendCosts.fuelPricePerGallon}/gal</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">
                        {displayAmount(ownerHours * backendCosts.fuelBurnPerHour * backendCosts.fuelPricePerGallon)}
                      </span>
                    </div>}

                  {/* Owner Usage Costs - Only in Leaseback Mode */}
                  {isLeaseback && ownerHours > 0 && <div>
                      <div className="flex justify-between py-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                                Owner Usage
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{displayHours(ownerHours)} × {formatCurrency(backendCosts.ownerUsageRate)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="font-medium">{displayAmount(getOwnerUsageCosts())}</span>
                      </div>
                      
                    </div>}
                  
                  {/* Maintenance - Only Standard Ownership */}
                  {!isLeaseback && getMaintenanceCosts() > 0 && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Maintenance
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{displayHours(ownerHours)} × {formatCurrency(backendCosts.maintenancePerHour)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(getMaintenanceCosts())}</span>
                    </div>}
                  
                  {/* Wear & Tear - Only in Leaseback Mode */}
                  {isLeaseback && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Wear & Tear (Non-Warranty MX)
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Exclusive Maintenance Protection</p>
                            <p>Nassau Flyers covers all non-warranty and non-insurance items—bringing jet-level care to SR pistons. Only available for leaseback aircraft.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          INCLUDED
                        </Badge>
                      </div>
                    </div>}
                  
                  {/* Pilot Services - SR22 only */}
                  {aircraftType === 'SR22' && pilotServicesHours > 0 && <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        Pilot Services - SR22 Only ({displayHours(pilotServicesHours)} × {formatCurrency(backendCosts.pilotServicesRate)})
                      </span>
                      <span className="font-medium">{displayAmount(getOwnerFlightCosts())}</span>
                    </div>}

                  {/* Pilot Services - SF50 owner flown hourly */}
                  {aircraftType === 'SF50' && sf50OwnerFlown && pilotServicesHours > 0 && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Pilot Services - SF50 (Included)
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">All SF50 hours include professional pilot services: {displayHours(pilotServicesHours)} × {formatCurrency(sf50Costs.pilotServicesHourly)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(pilotServicesHours * sf50Costs.pilotServicesHourly)}</span>
                    </div>}

                  {/* JetStream - SF50 only - Now with Reserve Toggle */}
                  {aircraftType === 'SF50' && <div className="space-y-2">
                      <div className="flex justify-between py-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                                JetStream Maintenance
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Comprehensive maintenance coverage prepaid at purchase. 
                                Package: {jetstreamPackages[jetstreamPackage].label}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                            PREPAID IN PURCHASE
                          </Badge>
                        </div>
                      </div>
                      
                      {/* JetStream Reserve Toggle */}
                      <div className="pl-4">
                        <div className="flex items-center gap-2">
                          <Checkbox id="include-jetstream-reserve" checked={includeJetstreamReserve} onCheckedChange={checked => setIncludeJetstreamReserve(checked === true)} disabled={inputsLocked} />
                          <Label htmlFor="include-jetstream-reserve" className="text-xs cursor-pointer flex items-center gap-1">
                            Include JetStream Reserve in P&L
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    JetStream reserve calculation ({formatCurrency(jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours)}/hr) 
                                    is useful for comparing maintenance costs or planning resale value. 
                                    Not required if keeping the aircraft within the prepaid coverage period 
                                    ({jetstreamPackages[jetstreamPackage].years} years or {jetstreamPackages[jetstreamPackage].hours} hours).
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                        </div>
                        
                        {includeJetstreamReserve && <div className="flex justify-between py-1 mt-1 text-xs">
                            <span className="text-muted-foreground">Reserve Rate</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium cursor-help border-b border-dotted border-muted-foreground/50">
                                    {displayAmount(ownerHours * (jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    {formatCurrency(jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours)}/hr × {displayHours(ownerHours)} = {displayAmount(ownerHours * (jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours))}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>}
                      </div>
                    </div>}
                  
                  {/* FBO Fees - SF50 only (At Cost) */}
                  {aircraftType === 'SF50' && <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">FBO Fees</span>
                      <span className="font-medium text-muted-foreground">At Cost</span>
                    </div>}
                  
                  {/* Pilot Travel & Expenses - When pilot services are selected */}
                  {pilotServicesHours > 0 && <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Pilot Travel & Expenses</span>
                      <span className="font-medium text-muted-foreground">At Cost</span>
                    </div>}
                  
                  {/* Total Variable Costs - Only for SR22 and SF50, not Owner's Fleet */}
                  {aircraftType !== 'OwnersFleet' && <>
                      <div className="border-t border-border my-2"></div>
                      <div className="flex justify-between py-1 font-semibold">
                        <span>Total Variable Costs</span>
                        <span>{displayAmount(getTotalVariableCosts())}</span>
                      </div>
                    </>}
                </div>

                <div className="mb-4">
                  <div className="font-semibold mb-2 text-base">
                    {aircraftType === 'OwnersFleet' ? 'FIXED COSTS - SHARED INFRASTRUCTURE' : 'FIXED COSTS'}
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Parking</span>
                    <span className="font-medium">{aircraftType === 'OwnersFleet' && ownersFleetResults ? displayAmount(ownersFleetResults.parking) : displayAmount(parkingCost)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Insurance</span>
                    <span className="font-medium">{aircraftType === 'OwnersFleet' && ownersFleetResults ? displayAmount(ownersFleetResults.insurance) : displayAmount(backendCosts.insuranceAnnual / 12 * (ownershipShare < 1 ? ownershipShare * 1.2 : 1))}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Management</span>
                    <span className="font-medium">{aircraftType === 'OwnersFleet' && ownersFleetResults ? displayAmount(ownersFleetResults.management) : displayAmount(backendCosts.managementFee)}</span>
                  </div>
                  
                  {/* Subscriptions - Owner's Fleet gets from results, SR22 from backend */}
                  {aircraftType === 'OwnersFleet' && ownersFleetResults && <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Subscriptions</span>
                      <span className="font-medium">{displayAmount(ownersFleetResults.subscriptions)}</span>
                    </div>}
                  {aircraftType === 'SR22' && <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Subscriptions</span>
                      <span className="font-medium">{displayAmount(backendCosts.subscriptions)}</span>
                    </div>}
                  
                  {/* Cleaning - Owner's Fleet gets from results */}
                  {aircraftType === 'OwnersFleet' && ownersFleetResults && <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Cleaning</span>
                      <span className="font-medium">{displayAmount(ownersFleetResults.cleaning)}</span>
                    </div>}
                  
                  {/* Washing/Cleaning - SR22 only */}
                  {aircraftType === 'SR22' && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Washing/Cleaning
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">As needed and after maintenance. Additional detailing available upon request</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          INCLUDED
                        </Badge>
                      </div>
                    </div>}
                  {/* Owner's Fleet Pilot Services - Always professionally flown */}
                  {aircraftType === 'OwnersFleet' && ownersFleetResults && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Pilot Services
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Pilot availability & all required recurrent training</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(ownersFleetResults.pilotServices)}</span>
                    </div>}
                  
                  {/* Professional Services - Owner's Fleet only */}
                  {aircraftType === 'OwnersFleet' && ownersFleetResults && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Professional Services
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Legal, Financial & Administration</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(ownersFleetResults.professionalServices)}</span>
                    </div>}
                  
                  {/* Pilot Pool Contribution - Owner's Fleet always includes */}
                  {aircraftType === 'OwnersFleet' && ownersFleetResults && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Pilot Pool Contribution
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Annual contribution to the professional pilot pool for backup and relief coverage</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(ownersFleetResults.pilotPoolContribution)}</span>
                    </div>}
                  
                  {/* SF50 Subscriptions and Cleaning */}
                  {aircraftType === 'SF50' && <>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Subscriptions</span>
                        <span className="font-medium">{displayAmount(applyFractional(backendCosts.subscriptions, 'standard'))}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Cleaning</span>
                        <span className="font-medium">{displayAmount(applyFractional(sf50Costs.cleaningMonthly, 'standard'))}</span>
                      </div>
                    </>}
                  
                  {/* SF50 Pilot Services - Only show if NOT owner flown */}
                  {aircraftType === 'SF50' && !sf50OwnerFlown && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Pilot Services
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Pilot availability & all required recurrent training</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(applyFractional(sf50Costs.pilotServicesAnnual / 12, 'insurance'))}</span>
                    </div>}
                  
                  {/* SF50 Pilot Pool - Show when owner flown with pilot services */}
                  {aircraftType === 'SF50' && sf50OwnerFlown && pilotServicesHours > 0 && <div className="flex justify-between py-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Pilot Pool Contribution
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Annual contribution to the professional pilot pool for backup and relief coverage</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="font-medium">{displayAmount(applyFractional(sf50Costs.pilotPoolContribution / 12, 'standard'))}</span>
                    </div>}
                  
                  {/* Show type rating recurrent if owner flown AND fractional ownership */}
                  {aircraftType === 'SF50' && sf50OwnerFlown && ownershipShare < 1 && <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Type Rating Recurrent</span>
                      <span className="font-medium">{displayAmount(sf50Costs.typeRatingRecurrent * getTypeRatingShare(ownershipShare) / 12)}</span>
                    </div>}
                  {isLeaseback && <>
                      <div className="flex justify-between py-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                                TCI Training
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Required training for flight instructors to work with customers and thus generate leaseback revenue in your plane</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="font-medium">{displayAmount(backendCosts.tciTraining)}</span>
                      </div>
                    </>}
                  <div className="flex justify-between py-1">
                    {financing.loanAmount > 0 ? <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50">
                              Debt Payment
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{interestRate}% / {loanTermYears} years</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider> : <span className="text-muted-foreground">Debt Payment</span>}
                    <span className="font-medium">{displayAmount(financing.monthlyPayment)}</span>
                  </div>
                  <div className="border-t border-border my-2"></div>
                  <div className="flex justify-between py-1 font-semibold">
                    <span>Total Fixed Costs
                  </span>
                    <span>{displayAmount(getFixedCosts() + financing.monthlyPayment)}</span>
                  </div>
                </div>

                <div className="border-t-2 border-primary pt-4 space-y-3">
                  {/* Net Monthly Cash Expense */}
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>NET {plView === 'monthly' ? 'MONTHLY' : 'ANNUAL'} CASH {(aircraftType === 'OwnersFleet' ? getOwnersFleetNetCashFlow() : results.netMonthlyCashFlow) > 0 ? 'PROFIT' : 'EXPENSE'}</span>
                    <span className={(aircraftType === 'OwnersFleet' ? getOwnersFleetNetCashFlow() : results.netMonthlyCashFlow) > 0 ? 'text-green-600' : 'text-primary'}>
                      {(() => {
                      let netCash = aircraftType === 'OwnersFleet' ? getOwnersFleetNetCashFlow() : results.netMonthlyCashFlow;
                      // Add JetStream reserve if included in P&L for SF50
                      if (aircraftType === 'SF50' && includeJetstreamReserve) {
                        const jetstreamReserve = ownerHours * (jetstreamPackages[jetstreamPackage].cost / jetstreamPackages[jetstreamPackage].hours);
                        netCash -= jetstreamReserve; // Subtract because it increases expense
                      }
                      return (netCash > 0 ? '+' : '') + displayAmount(Math.abs(netCash));
                    })()}
                    </span>
                  </div>

                  {/* True Ownership Cost Estimate */}
                  {downPaymentPercent < 100 && <div className="bg-muted/30 -mx-6 px-6 py-3 border-y border-border/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold">True Ownership Cost Estimate</span>
                          {downPaymentPercent < 100 && <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => setFinancingDialogOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Click to see how this is calculated</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>}
                        </div>
                        <span className="text-base font-bold">
                          {(() => {
                        // Calculate true ownership cost over 3 years
                        const monthlyRate = interestRate / 100 / 12;
                        const downPayment = aircraftCost * (downPaymentPercent / 100);
                        const financedAmount = aircraftCost - downPayment;

                        // Total spent = loan payments over 3 years (excluding down payment)
                        const totalLoanPayments = financing.monthlyPayment * 36;
                        const totalSpent = totalLoanPayments; // Removed downPayment from this calculation

                        // Calculate equity recovered at user-specified resale percentage
                        const resaleValue = aircraftCost * (resalePercent / 100);
                        let remainingBalance = financedAmount;
                        for (let i = 0; i < 36; i++) {
                          const interestPayment = remainingBalance * monthlyRate;
                          const principalPayment = financing.monthlyPayment - interestPayment;
                          remainingBalance -= principalPayment;
                        }
                        const equityRecovered = resaleValue - remainingBalance;

                        // Operating costs over 3 years (net cash expense excluding loan payment)
                        const actualNetCashFlow = aircraftType === 'OwnersFleet' ? getOwnersFleetNetCashFlow() : results.netMonthlyCashFlow;
                        const netOperatingCost = actualNetCashFlow < 0 ? Math.abs(actualNetCashFlow) - financing.monthlyPayment : -(actualNetCashFlow + financing.monthlyPayment);
                        const totalOperatingCost = netOperatingCost * 36;

                        // True cost = (Total spent + Operating costs) - Equity recovered
                        const trueCost = totalSpent + totalOperatingCost - equityRecovered;
                        const trueMonthlyAverage = trueCost / 36;

                        // Display based on view
                        const displayValue = plView === 'monthly' ? trueMonthlyAverage : trueMonthlyAverage * 12;
                        return displayValue > 0 ? formatCurrency(displayValue) : '(' + formatCurrency(Math.abs(displayValue)) + ')';
                      })()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Average {plView === 'monthly' ? 'monthly' : 'annual'} cost accounting for {resalePercent}% resale value after 3 years
                      </p>
                    </div>}
                  
                  {/* Tax & Depreciation - Directly under net cost */}
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-sm font-medium">Tax & Depreciation Value up to full purchase price</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Aircraft owners benefit from significant depreciation and tax advantages. Consult your tax advisor for specific deduction opportunities based on your situation.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>


              </CardContent>
            </Card>
          </div>
        </div>


        {/* Save Estimate Dialog */}
        {!controlled && !hideSaveButton && <SaveEstimateDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} calculatorValues={{
        aircraftType,
        ownershipShare,
        aircraftCost,
        downPaymentPercent,
        interestRate,
        loanTermYears,
        ownerHours,
        rentalHours,
        pilotServicesHours,
        isNonPilot,
        parkingType,
        insuranceAnnual: backendCosts.insuranceAnnual,
        managementFee: backendCosts.managementFee,
        subscriptions: backendCosts.subscriptions,
        tciTraining: backendCosts.tciTraining,
        maintenancePerHour: backendCosts.maintenancePerHour,
        tiedownCost: backendCosts.tiedownCost,
        hangarCost: backendCosts.hangarCost,
        rentalRevenueRate: backendCosts.rentalRevenueRate,
        ownerUsageRate: backendCosts.ownerUsageRate,
        pilotServicesRate: backendCosts.pilotServicesRate,
        // SF50-specific fields
        cleaningMonthly: sf50Costs.cleaningMonthly,
        pilotServicesAnnual: sf50Costs.pilotServicesAnnual,
        jetstreamHourly: sf50Costs.jetstreamHourly,
        jetstreamPackage: jetstreamPackage,
        fuelBurnPerHour: aircraftType === 'SF50' ? sf50Costs.fuelBurnPerHour : backendCosts.fuelBurnPerHour,
        fuelPricePerGallon: aircraftType === 'SF50' ? sf50Costs.fuelPricePerGallon : backendCosts.fuelPricePerGallon,
        pilotServicesHourly: sf50Costs.pilotServicesHourly,
        pilotPoolContribution: sf50Costs.pilotPoolContribution,
        sf50OwnerFlown: sf50OwnerFlown,
        aircraftCostBase: aircraftCostBase,
        includeJetstreamReserve: includeJetstreamReserve
      }} ownersFleetHours={aircraftType === 'OwnersFleet' ? {
        sr22HoursMonth: effectiveSr22HoursMonth,
        sf50HoursMonth: effectiveSf50HoursMonth,
        sr22PilotServicesHours: effectiveSr22PilotServicesHours
      } : undefined} />}
      <FinancingInfoDialog open={financingDialogOpen} onOpenChange={setFinancingDialogOpen} aircraftCost={aircraftCost} downPaymentPercent={downPaymentPercent} interestRate={interestRate} loanTermYears={loanTermYears} ownershipShare={ownershipShare} aircraftType={aircraftType} disableShareSelection={disableShareSelection} onApplyValues={values => {
        setDownPaymentPercent(values.downPaymentPercent);
        setInterestRate(values.interestRate);
        setLoanTermYears(values.loanTermYears);
        setOwnershipShare(values.ownershipShare);
        setResalePercent(values.resalePercent);
      }} />

      {/* SF50 Configuration Dialogs */}
      <SF50ConfigurationDialog open={sf50ConfigOpen} onOpenChange={setSf50ConfigOpen} initialPrice={aircraftCostBase} onSave={totalPrice => setAircraftCostBase(totalPrice)} />
      
      <SF50ConfigurationDialog open={sf50ConfigOpenOwnersFleet} onOpenChange={setSf50ConfigOpenOwnersFleet} initialPrice={aircraftCostBaseSF50} onSave={totalPrice => setAircraftCostBaseSF50(totalPrice)} />

      {/* Inline CTA - Only show in non-controlled mode */}
      {!controlled && !hideSaveButton && <PartnershipCTA variant="inline" />}
      </div>
    </div>;
}