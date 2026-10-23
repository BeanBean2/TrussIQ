import { getMaterial } from './materials';
import type { Beam, MassCostSummary, Node } from './types';

/**
 * Total length, mass, and estimated classroom material cost.
 *
 * Volume: A(mm²) × L(mm) = mm³ → /1000 = cm³
 * Mass: density(g/cm³) × volume(cm³) = g
 * Cost: (mass_g / 1000) × $/kg
 */
export function computeMassCost(nodes: Node[], beams: Beam[]): MassCostSummary {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let totalLengthMm = 0;
  let totalVolumeCm3 = 0;
  let totalMassG = 0;
  let estimatedCostUSD = 0;

  for (const b of beams) {
    const ni = nodeMap.get(b.nodeI);
    const nj = nodeMap.get(b.nodeJ);
    if (!ni || !nj) continue;
    const L = Math.hypot(nj.x - ni.x, nj.y - ni.y);
    const volMm3 = b.area * L;
    const volCm3 = volMm3 / 1000;
    const mat = getMaterial(b.materialId);
    const massG = mat.density * volCm3;
    const cost = (massG / 1000) * mat.costUSDPerKg;

    totalLengthMm += L;
    totalVolumeCm3 += volCm3;
    totalMassG += massG;
    estimatedCostUSD += cost;
  }

  return {
    totalLengthMm,
    totalVolumeCm3,
    totalMassG,
    estimatedCostUSD,
    memberCount: beams.length,
  };
}
