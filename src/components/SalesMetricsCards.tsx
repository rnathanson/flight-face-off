import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap } from 'lucide-react';

interface MetricsCardsProps {
  metrics: any;
}

export function SalesMetricsCards({ metrics }: MetricsCardsProps) {
  const metricsData = [
    {
      label: 'Total Pipeline Value',
      value: `$${((metrics?.total_pipeline_value || 12400000) / 1000000).toFixed(1)}M`,
      change: '+18%',
      trending: 'up' as const,
      icon: DollarSign,
    },
    {
      label: 'Quota Attainment',
      value: `${metrics?.quota_attainment || 127}%`,
      change: '+27%',
      trending: 'up' as const,
      icon: Target,
    },
    {
      label: 'Conversion Rate',
      value: `${metrics?.conversion_rate || 34}%`,
      change: '+12%',
      trending: 'up' as const,
      icon: Users,
    },
    {
      label: 'Avg. Days to Close',
      value: `${metrics?.avg_days_to_close || 47}`,
      change: '-15 days',
      trending: 'up' as const,
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {metric.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {metric.label}
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent className={`flex items-center gap-1 ${
                metric.trending === 'up' ? 'text-success' : 'text-warning'
              }`}>
                {metric.trending === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">{metric.change}</span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}