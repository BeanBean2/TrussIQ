import { Keyboard, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface ShortcutsModalProps {
  onClose: () => void;
}

const ROWS: { keys: string; action: string }[] = [
  { keys: 'N', action: 'Place Node' },
  { keys: 'B', action: 'Draw Beam (click two nodes)' },
  { keys: 'F', action: 'Apply Force' },
  { keys: 'S', action: 'Cycle Support' },
  { keys: 'V', action: 'Select' },
  { keys: 'E', action: 'Erase' },
  { keys: 'Space / Ctrl+Enter', action: 'Run FEA Solver' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Y', action: 'Redo' },
  { keys: 'Delete', action: 'Delete selection' },
  { keys: 'Esc', action: 'Cancel / close panels' },
  { keys: '?', action: 'This shortcuts guide' },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="w-full max-w-md rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-surface-100">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-800"
            aria-label="Close keyboard shortcuts"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="divide-y divide-surface-800 px-2 py-1">
          {ROWS.map((r) => (
            <li key={r.keys} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="text-surface-300">{r.action}</span>
              <kbd className="rounded-md border border-surface-600 bg-surface-800 px-2 py-0.5 font-mono text-[11px] text-accent">
                {r.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="px-4 pb-3 text-[10px] text-surface-500">
          Tip: press <kbd className="font-mono text-accent">?</kbd> anytime during editing.
        </p>
      </div>
    </div>
  );
}
