import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Mail, Phone, Briefcase, TrendingUp, MessageSquare, Activity, Users, History } from 'lucide-react';
import { PerDealAIChat } from './PerDealAIChat';
import { PurchaseHistoryTimeline } from './PurchaseHistoryTimeline';
import { NetworkInsightsCard } from './NetworkInsightsCard';
import { RelationshipNetworkTab } from './RelationshipNetworkTab';
import { LeadTypeIndicator } from './LeadTypeIndicator';
import { DealVelocityMeter } from './DealVelocityMeter';

interface LeadProfileDrawerProps {
  lead: any;
  onClose: () => void;
}

export function LeadProfileDrawer({ lead, onClose }: LeadProfileDrawerProps) {
  // Mock relationships data - expanded for more leads
  const mockRelationships = lead?.full_name === 'Marcus Johnson' ? [
    {
      id: '1',
      related_customer: {
        id: 'john-smith-id',
        full_name: 'John Smith',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'friend',
      relationship_strength: 85,
      discovered_method: 'manual_entry',
      notes: 'Close friend who took SF50 delivery 3 months ago (N555JS). Highly satisfied customer.'
    },
    {
      id: '2',
      related_customer: {
        id: 'sarah-thompson-id',
        full_name: 'Sarah Thompson',
        customer_type: 'new_lead',
        aircraft_interest: ['SR22']
      },
      relationship_type: 'same_ctc',
      ctc_location: 'Dallas Love Field (KDAL)',
      relationship_strength: 65,
      discovered_method: 'location_correlation',
      notes: 'Both hangar at Atlantic Aviation. Likely discussing aircraft purchases.'
    }
  ] : lead?.full_name === 'Dr. Richard Patterson' ? [
    {
      id: '3',
      related_customer: {
        id: 'robert-chen-id',
        full_name: 'Robert Chen',
        customer_type: 'new_lead',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'same_ctc',
      ctc_location: 'Naples Municipal Airport (APF)',
      relationship_strength: 72,
      discovered_method: 'location_correlation',
      notes: 'Both leads at Naples CTC. Chen is at 88% probability - high network effect.'
    },
    {
      id: '4',
      related_customer: {
        id: 'jennifer-martinez-id',
        full_name: 'Jennifer Martinez',
        customer_type: 'past_owner',
        aircraft_interest: ['SR22T']
      },
      relationship_type: 'same_ctc',
      ctc_location: 'Naples Municipal Airport (APF)',
      relationship_strength: 58,
      discovered_method: 'location_correlation'
    }
  ] : lead?.full_name === 'Paul Stevenson' ? [
    {
      id: '5',
      related_customer: {
        id: 'david-wu-id',
        full_name: 'David Wu',
        customer_type: 'new_lead',
        aircraft_interest: ['SR22T']
      },
      relationship_type: 'referral',
      relationship_strength: 85,
      discovered_method: 'referral_code',
      notes: 'Paul directly referred David. Both in same professional network.'
    },
    {
      id: '6',
      related_customer: {
        id: 'lisa-chang-id',
        full_name: 'Lisa Chang',
        customer_type: 'new_lead',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'business_partner',
      relationship_strength: 92,
      discovered_method: 'ai_detected',
      notes: 'Both work at TechVentures. Same email domain detected.'
    },
    {
      id: '7',
      related_customer: {
        id: 'mike-reynolds-id',
        full_name: 'Mike Reynolds',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'friend',
      relationship_strength: 78,
      discovered_method: 'communication_analysis',
      notes: 'Referenced in email communications. Both attended same industry conference.'
    }
  ] : lead?.full_name === 'Jennifer Martinez' ? [
    {
      id: '8',
      related_customer: {
        id: 'amanda-foster-id',
        full_name: 'Amanda Foster',
        customer_type: 'new_lead',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'friend',
      relationship_strength: 82,
      discovered_method: 'manual_entry',
      notes: 'Both active SF50 owners who fly together frequently.'
    },
    {
      id: '9',
      related_customer: {
        id: 'patterson-id',
        full_name: 'Dr. Richard Patterson',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'same_ctc',
      ctc_location: 'Naples Municipal Airport (APF)',
      relationship_strength: 58,
      discovered_method: 'location_correlation'
    }
  ] : lead?.full_name === 'Robert Chen' ? [
    {
      id: '10',
      related_customer: {
        id: 'patterson-id',
        full_name: 'Dr. Richard Patterson',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'same_ctc',
      ctc_location: 'Naples Municipal Airport (APF)',
      relationship_strength: 72,
      discovered_method: 'location_correlation',
      notes: 'Both hangared at Naples CTC. Patterson is very satisfied SF50 owner.'
    },
    {
      id: '11',
      related_customer: {
        id: 'jennifer-martinez-id',
        full_name: 'Jennifer Martinez',
        customer_type: 'past_owner',
        aircraft_interest: ['SR22T']
      },
      relationship_type: 'same_ctc',
      ctc_location: 'Naples Municipal Airport (APF)',
      relationship_strength: 65,
      discovered_method: 'location_correlation',
      notes: 'Also at Naples CTC. Previous Cirrus owner looking to re-enter.'
    },
    {
      id: '12',
      related_customer: {
        id: 'lisa-chang-id',
        full_name: 'Lisa Chang',
        customer_type: 'new_lead',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'business_partner',
      relationship_strength: 88,
      discovered_method: 'ai_detected',
      notes: 'Tech industry connection. Both in SaaS sector, similar business profiles.'
    }
  ] : lead?.full_name === 'Sarah Thompson' ? [
    {
      id: '13',
      related_customer: {
        id: 'marcus-johnson-id',
        full_name: 'Marcus Johnson',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'same_ctc',
      ctc_location: 'Dallas Love Field (KDAL)',
      relationship_strength: 65,
      discovered_method: 'location_correlation',
      notes: 'Both hangar at Atlantic Aviation KDAL. Marcus is active SR22 owner.'
    },
    {
      id: '14',
      related_customer: {
        id: 'david-wu-id',
        full_name: 'David Wu',
        customer_type: 'new_lead',
        aircraft_interest: ['SR22T']
      },
      relationship_type: 'friend',
      relationship_strength: 55,
      discovered_method: 'communication_analysis',
      notes: 'Professional connection through consulting work.'
    }
  ] : lead?.full_name === 'David Wu' ? [
    {
      id: '15',
      related_customer: {
        id: 'paul-stevenson-id',
        full_name: 'Paul Stevenson',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50', 'SR22T']
      },
      relationship_type: 'referral',
      relationship_strength: 85,
      discovered_method: 'referral_code',
      notes: 'Direct referral from Paul. Strong trust relationship.'
    },
    {
      id: '16',
      related_customer: {
        id: 'sarah-thompson-id',
        full_name: 'Sarah Thompson',
        customer_type: 'new_lead',
        aircraft_interest: ['SR22']
      },
      relationship_type: 'friend',
      relationship_strength: 55,
      discovered_method: 'communication_analysis',
      notes: 'Professional network connection.'
    }
  ] : lead?.full_name === 'Amanda Foster' ? [
    {
      id: '17',
      related_customer: {
        id: 'jennifer-martinez-id',
        full_name: 'Jennifer Martinez',
        customer_type: 'past_owner',
        aircraft_interest: ['SR22T']
      },
      relationship_type: 'friend',
      relationship_strength: 82,
      discovered_method: 'manual_entry',
      notes: 'Close friends. Both interested in SF50 for business use.'
    },
    {
      id: '18',
      related_customer: {
        id: 'robert-chen-id',
        full_name: 'Robert Chen',
        customer_type: 'new_lead',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'business_partner',
      relationship_strength: 70,
      discovered_method: 'ai_detected',
      notes: 'Business network connection. Both tech/investment sector professionals.'
    }
  ] : lead?.full_name === 'Lisa Chang' ? [
    {
      id: '19',
      related_customer: {
        id: 'paul-stevenson-id',
        full_name: 'Paul Stevenson',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50', 'SR22T']
      },
      relationship_type: 'business_partner',
      relationship_strength: 92,
      discovered_method: 'ai_detected',
      notes: 'Business partner at TechVentures. Same email domain.'
    },
    {
      id: '20',
      related_customer: {
        id: 'robert-chen-id',
        full_name: 'Robert Chen',
        customer_type: 'new_lead',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'business_partner',
      relationship_strength: 88,
      discovered_method: 'ai_detected',
      notes: 'Tech industry peers. Both SaaS founders.'
    }
  ] : lead?.full_name === 'Mike Reynolds' ? [
    {
      id: '21',
      related_customer: {
        id: 'paul-stevenson-id',
        full_name: 'Paul Stevenson',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50', 'SR22T']
      },
      relationship_type: 'friend',
      relationship_strength: 78,
      discovered_method: 'communication_analysis',
      notes: 'Industry colleagues who fly together. Mike is satisfied SF50 owner.'
    },
    {
      id: '22',
      related_customer: {
        id: 'patterson-id',
        full_name: 'Dr. Richard Patterson',
        customer_type: 'active_owner',
        aircraft_interest: ['SF50']
      },
      relationship_type: 'friend',
      relationship_strength: 65,
      discovered_method: 'manual_entry',
      notes: 'Both SF50 owners who attend same aviation events.'
    }
  ] : [];

  // Mock purchase history - expanded for more leads
  const mockPurchaseHistory = lead?.full_name === 'Marcus Johnson' ? [
    {
      id: '1',
      purchase_date: '2019-03-15',
      delivery_date: '2019-11-20',
      aircraft_type: 'SR22',
      aircraft_tail_number: 'N842MJ',
      order_value: 850000,
      configuration_changes_count: 7,
      configuration_changes_details: [
        'Changed paint scheme from Blue to Red (Month 2)',
        'Upgraded avionics package (Month 3)',
        'Changed interior leather color (Month 4)',
        'Added air conditioning (Month 5)',
        'Changed paint scheme to Black (Month 6)',
        'Upgraded to premium audio (Month 7)',
        'Final paint change to Silver (Month 8)'
      ],
      delivery_delay_days: 65,
      post_sale_support_tickets: 12,
      post_sale_satisfaction_score: 6.5,
      finicky_score: 78,
      notes: 'Made numerous post-order changes. Delivery delayed by 2+ months due to paint changes. Required extensive hand-holding but did eventually close. High maintenance customer.',
      status: 'delivered'
    }
  ] : lead?.full_name === 'Dr. Richard Patterson' ? [
    {
      id: '2',
      purchase_date: '2021-06-01',
      delivery_date: '2021-10-15',
      aircraft_type: 'SR22T',
      aircraft_tail_number: 'N123RP',
      order_value: 950000,
      configuration_changes_count: 2,
      configuration_changes_details: [
        'Upgraded to premium interior package',
        'Added air conditioning'
      ],
      delivery_delay_days: 15,
      post_sale_support_tickets: 3,
      post_sale_satisfaction_score: 9.5,
      finicky_score: 22,
      notes: 'Smooth transaction. Decisive customer. Excellent experience. Now upgrading to SF50.',
      status: 'active_owner'
    }
  ] : lead?.full_name === 'Jennifer Martinez' ? [
    {
      id: '3',
      purchase_date: '2017-08-20',
      delivery_date: '2018-01-10',
      aircraft_type: 'SR22',
      aircraft_tail_number: 'N777JM',
      order_value: 800000,
      configuration_changes_count: 4,
      configuration_changes_details: [
        'Changed interior from tan to black leather',
        'Upgraded to premium avionics',
        'Added custom paint pinstripe',
        'Added air conditioning'
      ],
      delivery_delay_days: 45,
      post_sale_support_tickets: 6,
      post_sale_satisfaction_score: 7.8,
      finicky_score: 52,
      notes: 'Previous SR22 owner (2017-2022). Sold aircraft when business slowed. Now looking to get back into ownership with SR22T.',
      status: 'delivered'
    }
  ] : lead?.full_name === 'Robert Chen' ? [
    {
      id: '4',
      purchase_date: '2020-02-15',
      delivery_date: '2020-09-10',
      aircraft_type: 'SR22T',
      aircraft_tail_number: 'N220RC',
      order_value: 920000,
      configuration_changes_count: 2,
      configuration_changes_details: [
        'Upgraded to premium avionics package',
        'Added oxygen system'
      ],
      delivery_delay_days: 8,
      post_sale_support_tickets: 2,
      post_sale_satisfaction_score: 9.2,
      finicky_score: 25,
      notes: 'Excellent customer. Tech-savvy, decisive, minimal config changes. Quick decision maker. Now upgrading to SF50 for business expansion.',
      status: 'active_owner'
    }
  ] : lead?.full_name === 'Paul Stevenson' ? [
    {
      id: '5',
      purchase_date: '2018-05-10',
      delivery_date: '2018-11-22',
      aircraft_type: 'SR22',
      aircraft_tail_number: 'N222PS',
      order_value: 840000,
      configuration_changes_count: 3,
      configuration_changes_details: [
        'Upgraded interior to premium leather',
        'Added air conditioning',
        'Custom paint accent stripe'
      ],
      delivery_delay_days: 22,
      post_sale_support_tickets: 4,
      post_sale_satisfaction_score: 8.5,
      finicky_score: 30,
      notes: 'Solid customer experience. Has referred multiple leads (David Wu, Lisa Chang). Now looking to upgrade to SF50 or SR22T.',
      status: 'active_owner'
    }
  ] : lead?.full_name === 'Amanda Foster' ? [
    {
      id: '6',
      purchase_date: '2016-04-18',
      delivery_date: '2016-10-30',
      aircraft_type: 'SR20',
      aircraft_tail_number: 'N620AF',
      order_value: 520000,
      configuration_changes_count: 5,
      configuration_changes_details: [
        'Changed from standard to premium interior',
        'Upgraded avionics mid-build',
        'Changed interior color scheme',
        'Added premium audio system',
        'Modified instrument panel layout'
      ],
      delivery_delay_days: 52,
      post_sale_support_tickets: 8,
      post_sale_satisfaction_score: 8.0,
      finicky_score: 45,
      notes: 'Started with entry-level SR20. Made several changes during build. Positive overall experience. Now ready to upgrade to SF50 for business use.',
      status: 'delivered'
    }
  ] : lead?.full_name === 'Mike Reynolds' ? [
    {
      id: '7',
      purchase_date: '2022-01-15',
      delivery_date: '2022-08-20',
      aircraft_type: 'SF50',
      aircraft_tail_number: 'N850MR',
      order_value: 2950000,
      configuration_changes_count: 1,
      configuration_changes_details: [
        'Added premium interior package'
      ],
      delivery_delay_days: 5,
      post_sale_support_tickets: 1,
      post_sale_satisfaction_score: 9.8,
      finicky_score: 18,
      notes: 'Exceptional customer experience. Smooth transaction from start to finish. Highly satisfied SF50 owner. Advocate for the brand.',
      status: 'active_owner'
    }
  ] : [];

  // Mock network insights - expanded for more leads
  const mockNetworkInsights = lead?.full_name === 'Marcus Johnson' ? [
    {
      type: 'caution' as const,
      priority: 'high' as const,
      message: 'Previous SR22 purchase (2019) had finicky score of 78 (Very High Maintenance). Made 7 configuration changes post-order causing 65-day delivery delay. Expect detailed questions and potential config changes.'
    },
    {
      type: 'social_proof' as const,
      priority: 'high' as const,
      message: 'Close friend John Smith took SF50 delivery 3 months ago (N555JS) and is highly satisfied. Leverage this relationship for social proof and reference.'
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      message: 'Previous deal took 127 days from contact to order. Current deal moving faster (42 days so far) - better decisiveness this time.'
    }
  ] : lead?.full_name === 'Dr. Richard Patterson' ? [
    {
      type: 'network_effect' as const,
      priority: 'high' as const,
      message: '2 other leads at Naples Municipal Airport (Robert Chen, Jennifer Martinez) all in active pipeline. Chen is at 88% probability. They are likely comparing notes - coordinate messaging.'
    },
    {
      type: 'social_proof' as const,
      priority: 'medium' as const,
      message: 'Active SR22T owner since 2021 (N123RP). Excellent previous customer experience (satisfaction 9.5/10, finicky score 22). Natural upgrade path to SF50.'
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      message: 'Customers upgrading from owned SR22T to SF50 have 89% close rate. Average timeline is 45 days from first contact.'
    }
  ] : lead?.full_name === 'Paul Stevenson' ? [
    {
      type: 'influencer' as const,
      priority: 'high' as const,
      message: 'High influence score (88). Has referred 3 qualified leads already (David Wu, Lisa Chang, Mike Reynolds). Natural advocate - consider VIP treatment or referral bonus program.'
    },
    {
      type: 'network_effect' as const,
      priority: 'high' as const,
      message: 'Business partner Lisa Chang also in pipeline. Both work at TechVentures Capital. Joint demo could accelerate both deals.'
    },
    {
      type: 'social_proof' as const,
      priority: 'medium' as const,
      message: 'Friend Mike Reynolds is active SF50 owner and highly satisfied. Use as reference for Paul.'
    }
  ] : lead?.full_name === 'Jennifer Martinez' ? [
    {
      type: 'caution' as const,
      priority: 'medium' as const,
      message: 'Previous SR22 owner (2017-2022, N777JM). Sold aircraft during business downturn. Ensure current financial situation supports purchase before investing heavily in deal.'
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      message: 'Previous purchase had finicky score of 52 (Normal-High). Made 4 config changes with 45-day delivery delay. Set realistic expectations early.'
    },
    {
      type: 'social_proof' as const,
      priority: 'low' as const,
      message: 'Friends with Amanda Foster (active SF50 prospect). Both at Naples CTC and likely discussing aircraft.'
    }
  ] : lead?.full_name === 'Robert Chen' ? [
    {
      type: 'network_effect' as const,
      priority: 'high' as const,
      message: 'At Naples CTC with Dr. Patterson (92% probability, active owner) and Jennifer Martinez (past owner). Strong social proof network at this location.'
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      message: 'Tech founders at 88% probability typically close within 30 days. High engagement (52 calculator opens). Deal velocity looks excellent.'
    }
  ] : lead?.full_name === 'David Wu' ? [
    {
      type: 'social_proof' as const,
      priority: 'high' as const,
      message: 'Referred by Paul Stevenson (high influencer). Paul has 88% influence score. Use Paul as reference and coordinate communication.'
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      message: 'First-time aircraft buyers with direct referrals close at 76% rate. Legal professionals typically thorough in due diligence but decisive.'
    }
  ] : lead?.full_name === 'Sarah Thompson' ? [
    {
      type: 'network_effect' as const,
      priority: 'medium' as const,
      message: 'Same CTC location (Dallas Love Field) as Marcus Johnson (active SR22 owner). Both hangar at Atlantic Aviation.'
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      message: 'Management consultants typically research-oriented. Expect detailed questions. Close rate 62% with avg 65-day sales cycle.'
    }
  ] : lead?.full_name === 'Amanda Foster' ? [
    {
      type: 'social_proof' as const,
      priority: 'high' as const,
      message: 'Previous SR20 owner (2016, N620AF). Satisfaction 8.0/10. Natural upgrade path to SF50 for business expansion.'
    },
    {
      type: 'caution' as const,
      priority: 'medium' as const,
      message: 'Previous purchase had finicky score of 45 (Normal). Made 5 config changes with 52-day delay. Set clear change deadlines early.'
    },
    {
      type: 'network_effect' as const,
      priority: 'medium' as const,
      message: 'Friends with Jennifer Martinez (past owner). Both interested in SF50. Joint demo or group event could work well.'
    }
  ] : lead?.full_name === 'Lisa Chang' ? [
    {
      type: 'network_effect' as const,
      priority: 'high' as const,
      message: 'Business partner with Paul Stevenson (high influencer) at TechVentures Capital. Same email domain. Joint demo recommended.'
    },
    {
      type: 'social_proof' as const,
      priority: 'high' as const,
      message: 'Tech industry connection to Robert Chen (88% probability). Both SaaS founders with similar business profiles.'
    },
    {
      type: 'pattern' as const,
      priority: 'medium' as const,
      message: 'First-time buyers with strong business partner referrals close at 71% rate. Tech sector buyers typically decisive.'
    }
  ] : lead?.full_name === 'Mike Reynolds' ? [
    {
      type: 'social_proof' as const,
      priority: 'high' as const,
      message: 'Active SF50 owner since 2022 (N850MR). Exceptional satisfaction 9.8/10, finicky score 18. Top-tier customer experience. Strong advocate.'
    },
    {
      type: 'influencer' as const,
      priority: 'high' as const,
      message: 'Referenced in Paul Stevenson\'s network. High potential as referral source given excellent ownership experience.'
    },
    {
      type: 'pattern' as const,
      priority: 'low' as const,
      message: 'SF50 owners with satisfaction >9.5 have referred avg 2.8 qualified leads. Consider referral incentive program.'
    }
  ] : [];

  // Mock activities data - lead-specific
  const activities = lead?.full_name === 'Marcus Johnson' ? [
    { 
      id: '1', 
      activity_type: 'calculator_view', 
      description: 'Opened ownership calculator - SF50 configuration (14 times)', 
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sentiment_score: null
    },
    { 
      id: '2', 
      activity_type: 'email_open', 
      description: 'Opened "Vision Jet Safety Record" email 3 times', 
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      sentiment_score: 0.9
    },
    { 
      id: '3', 
      activity_type: 'phone_call', 
      description: 'Inbound call - asked detailed safety questions', 
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
      duration_minutes: 62,
      sentiment_score: 0.55
    },
    { 
      id: '4', 
      activity_type: 'web_page_view', 
      description: 'Visited comparison page SF50 vs competitors 8 times', 
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      sentiment_score: null
    },
  ] : lead?.full_name === 'Dr. Richard Patterson' ? [
    { 
      id: '1', 
      activity_type: 'demo_request', 
      description: 'Requested SF50 demo flight at Naples', 
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      sentiment_score: 0.95
    },
    { 
      id: '2', 
      activity_type: 'email_open', 
      description: 'Opened "SR22T to Vision Jet Upgrade Path" email', 
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      sentiment_score: 0.88
    },
    { 
      id: '3', 
      activity_type: 'phone_call', 
      description: 'Outbound - discussed trade-in value for current SR22T', 
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
      duration_minutes: 28,
      sentiment_score: 0.82
    },
  ] : lead?.full_name === 'Paul Stevenson' ? [
    { 
      id: '1', 
      activity_type: 'brochure_download', 
      description: 'Downloaded SF50 luxury interior brochure', 
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      sentiment_score: null
    },
    { 
      id: '2', 
      activity_type: 'email_open', 
      description: 'Opened "Vision Jet VIP Experience" email', 
      created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      sentiment_score: 0.92
    },
    { 
      id: '3', 
      activity_type: 'phone_call', 
      description: 'Inbound - excited about custom paint options', 
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
      duration_minutes: 35,
      sentiment_score: 0.95
    },
    { 
      id: '4', 
      activity_type: 'referral_made', 
      description: 'Referred business partner Lisa Chang', 
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      sentiment_score: null
    },
  ] : lead?.full_name === 'Jennifer Martinez' ? [
    { 
      id: '1', 
      activity_type: 'calculator_view', 
      description: 'Opened leaseback calculator - SR22T configuration', 
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      sentiment_score: null
    },
    { 
      id: '2', 
      activity_type: 'email_open', 
      description: 'Opened "Financing Options for Returning Owners" email', 
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      sentiment_score: 0.72
    },
    { 
      id: '3', 
      activity_type: 'phone_call', 
      description: 'Inbound - discussed monthly payment concerns', 
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), 
      duration_minutes: 41,
      sentiment_score: 0.58
    },
  ] : lead?.full_name === 'Robert Chen' ? [
    { 
      id: '1', 
      activity_type: 'calculator_view', 
      description: 'Opened ownership calculator - SF50 configuration (6 times)', 
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      sentiment_score: null
    },
    { 
      id: '2', 
      activity_type: 'email_open', 
      description: 'Opened "Vision Jet Performance Data" email twice', 
      created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      sentiment_score: 0.85
    },
    { 
      id: '3', 
      activity_type: 'phone_call', 
      description: 'Inbound - comparing SF50 vs Citation M2', 
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
      duration_minutes: 52,
      sentiment_score: 0.78
    },
  ] : [
    { 
      id: '1', 
      activity_type: 'calculator_view', 
      description: 'Opened ownership calculator - SF50 configuration', 
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sentiment_score: null
    },
    { 
      id: '2', 
      activity_type: 'email_open', 
      description: 'Opened "Vision Jet Performance Guide" email', 
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      sentiment_score: 0.8
    },
    { 
      id: '3', 
      activity_type: 'phone_call', 
      description: 'Inbound call - discussed financing options', 
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
      duration_minutes: 45,
      sentiment_score: 0.65
    },
  ];

  // Mock transcripts data - lead-specific
  const transcripts = lead?.full_name === 'Marcus Johnson' ? [
    {
      id: '1',
      communication_type: 'email',
      direction: 'inbound',
      subject: 'Safety Record Questions',
      summary: 'Customer asking detailed questions about CAPS system, accident history, and safety statistics. Very analytical approach.',
      sentiment_overall: 0.72,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['safety record', 'CAPS deployments', 'accident statistics', 'parachute system'],
    },
    {
      id: '2',
      communication_type: 'phone',
      direction: 'inbound',
      subject: 'Follow-up on safety concerns',
      summary: 'Discussed safety features in depth. Customer needs data-driven reassurance. Hesitant but interested.',
      sentiment_overall: 0.58,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['need more data', 'consult with CFO', 'safety documentation'],
    },
  ] : lead?.full_name === 'Dr. Richard Patterson' ? [
    {
      id: '1',
      communication_type: 'email',
      direction: 'inbound',
      subject: 'Ready to Upgrade from SR22T',
      summary: 'Existing SR22T owner expressing strong interest in upgrading to SF50. Very positive tone, asking about trade-in value.',
      sentiment_overall: 0.92,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['upgrade path', 'trade-in value', 'jet speed', 'delivery timeline'],
    },
    {
      id: '2',
      communication_type: 'phone',
      direction: 'outbound',
      subject: 'Demo Flight Scheduling',
      summary: 'Scheduled demo flight for next week. Customer very enthusiastic and ready to move forward quickly.',
      sentiment_overall: 0.95,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['excited', 'demo next week', 'ready to order'],
    },
  ] : lead?.full_name === 'Paul Stevenson' ? [
    {
      id: '1',
      communication_type: 'email',
      direction: 'inbound',
      subject: 'Custom Paint and Interior Options',
      summary: 'Customer excited about customization possibilities. Mentioned showing aircraft to business partners. Status-conscious buyer.',
      sentiment_overall: 0.94,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['custom paint', 'luxury interior', 'impress clients', 'VIP experience'],
    },
    {
      id: '2',
      communication_type: 'phone',
      direction: 'inbound',
      subject: 'Referral Discussion',
      summary: 'Called to refer business partner Lisa Chang. Very positive experience so far. Natural advocate and influencer.',
      sentiment_overall: 0.96,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['referred colleague', 'love the process', 'premium experience'],
    },
  ] : lead?.full_name === 'Jennifer Martinez' ? [
    {
      id: '1',
      communication_type: 'email',
      direction: 'inbound',
      subject: 'Getting Back into Ownership',
      summary: 'Previous SR22 owner expressing interest in returning to ownership. Cautious about costs given previous business challenges.',
      sentiment_overall: 0.68,
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['monthly payment concerns', 'financing options', 'cost-effective'],
    },
    {
      id: '2',
      communication_type: 'phone',
      direction: 'inbound',
      subject: 'Financing Questions',
      summary: 'Discussed various financing structures and leaseback options to offset costs. Interested but needs financial confidence.',
      sentiment_overall: 0.62,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['monthly payment', 'leaseback revenue', 'down payment'],
    },
  ] : lead?.full_name === 'Robert Chen' ? [
    {
      id: '1',
      communication_type: 'email',
      direction: 'inbound',
      subject: 'SF50 vs Citation M2 Comparison',
      summary: 'Tech executive comparing SF50 with competitors. Detail-oriented, asking about performance specs and operating costs.',
      sentiment_overall: 0.82,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['performance comparison', 'operating costs', 'spec sheet', 'ROI analysis'],
    },
    {
      id: '2',
      communication_type: 'phone',
      direction: 'inbound',
      subject: 'Technical Discussion',
      summary: 'Deep dive into avionics, range calculations, and fuel efficiency. Very knowledgeable buyer doing thorough research.',
      sentiment_overall: 0.78,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['avionics suite', 'fuel burn', 'range with reserves', 'G3000'],
    },
  ] : [
    {
      id: '1',
      communication_type: 'email',
      direction: 'inbound',
      subject: 'SF50 vs SR22T Comparison',
      summary: 'Customer asking about performance differences. Showed strong interest in jet speed for business travel.',
      sentiment_overall: 0.85,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['jet speed', 'business travel', 'time savings'],
    },
    {
      id: '2',
      communication_type: 'phone',
      direction: 'inbound',
      subject: 'Follow-up call',
      summary: 'Discussed financing options and timeline. Customer expressed some concerns about monthly costs but very interested.',
      sentiment_overall: 0.65,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      key_phrases: ['financing', 'monthly payment', 'delivery timeline'],
    },
  ];

  if (!lead) return null;

  return (
    <Sheet open={!!lead} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle className="text-2xl flex-1">{lead.full_name}</SheetTitle>
            <LeadTypeIndicator 
              customerType={mockPurchaseHistory.length > 0 ? 'repeat_customer' : 'new_lead'}
              purchaseCount={mockPurchaseHistory.length}
              lifetimeValue={mockPurchaseHistory.reduce((sum, p) => sum + p.order_value, 0)}
            />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info Card */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm">{lead.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="text-sm">{lead.phone || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Company</div>
                  <div className="text-sm">{lead.company || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Profession</div>
                  <div className="text-sm">{lead.profession || 'N/A'}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Insights Card */}
          <Card className="p-4 bg-gradient-to-br from-jet-color/10 to-sr22-color/10">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              AI Insights
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Probability Score</span>
                <span className="font-bold text-lg">{lead.probability_score}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Persona Type</span>
                <Badge variant="outline">{lead.persona_type || 'Unknown'}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Value</span>
                <span className="font-semibold">
                  ${(lead.estimated_value || 0).toLocaleString()}
                </span>
              </div>
              {lead.recommended_talk_track && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Recommended Talk Track</div>
                  <p className="text-sm">{lead.recommended_talk_track}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Profile Intelligence Card - NEW */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Profile Intelligence</h3>
            <div className="space-y-4">
              {/* Seller-Entered Data */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Manual Entry</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Age:</span> <span className="font-medium">{lead.age_range || '45-54'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span> <span className="font-medium">{lead.location || 'Dallas, TX'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Family:</span> <span className="font-medium">Married, 2 kids</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Flying Hours:</span> <span className="font-medium">850 hrs</span>
                  </div>
                </div>
              </div>

              {/* AI-Derived Behavioral Data */}
              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-primary mb-2">AI-Learned from Behavior</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response Speed:</span>
                    <Badge variant="secondary">Slow (avg 48hrs)</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Engagement Pattern:</span>
                    <Badge variant="secondary">Calculator Heavy</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Communication Style:</span>
                    <Badge variant="secondary">Detail-Oriented</Badge>
                  </div>
                </div>
              </div>

              {/* AI Psychological Insights - Lead Specific */}
              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-primary mb-2">AI Psychological Profile</div>
                <div className="flex flex-wrap gap-2">
                  {lead?.full_name === 'Marcus Johnson' ? (
                    <>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Decision Paralysis
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Safety Concerned
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Risk Averse
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Numbers-Driven
                      </Badge>
                    </>
                  ) : lead?.full_name === 'Dr. Richard Patterson' ? (
                    <>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Confident Buyer
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Experienced Pilot
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Ready to Upgrade
                      </Badge>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Performance Focused
                      </Badge>
                    </>
                  ) : lead?.full_name === 'Paul Stevenson' ? (
                    <>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Status Seeker
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Early Adopter
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Brand Advocate
                      </Badge>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Luxury Oriented
                      </Badge>
                    </>
                  ) : lead?.full_name === 'Jennifer Martinez' ? (
                    <>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Value Hunter
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Cost Conscious
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Returning Customer
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Detail-Oriented
                      </Badge>
                    </>
                  ) : lead?.full_name === 'Robert Chen' ? (
                    <>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Analytical Buyer
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Tech Savvy
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Comparison Shopper
                      </Badge>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        ROI Focused
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Decision Paralysis
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Safety Concerned
                      </Badge>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {lead?.full_name === 'Marcus Johnson' 
                    ? `${lead.full_name.split(' ')[0]} shows hesitation patterns typical of analytical buyers. Prefers data over emotion. Needs reassurance on safety record and ROI justification.`
                    : lead?.full_name === 'Dr. Richard Patterson'
                    ? `${lead.full_name.split(' ')[1]} is an experienced SR22T owner ready for the natural upgrade to SF50. Confident in aviation, focused on performance gains and time savings.`
                    : lead?.full_name === 'Paul Stevenson'
                    ? `${lead.full_name.split(' ')[0]} is excited by luxury and status. Values premium experience and customization. Natural influencer who will advocate for the brand.`
                    : lead?.full_name === 'Jennifer Martinez'
                    ? `${lead.full_name.split(' ')[0]} is budget-conscious but motivated to return to ownership. Needs financial confidence through leaseback and flexible payment options.`
                    : lead?.full_name === 'Robert Chen'
                    ? `${lead.full_name.split(' ')[1]} takes a methodical, data-driven approach. Comparing all options thoroughly. Needs comprehensive spec sheets and performance data.`
                    : `${lead.full_name.split(' ')[0]} shows hesitation patterns typical of analytical buyers. Prefers data over emotion.`
                  }
                </p>
              </div>

              {/* AI-Learned from Communications - Lead Specific */}
              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-primary mb-2">Call & Email Analysis</div>
                <div className="space-y-2 text-sm">
                  {lead?.full_name === 'Marcus Johnson' ? (
                    <>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Primary Concern: Safety</div>
                          <div className="text-xs text-muted-foreground">Mentioned "safety record" 7x in conversations</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Decision Maker: Yes, but consults CFO</div>
                          <div className="text-xs text-muted-foreground">References "running it by Janet" (CFO)</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Business Use: 70% business, 30% personal</div>
                          <div className="text-xs text-muted-foreground">Travels Houston-Midland route frequently</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Dr. Richard Patterson' ? (
                    <>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Primary Concern: Performance Upgrade</div>
                          <div className="text-xs text-muted-foreground">Mentioned "jet speed" and "time savings" 12x</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Decision Maker: Solo decision</div>
                          <div className="text-xs text-muted-foreground">Medical practice owner, makes own aircraft decisions</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Business Use: 85% business, 15% personal</div>
                          <div className="text-xs text-muted-foreground">Multi-clinic practice, flies between locations</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Paul Stevenson' ? (
                    <>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Primary Concern: Customization & Status</div>
                          <div className="text-xs text-muted-foreground">Mentioned "custom paint" and "luxury interior" 9x</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Decision Maker: Yes, excited buyer</div>
                          <div className="text-xs text-muted-foreground">VC principal, wants to impress clients and partners</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Business Use: 60% business, 40% personal</div>
                          <div className="text-xs text-muted-foreground">Coast-to-coast investor meetings, family trips</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Jennifer Martinez' ? (
                    <>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Primary Concern: Monthly Costs</div>
                          <div className="text-xs text-muted-foreground">Mentioned "monthly payment" and "financing" 11x</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Decision Maker: Yes, but cautious</div>
                          <div className="text-xs text-muted-foreground">Business owner, burned before, careful this time</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Business Use: 80% business, 20% personal</div>
                          <div className="text-xs text-muted-foreground">Real estate business, interested in leaseback revenue</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Robert Chen' ? (
                    <>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Primary Concern: Technical Specs & ROI</div>
                          <div className="text-xs text-muted-foreground">Mentioned "performance data" and "operating costs" 14x</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Decision Maker: Yes, but thorough researcher</div>
                          <div className="text-xs text-muted-foreground">Tech exec, comparing SF50 vs Citation M2 vs Phenom 100</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Business Use: 90% business, 10% personal</div>
                          <div className="text-xs text-muted-foreground">AI startup CEO, Silicon Valley to NYC route</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Primary Concern: Safety</div>
                          <div className="text-xs text-muted-foreground">Mentioned "safety record" 7x in conversations</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">Business Use: 70% business, 30% personal</div>
                          <div className="text-xs text-muted-foreground">Business travel focused</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ai">AI Insights</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Deal Velocity Meter */}
              <DealVelocityMeter
                currentDays={45}
                averageDays={89}
                personaType="Medical Professional"
                milestones={{
                  demoScheduled: true,
                  daysToDemo: 10,
                  avgDaysToDemo: 15
                }}
              />
              
              {/* Accordion for collapsible sections */}
              <Accordion type="multiple" defaultValue={[]}>
                {/* Persona Profile Section */}
                <AccordionItem value="persona">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Persona Profile & Look-Alikes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
              
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Persona Profile & Look-Alikes</h3>
                
                {/* Statistical Match - Lead Specific */}
                <div className="mb-4 p-3 bg-primary/5 rounded-lg">
                  {lead?.full_name === 'Marcus Johnson' ? (
                    <>
                      <div className="text-sm font-semibold mb-2">54 deals match this profile</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Close Rate:</div>
                          <div className="font-bold text-lg">67%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg. Days to Close:</div>
                          <div className="font-bold text-lg">89 days</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Dr. Richard Patterson' ? (
                    <>
                      <div className="text-sm font-semibold mb-2">38 deals match this profile (SR22T → SF50 upgrades)</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Close Rate:</div>
                          <div className="font-bold text-lg">89%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg. Days to Close:</div>
                          <div className="font-bold text-lg">45 days</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Paul Stevenson' ? (
                    <>
                      <div className="text-sm font-semibold mb-2">42 deals match this profile (VIP/Status buyers)</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Close Rate:</div>
                          <div className="font-bold text-lg">91%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg. Days to Close:</div>
                          <div className="font-bold text-lg">32 days</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Jennifer Martinez' ? (
                    <>
                      <div className="text-sm font-semibold mb-2">29 deals match this profile (Returning owners)</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Close Rate:</div>
                          <div className="font-bold text-lg">58%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg. Days to Close:</div>
                          <div className="font-bold text-lg">102 days</div>
                        </div>
                      </div>
                    </>
                  ) : lead?.full_name === 'Robert Chen' ? (
                    <>
                      <div className="text-sm font-semibold mb-2">47 deals match this profile (Tech exec jet buyers)</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Close Rate:</div>
                          <div className="font-bold text-lg">72%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg. Days to Close:</div>
                          <div className="font-bold text-lg">68 days</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold mb-2">54 deals match this profile</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Close Rate:</div>
                          <div className="font-bold text-lg">67%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg. Days to Close:</div>
                          <div className="font-bold text-lg">89 days</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Typical Conversion Path - Lead Specific */}
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2">Typical Conversion Path</div>
                  <div className="space-y-2 text-sm">
                    {lead?.full_name === 'Marcus Johnson' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                          <div>Calculator opens (avg 22 times)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                          <div>Demo flight request (day 15-20)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                          <div>Financing discussion (day 30-45)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">4</div>
                          <div>Close (day 75-100)</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Dr. Richard Patterson' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                          <div>Trade-in evaluation (day 1-3)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                          <div>Demo flight (day 5-10)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                          <div>Quick financing approval (day 15-25)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">4</div>
                          <div>Close (day 35-50)</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Paul Stevenson' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                          <div>VIP experience request (day 1)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                          <div>Customization consultation (day 3-7)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                          <div>Demo + factory tour (day 10-15)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">4</div>
                          <div>Quick close (day 25-35)</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Jennifer Martinez' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                          <div>Leaseback calculator (many times)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                          <div>Financing exploration (day 20-40)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                          <div>Demo flight (day 45-60)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">4</div>
                          <div>Close (day 90-110)</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Robert Chen' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                          <div>Competitive analysis (weeks 1-2)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                          <div>Demo flights of all options (weeks 3-4)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                          <div>Deep spec review (weeks 5-6)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">4</div>
                          <div>Close (day 60-75)</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                          <div>Calculator opens (avg 22)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                          <div>Demo flight request (day 15-20)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                          <div>Close (day 75-100)</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* What makes them close faster - Lead Specific */}
                <div className="border-t pt-4">
                  <div className="text-sm font-semibold mb-2">
                    {lead?.full_name === 'Marcus Johnson' 
                      ? 'Faster Closes (avg 62 days) included:'
                      : lead?.full_name === 'Dr. Richard Patterson'
                      ? 'What accelerates upgrades:'
                      : lead?.full_name === 'Paul Stevenson'
                      ? 'What delights VIP buyers:'
                      : lead?.full_name === 'Jennifer Martinez'
                      ? 'What builds financial confidence:'
                      : lead?.full_name === 'Robert Chen'
                      ? 'What satisfies analytical buyers:'
                      : 'Faster Closes (avg 62 days) included:'
                    }
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {lead?.full_name === 'Marcus Johnson' ? (
                      <>
                        <li>• Safety-focused materials sent in first week</li>
                        <li>• CFO included in early conversations</li>
                        <li>• ROI calculator shared with tax benefits highlighted</li>
                        <li>• Peer testimonials from similar industry professionals</li>
                      </>
                    ) : lead?.full_name === 'Dr. Richard Patterson' ? (
                      <>
                        <li>• Quick trade-in appraisal (within 48 hours)</li>
                        <li>• Upgrade path documentation showing time/cost savings</li>
                        <li>• Demo flight scheduled within one week</li>
                        <li>• Testimonials from other SR22T → SF50 upgraders</li>
                      </>
                    ) : lead?.full_name === 'Paul Stevenson' ? (
                      <>
                        <li>• White-glove concierge service from day one</li>
                        <li>• Custom paint/interior consultation immediately</li>
                        <li>• Factory tour with engineering team meet-and-greet</li>
                        <li>• Exclusive delivery event planning</li>
                      </>
                    ) : lead?.full_name === 'Jennifer Martinez' ? (
                      <>
                        <li>• Detailed leaseback revenue projections</li>
                        <li>• Multiple financing structure options</li>
                        <li>• Lower down payment pathways highlighted</li>
                        <li>• Success stories from other returning owners</li>
                      </>
                    ) : lead?.full_name === 'Robert Chen' ? (
                      <>
                        <li>• Comprehensive competitor comparison documents</li>
                        <li>• Detailed operating cost analysis with real data</li>
                        <li>• Technical deep-dive sessions with engineering</li>
                        <li>• Demo flights of SF50 and main competitors</li>
                      </>
                    ) : (
                      <>
                        <li>• Safety-focused materials sent in first week</li>
                        <li>• ROI calculator shared early</li>
                        <li>• Peer testimonials provided</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Look-alike customers - Lead Specific */}
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm font-semibold mb-2">Similar Customers Who Converted</div>
                  <div className="space-y-2">
                    {lead?.full_name === 'Marcus Johnson' ? (
                      <>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Tom Williams - Oil & Gas CEO</div>
                          <div className="text-xs text-muted-foreground">Closed in 71 days • Similar safety concerns • SF50 purchase</div>
                        </div>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Rebecca Martinez - Medical Practice Owner</div>
                          <div className="text-xs text-muted-foreground">Closed in 82 days • Similar route needs • SR22T purchase</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Dr. Richard Patterson' ? (
                      <>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Dr. James Cooper - Surgeon</div>
                          <div className="text-xs text-muted-foreground">Closed in 42 days • SR22T → SF50 upgrade • Very satisfied</div>
                        </div>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Dr. Susan Park - Dental Group Owner</div>
                          <div className="text-xs text-muted-foreground">Closed in 38 days • Multi-location practice • SF50 purchase</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Paul Stevenson' ? (
                      <>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">David Zhang - PE Fund Partner</div>
                          <div className="text-xs text-muted-foreground">Closed in 28 days • Custom paint • Referred 2 colleagues</div>
                        </div>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Alexandra Stone - Tech Founder</div>
                          <div className="text-xs text-muted-foreground">Closed in 31 days • VIP experience • SF50 with full custom interior</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Jennifer Martinez' ? (
                      <>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Carlos Rodriguez - Real Estate Developer</div>
                          <div className="text-xs text-muted-foreground">Closed in 98 days • Returning owner • Leaseback program</div>
                        </div>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Linda Thompson - Previous SR22 Owner</div>
                          <div className="text-xs text-muted-foreground">Closed in 105 days • Similar financial concerns • SR22T purchase</div>
                        </div>
                      </>
                    ) : lead?.full_name === 'Robert Chen' ? (
                      <>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Kevin Li - SaaS CEO</div>
                          <div className="text-xs text-muted-foreground">Closed in 65 days • Compared 4 jets • Chose SF50 for tech/value</div>
                        </div>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Sarah Kim - Fintech Founder</div>
                          <div className="text-xs text-muted-foreground">Closed in 72 days • Deep technical review • SF50 purchase</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          <div className="font-medium">Tom Williams - CEO</div>
                          <div className="text-xs text-muted-foreground">Closed in 71 days • Similar profile • SF50 purchase</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Network Section */}
                {mockRelationships.length > 0 && (
                  <AccordionItem value="network">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Network Connections ({mockRelationships.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <RelationshipNetworkTab 
                        relationships={mockRelationships} 
                        onNavigateToLead={(leadId) => console.log('Navigate to lead:', leadId)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {/* Purchase History Section */}
                {mockPurchaseHistory.length > 0 && (
                  <AccordionItem value="history">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <span>Purchase History ({mockPurchaseHistory.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <PurchaseHistoryTimeline history={mockPurchaseHistory} />
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <PerDealAIChat lead={lead} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border-l-2 border-primary/20 pl-4 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{activity.activity_type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(activity.created_at).toLocaleString()}</span>
                          {activity.sentiment_score && (
                            <Badge variant="outline">Sentiment: {(activity.sentiment_score * 100).toFixed()}%</Badge>
                          )}
                          {activity.duration_minutes && (
                            <span>{activity.duration_minutes} min</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="conversations" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Communication History</h3>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {transcripts.map((transcript) => (
                      <div key={transcript.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{transcript.communication_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(transcript.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {transcript.subject && (
                          <h4 className="font-medium text-sm mb-2">{transcript.subject}</h4>
                        )}
                        <p className="text-sm text-muted-foreground mb-3">{transcript.summary}</p>
                        <div className="flex flex-wrap gap-2">
                          {transcript.key_phrases?.map((phrase, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {phrase}
                            </Badge>
                          ))}
                        </div>
                        {transcript.sentiment_overall && (
                          <div className="mt-2 text-xs">
                            Sentiment: <Badge variant="outline">{(transcript.sentiment_overall * 100).toFixed()}%</Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Relationship Network</h3>
                <RelationshipNetworkTab 
                  relationships={mockRelationships}
                  onNavigateToLead={(leadId) => {
                    console.log('Navigate to lead:', leadId);
                    // In a real app, this would navigate to the related lead
                  }}
                />
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Purchase History</h3>
                {mockPurchaseHistory.length > 0 ? (
                  <PurchaseHistoryTimeline history={mockPurchaseHistory} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No previous purchase history. This is a new customer.
                  </p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="intel" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Network Intelligence</h3>
                <NetworkInsightsCard insights={mockNetworkInsights} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
