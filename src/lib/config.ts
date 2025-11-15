import { DEFAULT_CONFIG } from '@/types/aircraft';
import { supabase } from '@/integrations/supabase/client';

export const STORAGE_KEY = 'aircraftConfig';

// Load config from backend database
export async function loadConfig() {
  try {
    // Get the most recent config from database
    const { data, error } = await supabase
      .from('aircraft_configs')
      .select('config_data')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to load config from database:', error);
      return DEFAULT_CONFIG;
    }

    if (!data) {
      // No config in database yet, save default and return it
      await saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }

    const parsed = data.config_data as any;
    
    // Validate and coerce all numeric fields
    const validated = {
      ownershipShare: parsed.ownershipShare ?? DEFAULT_CONFIG.ownershipShare,
      sr22: {
        ...DEFAULT_CONFIG.sr22,
        ...parsed.sr22,
        cruiseSpeed: Number(parsed.sr22?.cruiseSpeed ?? DEFAULT_CONFIG.sr22.cruiseSpeed),
        fuelFlow: Number(parsed.sr22?.fuelFlow ?? DEFAULT_CONFIG.sr22.fuelFlow),
        maintenanceCost: Number(parsed.sr22?.maintenanceCost ?? DEFAULT_CONFIG.sr22.maintenanceCost),
        range: Number(parsed.sr22?.range ?? DEFAULT_CONFIG.sr22.range),
        minRunway: Number(parsed.sr22?.minRunway ?? DEFAULT_CONFIG.sr22.minRunway),
        fuelCapacity: Number(parsed.sr22?.fuelCapacity ?? DEFAULT_CONFIG.sr22.fuelCapacity),
        maxPassengers: Number(parsed.sr22?.maxPassengers ?? DEFAULT_CONFIG.sr22.maxPassengers),
        maxBags: Number(parsed.sr22?.maxBags ?? DEFAULT_CONFIG.sr22.maxBags),
        usableFuel: Number(parsed.sr22?.usableFuel ?? DEFAULT_CONFIG.sr22.usableFuel),
        maxUsefulLoad: Number(parsed.sr22?.maxUsefulLoad ?? DEFAULT_CONFIG.sr22.maxUsefulLoad),
        emptyWeight: Number(parsed.sr22?.emptyWeight ?? DEFAULT_CONFIG.sr22.emptyWeight),
        fuelWeightPerGallon: Number(parsed.sr22?.fuelWeightPerGallon ?? DEFAULT_CONFIG.sr22.fuelWeightPerGallon),
        avgPersonWeight: Number(parsed.sr22?.avgPersonWeight ?? DEFAULT_CONFIG.sr22.avgPersonWeight),
        avgBagWeight: Number(parsed.sr22?.avgBagWeight ?? DEFAULT_CONFIG.sr22.avgBagWeight),
        taxiFuel: Number(parsed.sr22?.taxiFuel ?? DEFAULT_CONFIG.sr22.taxiFuel),
        contingencyFuelMin: Number(parsed.sr22?.contingencyFuelMin ?? DEFAULT_CONFIG.sr22.contingencyFuelMin),
        reserveFuel: Number(parsed.sr22?.reserveFuel ?? DEFAULT_CONFIG.sr22.reserveFuel),
        maxTakeoffWeight: Number(parsed.sr22?.maxTakeoffWeight ?? DEFAULT_CONFIG.sr22.maxTakeoffWeight),
      },
      jet: {
        ...DEFAULT_CONFIG.jet,
        ...parsed.jet,
        cruiseSpeed: Number(parsed.jet?.cruiseSpeed ?? DEFAULT_CONFIG.jet.cruiseSpeed),
        fuelFlow: Number(parsed.jet?.fuelFlow ?? DEFAULT_CONFIG.jet.fuelFlow),
        maintenanceCost: Number(parsed.jet?.maintenanceCost ?? DEFAULT_CONFIG.jet.maintenanceCost),
        range: Number(parsed.jet?.range ?? DEFAULT_CONFIG.jet.range),
        minRunway: Number(parsed.jet?.minRunway ?? DEFAULT_CONFIG.jet.minRunway),
        fuelCapacity: Number(parsed.jet?.fuelCapacity ?? DEFAULT_CONFIG.jet.fuelCapacity),
        maxPassengers: Number(parsed.jet?.maxPassengers ?? DEFAULT_CONFIG.jet.maxPassengers),
        maxBags: Number(parsed.jet?.maxBags ?? DEFAULT_CONFIG.jet.maxBags),
        usableFuel: Number(parsed.jet?.usableFuel ?? DEFAULT_CONFIG.jet.usableFuel),
        maxUsefulLoad: Number(parsed.jet?.maxUsefulLoad ?? DEFAULT_CONFIG.jet.maxUsefulLoad),
        emptyWeight: Number(parsed.jet?.emptyWeight ?? DEFAULT_CONFIG.jet.emptyWeight),
        fuelWeightPerGallon: Number(parsed.jet?.fuelWeightPerGallon ?? DEFAULT_CONFIG.jet.fuelWeightPerGallon),
        avgPersonWeight: Number(parsed.jet?.avgPersonWeight ?? DEFAULT_CONFIG.jet.avgPersonWeight),
        avgBagWeight: Number(parsed.jet?.avgBagWeight ?? DEFAULT_CONFIG.jet.avgBagWeight),
        taxiFuel: Number(parsed.jet?.taxiFuel ?? DEFAULT_CONFIG.jet.taxiFuel),
        contingencyFuelMin: Number(parsed.jet?.contingencyFuelMin ?? DEFAULT_CONFIG.jet.contingencyFuelMin),
        reserveFuel: Number(parsed.jet?.reserveFuel ?? DEFAULT_CONFIG.jet.reserveFuel),
        maxTakeoffWeight: Number(parsed.jet?.maxTakeoffWeight ?? DEFAULT_CONFIG.jet.maxTakeoffWeight),
        payloadRangeFormula: parsed.jet?.payloadRangeFormula ?? DEFAULT_CONFIG.jet.payloadRangeFormula,
      },
      reserveMinutes: Number(parsed.reserveMinutes ?? DEFAULT_CONFIG.reserveMinutes),
      timeValueDefault: Number(parsed.timeValueDefault ?? DEFAULT_CONFIG.timeValueDefault),
      headwindKts: Number(parsed.headwindKts ?? DEFAULT_CONFIG.headwindKts),
      sr22Leaseback: {
        defaultAircraftCost: Number(parsed.sr22Leaseback?.defaultAircraftCost ?? DEFAULT_CONFIG.sr22Leaseback.defaultAircraftCost),
        // Force default down payment to 100% regardless of stored value
        defaultDownPaymentPercent: DEFAULT_CONFIG.sr22Leaseback.defaultDownPaymentPercent,
        defaultInterestRate: Number(parsed.sr22Leaseback?.defaultInterestRate ?? DEFAULT_CONFIG.sr22Leaseback.defaultInterestRate),
        defaultLoanTermYears: Number(parsed.sr22Leaseback?.defaultLoanTermYears ?? DEFAULT_CONFIG.sr22Leaseback.defaultLoanTermYears),
        insuranceAnnual: Number(parsed.sr22Leaseback?.insuranceAnnual ?? DEFAULT_CONFIG.sr22Leaseback.insuranceAnnual),
        managementFee: Number(parsed.sr22Leaseback?.managementFee ?? DEFAULT_CONFIG.sr22Leaseback.managementFee),
        subscriptions: Number(parsed.sr22Leaseback?.subscriptions ?? DEFAULT_CONFIG.sr22Leaseback.subscriptions),
        tciTraining: Number(parsed.sr22Leaseback?.tciTraining ?? DEFAULT_CONFIG.sr22Leaseback.tciTraining),
        maintenancePerHour: Number(parsed.sr22Leaseback?.maintenancePerHour ?? DEFAULT_CONFIG.sr22Leaseback.maintenancePerHour),
        tiedownCost: Number(parsed.sr22Leaseback?.tiedownCost ?? DEFAULT_CONFIG.sr22Leaseback.tiedownCost),
        hangarCost: Number(parsed.sr22Leaseback?.hangarCost ?? DEFAULT_CONFIG.sr22Leaseback.hangarCost),
        rentalRevenueRate: Number(parsed.sr22Leaseback?.rentalRevenueRate ?? DEFAULT_CONFIG.sr22Leaseback.rentalRevenueRate),
        ownerUsageRate: Number(parsed.sr22Leaseback?.ownerUsageRate ?? DEFAULT_CONFIG.sr22Leaseback.ownerUsageRate),
        pilotServicesRate: Number(parsed.sr22Leaseback?.pilotServicesRate ?? DEFAULT_CONFIG.sr22Leaseback.pilotServicesRate),
      },
      sr20Leaseback: {
        defaultAircraftCost: Number(parsed.sr20Leaseback?.defaultAircraftCost ?? DEFAULT_CONFIG.sr20Leaseback.defaultAircraftCost),
        defaultDownPaymentPercent: DEFAULT_CONFIG.sr20Leaseback.defaultDownPaymentPercent,
        defaultInterestRate: Number(parsed.sr20Leaseback?.defaultInterestRate ?? DEFAULT_CONFIG.sr20Leaseback.defaultInterestRate),
        defaultLoanTermYears: Number(parsed.sr20Leaseback?.defaultLoanTermYears ?? DEFAULT_CONFIG.sr20Leaseback.defaultLoanTermYears),
        insuranceAnnual: Number(parsed.sr20Leaseback?.insuranceAnnual ?? DEFAULT_CONFIG.sr20Leaseback.insuranceAnnual),
        managementFee: Number(parsed.sr20Leaseback?.managementFee ?? DEFAULT_CONFIG.sr20Leaseback.managementFee),
        subscriptions: Number(parsed.sr20Leaseback?.subscriptions ?? DEFAULT_CONFIG.sr20Leaseback.subscriptions),
        tciTraining: Number(parsed.sr20Leaseback?.tciTraining ?? DEFAULT_CONFIG.sr20Leaseback.tciTraining),
        maintenancePerHour: Number(parsed.sr20Leaseback?.maintenancePerHour ?? DEFAULT_CONFIG.sr20Leaseback.maintenancePerHour),
        tiedownCost: Number(parsed.sr20Leaseback?.tiedownCost ?? DEFAULT_CONFIG.sr20Leaseback.tiedownCost),
        hangarCost: Number(parsed.sr20Leaseback?.hangarCost ?? DEFAULT_CONFIG.sr20Leaseback.hangarCost),
        rentalRevenueRate: Number(parsed.sr20Leaseback?.rentalRevenueRate ?? DEFAULT_CONFIG.sr20Leaseback.rentalRevenueRate),
        ownerUsageRate: Number(parsed.sr20Leaseback?.ownerUsageRate ?? DEFAULT_CONFIG.sr20Leaseback.ownerUsageRate),
        pilotServicesRate: Number(parsed.sr20Leaseback?.pilotServicesRate ?? DEFAULT_CONFIG.sr20Leaseback.pilotServicesRate),
      },
      tabs: {
        missionMatch: parsed.tabs?.missionMatch ?? DEFAULT_CONFIG.tabs.missionMatch,
        missionROI: parsed.tabs?.missionROI ?? DEFAULT_CONFIG.tabs.missionROI,
        jetChallenge: parsed.tabs?.jetChallenge ?? DEFAULT_CONFIG.tabs.jetChallenge,
        rangeExplorer: parsed.tabs?.rangeExplorer ?? DEFAULT_CONFIG.tabs.rangeExplorer,
        leasebackCalculator: parsed.tabs?.leasebackCalculator ?? DEFAULT_CONFIG.tabs.leasebackCalculator,
      },
      sf50Ownership: {
        defaultAircraftCost: Number(parsed.sf50Ownership?.defaultAircraftCost ?? DEFAULT_CONFIG.sf50Ownership.defaultAircraftCost),
        // Force default down payment to 100% regardless of stored value
        defaultDownPaymentPercent: DEFAULT_CONFIG.sf50Ownership.defaultDownPaymentPercent,
        defaultInterestRate: Number(parsed.sf50Ownership?.defaultInterestRate ?? DEFAULT_CONFIG.sf50Ownership.defaultInterestRate),
        defaultLoanTermYears: Number(parsed.sf50Ownership?.defaultLoanTermYears ?? DEFAULT_CONFIG.sf50Ownership.defaultLoanTermYears),
        defaultResalePercent: Number(parsed.sf50Ownership?.defaultResalePercent ?? DEFAULT_CONFIG.sf50Ownership.defaultResalePercent),
        hangarCost: Number(parsed.sf50Ownership?.hangarCost ?? DEFAULT_CONFIG.sf50Ownership.hangarCost),
        insuranceAnnual: Number(parsed.sf50Ownership?.insuranceAnnual ?? DEFAULT_CONFIG.sf50Ownership.insuranceAnnual),
        managementFee: Number(parsed.sf50Ownership?.managementFee ?? DEFAULT_CONFIG.sf50Ownership.managementFee),
        subscriptions: Number(parsed.sf50Ownership?.subscriptions ?? DEFAULT_CONFIG.sf50Ownership.subscriptions),
        cleaningMonthly: Number(parsed.sf50Ownership?.cleaningMonthly ?? DEFAULT_CONFIG.sf50Ownership.cleaningMonthly),
        pilotServicesAnnual: Number(parsed.sf50Ownership?.pilotServicesAnnual ?? DEFAULT_CONFIG.sf50Ownership.pilotServicesAnnual),
        pilotPoolContribution: Number(parsed.sf50Ownership?.pilotPoolContribution ?? DEFAULT_CONFIG.sf50Ownership.pilotPoolContribution),
        jetstreamHourly: Number(parsed.sf50Ownership?.jetstreamHourly ?? DEFAULT_CONFIG.sf50Ownership.jetstreamHourly),
        fuelBurnPerHour: Number(parsed.sf50Ownership?.fuelBurnPerHour ?? DEFAULT_CONFIG.sf50Ownership.fuelBurnPerHour),
        fuelPricePerGallon: Number(parsed.sf50Ownership?.fuelPricePerGallon ?? DEFAULT_CONFIG.sf50Ownership.fuelPricePerGallon),
      pilotServicesHourly: Number(parsed.sf50Ownership?.pilotServicesHourly ?? DEFAULT_CONFIG.sf50Ownership.pilotServicesHourly),
      typeRatingInitial: Number(parsed.sf50Ownership?.typeRatingInitial ?? DEFAULT_CONFIG.sf50Ownership.typeRatingInitial),
      typeRatingRecurrent: Number(parsed.sf50Ownership?.typeRatingRecurrent ?? DEFAULT_CONFIG.sf50Ownership.typeRatingRecurrent),
      defaultOwnerHours: Number(parsed.sf50Ownership?.defaultOwnerHours ?? DEFAULT_CONFIG.sf50Ownership.defaultOwnerHours),
    },
    jetstreamPackages: {
      '2yr-300hrs': {
        cost: Number(parsed.jetstreamPackages?.['2yr-300hrs']?.cost) || DEFAULT_CONFIG.jetstreamPackages['2yr-300hrs'].cost,
        years: Number(parsed.jetstreamPackages?.['2yr-300hrs']?.years) || DEFAULT_CONFIG.jetstreamPackages['2yr-300hrs'].years,
        hours: Number(parsed.jetstreamPackages?.['2yr-300hrs']?.hours) || DEFAULT_CONFIG.jetstreamPackages['2yr-300hrs'].hours,
        label: parsed.jetstreamPackages?.['2yr-300hrs']?.label || DEFAULT_CONFIG.jetstreamPackages['2yr-300hrs'].label,
      },
      '3yr-450hrs': {
        cost: Number(parsed.jetstreamPackages?.['3yr-450hrs']?.cost) || DEFAULT_CONFIG.jetstreamPackages['3yr-450hrs'].cost,
        years: Number(parsed.jetstreamPackages?.['3yr-450hrs']?.years) || DEFAULT_CONFIG.jetstreamPackages['3yr-450hrs'].years,
        hours: Number(parsed.jetstreamPackages?.['3yr-450hrs']?.hours) || DEFAULT_CONFIG.jetstreamPackages['3yr-450hrs'].hours,
        label: parsed.jetstreamPackages?.['3yr-450hrs']?.label || DEFAULT_CONFIG.jetstreamPackages['3yr-450hrs'].label,
      },
      '3yr-600hrs': {
        cost: Number(parsed.jetstreamPackages?.['3yr-600hrs']?.cost) || DEFAULT_CONFIG.jetstreamPackages['3yr-600hrs'].cost,
        years: Number(parsed.jetstreamPackages?.['3yr-600hrs']?.years) || DEFAULT_CONFIG.jetstreamPackages['3yr-600hrs'].years,
        hours: Number(parsed.jetstreamPackages?.['3yr-600hrs']?.hours) || DEFAULT_CONFIG.jetstreamPackages['3yr-600hrs'].hours,
        label: parsed.jetstreamPackages?.['3yr-600hrs']?.label || DEFAULT_CONFIG.jetstreamPackages['3yr-600hrs'].label,
      },
    },
      ownersFleetOwnership: {
        defaultAircraftCost: Number(parsed.ownersFleetOwnership?.defaultAircraftCost ?? DEFAULT_CONFIG.ownersFleetOwnership.defaultAircraftCost),
        defaultDownPaymentPercent: DEFAULT_CONFIG.ownersFleetOwnership.defaultDownPaymentPercent,
        defaultInterestRate: Number(parsed.ownersFleetOwnership?.defaultInterestRate ?? DEFAULT_CONFIG.ownersFleetOwnership.defaultInterestRate),
        defaultLoanTermYears: Number(parsed.ownersFleetOwnership?.defaultLoanTermYears ?? DEFAULT_CONFIG.ownersFleetOwnership.defaultLoanTermYears),
        hangarCost: Number(parsed.ownersFleetOwnership?.hangarCost ?? DEFAULT_CONFIG.ownersFleetOwnership.hangarCost),
        insuranceAnnual: Number(parsed.ownersFleetOwnership?.insuranceAnnual ?? DEFAULT_CONFIG.ownersFleetOwnership.insuranceAnnual),
        managementFee: Number(parsed.ownersFleetOwnership?.managementFee ?? DEFAULT_CONFIG.ownersFleetOwnership.managementFee),
        subscriptions: Number(parsed.ownersFleetOwnership?.subscriptions ?? DEFAULT_CONFIG.ownersFleetOwnership.subscriptions),
        cleaningMonthly: Number(parsed.ownersFleetOwnership?.cleaningMonthly ?? DEFAULT_CONFIG.ownersFleetOwnership.cleaningMonthly),
        pilotServicesAnnual: Number(parsed.ownersFleetOwnership?.pilotServicesAnnual ?? DEFAULT_CONFIG.ownersFleetOwnership.pilotServicesAnnual),
        professionalServicesAnnual: Number(parsed.ownersFleetOwnership?.professionalServicesAnnual ?? DEFAULT_CONFIG.ownersFleetOwnership.professionalServicesAnnual),
        sf50JetstreamHourly: Number(parsed.ownersFleetOwnership?.sf50JetstreamHourly ?? DEFAULT_CONFIG.ownersFleetOwnership.sf50JetstreamHourly),
        sf50FuelBurnPerHour: Number(parsed.ownersFleetOwnership?.sf50FuelBurnPerHour ?? DEFAULT_CONFIG.ownersFleetOwnership.sf50FuelBurnPerHour),
        sf50FuelPricePerGallon: Number(parsed.ownersFleetOwnership?.sf50FuelPricePerGallon ?? DEFAULT_CONFIG.ownersFleetOwnership.sf50FuelPricePerGallon),
        sf50PilotServicesHourly: Number(parsed.ownersFleetOwnership?.sf50PilotServicesHourly ?? DEFAULT_CONFIG.ownersFleetOwnership.sf50PilotServicesHourly),
        sr22MaintenancePerHour: Number(parsed.ownersFleetOwnership?.sr22MaintenancePerHour ?? DEFAULT_CONFIG.ownersFleetOwnership.sr22MaintenancePerHour),
        sr22FuelBurnPerHour: Number(parsed.ownersFleetOwnership?.sr22FuelBurnPerHour ?? DEFAULT_CONFIG.ownersFleetOwnership.sr22FuelBurnPerHour),
        sr22FuelPricePerGallon: Number(parsed.ownersFleetOwnership?.sr22FuelPricePerGallon ?? DEFAULT_CONFIG.ownersFleetOwnership.sr22FuelPricePerGallon),
        pilotPoolContribution: Number(parsed.ownersFleetOwnership?.pilotPoolContribution ?? DEFAULT_CONFIG.ownersFleetOwnership.pilotPoolContribution),
        typeRatingInitial: Number(parsed.ownersFleetOwnership?.typeRatingInitial ?? DEFAULT_CONFIG.ownersFleetOwnership.typeRatingInitial),
        typeRatingRecurrent: Number(parsed.ownersFleetOwnership?.typeRatingRecurrent ?? DEFAULT_CONFIG.ownersFleetOwnership.typeRatingRecurrent),
        defaultOwnerHours: Number(parsed.ownersFleetOwnership?.defaultOwnerHours ?? DEFAULT_CONFIG.ownersFleetOwnership.defaultOwnerHours),
      }
    };
    
    // If sr22Leaseback wasn't in the loaded config, save the merged version
    if (!parsed.sr22Leaseback) {
      await saveConfig(validated);
    }
    
    return validated;
  } catch (error) {
    console.error('Failed to load config from database:', error);
    return DEFAULT_CONFIG;
  }
}

// Save config to backend database
export async function saveConfig(config: typeof DEFAULT_CONFIG) {
  try {
    const { data, error } = await supabase.functions.invoke('save-config', {
      body: { config }
    });

    if (error) {
      console.error('Failed to save config via function:', error);
    }
  } catch (error) {
    console.error('Failed to save config to database:', error);
  }
}
