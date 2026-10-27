import { computeSectionProps, solidRodFromArea } from './crossSections';
import { solveTruss } from './feaEngine';
import { PRESET_LOADERS } from './presets';
import type { Beam, FEAResult, StructureState } from './types';

export const DEMO_MODEL_NAME = 'Warren classroom bridge';

export interface DemoStep {
  id: string;
  title: string;
  /** Short presenter cue shown in the HUD */
  say: string;
  /** Learning outcome for the audience */
  learn: string;
  actionLabel: string;
}

/** Fixed, polished CAC demo beats: load → FEA → interpret → one change → compare. */
export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'meet',
    title: 'Meet the model',
    say: 'This is a Warren truss: triangles, pin + roller supports, and two deck loads. Students can open this in any browser with no install.',
    learn: 'A stable planar truss needs triangulation, supports that prevent rigid-body motion, and defined loads.',
    actionLabel: 'Ready — next: Run analysis',
  },
  {
    id: 'solve',
    title: 'Run one analysis',
    say: 'Press the action to run the classroom analysis. Watch member colors and the inspector update.',
    learn: 'Analysis (FEA / Direct Stiffness Method) turns geometry, materials, and loads into forces, stress, utilization, and deflection in one static pass.',
    actionLabel: 'Run analysis now',
  },
  {
    id: 'read',
    title: 'Read the evidence',
    say: 'Point to tension vs compression, peak yield utilization, and exaggerated deflection. Emphasize: educational estimate, not a blueprint.',
    learn: 'Engineers interpret results: which members work hardest, and whether the classroom yield screen is under 100%.',
    actionLabel: 'Next: make one design change',
  },
  {
    id: 'change',
    title: 'One key design change',
    say: 'Reinforce every peak-utilization member by doubling cross-section area — one clear design decision (ties count on symmetric bridges).',
    learn: 'Raising EA on critical members usually lowers stress and peak utilization for the same load path.',
    actionLabel: 'Reinforce peak members',
  },
  {
    id: 'compare',
    title: 'Compare & close',
    say: 'Re-solve and compare peak utilization before vs after. Close with the classroom purpose of TrussIQ.',
    learn: 'Iteration with evidence: change → re-analyze → explain the trade-off (here: more material for lower utilization).',
    actionLabel: 'Finish demo beat',
  },
];

/** Deterministic polished example — no localStorage required. */
export function createDemoStructure(): StructureState {
  return structuredClone(PRESET_LOADERS.warren.create());
}

export function solveDemoStructure(state: StructureState = createDemoStructure()): FEAResult {
  return solveTruss(state.nodes, state.beams);
}

export function findHottestBeamId(result: FEAResult | null): string | null {
  return findHottestBeamIds(result)[0] ?? null;
}

/** All members tied at peak utilization (symmetric trusses often share a peak). */
export function findHottestBeamIds(result: FEAResult | null): string[] {
  if (!result?.success || result.members.length === 0) return [];
  let best = -1;
  for (const member of result.members) {
    if (member.safetyRatio > best) best = member.safetyRatio;
  }
  if (best < 0) return [];
  const eps = Math.max(1e-9, best * 1e-6);
  return result.members
    .filter((member) => member.safetyRatio >= best - eps)
    .map((member) => member.beamId);
}

export interface DemoDesignChangeResult {
  state: StructureState;
  beamId: string;
  beamIds: string[];
  previousArea: number;
  nextArea: number;
  previousUtilization: number | null;
  previousPeakUtilization: number | null;
}

/** Double area on every peak-utilization member so global peak util drops visibly. */
export function applyDemoDesignChange(
  state: StructureState,
  result: FEAResult | null,
): DemoDesignChangeResult | null {
  const beamIds = findHottestBeamIds(result);
  const beamId = beamIds[0] ?? state.beams[0]?.id ?? null;
  if (!beamId) return null;
  const targets = (beamIds.length > 0 ? beamIds : [beamId])
    .map((id) => state.beams.find((b) => b.id === id))
    .filter((b): b is Beam => Boolean(b));
  if (targets.length === 0) return null;

  const previousArea = targets[0].area;
  const nextArea = previousArea * 2;
  const reinforce = new Set(targets.map((b) => b.id));
  const previousUtilization = result?.success
    ? result.members.find((m) => m.beamId === beamId)?.safetyRatio ?? result.maxSafetyRatio
    : null;
  const previousPeakUtilization = result?.success ? result.maxSafetyRatio : null;

  const beams: Beam[] = state.beams.map((beam) => {
    if (!reinforce.has(beam.id)) return beam;
    const section = solidRodFromArea(nextArea);
    const props = computeSectionProps(section);
    return { ...beam, area: props.area, I: props.I, section };
  });

  return {
    state: { ...state, beams },
    beamId,
    beamIds: [...reinforce],
    previousArea,
    nextArea,
    previousUtilization,
    previousPeakUtilization,
  };
}

export function formatUtilization(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(1)}%`;
}
