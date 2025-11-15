import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LeasebackCalculator } from "@/components/LeasebackCalculator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useConfig } from "@/context/ConfigContext";
type CustomOwnershipEstimate = Tables<'custom_ownership_estimates'>;
interface AdminEstimateEditorProps {
  estimate: CustomOwnershipEstimate | null;
  onClose: () => void;
}
export function AdminEstimateEditor({
  estimate,
  onClose
}: AdminEstimateEditorProps) {
  const [customerName, setCustomerName] = useState(estimate?.customer_name || "");
  const [customerEmail, setCustomerEmail] = useState(estimate?.customer_email || "");
  const [notes, setNotes] = useState(estimate?.notes || "");
  const [status, setStatus] = useState(estimate?.status || "draft");
  const [inputsLocked, setInputsLocked] = useState(estimate?.inputs_locked || false);
  const [allowShareSelection, setAllowShareSelection] = useState(estimate?.allow_share_selection || false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    toast
  } = useToast();
  const {
    config
  } = useConfig();

  // Aircraft type state
  const [aircraftType, setAircraftType] = useState<'SR20' | 'SR22' | 'SF50' | 'OwnersFleet'>(estimate?.aircraft_type as 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet' || 'SR22');

  // Get config for defaults
  const leasebackConfig = config.sr22Leaseback;
  const sf50Config = config.sf50Ownership;
  const ownersFleetConfig = config.ownersFleetOwnership;

  // Calculator values
  const [calculatorValues, setCalculatorValues] = useState({
    ownerHours: estimate?.owner_hours ?? (aircraftType === 'SF50' ? 200 : 15),
    rentalHours: estimate?.rental_hours ?? (aircraftType === 'SF50' ? 0 : 20),
    pilotServicesHours: estimate?.pilot_services_hours ?? 0,
    isNonPilot: estimate?.is_non_pilot ?? false,
    parkingType: estimate?.parking_type as 'tiedown' | 'hangar' || (aircraftType === 'SF50' ? 'hangar' : 'tiedown'),
    aircraftCost: estimate?.aircraft_cost ?? (aircraftType === 'SF50' ? 3500000 : 850000),
    downPaymentPercent: estimate?.down_payment_percent ?? 20,
    interestRate: estimate?.interest_rate ?? (aircraftType === 'SF50' ? 6 : 7.99),
    loanTermYears: estimate?.loan_term_years ?? 20,
    sf50OwnerFlown: estimate?.sf50_owner_flown ?? false,
    sf50PilotPoolContribution: estimate?.pilot_pool_contribution ?? 25000
  });
  
  // JetStream package
  const [jetstreamPackage, setJetstreamPackage] = useState<'2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs'>(
    (estimate as any)?.jetstream_package || '2yr-300hrs'
  );

  // Owner's Fleet hours state
  const [ownersFleetHours, setOwnersFleetHours] = useState({
    sr22HoursMonth: (estimate as any)?.ownersfleet_sr22_hours ?? 10,
    sf50HoursMonth: (estimate as any)?.ownersfleet_sf50_hours ?? 10,
    sr22PilotServicesHours: (estimate as any)?.ownersfleet_sr22_pilot_services_hours ?? 0
  });

  // Backend costs and rates - use config defaults
  const [insuranceAnnual, setInsuranceAnnual] = useState(estimate?.insurance_annual ?? (aircraftType === 'SF50' ? sf50Config.insuranceAnnual : leasebackConfig.insuranceAnnual));
  const [managementFee, setManagementFee] = useState(estimate?.management_fee ?? (aircraftType === 'SF50' ? sf50Config.managementFee : leasebackConfig.managementFee));
  const [subscriptions, setSubscriptions] = useState(estimate?.subscriptions ?? (aircraftType === 'SF50' ? 0 : leasebackConfig.subscriptions));
  const [tciTraining, setTciTraining] = useState(estimate?.tci_training ?? leasebackConfig.tciTraining);
  const [maintenancePerHour, setMaintenancePerHour] = useState(estimate?.maintenance_per_hour ?? leasebackConfig.maintenancePerHour);
  const [tiedownCost, setTiedownCost] = useState(estimate?.tiedown_cost ?? leasebackConfig.tiedownCost);
  const [hangarCost, setHangarCost] = useState(estimate?.hangar_cost ?? (aircraftType === 'SF50' ? sf50Config.hangarCost : leasebackConfig.hangarCost));
  const [rentalRevenueRate, setRentalRevenueRate] = useState(estimate?.rental_revenue_rate ?? leasebackConfig.rentalRevenueRate);
  const [ownerUsageRate, setOwnerUsageRate] = useState(estimate?.owner_usage_rate ?? leasebackConfig.ownerUsageRate);
  const [pilotServicesRate, setPilotServicesRate] = useState(estimate?.pilot_services_rate ?? leasebackConfig.pilotServicesRate);

  // SF50-specific fields
  const [cleaningMonthly, setCleaningMonthly] = useState(estimate?.cleaning_monthly ?? 500);
  const [pilotServicesAnnual, setPilotServicesAnnual] = useState(estimate?.pilot_services_annual ?? 100000);
  const [jetstreamHourly, setJetstreamHourly] = useState(estimate?.jetstream_hourly ?? 625);

  // SF50 costs state (matching LeasebackCalculator structure)
  const [sf50Costs, setSf50Costs] = useState({
    fuelBurnPerHour: estimate?.fuel_burn_per_hour ?? 80,
    fuelPricePerGallon: estimate?.fuel_price_per_gallon ?? 6.50,
    pilotServicesHourly: estimate?.pilot_services_hourly ?? 200
  });
  const generateSlug = (name: string): string => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now().toString(36);
    return `${base}-${timestamp}`;
  };
  const handleSave = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive"
      });
      return;
    }
    setIsSaving(true);
    try {
      const baseData = {
        customer_name: customerName,
        customer_email: customerEmail || null,
        notes: notes || null,
        status,
        inputs_locked: inputsLocked,
        allow_share_selection: allowShareSelection,
        aircraft_type: aircraftType,
        aircraft_cost: calculatorValues.aircraftCost,
        down_payment_percent: calculatorValues.downPaymentPercent,
        interest_rate: calculatorValues.interestRate,
        loan_term_years: calculatorValues.loanTermYears,
        owner_hours: aircraftType === 'OwnersFleet' ? (ownersFleetHours.sr22HoursMonth + ownersFleetHours.sf50HoursMonth) : calculatorValues.ownerHours,
        rental_hours: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? 0 : calculatorValues.rentalHours,
        pilot_services_hours: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? 0 : calculatorValues.pilotServicesHours,
        is_non_pilot: calculatorValues.isNonPilot,
        parking_type: calculatorValues.parkingType,
        insurance_annual: insuranceAnnual,
        management_fee: managementFee,
        subscriptions,
        tci_training: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? 0 : tciTraining,
        maintenance_per_hour: maintenancePerHour,
        tiedown_cost: tiedownCost,
        hangar_cost: hangarCost,
        rental_revenue_rate: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? 0 : rentalRevenueRate,
        owner_usage_rate: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? 0 : ownerUsageRate,
        pilot_services_rate: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? 0 : pilotServicesRate,
        // SF50-specific
        cleaning_monthly: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? cleaningMonthly : 0,
        pilot_services_annual: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? pilotServicesAnnual : 0,
        jetstream_hourly: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? jetstreamHourly : 0,
        sf50_owner_flown: aircraftType === 'SF50' ? calculatorValues.sf50OwnerFlown : false,
        fuel_burn_per_hour: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? sf50Costs.fuelBurnPerHour : 0,
        fuel_price_per_gallon: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? sf50Costs.fuelPricePerGallon : 0,
        pilot_services_hourly: (aircraftType === 'SF50' || aircraftType === 'OwnersFleet') ? sf50Costs.pilotServicesHourly : 0,
        pilot_pool_contribution: aircraftType === 'SF50' ? calculatorValues.sf50PilotPoolContribution : 0,
        jetstream_package: aircraftType === 'SF50' ? jetstreamPackage : null
      };

      // Add Owner's Fleet specific fields
      const estimateData = aircraftType === 'OwnersFleet' 
        ? {
            ...baseData,
            ownersfleet_sr22_hours: ownersFleetHours.sr22HoursMonth,
            ownersfleet_sf50_hours: ownersFleetHours.sf50HoursMonth,
            ownersfleet_sr22_pilot_services_hours: ownersFleetHours.sr22PilotServicesHours
          }
        : baseData;
      if (estimate) {
        // Check if customer name changed - if so, generate new slug
        const nameChanged = customerName !== estimate.customer_name;
        const dataWithSlug = nameChanged ? {
          ...estimateData,
          unique_slug: generateSlug(customerName)
        } : estimateData;
        const {
          error
        } = await supabase.functions.invoke('save-custom-estimate', {
          body: {
            id: estimate.id,
            data: dataWithSlug
          }
        });
        if (error) throw error;
        toast({
          title: "Success",
          description: nameChanged ? "Estimate updated with new URL (old URL will no longer work)" : "Estimate updated successfully"
        });
      } else {
        const {
          error
        } = await supabase.functions.invoke('save-custom-estimate', {
          body: {
            data: {
              ...estimateData,
              unique_slug: generateSlug(customerName)
            }
          }
        });
        if (error) throw error;
        toast({
          title: "Success",
          description: "Ownership estimate created successfully"
        });
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving estimate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save estimate",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aircraft Type Selector */}
          

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input id="customer-name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Customer Email</Label>
              <Input id="customer-email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="john@example.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aircraft-type">Aircraft Type</Label>
            <Select value={aircraftType} onValueChange={(val) => setAircraftType(val as 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet')}>
              <SelectTrigger id="aircraft-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SR20">SR20</SelectItem>
                <SelectItem value="SR22">SR22</SelectItem>
                <SelectItem value="SF50">SF50</SelectItem>
                <SelectItem value="OwnersFleet">Owner's Fleet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any internal notes..." rows={3} />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="inputsLocked" checked={inputsLocked} onCheckedChange={checked => setInputsLocked(checked as boolean)} />
            <label htmlFor="inputsLocked" className="text-sm font-medium cursor-pointer">
              Lock inputs for customer (make calculator read-only)
            </label>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="allowShareSelection" checked={allowShareSelection} onCheckedChange={checked => setAllowShareSelection(checked as boolean)} />
            <label htmlFor="allowShareSelection" className="text-sm font-medium cursor-pointer">
              Allow customer to change ownership share
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Integrated Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>
            {aircraftType === 'SF50' ? 'SF50 Ownership Calculator' : aircraftType === 'OwnersFleet' ? "Owner's Fleet Ownership Calculator" : 'SR22 Ownership Calculator'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeasebackCalculator 
            aircraftType={aircraftType} 
            controlled 
            values={calculatorValues} 
            onValuesChange={(vals) => setCalculatorValues({ ...calculatorValues, ...vals })} 
            ownersFleetHours={aircraftType === 'OwnersFleet' ? ownersFleetHours : undefined}
            onOwnersFleetChange={aircraftType === 'OwnersFleet' ? setOwnersFleetHours : undefined}
            initialValues={{
              aircraftType,
              aircraftCost: calculatorValues.aircraftCost,
              downPaymentPercent: calculatorValues.downPaymentPercent,
              interestRate: calculatorValues.interestRate,
              loanTermYears: calculatorValues.loanTermYears,
              ownerHours: calculatorValues.ownerHours,
              rentalHours: calculatorValues.rentalHours,
              pilotServicesHours: calculatorValues.pilotServicesHours,
              isNonPilot: calculatorValues.isNonPilot,
              parkingType: calculatorValues.parkingType,
              insuranceAnnual,
              managementFee,
              subscriptions,
              tciTraining,
              maintenancePerHour,
              tiedownCost,
              hangarCost,
              rentalRevenueRate,
              ownerUsageRate,
              pilotServicesRate,
              cleaningMonthly,
              pilotServicesAnnual,
              pilotServicesHourly: sf50Costs.pilotServicesHourly,
              jetstreamHourly,
              fuelBurnPerHour: sf50Costs.fuelBurnPerHour,
              fuelPricePerGallon: sf50Costs.fuelPricePerGallon,
              sr22HoursMonth: ownersFleetHours.sr22HoursMonth,
              sf50HoursMonth: ownersFleetHours.sf50HoursMonth
            }} 
            hideSaveButton 
          />
        </CardContent>
      </Card>

      {/* Backend Costs & Rates Configuration */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle>Backend Costs & Rates</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-6">
              {aircraftType === 'SR22' ? <>
                  {/* SR22 Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Insurance (Annual)</Label>
                      <Input type="number" value={insuranceAnnual} onChange={e => setInsuranceAnnual(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Management Fee (Monthly)</Label>
                      <Input type="number" value={managementFee} onChange={e => setManagementFee(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subscriptions (Monthly)</Label>
                      <Input type="number" value={subscriptions} onChange={e => setSubscriptions(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>TCI Training (Monthly)</Label>
                      <Input type="number" value={tciTraining} onChange={e => setTciTraining(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Maintenance (Per Hour)</Label>
                      <Input type="number" value={maintenancePerHour} onChange={e => setMaintenancePerHour(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tiedown Cost (Monthly)</Label>
                      <Input type="number" value={tiedownCost} onChange={e => setTiedownCost(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Hangar Cost (Monthly)</Label>
                      <Input type="number" value={hangarCost} onChange={e => setHangarCost(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rental Revenue Rate (Hourly)</Label>
                      <Input type="number" value={rentalRevenueRate} onChange={e => setRentalRevenueRate(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Owner Usage Rate (Hourly)</Label>
                      <Input type="number" value={ownerUsageRate} onChange={e => setOwnerUsageRate(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pilot Services Rate (Hourly)</Label>
                      <Input type="number" value={pilotServicesRate} onChange={e => setPilotServicesRate(Number(e.target.value))} />
                    </div>
                  </div>
                </> : <>
                  {/* SF50 Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Insurance (Annual)</Label>
                      <Input type="number" value={insuranceAnnual} onChange={e => setInsuranceAnnual(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Management Fee (Monthly)</Label>
                      <Input type="number" value={managementFee} onChange={e => setManagementFee(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cleaning (Monthly)</Label>
                      <Input type="number" value={cleaningMonthly} onChange={e => setCleaningMonthly(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pilot Services Salary (Annual)</Label>
                      <Input type="number" value={pilotServicesAnnual} onChange={e => setPilotServicesAnnual(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pilot Services (Hourly - Owner Flown) ($/hr)</Label>
                      <Input type="number" value={sf50Costs.pilotServicesHourly} onChange={e => setSf50Costs({
                    ...sf50Costs,
                    pilotServicesHourly: Number(e.target.value)
                  })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Hangar Cost (Monthly)</Label>
                      <Input type="number" value={hangarCost} onChange={e => setHangarCost(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>JetStream Program (Hourly)</Label>
                      <Input type="number" value={jetstreamHourly} onChange={e => setJetstreamHourly(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Maintenance Per Hour ($/hr)</Label>
                      <Input type="number" value={maintenancePerHour} onChange={e => setMaintenancePerHour(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fuel Burn Per Hour (gph)</Label>
                      <Input type="number" value={sf50Costs.fuelBurnPerHour} onChange={e => setSf50Costs({
                    ...sf50Costs,
                    fuelBurnPerHour: Number(e.target.value)
                  })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fuel Price Per Gallon ($/gal)</Label>
                      <Input type="number" step="0.01" value={sf50Costs.fuelPricePerGallon} onChange={e => setSf50Costs({
                    ...sf50Costs,
                    fuelPricePerGallon: Number(e.target.value)
                  })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tiedown Cost (Monthly)</Label>
                      <Input type="number" value={tiedownCost} onChange={e => setTiedownCost(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pilot Services (Hourly - Owner Flown) ($/hr)</Label>
                      <Input type="number" value={sf50Costs.pilotServicesHourly} onChange={e => setSf50Costs({
                    ...sf50Costs,
                    pilotServicesHourly: Number(e.target.value)
                  })} />
                    </div>
                  </div>
                </>}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>;
}