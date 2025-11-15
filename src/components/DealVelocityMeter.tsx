import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface DealVelocityMeterProps {
  currentDays: number;
  averageDays: number;
  personaType: string;
  milestones?: {
    demoScheduled?: boolean;
    daysToDemo?: number;
    avgDaysToDemo?: number;
  };
}

export const DealVelocityMeter = ({ 
  currentDays, 
  averageDays, 
  personaType,
  milestones 
}: DealVelocityMeterProps) => {
  const velocityPercent = ((averageDays - currentDays) / averageDays) * 100;
  const isFaster = currentDays < averageDays;
  const isSlower = currentDays > averageDays;
  
  const getVelocityStatus = () => {
    if (Math.abs(velocityPercent) < 10) return { label: 'On Pace', color: 'text-muted-foreground', icon: Minus };
    if (isFaster) return { label: 'Fast Track', color: 'text-green-600 dark:text-green-400', icon: ArrowUp };
    return { label: 'Slow', color: 'text-orange-600 dark:text-orange-400', icon: ArrowDown };
  };

  const status = getVelocityStatus();
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Deal Velocity
          <Badge variant="outline" className={`gap-1 ${status.color}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="text-2xl font-semibold">{currentDays}</div>
            <div className="text-xs text-muted-foreground">days in pipeline</div>
          </div>
          <div className="text-right">
            <div className="text-lg text-muted-foreground">{averageDays}</div>
            <div className="text-xs text-muted-foreground">avg for {personaType}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full transition-all ${
              isFaster ? 'bg-green-500' : isSlower ? 'bg-orange-500' : 'bg-muted-foreground'
            }`}
            style={{ width: `${Math.min((currentDays / averageDays) * 100, 100)}%` }}
          />
        </div>

        {milestones?.demoScheduled && milestones.daysToDemo !== undefined && milestones.avgDaysToDemo !== undefined && (
          <div className="pt-2 border-t text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Demo scheduled</span>
              <span className={milestones.daysToDemo < milestones.avgDaysToDemo ? 'text-green-600 dark:text-green-400' : ''}>
                {milestones.daysToDemo}d (avg {milestones.avgDaysToDemo}d)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
