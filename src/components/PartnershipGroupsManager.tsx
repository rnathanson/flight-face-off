import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Calendar, Plane } from 'lucide-react';

interface PartnershipGroup {
  id: string;
  group_name: string | null;
  aircraft_type: string;
  total_shares_needed: number;
  shares_filled: number;
  status: string;
  aircraft_tail_number: string | null;
  aircraft_order_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  member_profile_ids: string[];
  admin_notes: string | null;
  created_at: string;
}

export function PartnershipGroupsManager() {
  const [groups, setGroups] = useState<PartnershipGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<PartnershipGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    group_name: '',
    aircraft_type: 'SR22',
    total_shares_needed: 1,
    status: 'forming'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    // Mock demo data for partnership groups showcase
    const mockGroups: PartnershipGroup[] = [
      {
        id: '1',
        group_name: 'Bay Area SF50 Partnership',
        aircraft_type: 'SF50',
        total_shares_needed: 1,
        shares_filled: 0.75,
        status: 'forming',
        aircraft_tail_number: null,
        aircraft_order_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        actual_delivery_date: null,
        member_profile_ids: ['1', '2', '3'],
        admin_notes: '3 of 4 members confirmed. Dr. Wilson (weekdays), Sarah Martinez (weekends), Michael Chen (flexible). Seeking 1 more 25% partner. Aircraft ordered, deposit paid.',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        group_name: 'Northern CA SR22T Co-Ownership',
        aircraft_type: 'SR22T',
        total_shares_needed: 1,
        shares_filled: 1,
        status: 'active',
        aircraft_tail_number: 'N422TC',
        aircraft_order_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        actual_delivery_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        member_profile_ids: ['4', '5'],
        admin_notes: 'COMPLETED GROUP: Robert Taylor (attorney, 50%) and Jennifer Lee (real estate, 50%). Aircraft delivered 2 weeks ago. Both using leaseback program. Excellent partnership.',
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        group_name: 'Silicon Valley SF50 Fleet',
        aircraft_type: 'SF50',
        total_shares_needed: 1,
        shares_filled: 0.5,
        status: 'forming',
        aircraft_tail_number: null,
        aircraft_order_date: null,
        expected_delivery_date: null,
        actual_delivery_date: null,
        member_profile_ids: [],
        admin_notes: 'NEW GROUP: Targeting tech executives in Silicon Valley. 2 interested parties at 25% each. Need 2 more members before placing order.',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    setGroups(mockGroups);
  };

  const createGroup = async () => {
    const { error } = await supabase
      .from('partnership_groups')
      .insert({
        ...newGroupData,
        member_profile_ids: []
      });

    if (error) {
      toast({ title: 'Error creating group', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Group created successfully' });
      setIsCreating(false);
      setNewGroupData({
        group_name: '',
        aircraft_type: 'SR22',
        total_shares_needed: 1,
        status: 'forming'
      });
      loadGroups();
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<PartnershipGroup>) => {
    const { error } = await supabase
      .from('partnership_groups')
      .update(updates)
      .eq('id', groupId);

    if (error) {
      toast({ title: 'Error updating group', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Group updated' });
      loadGroups();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      forming: { label: 'Forming', variant: 'secondary' },
      complete: { label: 'Complete', variant: 'default' },
      ordered: { label: 'Ordered', variant: 'default' },
      delivered: { label: 'Delivered', variant: 'default' },
      active: { label: 'Active', variant: 'default' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSharesDisplay = (filled: number, total: number) => {
    const percentage = (filled / total) * 100;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{filled} / {total} shares</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all" 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Partnership Groups</h1>
            <p className="text-muted-foreground">{groups.length} groups total</p>
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Group
        </Button>
      </div>

      {/* Create New Group Form */}
      {isCreating && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Create New Partnership Group</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupData.group_name}
                onChange={(e) => setNewGroupData({ ...newGroupData, group_name: e.target.value })}
                placeholder="e.g., Bahamas Flyers Group"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aircraft-type">Aircraft Type</Label>
              <Select
                value={newGroupData.aircraft_type}
                onValueChange={(value) => setNewGroupData({ ...newGroupData, aircraft_type: value })}
              >
                <SelectTrigger id="aircraft-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SR22">SR22</SelectItem>
                  <SelectItem value="SF50">Vision Jet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total-shares">Total Shares Needed</Label>
              <Input
                id="total-shares"
                type="number"
                value={newGroupData.total_shares_needed}
                onChange={(e) => setNewGroupData({ ...newGroupData, total_shares_needed: Number(e.target.value) })}
                min="1"
                max="4"
                step="0.25"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createGroup}>Create Group</Button>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Groups List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((group) => (
          <Card
            key={group.id}
            className={`p-6 cursor-pointer transition-all hover:shadow-md ${
              selectedGroup?.id === group.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedGroup(group)}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {group.group_name || `${group.aircraft_type} Group`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {group.aircraft_type} • {group.member_profile_ids.length} members
                  </p>
                </div>
                {getStatusBadge(group.status)}
              </div>

              {getSharesDisplay(group.shares_filled, group.total_shares_needed)}

              {group.aircraft_tail_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4" />
                  <span>{group.aircraft_tail_number}</span>
                </div>
              )}

              {group.expected_delivery_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Expected: {new Date(group.expected_delivery_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Group Details */}
      {selectedGroup && (
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">
            {selectedGroup.group_name || `${selectedGroup.aircraft_type} Group`}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={selectedGroup.group_name || ''}
                onChange={(e) => {
                  const updated = { ...selectedGroup, group_name: e.target.value };
                  setSelectedGroup(updated);
                }}
                onBlur={() => updateGroup(selectedGroup.id, { group_name: selectedGroup.group_name })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedGroup.status}
                onValueChange={(value) => {
                  updateGroup(selectedGroup.id, { status: value });
                  setSelectedGroup({ ...selectedGroup, status: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forming">Forming</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aircraft Tail Number</Label>
              <Input
                value={selectedGroup.aircraft_tail_number || ''}
                onChange={(e) => {
                  const updated = { ...selectedGroup, aircraft_tail_number: e.target.value };
                  setSelectedGroup(updated);
                }}
                onBlur={() => updateGroup(selectedGroup.id, { aircraft_tail_number: selectedGroup.aircraft_tail_number })}
                placeholder="N12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Shares Filled</Label>
              <Input
                type="number"
                value={selectedGroup.shares_filled}
                onChange={(e) => {
                  const updated = { ...selectedGroup, shares_filled: Number(e.target.value) };
                  setSelectedGroup(updated);
                }}
                onBlur={() => updateGroup(selectedGroup.id, { shares_filled: selectedGroup.shares_filled })}
                min="0"
                max={selectedGroup.total_shares_needed}
                step="0.25"
              />
            </div>

            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={selectedGroup.aircraft_order_date || ''}
                onChange={(e) => {
                  const updated = { ...selectedGroup, aircraft_order_date: e.target.value };
                  setSelectedGroup(updated);
                }}
                onBlur={() => updateGroup(selectedGroup.id, { aircraft_order_date: selectedGroup.aircraft_order_date })}
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Delivery</Label>
              <Input
                type="date"
                value={selectedGroup.expected_delivery_date || ''}
                onChange={(e) => {
                  const updated = { ...selectedGroup, expected_delivery_date: e.target.value };
                  setSelectedGroup(updated);
                }}
                onBlur={() => updateGroup(selectedGroup.id, { expected_delivery_date: selectedGroup.expected_delivery_date })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Admin Notes</Label>
            <Textarea
              value={selectedGroup.admin_notes || ''}
              onChange={(e) => {
                const updated = { ...selectedGroup, admin_notes: e.target.value };
                setSelectedGroup(updated);
              }}
              onBlur={() => updateGroup(selectedGroup.id, { admin_notes: selectedGroup.admin_notes })}
              rows={4}
              placeholder="Internal notes about this group..."
            />
          </div>
        </Card>
      )}
    </div>
  );
}
