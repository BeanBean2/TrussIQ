import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { axialLabelColors, stressColorForPalette, type ResultPalette } from '../lib/resultPalette';
import type { MemberViewFilter } from '../lib/structureMetrics';
import { formatForceDisplay, formatLengthDisplay, formatStressDisplay, type DisplayUnitSystem } from '../lib/units';
import type {
  Beam,
  DynamicsMode,
  FEAResult,
  GridSize,
  Node,
  SupportType,
  ToolMode,
} from '../lib/types';

const NODE_RADIUS = 7;
const HIT_NODE = 18;
const HIT_BEAM = 12;
/** px per world-mm — zoom in far enough to place 1 mm snaps comfortably */
const MIN_VIEW_SCALE = 0.01;
const MAX_VIEW_SCALE = 80;

/** Maps world mm → canvas CSS pixels so any model size stays in view. */
type ViewTransform = { scale: number; ox: number; oy: number };

function clampViewScale(scale: number): number {
  return Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, scale));
}

function computeViewFit(
  points: Array<{ x: number; y: number }>,
  w: number,
  h: number,
  pad = 56,
  gridSize = 20,
): ViewTransform {
  if (w < 16 || h < 16) return { scale: 1, ox: 0, oy: 0 };
  if (points.length === 0) {
    // Empty canvas: show a workable field of grid squares around the origin
    const extent = Math.max(gridSize * 24, 240);
    const scale = clampViewScale(Math.min((w - 2 * pad) / extent, (h - 2 * pad) / extent));
    return { scale, ox: w / 2, oy: h / 2 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  // Room for support glyphs drawn below/ beside joints
  minX -= 24;
  maxX += 24;
  minY -= 20;
  maxY += 36;

  const bw = Math.max(maxX - minX, gridSize * 4);
  const bh = Math.max(maxY - minY, gridSize * 4);
  const raw = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh);
  const scale = clampViewScale(raw);
  return {
    scale,
    ox: (w - bw * scale) / 2 - minX * scale,
    oy: (h - bh * scale) / 2 - minY * scale,
  };
}

function zoomViewAt(
  view: ViewTransform,
  sx: number,
  sy: number,
  factor: number,
): ViewTransform {
  const worldX = (sx - view.ox) / Math.max(view.scale, 1e-6);
  const worldY = (sy - view.oy) / Math.max(view.scale, 1e-6);
  const scale = clampViewScale(view.scale * factor);
  return {
    scale,
    ox: sx - worldX * scale,
    oy: sy - worldY * scale,
  };
}

/** Round to a 1–2–5 × 10^n step (CAD-style). */
function niceLengthStep(idealMm: number): number {
  const abs = Math.max(idealMm, 1e-6);
  const exp = Math.floor(Math.log10(abs));
  const pow = 10 ** exp;
  const frac = abs / pow;
  const nice = frac <= 1.5 ? 1 : frac <= 3.5 ? 2 : frac <= 7.5 ? 5 : 10;
  return nice * pow;
}

/**
 * Pick a world-mm square size so on-screen squares stay readable while zooming.
 * `baseGridMm` is the user preference from the top bar (also used for major accents).
 */
function adaptiveGridStep(scale: number, baseGridMm: number): number {
  const targetPx = 28;
  const idealMm = targetPx / Math.max(scale, 1e-6);
  let step = niceLengthStep(idealMm);
  // Prefer aligning with the user's base grid when close
  if (baseGridMm > 0) {
    const ratio = step / baseGridMm;
    if (ratio > 0.4 && ratio < 2.5) {
      const candidates = [
        baseGridMm / 10,
        baseGridMm / 5,
        baseGridMm / 2,
        baseGridMm,
        baseGridMm * 2,
        baseGridMm * 5,
      ].filter((v) => v >= 0.1);
      let best = step;
      let bestScore = Math.abs(Math.log((step * scale) / targetPx));
      for (const c of candidates) {
        const px = c * scale;
        if (px < 8 || px > 72) continue;
        const score = Math.abs(Math.log(px / targetPx));
        if (score < bestScore) {
          best = c;
          bestScore = score;
        }
      }
      step = best;
    }
  }
  // Keep squares from getting absurdly large/small on screen
  while (step * scale > 64 && step > 0.1) step = niceLengthStep(step / 2.2);
  while (step * scale < 10) step = niceLengthStep(step * 2.2);
  return step;
}

interface CanvasEditorProps {
  nodes: Node[];
  /** User / scaled loads before wind or seismic overlays (same node ids). */
  userLoadNodes?: Node[];
  dynamicsMode?: DynamicsMode;
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
  showForceLabels?: boolean;
  memberFilter?: MemberViewFilter;
  displayUnits?: DisplayUnitSystem;
  resultPalette?: ResultPalette;
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
  userLoadNodes,
  dynamicsMode = 'none',
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
  showForceLabels = false,
  memberFilter = 'all',
  displayUnits = 'si',
  resultPalette = 'default',
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
  const suppressClickRef = useRef(false);
  const lastHoverRef = useRef<string | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  const viewRef = useRef<ViewTransform>({ scale: 1, ox: 0, oy: 0 });
  /** Once the user zooms/pans, stop auto-fitting until they click Fit. */
  const userViewRef = useRef(false);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const [hoverTip, setHoverTip] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [viewScale, setViewScale] = useState(1);
  const [activeGridMm, setActiveGridMm] = useState<number>(gridSize);
  // Adaptive zoom steps are arbitrary mm values, not limited to GridSize presets
  const snapStepRef = useRef<number>(gridSize);
  const lastActiveGridRef = useRef<number>(gridSize);

  const syncViewScale = useCallback((scale: number) => {
    setViewScale((prev) => (Math.abs(prev - scale) < 1e-6 ? prev : scale));
    const step = adaptiveGridStep(scale, gridSize);
    snapStepRef.current = step;
    if (Math.abs(step - lastActiveGridRef.current) >= 1e-9) {
      lastActiveGridRef.current = step;
      setActiveGridMm(step);
    }
  }, [gridSize]);

  const markManualView = useCallback(() => {
    userViewRef.current = true;
  }, []);

  useEffect(() => {
    canvasRefCallback?.(canvasRef.current);
    return () => canvasRefCallback?.(null);
  }, [canvasRefCallback]);

  useEffect(() => {
    const step = adaptiveGridStep(viewRef.current.scale, gridSize);
    snapStepRef.current = step;
    if (Math.abs(step - lastActiveGridRef.current) >= 1e-9) {
      lastActiveGridRef.current = step;
      setActiveGridMm(step);
    }
  }, [gridSize]);

  const snap = useCallback((v: number) => {
    const step = snapStepRef.current || gridSize;
    return Math.round(v / step) * step;
  }, [gridSize]);

  const bucklingSet = useMemo(() => new Set(bucklingBeamIds), [bucklingBeamIds]);
  const hlBeamSet = useMemo(() => new Set(highlightBeamIds), [highlightBeamIds]);
  const hlNodeSet = useMemo(() => new Set(highlightNodeIds), [highlightNodeIds]);
  const memberResultMap = useMemo(
    () => new Map(result?.success ? result.members.map((member) => [member.beamId, member]) : []),
    [result],
  );
  const userLoadMap = useMemo(() => {
    const source = userLoadNodes ?? nodes;
    return new Map(source.map((node) => [node.id, node]));
  }, [userLoadNodes, nodes]);

  const getWorldPos = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const view = viewRef.current;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const scale = Math.max(view.scale, 1e-6);
      return {
        x: (sx - view.ox) / scale,
        y: (sy - view.oy) / scale,
      };
    },
    [],
  );

  const findNodeAt = useCallback(
    (x: number, y: number): Node | null => {
      let best: Node | null = null;
      const hitR = HIT_NODE / Math.max(viewRef.current.scale, 1e-6);
      let bestDist = hitR;
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
      const hitR = HIT_BEAM / Math.max(viewRef.current.scale, 1e-6);
      let bestDist = hitR;
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

  const fitView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const fitPoints =
      showDeflection && result?.success
        ? nodes.map((node) => getDisplaced(node))
        : nodes;
    userViewRef.current = false;
    const next = computeViewFit(fitPoints, w, h, 56, gridSize);
    viewRef.current = next;
    syncViewScale(next.scale);
  }, [nodes, gridSize, syncViewScale, showDeflection, result, getDisplaced]);

  // Return to auto-fit when the model is cleared so an empty canvas stays usable
  useEffect(() => {
    if (nodes.length === 0) userViewRef.current = false;
  }, [nodes.length]);

  // Keep the zoom % HUD in sync while auto-fitting
  useEffect(() => {
    if (userViewRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || canvas.clientWidth < 16) return;
    const next = computeViewFit(nodes, canvas.clientWidth, canvas.clientHeight, 56, gridSize);
    viewRef.current = next;
    syncViewScale(next.scale);
  }, [nodes, gridSize, syncViewScale]);

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

      // Auto-fit until the user zooms or pans; then keep their view
      if (!userViewRef.current) {
        const fitPoints =
          showDeflection && result?.success
            ? nodes.map((node) => getDisplaced(node))
            : nodes;
        viewRef.current = computeViewFit(fitPoints, w, h, 56, gridSize);
      }
      const view = viewRef.current;
      const toScreen = (x: number, y: number) => ({
        x: x * view.scale + view.ox,
        y: y * view.scale + view.oy,
      });

      // Squares auto-size with zoom so they stay readable; snap follows the active step
      const gridStep = adaptiveGridStep(view.scale, gridSize);
      snapStepRef.current = gridStep;
      drawWorldGrid(ctx, w, h, gridStep, view, light, gridSize);
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
          const a = toScreen(ni.x, ni.y);
          const c = toScreen(nj.x, nj.y);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(c.x, c.y);
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
        const pi = toScreen(getDisplaced(ni).x, getDisplaced(ni).y);
        const pj = toScreen(getDisplaced(nj).x, getDisplaced(nj).y);
        const member = memberMap.get(b.id);
        const selected = selectedBeamId === b.id;
        const highlighted = hlBeamSet.has(b.id);
        const buckling = bucklingSet.has(b.id);
        const filteredOut = !memberPassesFilter(memberFilter, member);

        let color = '#94a3b8';
        let width = 3;
        if (member) {
          color = stressColorForPalette(member.safetyRatio, member.yielded, resultPalette);
          width = member.yielded ? 5 : 3.5;
        }
        if (selected || highlighted) {
          ctx.strokeStyle = highlighted ? '#f59e0b' : '#0ea5a4';
          ctx.lineWidth = width + 4;
          ctx.globalAlpha = filteredOut ? 0.15 : 0.4;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.globalAlpha = filteredOut && !selected && !highlighted ? 0.12 : 1;
        if (member?.status === 'compression') {
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -dashOffsetRef.current;
        } else {
          ctx.setLineDash([]);
        }
        // Blue overlay hint for compression
        if (member?.status === 'compression' && !filteredOut) {
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
        if (buckling && !filteredOut) {
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

        // Always measure undeformed centerline length (not the deflected drawing)
        const worldLen = Math.hypot(nj.x - ni.x, nj.y - ni.y);
        const pi0 = toScreen(ni.x, ni.y);
        const pj0 = toScreen(nj.x, nj.y);

        // Length label on undeformed midspan so it stays accurate when deflection is on
        if (!filteredOut) {
          // □ count uses the drawn (zoom-adaptive) square, not the TopBar base size
          drawMemberLabel(ctx, pi0, pj0, formatMemberLength(worldLen, gridStep, displayUnits), {
            light,
            offset: showForceLabels && member ? 18 : 12,
            fill: selected || highlighted ? '#5eead4' : light ? '#334155' : '#cbd5e1',
          });
        }

        // Force / stress labels follow the drawn (possibly deflected) member
        if (showForceLabels && member && !filteredOut) {
          const label = formatForceDisplay(member.axialForce, displayUnits);
          const axialColors = axialLabelColors(resultPalette);
          drawMemberLabel(ctx, pi, pj, label, {
            light,
            offset: -14,
            fill: member.status === 'compression' ? axialColors.compression : axialColors.tension,
          });
        }

        ctx.globalAlpha = 1;
      }

      // Beam draft preview with live length
      if (beamDraftFrom && mouseRef.current) {
        const from = nodes.find((n) => n.id === beamDraftFrom);
        if (from) {
          const snapX = snap(mouseRef.current.x);
          const snapY = snap(mouseRef.current.y);
          const a = toScreen(from.x, from.y);
          const b = toScreen(snapX, snapY);
          ctx.strokeStyle = '#0ea5a4';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.setLineDash([]);
          const draftLen = Math.hypot(snapX - from.x, snapY - from.y);
          drawMemberLabel(ctx, a, b, formatMemberLength(draftLen, gridStep, displayUnits), {
            light,
            offset: 14,
            fill: '#5eead4',
          });
        }
      }

      drawScaleBar(ctx, w, h, gridStep, view.scale, light);

      // Wind field cue (behind force arrows)
      if (dynamicsMode === 'wind') {
        drawWindField(ctx, w, h, light, dashOffsetRef.current);
      } else if (dynamicsMode === 'seismic') {
        drawSeismicField(ctx, w, h, light, dashOffsetRef.current);
      }

      // Applied forces: user loads (red) + environmental overlays (cyan / violet)
      for (const n of nodes) {
        const p = toScreen(getDisplaced(n).x, getDisplaced(n).y);
        const user = userLoadMap.get(n.id);
        const userFx = user?.fx ?? 0;
        const userFy = user?.fy ?? 0;
        const envFx = n.fx - userFx;
        const envFy = n.fy - userFy;

        if (Math.hypot(userFx, userFy) > 1e-6) {
          drawForceArrow(ctx, p.x, p.y, userFx, userFy, {
            color: '#ef4444',
            alwaysLabel: showForceLabels,
            tag: 'load',
          });
        }
        if (dynamicsMode !== 'none' && Math.hypot(envFx, envFy) > 1e-6) {
          drawForceArrow(ctx, p.x, p.y, envFx, envFy, {
            color: dynamicsMode === 'wind' ? '#38bdf8' : '#c084fc',
            alwaysLabel: true,
            tag: dynamicsMode === 'wind' ? 'wind' : 'seis',
            minLen: 28,
          });
        }
      }

      // Support reactions after a successful solve
      if (result?.success && result.reactions) {
        for (const reaction of result.reactions) {
          if (Math.hypot(reaction.fx, reaction.fy) < 1e-3) continue;
          const node = nodes.find((n) => n.id === reaction.nodeId);
          if (!node || node.support === 'none') continue;
          const p = toScreen(getDisplaced(node).x, getDisplaced(node).y);
          drawForceArrow(ctx, p.x, p.y, reaction.fx, reaction.fy, {
            color: '#f59e0b',
            alwaysLabel: true,
            tag: 'Rx',
            dashed: true,
            minLen: 24,
          });
        }
      }

      // Nodes + supports
      for (const n of nodes) {
        const p = toScreen(getDisplaced(n).x, getDisplaced(n).y);
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
        const ghost = toScreen(snap(mouseRef.current.x), snap(mouseRef.current.y));
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14, 165, 164, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#0ea5a4';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      // Trackpad pinch often sends ctrlKey; treat both as zoom
      const direction = event.deltaY > 0 ? 1 / 1.12 : 1.12;
      const next = zoomViewAt(viewRef.current, sx, sy, direction);
      viewRef.current = next;
      userViewRef.current = true;
      syncViewScale(next.scale);
    };

    animRef.current = requestAnimationFrame(draw);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', onWheel);
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
    showForceLabels,
    memberFilter,
    displayUnits,
    resultPalette,
    syncViewScale,
    dynamicsMode,
    userLoadMap,
  ]);

  const zoomBy = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const sx = canvas.clientWidth / 2;
      const sy = canvas.clientHeight / 2;
      const next = zoomViewAt(viewRef.current, sx, sy, factor);
      viewRef.current = next;
      markManualView();
      syncViewScale(next.scale);
    },
    [syncViewScale, markManualView],
  );

  const handleClick = (e: React.MouseEvent) => {
    // Ignore the click that fires right after finishing a node drag
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
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
    const pan = panRef.current;
    if (pan) {
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const dx = sx - pan.sx;
      const dy = sy - pan.sy;
      viewRef.current = {
        scale: viewRef.current.scale,
        ox: pan.ox + dx,
        oy: pan.oy + dy,
      };
      if (Math.hypot(dx, dy) > 3) {
        panRef.current = { ...pan, moved: true };
        markManualView();
      }
      e.currentTarget.style.cursor = 'grabbing';
      return;
    }

    const { x, y } = getWorldPos(e);
    const snapped = { x: snap(x), y: snap(y) };
    const prevCursor = lastCursorRef.current;
    if (!prevCursor || prevCursor.x !== snapped.x || prevCursor.y !== snapped.y) {
      lastCursorRef.current = snapped;
      setCursorWorld(snapped);
    }
    const hitNode = findNodeAt(x, y);
    const hitBeam = hitNode ? null : findBeamAt(x, y);
    let nextTip: string | null = null;
    if (hitNode) {
      const d = result?.displacements.find((item) => item.nodeId === hitNode.id);
      nextTip =
        `${shortId(hitNode.id)} · (${hitNode.x.toFixed(0)}, ${hitNode.y.toFixed(0)}) mm · ${hitNode.support}` +
        (hitNode.fx || hitNode.fy ? ` · F=(${hitNode.fx}, ${hitNode.fy}) N` : '') +
        (d ? ` · u=(${d.ux.toExponential(2)}, ${d.uy.toExponential(2)}) mm` : '');
    } else if (hitBeam) {
      const member = memberResultMap.get(hitBeam.id);
      const ni = nodes.find((n) => n.id === hitBeam.nodeI);
      const nj = nodes.find((n) => n.id === hitBeam.nodeJ);
      const len = ni && nj ? formatMemberLength(Math.hypot(nj.x - ni.x, nj.y - ni.y), activeGridMm, displayUnits) : null;
      nextTip =
        `${displayEntityId(hitBeam.id, 'M')} · ${shortId(hitBeam.nodeI)}–${shortId(hitBeam.nodeJ)}` +
        (len ? ` · L ${len}` : '') +
        (member
          ? ` · ${member.status} ${formatForceDisplay(member.axialForce, displayUnits)} · σ ${formatStressDisplay(member.stress, displayUnits)} · util ${(member.safetyRatio * 100).toFixed(0)}%`
          : ' · not analyzed');
    }
    if (nextTip !== lastHoverRef.current) {
      lastHoverRef.current = nextTip;
      setHoverTip(nextTip);
    }
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
      const overNode = !!findNodeAt(x, y);
      // Empty canvas shows grab so dragging the surface is obvious; joints still grab in Select
      e.currentTarget.style.cursor =
        tool === 'select' && overNode
          ? 'grab'
          : !overNode
            ? tool === 'node' || tool === 'beam' || tool === 'force' || tool === 'support' || tool === 'erase'
              ? cursor
              : 'grab'
            : cursor;
    }
    mouseRef.current = { x, y };
  };

  const beginPan = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    panRef.current = {
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
      ox: viewRef.current.ox,
      oy: viewRef.current.oy,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Middle / right / Alt+left always pan
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      beginPan(e);
      return;
    }

    if (e.button !== 0) return;

    const { x, y } = getWorldPos(e);
    const node = findNodeAt(x, y);

    // Select tool on a joint → drag the joint
    if (tool === 'select' && node) {
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
      return;
    }

    // Empty surface (or non-joint hit) → drag to pan the view
    // A click without movement still runs the normal tool action via onClick
    if (!node) {
      beginPan(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      const pan = panRef.current;
      panRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      e.currentTarget.style.cursor = cursor;
      if (pan.moved) {
        suppressClickRef.current = true;
        syncViewScale(viewRef.current.scale);
      }
      // Right-click without a drag still clears a beam draft
      if (e.button === 2 && !pan.moved) onClearBeamDraft();
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    e.currentTarget.style.cursor = cursor;
    if (drag.moved) {
      suppressClickRef.current = true;
      onMoveNode(drag.nodeId, drag.x, drag.y);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    panRef.current = null;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    e.currentTarget.style.cursor = cursor;
  };

  const handleMouseLeave = () => {
    mouseRef.current = null;
    lastHoverRef.current = null;
    lastCursorRef.current = null;
    setHoverTip(null);
    setCursorWorld(null);
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
              const ni = nodes.find((n) => n.id === beam.nodeI);
              const nj = nodes.find((n) => n.id === beam.nodeJ);
              const rawLen = ni && nj ? Math.hypot(nj.x - ni.x, nj.y - ni.y) : null;
              const length = rawLen !== null ? formatMemberLength(rawLen, activeGridMm, displayUnits) : '—';
              const force = member
                ? `${member.status} · ${formatForceDisplay(member.axialForce, displayUnits)}`
                : 'not analyzed';
              return <li key={beam.id}>
                <button
                  type="button"
                  aria-pressed={selectedBeamId === beam.id}
                  aria-label={`Select member ${shortId(beam.id)}, between joints ${shortId(beam.nodeI)} and ${shortId(beam.nodeJ)}, length ${length}, ${force}`}
                  onClick={() => { onSelectBeam(beam.id); onSelectNode(null); }}
                  className={`w-full rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedBeamId === beam.id ? 'bg-accent/15 text-accent' : 'text-surface-300 hover:bg-surface-800'}`}
                >
                  <span className="font-mono">{displayEntityId(beam.id, 'M')}</span><span className="ml-2 text-[10px] text-surface-500">{shortId(beam.nodeI)}–{shortId(beam.nodeJ)}</span><span className="ml-2 text-[10px] text-surface-400">{length}</span><span className="ml-2 text-[10px] text-surface-400">{force}</span>
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
      <div className="pointer-events-none absolute left-3 top-3 z-[5] max-w-[min(22rem,calc(100%-1.5rem))] space-y-1">
        <div className="rounded-md bg-surface-900/80 px-2.5 py-1.5 font-mono text-[10px] text-surface-400 backdrop-blur">
          □ = {formatGridStep(activeGridMm)} · {Math.round(viewScale * 100)}% · {tool.toUpperCase()}
          {cursorWorld ? ` · (${formatCoord(cursorWorld.x)}, ${formatCoord(cursorWorld.y)}) mm` : ''}
          {beamDraftFrom ? ' · click second node' : ''}
        </div>
        {(dynamicsMode !== 'none' || (result?.success && (result.reactions?.some((r) => Math.hypot(r.fx, r.fy) > 1e-3)))) && (
          <div className="flex flex-wrap gap-2 rounded-md border border-surface-700 bg-surface-900/90 px-2.5 py-1.5 text-[10px] text-surface-300 backdrop-blur">
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-sm bg-red-500" /> Load</span>
            {dynamicsMode === 'wind' && (
              <span className="inline-flex items-center gap-1 text-sky-300"><span className="h-1.5 w-3 rounded-sm bg-sky-400" /> Wind</span>
            )}
            {dynamicsMode === 'seismic' && (
              <span className="inline-flex items-center gap-1 text-purple-300"><span className="h-1.5 w-3 rounded-sm bg-purple-400" /> Seismic</span>
            )}
            {result?.success && (
              <span className="inline-flex items-center gap-1 text-amber-300"><span className="h-0.5 w-3 border-t border-dashed border-amber-400" /> Reaction</span>
            )}
          </div>
        )}
        {hoverTip && (
          <div className="rounded-md border border-accent/30 bg-surface-900/95 px-2.5 py-1.5 text-[10px] leading-snug text-surface-200 shadow-lg backdrop-blur">
            {hoverTip}
          </div>
        )}
      </div>
      <div className="canvas-zoom-controls pointer-events-auto absolute bottom-14 right-3 z-10 flex flex-col items-stretch gap-1">
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          title="Zoom in (scroll wheel)"
          aria-label="Zoom in"
          className="inline-flex items-center justify-center rounded-lg border border-surface-600 bg-surface-900/95 p-2 text-surface-200 shadow-lg backdrop-blur hover:border-accent/50 hover:text-accent"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.25)}
          title="Zoom out (scroll wheel)"
          aria-label="Zoom out"
          className="inline-flex items-center justify-center rounded-lg border border-surface-600 bg-surface-900/95 p-2 text-surface-200 shadow-lg backdrop-blur hover:border-accent/50 hover:text-accent"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={fitView}
          title="Fit model in view"
          aria-label="Fit model in view"
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-surface-600 bg-surface-900/95 px-2 py-1.5 text-[10px] font-medium text-surface-200 shadow-lg backdrop-blur hover:border-accent/50 hover:text-accent"
        >
          <Maximize2 size={12} /> Fit
        </button>
      </div>
    </div>
  );
}

function memberPassesFilter(
  filter: MemberViewFilter,
  member: { status: string; yielded: boolean } | undefined,
): boolean {
  if (filter === 'all') return true;
  if (!member) return false;
  if (filter === 'tension') return member.status === 'tension';
  if (filter === 'compression') return member.status === 'compression';
  if (filter === 'yielded') return member.yielded;
  if (filter === 'zero') return member.status === 'zero';
  return true;
}

function shortId(id: string): string {
  const parts = id.split('_');
  return parts.length >= 2 ? `N${parts[parts.length - 1]}` : id.slice(-4);
}

function displayEntityId(id: string, prefix: 'J' | 'M'): string {
  const label = shortId(id);
  return label.startsWith('N') ? `${prefix}${label.slice(1)}` : `${prefix}${label}`;
}

function formatGridStep(mm: number): string {
  return formatLengthDisplay(mm, 'si');
}

/** Length plus whole drawn-grid squares when the member lands on the snap lattice. */
function formatMemberLength(mm: number, baseGridMm: number, units: DisplayUnitSystem = 'si'): string {
  const text = formatLengthDisplay(mm, units);
  if (!(baseGridMm > 0) || !Number.isFinite(mm)) return text;
  const squares = Math.abs(mm) / baseGridMm;
  if (squares >= 1 && Math.abs(squares - Math.round(squares)) < 1e-6) {
    return `${text} (${Math.round(squares)}□)`;
  }
  return text;
}

function formatCoord(mm: number): string {
  if (Math.abs(mm - Math.round(mm)) < 1e-6) return `${Math.round(mm)}`;
  if (Math.abs(mm) >= 10) return mm.toFixed(1);
  return parseFloat(mm.toFixed(2)).toString();
}

/** Draw world-aligned grid; `stepMm` is the current (zoom-adaptive) square size. */
function drawWorldGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stepMm: number,
  view: ViewTransform,
  light = false,
  baseGridMm = stepMm,
) {
  const { scale, ox, oy } = view;
  if (stepMm * scale < 4) return;

  const worldLeft = (0 - ox) / scale;
  const worldRight = (w - ox) / scale;
  const worldTop = (0 - oy) / scale;
  const worldBottom = (h - oy) / scale;

  const xStart = Math.floor(worldLeft / stepMm) * stepMm;
  const yStart = Math.floor(worldTop / stepMm) * stepMm;

  ctx.lineWidth = 1;
  ctx.strokeStyle = light ? '#d5dde8' : '#1a2332';
  for (let x = xStart; x <= worldRight + stepMm; x += stepMm) {
    const sx = Math.round(x * scale + ox) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }
  for (let y = yStart; y <= worldBottom + stepMm; y += stepMm) {
    const sy = Math.round(y * scale + oy) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
  }

  // Major every 5 adaptive squares
  const major = stepMm * 5;
  const xMajor = Math.floor(worldLeft / major) * major;
  const yMajor = Math.floor(worldTop / major) * major;
  ctx.strokeStyle = light ? '#b8c4d4' : '#243044';
  for (let x = xMajor; x <= worldRight + major; x += major) {
    const sx = Math.round(x * scale + ox) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }
  for (let y = yMajor; y <= worldBottom + major; y += major) {
    const sy = Math.round(y * scale + oy) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
  }

  // Accent lines on the user's base grid (when finer than the adaptive step)
  if (baseGridMm > stepMm * 1.01 && baseGridMm * scale >= 8) {
    const xBase = Math.floor(worldLeft / baseGridMm) * baseGridMm;
    const yBase = Math.floor(worldTop / baseGridMm) * baseGridMm;
    ctx.strokeStyle = light ? '#94a3b8' : '#334155';
    ctx.lineWidth = 1.25;
    for (let x = xBase; x <= worldRight + baseGridMm; x += baseGridMm) {
      const sx = Math.round(x * scale + ox) + 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    for (let y = yBase; y <= worldBottom + baseGridMm; y += baseGridMm) {
      const sy = Math.round(y * scale + oy) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }
  }
}

function drawMemberLabel(
  ctx: CanvasRenderingContext2D,
  pi: { x: number; y: number },
  pj: { x: number; y: number },
  text: string,
  opts: { light?: boolean; offset?: number; fill?: string },
) {
  const dx = pj.x - pi.x;
  const dy = pj.y - pi.y;
  const len = Math.hypot(dx, dy);
  if (len < 8) return;

  let nx = -dy / len;
  let ny = dx / len;
  // Prefer labels toward the top of the canvas
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const offset = opts.offset ?? 12;
  const mx = (pi.x + pj.x) / 2 + nx * offset;
  const my = (pi.y + pj.y) / 2 + ny * offset;

  ctx.save();
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = opts.light ? 'rgba(238, 242, 247, 0.92)' : 'rgba(15, 22, 32, 0.82)';
  ctx.fillRect(mx - tw / 2 - 3, my - 6, tw + 6, 12);
  ctx.fillStyle = opts.fill ?? (opts.light ? '#334155' : '#cbd5e1');
  ctx.fillText(text, mx, my);
  ctx.restore();
}

/** Corner scale: one grid square and a 5-square major tick (capped so it fits when zoomed in). */
function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  gridSize: number,
  scale: number,
  light: boolean,
) {
  const maxBar = Math.min(160, w * 0.35);
  let squares = 5;
  let one = gridSize * scale;
  let five = one * squares;
  while (five > maxBar && squares > 1) {
    squares -= 1;
    five = one * squares;
  }
  if (five > maxBar) {
    // Extreme zoom: show a 1-square bar shrunk to max width with true length label
    one = maxBar;
    five = maxBar;
    squares = 1;
  }
  const pad = 12;
  const barY = h - pad - 8;
  const barX = w - pad - five;
  const endLabel = formatLengthDisplay(gridSize * squares, 'si');

  ctx.save();
  ctx.fillStyle = light ? 'rgba(238, 242, 247, 0.9)' : 'rgba(15, 22, 32, 0.85)';
  ctx.fillRect(barX - 8, barY - 22, five + 16, 34);
  ctx.strokeStyle = light ? '#475569' : '#94a3b8';
  ctx.fillStyle = light ? '#334155' : '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX, barY);
  ctx.lineTo(barX + five, barY);
  ctx.moveTo(barX, barY - 5);
  ctx.lineTo(barX, barY + 5);
  if (squares > 1) {
    ctx.moveTo(barX + one, barY - 3);
    ctx.lineTo(barX + one, barY + 3);
  }
  ctx.moveTo(barX + five, barY - 5);
  ctx.lineTo(barX + five, barY + 5);
  ctx.stroke();
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`□ ${formatGridStep(gridSize)}`, barX, barY - 8);
  ctx.textAlign = 'right';
  ctx.fillText(endLabel, barX + five, barY - 8);
  ctx.restore();
}

function drawForceArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fx: number,
  fy: number,
  opts: {
    color?: string;
    alwaysLabel?: boolean;
    tag?: string;
    dashed?: boolean;
    minLen?: number;
  } = {},
) {
  const mag = Math.hypot(fx, fy);
  if (mag < 1e-9) return;
  const color = opts.color ?? '#ef4444';
  const len = Math.max(
    opts.minLen ?? 18,
    Math.min(88, 20 + Math.log10(mag + 1) * 18),
  );
  const ux = fx / mag;
  const uy = fy / mag;
  const ex = x + ux * len;
  const ey = y + uy * len;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = opts.dashed ? 2 : 2.5;
  if (opts.dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);

  const ah = 10;
  const ang = Math.atan2(uy, ux);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - ah * Math.cos(ang - 0.4), ey - ah * Math.sin(ang - 0.4));
  ctx.lineTo(ex - ah * Math.cos(ang + 0.4), ey - ah * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();

  if (opts.alwaysLabel) {
    const text = opts.tag
      ? `${opts.tag} ${mag >= 100 ? mag.toFixed(0) : mag.toFixed(1)} N`
      : `${mag.toFixed(0)} N`;
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(text).width;
    const lx = ex + 6;
    const ly = ey - 4;
    ctx.fillStyle = 'rgba(15, 22, 32, 0.78)';
    ctx.fillRect(lx - 2, ly - 11, tw + 4, 13);
    ctx.fillStyle = color;
    ctx.fillText(text, lx, ly);
  }
  ctx.restore();
}

function drawWindField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  light: boolean,
  phase: number,
) {
  ctx.save();
  ctx.strokeStyle = light ? 'rgba(14, 165, 233, 0.22)' : 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 1.5;
  const rowGap = 36;
  const colGap = 52;
  for (let y = 24; y < h; y += rowGap) {
    for (let x = -40 + ((phase * 2) % colGap); x < w + 40; x += colGap) {
      const x0 = x;
      const y0 = y + Math.sin((x + phase) * 0.04) * 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 22, y0);
      ctx.lineTo(x0 + 16, y0 - 4);
      ctx.moveTo(x0 + 22, y0);
      ctx.lineTo(x0 + 16, y0 + 4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSeismicField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  light: boolean,
  phase: number,
) {
  ctx.save();
  ctx.strokeStyle = light ? 'rgba(168, 85, 247, 0.18)' : 'rgba(192, 132, 252, 0.25)';
  ctx.lineWidth = 1.25;
  const base = h - 18;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const y = base + Math.sin(x * 0.08 + phase * 0.35) * 6;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
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
