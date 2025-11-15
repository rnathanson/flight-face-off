import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LeasebackCalculator } from '@/components/LeasebackCalculator';
import { BrandHeader } from '@/components/BrandHeader';
import { BrandFooter } from '@/components/BrandFooter';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';

type CustomOwnershipEstimate = Database['public']['Tables']['custom_ownership_estimates']['Row'];

export default function CustomerEstimate() {
  const { slug } = useParams<{ slug: string }>();
  const [estimate, setEstimate] = useState<CustomOwnershipEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadEstimate = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('custom_ownership_estimates')
        .select('*')
        .eq('unique_slug', slug)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setEstimate(data);
        // Track view using secure database function
        await supabase.rpc('increment_estimate_view', { _estimate_id: data.id });
      }
      setLoading(false);
    };

    loadEstimate();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Card className="p-8">
          <CardContent>Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Card className="p-8">
          <CardContent>
            <h2 className="text-2xl font-bold mb-2">Estimate Not Found</h2>
            <p className="text-muted-foreground">
              This ownership estimate link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <BrandHeader title={estimate.customer_name} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
          <LeasebackCalculator
            key={`${estimate.id}-${estimate.updated_at ?? ''}`}
            aircraftType={estimate.aircraft_type as 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet' || 'SR22'}
            hideSaveButton={true}
            inputsLocked={estimate.inputs_locked}
            customerName={estimate.customer_name}
            disableShareSelection={!estimate.allow_share_selection}
            initialValues={{
              aircraftType: estimate.aircraft_type as 'SR20' | 'SR22' | 'SF50' | 'OwnersFleet' || 'SR22',
            ownershipShare: (() => {
              const share = (estimate as any).ownership_share;
              // Convert legacy 1/3 share to 1/2
              if (share === 0.333) return 0.5;
              return (share as 1 | 0.5 | 0.25) || 1;
            })(),
            aircraftCost: Number(estimate.aircraft_cost),
            downPaymentPercent: Number(estimate.down_payment_percent),
            interestRate: Number(estimate.interest_rate),
            loanTermYears: estimate.loan_term_years,
            ownerHours: estimate.owner_hours,
            rentalHours: estimate.rental_hours,
            pilotServicesHours: estimate.pilot_services_hours,
            isNonPilot: estimate.is_non_pilot,
            parkingType: estimate.parking_type as 'tiedown' | 'hangar',
            insuranceAnnual: Number(estimate.insurance_annual),
            managementFee: Number(estimate.management_fee),
            subscriptions: Number(estimate.subscriptions),
            tciTraining: Number(estimate.tci_training),
            maintenancePerHour: Number(estimate.maintenance_per_hour),
            tiedownCost: Number(estimate.tiedown_cost),
            hangarCost: Number(estimate.hangar_cost),
            rentalRevenueRate: Number(estimate.rental_revenue_rate),
            ownerUsageRate: Number(estimate.owner_usage_rate),
            pilotServicesRate: Number(estimate.pilot_services_rate),
            cleaningMonthly: Number(estimate.cleaning_monthly || 0),
            pilotServicesAnnual: Number(estimate.pilot_services_annual || 0),
            jetstreamHourly: Number(estimate.jetstream_hourly || 0),
            fuelBurnPerHour: Number((estimate as any).fuel_burn_per_hour || 80),
            fuelPricePerGallon: Number((estimate as any).fuel_price_per_gallon || 6.5),
            pilotServicesHourly: Number((estimate as any).pilot_services_hourly || 200),
            pilotPoolContribution: Number((estimate as any).pilot_pool_contribution || 25000),
            sf50OwnerFlown: Boolean((estimate as any).sf50_owner_flown || false),
            jetstreamPackage: (estimate as any).jetstream_package || '2yr-300hrs',
            sr22HoursMonth: Number((estimate as any).ownersfleet_sr22_hours || 10),
            sf50HoursMonth: Number((estimate as any).ownersfleet_sf50_hours || 10),
            sr22PilotServicesHours: Number((estimate as any).ownersfleet_sr22_pilot_services_hours || 0),
          }}
        />
      </div>
      
      <BrandFooter />
    </div>
  );
}
