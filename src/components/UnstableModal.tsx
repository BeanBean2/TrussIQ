import { AlertTriangle, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface UnstableModalProps {
  message: string;
  onClose: () => void;
}

export function UnstableModal({ message, onClose }: UnstableModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Analysis message" className="w-full max-w-md rounded-xl border border-warn/40 bg-surface-900 shadow-2xl">
        <div className="flex items-start gap-3 px-5 py-5">
          <div className="mt-0.5 rounded-lg bg-warn/15 p-2 text-warn">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-surface-100">Unstable Structure</h2>
            <p className="mt-2 text-sm leading-relaxed text-surface-300">{message}</p>
            <p className="mt-3 text-xs text-surface-400">
              Tip: A plane truss needs enough supports to restrain rigid-body translation and
              rotation (typically a pin + roller, or equivalent).
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close analysis message"
              className="mt-4 rounded-lg bg-surface-700 px-4 py-2 text-sm font-medium text-surface-100 hover:bg-surface-600"
            >
              Got it
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
