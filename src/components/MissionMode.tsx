import { CheckCircle2, Flag, Gauge, RotateCcw, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import type { StructureAudit } from '../lib/structureAudit';
import type { FEAResult, StructureState } from '../lib/types';

interface MissionModeProps {
  state: StructureState;
  result: FEAResult | null;
  audit: StructureAudit;
  onRunSolver: () => void;
  onLoadChallenge: () => void;
  onBrowseChallenges: () => void;
  onClose: () => void;
}

export function MissionMode({
  state,
  result,
  audit,
  onRunSolver,
  onLoadChallenge,
  onBrowseChallenges,
  onClose,
}: MissionModeProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const stable = Boolean(result?.success && !result.unstable);
  const utilization = result?.maxSafetyRatio ?? 1;
  const yieldTargetMet = stable && utilization <= 0.75;
  const efficient = state.beams.length > 0 && state.beams.length <= 14;
  const ready = stable && yieldTargetMet && efficient && audit.errors === 0;
  const score = ready ? 100 : stable ? Math.max(45, Math.round(100 - utilization * 40)) : 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Engineering mission" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Flag size={18} />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Engineering mission</p>
              <h2 className="mt-1 text-lg font-semibold text-surface-100">Build a lighter bridge with a yield margin</h2>
              <p className="mt-1 text-xs text-surface-400">A measurable challenge for your next design iteration.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close mission mode" className="rounded-lg p-2 text-surface-400 hover:bg-surface-800">
            <X size={17} />
          </button>
        </header>

        <div className="grid gap-4 overflow-y-auto p-5 md:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-3">
            <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
              <h3 className="text-sm font-semibold text-surface-100">Mission brief</h3>
              <p className="mt-2 text-xs leading-5 text-surface-300">
                Design a pin-jointed bridge that stays below the modeled yield limit. Use no more than 14 members and keep peak yield utilization below 75%.
              </p>
            </div>
            <div className="space-y-2">
              <Goal done={stable} label="Solver equilibrium" detail={stable ? 'Linear model solved' : 'Run FEA to check stability'} />
              <Goal done={yieldTargetMet} label="Peak yield utilization ≤ 75%" detail={result?.success ? `${(result.maxSafetyRatio * 100).toFixed(0)}% used` : 'No analysis yet'} />
              <Goal done={efficient} label="14 members or fewer" detail={`${state.beams.length} members in current design`} />
              <Goal done={audit.errors === 0} label="No structural audit errors" detail={audit.errors ? `${audit.errors} error(s) found` : 'Geometry is valid'} />
            </div>
          </section>

          <section className="rounded-xl border border-surface-700 bg-surface-800/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-surface-400">Mission score</span>
              <Gauge size={16} className={ready ? 'text-pass' : 'text-warn'} />
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-mono text-5xl font-semibold text-accent">{score}</span>
              <span className="mb-1 text-xs text-surface-500">/ 100</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-700">
              <div className={`h-full rounded-full transition-all duration-500 ${ready ? 'bg-pass' : 'bg-accent'}`} style={{ width: `${score}%` }} />
            </div>
            <p className="mt-4 text-xs leading-5 text-surface-400">
              {ready ? 'Mission complete. Present this design and explain the trade-offs you made.' : 'Iterate on the model, then rerun the analysis to update your score.'}
            </p>
            <p className="mt-2 text-[10px] leading-4 text-surface-500">This learning score checks model stability and yield utilization only. It does not certify buckling, connections, bracing, fatigue, or code compliance.</p>
          </section>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-surface-700 px-5 py-4 sm:flex-row sm:justify-between">
          <button type="button" onClick={onLoadChallenge} className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:border-accent/50 hover:text-accent">
            <RotateCcw size={14} /> Load challenge model
          </button>
          <button type="button" onClick={onBrowseChallenges} className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:border-accent/50 hover:text-accent">Browse 100 investigations</button>
          <button type="button" onClick={onRunSolver} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300">
            <CheckCircle2 size={14} /> Update mission score
          </button>
        </footer>
      </div>
    </div>
  );
}

function Goal({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${done ? 'border-pass/30 bg-pass/10' : 'border-surface-700 bg-surface-800/50'}`}>
      <CheckCircle2 size={16} className={done ? 'text-pass' : 'text-surface-600'} />
      <div className="min-w-0">
        <div className={`text-xs font-medium ${done ? 'text-pass' : 'text-surface-200'}`}>{label}</div>
        <div className="truncate text-[10px] text-surface-500">{detail}</div>
      </div>
    </div>
  );
}
