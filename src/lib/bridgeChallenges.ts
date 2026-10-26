import { applyWindLoads, DEFAULT_WIND } from './dynamicsEngine';
import { solveTruss } from './feaEngine';
import { getMaterial } from './materials';
import { computeMassCost } from './massCost';
import { createHoweTruss, createWarrenTruss } from './presets';
import type { Beam, Node, StructureState } from './types';

export type BridgeChallengeId = 'low-budget-span' | 'high-wind-resilience';

export const HIGH_WIND_PROFILE = {
  ...DEFAULT_WIND,
  v0: 120 * 0.44704,
  z0: 10_000,
};

export interface BridgeChallengeCheck {
  label: string;
  value: string;
  passed: boolean;
}

export interface BridgeChallengeEvaluation {
  checks: BridgeChallengeCheck[];
  complete: boolean;
  estimatedCostUSD: number;
  spanMm: number;
  centerLoadN: number;
  maxYieldUtilization: number | null;
  maxBucklingUtilization: number | null;
  maxDeflectionMm: number | null;
  deflectionTargetMm: number;
}

function scalePresetToTenMeters(state: StructureState, centerLoadN = 0): StructureState {
  const minX = Math.min(...state.nodes.map((node) => node.x));
  const maxX = Math.max(...state.nodes.map((node) => node.x));
  const groundY = Math.max(...state.nodes.map((node) => node.y));
  const scale = 10_000 / (maxX - minX);
  const nodes = state.nodes.map((node) => ({
    ...node,
    x: (node.x - minX) * scale,
    y: (node.y - groundY) * scale,
    fx: 0,
    fy: 0,
  }));

  if (centerLoadN > 0) {
    const center = 5_000;
    const bottomJoints = nodes.filter((node) => Math.abs(node.x - center) < 1e-6)
      .sort((a, b) => b.y - a.y);
    const target = bottomJoints[0] ?? nodes.reduce((best, node) =>
      Math.abs(node.x - center) < Math.abs(best.x - center) ? node : best,
    );
    target.fy = centerLoadN;
  }
  return { ...state, nodes };
}

export function createBridgeChallengeStarter(id: BridgeChallengeId): StructureState {
  if (id === 'low-budget-span') return scalePresetToTenMeters(createHoweTruss(), 500);
  return scalePresetToTenMeters(createWarrenTruss());
}

function getMaxBucklingUtilization(beams: Beam[], result: ReturnType<typeof solveTruss>): number {
  if (!result.success) return Number.POSITIVE_INFINITY;
  const beamMap = new Map(beams.map((beam) => [beam.id, beam]));
  let maxUtilization = 0;
  for (const member of result.members) {
    if (member.status !== 'compression') continue;
    const beam = beamMap.get(member.beamId);
    if (!beam || member.length <= 0) return Number.POSITIVE_INFINITY;
    const material = getMaterial(beam.materialId);
    const inertia = beam.I ?? (beam.area * beam.area) / (4 * Math.PI);
    const criticalLoadN = (Math.PI ** 2 * material.E * 1000 * inertia) / (member.length ** 2);
    if (!Number.isFinite(criticalLoadN) || criticalLoadN <= 0) return Number.POSITIVE_INFINITY;
    maxUtilization = Math.max(maxUtilization, Math.abs(member.axialForce) / criticalLoadN);
  }
  return maxUtilization;
}

export function evaluateBridgeChallenge(
  id: BridgeChallengeId,
  nodes: Node[],
  beams: Beam[],
): BridgeChallengeEvaluation {
  const analysisNodes = id === 'high-wind-resilience'
    ? applyWindLoads(nodes, HIGH_WIND_PROFILE)
    : nodes;
  const result = solveTruss(analysisNodes, beams);
  const cost = computeMassCost(nodes, beams).estimatedCostUSD;
  const xs = nodes.map((node) => node.x);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 0;
  const spanMm = maxX - minX;
  const center = (maxX + minX) / 2;
  const centerLoadN = id === 'low-budget-span'
    ? Math.max(0, ...nodes.filter((node) => Math.abs(node.x - center) <= spanMm * 0.05).map((node) => node.fy))
    : 0;
  const maxDeflectionMm = result.success
    ? Math.max(0, ...result.displacements.map((displacement) => Math.hypot(displacement.ux, displacement.uy)))
    : null;
  const maxYieldUtilization = result.success ? result.maxSafetyRatio : null;
  const maxBucklingUtilization = result.success ? getMaxBucklingUtilization(beams, result) : null;
  const deflectionTargetMm = spanMm / 200;
  const stable = result.success && result.passed && (maxBucklingUtilization ?? Infinity) < 1;

  const checks: BridgeChallengeCheck[] = id === 'low-budget-span'
    ? [
      { label: '10 m clear span', value: `${(spanMm / 1000).toFixed(2)} m`, passed: spanMm >= 10_000 },
      { label: 'Center load', value: `${centerLoadN.toFixed(0)} / 500 N`, passed: centerLoadN >= 500 },
      { label: 'Estimated materials budget', value: `$${cost.toFixed(2)} / $500`, passed: cost <= 500 },
      { label: 'Linear axial yield check', value: result.success ? `${(result.maxSafetyRatio * 100).toFixed(1)}% utilization` : 'Not solved', passed: result.success && result.passed },
      { label: 'Euler buckling screen', value: maxBucklingUtilization === null ? 'Not solved' : `${(maxBucklingUtilization * 100).toFixed(1)}% of critical`, passed: (maxBucklingUtilization ?? Infinity) < 1 },
    ]
    : [
      { label: 'Wind profile', value: '120 mph at 10 m reference height', passed: true },
      { label: 'Linear axial yield check', value: result.success ? `${(result.maxSafetyRatio * 100).toFixed(1)}% utilization` : 'Not solved', passed: result.success && result.passed },
      { label: 'Euler buckling screen', value: maxBucklingUtilization === null ? 'Not solved' : `${(maxBucklingUtilization * 100).toFixed(1)}% of critical`, passed: (maxBucklingUtilization ?? Infinity) < 1 },
      { label: 'Peak nodal movement', value: maxDeflectionMm === null ? 'Not solved' : `${maxDeflectionMm.toFixed(1)} / ${deflectionTargetMm.toFixed(1)} mm target`, passed: maxDeflectionMm !== null && maxDeflectionMm <= deflectionTargetMm },
    ];

  return {
    checks,
    complete: stable && checks.every((check) => check.passed),
    estimatedCostUSD: cost,
    spanMm,
    centerLoadN,
    maxYieldUtilization,
    maxBucklingUtilization,
    maxDeflectionMm,
    deflectionTargetMm,
  };
}
