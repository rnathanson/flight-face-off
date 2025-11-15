import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MatchCompatibilityCard } from './MatchCompatibilityCard';
import { calculateCompatibility, findTopMatches, MatchResult } from '@/lib/matchingAlgorithm';
import { Users, Search, Filter, UserPlus, CheckCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface PartnershipProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  aircraft_preference: string[];
  ownership_share_preferences: number[];
  pilot_status: string;
  usage_frequency_days: number | null;
  usage_seasonal_pattern: string | null;
  fall_winter_days: number | null;
  spring_summer_days: number | null;
  purchase_timeline: string;
  leaseback_interest: string;
  typical_flying_time: string;
  scheduling_flexibility: string;
  sharing_comfort: string | null;
  status: string;
  calculated_aircraft: string | null;
  calculated_share: number | null;
  calculated_monthly_net_cost: number | null;
  admin_notes: string | null;
  matched_with: string[] | null;
  created_at: string;
}

export function AdminMatchingDashboard() {
  const [profiles, setProfiles] = useState<PartnershipProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<PartnershipProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PartnershipProfile | null>(null);
  const [topMatches, setTopMatches] = useState<MatchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aircraftFilter, setAircraftFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, statusFilter, aircraftFilter]);

  useEffect(() => {
    if (selectedProfile) {
      calculateMatches();
    }
  }, [selectedProfile, profiles]);

  const loadProfiles = async () => {
    setLoading(true);
    
    // Mock demo data for co-ownership matching showcase
    const mockProfiles: PartnershipProfile[] = [
      {
        id: '1',
        full_name: 'Dr. James Wilson',
        email: 'jwilson@medical.com',
        phone: '415-555-0101',
        aircraft_preference: ['SF50'],
        ownership_share_preferences: [0.25, 0.33],
        pilot_status: 'current_pilot',
        usage_frequency_days: 40,
        usage_seasonal_pattern: 'balanced',
        fall_winter_days: 20,
        spring_summer_days: 20,
        purchase_timeline: '3_months',
        leaseback_interest: 'no',
        typical_flying_time: 'weekdays',
        scheduling_flexibility: 'flexible',
        sharing_comfort: 'comfortable',
        status: 'active',
        calculated_aircraft: 'SF50',
        calculated_share: 0.25,
        calculated_monthly_net_cost: 8500,
        admin_notes: 'Medical professional, prefers weekday flying. Excellent credit.',
        matched_with: ['2', '3'],
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        full_name: 'Sarah Martinez',
        email: 'smartinez@tech.com',
        phone: '650-555-0202',
        aircraft_preference: ['SF50'],
        ownership_share_preferences: [0.25],
        pilot_status: 'current_pilot',
        usage_frequency_days: 35,
        usage_seasonal_pattern: 'summer_heavy',
        fall_winter_days: 12,
        spring_summer_days: 23,
        purchase_timeline: '3_months',
        leaseback_interest: 'maybe',
        typical_flying_time: 'weekends',
        scheduling_flexibility: 'very_flexible',
        sharing_comfort: 'comfortable',
        status: 'active',
        calculated_aircraft: 'SF50',
        calculated_share: 0.25,
        calculated_monthly_net_cost: 8200,
        admin_notes: 'Tech executive, weekend flyer. Complements Dr. Wilson perfectly.',
        matched_with: ['1', '3'],
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        full_name: 'Michael Chen',
        email: 'mchen@investment.com',
        phone: '408-555-0303',
        aircraft_preference: ['SF50'],
        ownership_share_preferences: [0.25, 0.5],
        pilot_status: 'current_pilot',
        usage_frequency_days: 30,
        usage_seasonal_pattern: 'balanced',
        fall_winter_days: 15,
        spring_summer_days: 15,
        purchase_timeline: '3_months',
        leaseback_interest: 'no',
        typical_flying_time: 'flexible',
        scheduling_flexibility: 'flexible',
        sharing_comfort: 'comfortable',
        status: 'active',
        calculated_aircraft: 'SF50',
        calculated_share: 0.25,
        calculated_monthly_net_cost: 8800,
        admin_notes: 'Investment manager, flexible schedule. Great addition to group.',
        matched_with: ['1', '2'],
        created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '4',
        full_name: 'Robert Taylor',
        email: 'rtaylor@legal.com',
        phone: '925-555-0404',
        aircraft_preference: ['SR22T'],
        ownership_share_preferences: [0.5],
        pilot_status: 'current_pilot',
        usage_frequency_days: 50,
        usage_seasonal_pattern: 'balanced',
        fall_winter_days: 25,
        spring_summer_days: 25,
        purchase_timeline: '6_months',
        leaseback_interest: 'yes',
        typical_flying_time: 'flexible',
        scheduling_flexibility: 'flexible',
        sharing_comfort: 'comfortable',
        status: 'active',
        calculated_aircraft: 'SR22T',
        calculated_share: 0.5,
        calculated_monthly_net_cost: 4200,
        admin_notes: 'Attorney, looking for SR22T partnership. Open to leaseback.',
        matched_with: ['5'],
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '5',
        full_name: 'Jennifer Lee',
        email: 'jlee@realestate.com',
        phone: '510-555-0505',
        aircraft_preference: ['SR22T'],
        ownership_share_preferences: [0.5],
        pilot_status: 'current_pilot',
        usage_frequency_days: 45,
        usage_seasonal_pattern: 'balanced',
        fall_winter_days: 22,
        spring_summer_days: 23,
        purchase_timeline: '6_months',
        leaseback_interest: 'yes',
        typical_flying_time: 'weekdays',
        scheduling_flexibility: 'moderate',
        sharing_comfort: 'comfortable',
        status: 'active',
        calculated_aircraft: 'SR22T',
        calculated_share: 0.5,
        calculated_monthly_net_cost: 4500,
        admin_notes: 'Real estate professional. Perfect match with Robert Taylor.',
        matched_with: ['4'],
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '6',
        full_name: 'David Brown',
        email: 'dbrown@consulting.com',
        phone: '707-555-0606',
        aircraft_preference: ['SR22'],
        ownership_share_preferences: [1],
        pilot_status: 'current_pilot',
        usage_frequency_days: 80,
        usage_seasonal_pattern: 'balanced',
        fall_winter_days: 40,
        spring_summer_days: 40,
        purchase_timeline: '1_month',
        leaseback_interest: 'no',
        typical_flying_time: 'flexible',
        scheduling_flexibility: 'flexible',
        sharing_comfort: 'prefer_sole',
        status: 'active',
        calculated_aircraft: 'SR22',
        calculated_share: 1,
        calculated_monthly_net_cost: 3200,
        admin_notes: 'Sole ownership preferred. High usage.',
        matched_with: null,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    setProfiles(mockProfiles);
    setLoading(false);
  };

  const filterProfiles = () => {
    let filtered = profiles;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.full_name.toLowerCase().includes(term) || 
        p.email.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (aircraftFilter !== 'all') {
      filtered = filtered.filter(p => p.aircraft_preference.includes(aircraftFilter));
    }

    setFilteredProfiles(filtered);
  };

  const calculateMatches = () => {
    if (!selectedProfile) return;

    const otherProfiles = profiles.filter(p => p.id !== selectedProfile.id);
    const matches = findTopMatches(selectedProfile as any, otherProfiles as any, 10);
    setTopMatches(matches);
  };

  const updateProfileStatus = async (profileId: string, newStatus: string) => {
    const { error } = await supabase
      .from('partnership_interest_profiles')
      .update({ status: newStatus })
      .eq('id', profileId);

    if (error) {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status updated successfully' });
      loadProfiles();
    }
  };

  const updateAdminNotes = async (profileId: string, notes: string) => {
    const { error } = await supabase
      .from('partnership_interest_profiles')
      .update({ admin_notes: notes })
      .eq('id', profileId);

    if (error) {
      toast({ title: 'Error saving notes', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Notes saved' });
      loadProfiles();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      new: { label: 'New', variant: 'default' },
      contacted: { label: 'Contacted', variant: 'secondary' },
      qualified: { label: 'Qualified', variant: 'default' },
      matched: { label: 'Matched', variant: 'default' },
      in_group: { label: 'In Group', variant: 'default' },
      archived: { label: 'Archived', variant: 'outline' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading profiles...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Partnership Matching</h1>
            <p className="text-muted-foreground">{profiles.length} total profiles</p>
          </div>
        </div>
        <Button onClick={loadProfiles}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="in_group">In Group</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by aircraft" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Aircraft</SelectItem>
              <SelectItem value="SR22">SR22</SelectItem>
              <SelectItem value="SF50">Vision Jet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-semibold">Profiles ({filteredProfiles.length})</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredProfiles.map((profile) => (
              <Card
                key={profile.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedProfile?.id === profile.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedProfile(profile)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                    {getStatusBadge(profile.status)}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">{profile.calculated_aircraft || profile.aircraft_preference[0]}</Badge>
                    <Badge variant="outline">
                      {profile.calculated_share === 1 ? 'Full' : 
                       profile.calculated_share === 0.5 ? '1/2' : 
                       profile.calculated_share === 0.25 ? '1/4' : 'Flexible'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Profile Details & Matches */}
        <div className="lg:col-span-2">
          {selectedProfile ? (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Profile Details</TabsTrigger>
                <TabsTrigger value="matches">Top Matches ({topMatches.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedProfile.full_name}</h2>
                      <p className="text-muted-foreground">{selectedProfile.email}</p>
                      {selectedProfile.phone && <p className="text-sm">{selectedProfile.phone}</p>}
                    </div>
                    <Select
                      value={selectedProfile.status}
                      onValueChange={(value) => updateProfileStatus(selectedProfile.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="matched">Matched</SelectItem>
                        <SelectItem value="in_group">In Group</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Aircraft</p>
                      <p className="font-medium">{selectedProfile.calculated_aircraft || selectedProfile.aircraft_preference.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ownership Share</p>
                      <p className="font-medium">
                        {selectedProfile.calculated_share === 1 ? 'Full' : 
                         selectedProfile.calculated_share === 0.5 ? '1/2' : 
                         selectedProfile.calculated_share === 0.25 ? '1/4' : 'Flexible'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Usage Frequency</p>
                      <p className="font-medium">
                        {selectedProfile.usage_seasonal_pattern === 'custom' 
                          ? `${selectedProfile.fall_winter_days || 0}/${selectedProfile.spring_summer_days || 0} days (F/W - S/S)`
                          : `${selectedProfile.usage_frequency_days || 0} days/mo`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Net Cost</p>
                      <p className="font-medium">
                        {selectedProfile.calculated_monthly_net_cost 
                          ? `$${Math.round(selectedProfile.calculated_monthly_net_cost).toLocaleString()}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pilot Status</p>
                      <p className="font-medium">{selectedProfile.pilot_status.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Timeline</p>
                      <p className="font-medium">{selectedProfile.purchase_timeline.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Leaseback Interest</p>
                      <p className="font-medium">{selectedProfile.leaseback_interest.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Flying Time</p>
                      <p className="font-medium">{selectedProfile.typical_flying_time}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm text-muted-foreground">Admin Notes</p>
                    <Textarea
                      value={selectedProfile.admin_notes || ''}
                      onChange={(e) => {
                        const updatedProfile = { ...selectedProfile, admin_notes: e.target.value };
                        setSelectedProfile(updatedProfile);
                      }}
                      onBlur={() => updateAdminNotes(selectedProfile.id, selectedProfile.admin_notes || '')}
                      placeholder="Add notes about this prospect..."
                      rows={4}
                    />
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="matches" className="space-y-4">
                {topMatches.length > 0 ? (
                  topMatches.map((match, idx) => {
                    const matchedProfile = profiles.find(p => p.id === match.profile2Id);
                    if (!matchedProfile) return null;
                    return (
                      <MatchCompatibilityCard
                        key={idx}
                        match={match}
                        profile1Name={selectedProfile.full_name}
                        profile2Name={matchedProfile.full_name}
                      />
                    );
                  })
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No compatible matches found</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="p-12 text-center">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg text-muted-foreground">Select a profile to view details and matches</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
