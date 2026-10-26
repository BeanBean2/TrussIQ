import { useState } from 'react';
import { Clapperboard, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

const STEPS = [
  {
    title: 'Load the Warren truss',
    detail: 'Use the Presets menu and choose Warren. This guide can load it for you; loading a preset replaces the current model.',
    action: 'Load Warren truss',
  },
  {
    title: 'Explain the member colors',
    detail: 'Compression members use a dashed blue overlay. Tension members use the stress heatmap colors; warmer colors mean higher yield utilization. The colors do not mean blue tension and red compression.',
    action: 'Next: run the solver',
  },
  {
    title: 'Run the FEA solver',
    detail: 'Run FEA, then point out member forces, displacements, and reactions. The Direct Stiffness Method solves in one static pass; the app does not animate the stiffness matrix calculation.',
    action: 'Run FEA now',
  },
  {
    title: 'Show exaggerated deflection',
    detail: 'Toggle the deflected shape and adjust its display scale. This visual exaggeration helps show movement; it is not a change to the calculated physical displacement.',
    action: 'Toggle deflection',
  },
] as const;

export function DemoHelper({
  onLoadWarren,
  onRunSolver,
  onToggleDeflection,
}: {
  onLoadWarren: () => boolean;
  onRunSolver: () => void;
  onToggleDeflection: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const dialogRef = useAccessibleDialog(() => setOpen(false));

  const advance = () => {
    if (step === 0 && !onLoadWarren()) return;
    if (step === 2) onRunSolver();
    if (step === 3) onToggleDeflection();
    if (step === STEPS.length - 1) setFinished(true);
    else setStep((current) => current + 1);
  };

  return (
    <>
      <button type="button" onClick={() => { setStep(0); setFinished(false); setOpen(true); }} aria-label="Open record video guide" title="Record Video Guide" className="demo-helper-fab fixed bottom-16 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-surface-600 bg-surface-900/95 px-3.5 py-2.5 text-xs font-semibold text-surface-100 shadow-xl backdrop-blur hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Clapperboard size={15} /> Record Video Guide
      </button>
      {open && <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[7vh] backdrop-blur-sm">
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Record video guide" className="w-full max-w-xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl">
          <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Judge demo walkthrough</p><h2 className="mt-1 text-lg font-semibold text-surface-100">Record a clear TrussIQ demo</h2><p className="mt-1 text-xs text-surface-400">Step {finished ? STEPS.length : step + 1} of {STEPS.length}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close video guide" className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"><X size={16} /></button></header>
          {finished ? <div className="p-5"><div className="rounded-xl border border-pass/30 bg-pass/5 p-4"><h3 className="text-sm font-semibold text-pass">Walkthrough complete</h3><p className="mt-2 text-xs leading-5 text-surface-300">Record in your own words. Name the participants, app, audience, actual tools and coding languages, then demonstrate working features. Keep the final video between 1 and 3 minutes, use readable labels, and turn on captions.</p></div><button type="button" onClick={() => setOpen(false)} className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-surface-950">Close guide</button></div> : <div className="p-5">
            <div className="mb-4 flex gap-1.5" aria-label="Guide progress">{STEPS.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-accent' : 'bg-surface-700'}`} />)}</div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-accent">Step {step + 1}</p><h3 className="mt-1 text-base font-semibold text-surface-100">{STEPS[step].title}</h3><p className="mt-2 text-sm leading-6 text-surface-300">{STEPS[step].detail}</p>
            <div className="mt-5 flex justify-between gap-3"><button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 disabled:opacity-40">Previous</button><button type="button" onClick={advance} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-surface-950">{STEPS[step].action}</button></div>
          </div>}
          <footer className="border-t border-surface-700 px-5 py-3 text-[10px] leading-4 text-surface-500">TrussIQ’s solver is a linear, axial-only educational model, not a complete structural safety assessment. Be accurate about what your team built and any AI assistance used.</footer>
        </section>
      </div>}
    </>
  );
}
