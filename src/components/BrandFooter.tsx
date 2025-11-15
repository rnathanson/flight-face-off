import nassauFlyersLogo from '@/assets/nassau-flyers-logo.webp';
import cirrusLogo from '@/assets/cirrus-international-logo.png';

export function BrandFooter() {
  return (
    <footer className="mt-12 bg-card border-t border-border shadow-sm print:shadow-none">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <img 
              src={nassauFlyersLogo} 
              alt="Nassau Flyers" 
              className="h-8"
            />
            <div className="hidden md:block h-8 w-px bg-border" />
            <img 
              src={cirrusLogo} 
              alt="Cirrus Authorized International" 
              className="h-7"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Prepared by Nassau Flyers | Cirrus Platinum Training & Service Center
          </p>
        </div>
      </div>
    </footer>
  );
}
