import {
  BookOpen,
  Box,
  ChevronDown,
  Columns2,
  ClipboardList,
  Command,
  Download,
  FileJson,
  HelpCircle,
  Keyboard,
  MonitorPlay,
  Flag,
  Users,
  Trophy,
  LoaderCircle,
  Moon,
  Play,
  Redo2,
  Save,
  PanelRight,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PRESET_LOADERS, type PresetKey } from '../lib/presets';
import type { DynamicsMode, GridSize, ThemeMode } from '../lib/types';

interface TopBarProps {
  gridSize: GridSize;
  showDeflection: boolean;
  deflectionScale: number;
  solving: boolean;
  theme: ThemeMode;
  canUndo: boolean;
  canRedo: boolean;
  dynamicsMode: DynamicsMode;
  onGridSize: (g: GridSize) => void;
  onToggleDeflection: () => void;
  onDeflectionScale: (s: number) => void;
  onRunSolver: () => void;
  onLoadPreset: (key: PresetKey) => void;
  onClear: () => void;
  onExportTruss: () => void;
  onCopyTruss: () => void;
  onImportTruss: (file: File) => void;
  onExportOfficialReport: () => void;
  draftStatus: string;
  onSaveDraft: () => void;
  onToggleTheme: () => void;
    onUndo: () => void;
  onRedo: () => void;
  onOpenTutorial: () => void;
  onDynamicsMode: (m: DynamicsMode) => void;
  onWindProfile: (profile: 'standard' | 'storm') => void;
  onOpenCollapse: () => void;
  onOpenAR: () => void;
  onOpenCompare: () => void;
  onOpenShortcuts: () => void;
  onOpenDemo: () => void;
  onOpenPresentation: () => void;
  onOpenMission: () => void;
  onOpenCollaboration: () => void;
  onOpenCommand: () => void;
  onOpenBrief: () => void;
  onOpenImpact: () => void;
  onOpenHome: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  nodeCount: number;
  beamCount: number;
  analysisLabel: string;
}

export function TopBar({
  gridSize,
  showDeflection,
  deflectionScale,
  solving,
  theme,
  canUndo,
  canRedo,
  dynamicsMode,
  onGridSize,
  onToggleDeflection,
  onDeflectionScale,
  onRunSolver,
  onLoadPreset,
  onClear,
  onExportTruss,
  onCopyTruss,
  onImportTruss,
  onExportOfficialReport,
  draftStatus,
  onSaveDraft,
  onToggleTheme,
  onUndo,
  onRedo,
  onOpenTutorial,
  onDynamicsMode,
  onWindProfile,
  onOpenCollapse,
  onOpenAR,
  onOpenCompare,
  onOpenShortcuts,
  onOpenDemo,
  onOpenPresentation,
  onOpenMission,
  onOpenCollaboration,
  onOpenCommand,
  onOpenBrief,
  onOpenImpact,
  onOpenHome,
  sidebarOpen,
  onToggleSidebar,
  nodeCount,
  beamCount,
  analysisLabel,
}: TopBarProps) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dynOpen, setDynOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresetsOpen(false);
        setExportOpen(false);
        setDynOpen(false);
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setPresetsOpen(false);
        setExportOpen(false);
        setDynOpen(false);
      }
    };
    window.addEventListener('keydown', closeMenus);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      window.removeEventListener('keydown', closeMenus);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, []);

  return (
    <header ref={barRef} className="relative flex h-14 min-w-0 shrink-0 items-center gap-1.5 overflow-visible border-b border-surface-700/80 bg-surface-900/95 px-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
      <button type="button" onClick={onOpenHome} title="Back to home" className="group flex shrink-0 items-center gap-2 border-r border-surface-700 pr-2 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-sm font-bold text-accent transition group-hover:bg-accent group-hover:text-surface-950">
          IQ
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold leading-tight text-surface-100">TrussIQ</h1>
          <p className="text-[9px] leading-tight text-surface-400">Advanced FEA Lab</p>
        </div>
      </button>

      <div className="hidden shrink-0 items-center gap-3 border-r border-surface-700 px-2 text-[10px] sm:flex">
        <div>
          <span className="text-surface-500">Nodes</span>
          <strong className="ml-1 font-mono text-surface-200">{nodeCount}</strong>
        </div>
        <div>
          <span className="text-surface-500">Members</span>
          <strong className="ml-1 font-mono text-surface-200">{beamCount}</strong>
        </div>
        <div className="flex items-center gap-1 text-surface-400">
          <span className={`h-1.5 w-1.5 rounded-full ${analysisLabel === 'Ready' ? 'bg-pass' : 'bg-warn'}`} />
          {analysisLabel}
        </div>
      </div>

      <button
        type="button"
        onClick={onRunSolver}
        disabled={solving}
        title="Run finite element analysis (Space)"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-2.5 py-2 text-sm font-semibold text-surface-950 hover:bg-teal-400 disabled:opacity-60"
      >
        {solving ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <Play size={14} fill="currentColor" />
        )}
        {solving ? 'Solving…' : 'Run FEA'}
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setPresetsOpen((v) => !v);
            setExportOpen(false);
            setDynOpen(false);
          }}
          aria-expanded={presetsOpen}
          aria-haspopup="menu"
          aria-controls="presets-menu"
          data-tooltip="Load a proven truss configuration"
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition-all ${
            presetsOpen
              ? 'border-accent/50 bg-accent/10 text-accent shadow-[0_0_18px_rgba(14,165,164,0.12)]'
              : 'border-surface-700 bg-surface-800/80 text-surface-200 hover:border-surface-500 hover:bg-surface-700/80'
          }`}
        >
          Presets <ChevronDown size={12} className={`transition-transform duration-200 ${presetsOpen ? 'rotate-180' : ''}`} />
        </button>
        {presetsOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPresetsOpen(false)} />
            <div id="presets-menu" role="menu" aria-label="Truss presets" className="dropdown-enter menu-expand absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-surface-600/80 bg-surface-800/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="px-3 pb-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Choose a starting model</p>
                <p className="mt-0.5 text-[10px] text-surface-500">Load geometry, supports, and sample forces.</p>
              </div>
              {(Object.keys(PRESET_LOADERS) as PresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    onLoadPreset(key);
                    setPresetsOpen(false);
                  }}
                >
                  {PRESET_LOADERS[key].label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dynamics */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setDynOpen((v) => !v);
            setPresetsOpen(false);
            setExportOpen(false);
          }}
          aria-expanded={dynOpen}
          aria-haspopup="menu"
          aria-controls="dynamics-menu"
          data-tooltip="Apply wind or seismic loading"
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition-all ${
            dynamicsMode !== 'none'
              ? 'border-warn/50 bg-warn/15 text-warn'
              : dynOpen
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-surface-700 text-surface-300 hover:border-surface-500 hover:bg-surface-800'
          }`}
        >
          <Wind size={13} />
          Dynamics
          <ChevronDown size={12} className={`transition-transform duration-200 ${dynOpen ? 'rotate-180' : ''}`} />
        </button>
        {dynOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDynOpen(false)} />
            <div id="dynamics-menu" role="menu" aria-label="Loading scenarios" className="dropdown-enter menu-expand absolute left-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-surface-600/80 bg-surface-800/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="px-3 pb-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-warn">Choose a load case</p>
                <p className="mt-0.5 text-[10px] text-surface-500">Apply an environment and re-solve the model.</p>
              </div>
              {(
                [
                  ['none', 'Static only', 'Gravity and applied loads'],
                  ['wind', 'Wind shear', 'Standard wind · 25 m/s'],
                  ['seismic', 'Seismic sweep', 'Harmonic ground motion · 0.25 g'],
                ] as const
              ).map(([id, label, detail]) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                    dynamicsMode === id
                      ? 'bg-accent/10 text-accent'
                      : 'text-surface-200 hover:bg-accent/10 hover:text-accent'
                  }`}
                  onClick={() => {
                    onDynamicsMode(id);
                    setDynOpen(false);
                  }}
                >
                  <span className="block">{label}</span>
                  <span className="mt-0.5 block text-[10px] text-surface-500">{detail}</span>
                </button>
              ))}
              <div className="my-1 border-t border-surface-700" />
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-warn/10 hover:text-warn"
                onClick={() => {
                  onWindProfile('storm');
                  setDynOpen(false);
                }}
              >
                <span className="block">Storm wind test</span>
                <span className="mt-0.5 block text-[10px] text-surface-500">Severe wind · 42 m/s</span>
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenCollapse}
        title="Plastic collapse animation"
        aria-label="Open plastic collapse animation"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-fail/40 hover:text-fail"
      >
        <Zap size={13} />
        Collapse
      </button>

      <button
        type="button"
        onClick={onOpenAR}
        title="3D / WebAR"
        aria-label="Open 3D and WebAR viewer"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"
      >
        <Box size={13} />
        3D/AR
      </button>

      <button
        type="button"
        onClick={onOpenCompare}
        title="Compare designs"
        aria-label="Compare designs"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"
      >
        <Columns2 size={13} />
        Compare
      </button>

      <button
        type="button"
        onClick={onOpenDemo}
        title="Launch guided demo"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2 py-2 text-xs text-accent hover:bg-accent/20"
      >
        <Sparkles size={13} />
        Demo
      </button>

      <button
        type="button"
        onClick={onOpenPresentation}
        title="Open presentation mode"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"
      >
        <MonitorPlay size={13} />
        Present
      </button>

      <button
        type="button"
        onClick={onOpenMission}
        title="Open engineering mission"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-warn/40 bg-warn/10 px-2 py-2 text-xs text-warn hover:bg-warn/20"
      >
        <Flag size={13} />
        Mission
      </button>

      <button
        type="button"
        onClick={onOpenCollaboration}
        title="Open collaboration center"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"
      >
        <Users size={13} />
        Team
      </button>

      <button
        type="button"
        onClick={onOpenImpact}
        title="Open challenge impact dashboard"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2 py-2 text-xs text-accent hover:bg-accent/20"
      >
        <Trophy size={13} />
        Impact
      </button>

      <button
        type="button"
        onClick={onOpenTutorial}
        title="Open classroom tutorial"
        aria-label="Open classroom tutorial"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:text-accent"
      >
        <BookOpen size={13} />
      </button>

      <button
        type="button"
        onClick={onOpenCommand}
        title="Search all tools and actions (Ctrl+K)"
        aria-label="Open command palette"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent/5 px-2 py-2 text-xs text-accent hover:border-accent/60 hover:bg-accent/10"
      >
        <Command size={13} />
        <span className="hidden 2xl:inline">Command</span>
      </button>

      <button
        type="button"
        onClick={onOpenBrief}
        title="Edit project brief and presentation context"
        aria-label="Open project brief"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"
      >
        <ClipboardList size={13} />
        <span className="hidden 2xl:inline">Brief</span>
      </button>

      <button
        type="button"
        onClick={onClear}
        title="Clear design"
        aria-label="Clear design"
        className="shrink-0 rounded-lg border border-surface-700 p-2 text-surface-300 hover:text-fail"
      >
        <Trash2 size={13} />
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="rounded-lg border border-surface-700 p-2 text-surface-300 disabled:opacity-30"
        >
          <Undo2 size={13} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          className="rounded-lg border border-surface-700 p-2 text-surface-300 disabled:opacity-30"
        >
          <Redo2 size={13} />
        </button>
      </div>

      <label className="flex shrink-0 items-center gap-1 text-[10px] text-surface-400">
        Grid
        <select
          value={gridSize}
          onChange={(e) => onGridSize(Number(e.target.value) as GridSize)}
          className="rounded border border-surface-700 bg-surface-800 px-1 py-1 text-[10px] text-surface-200"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </label>

      <button
        type="button"
        onClick={onToggleDeflection}
        title={showDeflection ? 'Hide deflected shape' : 'Show deflected shape'}
        aria-label={showDeflection ? 'Hide deflected shape' : 'Show deflected shape'}
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-2 text-xs ${
          showDeflection
            ? 'border-accent/50 bg-accent/15 text-accent'
            : 'border-surface-700 text-surface-300'
        }`}
      >
        <Waves size={13} />
      </button>
      {showDeflection && (
        <input
          type="range"
          min={10}
          max={500}
          value={deflectionScale}
          onChange={(e) => onDeflectionScale(Number(e.target.value))}
          className="w-16 accent-accent"
        />
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide inspector' : 'Show inspector'}
          className={`rounded-lg border p-2 ${sidebarOpen ? 'border-accent/40 bg-accent/10 text-accent' : 'border-surface-700 text-surface-300'}`}
        >
          <PanelRight size={13} />
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          title="Save local draft"
          className="inline-flex items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-[10px] text-surface-400 hover:border-accent/50 hover:text-accent"
        >
          <Save size={13} />
          <span className="hidden xl:inline">{draftStatus}</span>
        </button>
        <button
          type="button"
          onClick={onOpenShortcuts}
          title="Shortcuts (?)"
          aria-label="Open keyboard shortcuts"
          className="rounded-lg border border-surface-700 p-2 text-surface-300"
        >
          <Keyboard size={13} />
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="rounded-lg border border-surface-700 p-2 text-surface-300"
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".truss,.json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportTruss(f);
            e.target.value = '';
          }}
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setExportOpen((v) => !v);
              setPresetsOpen(false);
              setDynOpen(false);
            }}
            aria-label="Open export and import menu"
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            data-tooltip="Save, import, copy, or report your design"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition-all ${
              exportOpen
                ? 'border-accent/50 bg-accent/10 text-accent shadow-[0_0_18px_rgba(14,165,164,0.12)]'
                : 'border-surface-700 bg-surface-800/80 text-surface-200 hover:border-surface-500 hover:bg-surface-700/80'
            }`}
          >
            <Download size={13} />
            <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div role="menu" className="dropdown-enter absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-surface-600/80 bg-surface-800/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    onExportTruss();
                    setExportOpen(false);
                  }}
                >
                  <FileJson size={14} /> Save .truss
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    onCopyTruss();
                    setExportOpen(false);
                  }}
                >
                  <FileJson size={14} /> Copy design JSON
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    fileRef.current?.click();
                    setExportOpen(false);
                  }}
                >
                  <Upload size={14} /> Import .truss
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    onExportOfficialReport();
                    setExportOpen(false);
                  }}
                >
                  <HelpCircle size={14} /> Official Report PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
