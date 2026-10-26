import { ChevronLeft, ChevronRight, Pause, Play, SkipForward, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
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
  const dialogRef = useAccessibleDialog(onClose);
  const frames = useMemo(() => runCollapseSequence(nodes, beams), [nodes, beams]);
  const [requestedIndex, setIndex] = useState(0);
  const index = Math.min(requestedIndex, Math.max(frames.length - 1, 0));
  const [playing, setPlaying] = useState(true);
  const [intervalMs, setIntervalMs] = useState(700);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setPlaying(false);
        setIndex((current) => Math.max(0, current - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPlaying(false);
        setIndex((current) => Math.min(frames.length - 1, current + 1));
      } else if (event.key === ' ') {
        event.preventDefault();
        setPlaying((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [frames.length]);

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
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing, frames.length, intervalMs]);

  const frame: CollapseFrame | undefined = frames[index];
  const failed = new Set(frame?.failedBeamIds ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Plastic collapse animation" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
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
              <p className="text-[10px] text-surface-500">This simplified animation removes members at yield; it does not model buckling, joint failure, or real collapse behavior.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close collapse animation"
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
            transitionMs={Math.max(180, intervalMs - 80)}
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
              Stage:{' '}
              <span className="font-mono text-surface-200">
                {frame ? index + 1 : 0}/{frames.length}
              </span>
            </span>
            <span>
              {frame?.collapsed ? (
                <span className="font-semibold text-fail">COLLAPSED</span>
              ) : frame?.result.passed ? (
                <span className="text-pass">No modeled yield yet</span>
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
              onClick={() => {
                setPlaying(false);
                setIndex((current) => Math.max(0, current - 1));
              }}
              disabled={index === 0}
              aria-label="Previous collapse frame"
              title="Previous frame"
              className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:border-accent/50 hover:text-accent disabled:opacity-30"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setIndex((current) => Math.min(frames.length - 1, current + 1));
              }}
              disabled={index >= frames.length - 1}
              aria-label="Next collapse frame"
              title="Next frame"
              className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:border-accent/50 hover:text-accent disabled:opacity-30"
            >
              <ChevronRight size={15} />
            </button>
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
            <label className="ml-auto flex items-center gap-1.5 text-xs text-surface-400">
              Pace
              <select
                value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
                className="rounded-md border border-surface-700 bg-surface-800 px-2 py-2 text-xs text-surface-200"
                aria-label="Animation pace"
              >
                <option value={1100}>Slow</option>
                <option value={700}>Normal</option>
                <option value={350}>Fast</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-surface-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full bg-surface-600" /> Undeformed geometry
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full bg-accent" /> Active members
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full bg-fail" /> Yielded members
            </span>
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
  transitionMs,
}: {
  nodes: Node[];
  beams: Beam[];
  frame?: CollapseFrame;
  failed: Set<string>;
  transitionMs: number;
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
  const maxDisplacement = Math.max(
    0,
    ...Array.from(disp.values(), (d) => Math.hypot(d.ux, d.uy)),
  );
  const modelExtent = Math.max(maxX - minX, maxY - minY);
  const scale = maxDisplacement > 1e-9
    ? Math.min(80, Math.max(6, (modelExtent * 0.2) / maxDisplacement))
    : 40;

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
        return (
          <line
            key={`ghost-${b.id}`}
            x1={ni.x}
            y1={ni.y}
            x2={nj.x}
            y2={nj.y}
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="4 6"
            opacity={0.35}
          />
        );
      })}
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
            style={{
              transition: `x1 ${transitionMs}ms ease, y1 ${transitionMs}ms ease, x2 ${transitionMs}ms ease, y2 ${transitionMs}ms ease, opacity 240ms ease, stroke 240ms ease`,
            }}
          />
        );
      })}
      {nodes.map((n) => {
        const p = pos(n);
        return (
          <circle
            key={n.id}
            cx={p.x}
            cy={p.y}
            r={6}
            fill="#e2e8f0"
            stroke="#0f1620"
            strokeWidth={1.5}
            style={{ transition: `cx ${transitionMs}ms ease, cy ${transitionMs}ms ease` }}
          />
        );
      })}
    </svg>
  );
}
