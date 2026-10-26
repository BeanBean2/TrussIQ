import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface ForceModalProps {
  nodeId: string;
  initialFx: number;
  initialFy: number;
  onApply: (fx: number, fy: number) => void;
  onClose: () => void;
}

export function ForceModal({ nodeId, initialFx, initialFy, onApply, onClose }: ForceModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [fx, setFx] = useState(String(initialFx));
  const [fy, setFy] = useState(String(initialFy));

  const handleApply = useCallback(() => {
    const nx = Number(fx);
    const ny = Number(fy);
    if (Number.isFinite(nx) && Number.isFinite(ny)) onApply(nx, ny);
  }, [fx, fy, onApply]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
        e.preventDefault();
        handleApply();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleApply]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Apply force at node ${nodeId}`} className="w-full max-w-sm rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-wide text-surface-100">
            Apply Force — {nodeId}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close force editor"
            className="rounded-md p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          <p className="text-xs text-surface-400">
            Enter force components in Newtons. Positive Fy points downward on the canvas.
          </p>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-surface-300">Fₓ (N)</span>
            <input
              type="number"
              data-dialog-initial-focus
              value={fx}
              onChange={(e) => setFx(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 font-mono text-sm text-surface-100 outline-none focus:border-accent"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-surface-300">Fᵧ (N)</span>
            <input
              type="number"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 font-mono text-sm text-surface-100 outline-none focus:border-accent"
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-surface-300 hover:bg-surface-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-force px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Apply Force
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
