import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedMissionComparator } from '@/components/EnhancedMissionComparator';
import { TimeMoneyCalculator } from '@/components/TimeMoneyCalculator';
import { SpeedGallery } from '@/components/SpeedGallery';
import RangeAirportExplorer from '@/components/RangeAirportExplorer';
import { JetChallenge } from '@/components/JetChallenge';
import { LeasebackCalculator } from '@/components/LeasebackCalculator';
import { PartnershipCTA } from '@/components/FloatingPartnershipCTA';
import { Settings, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import nassauFlyersLogo from '@/assets/nassau-flyers-logo.webp';
import cirrusLogo from '@/assets/cirrus-international-logo.png';
import { useConfig } from '@/context/ConfigContext';
import { useAuth } from '@/context/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const { config } = useConfig();
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Get visible tabs based on admin status
  const visibleTabs = useMemo(() => {
    const tabs = [];
    const tabConfig: any = config.tabs || {};
    
    // Helper to check if tab should be visible
    const shouldShow = (tabVisibility: any) => {
      if (!tabVisibility) return false;
      if (typeof tabVisibility === 'boolean') {
        return tabVisibility; // Backward compatibility
      }
      return isAdmin ? tabVisibility?.admin : tabVisibility?.public;
    };
    
    if (shouldShow(tabConfig.missionMatch)) tabs.push({ value: 'comparator', label: 'Mission Match' });
    if (shouldShow(tabConfig.missionROI)) tabs.push({ value: 'calculator', label: 'Mission ROI' });
    if (shouldShow(tabConfig.rangeExplorer)) tabs.push({ value: 'range', label: 'Range Explorer' });
    if (shouldShow(tabConfig.jetChallenge)) tabs.push({ value: 'challenge', label: 'Jet Challenge' });
    if (shouldShow(tabConfig.leasebackCalculator)) tabs.push({ value: 'leaseback', label: 'Ownership Calculator' });
    
    return tabs;
  }, [config.tabs, isAdmin]);

  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0].value : 'comparator';
  
  // Set initial active tab
  if (!activeTab && defaultTab) {
    setActiveTab(defaultTab);
  }
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setMobileMenuOpen(false);
  };
  
  const handleLogout = async () => {
    await signOut();
    window.location.reload(); // Refresh to show public view
  };

  return <div className="min-h-screen bg-background flex flex-col">
      <header className="min-h-[120px] md:h-20 lg:h-24 border-b border-border bg-card shadow-sm flex items-center justify-between px-4 md:px-6 lg:px-8 py-4 md:py-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Mobile hamburger menu */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {visibleTabs.map(tab => (
                    <Button
                      key={tab.value}
                      variant={activeTab === tab.value ? "default" : "ghost"}
                      className="justify-start text-left w-full"
                      onClick={() => handleTabChange(tab.value)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}
          
          <div className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-6">
            <img src={nassauFlyersLogo} alt="Nassau Flyers" className="h-10 md:h-12 lg:h-16" />
            <div className="hidden md:block h-12 w-px bg-border" />
            <div className="text-center md:text-left">
              <span className="text-xl md:text-3xl lg:text-4xl font-display font-bold text-primary block">MISSION STUDIO</span>
              <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider mt-1">PRESENTED BY NASSAU FLYERS • CIRRUS PLATINUM TRAINING CENTER</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PartnershipCTA />
          {isAdmin ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => navigate('/admin')} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <Settings className="w-5 h-5 md:w-6 md:h-6" />
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
                      <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sign out</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <Button onClick={() => navigate('/admin-login')} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Desktop tabs - hidden on mobile */}
        <TabsList className={`hidden md:grid w-full max-w-5xl mx-auto mt-8 mb-8 h-16 bg-card shadow-card border border-border`}
          style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
          {visibleTabs.map(tab => (
            <TabsTrigger 
              key={tab.value}
              value={tab.value} 
              className="text-base font-bold uppercase tracking-wide text-center data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1">
          {visibleTabs.some(t => t.value === 'comparator') && (
            <TabsContent value="comparator" className="h-full m-0">
              <EnhancedMissionComparator />
            </TabsContent>
          )}
          {visibleTabs.some(t => t.value === 'calculator') && (
            <TabsContent value="calculator" className="h-full m-0">
              <TimeMoneyCalculator />
            </TabsContent>
          )}
          {visibleTabs.some(t => t.value === 'challenge') && (
            <TabsContent value="challenge" className="h-full m-0">
              <JetChallenge />
            </TabsContent>
          )}
          {visibleTabs.some(t => t.value === 'range') && (
            <TabsContent value="range" className="h-full m-0">
              <RangeAirportExplorer />
            </TabsContent>
          )}
          {visibleTabs.some(t => t.value === 'leaseback') && (
            <TabsContent value="leaseback" className="h-full m-0">
              <LeasebackCalculator />
            </TabsContent>
          )}
        </div>
      </Tabs>

      <footer className="h-12 md:h-16 border-t border-border bg-card flex items-center justify-center">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
          <img src={nassauFlyersLogo} alt="Nassau Flyers" className="h-6 md:h-8" />
          <div className="hidden md:block h-6 w-px bg-border" />
          <p className="text-sm text-muted-foreground">Cirrus Platinum Training & Service Center</p>
          <div className="hidden md:block h-6 w-px bg-border" />
          <img src={cirrusLogo} alt="Cirrus Authorized International" className="h-5 md:h-7" />
        </div>
      </footer>
    </div>;
};
export default Index;
