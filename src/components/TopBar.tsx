import {

  BookOpen,
  Box,
  ChevronDown,
  Columns2,
  ClipboardList,
  Command,
  Download,
  FileJson,
  FolderOpen,
  HelpCircle,
  Keyboard,
  MonitorPlay,
  Flag,
  Users,
  Trophy,
  LoaderCircle,
  Moon,
  MoreHorizontal,
  Play,
  Redo2,
  Save,
  PanelLeft,
  PanelRight,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  onOpenTemplateLibrary: () => void;
  onOpenGeometryTools: () => void;
  onClear: () => void;
  onExportTruss: () => void;
  onCopyTruss: () => void;
  onImportTruss: (file: File) => void;
  onExportOfficialReport: () => void;
  onOpenProjectLibrary: () => void;
  onOpenProjectSummary: () => void;
  draftStatus: string;
  onSaveDraft: () => void;
  onToggleTheme: () => void;
    onUndo: () => void;
  onRedo: () => void;
  onOpenTutorial: () => void;
  onDynamicsMode: (m: DynamicsMode) => void;
  onOpenLoadCaseStudy: () => void;
  onWindProfile: (profile: 'standard' | 'storm') => void;
  onOpenCollapse: () => void;
  onOpenAR: () => void;
  onOpen3DEditor: () => void;
  onOpenCompare: () => void;
  onOpenShortcuts: () => void;
  onOpenDemo: () => void;
  onOpenGuidedLesson: () => void;
  onOpenPresentation: () => void;
  onOpenMission: () => void;
  onOpenCollaboration: () => void;
  onOpenCommand: () => void;
  onOpenBrief: () => void;
  onOpenPrivacy: () => void;
  onOpenImpact: () => void;
  onOpenHome: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  toolbarOpen: boolean;
  onToggleToolbar: () => void;
  uiScale: number;
  onUiScale: (scale: number) => void;
  soundsEnabled: boolean;
  onToggleSounds: () => void;
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
  onOpenTemplateLibrary,
  onOpenGeometryTools,
  onClear,
  onExportTruss,
  onCopyTruss,
  onImportTruss,
  onExportOfficialReport,
  onOpenProjectLibrary,
  onOpenProjectSummary,
  draftStatus,
  onSaveDraft,
  onToggleTheme,
  onUndo,
  onRedo,
  onOpenTutorial,
  onDynamicsMode,
  onOpenLoadCaseStudy,
  onWindProfile,
  onOpenCollapse,
  onOpenAR,
  onOpen3DEditor,
  onOpenCompare,
  onOpenShortcuts,
  onOpenDemo,
  onOpenGuidedLesson,
  onOpenPresentation,
  onOpenMission,
  onOpenCollaboration,
  onOpenCommand,
  onOpenBrief,
  onOpenPrivacy,
  onOpenImpact,
  onOpenHome,
  sidebarOpen,
  onToggleSidebar,
  toolbarOpen,
  onToggleToolbar,
  uiScale,
  onUiScale,
  soundsEnabled,
  onToggleSounds,
  nodeCount,
  beamCount,
  analysisLabel,
}: TopBarProps) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dynOpen, setDynOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const presetsMenuRef = useRef<HTMLDivElement>(null);
  const dynamicsMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [presetsPosition, setPresetsPosition] = useState({ top: 56, left: 8 });
  const [dynamicsPosition, setDynamicsPosition] = useState({ top: 56, left: 8 });
  const [exportPosition, setExportPosition] = useState({ top: 56, left: 8 });
  const [morePosition, setMorePosition] = useState({ top: 56, left: 8 });

  const positionMenu = (event: React.MouseEvent<HTMLButtonElement>, width: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const height = Math.min(460, window.innerHeight - 16);
    return {
      top: Math.min(rect.bottom + 8, window.innerHeight - height - 8),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    };
  };

  const closeAllMenus = () => {
    setPresetsOpen(false);
    setExportOpen(false);
    setDynOpen(false);
    setMoreOpen(false);
  };

  const closeOnViewportChange = () => {
    closeAllMenus();
  };

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAllMenus();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      const insideMenu =
        presetsMenuRef.current?.contains(target) ||
        dynamicsMenuRef.current?.contains(target) ||
        exportMenuRef.current?.contains(target) ||
        moreMenuRef.current?.contains(target);
      if (!barRef.current?.contains(target) && !insideMenu) closeAllMenus();
    };
    window.addEventListener('keydown', closeMenus);
    window.addEventListener('resize', closeOnViewportChange);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      window.removeEventListener('keydown', closeMenus);
      window.removeEventListener('resize', closeOnViewportChange);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, []);

  // When panels are tucked away, keep the top bar to one compact row so the canvas gains height.
  const focusLayout = !sidebarOpen && !toolbarOpen;

  return (
    <header
      ref={barRef}
      data-focus-layout={focusLayout ? 'true' : 'false'}
      className={`workspace-topbar relative z-40 flex h-14 min-h-14 min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-surface-700/80 bg-surface-900/95 px-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl ${
        focusLayout ? 'workspace-topbar--focus gap-1 py-1' : 'gap-1.5 py-1.5'
      }`}
    >
      <button type="button" onClick={onOpenHome} title="Back to home" className="group flex shrink-0 items-center gap-2 border-r border-surface-700 pr-2 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-sm font-bold text-accent transition group-hover:bg-accent group-hover:text-surface-950">
          IQ
        </div>
        <div className={`hidden ${focusLayout ? '' : 'sm:block'}`}>
          <h1 className="text-sm font-semibold leading-tight text-surface-100">TrussIQ</h1>
          <p className="text-[9px] leading-tight text-surface-400">Classroom structural lab</p>
        </div>
      </button>

      <div className={`hidden shrink-0 items-center gap-3 border-r border-surface-700 px-2 text-[10px] ${focusLayout ? '' : 'sm:flex'}`}>
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
          onClick={(event) => {
            const opening = !presetsOpen;
            if (opening) setPresetsPosition(positionMenu(event, 256));
            setPresetsOpen(opening);
            setExportOpen(false);
            setDynOpen(false);
            setMoreOpen(false);
          }}
          aria-expanded={presetsOpen}
          aria-haspopup="menu"
          aria-controls="presets-menu"
          aria-label="Presets"
          data-tooltip="Load a proven truss configuration"
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition-all ${
            presetsOpen
              ? 'border-accent/50 bg-accent/10 text-accent shadow-[0_0_18px_rgba(14,165,164,0.12)]'
              : 'border-surface-700 bg-surface-800/80 text-surface-200 hover:border-surface-500 hover:bg-surface-700/80'
          }`}
        >
          <span className="topbar-action-label">Presets</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${presetsOpen ? 'rotate-180' : ''}`} />
        </button>
        {presetsOpen && (
          createPortal(
            <div ref={presetsMenuRef} id="presets-menu" role="menu" aria-label="Truss presets" style={presetsPosition} className="dropdown-enter menu-expand fixed z-[200] w-64 overflow-hidden rounded-xl border border-surface-600/80 bg-surface-800/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="px-3 pb-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Choose a starting model</p>
                <p className="mt-0.5 text-[10px] text-surface-500">Load geometry, supports, and sample forces.</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => { onOpenTemplateLibrary(); setPresetsOpen(false); }}
                className="mb-1 block w-full rounded-lg border-b border-surface-700 px-3 py-2.5 text-left text-xs font-medium text-accent hover:bg-accent/10"
              >
                Save or open my templates
              </button>
              <button type="button" role="menuitem" onClick={() => { onOpenGeometryTools(); setPresetsOpen(false); }} className="mb-1 block w-full rounded-lg border-b border-surface-700 px-3 py-2.5 text-left text-xs font-medium text-accent hover:bg-accent/10">
                Geometry and load tools
              </button>
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
            </div>,
            document.body,
          )
        )}
      </div>

      {/* Dynamics */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(event) => {
            const opening = !dynOpen;
            if (opening) setDynamicsPosition(positionMenu(event, 240));
            setDynOpen(opening);
            setPresetsOpen(false);
            setExportOpen(false);
            setMoreOpen(false);
          }}
          aria-expanded={dynOpen}
          aria-haspopup="menu"
          aria-controls="dynamics-menu"
          aria-label="Dynamics"
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
          <span className="topbar-action-label">Dynamics</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${dynOpen ? 'rotate-180' : ''}`} />
        </button>
        {dynOpen && (
          createPortal(
            <div ref={dynamicsMenuRef} id="dynamics-menu" role="menu" aria-label="Loading scenarios" style={dynamicsPosition} className="dropdown-enter menu-expand fixed z-[200] w-60 overflow-hidden rounded-xl border border-surface-600/80 bg-surface-800/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
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
              <div className="my-1 border-t border-surface-700" />
              <button type="button" role="menuitem" onClick={() => { onOpenLoadCaseStudy(); setDynOpen(false); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-xs text-accent hover:bg-accent/10">
                Compare 9 load cases
              </button>
            </div>,
            document.body,
          )
        )}
      </div>

      <button
        type="button"
        onClick={onOpenGuidedLesson}
        title="Guided Lesson Mode — learn truss engineering step by step"
        aria-label="Open guided lesson mode"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2 py-2 text-xs text-accent hover:bg-accent/20"
      >
        <BookOpen size={13} />
        <span className="topbar-action-label">Lesson</span>
      </button>

      <button
        type="button"
        onClick={onOpenDemo}
        title="Launch Demo Mode — polished truss, FEA, one design change"
        aria-label="Launch Demo Mode"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/45 bg-accent/15 px-2 py-2 text-xs font-semibold text-accent hover:bg-accent/25"
      >
        <Sparkles size={13} />
        <span className="topbar-action-label">Demo</span>
      </button>

      <button
        type="button"
        onClick={onOpenImpact}
        title="Open challenge impact dashboard"
        aria-label="Open challenge impact dashboard"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2 py-2 text-xs text-accent hover:bg-accent/20"
      >
        <Trophy size={13} />
        <span className="topbar-action-label">Impact</span>
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
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(event) => {
            const opening = !moreOpen;
            if (opening) setMorePosition(positionMenu(event, 260));
            setMoreOpen(opening);
            setPresetsOpen(false);
            setExportOpen(false);
            setDynOpen(false);
          }}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          aria-controls="more-tools-menu"
          aria-label="More tools"
          data-tooltip="Compare, 3D, mission, team, and more"
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all ${
            moreOpen
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-surface-700 text-surface-300 hover:border-surface-500 hover:bg-surface-800'
          }`}
        >
          <MoreHorizontal size={13} />
          <span className="topbar-action-label">More</span>
        </button>
        {moreOpen &&
          createPortal(
            <div
              ref={moreMenuRef}
              id="more-tools-menu"
              role="menu"
              aria-label="More tools"
              style={morePosition}
              className="dropdown-enter menu-expand fixed z-[200] max-h-[min(28rem,calc(100vh-1rem))] w-[16.25rem] overflow-y-auto overscroll-contain rounded-xl border border-surface-600/80 bg-surface-800/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl"
            >
              <div className="sticky top-0 z-10 -mx-1.5 mb-0.5 border-b border-surface-700/60 bg-surface-800/95 px-3 pb-1.5 pt-1 backdrop-blur-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Explore</p>
                <p className="mt-0.5 text-[10px] text-surface-500">Secondary tools stay here so the bar stays calm.</p>
              </div>
              {(
                [
                  { label: 'Privacy', detail: 'Private session, share & cloud consent, clear data', icon: Shield, run: onOpenPrivacy },
                  { label: 'Present mode', detail: 'Full-canvas classroom view', icon: MonitorPlay, run: onOpenPresentation },
                  { label: 'My projects', detail: 'Name, save, reopen, duplicate', icon: FolderOpen, run: onOpenProjectLibrary },
                  { label: 'Edit in 3D', detail: 'Views, parts, chords, mirrors, supports', icon: Box, run: onOpen3DEditor },
                  { label: 'Compare designs', detail: 'Side-by-side result check', icon: Columns2, run: onOpenCompare },
                  { label: '3D preview / AR', detail: 'Orbit extruded model and export GLB', icon: Box, run: onOpenAR },
                  { label: 'Project summary', detail: 'Viz, FEA, score, reflection export', icon: Sparkles, run: onOpenProjectSummary },
                  { label: 'Mission', detail: 'Scored design goals', icon: Flag, run: onOpenMission },
                  { label: 'Team / share', detail: 'Local comments and review links', icon: Users, run: onOpenCollaboration },
                  { label: 'Project brief', detail: 'Audience and presentation notes', icon: ClipboardList, run: onOpenBrief },
                  { label: 'Collapse animation', detail: 'Plastic failure sequence', icon: Zap, run: onOpenCollapse },
                ] as const
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    item.run();
                    setMoreOpen(false);
                  }}
                >
                  <item.icon size={14} className="mt-0.5 shrink-0 opacity-80" />
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-[10px] text-surface-500">{item.detail}</span>
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )}
      </div>

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

      <label
        className="flex shrink-0 items-center gap-1 text-[10px] text-surface-400"
        title="Base grid size — squares auto-refine as you zoom"
      >
        Grid □
        <select
          value={gridSize}
          onChange={(e) => onGridSize(Number(e.target.value) as GridSize)}
          aria-label="Base grid size; squares auto-refine when zooming"
          className="rounded border border-surface-700 bg-surface-800 px-1 py-1 text-[10px] text-surface-200"
        >
          <option value={1}>1 mm</option>
          <option value={2}>2 mm</option>
          <option value={5}>5 mm</option>
          <option value={10}>10 mm</option>
          <option value={20}>20 mm</option>
          <option value={50}>50 mm</option>
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
          onClick={onToggleToolbar}
          title={toolbarOpen ? 'Hide drawing tools' : 'Show drawing tools'}
          aria-label={toolbarOpen ? 'Hide drawing tools' : 'Show drawing tools'}
          aria-pressed={toolbarOpen}
          className={`rounded-lg border p-2 ${toolbarOpen ? 'border-accent/40 bg-accent/10 text-accent' : 'border-surface-700 text-surface-300'}`}
        >
          <PanelLeft size={13} />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide inspector' : 'Show inspector'}
          aria-label={sidebarOpen ? 'Hide inspector' : 'Show inspector'}
          aria-pressed={sidebarOpen}
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
          onClick={onToggleSounds}
          title={soundsEnabled ? 'Mute UI sounds' : 'Enable UI sounds'}
          aria-label={soundsEnabled ? 'Mute UI sounds' : 'Enable UI sounds'}
          aria-pressed={soundsEnabled}
          className={`rounded-lg border p-2 ${
            soundsEnabled
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-surface-700 text-surface-300'
          }`}
        >
          {soundsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
        <label
          className="hidden items-center gap-1 rounded-lg border border-surface-700 px-1.5 py-1 text-[10px] text-surface-400 sm:inline-flex"
          title="Scale the workspace UI"
        >
          <span className="sr-only">UI scale</span>
          <select
            value={uiScale}
            onChange={(e) => onUiScale(Number(e.target.value))}
            aria-label="UI scale"
            className="max-w-[3.5rem] bg-transparent text-[10px] text-surface-200 outline-none"
          >
            <option value={0.85}>85%</option>
            <option value={1}>100%</option>
            <option value={1.15}>115%</option>
            <option value={1.3}>130%</option>
          </select>
        </label>
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
            onClick={(event) => {
              const opening = !exportOpen;
              if (opening) setExportPosition(positionMenu(event, 240));
              setExportOpen(opening);
              setPresetsOpen(false);
              setDynOpen(false);
              setMoreOpen(false);
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
            createPortal(
              <div ref={exportMenuRef} role="menu" aria-label="Export and import" style={exportPosition} className="dropdown-enter fixed z-[200] w-64 overflow-hidden rounded-xl border border-surface-600/80 bg-surface-800/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    onOpenProjectLibrary();
                    setExportOpen(false);
                  }}
                >
                  <FolderOpen size={14} /> My projects…
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-surface-200 transition-colors hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    onExportTruss();
                    setExportOpen(false);
                  }}
                >
                  <FileJson size={14} /> Save .truss file
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
                    onOpenProjectSummary();
                    setExportOpen(false);
                  }}
                >
                  <Sparkles size={14} /> Project summary…
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
              </div>,
              document.body,
            )
          )}
        </div>
      </div>
    </header>
  );
}
