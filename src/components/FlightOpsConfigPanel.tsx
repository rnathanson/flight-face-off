import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plane, Settings, CloudRain, Heart, Wind } from "lucide-react";

export function FlightOpsConfigPanel() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      console.log('Loading flight ops config...');
      const { data, error } = await supabase.functions.invoke('admin-flight-ops-config', {
        method: 'GET'
      });

      if (error) {
        console.error('Error loading config:', error);
        throw error;
      }
      
      if (data?.created) {
        toast.success('Default configuration created');
      }
      
      console.log('Config loaded successfully:', data.config);
      setConfig(data.config);
    } catch (error: any) {
      console.error('Error loading config:', error);
      toast.error(`Failed to load configuration: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const adminSession = localStorage.getItem('admin_session');
      if (!adminSession) {
        toast.error('Admin session expired. Please log in again.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-flight-ops-config', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession}`
        },
        body: config
      });

      if (error) throw error;
      
      if (data?.config) {
        setConfig(data.config);
      }
      
      toast.success('Flight operations configuration updated');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  if (!config) {
    return <div>No configuration found</div>;
  }

  const updateField = (field: string, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Airport Requirements
          </CardTitle>
          <CardDescription>
            Minimum requirements for airport selection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_runway_length">Minimum Runway Length (ft)</Label>
              <Input
                id="min_runway_length"
                type="number"
                value={config.min_runway_length_ft}
                onChange={(e) => updateField('min_runway_length_ft', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_runway_width">Minimum Runway Width (ft)</Label>
              <Input
                id="min_runway_width"
                type="number"
                value={config.min_runway_width_ft}
                onChange={(e) => updateField('min_runway_width_ft', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="requires_paved">Requires Paved Surface</Label>
            <Switch
              id="requires_paved"
              checked={config.requires_paved_surface}
              onCheckedChange={(checked) => updateField('requires_paved_surface', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="requires_lighting">Requires Runway Lighting</Label>
            <Switch
              id="requires_lighting"
              checked={config.requires_lighting}
              onCheckedChange={(checked) => updateField('requires_lighting', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5" />
            IFR Requirements
          </CardTitle>
          <CardDescription>
            Requirements when forecast shows IFR conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="ifr_requires_approach">Requires Instrument Approach</Label>
            <Switch
              id="ifr_requires_approach"
              checked={config.ifr_requires_instrument_approach}
              onCheckedChange={(checked) => updateField('ifr_requires_instrument_approach', checked)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_ceiling">Minimum Ceiling (ft)</Label>
              <Input
                id="min_ceiling"
                type="number"
                value={config.minimum_ceiling_ft}
                onChange={(e) => updateField('minimum_ceiling_ft', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_visibility">Minimum Visibility (SM)</Label>
              <Input
                id="min_visibility"
                type="number"
                step="0.5"
                value={config.minimum_visibility_sm}
                onChange={(e) => updateField('minimum_visibility_sm', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wind Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            Wind Limits
          </CardTitle>
          <CardDescription>
            Maximum wind and crosswind thresholds (including gusts)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_wind">Max Wind (knots)</Label>
              <Input
                id="max_wind"
                type="number"
                value={config.max_wind_kt || 35}
                onChange={(e) => updateField('max_wind_kt', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Total wind speed including gusts
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_crosswind">Max Crosswind (knots)</Label>
              <Input
                id="max_crosswind"
                type="number"
                value={config.max_crosswind_kt || 15}
                onChange={(e) => updateField('max_crosswind_kt', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Crosswind component including gusts
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            <p className="font-semibold mb-2">How wind limits work:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>System checks TAF forecast at arrival airports</li>
              <li>Calculates crosswind for best available runway</li>
              <li>Airports exceeding limits are <strong>rejected</strong></li>
              <li>Only suitable airports within limits are selected</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Flight Performance
          </CardTitle>
          <CardDescription>
            PC-24 performance parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cruise_speed">Cruise Speed (KTAS)</Label>
              <Input
                id="cruise_speed"
                type="number"
                value={config.cruise_speed_ktas}
                onChange={(e) => updateField('cruise_speed_ktas', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="climb_rate">Climb Rate (fpm)</Label>
              <Input
                id="climb_rate"
                type="number"
                value={config.climb_rate_fpm}
                onChange={(e) => updateField('climb_rate_fpm', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="descent_rate">Descent Rate (fpm)</Label>
              <Input
                id="descent_rate"
                type="number"
                value={config.descent_rate_fpm}
                onChange={(e) => updateField('descent_rate_fpm', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speed_below_fl100">Speed Below FL100 (KIAS)</Label>
              <Input
                id="speed_below_fl100"
                type="number"
                value={config.speed_below_fl100_kias}
                onChange={(e) => updateField('speed_below_fl100_kias', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxi_time_per_airport">Taxi Time Per Airport (minutes)</Label>
              <Input
                id="taxi_time_per_airport"
                type="number"
                value={config.taxi_time_per_airport_min}
                onChange={(e) => updateField('taxi_time_per_airport_min', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Time for one taxi operation (×2 per flight leg: taxi-out + taxi-in)
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Altitude Rules</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Under 100nm (ft)</Label>
                <Input
                  type="number"
                  value={config.altitude_rules.under_100nm.max_ft}
                  onChange={(e) => updateField('altitude_rules', {
                    ...config.altitude_rules,
                    under_100nm: { ...config.altitude_rules.under_100nm, max_ft: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">100-350nm (ft)</Label>
                <Input
                  type="number"
                  value={config.altitude_rules['100_to_350nm'].max_ft}
                  onChange={(e) => updateField('altitude_rules', {
                    ...config.altitude_rules,
                    '100_to_350nm': { ...config.altitude_rules['100_to_350nm'], max_ft: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Over 350nm (ft)</Label>
                <Input
                  type="number"
                  value={config.altitude_rules.over_350nm.max_ft}
                  onChange={(e) => updateField('altitude_rules', {
                    ...config.altitude_rules,
                    over_350nm: { ...config.altitude_rules.over_350nm, max_ft: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Weight & Balance Configuration
          </CardTitle>
          <CardDescription>
            PC-24 weight limits and passenger weight assumptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empty_weight">Empty Weight (lbs)</Label>
              <Input
                id="empty_weight"
                type="number"
                value={config.empty_weight_lbs || 12200}
                onChange={(e) => updateField('empty_weight_lbs', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avg_passenger_weight">Avg Passenger Weight (lbs)</Label>
              <Input
                id="avg_passenger_weight"
                type="number"
                value={config.avg_passenger_weight_lbs || 180}
                onChange={(e) => updateField('avg_passenger_weight_lbs', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_takeoff_weight">Max Takeoff Weight (lbs)</Label>
              <Input
                id="max_takeoff_weight"
                type="number"
                value={config.max_takeoff_weight_lbs || 18740}
                onChange={(e) => updateField('max_takeoff_weight_lbs', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_landing_weight">Max Landing Weight (lbs)</Label>
              <Input
                id="max_landing_weight"
                type="number"
                value={config.max_landing_weight_lbs || 17340}
                onChange={(e) => updateField('max_landing_weight_lbs', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_weight_per_gallon">Fuel Weight per Gallon (lbs)</Label>
              <Input
                id="fuel_weight_per_gallon"
                type="number"
                step="0.1"
                value={config.fuel_weight_per_gallon || 6.8}
                onChange={(e) => updateField('fuel_weight_per_gallon', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_burn_rate">Fuel Burn Rate (gal/hr)</Label>
              <Input
                id="fuel_burn_rate"
                type="number"
                value={config.fuel_burn_cruise_gal_per_hr || 191}
                onChange={(e) => updateField('fuel_burn_cruise_gal_per_hr', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refueling_time">Refueling Time (minutes)</Label>
              <Input
                id="refueling_time"
                type="number"
                value={config.refueling_time_minutes || 30}
                onChange={(e) => updateField('refueling_time_minutes', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Organ Viability Time Frames
          </CardTitle>
          <CardDescription>
            Maximum acceptable cold ischemic time for transplant organs (hours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Heart */}
          <div className="space-y-2">
            <Label className="font-semibold">Heart</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minimum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.heart?.min || 4}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    heart: { 
                      ...config.organ_viability_hours?.heart, 
                      min: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Maximum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.heart?.max || 6}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    heart: { 
                      ...config.organ_viability_hours?.heart, 
                      max: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Lungs */}
          <div className="space-y-2">
            <Label className="font-semibold">Lungs</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minimum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.lungs?.min || 4}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    lungs: { 
                      ...config.organ_viability_hours?.lungs, 
                      min: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Maximum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.lungs?.max || 6}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    lungs: { 
                      ...config.organ_viability_hours?.lungs, 
                      max: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Liver */}
          <div className="space-y-2">
            <Label className="font-semibold">Liver</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minimum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.liver?.min || 8}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    liver: { 
                      ...config.organ_viability_hours?.liver, 
                      min: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Maximum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.liver?.max || 12}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    liver: { 
                      ...config.organ_viability_hours?.liver, 
                      max: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pancreas */}
          <div className="space-y-2">
            <Label className="font-semibold">Pancreas</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minimum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.pancreas?.min || 0}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    pancreas: { 
                      ...config.organ_viability_hours?.pancreas, 
                      min: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Maximum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.pancreas?.max || 12}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    pancreas: { 
                      ...config.organ_viability_hours?.pancreas, 
                      max: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Kidneys */}
          <div className="space-y-2">
            <Label className="font-semibold">Kidneys</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minimum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.kidneys?.min || 24}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    kidneys: { 
                      ...config.organ_viability_hours?.kidneys, 
                      min: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Maximum (hours)</Label>
                <Input
                  type="number"
                  value={config.organ_viability_hours?.kidneys?.max || 36}
                  onChange={(e) => updateField('organ_viability_hours', {
                    ...config.organ_viability_hours,
                    kidneys: { 
                      ...config.organ_viability_hours?.kidneys, 
                      max: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              These time frames will be used in future mission planning to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Determine if a mission is viable within organ viability window</li>
              <li>Calculate risk level based on timing margin</li>
              <li>Alert when flights are approaching critical time limits</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
