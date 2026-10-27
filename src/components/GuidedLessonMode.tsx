import {
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  createLessonGeometryOnly,
  createLessonWithSupportsAndLoads,
  GUIDED_LESSON_STEPS,
  isLessonStepComplete,
  summarizeLessonResults,
} from '../lib/guidedLesson';
import type { FEAResult, StructureState } from '../lib/types';

interface GuidedLessonModeProps {
  stepIndex: number;
  onStepIndex: (index: number) => void;
  state: StructureState;
  result: FEAResult | null;
  onApplyState: (next: StructureState) => void;
  onRunSolver: () => void;
  onSetTool: (tool: 'node' | 'beam' | 'force' | 'support' | 'select') => void;
  onClose: () => void;
  onRestart: () => void;
}

export function GuidedLessonMode({
  stepIndex,
  onStepIndex,
  state,
  result,
  onApplyState,
  onRunSolver,
  onSetTool,
  onClose,
  onRestart,
}: GuidedLessonModeProps) {
  const step = GUIDED_LESSON_STEPS[stepIndex] ?? GUIDED_LESSON_STEPS[0];
  const complete = isLessonStepComplete(stepIndex, state, result);
  const progress = ((stepIndex + 1) / GUIDED_LESSON_STEPS.length) * 100;
  const summary = useMemo(() => summarizeLessonResults(result), [result]);

  const applyStepSetup = () => {
    if (stepIndex === 0) {
      onApplyState(createLessonGeometryOnly());
      onSetTool('select');
      return;
    }
    if (stepIndex === 1) {
      onApplyState(createLessonWithSupportsAndLoads(state));
      onSetTool('select');
      return;
    }
    if (stepIndex === 2) {
      onRunSolver();
      onSetTool('select');
      return;
    }
    onSetTool('select');
  };

  const setupLabel =
    stepIndex === 0
      ? 'Set up mini-truss geometry'
      : stepIndex === 1
        ? 'Add supports & sample load'
        : stepIndex === 2
          ? 'Run FEA now'
          : 'Focus inspector / select tool';

  return (
    <aside
      className="pointer-events-auto absolute left-3 top-3 z-30 flex w-[min(22.5rem,calc(100%-1.5rem))] max-h-[min(78vh,40rem)] flex-col overflow-hidden rounded-2xl border border-accent/35 bg-surface-900/96 shadow-2xl shadow-black/35 backdrop-blur-md animate-fade-in"
      aria-label="Guided lesson mode"
    >
      <header className="border-b border-surface-700 px-4 pt-3 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-accent">
            <BookOpenCheck size={16} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Guided lesson</p>
              <p className="text-[10px] text-surface-500">Truss engineering · 4 steps</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-1 rounded-lg border border-warn/40 bg-warn/10 px-2 py-1.5 text-[10px] font-medium text-warn hover:bg-warn/20"
              title="Restart lesson from step 1"
            >
              <RotateCcw size={12} /> Restart Lesson
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close guided lesson"
              className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-800">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={GUIDED_LESSON_STEPS.length}
            aria-label={`Lesson step ${stepIndex + 1} of ${GUIDED_LESSON_STEPS.length}`}
          />
        </div>

        <ol className="mt-3 flex gap-1 pb-3">
          {GUIDED_LESSON_STEPS.map((item, index) => {
            const done = isLessonStepComplete(index, state, result);
            const active = index === stepIndex;
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onStepIndex(index)}
                  className={`flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center transition ${
                    active ? 'bg-accent/15 text-accent' : 'text-surface-500 hover:bg-surface-800 hover:text-surface-300'
                  }`}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Lesson step ${index + 1}: ${item.title}${done ? ' (complete)' : ''}`}
                  title={item.title}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${
                      done
                        ? 'border-pass/50 bg-pass/15 text-pass'
                        : active
                          ? 'border-accent/50 bg-accent/20 text-accent'
                          : 'border-surface-600 text-surface-500'
                    }`}
                  >
                    {done ? <CheckCircle2 size={12} /> : index + 1}
                  </span>
                  <span className="hidden truncate text-[9px] sm:block">{item.title.split(' ')[0]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="font-mono text-[10px] text-surface-500">
          Step {stepIndex + 1} / {GUIDED_LESSON_STEPS.length}
          {complete ? ' · objectives met' : ''}
        </p>
        <h2 className="mt-1 text-base font-semibold text-surface-100">{step.title}</h2>
        <p className="mt-1 text-xs font-medium text-accent">{step.objective}</p>
        <p className="mt-2 text-xs leading-5 text-surface-300">{step.body}</p>
        <p className="mt-3 rounded-lg border border-surface-700 bg-surface-800/70 px-3 py-2 text-[11px] leading-relaxed text-surface-400">
          <Sparkles size={12} className="mr-1 inline text-accent" />
          {step.tip}
        </p>

        <ul className="mt-3 space-y-1.5">
          {step.checklist.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[11px] text-surface-300">
              {complete ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-pass" />
              ) : (
                <Circle size={14} className="mt-0.5 shrink-0 text-surface-600" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {stepIndex === 3 && summary.peakUtilPct !== null && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-surface-700 bg-surface-800/50 p-3 text-[10px]">
            <Stat label="Tension members" value={String(summary.tension)} />
            <Stat label="Compression members" value={String(summary.compression)} />
            <Stat label="Peak utilization" value={`${summary.peakUtilPct.toFixed(1)}%`} />
            <Stat
              label="Yield screen"
              value={summary.passed ? 'Below yield' : 'Exceeded'}
              warn={summary.passed === false}
            />
          </div>
        )}

        <button
          type="button"
          onClick={applyStepSetup}
          className="mt-4 w-full rounded-lg border border-accent/40 bg-accent/10 px-3 py-2.5 text-xs font-semibold text-accent hover:bg-accent/20"
        >
          {setupLabel}
        </button>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-surface-700 px-3 py-2.5">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => onStepIndex(Math.max(0, stepIndex - 1))}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-surface-300 hover:bg-surface-800 disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Back
        </button>
        {stepIndex < GUIDED_LESSON_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => onStepIndex(Math.min(GUIDED_LESSON_STEPS.length - 1, stepIndex + 1))}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-700 px-3 py-2 text-xs font-medium text-surface-100 hover:bg-surface-600"
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-400"
          >
            Finish lesson
          </button>
        )}
      </footer>
    </aside>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-surface-500">{label}</p>
      <p className={`mt-0.5 font-mono text-xs font-semibold ${warn ? 'text-warn' : 'text-surface-100'}`}>{value}</p>
    </div>
  );
}
