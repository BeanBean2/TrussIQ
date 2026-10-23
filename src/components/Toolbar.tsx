import {
  CircleDot,
  Eraser,
  Hand,
  Magnet,
  MousePointer2,
  MoveDown,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ToolMode } from '../lib/types';

interface ToolDef {
  id: ToolMode;
  label: string;
  hotkey: string;
  icon: ReactNode;
}

const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', hotkey: 'V', icon: <MousePointer2 size={18} /> },
  { id: 'node', label: 'Node', hotkey: 'N', icon: <CircleDot size={18} /> },
  { id: 'beam', label: 'Beam', hotkey: 'B', icon: <Magnet size={18} /> },
  { id: 'force', label: 'Force', hotkey: 'F', icon: <MoveDown size={18} /> },
  { id: 'support', label: 'Support', hotkey: 'S', icon: <Hand size={18} /> },
  { id: 'erase', label: 'Erase', hotkey: 'E', icon: <Eraser size={18} /> },
];

interface ToolbarProps {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
}

export function Toolbar({ tool, onToolChange }: ToolbarProps) {
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-surface-700 bg-surface-900 py-3">
      {TOOLS.map((t) => {
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.label} (${t.hotkey})`}
            onClick={() => onToolChange(t.id)}
            className={`group relative flex h-11 w-11 flex-col items-center justify-center rounded-lg transition-colors ${
              active
                ? 'bg-accent/20 text-accent'
                : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
            }`}
          >
            {t.icon}
            <span className="mt-0.5 text-[9px] font-mono font-medium opacity-70">{t.hotkey}</span>
          </button>
        );
      })}
    </aside>
  );
}
