import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import northwellLogo from '@/assets/northwell-health-logo.png';
import { DemoTripPredictions } from '@/components/demo/DemoTripPredictions';
import { DemoSuccessRate } from '@/components/demo/DemoSuccessRate';
import { DemoChatbot } from '@/components/demo/DemoChatbot';
import { DemoCrewBrief } from '@/components/demo/DemoCrewBrief';
import { DemoROI } from '@/components/demo/DemoROI';
import { DemoChiefPilot } from '@/components/demo/DemoChiefPilot';
import { DemoLearning } from '@/components/demo/DemoLearning';
import { TripData } from '@/types/trip';
import { trackEvent, setTag } from '@/hooks/use-clarity';
import { useSectionVisibilityMultiple } from '@/hooks/use-section-visibility';

const Demo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('predictions');
  const [initialTripData, setInitialTripData] = useState<TripData | null>(null);
  const [tripData, setTripData] = useState<TripData | null>(null);

  // Section visibility tracking with 700ms animation delay
  const { getRef, resetTracking } = useSectionVisibilityMultiple(
    ['predictions', 'success', 'roi', 'chatbot', 'brief', 'pilot', 'learning'],
    { animationDelay: 700 }
  );

  useEffect(() => {
    const state = location.state as { tripData?: TripData } | null;
    if (state?.tripData) {
      setInitialTripData(state.tripData);
      setTripData(state.tripData);
      // Track that trip data was loaded from calculator
      trackEvent('ai_platform_trip_loaded');
      setTag('trip_origin', state.tripData.originAirport?.code || 'unknown');
      setTag('trip_destination', state.tripData.destAirport?.code || 'unknown');
    }
  }, [location]);

  const handleTripCalculated = (data: TripData) => {
    setTripData(data);
    trackEvent('ai_platform_trip_calculated');
    setTag('trip_origin', data.originAirport?.code || 'unknown');
    setTag('trip_destination', data.destAirport?.code || 'unknown');
  };

  const handleClearTrip = () => {
    setTripData(null);
    setInitialTripData(null);
    trackEvent('ai_platform_trip_cleared');
  };

  // Track tab changes and reset section visibility for new tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    trackEvent(`ai_demo_tab_${value}`);
    setTag('active_demo_tab', value);
    resetTracking(); // Reset visibility tracking for fresh tab content
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={northwellLogo} alt="Northwell Health" className="h-10 md:h-12" />
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-foreground">
                  AI-Powered Dispatch Intelligence Platform
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Advanced organ transplant transportation system
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {tripData && (
                <>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Trip Loaded: {tripData.originAirport?.code} → {tripData.destAirport?.code}
                  </Badge>
                  <Button 
                    onClick={handleClearTrip} 
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    Clear Trip
                  </Button>
                </>
              )}
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Calculator
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6 h-auto gap-2">
              <TabsTrigger value="predictions" className="text-xs md:text-sm">
                Trip AI
              </TabsTrigger>
              <TabsTrigger value="success" className="text-xs md:text-sm">
                Success Rate
              </TabsTrigger>
              <TabsTrigger value="roi" className="text-xs md:text-sm">
                ROI Calculator
              </TabsTrigger>
              <TabsTrigger value="chatbot" className="text-xs md:text-sm">
                Crew Chat
              </TabsTrigger>
              <TabsTrigger value="brief" className="text-xs md:text-sm">
                Auto Brief
              </TabsTrigger>
              <TabsTrigger value="pilot" className="text-xs md:text-sm">
                Chief Pilot
              </TabsTrigger>
              <TabsTrigger value="learning" className="text-xs md:text-sm">
                AI Learning
              </TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="animate-fade-in">
              <div ref={getRef('predictions')}>
                <DemoTripPredictions 
                  initialTripData={initialTripData} 
                  onTripCalculated={handleTripCalculated}
                />
              </div>
            </TabsContent>

            <TabsContent value="success" className="animate-fade-in">
              <div ref={getRef('success')}>
                <DemoSuccessRate tripData={tripData} />
              </div>
            </TabsContent>

            <TabsContent value="roi" className="animate-fade-in">
              <div ref={getRef('roi')}>
                <DemoROI tripData={tripData} />
              </div>
            </TabsContent>

            <TabsContent value="chatbot" className="animate-fade-in">
              <div ref={getRef('chatbot')}>
                <DemoChatbot tripData={tripData} />
              </div>
            </TabsContent>

            <TabsContent value="brief" className="animate-fade-in">
              <div ref={getRef('brief')}>
                <DemoCrewBrief tripData={tripData} />
              </div>
            </TabsContent>

            <TabsContent value="pilot" className="animate-fade-in">
              <div ref={getRef('pilot')}>
                <DemoChiefPilot tripData={tripData} />
              </div>
            </TabsContent>

            <TabsContent value="learning" className="animate-fade-in">
              <div ref={getRef('learning')}>
                <DemoLearning tripData={tripData} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-3">
            <img src={northwellLogo} alt="Northwell Health" className="h-7" />
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} Northwell Health. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Demo;
