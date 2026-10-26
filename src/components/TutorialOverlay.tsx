import { BookOpen, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface TutorialOverlayProps {
  onClose: () => void;
  onLoadWarren: () => void;
  onSetTool: (tool: 'node' | 'beam' | 'force' | 'support' | 'select') => void;
  onRunSolver?: () => void;
  firstRun?: boolean;
}

interface Step {
  title: string;
  body: string;
  tip?: string;
  action?: 'warren' | 'tool-node' | 'tool-beam' | 'tool-support' | 'tool-force' | 'tool-select' | 'solve';
}

const STEPS: Step[] = [
  {
    title: 'Welcome to TrussIQ',
    body: 'TrussIQ is a free classroom structural lab: design a pin-jointed truss, run Direct Stiffness Method analysis, and read member forces, stress, and deflection — without expensive FEA software.',
    tip: 'Reopen this tour anytime from the book icon. Secondary tools live under More in the top bar.',
  },
  {
    title: 'The workspace at a glance',
    body: 'Left: drawing tools (Node, Beam, Force, Support). Center: snap-to-grid canvas. Right: inspector for materials, results, checks, and the coach. Top: Run FEA, Presets, Demo, and Impact — Extra tools sit under More.',
  },
  {
    title: 'Place joints',
    body: 'Choose the Node tool (N) and click the canvas to place pin joints. Positions snap to the grid so geometry stays clean.',
    action: 'tool-node',
    tip: 'A typical bridge has a bottom chord of evenly spaced joints and a matching top chord.',
  },
  {
    title: 'Connect members',
    body: 'Choose Beam (B), click a start joint, then an end joint. Each bar carries only axial tension or compression in this educational model.',
    action: 'tool-beam',
  },
  {
    title: 'Start from a template',
    body: 'Prefer a ready-made example? Load a Warren truss with supports and sample loads already applied, then explore the results.',
    action: 'warren',
  },
  {
    title: 'Add supports',
    body: 'Choose Support (S) and click a joint to cycle Pin → Y-roller → X-roller → Fixed. Bridges often use a pin on one end and a roller on the other.',
    action: 'tool-support',
  },
  {
    title: 'Apply loads',
    body: 'Choose Force (F) and click a joint to enter Fx and Fy in newtons. Red arrows show load direction on the canvas.',
    action: 'tool-force',
  },
  {
    title: 'Run the analysis',
    body: 'Click Run FEA in the top bar (or press Space). TrussIQ assembles the stiffness matrix, solves Ku = F, and colors members by yield utilization.',
    action: 'solve',
    tip: 'Green is comfortable, yellow/orange approaches yield, red exceeds the modeled yield limit.',
  },
  {
    title: 'Inspect and improve',
    body: 'Use the inspector’s Results and Checks tabs, toggle deflection in the top bar, and open Formula Inspector on a selected member for the DSM math. The Coach tab offers local tips or Gemini help.',
    action: 'tool-select',
  },
  {
    title: 'You’re ready to design',
    body: 'Change material or section area, try Live auto-solve in the bottom feature bar, and export a PDF or .truss file when you want to share your work.',
    tip: 'Hide the side panels anytime for a wider canvas — the top bar stays on one line.',
  },
];

export function TutorialOverlay({
  onClose,
  onLoadWarren,
  onSetTool,
  onRunSolver,
  firstRun = false,
}: TutorialOverlayProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const runAction = (s: Step) => {
    if (!s.action) return;
    if (s.action === 'warren') onLoadWarren();
    else if (s.action === 'solve') onRunSolver?.();
    else if (s.action === 'tool-node') onSetTool('node');
    else if (s.action === 'tool-beam') onSetTool('beam');
    else if (s.action === 'tool-support') onSetTool('support');
    else if (s.action === 'tool-force') onSetTool('force');
    else if (s.action === 'tool-select') onSetTool('select');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-4 animate-fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="TrussIQ guided tutorial"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-accent/25 bg-surface-900 shadow-2xl"
      >
        <div className="h-1 bg-surface-800">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-2 text-accent">
            {firstRun ? <Sparkles size={18} /> : <BookOpen size={18} />}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {firstRun ? 'First-run guide' : 'Quick tour'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-800"
            aria-label="Close tutorial"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] font-mono text-surface-400">
            Step {step + 1} / {STEPS.length}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-surface-100">{current.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-surface-300">{current.body}</p>
          {current.tip && (
            <p className="mt-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-[11px] leading-relaxed text-surface-400">
              {current.tip}
            </p>
          )}

          {current.action === 'warren' && (
            <button
              type="button"
              onClick={() => runAction(current)}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface-950 hover:bg-teal-400"
            >
              Load Warren Truss
            </button>
          )}
          {current.action === 'solve' && onRunSolver && (
            <button
              type="button"
              onClick={() => runAction(current)}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface-950 hover:bg-teal-400"
            >
              Run FEA now
            </button>
          )}
          {current.action?.startsWith('tool-') && (
            <button
              type="button"
              onClick={() => runAction(current)}
              className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
            >
              Activate suggested tool
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-surface-700 px-5 py-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-surface-300 hover:bg-surface-800 disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                runAction(current);
                setStep((s) => s + 1);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-700 px-4 py-2 text-sm font-medium text-surface-100 hover:bg-surface-600"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface-950"
            >
              Start designing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
