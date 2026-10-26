import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { AuditIssue, StructureAudit } from '../lib/structureAudit';

interface AuditPanelProps {
  audit: StructureAudit;
  onFocusBeams: (ids: string[]) => void;
  onFocusNodes: (ids: string[]) => void;
}

export function AuditPanel({ audit, onFocusBeams, onFocusNodes }: AuditPanelProps) {
  return (
    <div className="space-y-3">
      <div className={`rounded-lg border px-3 py-3 ${audit.ready ? 'border-pass/40 bg-pass/10' : 'border-warn/40 bg-warn/10'}`}>
        <div className="flex items-center gap-2">
          {audit.ready ? <CheckCircle2 size={17} className="text-pass" /> : <ShieldAlert size={17} className="text-warn" />}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-200">{audit.ready ? 'Input checks passed' : 'Review model inputs'}</h3>
            <p className="mt-1 text-[10px] text-surface-400">{audit.errors} errors · {audit.warnings} warnings</p>
          </div>
        </div>
        <p className="mt-2 pl-6 text-[10px] leading-4 text-surface-400">These checks catch common model input issues. Run the solver to check whether the support layout and geometry are stable.</p>
      </div>
      {audit.issues.length === 0 ? (
        <p className="text-xs text-surface-500">No basic input issues detected; geometric stability is checked separately by the solver.</p>
      ) : (
        <ul className="space-y-2">
          {audit.issues.map((issue) => <IssueCard key={issue.id} issue={issue} onFocus={() => { if (issue.beamIds?.length) onFocusBeams(issue.beamIds); if (issue.nodeIds?.length) onFocusNodes(issue.nodeIds); }} />)}
        </ul>
      )}
    </div>
  );
}

function IssueCard({ issue, onFocus }: { issue: AuditIssue; onFocus: () => void }) {
  const Icon = issue.severity === 'error' ? ShieldAlert : issue.severity === 'warning' ? AlertTriangle : Info;
  const color = issue.severity === 'error' ? 'text-fail border-fail/30 bg-fail/5' : issue.severity === 'warning' ? 'text-warn border-warn/30 bg-warn/5' : 'text-surface-300 border-surface-700 bg-surface-800/50';
  const focusable = Boolean(issue.beamIds?.length || issue.nodeIds?.length);
  return (
    <li className={`rounded-lg border px-3 py-2.5 ${color}`}>
      <button type="button" onClick={onFocus} disabled={!focusable} className="w-full text-left disabled:cursor-default">
        <div className="flex items-start gap-2"><Icon size={14} className="mt-0.5 shrink-0" /><div><div className="text-[11px] font-semibold">{issue.title}</div><p className="mt-1 text-[10px] leading-relaxed opacity-90">{issue.message}</p>{focusable && <span className="mt-1.5 inline-block text-[9px] uppercase tracking-wide opacity-70">Click to highlight</span>}</div></div>
      </button>
    </li>
  );
}
