import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
interface SF50ConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrice?: number;
  onSave: (totalPrice: number) => void;
}
export const SF50ConfigurationDialog = ({
  open,
  onOpenChange,
  initialPrice = 3500000,
  onSave
}: SF50ConfigurationDialogProps) => {
  const basePrice = 3500000;
  const [xiPersonalization, setXiPersonalization] = useState(false);
  const [completeSeats, setCompleteSeats] = useState(true);
  const [reliefStation, setReliefStation] = useState(false);

  // Calculate total price
  const calculateTotal = () => {
    let total = basePrice;
    if (xiPersonalization) total += 100000;
    if (completeSeats) total += 19900;
    if (reliefStation) total += 19900;
    return total;
  };
  const totalPrice = calculateTotal();

  // Initialize selections based on initial price
  useEffect(() => {
    if (initialPrice && open) {
      // Reverse engineer the selections from the price
      const difference = initialPrice - basePrice;
      if (difference === 0) {
        setXiPersonalization(false);
        setCompleteSeats(false);
        setReliefStation(false);
      } else if (difference === 19900) {
        setXiPersonalization(false);
        setCompleteSeats(true);
        setReliefStation(false);
      } else if (difference === 100000) {
        setXiPersonalization(true);
        setCompleteSeats(false);
        setReliefStation(false);
      } else if (difference === 119900) {
        setXiPersonalization(true);
        setCompleteSeats(true);
        setReliefStation(false);
      } else if (difference === 39800) {
        setXiPersonalization(false);
        setCompleteSeats(true);
        setReliefStation(true);
      } else if (difference === 139800) {
        setXiPersonalization(true);
        setCompleteSeats(true);
        setReliefStation(true);
      }
    }
  }, [initialPrice, open]);
  const handleSave = () => {
    onSave(totalPrice);
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>2025 Cirrus SF50 G2+ Configuration</DialogTitle>
          <DialogDescription>
            Arrivee with Elite Equipment Packaging and Pricing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Base Package */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-semibold">SF50 G2+ Arrivee with Elite Equipment Package</p>
                
              </div>
              <div className="text-right">
                <p className="font-bold">${basePrice.toLocaleString()}</p>
                
              </div>
            </div>
          </div>

          {/* Aesthetics Package */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Aesthetics Package</h3>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Checkbox id="xi-personalization" checked={xiPersonalization} onCheckedChange={checked => setXiPersonalization(checked as boolean)} />
                <Label htmlFor="xi-personalization" className="cursor-pointer">
                  Xi Personalization Package
                </Label>
              </div>
              <p className="font-semibold">${100000 .toLocaleString()}</p>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Additional Options</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox id="complete-seats" checked={completeSeats} onCheckedChange={checked => setCompleteSeats(checked as boolean)} />
                  <Label htmlFor="complete-seats" className="cursor-pointer">
                    Complete Seats
                  </Label>
                </div>
                <p className="font-semibold">${19900 .toLocaleString()}</p>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox id="relief-station" checked={reliefStation} onCheckedChange={checked => setReliefStation(checked as boolean)} />
                  <Label htmlFor="relief-station" className="cursor-pointer">
                    Relief Station
                  </Label>
                </div>
                <p className="font-semibold">${19900 .toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Configured Price */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary">
            <p className="font-bold text-lg">Configured Aircraft Price</p>
            <p className="font-bold text-2xl">${totalPrice.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};