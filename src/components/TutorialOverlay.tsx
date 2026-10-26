import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface TutorialOverlayProps {
  onClose: () => void;
  onLoadWarren: () => void;
  onSetTool: (tool: 'node' | 'beam' | 'force' | 'support' | 'select') => void;
}

interface Step {
  title: string;
  body: string;
  action?: 'warren' | 'tool-node' | 'tool-beam' | 'tool-support' | 'tool-force' | 'tool-select';
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Physics Classroom',
    body: 'This guided tour teaches you how to design a classic Warren Truss — a triangular bridge pattern used in real engineering. Follow each step, then explore freely.',
  },
  {
    title: 'What is a Truss?',
    body: 'A truss is a structure made of straight members connected at pin joints. Loads travel as axial tension or compression only — perfect for the Direct Stiffness Method (DSM).',
  },
  {
    title: 'Step 1 — Place Joints (Nodes)',
    body: 'Press N or pick the Node tool, then click the grid to place pin joints. Snap to the grid for clean geometry. Tip: Warren trusses use evenly spaced bottom and top chord nodes.',
    action: 'tool-node',
  },
  {
    title: 'Step 2 — Connect Members (Beams)',
    body: 'Press B, click a start node, then an end node to create a bar. Warren webs form a zigzag of equilateral triangles — no verticals needed.',
    action: 'tool-beam',
  },
  {
    title: 'Or load a Warren template',
    body: 'Click “Load Warren Truss” below to drop a ready-made classroom example with supports and loads already applied — then study the results.',
    action: 'warren',
  },
  {
    title: 'Step 3 — Add Supports',
    body: 'Press S and click a node to cycle Pin → Roller Y → Roller X → Fixed. A bridge usually needs a pin on one end and a roller on the other to allow thermal expansion while staying stable.',
    action: 'tool-support',
  },
  {
    title: 'Step 4 — Apply Forces',
    body: 'Press F and click a joint to enter Fx and Fy in Newtons. Red arrows show load direction. Deck loads typically push downward on bottom-chord joints.',
    action: 'tool-force',
  },
  {
    title: 'Step 5 — Run the FEA Solver',
    body: 'Click “Run FEA Solver”. TrussIQ assembles K, applies boundary conditions, solves Ku = F, then recovers member forces N = (EA/L)·ΔL and stresses σ = N/A.',
    action: 'tool-select',
  },
  {
    title: 'Read the Heatmap',
    body: 'Green = low modeled yield use, yellow/orange = approaching yield, red = yield exceeded. Blue dashed members are in compression; the coach provides a separate approximate buckling screen. Toggle Deflection to exaggerate shape change.',
  },
  {
    title: 'Formula Inspector',
    body: 'Select any beam, then open Formula Inspector to see the exact DSM math — direction cosines, kᵉ matrix, ΔL, and N — with live numbers from your model.',
  },
  {
    title: 'You’re ready!',
    body: 'Try changing material to PLA, shrink the cross-section, and re-run. Use the AI Assistant for buckling tips and zero-force member cleanup. Export a PDF for your App Challenge write-up.',
  },
];

export function TutorialOverlay({ onClose, onLoadWarren, onSetTool }: TutorialOverlayProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const runAction = (s: Step) => {
    if (!s.action) return;
    if (s.action === 'warren') onLoadWarren();
    else if (s.action === 'tool-node') onSetTool('node');
    else if (s.action === 'tool-beam') onSetTool('beam');
    else if (s.action === 'tool-support') onSetTool('support');
    else if (s.action === 'tool-force') onSetTool('force');
    else if (s.action === 'tool-select') onSetTool('select');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="TrussIQ guided tutorial" className="w-full max-w-lg overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="h-1 bg-surface-800">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-2 text-accent">
            <BookOpen size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Physics Classroom</span>
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

          {current.action === 'warren' && (
            <button
              type="button"
              onClick={() => runAction(current)}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface-950 hover:bg-teal-400"
            >
              Load Warren Truss
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
              Start Designing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
