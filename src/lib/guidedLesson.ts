import { computeSectionProps, solidRodFromArea } from './crossSections';
import { DEFAULT_AREA, DEFAULT_MATERIAL_ID } from './materials';
import type { Beam, FEAResult, Node, StructureState } from './types';

export interface GuidedLessonStep {
  id: string;
  title: string;
  objective: string;
  body: string;
  tip: string;
  checklist: string[];
}

export const GUIDED_LESSON_STEPS: GuidedLessonStep[] = [
  {
    id: 'build',
    title: 'Build a simple truss',
    objective: 'Create joints (nodes) and connect them with members (beams).',
    body: 'A truss is a network of straight bars joined at pins. Start with a bottom chord (deck line), a top chord, and a few diagonals. Each member will only carry axial tension or compression in this classroom model.',
    tip: 'Use Node (N) then Beam (B), or press “Set up this step” for a ready mini-bridge frame without supports or loads yet.',
    checklist: [
      'Place at least three joints',
      'Connect them with at least two members',
      'Keep geometry triangulated when you can',
    ],
  },
  {
    id: 'supports-loads',
    title: 'Add supports and loads',
    objective: 'Make the structure statically usable: supports stop rigid-body motion; loads are what the truss carries.',
    body: 'Typical bridge pattern: a pin on one end and a roller on the other so the deck can expand. Then apply a downward force on a deck joint to simulate traffic or self-weight.',
    tip: 'Support (S) cycles joint types. Force (F) opens the load editor. “Set up this step” adds a pin, roller, and sample deck load if missing.',
    checklist: [
      'Add a pin (or fixed) support',
      'Add a roller (or second restraint)',
      'Apply at least one external load',
    ],
  },
  {
    id: 'solve',
    title: 'Run the FEA solver',
    objective: 'Solve the Direct Stiffness Method equations Ku = F for this planar truss.',
    body: 'TrussIQ assembles each member’s stiffness, applies support boundary conditions, and solves for joint displacements. From those displacements it recovers axial force, stress, and yield utilization.',
    tip: 'Click Run FEA in the top bar (or Space). Fix any audit errors first if the solver refuses to run.',
    checklist: [
      'Clear model audit errors',
      'Press Run FEA',
      'Confirm the analysis succeeds',
    ],
  },
  {
    id: 'interpret',
    title: 'Interpret the results',
    objective: 'Tell tension from compression and read yield utilization as a classroom safety screen.',
    body: 'Tension members are pulled apart; compression members are pushed together. Yield utilization compares |stress| to the material yield strength — under 100% passes this educational screen, but buckling and other effects are not fully certified here.',
    tip: 'Colors and force labels show the load path. Open the inspector Results tab and pick a green vs blue/dashed member to compare.',
    checklist: [
      'Identify one tension member',
      'Identify one compression member',
      'Note the peak yield utilization %',
    ],
  },
];

function uid(prefix: string, i: number): string {
  return `lesson_${prefix}_${i}`;
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

const OX = 200;
const OY = 300;
const SPAN = 100;
const H = 80;

/** Step 1 scaffold: geometry only — no supports, no loads. */
export function createLessonGeometryOnly(): StructureState {
  const materialId = DEFAULT_MATERIAL_ID;
  const area = DEFAULT_AREA;
  const nodes = makeNodes([
    { x: OX, y: OY },
    { x: OX + SPAN, y: OY },
    { x: OX + 2 * SPAN, y: OY },
    { x: OX + 3 * SPAN, y: OY },
    { x: OX + SPAN, y: OY - H },
    { x: OX + 2 * SPAN, y: OY - H },
  ]);
  const beams = makeBeams(
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [0, 4],
      [4, 1],
      [1, 5],
      [5, 2],
      [5, 3],
    ],
    materialId,
    area,
  );
  return { nodes, beams, materialId, defaultArea: area };
}

/** Step 2 scaffold: add pin, roller, and a deck load onto geometry (or rebuild if empty). */
export function createLessonWithSupportsAndLoads(base?: StructureState | null): StructureState {
  const state = base && base.nodes.length >= 3 ? structuredClone(base) : createLessonGeometryOnly();
  const sorted = [...state.nodes].sort((a, b) => a.x - b.x || a.y - b.y);
  const bottomY = Math.max(...state.nodes.map((n) => n.y));
  const bottom = sorted.filter((n) => Math.abs(n.y - bottomY) < 1e-6);
  if (bottom.length >= 2) {
    const left = bottom[0];
    const right = bottom[bottom.length - 1];
    state.nodes = state.nodes.map((n) => {
      if (n.id === left.id) return { ...n, support: 'pin' };
      if (n.id === right.id) return { ...n, support: 'rollerY' };
      return n;
    });
    const mid = bottom[Math.floor(bottom.length / 2)];
    state.nodes = state.nodes.map((n) =>
      n.id === mid.id ? { ...n, fy: n.fy === 0 ? 2500 : n.fy } : n,
    );
  }
  return state;
}

export function isLessonStepComplete(
  stepIndex: number,
  state: StructureState,
  result: FEAResult | null,
): boolean {
  const hasSupport = (kinds: Array<Node['support']>) =>
    state.nodes.some((n) => kinds.includes(n.support));
  const hasLoad = state.nodes.some((n) => n.fx !== 0 || n.fy !== 0);

  switch (stepIndex) {
    case 0:
      return state.nodes.length >= 3 && state.beams.length >= 2;
    case 1:
      return (
        hasSupport(['pin', 'fixed']) &&
        hasSupport(['rollerX', 'rollerY', 'fixed', 'pin']) &&
        state.nodes.filter((n) => n.support !== 'none').length >= 2 &&
        hasLoad
      );
    case 2:
      return Boolean(result?.success);
    case 3:
      return Boolean(result?.success && result.members.length > 0);
    default:
      return false;
  }
}

export function summarizeLessonResults(result: FEAResult | null): {
  tension: number;
  compression: number;
  zero: number;
  peakUtilPct: number | null;
  passed: boolean | null;
} {
  if (!result?.success) {
    return { tension: 0, compression: 0, zero: 0, peakUtilPct: null, passed: null };
  }
  let tension = 0;
  let compression = 0;
  let zero = 0;
  for (const m of result.members) {
    if (m.status === 'tension') tension += 1;
    else if (m.status === 'compression') compression += 1;
    else zero += 1;
  }
  return {
    tension,
    compression,
    zero,
    peakUtilPct: result.maxSafetyRatio * 100,
    passed: result.passed,
  };
}
