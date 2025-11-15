import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users } from 'lucide-react';
import { PartnershipInterestForm } from '@/components/PartnershipInterestForm';

export function PartnershipCTA({ variant = 'header' }: { variant?: 'header' | 'inline' }) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset form by changing key when dialog opens
      setDialogKey(prev => prev + 1);
    }
  };

  if (variant === 'inline') {
    return (
      <>
        <div className="flex items-center justify-center py-4 border-t border-border/50 mt-6">
          <Button
            onClick={() => handleOpenChange(true)}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            <Users className="mr-2 h-4 w-4" />
            Interested in ownership or partnership?
          </Button>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Express Your Interest</DialogTitle>
            </DialogHeader>
            <PartnershipInterestForm key={dialogKey} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        size="sm"
        className="bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
      >
        <Users className="mr-2 h-4 w-4" />
        <span className="hidden md:inline">I'm Interested</span>
        <span className="md:hidden">Interest</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Express Your Interest</DialogTitle>
          </DialogHeader>
          <PartnershipInterestForm key={dialogKey} />
        </DialogContent>
      </Dialog>
    </>
  );
}
