import { Columns2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { solveTruss } from '../lib/feaEngine';
import { computeMassCost } from '../lib/massCost';
import { PRESET_LOADERS, type PresetKey } from '../lib/presets';
import type { StructureState } from '../lib/types';

interface CompareModeProps {
  current: StructureState;
  onClose: () => void;
}

/**
 * Side-by-side comparison of two bridge designs under identical analysis metrics.
 */
export function CompareMode({ current, onClose }: CompareModeProps) {
  const [leftKey, setLeftKey] = useState<PresetKey | 'current'>('current');
  const [rightKey, setRightKey] = useState<PresetKey>('warren');

  const left = useMemo(
    () => (leftKey === 'current' ? current : PRESET_LOADERS[leftKey].create()),
    [leftKey, current],
  );
  const right = useMemo(() => PRESET_LOADERS[rightKey].create(), [rightKey]);

  const leftResult = useMemo(() => solveTruss(left.nodes, left.beams), [left]);
  const rightResult = useMemo(() => solveTruss(right.nodes, right.beams), [right]);
  const leftMass = useMemo(() => computeMassCost(left.nodes, left.beams), [left]);
  const rightMass = useMemo(() => computeMassCost(right.nodes, right.beams), [right]);

  const leftDefl = maxDeflection(leftResult);
  const rightDefl = maxDeflection(rightResult);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-950/95 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <Columns2 size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-surface-100">
            Split-Screen Design Comparison
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close design comparison"
          className="rounded-md p-1 text-surface-400 hover:bg-surface-800"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-4 md:grid-cols-2">
        <CompareCard
          title="Design A"
          selected={leftKey}
          onSelect={(k) => setLeftKey(k)}
          allowCurrent
          state={left}
          massG={leftMass.totalMassG}
          cost={leftMass.estimatedCostUSD}
          maxDefl={leftDefl}
          maxRatio={leftResult.maxSafetyRatio}
          passed={leftResult.passed && leftResult.success}
          members={left.beams.length}
        />
        <CompareCard
          title="Design B"
          selected={rightKey}
          onSelect={(k) => setRightKey(k as PresetKey)}
          state={right}
          massG={rightMass.totalMassG}
          cost={rightMass.estimatedCostUSD}
          maxDefl={rightDefl}
          maxRatio={rightResult.maxSafetyRatio}
          passed={rightResult.passed && rightResult.success}
          members={right.beams.length}
        />
      </div>

      <div className="border-t border-surface-700 px-4 py-3 text-center text-xs text-surface-400">
        Winner tip:{' '}
        {leftDefl < rightDefl && leftMass.totalMassG <= rightMass.totalMassG * 1.05 ? (
          <span className="text-pass">Design A is stiffer at similar or lower mass</span>
        ) : rightDefl < leftDefl && rightMass.totalMassG <= leftMass.totalMassG * 1.05 ? (
          <span className="text-pass">Design B is stiffer at similar or lower mass</span>
        ) : (
          <span>Trade-off between stiffness and weight — inspect SF ratios above</span>
        )}
      </div>
    </div>
  );
}

function maxDeflection(result: ReturnType<typeof solveTruss>): number {
  if (!result.success) return Infinity;
  return Math.max(0, ...result.displacements.map((d) => Math.hypot(d.ux, d.uy)));
}

function CompareCard({
  title,
  selected,
  onSelect,
  allowCurrent,
  state,
  massG,
  cost,
  maxDefl,
  maxRatio,
  passed,
  members,
}: {
  title: string;
  selected: string;
  onSelect: (k: PresetKey | 'current') => void;
  allowCurrent?: boolean;
  state: StructureState;
  massG: number;
  cost: number;
  maxDefl: number;
  maxRatio: number;
  passed: boolean;
  members: number;
}) {
  const xs = state.nodes.map((n) => n.x);
  const ys = state.nodes.map((n) => n.y);
  const minX = Math.min(...xs, 0) - 20;
  const maxX = Math.max(...xs, 100) + 20;
  const minY = Math.min(...ys, 0) - 20;
  const maxY = Math.max(...ys, 100) + 20;

  return (
    <div className="flex flex-col rounded-xl border border-surface-700 bg-surface-900">
      <div className="flex items-center justify-between border-b border-surface-700 px-3 py-2">
        <h3 className="text-sm font-semibold text-surface-100">{title}</h3>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value as PresetKey | 'current')}
          className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-surface-200"
        >
          {allowCurrent && <option value="current">Current canvas</option>}
          {(Object.keys(PRESET_LOADERS) as PresetKey[]).map((k) => (
            <option key={k} value={k}>
              {PRESET_LOADERS[k].label}
            </option>
          ))}
        </select>
      </div>
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        className="h-48 w-full bg-[#0f1620]"
      >
        {state.beams.map((b) => {
          const ni = state.nodes.find((n) => n.id === b.nodeI);
          const nj = state.nodes.find((n) => n.id === b.nodeJ);
          if (!ni || !nj) return null;
          return (
            <line
              key={b.id}
              x1={ni.x}
              y1={ni.y}
              x2={nj.x}
              y2={nj.y}
              stroke="#0ea5a4"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
        {state.nodes.map((n) => (
          <circle key={n.id} cx={n.x} cy={n.y} r={5} fill="#e2e8f0" />
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-2 p-3 text-[11px]">
        <Metric label="Members" value={`${members}`} />
        <Metric label="Mass" value={`${massG.toFixed(1)} g`} />
        <Metric label="Est. cost" value={`$${cost.toFixed(2)}`} />
        <Metric
          label="Max |u|"
          value={Number.isFinite(maxDefl) ? `${maxDefl.toExponential(2)} mm` : 'unstable'}
        />
        <Metric label="Peak |σ|/σy" value={`${(maxRatio * 100).toFixed(0)}%`} />
        <Metric label="Status" value={passed ? 'PASSED' : 'FAILED'} warn={!passed} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface-800/70 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-surface-400">{label}</div>
      <div className={`font-mono text-xs font-semibold ${warn ? 'text-fail' : 'text-accent'}`}>
        {value}
      </div>
    </div>
  );
}
