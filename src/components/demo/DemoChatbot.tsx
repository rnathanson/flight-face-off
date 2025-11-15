import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const DemoChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const quickReplies = [
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
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
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
                      className="w-full justify-start text-left h-auto p-3 text-sm"
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
