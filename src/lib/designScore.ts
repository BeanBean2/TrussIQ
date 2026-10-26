import { computeMassCost } from './massCost';
import type { Beam, FEAResult, Node } from './types';

export interface DesignScore {
  score: number;
  massKg: number;
  utilization: number | null;
  maxDeflection: number | null;
  stable: boolean;
  feasible: boolean;
  explanation: string;
}

/** A transparent classroom objective: reward low mass while enforcing modeled limits. */
export function scoreDesign(nodes: Node[], beams: Beam[], result: FEAResult, massBudgetKg: number, maxDeflectionMm: number): DesignScore {
  const massKg = computeMassCost(nodes, beams).totalMassG / 1000;
  const utilization = result.success ? result.maxSafetyRatio : null;
  const maxDeflection = result.success ? Math.max(0, ...result.displacements.map((item) => Math.hypot(item.ux, item.uy))) : null;
  const stable = result.success;
  const feasible = stable && (utilization ?? Infinity) < 1 && (maxDeflection ?? Infinity) <= maxDeflectionMm && massKg <= massBudgetKg;
  const score = feasible && massBudgetKg > 0 ? Math.max(0, Math.min(100, (1 - massKg / massBudgetKg) * 100)) : 0;
  const explanation = !stable
    ? `Solver could not find a stable solution: ${result.message ?? 'check supports and triangulation.'}`
    : (utilization ?? 0) >= 1
      ? 'At least one member reaches the modeled yield limit.'
      : (maxDeflection ?? 0) > maxDeflectionMm
        ? `Deflection exceeds the ${maxDeflectionMm.toFixed(1)} mm classroom limit.`
        : massKg > massBudgetKg
          ? `Mass exceeds the ${massBudgetKg.toFixed(2)} kg budget.`
          : `All selected classroom limits pass; ${score.toFixed(0)}% of the mass budget remains.`;
  return { score, massKg, utilization, maxDeflection, stable, feasible, explanation };
}
