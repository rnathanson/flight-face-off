import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowLeft } from 'lucide-react';
import { EstimateList } from '@/components/EstimateList';
import { AdminEstimateEditor } from '@/components/AdminEstimateEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type CustomOwnershipEstimate = Database['public']['Tables']['custom_ownership_estimates']['Row'];

export default function AdminEstimates() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAuth();
  const [estimates, setEstimates] = useState<CustomOwnershipEstimate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<CustomOwnershipEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/admin-login');
    } else if (isAdmin) {
      loadEstimates();
    }
  }, [isAdmin, isLoading, navigate]);

  const loadEstimates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('custom_ownership_estimates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEstimates(data);
    }
    setLoading(false);
  };

  const handleEdit = (estimate: CustomOwnershipEstimate) => {
    setEditingEstimate(estimate);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this ownership estimate?')) {
      const { data, error } = await supabase.functions.invoke('delete-custom-estimate', {
        body: { id }
      });

      if (error || data?.error) {
        alert(`Failed to delete: ${error?.message || data?.error}`);
      } else {
        await loadEstimates();
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEstimate(null);
    loadEstimates();
  };

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">Custom Ownership Estimates</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Create and manage personalized ownership estimates for customers
              </p>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="lg" className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Estimate
              </Button>
            )}
          </div>
        </div>

        {showForm ? (
          <AdminEstimateEditor
            estimate={editingEstimate}
            onClose={handleFormClose}
          />
        ) : (
          <EstimateList
            estimates={estimates}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
