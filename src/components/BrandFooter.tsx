import northwellLogo from '@/assets/northwell-health-logo.png';

export function BrandFooter() {
  return (
    <footer className="mt-12 bg-card border-b border-border shadow-sm print:shadow-none">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <img 
            src={northwellLogo} 
            alt="Northwell Health" 
            className="h-8"
          />
          <p className="text-sm text-muted-foreground text-center">
            Northwell Health Heart Transplant Transportation Calculator
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Northwell Health. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
