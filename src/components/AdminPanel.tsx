import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { FlightOpsConfigPanel } from './FlightOpsConfigPanel';

export function AdminPanel() {
  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_session');
    if (!adminToken) {
      navigate('/admin-login');
    }
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin-login');
  };

  return (
    <div className="w-full h-full overflow-auto p-4 md:p-8 bg-muted">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Settings className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-primary">Admin Panel</h1>
              <p className="text-muted-foreground">Configure application settings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Back to App
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <FlightOpsConfigPanel />
      </div>
    </div>
  );
}
