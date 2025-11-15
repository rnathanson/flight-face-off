import nassauFlyersLogo from '@/assets/nassau-flyers-logo.webp';
import cirrusLogo from '@/assets/cirrus-international-logo.png';

interface BrandHeaderProps {
  customerName?: string;
}

export function BrandHeader({ customerName }: BrandHeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
          <img 
            src={nassauFlyersLogo} 
            alt="Nassau Flyers" 
            className="h-8 md:h-10"
          />
          
          {customerName && (
            <h1 className="text-lg md:text-3xl font-bold text-foreground text-center md:absolute md:left-1/2 md:-translate-x-1/2">
              {customerName}
            </h1>
          )}
          
          <img 
            src={cirrusLogo} 
            alt="Cirrus Authorized International" 
            className="h-7 md:h-9"
          />
        </div>
      </div>
    </header>
  );
}
