import { computeMassCost } from './massCost';
import type { Beam, Node } from './types';

export interface StructureMetrics {
  spanMm: number;
  heightMm: number;
  nodeCount: number;
  beamCount: number;
  totalMassG: number;
  estimatedCostUSD: number;
  /** 0–1 how close left/right halves match (1 = mirrored) */
  symmetryScore: number;
  symmetryNote: string;
}

/** Span, height, mass, and a simple left/right symmetry score. */
export function computeStructureMetrics(nodes: Node[], beams: Beam[]): StructureMetrics {
  const mass = computeMassCost(nodes, beams);
  if (nodes.length === 0) {
    return {
      spanMm: 0,
      heightMm: 0,
      nodeCount: 0,
      beamCount: 0,
      totalMassG: 0,
      estimatedCostUSD: 0,
      symmetryScore: 1,
      symmetryNote: 'Empty model',
    };
  }

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanMm = maxX - minX;
  const heightMm = maxY - minY;
  const midX = (minX + maxX) / 2;

  // Pair each node with a mirror across vertical midline
  let matches = 0;
  const tolerance = 12; // mm
  for (const n of nodes) {
    const mirrorX = 2 * midX - n.x;
    const found = nodes.some(
      (o) => Math.abs(o.x - mirrorX) <= tolerance && Math.abs(o.y - n.y) <= tolerance,
    );
    if (found) matches++;
  }
  const symmetryScore = nodes.length ? matches / nodes.length : 1;
  let symmetryNote = 'Asymmetric layout';
  if (symmetryScore >= 0.95) symmetryNote = 'Nearly left–right symmetric';
  else if (symmetryScore >= 0.7) symmetryNote = 'Partially symmetric — check unbalanced members';
  else if (spanMm < 1) symmetryNote = 'Compact cluster';

  return {
    spanMm,
    heightMm,
    nodeCount: nodes.length,
    beamCount: beams.length,
    totalMassG: mass.totalMassG,
    estimatedCostUSD: mass.estimatedCostUSD,
    symmetryScore,
    symmetryNote,
  };
}

export type MemberViewFilter = 'all' | 'tension' | 'compression' | 'yielded' | 'zero';
