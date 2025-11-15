import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { FinancingInfoDialog } from './FinancingInfoDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronLeft, ChevronRight, Info, Calculator } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PartnershipInterestForm() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [aircraftPreference, setAircraftPreference] = useState<string[]>(['SR22']);
  const [ownershipShare, setOwnershipShare] = useState<number[]>([1]);
  const [pilotStatus, setPilotStatus] = useState('licensed');
  const [trainingCompletionDate, setTrainingCompletionDate] = useState('');
  const [usageFrequencyDays, setUsageFrequencyDays] = useState(8);
  const [usageSeasonalPattern, setUsageSeasonalPattern] = useState('consistent');
  const [fallWinterDays, setFallWinterDays] = useState(8);
  const [springSummerDays, setSpringSummerDays] = useState(8);
  const [missionProfiles, setMissionProfiles] = useState<string[]>([]);
  const [passengerTypes, setPassengerTypes] = useState<string[]>([]);
  const [typicalPassengerCount, setTypicalPassengerCount] = useState('');
  const [typicalFlyingTime, setTypicalFlyingTime] = useState('both');
  const [schedulingFlexibility, setSchedulingFlexibility] = useState('somewhat_flexible');
  const [sharingComfort, setSharingComfort] = useState('carefully_matched');
  const [leasebackInterest, setLeasebackInterest] = useState('somewhat');
  const [purchaseTimeline, setPurchaseTimeline] = useState('3_6_months');
  const [previousOwner, setPreviousOwner] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredContact, setPreferredContact] = useState('email');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Finance calculator state
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [aircraftCost, setAircraftCost] = useState(800000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(7.5);
  const [loanTermYears, setLoanTermYears] = useState(15);

  const totalSteps = 6;

  // Determine aircraft type for finance dialog
  const getAircraftType = (): 'SR22' | 'SF50' => {
    if (aircraftPreference.includes('SF50')) return 'SF50';
    return 'SR22';
  };

  // Update aircraft cost when aircraft preference changes
  const handleAircraftCostUpdate = () => {
    const type = getAircraftType();
    setAircraftCost(type === 'SR22' ? 800000 : 3500000);
  };

  const handleSubmit = async () => {
    // Calculate scenario data from finance inputs
    const effectiveShare = ownershipShare.length > 0 ? ownershipShare[0] : 1;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTermYears * 12;
    const effectiveCost = aircraftCost * effectiveShare;
    const loanAmount = effectiveCost * (1 - downPaymentPercent / 100);
    const monthlyPayment = monthlyRate > 0 
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmount / numPayments;

    const { data, error } = await supabase.from('partnership_interest_profiles').insert({
      full_name: fullName,
      email,
      phone,
      preferred_contact_method: preferredContact,
      aircraft_preference: aircraftPreference,
      ownership_share_preferences: ownershipShare,
      calculated_aircraft: getAircraftType(),
      calculated_share: effectiveShare,
      calculated_aircraft_cost: effectiveCost,
      calculated_down_payment_percent: downPaymentPercent,
      calculated_loan_term_years: loanTermYears,
      calculated_leaseback_included: leasebackInterest === 'very_interested' || leasebackInterest === 'somewhat',
      calculated_monthly_net_cost: monthlyPayment,
      calculated_monthly_gross_cost: monthlyPayment,
      calculated_equity_3year: (effectiveCost * 0.85) - (effectiveCost * (downPaymentPercent / 100)),
      pilot_status: pilotStatus,
      training_completion_date: trainingCompletionDate || null,
      usage_frequency_days: usageSeasonalPattern === 'custom' ? null : usageFrequencyDays,
      usage_seasonal_pattern: usageSeasonalPattern,
      fall_winter_days: usageSeasonalPattern === 'custom' ? fallWinterDays : null,
      spring_summer_days: usageSeasonalPattern === 'custom' ? springSummerDays : null,
      mission_profiles: missionProfiles,
      passenger_types: passengerTypes,
      typical_passenger_count: typicalPassengerCount,
      leaseback_interest: leasebackInterest,
      typical_flying_time: typicalFlyingTime,
      scheduling_flexibility: schedulingFlexibility,
      sharing_comfort: sharingComfort,
      purchase_timeline: purchaseTimeline,
      previous_aircraft_owner: previousOwner,
      additional_notes: additionalNotes
    }).select().single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSubmitted(true);
      toast({ title: 'Success!', description: 'Your interest has been submitted.' });
      
      // Trigger matching calculation in background
      if (data?.id) {
        supabase.functions.invoke('calculate-matches', {
          body: { profileId: data.id }
        }).catch(err => console.error('Background matching failed:', err));
      }
    }
  };

  if (submitted) {
    return (
      <Card className="p-12 text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold">Thank You!</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          We've received your mission profile and will follow up with tailored ownership opportunities.
        </p>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Mission. Your Cirrus.</h1>
          <p className="text-muted-foreground mb-4">
            Help us understand how you fly so we can connect you to the right ownership path.
          </p>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleAircraftCostUpdate();
                setFinanceDialogOpen(true);
              }}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="text-xs">Ownership Calculator</span>
            </Button>
          </div>
        </div>

            {/* Step 1: Aircraft Preference */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Aircraft Preference</h2>
                <div className="space-y-4">
                  <Label>Which aircraft best fits your flying style?</Label>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="sr22"
                        checked={aircraftPreference.includes('SR22')}
                        onCheckedChange={(checked) => {
                          if (checked) setAircraftPreference([...aircraftPreference, 'SR22']);
                          else setAircraftPreference(aircraftPreference.filter(a => a !== 'SR22'));
                        }}
                      />
                      <Label htmlFor="sr22" className="cursor-pointer font-medium">
                        Cirrus SR22
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="sf50"
                        checked={aircraftPreference.includes('SF50')}
                        onCheckedChange={(checked) => {
                          if (checked) setAircraftPreference([...aircraftPreference, 'SF50']);
                          else setAircraftPreference(aircraftPreference.filter(a => a !== 'SF50'));
                        }}
                      />
                      <Label htmlFor="sf50" className="cursor-pointer font-medium">
                        Vision Jet SF50
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="owners_fleet"
                        checked={aircraftPreference.includes('owners_fleet')}
                        onCheckedChange={(checked) => {
                          if (checked) setAircraftPreference([...aircraftPreference, 'owners_fleet']);
                          else setAircraftPreference(aircraftPreference.filter(a => a !== 'owners_fleet'));
                        }}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="owners_fleet" className="cursor-pointer font-medium">
                          The Founder's Fleet
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Access and ownership across both SF50 Vision Jet and SR22 for unmatched versatility and economic efficiency
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {aircraftPreference.length > 0 && !(aircraftPreference.length === 1 && aircraftPreference.includes('owners_fleet')) && (
                  <div className="space-y-4">
                    <Label>Ownership Share Preference</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="share-1"
                          checked={ownershipShare.includes(1)}
                          onCheckedChange={(checked) => {
                            if (checked) setOwnershipShare([...ownershipShare, 1]);
                            else setOwnershipShare(ownershipShare.filter(s => s !== 1));
                          }}
                        />
                        <Label htmlFor="share-1" className="cursor-pointer">
                          Full Ownership (100%)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="share-0.5"
                          checked={ownershipShare.includes(0.5)}
                          onCheckedChange={(checked) => {
                            if (checked) setOwnershipShare([...ownershipShare, 0.5]);
                            else setOwnershipShare(ownershipShare.filter(s => s !== 0.5));
                          }}
                        />
                        <Label htmlFor="share-0.5" className="cursor-pointer">
                          Half Share (50%)
                        </Label>
                      </div>
                      {aircraftPreference.includes('SF50') && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="share-0.25"
                            checked={ownershipShare.includes(0.25)}
                            onCheckedChange={(checked) => {
                              if (checked) setOwnershipShare([...ownershipShare, 0.25]);
                              else setOwnershipShare(ownershipShare.filter(s => s !== 0.25));
                            }}
                          />
                          <Label htmlFor="share-0.25" className="cursor-pointer">
                            Quarter Share (25%)
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Pilot Status */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Pilot Status</h2>
                <div className="space-y-4">
                  <Label>How will the aircraft be flown?</Label>
                  <RadioGroup value={pilotStatus} onValueChange={setPilotStatus}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="licensed" id="licensed" />
                      <Label htmlFor="licensed" className="cursor-pointer">I'll fly it myself</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="non_pilot" id="not-pilot" />
                      <Label htmlFor="not-pilot" className="cursor-pointer">Professionally Flown</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="in_training" id="training" />
                      <Label htmlFor="training" className="cursor-pointer">Both - I'm a pilot but may want it professionally flown from time to time for myself, family and/or clients</Label>
                    </div>
                  </RadioGroup>

                  {pilotStatus === 'in_training' && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="training-date">Expected Training Completion Date</Label>
                      <Input
                        id="training-date"
                        type="date"
                        value={trainingCompletionDate}
                        onChange={(e) => setTrainingCompletionDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Mission & Usage */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">How Will You Use the Aircraft?</h2>
                
                <div className="space-y-4">
                  <Label>How often will you use the aircraft?</Label>
                  <div className="space-y-3">
                    <RadioGroup value={usageSeasonalPattern} onValueChange={(val) => {
                      setUsageSeasonalPattern(val);
                      if (val === 'custom') {
                        setUsageFrequencyDays(0);
                      }
                    }}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="consistent" id="consistent" />
                        <Label htmlFor="consistent" className="cursor-pointer">Consistent year-round</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="higher_fall_winter" id="fall_winter" />
                        <Label htmlFor="fall_winter" className="cursor-pointer">More in Fall/Winter</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="higher_spring_summer" id="spring_summer" />
                        <Label htmlFor="spring_summer" className="cursor-pointer">More in Spring/Summer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="cursor-pointer">Custom - I'll specify each season</Label>
                      </div>
                    </RadioGroup>

                    {usageSeasonalPattern !== 'custom' ? (
                      <div className="space-y-2 pt-4">
                        <div className="flex justify-between items-center">
                          <Label>Days per month you'll take the airplane</Label>
                          <span className="font-semibold">{usageFrequencyDays} days</span>
                        </div>
                        <Slider 
                          value={[usageFrequencyDays]} 
                          onValueChange={(val) => setUsageFrequencyDays(val[0])}
                          min={1}
                          max={20}
                          step={1}
                          className="flex-1"
                        />
                        <p className="text-xs text-muted-foreground">
                          This helps us understand your expected usage pattern for partnership matching
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label>Fall/Winter days per month</Label>
                            <span className="font-semibold">{fallWinterDays} days</span>
                          </div>
                          <Slider 
                            value={[fallWinterDays]} 
                            onValueChange={(val) => setFallWinterDays(val[0])}
                            min={1}
                            max={20}
                            step={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label>Spring/Summer days per month</Label>
                            <span className="font-semibold">{springSummerDays} days</span>
                          </div>
                          <Slider 
                            value={[springSummerDays]} 
                            onValueChange={(val) => setSpringSummerDays(val[0])}
                            min={1}
                            max={20}
                            step={1}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Primary Mission Profiles (select all that apply)</Label>
                  <div className="space-y-2">
                    {['business_travel', 'family_trips', 'recreation', 'training'].map((mission) => (
                      <div key={mission} className="flex items-center space-x-2">
                        <Checkbox
                          id={mission}
                          checked={missionProfiles.includes(mission)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMissionProfiles([...missionProfiles, mission]);
                            } else {
                              setMissionProfiles(missionProfiles.filter(m => m !== mission));
                            }
                          }}
                        />
                        <Label htmlFor={mission} className="cursor-pointer">
                          {mission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Who typically flies with you? (select all that apply)</Label>
                  <div className="space-y-2">
                    {[
                      { value: 'solo', label: 'Flying Solo' },
                      { value: 'family', label: 'With Family' },
                      { value: 'business_partners', label: 'With Clients/Business Partners' },
                      { value: 'friends', label: 'With Friends' }
                    ].map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={value}
                          checked={passengerTypes.includes(value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPassengerTypes([...passengerTypes, value]);
                            } else {
                              setPassengerTypes(passengerTypes.filter(t => t !== value));
                            }
                          }}
                        />
                        <Label htmlFor={value} className="cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Typical Number of Passengers per Trip</Label>
                  <RadioGroup value={typicalPassengerCount} onValueChange={setTypicalPassengerCount}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="0-1" id="0-1" />
                      <Label htmlFor="0-1" className="cursor-pointer">0-1 passenger</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2-3" id="2-3" />
                      <Label htmlFor="2-3" className="cursor-pointer">2-3 passengers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="4-5" id="4-5" />
                      <Label htmlFor="4-5" className="cursor-pointer">4-5 passengers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="6+" id="6+" />
                      <Label htmlFor="6+" className="cursor-pointer">6+ passengers</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Typical Flying Time</Label>
                  <RadioGroup value={typicalFlyingTime} onValueChange={setTypicalFlyingTime}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekdays" id="weekdays" />
                      <Label htmlFor="weekdays" className="cursor-pointer">Primarily weekdays</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekends" id="weekends" />
                      <Label htmlFor="weekends" className="cursor-pointer">Primarily weekends</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="both" />
                      <Label htmlFor="both" className="cursor-pointer">Both weekdays and weekends</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Step 4: Partnership Preferences */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Partnership Preferences</h2>
                
                <div className="space-y-2">
                  <Label>When you need to fly, how flexible are you?</Label>
                  <p className="text-sm text-muted-foreground">Help us understand your mission criticality</p>
                  <RadioGroup value={schedulingFlexibility} onValueChange={setSchedulingFlexibility}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="very_flexible" id="very-flex" />
                      <Label htmlFor="very-flex" className="cursor-pointer">Very flexible - I can adjust my schedule around availability</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="somewhat_flexible" id="some-flex" />
                      <Label htmlFor="some-flex" className="cursor-pointer">Some flexibility - I can plan ahead with notice</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not_flexible" id="need-avail" />
                      <Label htmlFor="need-avail" className="cursor-pointer">Time-critical missions - I need the aircraft when I need it</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Comfort with Sharing</Label>
                  <RadioGroup value={sharingComfort} onValueChange={setSharingComfort}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="multiple_coowners" id="eager" />
                      <Label htmlFor="eager" className="cursor-pointer">Eager to share - love the partnership model</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="carefully_matched" id="careful" />
                      <Label htmlFor="careful" className="cursor-pointer">Open if carefully matched</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one_coowner" id="minimal" />
                      <Label htmlFor="minimal" className="cursor-pointer">Prefer minimal co-owners</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Interested In The Leaseback Program</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The Leaseback Program allows your aircraft to generate revenue by being rented to qualified pilots when you're not using it. This can significantly offset your ownership costs while your plane stays active and maintained.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <RadioGroup value={leasebackInterest} onValueChange={setLeasebackInterest}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="very_interested" id="very-lb" />
                      <Label htmlFor="very-lb" className="cursor-pointer">Very interested</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="somewhat" id="some-lb" />
                      <Label htmlFor="some-lb" className="cursor-pointer">Somewhat interested</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="need_info" id="need-info" />
                      <Label htmlFor="need-info" className="cursor-pointer">Need more information</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not_interested" id="no-lb" />
                      <Label htmlFor="not-interested" className="cursor-pointer">Not interested</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Step 5: Timeline & Flexibility */}
            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Timeline & Experience</h2>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>What's your purchase timeline?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm">
                            Note: New aircraft typically take 1-2 years from order to delivery. Even if you need more time to secure financing, you may want to act now to secure your delivery position.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <RadioGroup value={purchaseTimeline} onValueChange={setPurchaseTimeline}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="immediate" id="immediate" />
                      <Label htmlFor="immediate" className="cursor-pointer">Ready now for the right opportunity</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3_6_months" id="3-6mo" />
                      <Label htmlFor="3-6mo" className="cursor-pointer">Need 3-6 months to prepare financially</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="6_12_months" id="6-12mo" />
                      <Label htmlFor="6-12mo" className="cursor-pointer">Need 6-12 months to prepare financially</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="12_plus_months" id="12plus" />
                      <Label htmlFor="12plus" className="cursor-pointer">Need 1-2 years to prepare financially</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="prev-owner"
                      checked={previousOwner}
                      onCheckedChange={(checked) => setPreviousOwner(checked as boolean)}
                    />
                    <Label htmlFor="prev-owner" className="cursor-pointer">
                      I've owned an aircraft before
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any specific requirements, questions, or preferences we should know about?"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 6: Contact Information */}
            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Contact Method</Label>
                  <RadioGroup value={preferredContact} onValueChange={setPreferredContact}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="contact-email" />
                      <Label htmlFor="contact-email" className="cursor-pointer">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="contact-phone" />
                      <Label htmlFor="contact-phone" className="cursor-pointer">Phone</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={() => setStep(s => Math.max(1, s - 1))} 
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Submit My Interest
            </Button>
          )}
        </div>

        {/* Finance Calculator Dialog */}
        <FinancingInfoDialog
          open={financeDialogOpen}
          onOpenChange={setFinanceDialogOpen}
          aircraftCost={aircraftCost}
          downPaymentPercent={downPaymentPercent}
          interestRate={interestRate}
          loanTermYears={loanTermYears}
          ownershipShare={(ownershipShare.length > 0 ? ownershipShare[0] : 1) as 1 | 0.5 | 0.25}
          aircraftType={getAircraftType()}
          disableShareSelection={false}
          onApplyValues={(values) => {
            setDownPaymentPercent(values.downPaymentPercent);
            setInterestRate(values.interestRate);
            setLoanTermYears(values.loanTermYears);
            // Update ownership share if changed in dialog
            if (!ownershipShare.includes(values.ownershipShare)) {
              setOwnershipShare([values.ownershipShare]);
            }
          }}
        />
      </Card>
    </TooltipProvider>
  );
}
