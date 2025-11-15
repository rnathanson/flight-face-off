import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type CustomOwnershipEstimate = Database['public']['Tables']['custom_ownership_estimates']['Row'];

interface EstimateFormProps {
  estimate: CustomOwnershipEstimate | null;
  onClose: () => void;
}

export function EstimateForm({ estimate, onClose }: EstimateFormProps) {
  const { toast } = useToast();
  
  // Customer Details
  const [customerName, setCustomerName] = useState(estimate?.customer_name || '');
  const [customerEmail, setCustomerEmail] = useState(estimate?.customer_email || '');
  const [notes, setNotes] = useState(estimate?.notes || '');
  const [status, setStatus] = useState(estimate?.status || 'draft');
  const [inputsLocked, setInputsLocked] = useState(estimate?.inputs_locked || false);

  // Backend Costs (Admin-only editable)
  const [insuranceAnnual, setInsuranceAnnual] = useState(estimate?.insurance_annual || 0);
  const [managementFee, setManagementFee] = useState(estimate?.management_fee || 0);
  const [subscriptions, setSubscriptions] = useState(estimate?.subscriptions || 0);
  const [tciTraining, setTciTraining] = useState(estimate?.tci_training || 0);
  const [maintenancePerHour, setMaintenancePerHour] = useState(estimate?.maintenance_per_hour || 0);
  const [hangarCost, setHangarCost] = useState(estimate?.hangar_cost || 0);
  const [tiedownCost, setTiedownCost] = useState(estimate?.tiedown_cost || 0);

  const handleSave = async () => {
    if (!estimate) return;

    try {
      const { error } = await supabase
        .from('custom_ownership_estimates')
        .update({
          customer_name: customerName,
          customer_email: customerEmail || null,
          notes: notes || null,
          status,
          inputs_locked: inputsLocked,
          insurance_annual: insuranceAnnual,
          management_fee: managementFee,
          subscriptions,
          tci_training: tciTraining,
          maintenance_per_hour: maintenancePerHour,
          hangar_cost: hangarCost,
          tiedown_cost: tiedownCost,
        })
        .eq('id', estimate.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Estimate updated successfully',
      });

      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update estimate',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inputsLocked"
              checked={inputsLocked}
              onCheckedChange={(checked) => setInputsLocked(checked as boolean)}
            />
            <label
              htmlFor="inputsLocked"
              className="text-sm font-medium cursor-pointer"
            >
              Lock inputs for customer (make calculator read-only)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Backend Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Backend Costs (Admin Only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insuranceAnnual">Insurance Annual ($)</Label>
              <Input
                id="insuranceAnnual"
                type="number"
                value={insuranceAnnual}
                onChange={(e) => setInsuranceAnnual(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managementFee">Management Fee ($)</Label>
              <Input
                id="managementFee"
                type="number"
                value={managementFee}
                onChange={(e) => setManagementFee(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptions">Subscriptions ($)</Label>
              <Input
                id="subscriptions"
                type="number"
                value={subscriptions}
                onChange={(e) => setSubscriptions(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tciTraining">TCI Training ($)</Label>
              <Input
                id="tciTraining"
                type="number"
                value={tciTraining}
                onChange={(e) => setTciTraining(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenancePerHour">Maintenance/hr ($)</Label>
              <Input
                id="maintenancePerHour"
                type="number"
                value={maintenancePerHour}
                onChange={(e) => setMaintenancePerHour(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hangarCost">Hangar Cost ($)</Label>
              <Input
                id="hangarCost"
                type="number"
                value={hangarCost}
                onChange={(e) => setHangarCost(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiedownCost">Tiedown Cost ($)</Label>
              <Input
                id="tiedownCost"
                type="number"
                value={tiedownCost}
                onChange={(e) => setTiedownCost(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Update Estimate
        </Button>
      </div>
    </div>
  );
}
