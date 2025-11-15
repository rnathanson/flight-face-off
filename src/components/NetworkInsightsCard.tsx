import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lightbulb, Target, TrendingUp, Users } from "lucide-react";

interface NetworkInsight {
  type: 'network_effect' | 'social_proof' | 'influencer' | 'caution' | 'pattern';
  priority: 'high' | 'medium' | 'low';
  message: string;
}

interface NetworkInsightsCardProps {
  insights: NetworkInsight[];
}

export const NetworkInsightsCard = ({ insights }: NetworkInsightsCardProps) => {
  const getInsightIcon = (type: NetworkInsight['type']) => {
    switch (type) {
      case 'network_effect':
        return Users;
      case 'social_proof':
        return Lightbulb;
      case 'influencer':
        return Target;
      case 'caution':
        return AlertTriangle;
      case 'pattern':
        return TrendingUp;
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (priority: NetworkInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500/80';
      case 'medium':
        return 'text-orange-500/80';
      case 'low':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBorderColor = (priority: NetworkInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-400';
      case 'medium':
        return 'border-l-orange-400';
      case 'low':
        return 'border-l-border';
      default:
        return 'border-l-border';
    }
  };

  const getPriorityBadge = (priority: NetworkInsight['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="outline" className="border-red-400/50 text-red-600 dark:text-red-400 text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-orange-400/50 text-orange-600 dark:text-orange-400 text-xs">Medium</Badge>;
      case 'low':
        return null;
      default:
        return null;
    }
  };

  if (insights.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          No network insights available yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((insight, index) => {
        const Icon = getInsightIcon(insight.type);
        return (
          <Card 
            key={index} 
            className={`p-3 border-l-2 ${getBorderColor(insight.priority)}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`h-4 w-4 mt-0.5 ${getInsightColor(insight.priority)}`} />
              <div className="flex-1 space-y-1">
                <p className="text-sm text-foreground">{insight.message}</p>
                {getPriorityBadge(insight.priority)}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
