import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface LoadingModalProps {
  calculating: boolean;
  loadingStage: string;
}

export function LoadingModal({ calculating, loadingStage }: LoadingModalProps) {
  return (
    <Dialog open={calculating}>
      <DialogContent className="sm:max-w-md"  onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">Calculating Your Trip</h3>
            <p className="text-sm text-muted-foreground">{loadingStage || 'Please wait...'}</p>
          </div>
          <Progress value={undefined} className="w-full" />
          <p className="text-xs text-muted-foreground">
            Analyzing weather, traffic, and optimal routing...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
