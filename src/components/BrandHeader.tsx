import northwellLogo from '@/assets/northwell-health-logo.png';

interface BrandHeaderProps {
  title?: string;
}

export function BrandHeader({ title }: BrandHeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5">
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-4">
          <img 
            src={northwellLogo} 
            alt="Northwell Health" 
            className="h-10 md:h-12"
          />
          
          {title && (
            <h1 className="text-xl md:text-2xl font-semibold text-foreground text-center">
              {title}
            </h1>
          )}
        </div>
      </div>
    </header>
  );
}
