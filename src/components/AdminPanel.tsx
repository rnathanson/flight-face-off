import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Settings, Save, Eye, LogOut, FileText, Info, ChevronDown } from 'lucide-react';
import { DEFAULT_CONFIG } from '@/types/aircraft';
import { useConfig } from '@/context/ConfigContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { AdminEstimateEditor } from './AdminEstimateEditor';
import { PartnershipGroupsManager } from './PartnershipGroupsManager';
import { AdminMatchingDashboard } from './AdminMatchingDashboard';
import { SalesAnalyticsDashboard } from './SalesAnalyticsDashboard';
import { ReferralLeaderboard } from './ReferralLeaderboard';
import { CustomerNetworkGraph } from './CustomerNetworkGraph';
export function AdminPanel() {
  const {
    config,
    updateConfig
  } = useConfig();
  const {
    isAdmin,
    isLoading,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    // Check authentication
    if (!isLoading && !isAdmin) {
      navigate('/admin-login');
    }
  }, [isAdmin, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const handleSave = async () => {
    await updateConfig(config);
    toast.success('Configuration saved successfully!');
  };
  const handleReset = () => {
    updateConfig(DEFAULT_CONFIG);
    toast.success('Reset to default values');
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not admin (will redirect)
  if (!isAdmin) {
    return null;
  }
  return <div className="w-full h-full overflow-auto p-4 md:p-8 bg-muted">
      <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-24">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Settings className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-primary uppercase">Admin Panel</h1>
              <p className="text-xs md:text-lg text-muted-foreground">Configure aircraft performance parameters</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button onClick={() => navigate('/')} variant="outline" size="sm" className="text-xs md:text-sm">
              <Eye className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Back to </span>App
            </Button>
            <Button onClick={() => navigate('/admin/estimates')} variant="outline" size="sm" className="text-xs md:text-sm">
              <FileText className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Custom </span>Estimates
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm" className="text-xs md:text-sm">
              <LogOut className="w-4 h-4 mr-1 md:mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="aircraft" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="aircraft">Aircraft Config</TabsTrigger>
            <TabsTrigger value="ownership">Ownership Calculator</TabsTrigger>
            <TabsTrigger value="tabs">Tab Visibility</TabsTrigger>
            <TabsTrigger value="partnerships">Matching</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="analytics">Sales Analytics</TabsTrigger>
          </TabsList>

          {/* Tab 1: Aircraft Config */}
          <TabsContent value="aircraft" className="space-y-6 mt-6">
            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">SR22 Configuration</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cruise Speed (knots)</label>
                  <Input type="number" value={config.sr22.cruiseSpeed.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    cruiseSpeed: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Flow (gph)</label>
                  <Input type="number" value={config.sr22.fuelFlow.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    fuelFlow: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Capacity (gal)</label>
                  <Input type="number" value={config.sr22.fuelCapacity.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    fuelCapacity: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usable Fuel (gal)</label>
                  <Input type="number" value={config.sr22.usableFuel.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    usableFuel: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Cost Per Hour ($/hr)</label>
                  <Input type="number" value={config.sr22.maintenanceCost.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    maintenanceCost: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Passengers (incl. pilot)</label>
                  <Input type="number" value={config.sr22.maxPassengers.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    maxPassengers: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Bags</label>
                  <Input type="number" value={config.sr22.maxBags.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    maxBags: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Useful Load (lbs)</label>
                  <Input type="number" value={config.sr22.maxUsefulLoad.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    maxUsefulLoad: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Weight (lbs/gal)</label>
                  <Input type="number" step="0.1" value={config.sr22.fuelWeightPerGallon.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    fuelWeightPerGallon: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Person Weight (lbs)</label>
                  <Input type="number" value={config.sr22.avgPersonWeight.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    avgPersonWeight: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Bag Weight (lbs)</label>
                  <Input type="number" value={config.sr22.avgBagWeight.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    avgBagWeight: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Taxi Fuel (gal)</label>
                  <Input type="number" value={config.sr22.taxiFuel.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    taxiFuel: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contingency Min (gal)</label>
                  <Input type="number" value={config.sr22.contingencyFuelMin.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    contingencyFuelMin: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reserve Fuel (gal)</label>
                  <Input type="number" value={config.sr22.reserveFuel.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    reserveFuel: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Takeoff Weight (lbs)</label>
                  <Input type="number" value={config.sr22.maxTakeoffWeight.toString()} onChange={e => updateConfig({
                  ...config,
                  sr22: {
                    ...config.sr22,
                    maxTakeoffWeight: Number(e.target.value)
                  }
                })} />
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">Vision Jet Configuration</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cruise Speed (knots)</label>
                  <Input type="number" value={config.jet.cruiseSpeed.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    cruiseSpeed: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Flow (gph)</label>
                  <Input type="number" value={config.jet.fuelFlow.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    fuelFlow: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Capacity (gal)</label>
                  <Input type="number" value={config.jet.fuelCapacity.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    fuelCapacity: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usable Fuel (gal)</label>
                  <Input type="number" value={config.jet.usableFuel.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    usableFuel: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Cost Per Hour ($/hr)</label>
                  <Input type="number" value={config.jet.maintenanceCost.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    maintenanceCost: Number(e.target.value)
                  }
                })} />
                  <p className="text-xs text-muted-foreground">All-in hourly cost (fuel + Jetstream)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Passengers (Recommend 4-5 adults)</label>
                  <Input type="number" value={config.jet.maxPassengers.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    maxPassengers: Number(e.target.value)
                  }
                })} />
                  <p className="text-xs text-muted-foreground">Can accommodate up to 7 in family configuration (5 adults + 2 kids)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Bags</label>
                  <Input type="number" value={config.jet.maxBags.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    maxBags: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Useful Load (lbs)</label>
                  <Input type="number" value={config.jet.maxUsefulLoad.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    maxUsefulLoad: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Weight (lbs/gal)</label>
                  <Input type="number" step="0.1" value={config.jet.fuelWeightPerGallon.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    fuelWeightPerGallon: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Person Weight (lbs)</label>
                  <Input type="number" value={config.jet.avgPersonWeight.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    avgPersonWeight: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Bag Weight (lbs)</label>
                  <Input type="number" value={config.jet.avgBagWeight.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    avgBagWeight: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Taxi Fuel (gal)</label>
                  <Input type="number" value={config.jet.taxiFuel.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    taxiFuel: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contingency Min (gal)</label>
                  <Input type="number" value={config.jet.contingencyFuelMin.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    contingencyFuelMin: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reserve Fuel (gal)</label>
                  <Input type="number" value={config.jet.reserveFuel.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    reserveFuel: Number(e.target.value)
                  }
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Takeoff Weight (lbs)</label>
                  <Input type="number" value={config.jet.maxTakeoffWeight.toString()} onChange={e => updateConfig({
                  ...config,
                  jet: {
                    ...config.jet,
                    maxTakeoffWeight: Number(e.target.value)
                  }
                })} />
                </div>
              </div>
              
              <div className="mt-6 p-6 bg-muted/50 rounded-lg border border-primary/20">
                <h3 className="text-lg font-display font-bold mb-3 text-primary uppercase">SF50 Payload & Range Rule</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-semibold">Payload (lbs) + Range (nm) ≈ 1600</span>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>With 800 lbs payload → expect ~800 nm range with IFR reserves</li>
                  <li>With 1,000 lbs (5 pax + bags) → expect ~600 nm range</li>
                  <li>For max range (1,200+ nm) → limit payload to ~450 lbs</li>
                </ul>
              </div>
            </Card>

            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">General Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reserve Minutes</label>
                  <Input type="number" value={config.reserveMinutes.toString()} onChange={e => updateConfig({
                  ...config,
                  reserveMinutes: Number(e.target.value)
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Value ($/hour)</label>
                  <Input type="number" value={config.timeValueDefault.toString()} onChange={e => updateConfig({
                  ...config,
                  timeValueDefault: Number(e.target.value)
                })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Headwind Assumption (knots)</label>
                  <Input type="number" value={config.headwindKts.toString()} onChange={e => updateConfig({
                  ...config,
                  headwindKts: Number(e.target.value)
                })} />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 2: Ownership Calculator */}
          <TabsContent value="ownership" className="space-y-6 mt-6">
            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">SR20 Ownership Configuration</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure default purchase/financing values and fixed rates for the SR20 leaseback calculator
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Default Purchase & Financing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Default Aircraft Cost ($)</label>
                      <Input type="number" value={config.sr20Leaseback?.defaultAircraftCost ?? 750000} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        defaultAircraftCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Down Payment (%)</label>
                      <Input type="number" value={config.sr20Leaseback?.defaultDownPaymentPercent ?? 100} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        defaultDownPaymentPercent: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Interest Rate (%)</label>
                      <Input type="number" step="0.01" value={config.sr20Leaseback?.defaultInterestRate ?? 7} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        defaultInterestRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Loan Term (years)</label>
                      <Input type="number" value={config.sr20Leaseback?.defaultLoanTermYears ?? 20} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        defaultLoanTermYears: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Revenue Rates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Revenue Rates ($/hr)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Rental Revenue Rate</label>
                      <Input type="number" value={config.sr20Leaseback?.rentalRevenueRate ?? 220} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        rentalRevenueRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Owner Usage Rate</label>
                      <Input type="number" value={config.sr20Leaseback?.ownerUsageRate ?? 390} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        ownerUsageRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pilot Services Rate</label>
                      <Input type="number" value={config.sr20Leaseback?.pilotServicesRate ?? 100} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        pilotServicesRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Operating Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Operating Costs ($/hr)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Maintenance Per Hour</label>
                      <p className="text-xs text-muted-foreground mb-1">Note: Only applies in non-leaseback scenarios</p>
                      <Input type="number" value={config.sr20Leaseback?.maintenancePerHour ?? 70} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        maintenancePerHour: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Fixed Monthly Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Fixed Monthly Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Management Fee</label>
                      <Input type="number" value={config.sr20Leaseback?.managementFee ?? 500} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        managementFee: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Subscriptions</label>
                      <Input type="number" value={config.sr20Leaseback?.subscriptions ?? 175} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        subscriptions: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">TCI Training</label>
                      <Input type="number" value={config.sr20Leaseback?.tciTraining ?? 350} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        tciTraining: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Annual Fixed Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Annual Fixed Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Insurance Annual</label>
                      <Input type="number" value={config.sr20Leaseback?.insuranceAnnual ?? 10000} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        insuranceAnnual: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Parking Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Parking Costs ($/mo)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tie Down Cost</label>
                      <Input type="number" value={config.sr20Leaseback?.tiedownCost ?? 525} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        tiedownCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hangar Cost</label>
                      <Input type="number" value={config.sr20Leaseback?.hangarCost ?? 2300} onChange={e => updateConfig({
                      ...config,
                      sr20Leaseback: {
                        ...config.sr20Leaseback!,
                        hangarCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">SR22 Ownership CONFIGURATION</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure default purchase/financing values and fixed rates for the SR22 leaseback calculator
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Default Purchase & Financing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Default Aircraft Cost ($)</label>
                      <Input type="number" value={config.sr22Leaseback?.defaultAircraftCost ?? 1050000} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        defaultAircraftCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Down Payment (%)</label>
                      <Input type="number" value={config.sr22Leaseback?.defaultDownPaymentPercent ?? 100} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        defaultDownPaymentPercent: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Interest Rate (%)</label>
                      <Input type="number" step="0.01" value={config.sr22Leaseback?.defaultInterestRate ?? 7} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        defaultInterestRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Loan Term (years)</label>
                      <Input type="number" value={config.sr22Leaseback?.defaultLoanTermYears ?? 20} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        defaultLoanTermYears: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Revenue Rates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Revenue Rates ($/hr)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Rental Revenue Rate</label>
                      <Input type="number" value={config.sr22Leaseback?.rentalRevenueRate ?? 285} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        rentalRevenueRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Owner Usage Rate</label>
                      <Input type="number" value={config.sr22Leaseback?.ownerUsageRate ?? 490} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        ownerUsageRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pilot Services Rate</label>
                      <Input type="number" value={config.sr22Leaseback?.pilotServicesRate ?? 125} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        pilotServicesRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Operating Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Operating Costs ($/hr)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Maintenance Per Hour</label>
                      <p className="text-xs text-muted-foreground mb-1">Note: Only applies in non-leaseback scenarios</p>
                      <Input type="number" value={config.sr22Leaseback?.maintenancePerHour ?? 80} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        maintenancePerHour: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Fixed Monthly Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Fixed Monthly Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Management Fee</label>
                      <Input type="number" value={config.sr22Leaseback?.managementFee ?? 500} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        managementFee: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Subscriptions</label>
                      <Input type="number" value={config.sr22Leaseback?.subscriptions ?? 175} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        subscriptions: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">TCI Training</label>
                      <Input type="number" value={config.sr22Leaseback?.tciTraining ?? 350} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        tciTraining: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Annual Fixed Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Annual Fixed Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Insurance Annual</label>
                      <Input type="number" value={config.sr22Leaseback?.insuranceAnnual ?? 13000} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        insuranceAnnual: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Parking Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Parking Costs ($/mo)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tie Down Cost</label>
                      <Input type="number" value={config.sr22Leaseback?.tiedownCost ?? 450} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        tiedownCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hangar Cost</label>
                      <Input type="number" value={config.sr22Leaseback?.hangarCost ?? 2300} onChange={e => updateConfig({
                      ...config,
                      sr22Leaseback: {
                        ...config.sr22Leaseback!,
                        hangarCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">SF50 Ownership Configuration</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure default purchase/financing values and costs for the SF50 ownership calculator
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Default Purchase & Financing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Default Aircraft Cost ($)</label>
                      <Input type="number" value={config.sf50Ownership?.defaultAircraftCost ?? 3000000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        defaultAircraftCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Down Payment (%)</label>
                      <Input type="number" value={config.sf50Ownership?.defaultDownPaymentPercent ?? 100} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        defaultDownPaymentPercent: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Interest Rate (%)</label>
                      <Input type="number" step="0.01" value={config.sf50Ownership?.defaultInterestRate ?? 7} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        defaultInterestRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Loan Term (years)</label>
                      <Input type="number" value={config.sf50Ownership?.defaultLoanTermYears ?? 20} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        defaultLoanTermYears: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Resale Percent (%)</label>
                      <Input type="number" value={config.sf50Ownership?.defaultResalePercent ?? 95} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        defaultResalePercent: Number(e.target.value)
                      }
                    })} min="0" max="100" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Owner Hours (hrs/mo)</label>
                      <Input type="number" value={config.sf50Ownership?.defaultOwnerHours ?? 100} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        defaultOwnerHours: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Fixed Monthly Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Fixed Monthly Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Management Fee</label>
                      <Input type="number" value={config.sf50Ownership?.managementFee ?? 800} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        managementFee: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Cleaning (Monthly)</label>
                      <Input type="number" value={config.sf50Ownership?.cleaningMonthly ?? 300} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        cleaningMonthly: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hangar Cost (Recommended)</label>
                      <Input type="number" value={config.sf50Ownership?.hangarCost ?? 2000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        hangarCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Annual Fixed Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Fixed Annual Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Insurance Annual</label>
                      <Input type="number" value={config.sf50Ownership?.insuranceAnnual ?? 20000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        insuranceAnnual: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pilot Services Salary (Annual)</label>
                      <p className="text-xs text-muted-foreground mb-1">Used when owner does not fly</p>
                      <Input type="number" value={config.sf50Ownership?.pilotServicesAnnual ?? 120000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        pilotServicesAnnual: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pilot Pool Contribution (Annual)</label>
                      <p className="text-xs text-muted-foreground mb-1">For owner flown with pilot services</p>
                      <Input type="number" value={config.sf50Ownership?.pilotPoolContribution ?? 25000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        pilotPoolContribution: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Subscriptions (Annual)</label>
                      <Input type="number" value={config.sf50Ownership?.subscriptions ?? 5000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        subscriptions: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Variable Hourly Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Variable Hourly Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">JetStream Program ($/hr)</label>
                      <Input type="number" value={config.sf50Ownership?.jetstreamHourly ?? 425} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        jetstreamHourly: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fuel Burn Per Hour (gph)</label>
                      <Input type="number" value={config.sf50Ownership?.fuelBurnPerHour ?? 80} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        fuelBurnPerHour: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fuel Price Per Gallon ($/gal)</label>
                      <Input type="number" step="0.01" value={config.sf50Ownership?.fuelPricePerGallon ?? 6.50} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        fuelPricePerGallon: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pilot Services Hourly (Owner Flown)</label>
                      <p className="text-xs text-muted-foreground mb-1">Used when owner flies but needs occasional pilot services</p>
                      <Input type="number" value={config.sf50Ownership?.pilotServicesHourly ?? 200} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        pilotServicesHourly: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type Rating Initial Cost</label>
                      <p className="text-xs text-muted-foreground mb-1">One-time initial type rating cost (owner flown fractional)</p>
                      <Input type="number" value={config.sf50Ownership?.typeRatingInitial ?? 31000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        typeRatingInitial: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type Rating Recurrent (Annual)</label>
                      <p className="text-xs text-muted-foreground mb-1">Annual recurrent type rating cost (owner flown fractional)</p>
                      <Input type="number" value={config.sf50Ownership?.typeRatingRecurrent ?? 13000} onChange={e => updateConfig({
                      ...config,
                      sf50Ownership: {
                        ...config.sf50Ownership!,
                        typeRatingRecurrent: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* JetStream Package Options */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">JetStream Package Options</h3>
                  <p className="text-sm text-muted-foreground mb-4">Configure JetStream package costs and terms (updates when Cirrus changes pricing)</p>
                  
                  {(['2yr-300hrs', '3yr-450hrs', '3yr-600hrs'] as const).map((packageKey) => (
                    <Collapsible key={packageKey} className="mb-4 border rounded-lg">
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                        <span className="font-semibold">{config.jetstreamPackages?.[packageKey]?.label || packageKey}</span>
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 border-t space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Package Cost ($)</label>
                            <Input type="number" value={config.jetstreamPackages?.[packageKey]?.cost ?? 0} onChange={e => updateConfig({
                              ...config,
                              jetstreamPackages: {
                                ...config.jetstreamPackages!,
                                [packageKey]: {
                                  ...config.jetstreamPackages![packageKey],
                                  cost: Number(e.target.value)
                                }
                              }
                            })} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Coverage Years</label>
                            <Input type="number" value={config.jetstreamPackages?.[packageKey]?.years ?? 0} onChange={e => updateConfig({
                              ...config,
                              jetstreamPackages: {
                                ...config.jetstreamPackages!,
                                [packageKey]: {
                                  ...config.jetstreamPackages![packageKey],
                                  years: Number(e.target.value)
                                }
                              }
                            })} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Coverage Hours</label>
                            <Input type="number" value={config.jetstreamPackages?.[packageKey]?.hours ?? 0} onChange={e => updateConfig({
                              ...config,
                              jetstreamPackages: {
                                ...config.jetstreamPackages!,
                                [packageKey]: {
                                  ...config.jetstreamPackages![packageKey],
                                  hours: Number(e.target.value)
                                }
                              }
                            })} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Display Label</label>
                            <Input type="text" value={config.jetstreamPackages?.[packageKey]?.label ?? ''} onChange={e => updateConfig({
                              ...config,
                              jetstreamPackages: {
                                ...config.jetstreamPackages!,
                                [packageKey]: {
                                  ...config.jetstreamPackages![packageKey],
                                  label: e.target.value
                                }
                              }
                            })} />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">Owner's Fleet Configuration</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure default purchase/financing values and costs for the Owner's Fleet ownership calculator (identical to SF50 except aircraft cost)
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Default Purchase & Financing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Default Aircraft Cost ($)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.defaultAircraftCost ?? 1250000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        defaultAircraftCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Down Payment (%)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.defaultDownPaymentPercent ?? 100} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        defaultDownPaymentPercent: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Interest Rate (%)</label>
                      <Input type="number" step="0.01" value={config.ownersFleetOwnership?.defaultInterestRate ?? 6} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        defaultInterestRate: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Loan Term (years)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.defaultLoanTermYears ?? 20} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        defaultLoanTermYears: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Default Owner Hours (hrs/mo)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.defaultOwnerHours ?? 15} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        defaultOwnerHours: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Fixed Monthly Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Fixed Monthly Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Management Fee</label>
                      <Input type="number" value={config.ownersFleetOwnership?.managementFee ?? 2500} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        managementFee: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Cleaning (Monthly)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.cleaningMonthly ?? 500} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        cleaningMonthly: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hangar Cost</label>
                      <Input type="number" value={config.ownersFleetOwnership?.hangarCost ?? 3000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        hangarCost: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Fixed Annual Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Fixed Annual Costs ($)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Insurance Annual</label>
                      <Input type="number" value={config.ownersFleetOwnership?.insuranceAnnual ?? 48000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        insuranceAnnual: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">SF50 Pilot Services Salary (Annual)</label>
                      <p className="text-xs text-muted-foreground mb-1">For SF50 when owner does not fly (not applicable to SR22)</p>
                      <Input type="number" value={config.ownersFleetOwnership?.pilotServicesAnnual ?? 100000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        pilotServicesAnnual: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        Professional Services (Annual)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Legal, Financial & Administration</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <Input type="number" value={config.ownersFleetOwnership?.professionalServicesAnnual ?? 30000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        professionalServicesAnnual: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pilot Pool Contribution (Annual)</label>
                      <p className="text-xs text-muted-foreground mb-1">For owner flown with pilot services</p>
                      <Input type="number" value={config.ownersFleetOwnership?.pilotPoolContribution ?? 25000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        pilotPoolContribution: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Subscriptions (Annual)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.subscriptions ?? 0} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        subscriptions: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* SF50 Variable Hourly Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">SF50 Variable Hourly Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">SF50 JetStream Program ($/hr)</label>
                      <p className="text-xs text-muted-foreground mb-1">Prepaid maintenance program</p>
                      <Input type="number" value={config.ownersFleetOwnership?.sf50JetstreamHourly ?? 625} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        sf50JetstreamHourly: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">SF50 Fuel Burn Per Hour (gal/hr)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.sf50FuelBurnPerHour ?? 80} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        sf50FuelBurnPerHour: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">SF50 Fuel Price ($/gal)</label>
                      <p className="text-xs text-muted-foreground mb-1">Jet-A price</p>
                      <Input type="number" step="0.01" value={config.ownersFleetOwnership?.sf50FuelPricePerGallon ?? 6.5} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        sf50FuelPricePerGallon: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">SF50 Pilot Services Hourly ($/hr)</label>
                      <p className="text-xs text-muted-foreground mb-1">For SF50 when owner flies</p>
                      <Input type="number" value={config.ownersFleetOwnership?.sf50PilotServicesHourly ?? 200} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        sf50PilotServicesHourly: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* SR22 Variable Hourly Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">SR22 Variable Hourly Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">SR22 Maintenance Per Hour ($/hr)</label>
                      <p className="text-xs text-muted-foreground mb-1">Direct maintenance cost for SR22</p>
                      <Input type="number" value={config.ownersFleetOwnership?.sr22MaintenancePerHour ?? 110} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        sr22MaintenancePerHour: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">SR22 Fuel Burn Per Hour (gal/hr)</label>
                      <Input type="number" value={config.ownersFleetOwnership?.sr22FuelBurnPerHour ?? 18.5} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        sr22FuelBurnPerHour: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">SR22 Fuel Price ($/gal)</label>
                      <p className="text-xs text-muted-foreground mb-1">Avgas (100LL) price</p>
                      <Input type="number" step="0.01" value={config.ownersFleetOwnership?.sr22FuelPricePerGallon ?? 6.5} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        sr22FuelPricePerGallon: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>

                {/* Type Rating Costs */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Type Rating Costs (Owner Flown Fractional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Type Rating Initial</label>
                      <p className="text-xs text-muted-foreground mb-1">One-time initial type rating cost (owner flown fractional)</p>
                      <Input type="number" value={config.ownersFleetOwnership?.typeRatingInitial ?? 31000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        typeRatingInitial: Number(e.target.value)
                      }
                    })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type Rating Recurrent (Annual)</label>
                      <p className="text-xs text-muted-foreground mb-1">Annual recurrent type rating cost (owner flown fractional)</p>
                      <Input type="number" value={config.ownersFleetOwnership?.typeRatingRecurrent ?? 13000} onChange={e => updateConfig({
                      ...config,
                      ownersFleetOwnership: {
                        ...config.ownersFleetOwnership!,
                        typeRatingRecurrent: Number(e.target.value)
                      }
                    })} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 3: Tab Visibility */}
          <TabsContent value="tabs" className="space-y-6 mt-6">
            <Card className="p-4 md:p-6 lg:p-8 shadow-elevated bg-card">
              <h2 className="text-3xl font-display font-bold mb-6 uppercase">Tab Visibility</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Control which tabs are visible in public view and admin view. Admin view includes all public tabs plus any admin-only tabs.
              </p>
              <div className="space-y-6">
                {/* Mission Match */}
                <div className="space-y-2">
                  <label className="text-sm font-bold">Mission Match</label>
                  <div className="flex items-center space-x-6 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mission-match-public" checked={config.tabs?.missionMatch?.public !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        missionMatch: {
                          public: checked as boolean,
                          admin: config.tabs?.missionMatch?.admin !== false
                        }
                      }
                    })} />
                      <label htmlFor="mission-match-public" className="text-sm cursor-pointer">
                        Show in Public View
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mission-match-admin" checked={config.tabs?.missionMatch?.admin !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        missionMatch: {
                          public: config.tabs?.missionMatch?.public !== false,
                          admin: checked as boolean
                        }
                      }
                    })} />
                      <label htmlFor="mission-match-admin" className="text-sm cursor-pointer">
                        Show in Admin View
                      </label>
                    </div>
                  </div>
                </div>

                {/* Mission ROI */}
                <div className="space-y-2">
                  <label className="text-sm font-bold">Mission ROI</label>
                  <div className="flex items-center space-x-6 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mission-roi-public" checked={config.tabs?.missionROI?.public !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        missionROI: {
                          public: checked as boolean,
                          admin: config.tabs?.missionROI?.admin !== false
                        }
                      }
                    })} />
                      <label htmlFor="mission-roi-public" className="text-sm cursor-pointer">
                        Show in Public View
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mission-roi-admin" checked={config.tabs?.missionROI?.admin !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        missionROI: {
                          public: config.tabs?.missionROI?.public !== false,
                          admin: checked as boolean
                        }
                      }
                    })} />
                      <label htmlFor="mission-roi-admin" className="text-sm cursor-pointer">
                        Show in Admin View
                      </label>
                    </div>
                  </div>
                </div>

                {/* Jet Challenge */}
                <div className="space-y-2">
                  <label className="text-sm font-bold">Jet Challenge</label>
                  <div className="flex items-center space-x-6 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="jet-challenge-public" checked={config.tabs?.jetChallenge?.public !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        jetChallenge: {
                          public: checked as boolean,
                          admin: config.tabs?.jetChallenge?.admin !== false
                        }
                      }
                    })} />
                      <label htmlFor="jet-challenge-public" className="text-sm cursor-pointer">
                        Show in Public View
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="jet-challenge-admin" checked={config.tabs?.jetChallenge?.admin !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        jetChallenge: {
                          public: config.tabs?.jetChallenge?.public !== false,
                          admin: checked as boolean
                        }
                      }
                    })} />
                      <label htmlFor="jet-challenge-admin" className="text-sm cursor-pointer">
                        Show in Admin View
                      </label>
                    </div>
                  </div>
                </div>

                {/* Range Explorer */}
                <div className="space-y-2">
                  <label className="text-sm font-bold">Range Explorer</label>
                  <div className="flex items-center space-x-6 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="range-explorer-public" checked={config.tabs?.rangeExplorer?.public !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        rangeExplorer: {
                          public: checked as boolean,
                          admin: config.tabs?.rangeExplorer?.admin !== false
                        }
                      }
                    })} />
                      <label htmlFor="range-explorer-public" className="text-sm cursor-pointer">
                        Show in Public View
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="range-explorer-admin" checked={config.tabs?.rangeExplorer?.admin !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        rangeExplorer: {
                          public: config.tabs?.rangeExplorer?.public !== false,
                          admin: checked as boolean
                        }
                      }
                    })} />
                      <label htmlFor="range-explorer-admin" className="text-sm cursor-pointer">
                        Show in Admin View
                      </label>
                    </div>
                  </div>
                </div>

                {/* Ownership Calculator */}
                <div className="space-y-2">
                  <label className="text-sm font-bold">Ownership Calculator</label>
                  <div className="flex items-center space-x-6 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="leaseback-calculator-public" checked={config.tabs?.leasebackCalculator?.public !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        leasebackCalculator: {
                          public: checked as boolean,
                          admin: config.tabs?.leasebackCalculator?.admin !== false
                        }
                      }
                    })} />
                      <label htmlFor="leaseback-calculator-public" className="text-sm cursor-pointer">
                        Show in Public View
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="leaseback-calculator-admin" checked={config.tabs?.leasebackCalculator?.admin !== false} onCheckedChange={checked => updateConfig({
                      ...config,
                      tabs: {
                        ...config.tabs,
                        leasebackCalculator: {
                          public: config.tabs?.leasebackCalculator?.public !== false,
                          admin: checked as boolean
                        }
                      }
                    })} />
                      <label htmlFor="leaseback-calculator-admin" className="text-sm cursor-pointer">
                        Show in Admin View
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 4: Matching */}
          <TabsContent value="partnerships">
            <AdminMatchingDashboard />
          </TabsContent>

          {/* Tab 5: Groups */}
          <TabsContent value="groups">
            <PartnershipGroupsManager />
          </TabsContent>

          {/* Tab 6: Sales Analytics with nested tabs */}
          <TabsContent value="analytics" className="space-y-6">
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="referrals">Referrals</TabsTrigger>
                <TabsTrigger value="network">Network Map</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                <SalesAnalyticsDashboard />
              </TabsContent>

              <TabsContent value="referrals" className="mt-6">
                <ReferralLeaderboard />
              </TabsContent>

              <TabsContent value="network" className="mt-6">
                <CustomerNetworkGraph />
              </TabsContent>
            </Tabs>
          </TabsContent>

        </Tabs>

        {/* Save/Reset Buttons - Fixed at bottom */}
        <div className="fixed bottom-4 right-4 md:right-8 flex gap-4 z-50">
          <Button onClick={handleReset} variant="outline" className="min-w-32 shadow-lg">
            <Eye className="mr-2 w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} className="min-w-32 shadow-lg">
            <Save className="mr-2 w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>;
}