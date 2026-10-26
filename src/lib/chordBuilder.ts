import { computeSectionProps, solidRodFromArea } from './crossSections';
import { nextId } from './ids';
import type { Beam, Node, StructureState, SupportType } from './types';

export interface ChordBuildOptions {
  /** World X of the leftmost bottom joint (mm). */
  startX: number;
  /** World Y of the bottom chord (mm; canvas Y grows downward). */
  startY: number;
  /** Number of spans along the chord (≥ 1). */
  bayCount: number;
  /** Length of each bay (mm). */
  bayLength: number;
  /** Vertical distance from bottom chord up to top chord (mm). */
  height: number;
  /** Build the deck / bottom chord joints and members. */
  bottom: boolean;
  /** Build the upper chord joints and members. */
  top: boolean;
  /** Connect matching bottom↔top joints with verticals (requires both chords). */
  verticals: boolean;
  /** Pin leftmost bottom support and Y-roller on rightmost bottom support. */
  supports: boolean;
  materialId: string;
  area: number;
}

function snap(v: number, step: number): number {
  if (!(step > 0)) return v;
  return Math.round(v / step) * step;
}

function findNear(
  nodes: Node[],
  x: number,
  y: number,
  tol = 0.5,
): Node | undefined {
  return nodes.find((n) => Math.hypot(n.x - x, n.y - y) < tol);
}

function ensureNode(
  nodes: Node[],
  x: number,
  y: number,
  support: SupportType = 'none',
): { nodes: Node[]; id: string } {
  const existing = findNear(nodes, x, y);
  if (existing) {
    if (support !== 'none' && existing.support === 'none') {
      return {
        nodes: nodes.map((n) => (n.id === existing.id ? { ...n, support } : n)),
        id: existing.id,
      };
    }
    return { nodes, id: existing.id };
  }
  const id = nextId('n');
  return {
    nodes: [...nodes, { id, x, y, support, fx: 0, fy: 0 }],
    id,
  };
}

function ensureBeam(
  beams: Beam[],
  nodeI: string,
  nodeJ: string,
  materialId: string,
  area: number,
): Beam[] {
  if (nodeI === nodeJ) return beams;
  const exists = beams.some(
    (b) =>
      (b.nodeI === nodeI && b.nodeJ === nodeJ) ||
      (b.nodeI === nodeJ && b.nodeJ === nodeI),
  );
  if (exists) return beams;
  const section = solidRodFromArea(area);
  const props = computeSectionProps(section);
  return [
    ...beams,
    {
      id: nextId('b'),
      nodeI,
      nodeJ,
      area: props.area,
      I: props.I,
      section,
      materialId,
    },
  ];
}

/**
 * Add a planar bridge-style bottom and/or top chord (and optional verticals)
 * without wiping the current model. Existing joints at the same coordinates are reused.
 */
export function addTrussChords(
  state: StructureState,
  options: ChordBuildOptions,
  gridSnapMm = 0,
): StructureState {
  const bayCount = Math.max(1, Math.floor(options.bayCount));
  const bayLength = Math.max(1, options.bayLength);
  const height = Math.max(1, options.height);
  const jointCount = bayCount + 1;

  let nodes = [...state.nodes];
  let beams = [...state.beams];
  const bottomIds: string[] = [];
  const topIds: string[] = [];

  for (let i = 0; i < jointCount; i++) {
    let x = options.startX + i * bayLength;
    let bottomY = options.startY;
    let topY = options.startY - height;
    if (gridSnapMm > 0) {
      x = snap(x, gridSnapMm);
      bottomY = snap(bottomY, gridSnapMm);
      topY = snap(topY, gridSnapMm);
    }

    if (options.bottom) {
      let support: SupportType = 'none';
      if (options.supports) {
        if (i === 0) support = 'pin';
        else if (i === jointCount - 1) support = 'rollerY';
      }
      const placed = ensureNode(nodes, x, bottomY, support);
      nodes = placed.nodes;
      bottomIds.push(placed.id);
    }

    if (options.top) {
      // Top chord usually spans interior bays for Howe/Pratt (skip ends) when
      // bayCount ≥ 2 — but for a general builder include all bays so students
      // can add end posts themselves. Include every top joint.
      const placed = ensureNode(nodes, x, topY, 'none');
      nodes = placed.nodes;
      topIds.push(placed.id);
    }
  }

  if (options.bottom) {
    for (let i = 0; i < bottomIds.length - 1; i++) {
      beams = ensureBeam(beams, bottomIds[i], bottomIds[i + 1], options.materialId, options.area);
    }
  }
  if (options.top) {
    for (let i = 0; i < topIds.length - 1; i++) {
      beams = ensureBeam(beams, topIds[i], topIds[i + 1], options.materialId, options.area);
    }
  }
  if (options.verticals && options.bottom && options.top) {
    const n = Math.min(bottomIds.length, topIds.length);
    for (let i = 0; i < n; i++) {
      beams = ensureBeam(beams, bottomIds[i], topIds[i], options.materialId, options.area);
    }
  }

  return { ...state, nodes, beams };
}

/** Connect consecutive joints that share the same Y (within tolerance) into chord members. */
export function connectHorizontalChords(
  state: StructureState,
  tol = 0.5,
): StructureState {
  const byY = new Map<number, Node[]>();
  for (const node of state.nodes) {
    const key = Math.round(node.y / Math.max(tol, 1e-6)) * Math.max(tol, 1e-6);
    const list = byY.get(key) ?? [];
    list.push(node);
    byY.set(key, list);
  }

  let beams = [...state.beams];
  for (const row of byY.values()) {
    const sorted = [...row].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length - 1; i++) {
      beams = ensureBeam(
        beams,
        sorted[i].id,
        sorted[i + 1].id,
        state.materialId,
        state.defaultArea,
      );
    }
  }
  return { ...state, beams };
}
