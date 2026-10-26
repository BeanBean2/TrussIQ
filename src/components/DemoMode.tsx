import { ArrowRight, BookOpen, LineChart, Play, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface DemoModeProps {
  onClose: () => void;
  onLaunch: () => void;
}

export function DemoMode({ onClose, onLaunch }: DemoModeProps) {
  const dialogRef = useAccessibleDialog(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Guided demo" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Guided demo</p>
            <h2 className="mt-1 text-xl font-semibold text-surface-100">From classroom idea to engineering evidence</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-surface-400">
              Open a working bridge model, solve it, and inspect the decisions that make a structure safer and lighter.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close guided demo" className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-100">
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-px bg-surface-700 sm:grid-cols-3">
          <DemoStep icon={<BookOpen size={18} />} number="01" title="Design" text="Start with a real Warren truss template and inspect its supports, joints, and load path." />
          <DemoStep icon={<LineChart size={18} />} number="02" title="Analyze" text="Solve the Direct Stiffness Method model and read forces, stress, deflection, and safety." />
          <DemoStep icon={<ArrowRight size={18} />} number="03" title="Improve" text="Use the audit and AI advisor to find weak members, buckling risk, and efficiency gains." />
        </div>

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-surface-700 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-[11px] text-surface-500">Launching replaces the current model with the Warren sample. Use Undo before leaving to restore your previous design; otherwise the sample may become your saved draft.</p>
          <button type="button" onClick={onLaunch} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-surface-950 hover:bg-teal-400">
            <Play size={14} fill="currentColor" /> Launch guided model
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoStep({ icon, number, title, text }: { icon: React.ReactNode; number: string; title: string; text: string }) {
  return (
    <div className="bg-surface-900 px-4 py-5">
      <div className="flex items-center justify-between text-accent"><span>{icon}</span><span className="font-mono text-[10px] text-surface-500">{number}</span></div>
      <h3 className="mt-4 text-sm font-semibold text-surface-100">{title}</h3>
      <p className="mt-1.5 text-[11px] leading-relaxed text-surface-400">{text}</p>
    </div>
  );
}
