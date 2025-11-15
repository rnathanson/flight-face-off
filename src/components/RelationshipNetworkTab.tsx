import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Building2, Heart, UserPlus, Plane } from "lucide-react";

interface Relationship {
  id: string;
  related_customer: {
    id: string;
    full_name: string;
    customer_type: string;
    aircraft_interest: string[];
  };
  relationship_type: string;
  relationship_strength: number;
  ctc_location?: string;
  discovered_method?: string;
  notes?: string;
}

interface RelationshipNetworkTabProps {
  relationships: Relationship[];
  onNavigateToLead: (leadId: string) => void;
}

export const RelationshipNetworkTab = ({ 
  relationships, 
  onNavigateToLead 
}: RelationshipNetworkTabProps) => {
  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'friend':
        return Heart;
      case 'business_partner':
        return Building2;
      case 'same_ctc':
        return Plane;
      case 'referral':
        return UserPlus;
      default:
        return Users;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'friend':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'business_partner':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'family':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'same_ctc':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'referral':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength > 75) return 'bg-green-600';
    if (strength > 50) return 'bg-yellow-600';
    return 'bg-orange-600';
  };

  if (relationships.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          No relationships found yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {relationships.map((rel) => {
        const Icon = getRelationshipIcon(rel.relationship_type);
        return (
          <Card
            key={rel.id}
            className="p-4 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onNavigateToLead(rel.related_customer.id)}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold">{rel.related_customer.full_name}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant="outline" 
                      className={getRelationshipColor(rel.relationship_type)}
                    >
                      {rel.relationship_type.replace('_', ' ')}
                    </Badge>
                    {rel.ctc_location && (
                      <Badge variant="secondary" className="text-xs">
                        {rel.ctc_location}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Strength</div>
                  <div className="text-lg font-bold">{rel.relationship_strength}%</div>
                </div>
              </div>

              {/* Strength Bar */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Strength:</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${getStrengthColor(rel.relationship_strength)}`}
                    style={{ width: `${rel.relationship_strength}%` }}
                  />
                </div>
              </div>

              {/* Aircraft Interest */}
              {rel.related_customer.aircraft_interest?.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Aircraft Interest:</div>
                  <div className="flex gap-1 flex-wrap">
                    {rel.related_customer.aircraft_interest.map((aircraft, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {aircraft}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Discovery Method */}
              {rel.discovered_method && (
                <div className="text-xs text-muted-foreground">
                  Discovered via: {rel.discovered_method.replace('_', ' ')}
                </div>
              )}

              {/* Notes */}
              {rel.notes && (
                <p className="text-sm text-muted-foreground pt-2 border-t">
                  {rel.notes}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
