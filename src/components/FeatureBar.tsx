import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  Lightbulb,
  RefreshCw,
  Ruler,
  Scale,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ENGINEERING_TIPS, nextTipIndex, tipForDay } from '../lib/engineeringTips';
import type { ResultPalette } from '../lib/resultPalette';
import type { MemberViewFilter, StructureMetrics } from '../lib/structureMetrics';
import { formatSpanDisplay, unitSystemLabel, type DisplayUnitSystem } from '../lib/units';

interface FeatureBarProps {
  showForceLabels: boolean;
  onToggleForceLabels: () => void;
  memberFilter: MemberViewFilter;
  onMemberFilter: (f: MemberViewFilter) => void;
  autoSolve: boolean;
  onToggleAutoSolve: () => void;
  loadScalePct: number;
  onLoadScale: (pct: number) => void;
  metrics: StructureMetrics;
  onScreenshot: () => void;
  screenshotStatus: string | null;
  resultStale?: boolean;
  displayUnits: DisplayUnitSystem;
  onToggleDisplayUnits: () => void;
  resultPalette: ResultPalette;
  onToggleResultPalette: () => void;
  onExportWorksheet?: () => void;
}

export function FeatureBar({
  showForceLabels,
  onToggleForceLabels,
  memberFilter,
  onMemberFilter,
  autoSolve,
  onToggleAutoSolve,
  loadScalePct,
  onLoadScale,
  metrics,
  onScreenshot,
  screenshotStatus,
  resultStale = false,
  displayUnits,
  onToggleDisplayUnits,
  resultPalette,
  onToggleResultPalette,
  onExportWorksheet,
}: FeatureBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [tipIndex, setTipIndex] = useState(() =>
    Math.max(0, ENGINEERING_TIPS.indexOf(tipForDay())),
  );
  const tip = ENGINEERING_TIPS[tipIndex] ?? tipForDay();

  return (
    <div className="feature-bar-anchor pointer-events-none absolute bottom-3 left-3 z-20 flex w-[min(34rem,calc(100%-6.5rem))] flex-col gap-1.5">
      <div className="pointer-events-auto flex max-h-[40vh] flex-wrap items-center gap-1 overflow-y-auto rounded-lg border border-surface-700 bg-surface-900/95 px-2 py-1.5 shadow-lg backdrop-blur">
        <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
          <Ruler size={11} />
          <span className="font-mono font-normal text-surface-300">
            {formatSpanDisplay(metrics.spanMm, metrics.heightMm, displayUnits)}
          </span>
        </span>
        {resultStale && (
          <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[9px] font-medium text-warn">
            Results outdated
          </span>
        )}
        <ToggleChip
          active={showForceLabels}
          onClick={onToggleForceLabels}
          icon={<Eye size={12} />}
          label="Forces"
          title="Show member force labels (lengths always shown)"
        />
        <label className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-1.5 py-1 text-[10px] text-surface-300">
          <Filter size={11} className="text-surface-400" />
          <select
            value={memberFilter}
            onChange={(e) => onMemberFilter(e.target.value as MemberViewFilter)}
            className="max-w-[7.5rem] bg-transparent text-[10px] outline-none"
            title="Filter members"
          >
            <option value="all">All</option>
            <option value="tension">Tension</option>
            <option value="compression">Compression</option>
            <option value="yielded">Yielded</option>
            <option value="zero">Zero-force</option>
          </select>
        </label>
        <ToggleChip
          active={autoSolve}
          onClick={onToggleAutoSolve}
          icon={<RefreshCw size={12} />}
          label="Live"
          title="Auto-solve after edits"
        />
        <label
          className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-1.5 py-1 text-[10px] text-surface-300"
          title="Scale all applied loads"
        >
          <Scale size={11} className="text-surface-400" />
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={loadScalePct}
            onChange={(e) => onLoadScale(Number(e.target.value))}
            className="w-14 accent-accent"
          />
          <span className="w-7 font-mono text-accent">{loadScalePct}%</span>
        </label>
        <button
          type="button"
          onClick={onScreenshot}
          title="Copy canvas screenshot"
          className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-1.5 py-1 text-[10px] text-surface-300 hover:border-accent/50 hover:text-accent"
        >
          <Camera size={11} />
          {screenshotStatus ?? 'Shot'}
        </button>
        <ToggleChip
          active={displayUnits === 'us'}
          onClick={onToggleDisplayUnits}
          icon={<span className="font-mono text-[9px]">{unitSystemLabel(displayUnits)}</span>}
          label="Units"
          title="Toggle SI (mm, N, MPa) vs US customary display"
        />
        <ToggleChip
          active={resultPalette === 'colorblind'}
          onClick={onToggleResultPalette}
          icon={<span className="font-mono text-[9px]">CB</span>}
          label="Palette"
          title="Colorblind-safer member colors"
        />
        {onExportWorksheet && (
          <button
            type="button"
            onClick={onExportWorksheet}
            title="Download printable lab worksheet PDF"
            className="inline-flex items-center gap-1 rounded-md border border-accent/35 bg-accent/10 px-1.5 py-1 text-[10px] text-accent hover:bg-accent/20"
          >
            Worksheet
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-surface-700 px-1.5 py-1 text-[10px] text-surface-400 hover:text-accent"
          title={expanded ? 'Hide tip & details' : 'Show tip & details'}
          aria-label={expanded ? 'Hide tip & details' : 'Show tip & details'}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="pointer-events-auto rounded-lg border border-surface-700 bg-surface-900/95 px-2.5 py-1.5 text-[10px] text-surface-300 shadow-lg backdrop-blur">
            <span className="font-mono">{metrics.totalMassG.toFixed(1)} g</span>
            <span className="mx-1.5 text-surface-600">·</span>
            <span className="font-mono">${metrics.estimatedCostUSD.toFixed(2)}</span>
            <span className="mx-1.5 text-surface-600">·</span>
            <span
              className={
                metrics.symmetryScore >= 0.95
                  ? 'text-pass'
                  : metrics.symmetryScore >= 0.7
                    ? 'text-warn'
                    : 'text-surface-400'
              }
            >
              {metrics.symmetryNote}
            </span>
          </div>
          <div className="pointer-events-auto flex items-start gap-2 rounded-lg border border-accent/25 bg-surface-900/95 px-2.5 py-2 text-[10px] leading-relaxed text-surface-300 shadow-lg backdrop-blur">
            <Lightbulb size={13} className="mt-0.5 shrink-0 text-warn" />
            <p className="min-w-0 flex-1">{tip}</p>
            <button
              type="button"
              onClick={() => setTipIndex((i) => nextTipIndex(i))}
              className="shrink-0 rounded-md border border-surface-700 px-2 py-0.5 text-[9px] uppercase tracking-wide text-surface-400 hover:text-accent"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] transition ${
        active
          ? 'border-accent/50 bg-accent/15 text-accent'
          : 'border-surface-700 text-surface-300 hover:border-surface-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
