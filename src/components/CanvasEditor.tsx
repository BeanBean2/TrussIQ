import { useCallback, useEffect, useMemo, useRef } from 'react';
import { stressColor } from '../lib/feaEngine';
import type {
  Beam,
  FEAResult,
  GridSize,
  Node,
  SupportType,
  ToolMode,
} from '../lib/types';

const NODE_RADIUS = 7;
const HIT_NODE = 18;
const HIT_BEAM = 12;

interface CanvasEditorProps {
  nodes: Node[];
  beams: Beam[];
  tool: ToolMode;
  gridSize: GridSize;
  result: FEAResult | null;
  showDeflection: boolean;
  deflectionScale: number;
  selectedNodeId: string | null;
  selectedBeamId: string | null;
  beamDraftFrom: string | null;
  bucklingBeamIds?: string[];
  highlightBeamIds?: string[];
  highlightNodeIds?: string[];
  canvasRefCallback?: (el: HTMLCanvasElement | null) => void;
  onSelectNode: (id: string | null) => void;
  onSelectBeam: (id: string | null) => void;
  onPlaceNode: (x: number, y: number) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onBeamClickNode: (nodeId: string) => void;
  onForceNode: (nodeId: string) => void;
  onCycleSupport: (nodeId: string) => void;
  onEraseAt: (nodeId: string | null, beamId: string | null) => void;
  onClearBeamDraft: () => void;
}

export function CanvasEditor({
  nodes,
  beams,
  tool,
  gridSize,
  result,
  showDeflection,
  deflectionScale,
  selectedNodeId,
  selectedBeamId,
  beamDraftFrom,
  bucklingBeamIds = [],
  highlightBeamIds = [],
  highlightNodeIds = [],
  canvasRefCallback,
  onSelectNode,
  onSelectBeam,
  onMoveNode,
  onPlaceNode,


  onBeamClickNode,
  onForceNode,
  onCycleSupport,
  onEraseAt,
  onClearBeamDraft,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const animRef = useRef(0);
  const dashOffsetRef = useRef(0);
  const dragRef = useRef<{ nodeId: string; x: number; y: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);

  useEffect(() => {
    canvasRefCallback?.(canvasRef.current);
    return () => canvasRefCallback?.(null);
  }, [canvasRefCallback]);

  const snap = useCallback(
    (v: number) => Math.round(v / gridSize) * gridSize,
    [gridSize],
  );

  const bucklingSet = useMemo(() => new Set(bucklingBeamIds), [bucklingBeamIds]);
  const hlBeamSet = useMemo(() => new Set(highlightBeamIds), [highlightBeamIds]);
  const hlNodeSet = useMemo(() => new Set(highlightNodeIds), [highlightNodeIds]);
  const memberResultMap = useMemo(
    () => new Map(result?.success ? result.members.map((member) => [member.beamId, member]) : []),
    [result],
  );

  const getWorldPos = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y };
    },
    [],
  );

  const findNodeAt = useCallback(
    (x: number, y: number): Node | null => {
      let best: Node | null = null;
      let bestDist = HIT_NODE;
      for (const n of nodes) {
        const d = Math.hypot(n.x - x, n.y - y);
        if (d < bestDist) {
          bestDist = d;
          best = n;
        }
      }
      return best;
    },
    [nodes],
  );

  const findBeamAt = useCallback(
    (x: number, y: number): Beam | null => {
      let best: Beam | null = null;
      let bestDist = HIT_BEAM;
      for (const b of beams) {
        const ni = nodes.find((n) => n.id === b.nodeI);
        const nj = nodes.find((n) => n.id === b.nodeJ);
        if (!ni || !nj) continue;
        const dist = distToSegment(x, y, ni.x, ni.y, nj.x, nj.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = b;
        }
      }
      return best;
    },
    [beams, nodes],
  );

  const getDisplaced = useCallback(
    (node: Node): { x: number; y: number } => {
      const drag = dragRef.current;
      if (drag?.nodeId === node.id) return { x: drag.x, y: drag.y };
      if (!showDeflection || !result?.success) return { x: node.x, y: node.y };
      const d = result.displacements.find((dd) => dd.nodeId === node.id);
      if (!d) return { x: node.x, y: node.y };
      return {
        x: node.x + deflectionScale * d.ux,
        y: node.y + deflectionScale * d.uy,
      };
    },
    [showDeflection, result, deflectionScale],
  );

  // --- Render loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('resize', resize);

    let lastFrame = performance.now();
    const draw = (now: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const elapsed = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const light = document.documentElement.getAttribute('data-theme') === 'light';
      // Background
      ctx.fillStyle = light ? '#eef2f7' : '#0f1620';
      ctx.fillRect(0, 0, w, h);

      drawGrid(ctx, w, h, gridSize, light);
      dashOffsetRef.current = (dashOffsetRef.current + elapsed * 24) % 20;

      const memberMap = new Map(
        result?.success ? result.members.map((m) => [m.beamId, m]) : [],
      );
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));

      // Undeformed ghost when showing deflection
      if (showDeflection && result?.success) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        for (const b of beams) {
          const ni = nodeMap.get(b.nodeI);
          const nj = nodeMap.get(b.nodeJ);
          if (!ni || !nj) continue;
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(ni.x, ni.y);
          ctx.lineTo(nj.x, nj.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Beams
      for (const b of beams) {
        const ni = nodeMap.get(b.nodeI);
        const nj = nodeMap.get(b.nodeJ);
        if (!ni || !nj) continue;
        const pi = getDisplaced(ni);
        const pj = getDisplaced(nj);
        const member = memberMap.get(b.id);
        const selected = selectedBeamId === b.id;
        const highlighted = hlBeamSet.has(b.id);
        const buckling = bucklingSet.has(b.id);

        let color = '#94a3b8';
        let width = 3;
        if (member) {
          color = stressColor(member.safetyRatio, member.yielded);
          width = member.yielded ? 5 : 3.5;
        }
        if (selected || highlighted) {
          ctx.strokeStyle = highlighted ? '#f59e0b' : '#0ea5a4';
          ctx.lineWidth = width + 4;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        if (member?.status === 'compression') {
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -dashOffsetRef.current;
        } else {
          ctx.setLineDash([]);
        }
        // Blue overlay hint for compression
        if (member?.status === 'compression') {
          ctx.strokeStyle = '#38bdf8';
          ctx.globalAlpha = 0.85;
        }
        ctx.beginPath();
        ctx.moveTo(pi.x, pi.y);
        ctx.lineTo(pj.x, pj.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);

        // Tension solid with stress color (redraw if we overwrote with blue)
        if (member && member.status !== 'compression') {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
        } else if (member?.status === 'compression') {
          // Keep blue dashed as primary; thin stress-color underlay
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Buckling warning badge at midspan
        if (buckling) {
          const mx = (pi.x + pj.x) / 2;
          const my = (pi.y + pj.y) / 2;
          ctx.beginPath();
          ctx.arc(mx, my, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.fillStyle = '#0f1620';
          ctx.font = 'bold 11px "IBM Plex Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', mx, my + 0.5);
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }

      // Beam draft preview
      if (beamDraftFrom && mouseRef.current) {
        const from = nodes.find((n) => n.id === beamDraftFrom);
        if (from) {
          ctx.strokeStyle = '#0ea5a4';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Force arrows
      for (const n of nodes) {
        if (n.fx === 0 && n.fy === 0) continue;
        const p = getDisplaced(n);
        drawForceArrow(ctx, p.x, p.y, n.fx, n.fy);
      }

      // Nodes + supports
      for (const n of nodes) {
        const p = getDisplaced(n);
        drawSupport(ctx, p.x, p.y, n.support);
        const selected = selectedNodeId === n.id;
        const hot = hlNodeSet.has(n.id);
        if (hot) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, NODE_RADIUS + 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = selected ? '#0ea5a4' : hot ? '#fbbf24' : '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = selected ? '#5eead4' : '#0f1620';
        ctx.lineWidth = selected ? 2.5 : 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.fillText(shortId(n.id), p.x + 10, p.y - 10);
      }

      // Cursor ghost for node tool
      if (tool === 'node' && mouseRef.current) {
        ctx.beginPath();
        ctx.arc(snap(mouseRef.current.x), snap(mouseRef.current.y), NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14, 165, 164, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#0ea5a4';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [
    nodes,
    beams,
    gridSize,
    result,
    showDeflection,
    deflectionScale,
    selectedNodeId,
    selectedBeamId,
    beamDraftFrom,
    tool,
    getDisplaced,
    bucklingSet,
    hlBeamSet,
    hlNodeSet,
    snap,
  ]);

  const handleClick = (e: React.MouseEvent) => {
    const { x, y } = getWorldPos(e);
    const hitNode = findNodeAt(x, y);
    const hitBeam = hitNode ? null : findBeamAt(x, y);

    switch (tool) {
      case 'node':
        if (!hitNode) onPlaceNode(snap(x), snap(y));
        break;
      case 'beam':
        if (hitNode) onBeamClickNode(hitNode.id);
        else onClearBeamDraft();
        break;
      case 'force':
        if (hitNode) onForceNode(hitNode.id);
        break;
      case 'support':
        if (hitNode) onCycleSupport(hitNode.id);
        break;
      case 'erase':
        onEraseAt(hitNode?.id ?? null, hitBeam?.id ?? null);
        break;
      case 'select':
      default:
        onSelectNode(hitNode?.id ?? null);
        onSelectBeam(hitNode ? null : hitBeam?.id ?? null);
        break;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getWorldPos(e);
    const drag = dragRef.current;
    if (drag && tool === 'select') {
      const nextX = snap(x + drag.offsetX);
      const nextY = snap(y + drag.offsetY);
      if (nextX !== drag.x || nextY !== drag.y) {
        dragRef.current = {
          ...drag,
          x: nextX,
          y: nextY,
          moved: nextX !== drag.startX || nextY !== drag.startY,
        };
      }
      e.currentTarget.style.cursor = 'grabbing';
    } else {
      e.currentTarget.style.cursor =
        tool === 'select' && findNodeAt(x, y) ? 'grab' : 'default';
    }
    mouseRef.current = { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (tool !== 'select') return;
      const { x, y } = getWorldPos(e);
      const node = findNodeAt(x, y);
      if (!node) return;
      dragRef.current = {
        nodeId: node.id,
        x: node.x,
        y: node.y,
        startX: node.x,
        startY: node.y,
        offsetX: node.x - x,
        offsetY: node.y - y,
        moved: false,
  };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = 'grabbing';
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      e.currentTarget.style.cursor = 'default';
      if (drag.moved) onMoveNode(drag.nodeId, drag.x, drag.y);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    e.currentTarget.style.cursor = cursor;
  };

  const handleMouseLeave = () => {
    mouseRef.current = null;
  };

  const cursor =
    tool === 'node'
      ? 'crosshair'
      : tool === 'erase'
        ? 'not-allowed'
        : tool === 'beam'
          ? 'cell'
          : 'default';

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Truss editor canvas. ${nodes.length} nodes and ${beams.length} members.`}
        className="truss-canvas absolute inset-0"
        style={{ cursor, touchAction: 'none' }}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => {
          e.preventDefault();
          onClearBeamDraft();
        }}
      />
      <details
        className="absolute right-3 top-3 z-10 w-[min(19rem,calc(100%-1.5rem))] text-xs"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && event.currentTarget.open) {
            event.preventDefault();
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
          }
        }}
      >
        <summary className="w-fit cursor-pointer select-none rounded-lg border border-surface-600 bg-surface-900/95 px-3 py-2 font-medium text-surface-200 shadow-lg outline-none hover:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent">
          Structure list <span className="ml-1 text-surface-400">{nodes.length} joints · {beams.length} members</span>
        </summary>
        <div className="mt-2 max-h-[65vh] overflow-y-auto rounded-xl border border-surface-700 bg-surface-900/98 p-3 shadow-xl backdrop-blur">
          <p className="mb-3 text-[10px] leading-4 text-surface-500">Select a joint or member with the keyboard or mouse. Press Escape to close this list.</p>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">Joints</h2>
          {nodes.length === 0 ? <p className="py-2 text-[11px] text-surface-500">No joints in this model yet.</p> : <ul className="space-y-1">
            {nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  aria-pressed={selectedNodeId === node.id}
                  aria-label={`Select joint ${shortId(node.id)}; x ${node.x} millimeters, y ${node.y} millimeters; support ${node.support}; horizontal load ${node.fx} newtons, vertical load ${node.fy} newtons`}
                  onClick={() => { onSelectNode(node.id); onSelectBeam(null); }}
                  className={`w-full rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedNodeId === node.id ? 'bg-accent/15 text-accent' : 'text-surface-300 hover:bg-surface-800'}`}
                >
                  <span className="font-mono">{displayEntityId(node.id, 'J')}</span><span className="ml-2 text-[10px] text-surface-500">({node.x}, {node.y}) mm</span>
                  {(node.support !== 'none' || node.fx !== 0 || node.fy !== 0) && <span className="ml-2 text-[10px] text-surface-400">{node.support !== 'none' ? node.support : ''}{node.fx !== 0 || node.fy !== 0 ? ` · Fx ${node.fx}, Fy ${node.fy} N` : ''}</span>}
                </button>
              </li>
            ))}
          </ul>}
          <h2 className="mb-1 mt-3 border-t border-surface-700 pt-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400">Members</h2>
          {beams.length === 0 ? <p className="py-2 text-[11px] text-surface-500">No members in this model yet.</p> : <ul className="space-y-1">
            {beams.map((beam) => {
              const member = memberResultMap.get(beam.id);
              const force = member ? `${member.status} · ${member.axialForce.toPrecision(4)} N` : 'not analyzed';
              return <li key={beam.id}>
                <button
                  type="button"
                  aria-pressed={selectedBeamId === beam.id}
                  aria-label={`Select member ${shortId(beam.id)}, between joints ${shortId(beam.nodeI)} and ${shortId(beam.nodeJ)}, ${force}`}
                  onClick={() => { onSelectBeam(beam.id); onSelectNode(null); }}
                  className={`w-full rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedBeamId === beam.id ? 'bg-accent/15 text-accent' : 'text-surface-300 hover:bg-surface-800'}`}
                >
                  <span className="font-mono">{displayEntityId(beam.id, 'M')}</span><span className="ml-2 text-[10px] text-surface-500">{shortId(beam.nodeI)}–{shortId(beam.nodeJ)}</span><span className="ml-2 text-[10px] text-surface-400">{force}</span>
                </button>
              </li>;
            })}
          </ul>}
        </div>
      </details>
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div className="max-w-sm rounded-xl border border-surface-700 bg-surface-900/90 px-5 py-4 text-center shadow-lg backdrop-blur">
            <p className="text-sm font-semibold text-surface-100">Start a new truss</p>
            <p className="mt-1 text-xs leading-relaxed text-surface-400">
              Choose <span className="font-mono text-accent">Node (N)</span> to place joints,
              then use <span className="font-mono text-accent">Beam (B)</span> to connect them.
              Load a preset any time from the top bar.
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-surface-900/80 px-2.5 py-1.5 font-mono text-[10px] text-surface-400 backdrop-blur">
        Snap {gridSize}px · {tool.toUpperCase()}
        {beamDraftFrom ? ' · click second node' : ''}
      </div>
    </div>
  );
}

function shortId(id: string): string {
  const parts = id.split('_');
  return parts.length >= 2 ? `N${parts[parts.length - 1]}` : id.slice(-4);
}

function displayEntityId(id: string, prefix: 'J' | 'M'): string {
  const label = shortId(id);
  return label.startsWith('N') ? `${prefix}${label.slice(1)}` : `${prefix}${label}`;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grid: number,
  light = false,
) {
  ctx.strokeStyle = light ? '#d5dde8' : '#1a2332';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  // Major every 5
  const major = grid * 5;
  ctx.strokeStyle = light ? '#b8c4d4' : '#243044';
  for (let x = 0; x <= w; x += major) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += major) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
}

function drawForceArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fx: number,
  fy: number,
) {
  const mag = Math.hypot(fx, fy);
  if (mag < 1e-9) return;
  const len = Math.min(80, 20 + Math.log10(mag + 1) * 18);
  const ux = fx / mag;
  const uy = fy / mag;
  const ex = x + ux * len;
  const ey = y + uy * len;

  ctx.strokeStyle = '#ef4444';
  ctx.fillStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Arrowhead
  const ah = 10;
  const ang = Math.atan2(uy, ux);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - ah * Math.cos(ang - 0.4), ey - ah * Math.sin(ang - 0.4));
  ctx.lineTo(ex - ah * Math.cos(ang + 0.4), ey - ah * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();

  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.fillText(`${mag.toFixed(0)} N`, ex + 6, ey - 6);
}

function drawSupport(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  support: SupportType,
) {
  if (support === 'none') return;
  ctx.strokeStyle = '#f59e0b';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 2;

  if (support === 'pin' || support === 'fixed') {
    // Triangle
    ctx.beginPath();
    ctx.moveTo(x, y + NODE_RADIUS);
    ctx.lineTo(x - 12, y + NODE_RADIUS + 16);
    ctx.lineTo(x + 12, y + NODE_RADIUS + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (support === 'fixed') {
      // Hatch base
      ctx.beginPath();
      ctx.moveTo(x - 16, y + NODE_RADIUS + 16);
      ctx.lineTo(x + 16, y + NODE_RADIUS + 16);
      ctx.stroke();
      for (let i = -14; i <= 14; i += 5) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + NODE_RADIUS + 16);
        ctx.lineTo(x + i - 4, y + NODE_RADIUS + 22);
        ctx.stroke();
      }
    }
  } else if (support === 'rollerY') {
    // Triangle + circles (ground roller)
    ctx.beginPath();
    ctx.moveTo(x, y + NODE_RADIUS);
    ctx.lineTo(x - 12, y + NODE_RADIUS + 14);
    ctx.lineTo(x + 12, y + NODE_RADIUS + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 6, y + NODE_RADIUS + 18, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 6, y + NODE_RADIUS + 18, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (support === 'rollerX') {
    // Side roller
    ctx.beginPath();
    ctx.moveTo(x - NODE_RADIUS, y);
    ctx.lineTo(x - NODE_RADIUS - 14, y - 12);
    ctx.lineTo(x - NODE_RADIUS - 14, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - NODE_RADIUS - 18, y - 6, 3.5, 0, Math.PI * 2);
    ctx.arc(x - NODE_RADIUS - 18, y + 6, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
