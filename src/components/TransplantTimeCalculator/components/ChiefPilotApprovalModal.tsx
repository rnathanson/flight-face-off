import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { ChiefPilotApproval } from '../types';

interface ChiefPilotApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chiefPilotApproval?: ChiefPilotApproval;
}

export function ChiefPilotApprovalModal({ 
  open, 
  onOpenChange, 
  chiefPilotApproval 
}: ChiefPilotApprovalModalProps) {
  if (!chiefPilotApproval) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Chief Pilot Airport Approval
          </DialogTitle>
          <DialogDescription>
            The selected airports have been approved based on operational requirements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Pickup Airport */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Pickup Airport</h3>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {chiefPilotApproval.pickup_airport.code}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {chiefPilotApproval.pickup_airport.name}
            </p>
            <div className="space-y-2">
              {chiefPilotApproval.pickup_airport.reasons.map((reason, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{reason.reason}</div>
                    <div className="text-muted-foreground">{reason.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destination Airport */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Destination Airport</h3>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {chiefPilotApproval.destination_airport.code}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {chiefPilotApproval.destination_airport.name}
            </p>
            <div className="space-y-2">
              {chiefPilotApproval.destination_airport.reasons.map((reason, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{reason.reason}</div>
                    <div className="text-muted-foreground">{reason.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rejected Airports */}
          {chiefPilotApproval.rejected_airports && chiefPilotApproval.rejected_airports.length > 0 && (
            <div className="border border-orange-200 rounded-lg p-4 space-y-3 bg-orange-50 dark:bg-orange-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-lg">Rejected Airports</h3>
              </div>
              <div className="space-y-2">
                {chiefPilotApproval.rejected_airports.map((airport, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <div className="font-mono text-xs bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                      {airport.code}
                    </div>
                    <div>
                      <div className="font-medium">{airport.name}</div>
                      <div className="text-muted-foreground">{airport.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
