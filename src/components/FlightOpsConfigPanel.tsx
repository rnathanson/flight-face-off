import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plane, Settings, CloudRain } from "lucide-react";

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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
