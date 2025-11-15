import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle, Package, Wrench, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface PurchaseHistory {
  id: string;
  purchase_date: string;
  delivery_date?: string;
  aircraft_type: string;
  aircraft_tail_number?: string;
  order_value: number;
  configuration_changes_count: number;
  configuration_changes_details?: string[];
  delivery_delay_days: number;
  post_sale_support_tickets: number;
  post_sale_satisfaction_score?: number;
  finicky_score: number;
  notes?: string;
  status: string;
}

interface PurchaseHistoryTimelineProps {
  history: PurchaseHistory[];
}

export const PurchaseHistoryTimeline = ({ history }: PurchaseHistoryTimelineProps) => {
  const getFinickyBadge = (score: number) => {
    if (score <= 25) {
      return <Badge className="bg-green-600 text-white">Easy Customer</Badge>;
    } else if (score <= 50) {
      return <Badge className="bg-yellow-600 text-white">Normal</Badge>;
    } else if (score <= 75) {
      return <Badge className="bg-orange-600 text-white">High Maintenance</Badge>;
    }
    return <Badge className="bg-red-600 text-white">Very Finicky</Badge>;
  };

  return (
    <div className="space-y-4">
      {history.map((purchase, index) => (
        <Card key={purchase.id} className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{purchase.aircraft_type}</h4>
                  {purchase.aircraft_tail_number && (
                    <Badge variant="outline">{purchase.aircraft_tail_number}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Order #{index + 1} • ${purchase.order_value.toLocaleString()}
                </p>
              </div>
              {getFinickyBadge(purchase.finicky_score)}
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ordered:</span>
                <span className="font-medium">
                  {format(new Date(purchase.purchase_date), 'MMM d, yyyy')}
                </span>
              </div>
              {purchase.delivery_date && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Delivered:</span>
                    <span className="font-medium">
                      {format(new Date(purchase.delivery_date), 'MMM d, yyyy')}
                    </span>
                    {purchase.delivery_delay_days > 30 && (
                      <Badge variant="destructive" className="text-xs">
                        +{purchase.delivery_delay_days} days late
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Config Changes</div>
                  <div className={`font-semibold ${
                    purchase.configuration_changes_count > 5 ? 'text-red-600' :
                    purchase.configuration_changes_count > 3 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {purchase.configuration_changes_count}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Support Tickets</div>
                  <div className={`font-semibold ${
                    purchase.post_sale_support_tickets > 10 ? 'text-red-600' :
                    purchase.post_sale_support_tickets > 5 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {purchase.post_sale_support_tickets}
                  </div>
                </div>
              </div>

              {purchase.post_sale_satisfaction_score && (
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Satisfaction</div>
                    <div className={`font-semibold ${
                      purchase.post_sale_satisfaction_score >= 8 ? 'text-green-600' :
                      purchase.post_sale_satisfaction_score >= 6 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {purchase.post_sale_satisfaction_score}/10
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {purchase.notes && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <p className="text-muted-foreground">{purchase.notes}</p>
                </div>
              </div>
            )}

            {/* Configuration Changes Details */}
            {purchase.configuration_changes_details && purchase.configuration_changes_details.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Configuration Changes:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {purchase.configuration_changes_details.map((change, i) => (
                    <li key={i}>• {change}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
