import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
        await supabase.rpc('increment_estimate_view', { _estimate_id: data.id });
      }
      setLoading(false);
    };

    loadEstimate();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <CardContent>Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center">
            <h1 className="text-2xl font-bold mb-4">Estimate Not Found</h1>
            <p className="text-muted-foreground">
              The estimate you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BrandHeader title={estimate.customer_name} />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Custom Estimate</h2>
            <p className="text-muted-foreground">
              This estimate view will be updated in the next phase to show trip details.
            </p>
          </CardContent>
        </Card>
      </main>
      
      <BrandFooter />
    </div>
  );
}
