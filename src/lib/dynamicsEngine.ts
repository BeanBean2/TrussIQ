/**
 * Environmental dynamics overlays for TrussIQ.
 *
 * Wind: height-based power-law profile v(z) = v₀ (z/z₀)^α → lateral Fx.
 * Seismic: harmonic base acceleration F(t) = m · A · sin(ωt) on free nodes
 *          (lumped mass from connected members).
 *
 * Both produce additive nodal force deltas that are merged with user loads
 * before calling the static Direct Stiffness Method (quasi-static sweep).
 */

import { getMaterial } from './materials';
import type {
  Beam,
  Node,
  SeismicParams,
  WindParams,
} from './types';

export const DEFAULT_WIND: WindParams = {
  v0: 25, // m/s ≈ tropical storm
  z0: 100, // mm reference height above deck min
  alpha: 0.16, // open terrain
  dragScale: 0.35, // N / (m/s)²  classroom scale
};

export const DEFAULT_SEISMIC: SeismicParams = {
  amplitude: 2.5, // m/s² (~0.25 g)
  omega: 8, // rad/s ≈ 1.27 Hz
  time: 0,
};

/** Ground / deck reference Y (bottom of structure). */
function groundY(nodes: Node[]): number {
  if (nodes.length === 0) return 0;
  return Math.max(...nodes.map((n) => n.y));
}

/**
 * Height above "ground" in mm (canvas Y grows downward, so invert).
 */
function heightAboveGround(node: Node, gy: number): number {
  return Math.max(0, gy - node.y);
}

/**
 * Lateral wind shear: apply Fx proportional to v(z)² on free / lightly supported nodes.
 * v(z) = v₀ (z/z₀)^α
 */
export function applyWindLoads(
  nodes: Node[],
  wind: WindParams = DEFAULT_WIND,
): Node[] {
  const gy = groundY(nodes);
  const z0 = Math.max(wind.z0, 1);

  return nodes.map((n) => {
    // Supported nodes still feel wind on free DOF if roller; apply to all non-fully-fixed for demo
    const z = heightAboveGround(n, gy);
    const ratio = Math.max(z / z0, 0.05);
    const v = wind.v0 * Math.pow(ratio, wind.alpha);
    const fxWind = wind.dragScale * v * v; // N, positive = to the right
    return {
      ...n,
      fx: n.fx + fxWind,
    };
  });
}

/**
 * Estimate lumped nodal mass (kg) from half the mass of connected members.
 * mass_g = ρ · A · L / 1000 (cm³) → kg = mass_g / 1000
 */
function lumpedMassKg(nodeId: string, nodes: Node[], beams: Beam[]): number {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let massG = 0;
  for (const b of beams) {
    if (b.nodeI !== nodeId && b.nodeJ !== nodeId) continue;
    const ni = nodeMap.get(b.nodeI);
    const nj = nodeMap.get(b.nodeJ);
    if (!ni || !nj) continue;
    const L = Math.hypot(nj.x - ni.x, nj.y - ni.y);
    const volCm3 = (b.area * L) / 1000;
    const mat = getMaterial(b.materialId);
    massG += 0.5 * mat.density * volCm3;
  }
  // Minimum mass so isolated supports still shake a little
  return Math.max(massG / 1000, 0.05);
}

/**
 * Seismic sweep: F_x(t) = m · A · sin(ω t)  (horizontal inertia force).
 * Applied to free joints; support nodes get reaction path through the model.
 */
export function applySeismicLoads(
  nodes: Node[],
  beams: Beam[],
  seismic: SeismicParams = DEFAULT_SEISMIC,
): Node[] {
  const a = seismic.amplitude * Math.sin(seismic.omega * seismic.time); // m/s²
  return nodes.map((n) => {
    if (n.support === 'fixed' || n.support === 'pin') {
      // Base nodes: ground motion is the driver; keep user loads, add small base shove for visualization
      return { ...n, fx: n.fx + a * 0.5 };
    }
    const m = lumpedMassKg(n.id, nodes, beams);
    const Fx = m * a * 1000; // scale kg·m/s² → classroom N (×1000 for visible effect on mm model)
    return { ...n, fx: n.fx + Fx };
  });
}

/**
 * Merge environmental overlays onto a structure's nodes.
 */
export function applyDynamics(
  nodes: Node[],
  beams: Beam[],
  mode: 'none' | 'wind' | 'seismic',
  wind: WindParams,
  seismic: SeismicParams,
): Node[] {
  if (mode === 'wind') return applyWindLoads(nodes, wind);
  if (mode === 'seismic') return applySeismicLoads(nodes, beams, seismic);
  return nodes;
}
