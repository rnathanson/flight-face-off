import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, LogOut, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TransplantTimeCalculator } from '@/components/TransplantTimeCalculator';
import northwellLogo from '@/assets/northwell-health-logo.png';
import { trackEvent, setTag } from '@/hooks/use-clarity';
const Index = () => {
  const {
    isAdmin,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };
  const handleAIPlatformClick = (tripData?: any) => {
    // Track AI platform click with trip data context
    trackEvent('ai_platform_clicked');
    setTag('has_trip_data', tripData ? 'true' : 'false');
    
    navigate('/ai-platform', {
      state: {
        tripData
      }
    });
  };
  return <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={northwellLogo} alt="Northwell Health" className="h-10 md:h-12" />
              <h1 className="text-lg md:text-xl font-semibold text-foreground hidden md:block">
                Aviation Transplant Trip Calculator
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => handleAIPlatformClick()} variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden md:inline">AI Intelligence Platform</span>
                <span className="md:hidden">AI Platform</span>
              </Button>
              
              {isAdmin ? <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={() => navigate('/admin')} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <Settings className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Admin Panel</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleLogout} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <LogOut className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sign out</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </> : <Button onClick={() => navigate('/admin-login')} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Settings className="w-5 h-5" />
                </Button>}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <TransplantTimeCalculator onAIPlatformClick={handleAIPlatformClick} />
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
    </div>;
};
export default Index;