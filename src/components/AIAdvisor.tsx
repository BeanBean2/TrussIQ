import { AlertTriangle, CheckCircle2, Info, Lightbulb, ShieldAlert } from 'lucide-react';
import type { AIAdviceItem, AIAnalysis } from '../lib/types';

interface AIAdvisorProps {
  analysis: AIAnalysis;
  onFocusBeams?: (ids: string[]) => void;
  onFocusNodes?: (ids: string[]) => void;
}

export function AIAdvisor({ analysis, onFocusBeams, onFocusNodes }: AIAdvisorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Lightbulb size={14} className="text-warn" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          AI Engineering Assistant
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
