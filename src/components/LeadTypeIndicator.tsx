import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Repeat, User, Plane, FileText } from "lucide-react";

interface LeadTypeIndicatorProps {
  customerType: 'new_lead' | 'repeat_customer' | 'active_owner' | 'past_owner';
  purchaseCount?: number;
  lifetimeValue?: number;
}

export const LeadTypeIndicator = ({ 
  customerType, 
  purchaseCount = 0,
  lifetimeValue = 0 
}: LeadTypeIndicatorProps) => {
  const getTypeConfig = () => {
    switch (customerType) {
      case 'new_lead':
        return {
          icon: User,
          label: 'New',
          variant: 'outline' as const,
          className: 'border-muted-foreground/30 text-muted-foreground'
        };
      case 'repeat_customer':
        return {
          icon: Repeat,
          label: purchaseCount > 1 ? `${purchaseCount}x` : 'Repeat',
          variant: 'outline' as const,
          className: 'border-green-500/40 text-green-700 dark:text-green-400'
        };
      case 'active_owner':
        return {
          icon: Plane,
          label: 'Owner',
          variant: 'outline' as const,
          className: 'border-yellow-600/40 text-yellow-700 dark:text-yellow-400'
        };
      case 'past_owner':
        return {
          icon: FileText,
          label: 'Past',
          variant: 'outline' as const,
          className: 'border-muted-foreground/30 text-muted-foreground'
        };
      default:
        return {
          icon: User,
          label: 'Lead',
          variant: 'outline' as const,
          className: 'border-muted-foreground/30 text-muted-foreground'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const getFullLabel = () => {
    switch (customerType) {
      case 'new_lead': return 'New Lead';
      case 'repeat_customer': return `Repeat Customer${purchaseCount > 1 ? ` (${purchaseCount}x)` : ''}`;
      case 'active_owner': return 'Active Owner';
      case 'past_owner': return 'Past Owner';
      default: return 'Lead';
    }
  };

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">{getFullLabel()}</div>
      {purchaseCount > 0 && (
        <div className="text-xs">Previous Purchases: {purchaseCount}</div>
      )}
      {lifetimeValue > 0 && (
        <div className="text-xs">
          Lifetime Value: ${lifetimeValue.toLocaleString()}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={`gap-1 ${config.className}`}
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
