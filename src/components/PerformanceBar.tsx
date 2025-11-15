interface PerformanceBarProps {
  label: string;
  sr22Value: number;
  jetValue: number;
  unit: string;
  lowerIsBetter?: boolean;
}

export function PerformanceBar({ label, sr22Value, jetValue, unit, lowerIsBetter = false }: PerformanceBarProps) {
  const maxValue = Math.max(sr22Value, jetValue);
  const sr22Percent = (sr22Value / maxValue) * 100;
  const jetPercent = (jetValue / maxValue) * 100;
  
  const sr22Better = lowerIsBetter ? sr22Value < jetValue : sr22Value > jetValue;
  const jetBetter = lowerIsBetter ? jetValue < sr22Value : jetValue > sr22Value;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      
      <div className="space-y-2">
        {/* SR22 Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-sr22">SR22</span>
            <span className="text-xs font-bold">{sr22Value} {unit}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-sr22 rounded-full animate-progress origin-left ${sr22Better ? 'opacity-100' : 'opacity-50'}`}
              style={{ width: `${sr22Percent}%` }}
            />
          </div>
        </div>

        {/* Jet Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-jet">Vision Jet</span>
            <span className="text-xs font-bold">{jetValue} {unit}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-jet rounded-full animate-progress origin-left ${jetBetter ? 'opacity-100' : 'opacity-50'}`}
              style={{ width: `${jetPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
