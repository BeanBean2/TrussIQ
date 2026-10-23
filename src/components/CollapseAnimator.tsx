import { Pause, Play, SkipForward, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { runCollapseSequence } from '../lib/collapseEngine';
import { stressColor } from '../lib/feaEngine';
import type { Beam, CollapseFrame, Node } from '../lib/types';

interface CollapseAnimatorProps {
  nodes: Node[];
  beams: Beam[];
  onClose: () => void;
}

/**
 * Animated incremental load test with progressive member failure visualization.
 */
export function CollapseAnimator({ nodes, beams, onClose }: CollapseAnimatorProps) {
  const frames = useMemo(() => runCollapseSequence(nodes, beams), [nodes, beams]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(id);
  }, [playing, frames.length]);

  const frame: CollapseFrame | undefined = frames[index];
  const failed = new Set(frame?.failedBeamIds ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-warn" />
            <div>
              <h2 className="text-sm font-semibold text-surface-100">
                Plastic Collapse Animation
              </h2>
              <p className="text-[11px] text-surface-400">
                Incremental load 0→150% · failed members snap &amp; redistribute
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative bg-[#0f1620] px-2 py-3">
          <CollapseCanvas
            nodes={nodes}
            beams={beams}
            frame={frame}
            failed={failed}
          />
        </div>

        <div className="space-y-3 border-t border-surface-700 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-surface-300">
            <span>
              Load:{' '}
              <span className="font-mono text-accent">
                {frame ? frame.loadPct.toFixed(0) : 0}%
              </span>
            </span>
            <span>
              Failed members:{' '}
              <span className="font-mono text-fail">{failed.size}</span>
            </span>
            <span>
              {frame?.collapsed ? (
                <span className="font-semibold text-fail">COLLAPSED</span>
              ) : frame?.result.passed ? (
                <span className="text-pass">Stable</span>
              ) : (
                <span className="text-warn">Yielding</span>
              )}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(frames.length - 1, 0)}
            value={index}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            className="w-full accent-accent"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-surface-950"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setIndex(frames.length - 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-300"
            >
              <SkipForward size={14} />
              End state
            </button>
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setPlaying(true);
              }}
              className="rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-300"
            >
              Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollapseCanvas({
  nodes,
  beams,
  frame,
  failed,
}: {
  nodes: Node[];
  beams: Beam[];
  frame?: CollapseFrame;
  failed: Set<string>;
}) {
  // Simple SVG so we don't fight the main canvas RAF loop
  if (nodes.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-surface-400">No structure</div>;
  }

  const pad = 40;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  const memberMap = new Map(frame?.result.members.map((m) => [m.beamId, m]) ?? []);
  const disp = new Map(frame?.result.displacements.map((d) => [d.nodeId, d]) ?? []);
  const scale = 40;

  const pos = (n: Node) => {
    const d = disp.get(n.id);
    return {
      x: n.x + (d ? d.ux * scale : 0),
      y: n.y + (d ? d.uy * scale : 0),
    };
  };

  return (
    <svg viewBox={vb} className="mx-auto h-72 w-full max-w-2xl">
      {beams.map((b) => {
        const ni = nodes.find((n) => n.id === b.nodeI);
        const nj = nodes.find((n) => n.id === b.nodeJ);
        if (!ni || !nj) return null;
        const a = pos(ni);
        const c = pos(nj);
        const isFailed = failed.has(b.id);
        const m = memberMap.get(b.id);
        const color = isFailed
          ? '#1e293b'
          : m
            ? stressColor(m.safetyRatio, m.yielded)
            : '#64748b';
        return (
          <line
            key={b.id}
            x1={a.x}
            y1={a.y}
            x2={c.x}
            y2={c.y}
            stroke={color}
            strokeWidth={isFailed ? 2 : 4}
            strokeDasharray={isFailed ? '6 4' : undefined}
            opacity={isFailed ? 0.55 : 1}
            strokeLinecap="round"
          />
        );
      })}
      {nodes.map((n) => {
        const p = pos(n);
        return <circle key={n.id} cx={p.x} cy={p.y} r={6} fill="#e2e8f0" />;
      })}
    </svg>
  );
}
