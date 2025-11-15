import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Snowflake, AlertTriangle, Search } from 'lucide-react';
import { LeadProfileDrawer } from './LeadProfileDrawer';

export function SalesLeadTable() {
  // Extensive mock demo data - showcasing full pipeline
  const leads = [
    {
      id: '1',
      full_name: 'Dr. Richard Patterson',
      email: 'rpatterson@healthcorp.com',
      company: 'HealthCorp Medical',
      aircraft_interest: ['SF50'],
      status: 'negotiating',
      probability_score: 92,
      temperature: 'hot',
      email_opens: 23,
      calculator_opens: 47,
      call_duration_minutes: 340,
      last_contact_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Medical Professional - High Net Worth',
      profession: 'Physician',
      age_range: '45-54',
      estimated_value: 3500000,
      customer_type: 'active_owner',
      total_lifetime_value: 4450000, // Previous SR22T + current interest
      relationship_count: 2,
    },
    {
      id: '2',
      full_name: 'Paul Stevenson',
      email: 'paul@techventures.io',
      company: 'TechVentures Capital',
      aircraft_interest: ['SF50', 'SR22T'],
      status: 'qualified',
      probability_score: 71,
      temperature: 'warm',
      email_opens: 18,
      calculator_opens: 31,
      call_duration_minutes: 125,
      last_contact_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Tech Executive - Growth Stage',
      profession: 'Business Executive',
      age_range: '35-44',
      estimated_value: 2800000,
      customer_type: 'new_lead',
      influence_score: 88,
      referral_count: 3,
      relationship_count: 4,
    },
    {
      id: '3',
      full_name: 'Jennifer Martinez',
      email: 'jmartinez@realestate.com',
      company: 'Martinez Realty Group',
      aircraft_interest: ['SR22T'],
      status: 'demo_scheduled',
      probability_score: 65,
      temperature: 'warm',
      email_opens: 12,
      calculator_opens: 8,
      call_duration_minutes: 85,
      last_contact_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Real Estate Mogul',
      profession: 'Real Estate',
      age_range: '40-50',
      estimated_value: 950000,
      customer_type: 'past_owner',
      total_lifetime_value: 1750000,
      relationship_count: 3,
    },
    {
      id: '4',
      full_name: 'Robert Chen',
      email: 'rchen@techstartup.com',
      company: 'Chen Tech Solutions',
      aircraft_interest: ['SF50'],
      status: 'closing',
      probability_score: 88,
      temperature: 'hot',
      email_opens: 31,
      calculator_opens: 52,
      call_duration_minutes: 420,
      last_contact_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Tech Founder - Fast Growth',
      profession: 'Entrepreneur',
      age_range: '35-44',
      estimated_value: 3500000,
      relationship_count: 2,
    },
    {
      id: '5',
      full_name: 'Sarah Thompson',
      email: 'sthompson@consulting.com',
      company: 'Thompson Consulting',
      aircraft_interest: ['SR22'],
      status: 'contacted',
      probability_score: 45,
      temperature: 'cold',
      email_opens: 3,
      calculator_opens: 2,
      call_duration_minutes: 15,
      last_contact_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Management Consultant',
      profession: 'Consultant',
      age_range: '35-44',
      estimated_value: 850000,
    },
    {
      id: '6',
      full_name: 'David Wu',
      email: 'dwu@legalfirm.com',
      company: 'Wu & Associates Law',
      aircraft_interest: ['SR22T'],
      status: 'qualified',
      probability_score: 73,
      temperature: 'warm',
      email_opens: 15,
      calculator_opens: 22,
      call_duration_minutes: 180,
      last_contact_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Legal Professional - Partner',
      profession: 'Attorney',
      age_range: '45-54',
      estimated_value: 1050000,
    },
    {
      id: '7',
      full_name: 'Amanda Foster',
      email: 'afoster@investment.com',
      company: 'Foster Capital Management',
      aircraft_interest: ['SF50'],
      status: 'negotiating',
      probability_score: 79,
      temperature: 'hot',
      email_opens: 28,
      calculator_opens: 41,
      call_duration_minutes: 295,
      last_contact_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Investment Manager - Ultra HNW',
      profession: 'Finance',
      age_range: '40-50',
      estimated_value: 3500000,
    },
    {
      id: '8',
      full_name: 'James Rivera',
      email: 'jrivera@construction.com',
      company: 'Rivera Development Corp',
      aircraft_interest: ['SR22T'],
      status: 'demo_scheduled',
      probability_score: 68,
      temperature: 'warm',
      email_opens: 9,
      calculator_opens: 14,
      call_duration_minutes: 95,
      last_contact_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Construction/Development Executive',
      profession: 'Construction',
      age_range: '50-60',
      estimated_value: 1100000,
    },
    {
      id: '9',
      full_name: 'Dr. Emily Zhang',
      email: 'ezhang@dental.com',
      company: 'Zhang Dental Practice',
      aircraft_interest: ['SR22'],
      status: 'qualified',
      probability_score: 58,
      temperature: 'warm',
      email_opens: 11,
      calculator_opens: 16,
      call_duration_minutes: 72,
      last_contact_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Medical Professional - Private Practice',
      profession: 'Dentist',
      age_range: '35-44',
      estimated_value: 850000,
    },
    {
      id: '10',
      full_name: 'Marcus Johnson',
      email: 'mjohnson@energy.com',
      company: 'Johnson Energy Solutions',
      aircraft_interest: ['SF50'],
      status: 'new',
      probability_score: 52,
      temperature: 'warm',
      email_opens: 5,
      calculator_opens: 7,
      call_duration_minutes: 35,
      last_contact_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Energy Sector Executive',
      profession: 'Energy',
      age_range: '45-54',
      estimated_value: 3200000,
      customer_type: 'repeat_customer',
      total_lifetime_value: 4050000, // Previous SR22 + current interest
      relationship_count: 2,
    },
    {
      id: '11',
      full_name: 'Lisa Anderson',
      email: 'landerson@pharma.com',
      company: 'Anderson Pharmaceuticals',
      aircraft_interest: ['SF50'],
      status: 'closing',
      probability_score: 91,
      temperature: 'hot',
      email_opens: 34,
      calculator_opens: 58,
      call_duration_minutes: 445,
      last_contact_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Pharmaceutical Executive',
      profession: 'Pharmaceutical',
      age_range: '50-60',
      estimated_value: 3500000,
    },
    {
      id: '12',
      full_name: 'Tom Bradley',
      email: 'tbradley@insurance.com',
      company: 'Bradley Insurance Group',
      aircraft_interest: ['SR22T'],
      status: 'contacted',
      probability_score: 48,
      temperature: 'cold',
      email_opens: 4,
      calculator_opens: 3,
      call_duration_minutes: 22,
      last_contact_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      persona_type: 'Insurance Agency Owner',
      profession: 'Insurance',
      age_range: '55-65',
      estimated_value: 975000,
    },
  ];

  const loading = false;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const getTemperatureIcon = (temp: string) => {
    switch (temp) {
      case 'hot':
        return <Flame className="w-4 h-4 text-destructive" />;
      case 'cold':
        return <Snowflake className="w-4 h-4 text-primary" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    // All status badges use uniform muted styling
    return 'border-border text-foreground';
  };

  const getProbabilityColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-muted-foreground';
  };

  const filteredLeads = leads.filter(lead => 
    lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading leads...</div>;
  }

  return (
    <>
      <Card>
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Active Pipeline</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Lead</TableHead>
                <TableHead className="min-w-[100px]">Aircraft</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="text-right min-w-[80px]">Score</TableHead>
                <TableHead className="min-w-[140px]">Engagement</TableHead>
                <TableHead className="min-w-[110px]">Last Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {filteredLeads.map((lead) => (
              <TooltipProvider key={lead.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TableRow 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.full_name}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[180px]">
                            {lead.company || lead.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.aircraft_interest?.map((aircraft: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {aircraft}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(lead.status)}>
                          {lead.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-2xl font-bold ${getProbabilityColor(lead.probability_score)}`}>
                          {lead.probability_score}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground whitespace-nowrap">
                          <div>📧 {lead.email_opens} opens</div>
                          <div>🧮 {lead.calculator_opens} views</div>
                          <div>📞 {lead.call_duration_minutes}min calls</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm whitespace-nowrap">
                          {lead.last_contact_date 
                            ? new Date(lead.last_contact_date).toLocaleDateString()
                            : 'Never'}
                        </div>
                      </TableCell>
                    </TableRow>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Temperature:</span>
                    {getTemperatureIcon(lead.temperature)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
              </TableBody>
            </Table>
          </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No leads found matching your search.
          </div>
        )}
      </Card>

      <LeadProfileDrawer 
        lead={selectedLead} 
        onClose={() => setSelectedLead(null)} 
      />
    </>
  );
}