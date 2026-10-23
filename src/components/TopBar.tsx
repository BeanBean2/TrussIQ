import {
  BookOpen,
  Box,
  ChevronDown,
  Columns2,
  Download,
  FileJson,
  HelpCircle,
  Keyboard,
  Moon,
  Play,
  Redo2,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
  onImportTruss: (file: File) => void;
  onExportOfficialReport: () => void;
  onToggleTheme: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenTutorial: () => void;
  onDynamicsMode: (m: DynamicsMode) => void;
  onOpenCollapse: () => void;
  onOpenAR: () => void;
  onOpenCompare: () => void;
  onOpenShortcuts: () => void;
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
  onImportTruss,
  onExportOfficialReport,
  onToggleTheme,
  onUndo,
  onRedo,
  onOpenTutorial,
  onDynamicsMode,
  onOpenCollapse,
  onOpenAR,
  onOpenCompare,
  onOpenShortcuts,
}: TopBarProps) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dynOpen, setDynOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-surface-700 bg-surface-900 px-2">
      <div className="flex shrink-0 items-center gap-2 border-r border-surface-700 pr-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-sm font-bold text-accent">
          IQ
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold leading-tight text-surface-100">TrussIQ</h1>
          <p className="text-[9px] leading-tight text-surface-400">Advanced FEA Lab</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRunSolver}
        disabled={solving}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-2.5 py-2 text-sm font-semibold text-surface-950 hover:bg-teal-400 disabled:opacity-60"
      >
        <Play size={14} fill="currentColor" />
        Run FEA
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setPresetsOpen((v) => !v);
            setExportOpen(false);
            setDynOpen(false);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-xs text-surface-200"
        >
          Presets <ChevronDown size={12} />
        </button>
        {presetsOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPresetsOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border border-surface-700 bg-surface-800 shadow-xl">
              {(Object.keys(PRESET_LOADERS) as PresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700"
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
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-2 text-xs ${
            dynamicsMode !== 'none'
              ? 'border-warn/50 bg-warn/15 text-warn'
              : 'border-surface-700 text-surface-300'
          }`}
        >
          <Wind size={13} />
          Dynamics
          <ChevronDown size={12} />
        </button>
        {dynOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDynOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-surface-700 bg-surface-800 shadow-xl">
              {(
                [
                  ['none', 'Static only'],
                  ['wind', 'Wind shear'],
                  ['seismic', 'Seismic sweep'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700"
                  onClick={() => {
                    onDynamicsMode(id);
                    setDynOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenCollapse}
        title="Plastic collapse animation"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-fail/40 hover:text-fail"
      >
        <Zap size={13} />
        Collapse
      </button>

      <button
        type="button"
        onClick={onOpenAR}
        title="3D / WebAR"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"
      >
        <Box size={13} />
        3D/AR
      </button>

      <button
        type="button"
        onClick={onOpenCompare}
        title="Compare designs"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"
      >
        <Columns2 size={13} />
        Compare
      </button>

      <button
        type="button"
        onClick={onOpenTutorial}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-xs text-surface-300 hover:text-accent"
      >
        <BookOpen size={13} />
      </button>

      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-lg border border-surface-700 p-2 text-surface-300 hover:text-fail"
      >
        <Trash2 size={13} />
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-lg border border-surface-700 p-2 text-surface-300 disabled:opacity-30"
        >
          <Undo2 size={13} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
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
          onClick={onOpenShortcuts}
          title="Shortcuts (?)"
          className="rounded-lg border border-surface-700 p-2 text-surface-300"
        >
          <Keyboard size={13} />
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
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
            className="inline-flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-xs text-surface-200"
          >
            <Download size={13} />
            <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-surface-700 bg-surface-800 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700"
                  onClick={() => {
                    onExportTruss();
                    setExportOpen(false);
                  }}
                >
                  <FileJson size={14} /> Save .truss
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700"
                  onClick={() => {
                    fileRef.current?.click();
                    setExportOpen(false);
                  }}
                >
                  <Upload size={14} /> Import .truss
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-200 hover:bg-surface-700"
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
