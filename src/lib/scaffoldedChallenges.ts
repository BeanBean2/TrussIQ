import { createLessonGeometryOnly, createLessonWithSupportsAndLoads } from './guidedLesson';
import { applyWindLoads, DEFAULT_WIND } from './dynamicsEngine';
import { solveTruss } from './feaEngine';
import { getMaterial } from './materials';
import { computeMassCost } from './massCost';
import { PRESET_LOADERS, type PresetKey } from './presets';
import {
  createBridgeChallengeStarter,
  evaluateBridgeChallenge,
  type BridgeChallengeId,
} from './bridgeChallenges';
import type { Beam, FEAResult, Node, StructureState } from './types';

export type ChallengeTier = 'beginner' | 'intermediate' | 'advanced';

export interface ChallengeCheckResult {
  id: string;
  label: string;
  value: string;
  passed: boolean;
  /** 0–1 progress toward this criterion when meaningful */
  progress: number;
}

export interface ScaffoldedChallenge {
  id: string;
  tier: ChallengeTier;
  title: string;
  /** One-sentence student-facing goal */
  goal: string;
  /** Physical / modeling constraints (always shown) */
  constraints: string[];
  /** Progressive hints — reveal one at a time */
  hints: string[];
  /** Estimated classroom minutes */
  minutes: number;
  starter: ChallengeStarter;
}

export type ChallengeStarter =
  | { kind: 'preset'; key: PresetKey }
  | { kind: 'lesson-geometry' }
  | { kind: 'lesson-loaded' }
  | { kind: 'bridge'; id: BridgeChallengeId };

export interface ChallengeEvaluation {
  challengeId: string;
  checks: ChallengeCheckResult[];
  complete: boolean;
  scorePct: number;
  feaSuccess: boolean;
  peakUtilization: number | null;
  massKg: number;
  costUSD: number;
  maxDeflectionMm: number | null;
  memberCount: number;
  disclaimer: string;
}

export const EDUCATIONAL_DISCLAIMER =
  'TrussIQ results are educational estimates from a linear, axial-only Direct Stiffness Method model. They are not certified construction blueprints, code compliance, or professional engineering approval.';

function bucklingUtilization(beams: Beam[], result: FEAResult): number | null {
  if (!result.success) return null;
  const beamMap = new Map(beams.map((b) => [b.id, b]));
  let maxU = 0;
  let any = false;
  for (const member of result.members) {
    if (member.status !== 'compression') continue;
    const beam = beamMap.get(member.beamId);
    if (!beam || member.length <= 0) continue;
    const material = getMaterial(beam.materialId);
    const inertia = beam.I ?? (beam.area * beam.area) / (4 * Math.PI);
    const pcr = (Math.PI ** 2 * material.E * 1000 * inertia) / member.length ** 2;
    if (!Number.isFinite(pcr) || pcr <= 0) continue;
    any = true;
    maxU = Math.max(maxU, Math.abs(member.axialForce) / pcr);
  }
  return any ? maxU : 0;
}

function hasPinAndRoller(nodes: Node[]): boolean {
  const pin = nodes.some((n) => n.support === 'pin' || n.support === 'fixed');
  const roller = nodes.some((n) => n.support === 'rollerX' || n.support === 'rollerY' || n.support === 'fixed');
  return pin && roller && nodes.filter((n) => n.support !== 'none').length >= 2;
}

function hasLoad(nodes: Node[]): boolean {
  return nodes.some((n) => n.fx !== 0 || n.fy !== 0);
}

function check(
  id: string,
  label: string,
  passed: boolean,
  value: string,
  progress = passed ? 1 : 0,
): ChallengeCheckResult {
  return { id, label, value, passed, progress: Math.max(0, Math.min(1, progress)) };
}

export const SCAFFOLDED_CHALLENGES: ScaffoldedChallenge[] = [
  // —— Beginner ——
  {
    id: 'beginner-stable-triangle',
    tier: 'beginner',
    title: 'Stable triangle',
    goal: 'Build a triangulated truss that solves successfully with supports and a load, staying below 80% yield utilization.',
    constraints: [
      'At least 3 joints and 3 members',
      'Pin + roller (or equivalent) supports',
      'At least one applied load',
      'Peak yield utilization ≤ 80%',
    ],
    hints: [
      'Triangles resist shape change better than rectangles without diagonals.',
      'Use Support (S) on the outer deck joints: pin on one end, roller on the other.',
      'Apply Force (F) downward on a midspan joint, then press Run FEA.',
    ],
    minutes: 10,
    starter: { kind: 'lesson-geometry' },
  },
  {
    id: 'beginner-read-the-colors',
    tier: 'beginner',
    title: 'Read the colors',
    goal: 'Solve a starter bridge and identify both tension and compression members while keeping utilization under 100%.',
    constraints: [
      'FEA must succeed',
      'At least one tension and one compression member',
      'No member above the modeled yield limit',
    ],
    hints: [
      'Load the starter, then Run FEA without changing geometry first.',
      'Dashed / cooler strokes often mark compression; warmer labels mark tension when force labels are on.',
      'Open the inspector Results tab and sort by status.',
    ],
    minutes: 8,
    starter: { kind: 'lesson-loaded' },
  },
  {
    id: 'beginner-light-deck',
    tier: 'beginner',
    title: 'Light deck load',
    goal: 'Carry at least 1 kN total downward load with peak utilization ≤ 70% and fewer than 16 members.',
    constraints: [
      'Sum of downward loads ≥ 1000 N',
      'Members < 16',
      'Peak yield utilization ≤ 70%',
      'Model must solve',
    ],
    hints: [
      'Total downward load is the sum of positive Fy values on joints.',
      'Fewer members means careful triangulation — avoid unused bars.',
      'Increase section area or material strength if utilization is high.',
    ],
    minutes: 12,
    starter: { kind: 'preset', key: 'warren' },
  },
  // —— Intermediate ——
  {
    id: 'intermediate-mass-budget',
    tier: 'intermediate',
    title: 'Mass budget bridge',
    goal: 'Keep estimated mass under 2.5 kg while peak utilization stays ≤ 85% on a solved Howe-based span.',
    constraints: [
      'Estimated mass ≤ 2.5 kg',
      'Peak yield utilization ≤ 85%',
      'At least 8 members',
      'FEA success',
    ],
    hints: [
      'Mass comes from area × length × density — thin sections save weight but raise stress.',
      'Remove zero-force or redundant members after you inspect results.',
      'Compare aluminum vs steel in the material picker for density trade-offs.',
    ],
    minutes: 15,
    starter: { kind: 'preset', key: 'howe' },
  },
  {
    id: 'intermediate-cost-cap',
    tier: 'intermediate',
    title: 'Classroom cost cap',
    goal: 'Hold estimated material cost ≤ $25 while remaining below yield and using at most 14 members.',
    constraints: [
      'Estimated cost ≤ $25',
      'Members ≤ 14',
      'Peak yield utilization < 100%',
      'FEA success',
    ],
    hints: [
      'Cost scales with mass and material unit price.',
      'PLA is cheap but soft — utilization may spike under the same load.',
      'Shrink default area carefully, then re-run FEA.',
    ],
    minutes: 15,
    starter: { kind: 'preset', key: 'pratt' },
  },
  {
    id: 'intermediate-deflection-limit',
    tier: 'intermediate',
    title: 'Stiff enough',
    goal: 'Limit peak nodal movement to ≤ 5 mm under the current loads with utilization ≤ 90%.',
    constraints: [
      'Peak |u| ≤ 5 mm',
      'Peak yield utilization ≤ 90%',
      'FEA success',
      'At least one applied load',
    ],
    hints: [
      'Deflection drops when you add depth (taller truss) or raise EA.',
      'Check supports — a mechanism will show huge movement or fail to solve.',
      'Use the deflection toggle after solving to visualize the shape.',
    ],
    minutes: 18,
    starter: { kind: 'preset', key: 'warren' },
  },
  {
    id: 'intermediate-wind-screen',
    tier: 'intermediate',
    title: 'Wind screen',
    goal: 'With Dynamics → Wind enabled (or wind loads applied), keep yield ≤ 95% and buckling screen < 100%.',
    constraints: [
      'Solve under wind-augmented loads',
      'Yield utilization ≤ 95%',
      'Euler buckling screen < 100%',
      'At least 6 members',
    ],
    hints: [
      'Open Dynamics and choose Wind shear, then Run FEA.',
      'Add bracing or shorten slender compression members if buckling is high.',
      'Lateral loads travel to supports — check reactions after solving.',
    ],
    minutes: 20,
    starter: { kind: 'preset', key: 'roof' },
  },
  // —— Advanced ——
  {
    id: 'advanced-low-budget-span',
    tier: 'advanced',
    title: 'Low-budget 10 m span',
    goal: 'Bridge ~10 m under $500 estimated materials with ≥ 500 N midspan load, passing yield and buckling screens.',
    constraints: [
      'Span ≥ 10 m (scaled model)',
      'Center load ≥ 500 N',
      'Cost ≤ $500',
      'Yield + Euler screens pass',
    ],
    hints: [
      'Load the official starter — it scales a Howe truss to a 10 m classroom span.',
      'Watch the midspan load and budget checks in the live scorecard.',
      'Buckling often governs slender compression chords before yield does.',
    ],
    minutes: 25,
    starter: { kind: 'bridge', id: 'low-budget-span' },
  },
  {
    id: 'advanced-high-wind',
    tier: 'advanced',
    title: 'High-wind resilience',
    goal: 'Pass yield and buckling under the 120 mph reference wind profile with peak movement ≤ span/200.',
    constraints: [
      'Wind profile evaluation',
      'Yield screen pass',
      'Buckling screen pass',
      'Peak movement ≤ span/200',
    ],
    hints: [
      'Use the high-wind starter so evaluation applies the storm-scale profile.',
      'Deepen the truss or brace compression diagonals to cut lateral drift.',
      'Re-check after every geometry change — wind loads depend on height.',
    ],
    minutes: 25,
    starter: { kind: 'bridge', id: 'high-wind-resilience' },
  },
  {
    id: 'advanced-efficient-arm',
    tier: 'advanced',
    title: 'Efficient robot arm',
    goal: 'On a cantilever arm, keep tip-region movement ≤ 8 mm, utilization ≤ 60%, and mass ≤ 1.2 kg.',
    constraints: [
      'Peak |u| ≤ 8 mm',
      'Peak yield utilization ≤ 60%',
      'Mass ≤ 1.2 kg',
      'FEA success',
    ],
    hints: [
      'Cantilevers amplify tip deflection — thicken chords near the fixed base.',
      'Aluminum lowers mass but may raise utilization versus steel.',
      'Remove tip members that carry near-zero force after solving.',
    ],
    minutes: 22,
    starter: { kind: 'preset', key: 'cantilever' },
  },
];

export const CHALLENGE_TIERS: Array<{ id: ChallengeTier; label: string; blurb: string }> = [
  { id: 'beginner', label: 'Beginner', blurb: 'Supports, loads, and reading a first FEA result' },
  { id: 'intermediate', label: 'Intermediate', blurb: 'Mass, cost, stiffness, and wind trade-offs' },
  { id: 'advanced', label: 'Advanced', blurb: 'Scaled spans, storm wind, and optimization' },
];

export function getScaffoldedChallenge(id: string): ScaffoldedChallenge | undefined {
  return SCAFFOLDED_CHALLENGES.find((c) => c.id === id);
}

export function createChallengeStarterState(challenge: ScaffoldedChallenge): StructureState {
  switch (challenge.starter.kind) {
    case 'preset':
      return PRESET_LOADERS[challenge.starter.key].create();
    case 'lesson-geometry':
      return createLessonGeometryOnly();
    case 'lesson-loaded':
      return createLessonWithSupportsAndLoads(createLessonGeometryOnly());
    case 'bridge':
      return createBridgeChallengeStarter(challenge.starter.id);
    default:
      return createLessonGeometryOnly();
  }
}

export function evaluateScaffoldedChallenge(
  challenge: ScaffoldedChallenge,
  nodes: Node[],
  beams: Beam[],
  result: FEAResult | null,
  dynamicsMode: 'none' | 'wind' | 'seismic' = 'none',
): ChallengeEvaluation {
  // Bridge challenges reuse the dedicated evaluator for parity with Challenge Mode
  if (challenge.starter.kind === 'bridge') {
    const bridge = evaluateBridgeChallenge(challenge.starter.id, nodes, beams);
    const checks = bridge.checks.map((c, index) =>
      check(`b${index}`, c.label, c.passed, c.value, c.passed ? 1 : 0.35),
    );
    const passedCount = checks.filter((c) => c.passed).length;
    return {
      challengeId: challenge.id,
      checks,
      complete: bridge.complete,
      scorePct: checks.length ? (passedCount / checks.length) * 100 : 0,
      feaSuccess: bridge.maxYieldUtilization !== null,
      peakUtilization: bridge.maxYieldUtilization,
      massKg: computeMassCost(nodes, beams).totalMassG / 1000,
      costUSD: bridge.estimatedCostUSD,
      maxDeflectionMm: bridge.maxDeflectionMm,
      memberCount: beams.length,
      disclaimer: EDUCATIONAL_DISCLAIMER,
    };
  }

  const mass = computeMassCost(nodes, beams);
  const massKg = mass.totalMassG / 1000;
  const costUSD = mass.estimatedCostUSD;

  let analysisNodes = nodes;
  if (challenge.id === 'intermediate-wind-screen' || dynamicsMode === 'wind') {
    analysisNodes = applyWindLoads(nodes, DEFAULT_WIND);
  }
  const solved =
    result?.success && dynamicsMode === 'none' && challenge.id !== 'intermediate-wind-screen'
      ? result
      : solveTruss(analysisNodes, beams);

  const util = solved.success ? solved.maxSafetyRatio : null;
  const defl = solved.success
    ? Math.max(0, ...solved.displacements.map((d) => Math.hypot(d.ux, d.uy)))
    : null;
  const buck = solved.success ? bucklingUtilization(beams, solved) : null;
  const totalDown = nodes.reduce((sum, n) => sum + Math.max(0, n.fy), 0);
  const tension = solved.success ? solved.members.filter((m) => m.status === 'tension').length : 0;
  const compression = solved.success
    ? solved.members.filter((m) => m.status === 'compression').length
    : 0;

  let checks: ChallengeCheckResult[] = [];

  switch (challenge.id) {
    case 'beginner-stable-triangle':
      checks = [
        check('geom', 'Joints & members', nodes.length >= 3 && beams.length >= 3, `${nodes.length} joints · ${beams.length} members`, Math.min(1, beams.length / 3)),
        check('supports', 'Pin + roller supports', hasPinAndRoller(nodes), hasPinAndRoller(nodes) ? 'Restrained' : 'Incomplete'),
        check('load', 'Applied load', hasLoad(nodes), hasLoad(nodes) ? 'Load present' : 'No load'),
        check(
          'util',
          'Utilization ≤ 80%',
          util !== null && util <= 0.8,
          util === null ? 'Not solved' : `${(util * 100).toFixed(1)}%`,
          util === null ? 0 : Math.max(0, 1 - util / 0.8),
        ),
      ];
      break;
    case 'beginner-read-the-colors':
      checks = [
        check('solve', 'FEA success', solved.success, solved.success ? 'Solved' : solved.message ?? 'Failed'),
        check('tension', 'Has tension member', tension > 0, `${tension} in tension`),
        check('compression', 'Has compression member', compression > 0, `${compression} in compression`),
        check('yield', 'Below yield screen', solved.success && solved.passed, util === null ? '—' : `${(util * 100).toFixed(1)}%`),
      ];
      break;
    case 'beginner-light-deck':
      checks = [
        check('load', 'Downward load ≥ 1000 N', totalDown >= 1000, `${totalDown.toFixed(0)} N`, Math.min(1, totalDown / 1000)),
        check('members', 'Members < 16', beams.length < 16, `${beams.length} members`, beams.length < 16 ? 1 : 16 / Math.max(beams.length, 1)),
        check('util', 'Utilization ≤ 70%', util !== null && util <= 0.7, util === null ? 'Not solved' : `${(util * 100).toFixed(1)}%`, util == null ? 0 : Math.max(0, 1 - util / 0.7)),
        check('solve', 'FEA success', solved.success, solved.success ? 'Solved' : 'Not solved'),
      ];
      break;
    case 'intermediate-mass-budget':
      checks = [
        check('mass', 'Mass ≤ 2.5 kg', massKg <= 2.5, `${massKg.toFixed(3)} kg`, Math.min(1, 2.5 / Math.max(massKg, 0.01))),
        check('util', 'Utilization ≤ 85%', util !== null && util <= 0.85, util === null ? 'Not solved' : `${(util * 100).toFixed(1)}%`, util == null ? 0 : Math.max(0, 1 - util / 0.85)),
        check('members', 'Members ≥ 8', beams.length >= 8, `${beams.length} members`, Math.min(1, beams.length / 8)),
        check('solve', 'FEA success', solved.success, solved.success ? 'Solved' : 'Not solved'),
      ];
      break;
    case 'intermediate-cost-cap':
      checks = [
        check('cost', 'Cost ≤ $25', costUSD <= 25, `$${costUSD.toFixed(2)}`, Math.min(1, 25 / Math.max(costUSD, 0.01))),
        check('members', 'Members ≤ 14', beams.length <= 14, `${beams.length} members`, beams.length <= 14 ? 1 : 14 / beams.length),
        check('yield', 'Below yield', solved.success && solved.passed, util === null ? '—' : `${(util * 100).toFixed(1)}%`),
        check('solve', 'FEA success', solved.success, solved.success ? 'Solved' : 'Not solved'),
      ];
      break;
    case 'intermediate-deflection-limit':
      checks = [
        check('defl', 'Peak |u| ≤ 5 mm', defl !== null && defl <= 5, defl === null ? 'Not solved' : `${defl.toFixed(2)} mm`, defl == null ? 0 : Math.max(0, 1 - defl / 5)),
        check('util', 'Utilization ≤ 90%', util !== null && util <= 0.9, util === null ? 'Not solved' : `${(util * 100).toFixed(1)}%`, util == null ? 0 : Math.max(0, 1 - util / 0.9)),
        check('load', 'Has load', hasLoad(nodes), hasLoad(nodes) ? 'Yes' : 'No'),
        check('solve', 'FEA success', solved.success, solved.success ? 'Solved' : 'Not solved'),
      ];
      break;
    case 'intermediate-wind-screen':
      checks = [
        check('solve', 'Wind case solved', solved.success, solved.success ? 'Solved' : solved.message ?? 'Failed'),
        check('util', 'Utilization ≤ 95%', util !== null && util <= 0.95, util === null ? '—' : `${(util * 100).toFixed(1)}%`, util == null ? 0 : Math.max(0, 1 - util / 0.95)),
        check('buck', 'Buckling screen < 100%', buck !== null && buck < 1, buck === null ? '—' : `${(buck * 100).toFixed(1)}% of Pcr`, buck == null ? 0 : Math.max(0, 1 - buck)),
        check('members', 'Members ≥ 6', beams.length >= 6, `${beams.length} members`, Math.min(1, beams.length / 6)),
      ];
      break;
    case 'advanced-efficient-arm':
      checks = [
        check('defl', 'Peak |u| ≤ 8 mm', defl !== null && defl <= 8, defl === null ? 'Not solved' : `${defl.toFixed(2)} mm`, defl == null ? 0 : Math.max(0, 1 - defl / 8)),
        check('util', 'Utilization ≤ 60%', util !== null && util <= 0.6, util === null ? '—' : `${(util * 100).toFixed(1)}%`, util == null ? 0 : Math.max(0, 1 - util / 0.6)),
        check('mass', 'Mass ≤ 1.2 kg', massKg <= 1.2, `${massKg.toFixed(3)} kg`, Math.min(1, 1.2 / Math.max(massKg, 0.01))),
        check('solve', 'FEA success', solved.success, solved.success ? 'Solved' : 'Not solved'),
      ];
      break;
    default:
      checks = [
        check('solve', 'FEA success', solved.success, solved.success ? 'Solved' : 'Not solved'),
      ];
  }

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    challengeId: challenge.id,
    checks,
    complete: checks.length > 0 && checks.every((c) => c.passed),
    scorePct: checks.length ? (passedCount / checks.length) * 100 : 0,
    feaSuccess: solved.success,
    peakUtilization: util,
    massKg,
    costUSD,
    maxDeflectionMm: defl,
    memberCount: beams.length,
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}

export function challengesByTier(tier: ChallengeTier | 'all'): ScaffoldedChallenge[] {
  if (tier === 'all') return SCAFFOLDED_CHALLENGES;
  return SCAFFOLDED_CHALLENGES.filter((c) => c.tier === tier);
}
