import {
  BookOpen,
  Box,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Download,
  Flag,
  Gauge,
  Keyboard,
  MonitorPlay,
  Play,
  Search,
  Sparkles,
  Users,
  Wind,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import type { PresetKey } from '../lib/presets';

interface CommandPaletteProps {
  onClose: () => void;
  onRunSolver: () => void;
  onLoadPreset: (key: PresetKey) => void;
  onDynamics: (mode: 'none' | 'wind' | 'seismic') => void;
  onOpenTutorial: () => void;
  onOpenMission: () => void;
  onOpenCollaboration: () => void;
  onOpenPresentation: () => void;
  onOpenCompare: () => void;
  onOpenCollapse: () => void;
  onOpenAR: () => void;
  onOpen3DEditor: () => void;
  onOpenShortcuts: () => void;
  onExport: () => void;
  onClear: () => void;
  onOpenBrief: () => void;
  onOpenImpact: () => void;
  onOpenGeometryTools: () => void;
}

interface Command {
  id: string;
  label: string;
  description: string;
  group: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette({
  onClose,
  onRunSolver,
  onLoadPreset,
  onDynamics,
  onOpenTutorial,
  onOpenMission,
  onOpenCollaboration,
  onOpenPresentation,
  onOpenCompare,
  onOpenCollapse,
  onOpenAR,
  onOpen3DEditor,
  onOpenShortcuts,
  onExport,
  onClear,
  onOpenBrief,
  onOpenImpact,
  onOpenGeometryTools,
}: CommandPaletteProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const commands = useMemo<Command[]>(
    () => [
      { id: 'solve', label: 'Run FEA analysis', description: 'Solve the current structure and update member results', group: 'Analysis', icon: <Play size={15} />, run: onRunSolver },
      { id: 'mission', label: 'Open engineering mission', description: 'Work toward a measurable bridge design goal', group: 'Analysis', icon: <Flag size={15} />, run: onOpenMission },
      { id: 'wind', label: 'Enable wind shear', description: 'Apply wind loading and re-solve the model', group: 'Analysis', icon: <Wind size={15} />, run: () => onDynamics('wind') },
      { id: 'seismic', label: 'Enable seismic sweep', description: 'Animate a dynamic ground motion load case', group: 'Analysis', icon: <Gauge size={15} />, run: () => onDynamics('seismic') },
      { id: 'static', label: 'Return to static analysis', description: 'Turn off environmental dynamics', group: 'Analysis', icon: <CheckCircle2 size={15} />, run: () => onDynamics('none') },
      { id: 'howe', label: 'Load Howe truss', description: 'Start from a classic classroom bridge model', group: 'Presets', icon: <Box size={15} />, run: () => onLoadPreset('howe') },
      { id: 'pratt', label: 'Load Pratt truss', description: 'Load an efficient diagonal configuration', group: 'Presets', icon: <Box size={15} />, run: () => onLoadPreset('pratt') },
      { id: 'warren', label: 'Load Warren truss', description: 'Load a repeating triangular configuration', group: 'Presets', icon: <Box size={15} />, run: () => onLoadPreset('warren') },
      { id: 'chords', label: 'Build top & bottom chords', description: 'Open geometry tools to place deck and top chords with optional verticals', group: 'Presets', icon: <Box size={15} />, run: onOpenGeometryTools },
      { id: 'tutorial', label: 'Start classroom tutorial', description: 'Learn the editor workflow step by step', group: 'Learn', icon: <BookOpen size={15} />, run: onOpenTutorial },
      { id: 'shortcuts', label: 'Show keyboard shortcuts', description: 'View every keyboard command in TrussIQ', group: 'Learn', icon: <Keyboard size={15} />, run: onOpenShortcuts },
      { id: 'team', label: 'Open collaboration center', description: 'Share, comment, checkpoint, and review this design', group: 'Review', icon: <Users size={15} />, run: onOpenCollaboration },
      { id: 'present', label: 'Enter presentation mode', description: 'Show a clean, distraction-free analysis view', group: 'Review', icon: <MonitorPlay size={15} />, run: onOpenPresentation },
      { id: 'compare', label: 'Compare designs', description: 'Inspect two design states side by side', group: 'Review', icon: <BrainCircuit size={15} />, run: onOpenCompare },
      { id: 'collapse', label: 'Play collapse animation', description: 'Explore progressive member failure', group: 'Explore', icon: <Sparkles size={15} />, run: onOpenCollapse },
      { id: 'edit3d', label: 'Edit in 3D', description: 'Move joints and draw members in an interactive 3D view', group: 'Explore', icon: <Box size={15} />, run: onOpen3DEditor },
      { id: 'ar', label: 'Open 3D preview', description: 'Inspect the extruded model and export GLB for AR', group: 'Explore', icon: <Box size={15} />, run: onOpenAR },
      { id: 'export', label: 'Export design report', description: 'Open the export and reporting menu', group: 'Files', icon: <Download size={15} />, run: onExport },
      { id: 'clear', label: 'Clear current design', description: 'Remove all nodes and members', group: 'Files', icon: <X size={15} />, run: onClear },
      { id: 'brief', label: 'Edit project brief', description: 'Capture the objective, constraints, and story behind the design', group: 'Review', icon: <ClipboardList size={15} />, run: onOpenBrief },
      { id: 'impact', label: 'Open challenge impact dashboard', description: 'Track learning evidence and create a judge-ready project story', group: 'Review', icon: <Flag size={15} />, run: onOpenImpact },
    ],
    [onClear, onDynamics, onExport, onLoadPreset, onOpen3DEditor, onOpenAR, onOpenBrief, onOpenCollaboration, onOpenCollapse, onOpenCompare, onOpenGeometryTools, onOpenImpact, onOpenMission, onOpenPresentation, onOpenShortcuts, onOpenTutorial, onRunSolver],
  );
  const filtered = commands.filter((command) => `${command.label} ${command.description} ${command.group}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        filtered[activeIndex]?.run();
        if (filtered[activeIndex]) onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm animate-fade-in" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl overflow-hidden rounded-2xl border border-surface-600/80 bg-surface-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-surface-700 px-4">
          <Search size={18} className="text-accent" />
          <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Search actions, tools, and workflows…" className="h-14 min-w-0 flex-1 bg-transparent text-sm text-surface-100 outline-none placeholder:text-surface-500" />
          <kbd className="hidden rounded border border-surface-700 px-1.5 py-1 font-mono text-[10px] text-surface-500 sm:block">ESC</kbd>
        </div>
        <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-surface-500">No matching actions found.</p>
          ) : (
            filtered.map((command, index) => (
              <button
                key={command.id}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => { command.run(); onClose(); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${index === activeIndex ? 'bg-accent/10 text-accent' : 'text-surface-300 hover:bg-surface-800'}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${index === activeIndex ? 'bg-accent/15' : 'bg-surface-800 text-surface-400'}`}>{command.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">{command.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-surface-500">{command.description}</span>
                </span>
                <span className="hidden text-[9px] uppercase tracking-wider text-surface-600 sm:block">{command.group}</span>
              </button>
            ))
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-surface-700 px-4 py-2.5 text-[10px] text-surface-500">
          <span>↑↓ navigate · Enter select</span>
          <span>TrussIQ Command Center</span>
        </footer>
      </section>
    </div>
  );
}
