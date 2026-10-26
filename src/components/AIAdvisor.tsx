import { AlertTriangle, Bot, CheckCircle2, Info, KeyRound, Lightbulb, Send, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { getLocalCoachReply } from '../lib/aiMessages';
import {
  askGeminiCoach,
  getGeminiApiKey,
  hasGeminiApiKey,
  setGeminiApiKey,
} from '../lib/geminiCoach';
import type { AIAdviceItem, AIAnalysis, Beam, FEAResult, Node } from '../lib/types';

interface AIAdvisorProps {
  analysis: AIAnalysis;
  result: FEAResult | null;
  nodes: Node[];
  beams: Beam[];
  onFocusBeams?: (ids: string[]) => void;
  onFocusNodes?: (ids: string[]) => void;
}

const MAX_CONVERSATION_MESSAGES = 41;
const GREETING =
  'Ask about yield, buckling, deflection, or next steps. With a Gemini API key I use Gemini 3.8 Flash on your solved model; without a key I answer from local engineering rules. Model geometry may be sent to Google only when Gemini is enabled — see PRIVACY.md.';

type CoachMessage = { role: 'user' | 'assistant'; text: string };

export function AIAdvisor(props: AIAdvisorProps) {
  const conversationKey = useMemo(
    () => JSON.stringify([props.nodes, props.beams, props.result, props.analysis]),
    [props.analysis, props.beams, props.nodes, props.result],
  );
  return <AIAdvisorConversation key={conversationKey} {...props} />;
}

function AIAdvisorConversation({
  analysis,
  result,
  nodes,
  beams,
  onFocusBeams,
  onFocusNodes,
}: AIAdvisorProps) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>([
    { role: 'assistant', text: GREETING },
  ]);
  const [busy, setBusy] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(() => hasGeminiApiKey());
  const [showKeyForm, setShowKeyForm] = useState(() => !hasGeminiApiKey());
  const [keyDraft, setKeyDraft] = useState('');
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, busy]);

  const saveKey = (event: FormEvent) => {
    event.preventDefault();
    setGeminiApiKey(keyDraft);
    const ok = hasGeminiApiKey();
    setKeyConfigured(ok);
    setShowKeyForm(!ok);
    setKeyDraft('');
    if (ok) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', text: 'Gemini API key saved locally in this browser. Ask me anything about your truss.' },
      ]);
    }
  };

  const clearKey = () => {
    setGeminiApiKey('');
    setKeyConfigured(false);
    setShowKeyForm(true);
    setMessages((current) => [
      ...current,
      { role: 'assistant', text: 'Gemini key cleared. Paste a new key to keep chatting with Gemini, or I can fall back to local rules.' },
    ]);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;

    setMessages((current) =>
      [...current, { role: 'user' as const, text }].slice(-MAX_CONVERSATION_MESSAGES),
    );
    setQuestion('');
    setBusy(true);

    try {
      let reply: string;
      if (hasGeminiApiKey()) {
        reply = await askGeminiCoach(text, nodes, beams, result, analysis);
      } else {
        reply =
          getLocalCoachReply(text, analysis, result, nodes) +
          '\n\n(Using local rules — add a Gemini API key above for full AI answers.)';
      }
      setMessages((current) =>
        [...current, { role: 'assistant' as const, text: reply }].slice(-MAX_CONVERSATION_MESSAGES),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Gemini request failed.';
      const fallback = getLocalCoachReply(text, analysis, result, nodes);
      setMessages((current) =>
        [
          ...current,
          {
            role: 'assistant' as const,
            text: `Gemini error: ${detail}\n\nLocal fallback:\n${fallback}`,
          },
        ].slice(-MAX_CONVERSATION_MESSAGES),
      );
      if (/api key|API_KEY|401|403|invalid/i.test(detail)) {
        setShowKeyForm(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-accent/25 bg-surface-800/50">
        <div className="flex items-center gap-2 border-b border-surface-700 px-3 py-2.5">
          <Bot size={15} className="text-accent" />
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold text-surface-100">Engineering coach</h3>
            <p className="text-[9px] text-surface-500">
              Local rules always · optional Gemini 3.8 Flash · editing the model resets this chat
            </p>
          </div>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase tracking-wide ${
              keyConfigured
                ? 'border-pass/40 bg-pass/10 text-pass'
                : 'border-surface-600 text-surface-400'
            }`}
          >
            {keyConfigured ? 'Gemini' : 'No key'}
          </span>
        </div>

        {(showKeyForm || !keyConfigured) && (
          <form onSubmit={saveKey} className="space-y-2 border-b border-surface-700 bg-surface-900/60 px-3 py-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-surface-300">
              <KeyRound size={12} className="text-accent" />
              Gemini API key
            </div>
            <p className="text-[9px] leading-relaxed text-surface-500">
              Get a free key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                aistudio.google.com/apikey
              </a>
              . Stored only in this browser (or set <code className="text-surface-400">VITE_GEMINI_API_KEY</code> in{' '}
              <code className="text-surface-400">.env.local</code>).
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder={getGeminiApiKey() ? '•••••••• (enter new key to replace)' : 'Paste Gemini API key'}
                aria-label="Gemini API key"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-2 font-mono text-[10px] text-surface-100 outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!keyDraft.trim()}
                className="rounded-lg bg-accent px-3 py-2 text-[10px] font-semibold text-surface-950 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            {keyConfigured && (
              <button
                type="button"
                onClick={clearKey}
                className="text-[9px] text-surface-500 underline hover:text-fail"
              >
                Clear saved key
              </button>
            )}
          </form>
        )}

        {keyConfigured && !showKeyForm && (
          <div className="flex justify-end border-b border-surface-700 px-3 py-1">
            <button
              type="button"
              onClick={() => setShowKeyForm(true)}
              className="text-[9px] text-surface-500 hover:text-accent"
            >
              Change API key
            </button>
          </div>
        )}

        <div
          ref={conversationRef}
          className="max-h-72 space-y-2 overflow-y-auto px-3 py-3"
          aria-live="polite"
          aria-label="AI coach conversation"
        >
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <p
                className={`max-w-[92%] whitespace-pre-wrap rounded-xl px-2.5 py-2 text-[10px] leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-accent/15 text-surface-100'
                    : 'border border-surface-700 bg-surface-900/80 text-surface-300'
                }`}
              >
                {message.text}
              </p>
            </div>
          ))}
          {busy && (
            <p className="text-[10px] text-accent animate-pulse">Gemini is thinking…</p>
          )}
        </div>

        <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-surface-700 p-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={keyConfigured ? 'Ask Gemini about your analysis…' : 'Ask (local rules until key is set)…'}
            aria-label="Message the AI coach"
            maxLength={500}
            disabled={busy}
            className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-2 text-[10px] text-surface-100 outline-none placeholder:text-surface-500 focus:border-accent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!question.trim() || busy}
            aria-label="Send message"
            title="Send message"
            className="rounded-lg bg-accent p-2 text-surface-950 hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={13} />
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-warn" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
            Analysis findings
          </h3>
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
