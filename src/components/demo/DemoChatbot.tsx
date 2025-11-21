import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TripData } from '@/types/trip';

// Section-aware normalizer: converts crew response section labels into proper Markdown headings
const normalizeCrewResponseMarkdown = (text: string): string => {
  const lines = text.split('\n');
  const output: string[] = [];
  
  const sectionLabels: Record<string, string> = {
    'summary': '## Summary',
    'regulatory requirements': '## Regulatory Requirements',
    'best practices / sop': '## Best Practices / SOP',
    'best practices/sop': '## Best Practices / SOP',
    'practical rule of thumb': '## Practical Rule of Thumb',
    'takeaway': '## Takeaway',
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();
    
    // Check if this line is a section label (exact match, with colon/dash, or followed by space and content)
    let isHeading = false;
    let headingText = '';
    let remainingContent = '';
    
    for (const [key, heading] of Object.entries(sectionLabels)) {
      if (trimmed === key) {
        isHeading = true;
        headingText = heading;
        break;
      } else if (trimmed.startsWith(key + ':') || trimmed.startsWith(key + ' -') || trimmed.startsWith(key + ' —')) {
        isHeading = true;
        headingText = heading;
        // Extract any content after the colon/dash
        const colonIdx = line.indexOf(':');
        const dashIdx = Math.max(line.indexOf(' -'), line.indexOf(' —'));
        const splitIdx = colonIdx !== -1 ? colonIdx : dashIdx;
        if (splitIdx !== -1 && splitIdx < line.length - 1) {
          remainingContent = line.slice(splitIdx + 1).trim();
        }
        break;
      } else if (trimmed.startsWith(key + ' ')) {
        // Handle "Summary For a 400 nm flight..." case
        isHeading = true;
        headingText = heading;
        // Extract content after the key and space
        const startIdx = line.toLowerCase().indexOf(key) + key.length;
        remainingContent = line.slice(startIdx).trim();
        break;
      }
    }
    
    if (isHeading) {
      // Add blank line before heading if previous line wasn't blank
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      output.push(headingText);
      // Add blank line after heading
      output.push('');
      // If there was content after the label, add it as a new line
      if (remainingContent) {
        output.push(remainingContent);
      }
    } else {
      output.push(line);
    }
  }
  
  return output.join('\n');
};

// Pre-normalize numbering and bullets before any Markdown/rendering
const normalizeListsAndNumbers = (text: string): string => {
  let result = text;

  // 1) Ensure a space after patterns like "1.Fly", "2.Fly", etc.
  //    "2.Fly" -> "2. Fly"
  result = result.replace(/(\d)\.(?=\S)/g, '$1. ');

  // 2) If multiple numbered items are stuck together on one line,
  //    force a newline before each number *except* when it's already
  //    at the start of the line.
  result = result.replace(/(?<!^)(\s*)(\d+\.\s)/gm, '\n$2');

  // 3) Make sure "*" bullets have a space after them: "*Taxi" -> "* Taxi"
  result = result.replace(/\*(?=\S)/g, '* ');

  // 4) If bullets are glued together on the same line,
  //    insert a newline before each "* " when it appears after other text.
  result = result.replace(/([^\n])\s*\*\s/g, '$1\n* ');

  return result;
};

// Fallback formatter: adds paragraph breaks if AI returns long unbroken text
const formatLongText = (text: string): string => {
  // If the text is short, keep it as is
  if (text.length < 300) return text;
  
  // Split on sentence boundaries using lookbehind to keep punctuation attached
  const sentences = text.split(/(?<=[.!?])\s+/);
  let formatted = '';
  let sentenceCount = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    formatted += sentences[i];
    
    // If this is a punctuation mark, increment counter
    if (sentences[i].match(/[.!?]/)) {
      sentenceCount++;
      // Add blank line every 2-3 sentences
      if (sentenceCount % 3 === 0 && i < sentences.length - 1) {
        formatted += '\n\n';
      }
    }
  }
  
  return formatted;
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface DemoChatbotProps {
  tripData?: TripData | null;
}

export const DemoChatbot = ({ tripData }: DemoChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const quickReplies = tripData ? [
    `What are weather conditions at ${tripData.destAirport?.code}?`,
    `Calculate fuel requirements for ${((tripData.originAirport?.distance_nm || 0) + (tripData.destAirport?.distance_nm || 0)).toFixed(0)}nm`,
    `What alternates are available near ${tripData.destAirport?.code}?`,
  ] : [
    'What are alternate requirements for this flight?',
    'Can we accept this dispatch in current weather?',
    'What are the fuel requirements for a 400nm flight?',
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crew-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            tripContext: tripData ? {
              origin: tripData.originAirport?.code,
              destination: tripData.destAirport?.code,
              originHospital: tripData.originHospital,
              destinationHospital: tripData.destinationHospital,
              organType: tripData.missionType?.organ_type,
              successRate: tripData.overallSuccess,
              crew: tripData.crewMembers?.map(c => c.full_name),
              viabilityStatus: tripData.viabilityStatus,
            } : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      // Add initial assistant message
      const assistantTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: assistantTimestamp,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              // Update the last message
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage,
                  timestamp: assistantTimestamp,
                };
                return newMessages;
              });
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':')) continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage,
                  timestamp: assistantTimestamp,
                };
                return newMessages;
              });
            }
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      // Remove the empty assistant message if there was an error
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
  };

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
                <ScrollArea className="h-[500px] p-4" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <Bot className="w-16 h-16 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-semibold mb-1">Ready to Assist</p>
                        <p className="text-sm text-muted-foreground">
                          Ask me anything about PC-24 operations, SOPs, or flight procedures
                        </p>
                      </div>
                    </div>
                  ) : (
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
                            {msg.role === 'assistant' ? (
                              <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-4 prose-p:leading-relaxed prose-ul:my-4 prose-li:my-1.5 prose-headings:mt-5 prose-headings:mb-3 prose-headings:font-semibold prose-strong:font-bold prose-strong:text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                                  {formatLongText(normalizeCrewResponseMarkdown(normalizeListsAndNumbers(msg.content)))}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-line">{msg.content}</p>
                            )}
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
                      
                      {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
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
                      )}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask about SOPs, weather minimums, crew requirements..."
                      className="flex-1"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      disabled={isLoading}
                    />
                    <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
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
                      className="w-full justify-start text-left h-auto py-3 px-3 text-sm whitespace-normal break-words"
                      onClick={() => handleQuickReply(reply)}
                      disabled={isLoading}
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
                    <p className="text-muted-foreground">Real-time web search for current information</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">PC-24 specific operational guidance</p>
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
                    <p className="text-muted-foreground">Airport-specific procedures and restrictions</p>
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
