import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesMetricsCards } from './SalesMetricsCards';
import { SalesLeadTable } from './SalesLeadTable';
import { AIRecommendations } from './AIRecommendations';
import { SalesLLMChat } from './SalesLLMChat';
import { QuotaGauge } from './QuotaGauge';
import { ConversionFunnel } from './ConversionFunnel';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

export function SalesAnalyticsDashboard() {
  // Mock data for demo purposes
  const metrics = {
    metric_date: new Date().toISOString().split('T')[0],
    total_pipeline_value: 12400000,
    total_leads: 87,
    qualified_leads: 52,
    active_opportunities: 34,
    conversion_rate: 34,
    avg_days_to_close: 47,
    win_rate: 52,
    ai_recommendation_success_rate: 78,
    avg_response_time_hours: 4,
    monthly_quota: 4800000,
    quota_attainment: 127
  };

  const loading = false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Button */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Integration Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Email Sync Active (Gmail/Outlook)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Phone System Connected (RingCentral)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>CRM Integration (Salesforce)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Calendar Sync Active</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>AI Processing Pipeline Active</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hero Metrics */}
      <SalesMetricsCards metrics={metrics} />

      {/* Quota and Funnel Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuotaGauge 
          current={metrics?.quota_attainment || 0} 
          target={100}
        />
        <ConversionFunnel />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="llm-coach">Sales Coach</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <SalesLeadTable />
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <AIRecommendations />
        </TabsContent>

        <TabsContent value="llm-coach" className="space-y-6">
          <Card className="p-6">
            <SalesLLMChat />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}