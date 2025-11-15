import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import northwellLogo from '@/assets/northwell-health-logo.png';
import { DemoTripPredictions } from '@/components/demo/DemoTripPredictions';
import { DemoSuccessRate } from '@/components/demo/DemoSuccessRate';
import { DemoChatbot } from '@/components/demo/DemoChatbot';
import { DemoCrewBrief } from '@/components/demo/DemoCrewBrief';
import { DemoROI } from '@/components/demo/DemoROI';
import { DemoChiefPilot } from '@/components/demo/DemoChiefPilot';
import { DemoLearning } from '@/components/demo/DemoLearning';

const Demo = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('predictions');

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

            <Button 
              onClick={() => navigate('/')} 
              variant="ghost"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Basic Calculator
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6 h-auto gap-2">
              <TabsTrigger value="predictions" className="text-xs md:text-sm">
                Trip AI
              </TabsTrigger>
              <TabsTrigger value="success" className="text-xs md:text-sm">
                Success Rate
              </TabsTrigger>
              <TabsTrigger value="chatbot" className="text-xs md:text-sm">
                Crew Chat
              </TabsTrigger>
              <TabsTrigger value="brief" className="text-xs md:text-sm">
                Auto Brief
              </TabsTrigger>
              <TabsTrigger value="roi" className="text-xs md:text-sm">
                ROI Calculator
              </TabsTrigger>
              <TabsTrigger value="pilot" className="text-xs md:text-sm">
                Chief Pilot
              </TabsTrigger>
              <TabsTrigger value="learning" className="text-xs md:text-sm">
                AI Learning
              </TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="animate-fade-in">
              <DemoTripPredictions />
            </TabsContent>

            <TabsContent value="success" className="animate-fade-in">
              <DemoSuccessRate />
            </TabsContent>

            <TabsContent value="chatbot" className="animate-fade-in">
              <DemoChatbot />
            </TabsContent>

            <TabsContent value="brief" className="animate-fade-in">
              <DemoCrewBrief />
            </TabsContent>

            <TabsContent value="roi" className="animate-fade-in">
              <DemoROI />
            </TabsContent>

            <TabsContent value="pilot" className="animate-fade-in">
              <DemoChiefPilot />
            </TabsContent>

            <TabsContent value="learning" className="animate-fade-in">
              <DemoLearning />
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
