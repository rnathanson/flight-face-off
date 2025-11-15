import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const generateSlug = (name: string): string => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now().toString(36);
    return `${base}-${timestamp}`;
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const estimateData: any = {
        customer_name: customerName,
        customer_email: customerEmail || null,
        notes: notes || null,
        status,
        inputs_locked: inputsLocked,
        unique_slug: estimate?.unique_slug || generateSlug(customerName),
        aircraft_cost: 0,
        down_payment_percent: 0,
        interest_rate: 0,
        loan_term_years: 0,
        owner_hours: 0,
        rental_hours: 0,
        pilot_services_hours: 0,
        maintenance_per_hour: 0,
        insurance_annual: 0,
        management_fee: 0,
        subscriptions: 0,
        tci_training: 0,
        rental_revenue_rate: 0,
        owner_usage_rate: 0,
        pilot_services_rate: 0,
        hangar_cost: 0,
        tiedown_cost: 0,
        parking_type: 'tiedown',
        is_non_pilot: false,
        ownership_share: 100,
        allow_share_selection: false,
      };

      if (estimate) {
        const { error } = await supabase.functions.invoke('save-custom-estimate', {
          body: { ...estimateData, id: estimate.id }
        });
        if (error) throw error;
        toast({ title: "Success", description: "Estimate updated successfully" });
      } else {
        const { error } = await supabase.functions.invoke('save-custom-estimate', {
          body: estimateData
        });
        if (error) throw error;
        toast({ title: "Success", description: "Estimate created successfully" });
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error saving estimate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save estimate",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estimate Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customer-name">Customer Name *</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <Label htmlFor="customer-email">Customer Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="inputs-locked"
              checked={inputsLocked}
              onCheckedChange={(checked) => setInputsLocked(checked as boolean)}
            />
            <Label htmlFor="inputs-locked">Lock inputs (read-only for customer)</Label>
          </div>

          <div>
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : estimate ? "Update" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
