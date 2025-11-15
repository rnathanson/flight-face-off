import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const DemoChatbot = () => {
  const [messages] = useState<Message[]>([
    {
      role: 'user',
      content: 'Can we land at KRDU with 800ft ceiling and 2SM visibility?',
      timestamp: '14:32',
    },
    {
      role: 'assistant',
      content: 'Yes, you can land at KRDU (Raleigh-Durham International) under these conditions. KRDU has an ILS approach to Runway 5L with minimums of DA 560ft and 1/2SM visibility. Your reported conditions (800ft ceiling and 2SM visibility) exceed these minimums.\n\nPer SOP 4.2.3: When conducting any approach with ceilings below 1000ft, notify dispatch prior to commencing the approach and confirm alternate airport fuel reserves are adequate.\n\nRelevant alternates within 50nm:\n- KHNZ (Henderson-Oxford): ILS RWY 24, DA 558ft\n- KTTA (Sanford-Lee County): ILS RWY 3, DA 478ft',
      timestamp: '14:32',
    },
    {
      role: 'user',
      content: 'What are the duty time limitations for our crew today?',
      timestamp: '14:35',
    },
    {
      role: 'assistant',
      content: 'Based on your crew composition and today\'s schedule:\n\nPer SOP 7.1 - Flight Crew Duty Limitations:\n- Maximum flight duty period: 14 hours from report time\n- Maximum flight time: 8 hours within duty period\n- Minimum rest period: 10 consecutive hours before next duty\n\nYour crew reported at 13:00, giving you a duty period until 03:00 tomorrow. With the estimated 3.5-hour flight time, you have adequate margin.\n\nNote: For organ transport missions, emergency extensions up to 2 hours may be approved by Chief Pilot (SOP 7.1.4) if organ viability is at risk.',
      timestamp: '14:35',
    },
  ]);

  const quickReplies = [
    'What are alternate requirements for this flight?',
    'Can we accept this dispatch in current weather?',
    'What are the fuel requirements?',
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">Flight Crew AI Assistant</CardTitle>
                <Badge className="bg-primary/20 text-primary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Powered by AI
                </Badge>
              </div>
              <CardDescription className="mt-2">
                Ask questions about SOPs, flight rules, and operational procedures
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="border-2">
                <ScrollArea className="h-[500px] p-4">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-line">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {msg.timestamp}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-secondary" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask about SOPs, weather minimums, crew requirements..."
                      className="flex-1"
                      disabled
                    />
                    <Button disabled>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Demo mode - Full chat functionality available in production
                  </p>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickReplies.map((reply, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3 text-sm"
                      disabled
                    >
                      {reply}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Capabilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">Instant access to all SOPs and flight rules</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">Context-aware of current dispatch details</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">Weather minimums and alternate requirements</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">Duty time and crew rest calculations</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">Airport-specific procedures</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
