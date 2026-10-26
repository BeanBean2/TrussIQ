import { AlertTriangle, Bot, CheckCircle2, Info, Lightbulb, Send, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AIAdviceItem, AIAnalysis, FEAResult, Node } from '../lib/types';
import { getLocalCoachReply } from '../lib/aiMessages';

interface AIAdvisorProps {
  analysis: AIAnalysis;
  result: FEAResult | null;
  nodes: Node[];
  onFocusBeams?: (ids: string[]) => void;
  onFocusNodes?: (ids: string[]) => void;
}

const MAX_CONVERSATION_MESSAGES = 41;
const GREETING = 'Hi! Ask about modeled yield, buckling screening, deflection, or possible next steps. I use local rules and this model’s results.';
type CoachMessage = { role: 'user' | 'assistant'; text: string };

export function AIAdvisor(props: AIAdvisorProps) {
  const conversationKey = useMemo(
    () => JSON.stringify([props.nodes, props.result, props.analysis]),
    [props.analysis, props.nodes, props.result],
  );
  return <AIAdvisorConversation key={conversationKey} {...props} />;
}

function AIAdvisorConversation({ analysis, result, nodes, onFocusBeams, onFocusNodes }: AIAdvisorProps) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>([
    { role: 'assistant', text: GREETING },
  ]);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages]);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    const reply = getLocalCoachReply(text, analysis, result, nodes);
    setMessages((current) => [
      ...current,
      { role: 'user' as const, text },
      { role: 'assistant' as const, text: reply },
    ].slice(-MAX_CONVERSATION_MESSAGES));
    setQuestion('');
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-accent/25 bg-surface-800/50">
        <div className="flex items-center gap-2 border-b border-surface-700 px-3 py-2.5">
          <Bot size={15} className="text-accent" />
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold text-surface-100">AI message coach</h3>
            <p className="text-[9px] text-surface-500">Local rules and latest solved results · editing the model resets this chat</p>
          </div>
          <span className="rounded-full border border-surface-600 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-surface-400">Rule-based</span>
        </div>

        <div ref={conversationRef} className="max-h-72 space-y-2 overflow-y-auto px-3 py-3" aria-live="polite" aria-label="AI coach conversation">
          {messages.map((message, index) => (
            <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-[92%] whitespace-pre-wrap rounded-xl px-2.5 py-2 text-[10px] leading-relaxed ${message.role === 'user' ? 'bg-accent/15 text-surface-100' : 'border border-surface-700 bg-surface-900/80 text-surface-300'}`}>
                {message.text}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-surface-700 p-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your analysis..."
            aria-label="Message the AI coach"
            maxLength={300}
            className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-2 text-[10px] text-surface-100 outline-none placeholder:text-surface-500 focus:border-accent"
          />
          <button type="submit" disabled={!question.trim()} aria-label="Send message" title="Send message" className="rounded-lg bg-accent p-2 text-surface-950 hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-40">
            <Send size={13} />
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-warn" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Analysis findings</h3>
        </div>

        {analysis.items.length === 0 ? (
          <p className="text-xs text-surface-500">No advice yet.</p>
        ) : (
          <ul className="space-y-2">
            {analysis.items.map((item) => (
              <AdviceCard
                key={item.id}
                item={item}
                onFocus={() => {
                  if (item.beamIds?.length) onFocusBeams?.(item.beamIds);
                  if (item.nodeIds?.length) onFocusNodes?.(item.nodeIds);
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AdviceCard({ item, onFocus }: { item: AIAdviceItem; onFocus: () => void }) {
  const Icon =
    item.severity === 'critical'
      ? ShieldAlert
      : item.severity === 'warning'
        ? AlertTriangle
        : item.severity === 'success'
          ? CheckCircle2
          : Info;

  const colors =
    item.severity === 'critical'
      ? 'border-fail/40 bg-fail/10 text-fail'
      : item.severity === 'warning'
        ? 'border-warn/40 bg-warn/10 text-warn'
        : item.severity === 'success'
          ? 'border-pass/40 bg-pass/10 text-pass'
          : 'border-surface-600 bg-surface-800/60 text-surface-300';

  return (
    <li className={`rounded-lg border px-3 py-2.5 ${colors}`}>
      <button type="button" onClick={onFocus} className="w-full text-left">
        <div className="flex items-start gap-2">
          <Icon size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="text-[11px] font-semibold">{item.title}</div>
            <p className="mt-1 text-[10px] leading-relaxed opacity-90">{item.message}</p>
            {(item.beamIds || item.nodeIds) && (
              <span className="mt-1.5 inline-block text-[9px] uppercase tracking-wide opacity-70">
                Click to highlight
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}
