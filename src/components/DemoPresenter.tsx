import { CheckCircle2, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { useId } from 'react';
import {
  DEMO_MODEL_NAME,
  DEMO_STEPS,
  formatUtilization,
  type DemoDesignChangeResult,
} from '../lib/demoMode';
import type { FEAResult } from '../lib/types';

export interface DemoPresenterProps {
  active: boolean;
  stepIndex: number;
  onStepIndex: (index: number) => void;
  result: FEAResult | null;
  baselineUtilization: number | null;
  designChange: DemoDesignChangeResult | null;
  onMeetReady: () => void;
  onRunFea: () => void;
  onApplyDesignChange: () => void;
  onCompareSolve: () => void;
  onResetDemo: () => void;
  onExit: () => void;
}

/** stepIndex === DEMO_STEPS.length means the compare beat is finished. */
export function DemoPresenter({
  active,
  stepIndex,
  onStepIndex,
  result,
  baselineUtilization,
  designChange,
  onMeetReady,
  onRunFea,
  onApplyDesignChange,
  onCompareSolve,
  onResetDemo,
  onExit,
}: DemoPresenterProps) {
  const titleId = useId();
  const done = stepIndex >= DEMO_STEPS.length;
  const step = DEMO_STEPS[Math.min(stepIndex, DEMO_STEPS.length - 1)];
  const progress = done ? 100 : ((stepIndex + 1) / DEMO_STEPS.length) * 100;

  if (!active) return null;

  const runPrimary = () => {
    if (done) {
      onResetDemo();
      return;
    }
    switch (step.id) {
      case 'meet':
        onMeetReady();
        onStepIndex(1);
        break;
      case 'solve':
        onRunFea();
        onStepIndex(2);
        break;
      case 'read':
        onStepIndex(3);
        break;
      case 'change':
        onApplyDesignChange();
        onStepIndex(4);
        break;
      case 'compare':
        onCompareSolve();
        onStepIndex(DEMO_STEPS.length);
        break;
      default:
        break;
    }
  };

  return (
    <section
      className="demo-presenter absolute right-4 top-14 z-30 w-[min(22rem,calc(100%-2rem))] overflow-hidden rounded-2xl border-2 border-accent/50 bg-surface-900/97 shadow-2xl shadow-black/40 backdrop-blur-md"
      aria-labelledby={titleId}
      role="region"
    >
      <header className="flex items-start justify-between gap-2 border-b border-surface-700 bg-accent/10 px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-accent">
            <Sparkles size={14} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Demo Mode</span>
          </div>
          <h2 id={titleId} className="mt-1 text-sm font-semibold text-surface-100">
            {done ? 'Demo complete' : step.title}
          </h2>
          <p className="mt-0.5 text-[10px] text-surface-400">
            {DEMO_MODEL_NAME}
            {!done && ` · Step ${stepIndex + 1} of ${DEMO_STEPS.length}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit Demo Mode"
          className="rounded-md p-1.5 text-surface-500 hover:bg-surface-800 hover:text-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>

      <div
        className="h-1.5 bg-surface-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Demo progress"
      >
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-3 p-3.5">
        {done ? (
          <div className="rounded-xl border border-pass/35 bg-pass/10 p-3" role="status">
            <div className="flex items-center gap-2 text-pass">
              <CheckCircle2 size={16} aria-hidden="true" />
              <p className="text-xs font-semibold">Audience saw FEA + one design change</p>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-surface-300">
              {!result?.success
                ? 'Re-solving after the reinforcement…'
                : (
                  <>
                    Peak utilization{' '}
                    {formatUtilization(baselineUtilization ?? designChange?.previousPeakUtilization)} →{' '}
                    {formatUtilization(result.maxSafetyRatio)}
                    {designChange
                      ? ` after reinforcing ${
                          designChange.beamIds.length > 1
                            ? `${designChange.beamIds.length} peak members`
                            : `member ${designChange.beamId}`
                        }.`
                      : '.'}{' '}
                    Educational estimate only.
                  </>
                )}
            </p>
          </div>
        ) : (
          <>
            <p className="text-[12px] leading-5 text-surface-200">{step.say}</p>
            <p className="rounded-lg border border-surface-700 bg-surface-800/60 px-2.5 py-2 text-[10px] leading-4 text-surface-400">
              <span className="font-semibold text-accent">Learn: </span>
              {step.learn}
            </p>
            {(step.id === 'read' || step.id === 'compare' || step.id === 'change') && (
              <dl className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg border border-surface-700 bg-surface-950/50 p-2">
                  <dt className="text-surface-500">Analysis</dt>
                  <dd className="mt-0.5 font-medium text-surface-100">
                    {result?.success ? 'Solved' : 'Not solved yet'}
                  </dd>
                </div>
                <div className="rounded-lg border border-surface-700 bg-surface-950/50 p-2">
                  <dt className="text-surface-500">Peak util.</dt>
                  <dd className="mt-0.5 font-mono text-accent">
                    {formatUtilization(result?.success ? result.maxSafetyRatio : null)}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runPrimary}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2.5 text-xs font-bold text-surface-950 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
          >
            <Play size={13} fill="currentColor" aria-hidden="true" />
            {done ? 'Replay from start' : step.actionLabel}
          </button>
          {!done && stepIndex > 0 && (
            <button
              type="button"
              onClick={() => onStepIndex(Math.max(0, stepIndex - 1))}
              className="rounded-xl border border-surface-700 px-3 py-2.5 text-xs text-surface-300 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Back
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onResetDemo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-warn/60 bg-warn/15 px-3 py-3 text-sm font-bold uppercase tracking-wide text-warn shadow-lg hover:bg-warn/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
        >
          <RotateCcw size={16} aria-hidden="true" />
          Reset Demo
        </button>
      </div>
    </section>
  );
}
