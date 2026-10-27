import { ArrowRight, LineChart, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { DEMO_MODEL_NAME } from '../lib/demoMode';

interface DemoModeProps {
  onClose: () => void;
  onLaunch: () => void;
}

export function DemoMode({ onClose, onLaunch }: DemoModeProps) {
  const dialogRef = useAccessibleDialog(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Launch Demo Mode"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-accent/40 bg-surface-900 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              <Sparkles size={12} aria-hidden="true" /> Demo Mode · live pitch ready
            </p>
            <h2 className="mt-1 text-xl font-semibold text-surface-100">
              One polished truss · one FEA run · one design change
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-surface-400">
              Instantly loads the {DEMO_MODEL_NAME} with an on-canvas coach. Works on a fresh browser with no saved drafts.
              Use <span className="text-warn font-semibold">Reset Demo</span> anytime to restore the default.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Demo Mode launcher"
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-px bg-surface-700 sm:grid-cols-3">
          <DemoStep
            icon={<Sparkles size={18} />}
            number="01"
            title="Load"
            text="Open a finished Warren classroom bridge — supports, joints, and deck loads already set."
          />
          <DemoStep
            icon={<LineChart size={18} />}
            number="02"
            title="Analyze"
            text="Run one Direct Stiffness Method FEA pass and read forces, utilization, and deflection."
          />
          <DemoStep
            icon={<ArrowRight size={18} />}
            number="03"
            title="Improve"
            text="Reinforce the hottest member, re-solve, and show the utilization drop to the audience."
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-surface-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-[11px] leading-4 text-surface-500">
            <RotateCcw size={14} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            Demo Mode keeps your previous local draft untouched. Reset Demo restores the polished starter instantly.
          </p>
          <button
            type="button"
            onClick={onLaunch}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-surface-950 hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
          >
            <Play size={14} fill="currentColor" aria-hidden="true" /> Launch Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoStep({
  icon,
  number,
  title,
  text,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-surface-900 px-4 py-5">
      <div className="flex items-center justify-between text-accent">
        <span aria-hidden="true">{icon}</span>
        <span className="font-mono text-[10px] text-surface-500">{number}</span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-surface-100">{title}</h3>
      <p className="mt-1.5 text-[11px] leading-relaxed text-surface-400">{text}</p>
    </div>
  );
}
