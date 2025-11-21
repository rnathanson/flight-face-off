import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check } from "lucide-react";
import { z } from "zod";

const estimateInputSchema = z.object({
  customer_name: z.string()
    .trim()
    .min(1, "Customer name is required")
    .max(100, "Customer name must be less than 100 characters"),
  customer_email: z.string()
    .trim()
    .max(255, "Email must be less than 255 characters")
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

interface SaveEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculatorValues: {
    aircraftType: 'SR20' | 'SR22' | 'PC24' | 'OwnersFleet';
    ownershipShare: 1 | 0.5 | 0.333 | 0.25;
    aircraftCost: number;
    downPaymentPercent: number;
    interestRate: number;
    loanTermYears: number;
    ownerHours: number;
    rentalHours: number;
    pilotServicesHours: number;
    isNonPilot: boolean;
    parkingType: 'tiedown' | 'hangar';
    insuranceAnnual: number;
    managementFee: number;
    subscriptions: number;
    tciTraining: number;
    maintenancePerHour: number;
    tiedownCost: number;
    hangarCost: number;
    rentalRevenueRate: number;
    ownerUsageRate: number;
    pilotServicesRate: number;
    // PC24-specific fields
    cleaningMonthly?: number;
    pilotServicesAnnual?: number;
    jetstreamHourly?: number;
    jetstreamPackage?: '2yr-300hrs' | '3yr-450hrs' | '3yr-600hrs';
    fuelBurnPerHour?: number;
    fuelPricePerGallon?: number;
    pilotServicesHourly?: number;
    pilotPoolContribution?: number;
    pc24OwnerFlown?: boolean;
    aircraftCostBase?: number;
    includeJetstreamReserve?: boolean;
  };
  ownersFleetHours?: { sr22HoursMonth: number; pc24HoursMonth: number; sr22PilotServicesHours: number };
}

export function SaveEstimateDialog({ open, onOpenChange, calculatorValues, ownersFleetHours }: SaveEstimateDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateSlug = (name: string): string => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const randomId = crypto.randomUUID().split('-')[0];
    const timestamp = Date.now().toString(36);
    return `${base}-${timestamp}-${randomId}`;
  };

  // Ensure all numeric fields are valid numbers before saving
  const n = (val: unknown, fallback = 0) => {
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return Number.isFinite(num) ? (num as number) : fallback;
  };

  // For integer fields, ensure they are whole numbers
  const nInt = (val: unknown, fallback = 0) => {
    const num = n(val, fallback);
    return Math.round(num);
  };


  const handleSave = async () => {
    // Validate input
    const validationResult = estimateInputSchema.safeParse({
      customer_name: customerName,
      customer_email: customerEmail || "",
      notes: notes || "",
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const slug = generateSlug(customerName);
      
      const basePayload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail ? customerEmail.trim() : null,
        notes: notes ? notes.trim() : null,
        unique_slug: slug,
        status: 'draft',
        aircraft_type: calculatorValues.aircraftType,
        ownership_share: n(calculatorValues.ownershipShare, 1),
        aircraft_cost: n(calculatorValues.aircraftCost),
        down_payment_percent: n(calculatorValues.downPaymentPercent, 100),
        interest_rate: n(calculatorValues.interestRate),
        loan_term_years: nInt(calculatorValues.loanTermYears),
        owner_hours: nInt(calculatorValues.ownerHours, 0),
        rental_hours: (calculatorValues.aircraftType === 'PC24' || calculatorValues.aircraftType === 'OwnersFleet')
          ? 0
          : nInt(calculatorValues.rentalHours, 0),
        pilot_services_hours: nInt(calculatorValues.pilotServicesHours, 0),
        is_non_pilot: Boolean(calculatorValues.isNonPilot),
        parking_type: calculatorValues.parkingType || 'hangar',
        insurance_annual: n(calculatorValues.insuranceAnnual),
        management_fee: n(calculatorValues.managementFee),
        subscriptions: n(calculatorValues.subscriptions),
        tci_training: n(calculatorValues.tciTraining),
        maintenance_per_hour: n(calculatorValues.maintenancePerHour),
        tiedown_cost: n(calculatorValues.tiedownCost),
        hangar_cost: n(calculatorValues.hangarCost),
        rental_revenue_rate: n(calculatorValues.rentalRevenueRate, 0),
        owner_usage_rate: n(calculatorValues.ownerUsageRate, 0),
        pilot_services_rate: n(calculatorValues.pilotServicesRate, 0),
        // PC24-specific / Owner's Fleet fields
        cleaning_monthly: n(calculatorValues.cleaningMonthly, 0),
        pilot_services_annual: n(calculatorValues.pilotServicesAnnual, 0),
        jetstream_hourly: n(calculatorValues.jetstreamHourly, 0),
        jetstream_package: calculatorValues.jetstreamPackage || '2yr-300hrs',
        fuel_burn_per_hour: n(calculatorValues.fuelBurnPerHour, 80),
        fuel_price_per_gallon: n(calculatorValues.fuelPricePerGallon, 6.5),
        pilot_services_hourly: n(calculatorValues.pilotServicesHourly, 200),
        pilot_pool_contribution: n(calculatorValues.pilotPoolContribution, 25000),
        pc24_owner_flown: Boolean(calculatorValues.pc24OwnerFlown ?? false),
        aircraft_cost_base: n(calculatorValues.aircraftCostBase, 3500000),
        include_jetstream_reserve: Boolean(calculatorValues.includeJetstreamReserve ?? false),
      };

      // Add Owner's Fleet dual hours if applicable
      const payload = calculatorValues.aircraftType === 'OwnersFleet' && ownersFleetHours
        ? {
            ...basePayload,
            ownersfleet_sr22_hours: nInt(ownersFleetHours.sr22HoursMonth, 0),
            ownersfleet_pc24_hours: nInt(ownersFleetHours.pc24HoursMonth, 0),
            ownersfleet_sr22_pilot_services_hours: nInt(ownersFleetHours.sr22PilotServicesHours, 0),
          }
        : basePayload;
      
      const { error } = await supabase
        .from('custom_ownership_estimates')
        .insert([payload]);

      if (error) throw error;

      const url = `${window.location.origin}/estimate/${slug}`;
      setGeneratedUrl(url);

      toast({
        title: "Success",
        description: "Ownership estimate saved successfully",
      });
    } catch (error) {
      console.error('Error saving estimate:', error);
      const message = (error as any)?.message || 'Failed to save ownership estimate';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const handleClose = () => {
    setCustomerName("");
    setCustomerEmail("");
    setNotes("");
    setGeneratedUrl("");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Save Ownership Estimate</DialogTitle>
          <DialogDescription>
            {generatedUrl 
              ? "Your estimate has been saved. Share this link with your customer."
              : "Create a shareable link for this ownership estimate"}
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Customer Email (optional)</Label>
              <Input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal notes about this estimate..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Generating..." : "Generate Link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Shareable URL</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={copyUrl}>
                {copied ? "Copied!" : "Copy URL"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
