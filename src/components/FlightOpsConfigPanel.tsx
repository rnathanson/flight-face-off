import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plane, Settings, CloudRain, Heart } from "lucide-react";

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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plane className="h-4 w-4" />
            Airport Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="min_runway_length" className="text-xs">Min Runway Length (ft)</Label>
              <Input
                id="min_runway_length"
                type="number"
                className="h-8"
                value={config.min_runway_length_ft}
                onChange={(e) => updateField('min_runway_length_ft', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="min_runway_width" className="text-xs">Min Runway Width (ft)</Label>
              <Input
                id="min_runway_width"
                type="number"
                className="h-8"
                value={config.min_runway_width_ft}
                onChange={(e) => updateField('min_runway_width_ft', parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                id="requires_paved"
                checked={config.requires_paved_surface}
                onCheckedChange={(checked) => updateField('requires_paved_surface', checked)}
              />
              <Label htmlFor="requires_paved" className="text-xs cursor-pointer">Paved Surface</Label>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                id="requires_lighting"
                checked={config.requires_lighting}
                onCheckedChange={(checked) => updateField('requires_lighting', checked)}
              />
              <Label htmlFor="requires_lighting" className="text-xs cursor-pointer">Lighting</Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ifr_requires_approach"
              checked={config.ifr_requires_instrument_approach}
              onCheckedChange={(checked) => updateField('ifr_requires_instrument_approach', checked)}
            />
            <Label htmlFor="ifr_requires_approach" className="text-xs cursor-pointer">IFR Requires Instrument Approach</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CloudRain className="h-4 w-4" />
            Weather Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="min_ceiling" className="text-xs">Min Ceiling (ft)</Label>
              <Input
                id="min_ceiling"
                type="number"
                className="h-8"
                value={config.minimum_ceiling_ft}
                onChange={(e) => updateField('minimum_ceiling_ft', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="min_visibility" className="text-xs">Min Visibility (sm)</Label>
              <Input
                id="min_visibility"
                type="number"
                className="h-8"
                step="0.25"
                value={config.minimum_visibility_sm}
                onChange={(e) => updateField('minimum_visibility_sm', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-4 w-4" />
            Performance & Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cruise_speed" className="text-xs">Cruise Speed (KTAS)</Label>
              <Input
                id="cruise_speed"
                type="number"
                className="h-8"
                value={config.cruise_speed_ktas}
                onChange={(e) => updateField('cruise_speed_ktas', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="climb_rate" className="text-xs">Climb Rate (fpm)</Label>
              <Input
                id="climb_rate"
                type="number"
                className="h-8"
                value={config.climb_rate_fpm}
                onChange={(e) => updateField('climb_rate_fpm', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="descent_rate" className="text-xs">Descent Rate (fpm)</Label>
              <Input
                id="descent_rate"
                type="number"
                className="h-8"
                value={config.descent_rate_fpm}
                onChange={(e) => updateField('descent_rate_fpm', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="speed_below_fl100" className="text-xs">Speed Below FL100 (KIAS)</Label>
              <Input
                id="speed_below_fl100"
                type="number"
                className="h-8"
                value={config.speed_below_fl100_kias}
                onChange={(e) => updateField('speed_below_fl100_kias', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="taxi_time_per_airport" className="text-xs">Taxi Time/Airport (min)</Label>
              <Input
                id="taxi_time_per_airport"
                type="number"
                className="h-8"
                value={config.taxi_time_per_airport_min}
                onChange={(e) => updateField('taxi_time_per_airport_min', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ground_handling" className="text-xs">Ground Handling (min)</Label>
              <Input
                id="ground_handling"
                type="number"
                className="h-8"
                value={config.ground_handling_time_min}
                onChange={(e) => updateField('ground_handling_time_min', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="takeoff_landing_buffer" className="text-xs">T/O & Landing Buffer (min)</Label>
              <Input
                id="takeoff_landing_buffer"
                type="number"
                className="h-8"
                value={config.takeoff_landing_buffer_min}
                onChange={(e) => updateField('takeoff_landing_buffer_min', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reserve_fuel" className="text-xs">Reserve Fuel (min)</Label>
              <Input
                id="reserve_fuel"
                type="number"
                className="h-8"
                value={config.reserve_fuel_minutes}
                onChange={(e) => updateField('reserve_fuel_minutes', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Under 100nm (ft)</Label>
              <Input
                type="number"
                className="h-8"
                value={config.altitude_rules.under_100nm.max_ft}
                onChange={(e) => updateField('altitude_rules', {
                  ...config.altitude_rules,
                  under_100nm: { ...config.altitude_rules.under_100nm, max_ft: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">100-350nm (ft)</Label>
              <Input
                type="number"
                className="h-8"
                value={config.altitude_rules['100_to_350nm'].max_ft}
                onChange={(e) => updateField('altitude_rules', {
                  ...config.altitude_rules,
                  '100_to_350nm': { ...config.altitude_rules['100_to_350nm'], max_ft: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Over 350nm (ft)</Label>
              <Input
                type="number"
                className="h-8"
                value={config.altitude_rules.over_350nm.max_ft}
                onChange={(e) => updateField('altitude_rules', {
                  ...config.altitude_rules,
                  over_350nm: { ...config.altitude_rules.over_350nm, max_ft: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-4 w-4" />
            Organ Viability Time Frames
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[1fr,80px,80px] gap-x-3 gap-y-2 items-center max-w-md">
            <Label className="text-xs font-semibold">Organ</Label>
            <Label className="text-xs font-semibold text-center">Min (hrs)</Label>
            <Label className="text-xs font-semibold text-center">Max (hrs)</Label>
            
            <Label className="text-sm">Heart</Label>
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.heart?.min || 4}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                heart: { ...config.organ_viability_hours?.heart, min: parseFloat(e.target.value) }
              })}
            />
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.heart?.max || 6}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                heart: { ...config.organ_viability_hours?.heart, max: parseFloat(e.target.value) }
              })}
            />

            <Label className="text-sm">Lungs</Label>
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.lungs?.min || 4}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                lungs: { ...config.organ_viability_hours?.lungs, min: parseFloat(e.target.value) }
              })}
            />
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.lungs?.max || 6}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                lungs: { ...config.organ_viability_hours?.lungs, max: parseFloat(e.target.value) }
              })}
            />

            <Label className="text-sm">Liver</Label>
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.liver?.min || 8}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                liver: { ...config.organ_viability_hours?.liver, min: parseFloat(e.target.value) }
              })}
            />
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.liver?.max || 12}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                liver: { ...config.organ_viability_hours?.liver, max: parseFloat(e.target.value) }
              })}
            />

            <Label className="text-sm">Pancreas</Label>
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.pancreas?.min || 0}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                pancreas: { ...config.organ_viability_hours?.pancreas, min: parseFloat(e.target.value) }
              })}
            />
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.pancreas?.max || 12}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                pancreas: { ...config.organ_viability_hours?.pancreas, max: parseFloat(e.target.value) }
              })}
            />

            <Label className="text-sm">Kidneys</Label>
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.kidneys?.min || 24}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                kidneys: { ...config.organ_viability_hours?.kidneys, min: parseFloat(e.target.value) }
              })}
            />
            <Input
              type="number"
              className="h-8 text-center"
              value={config.organ_viability_hours?.kidneys?.max || 36}
              onChange={(e) => updateField('organ_viability_hours', {
                ...config.organ_viability_hours,
                kidneys: { ...config.organ_viability_hours?.kidneys, max: parseFloat(e.target.value) }
              })}
            />
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Used for mission viability assessment and risk calculation
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
