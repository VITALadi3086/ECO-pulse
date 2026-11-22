import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Sparkles, Bot, Send, User } from 'lucide-react';
import { PageHeader } from '../components/shared';
import { DemoBadge } from '../components/common';
import { energyService } from '../services/MockEnergyService';
import type { ChatMessage } from '../lib/models';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const SUGGESTED = [
  'Why was my electricity bill higher this month?',
  'Which appliance is costing me the most?',
  'Is my refrigerator consuming more than usual?',
  'How much could I save by reducing AC usage?',
  'Why is my night-time consumption high?',
  'Which appliance should I investigate first?',
];

const PLACEHOLDER_REPLY =
  'Ask EcoPulse AI is not connected yet. When the chatbot backend is integrated, I will analyse your actual consumption data and answer questions like this with real figures. Meanwhile, the Energy Insights pages already show rule-based answers derived from your data.';

export default function AskEcoPulse() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    energyService.getChatHistory().then(setMessages);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput('');
    await energyService.addChatMessage({ role: 'user', text: t });
    // The assistant reply is an explicit placeholder, not fabricated analysis.
    await energyService.addChatMessage({ role: 'assistant', text: PLACEHOLDER_REPLY });
    setMessages(await energyService.getChatHistory());
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PageHeader
        title="Ask EcoPulse"
        description="A conversational assistant that will answer questions about your household's energy using your real data."
        right={<DemoBadge />}
      />

      <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber2-200 bg-amber2-50 p-3.5 text-[13px] leading-relaxed text-amber2-900">
        <Bot className="mt-0.5 h-4.5 w-4.5 shrink-0" />
        <p>
          <strong>Chatbot coming soon.</strong> Ask EcoPulse AI activates when the chatbot backend is connected. Anything you
          type now is saved as demo history and answered with this placeholder — not with fabricated AI analysis.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card shadow-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-forest-100 text-forest-700">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold">Ask about your household's energy</h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Start with one of the suggested questions below, or type your own.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn('flex items-start gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  m.role === 'user' ? 'bg-forest-100 text-forest-800' : 'bg-forest-700 text-white',
                )}
              >
                {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              </span>
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed',
                  m.role === 'user' ? 'bg-forest-700 text-white' : 'border bg-muted/50 text-foreground',
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-forest-400 hover:text-forest-800"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your bill, an appliance, savings…"
            />
            <Button type="submit" size="icon" aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
