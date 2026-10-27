import { AlertTriangle, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface UnstableModalProps {
  title: string;
  message: string;
  tip?: string | null;
  onClose: () => void;
}

export function UnstableModal({ title, message, tip, onClose }: UnstableModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-alert-title"
        aria-describedby="app-alert-body"
        className="w-full max-w-md rounded-xl border border-warn/40 bg-surface-900 shadow-2xl"
      >
        <div className="flex items-start gap-3 px-5 py-5">
          <div className="mt-0.5 rounded-lg bg-warn/15 p-2 text-warn" aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h2 id="app-alert-title" className="text-base font-semibold text-surface-100">
              {title}
            </h2>
            <p id="app-alert-body" className="mt-2 text-sm leading-relaxed text-surface-300">
              {message}
            </p>
            {tip ? (
              <p className="mt-3 text-xs leading-5 text-surface-400" role="note">
                Tip: {tip}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              data-dialog-initial-focus
              aria-label="Dismiss message"
              className="mt-4 rounded-lg bg-surface-700 px-4 py-2 text-sm font-medium text-surface-100 hover:bg-surface-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Got it
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
