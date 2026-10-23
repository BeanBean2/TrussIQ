import { computeSectionProps, solidRodFromArea } from './crossSections';
import { DEFAULT_AREA, DEFAULT_MATERIAL_ID } from './materials';
import type { Beam, Node, StructureState } from './types';

function uid(prefix: string, i: number): string {
  return `${prefix}_${i}`;
}

function makeNodes(
  pts: Array<{ x: number; y: number; support?: Node['support']; fx?: number; fy?: number }>,
): Node[] {
  return pts.map((p, i) => ({
    id: uid('n', i),
    x: p.x,
    y: p.y,
    support: p.support ?? 'none',
    fx: p.fx ?? 0,
    fy: p.fy ?? 0,
  }));
}

function makeBeams(pairs: Array<[number, number]>, materialId: string, area: number): Beam[] {
  const section = solidRodFromArea(area);
  const props = computeSectionProps(section);
  return pairs.map(([i, j], idx) => ({
    id: uid('b', idx),
    nodeI: uid('n', i),
    nodeJ: uid('n', j),
    area: props.area,
    I: props.I,
    section,
    materialId,
  }));
}

/** Origin offset so presets sit nicely on a typical canvas. */
const OX = 180;
const OY = 320;

/**
 * Howe Truss — diagonals slope toward the center from the top chord.
 * Classic timber-bridge pattern; good for teaching compression/tension paths.
 */
export function createHoweTruss(): StructureState {
  const materialId = DEFAULT_MATERIAL_ID;
  const area = DEFAULT_AREA;
  const span = 120;
  const h = 100;

  const nodes = makeNodes([
    { x: OX, y: OY, support: 'pin' },
    { x: OX + span, y: OY },
    { x: OX + 2 * span, y: OY },
    { x: OX + 3 * span, y: OY },
    { x: OX + 4 * span, y: OY, support: 'rollerY' },
    { x: OX + span, y: OY - h },
    { x: OX + 2 * span, y: OY - h },
    { x: OX + 3 * span, y: OY - h },
  ]);

  // Mid-span downward load (simulates deck load)
  nodes[2].fy = 5000;

  const beams = makeBeams(
    [
      // bottom chord
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      // top chord
      [5, 6],
      [6, 7],
      // verticals
      [1, 5],
      [2, 6],
      [3, 7],
      // end posts
      [0, 5],
      [4, 7],
      // Howe diagonals (lean toward center from top)
      [5, 2],
      [6, 3],
      [6, 1],
      [7, 2],
    ],
    materialId,
    area,
  );

  return { nodes, beams, materialId, defaultArea: area };
}

/**
 * Pratt Truss — diagonals slope away from center (tension diagonals).
 */
export function createPrattTruss(): StructureState {
  const materialId = DEFAULT_MATERIAL_ID;
  const area = DEFAULT_AREA;
  const span = 120;
  const h = 100;

  const nodes = makeNodes([
    { x: OX, y: OY, support: 'pin' },
    { x: OX + span, y: OY },
    { x: OX + 2 * span, y: OY },
    { x: OX + 3 * span, y: OY },
    { x: OX + 4 * span, y: OY, support: 'rollerY' },
    { x: OX + span, y: OY - h },
    { x: OX + 2 * span, y: OY - h },
    { x: OX + 3 * span, y: OY - h },
  ]);

  nodes[2].fy = 5000;

  const beams = makeBeams(
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [5, 6],
      [6, 7],
      [1, 5],
      [2, 6],
      [3, 7],
      [0, 5],
      [4, 7],
      // Pratt diagonals (from bottom center outward to top)
      [1, 6],
      [2, 7],
      [2, 5],
      [3, 6],
    ],
    materialId,
    area,
  );

  return { nodes, beams, materialId, defaultArea: area };
}

/**
 * Warren Truss — equilateral triangular pattern, no verticals.
 */
export function createWarrenTruss(): StructureState {
  const materialId = DEFAULT_MATERIAL_ID;
  const area = DEFAULT_AREA;
  const span = 140;
  const h = (Math.sqrt(3) / 2) * span;

  const nodes = makeNodes([
    { x: OX, y: OY, support: 'pin' },
    { x: OX + span, y: OY },
    { x: OX + 2 * span, y: OY },
    { x: OX + 3 * span, y: OY, support: 'rollerY' },
    { x: OX + span / 2, y: OY - h },
    { x: OX + (3 * span) / 2, y: OY - h },
    { x: OX + (5 * span) / 2, y: OY - h },
  ]);

  nodes[1].fy = 3000;
  nodes[2].fy = 3000;

  const beams = makeBeams(
    [
      // bottom
      [0, 1],
      [1, 2],
      [2, 3],
      // top
      [4, 5],
      [5, 6],
      // diagonals / web
      [0, 4],
      [4, 1],
      [1, 5],
      [5, 2],
      [2, 6],
      [6, 3],
    ],
    materialId,
    area,
  );

  return { nodes, beams, materialId, defaultArea: area };
}

/**
 * Cantilever Arm — simple robotics linkage / FTC arm stub.
 * Fixed at the base, tip load simulates gripper/payload.
 */
export function createCantileverArm(): StructureState {
  const materialId = 'al6061';
  const area = 80;
  const L = 160;
  const h = 80;

  const nodes = makeNodes([
    { x: OX, y: OY, support: 'fixed' },
    { x: OX, y: OY - h, support: 'fixed' },
    { x: OX + L, y: OY },
    { x: OX + L, y: OY - h },
    { x: OX + 2 * L, y: OY - h / 2 },
  ]);

  // Tip payload downward
  nodes[4].fy = 200;

  const beams = makeBeams(
    [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [0, 3],
      [1, 2],
      [2, 4],
      [3, 4],
    ],
    materialId,
    area,
  );

  return { nodes, beams, materialId, defaultArea: area };
}

export const PRESET_LOADERS = {
  howe: { label: 'Howe Truss', create: createHoweTruss },
  pratt: { label: 'Pratt Truss', create: createPrattTruss },
  warren: { label: 'Warren Truss', create: createWarrenTruss },
  cantilever: { label: 'Cantilever Arm (Robotics)', create: createCantileverArm },
} as const;

export type PresetKey = keyof typeof PRESET_LOADERS;
