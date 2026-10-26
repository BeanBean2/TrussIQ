/**
 * Educational Formula Inspector — reconstructs Direct Stiffness Method steps
 * for a single selected member so students can see the live math.
 */

import { getMaterial } from './materials';
import type {
  Beam,
  FEAResult,
  FormulaBreakdown,
  Node,
} from './types';

/**
 * Build a full DSM breakdown for one beam given the latest FEA result.
 * Returns null if the beam/result cannot be resolved.
 */
export function buildFormulaBreakdown(
  beamId: string,
  nodes: Node[],
  beams: Beam[],
  result: FEAResult | null,
): FormulaBreakdown | null {
  const beam = beams.find((b) => b.id === beamId);
  if (!beam) return null;

  const ni = nodes.find((n) => n.id === beam.nodeI);
  const nj = nodes.find((n) => n.id === beam.nodeJ);
  if (!ni || !nj) return null;

  const dx = nj.x - ni.x;
  const dy = nj.y - ni.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) return null;

  const c = dx / L;
  const s = dy / L;
  const thetaDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const mat = getMaterial(beam.materialId);
  const E = mat.E * 1000; // N/mm²
  const EA_over_L = (E * beam.area) / L;

  const c2 = c * c;
  const s2 = s * s;
  const cs = c * s;
  const k = EA_over_L;

  // Local→global truss stiffness (4×4) as used in assembly
  const kLocal = [
    [k * c2, k * cs, -k * c2, -k * cs],
    [k * cs, k * s2, -k * cs, -k * s2],
    [-k * c2, -k * cs, k * c2, k * cs],
    [-k * cs, -k * s2, k * cs, k * s2],
  ];

  let ux1 = 0;
  let uy1 = 0;
  let ux2 = 0;
  let uy2 = 0;
  if (result?.success) {
    const d1 = result.displacements.find((d) => d.nodeId === ni.id);
    const d2 = result.displacements.find((d) => d.nodeId === nj.id);
    if (d1) {
      ux1 = d1.ux;
      uy1 = d1.uy;
    }
    if (d2) {
      ux2 = d2.ux;
      uy2 = d2.uy;
    }
  }

  // Axial elongation along member: ΔL = (ux2−ux1)c + (uy2−uy1)s
  const deltaL = (ux2 - ux1) * c + (uy2 - uy1) * s;
  const axialForce = EA_over_L * deltaL;
  const stress = axialForce / beam.area;
  const strain = L > 0 ? deltaL / L : 0;

  const solvedMember = result?.success ? result.members.find((member) => member.beamId === beamId) : undefined;
  const status: FormulaBreakdown['status'] = solvedMember?.status ?? (axialForce > 0 ? 'tension' : axialForce < 0 ? 'compression' : 'zero');

  return {
    beamId: beam.id,
    nodeI: beam.nodeI,
    nodeJ: beam.nodeJ,
    L,
    thetaDeg,
    c,
    s,
    E_GPa: mat.E,
    A: beam.area,
    EA_over_L,
    kLocal,
    ux1,
    uy1,
    ux2,
    uy2,
    deltaL,
    axialForce,
    stress,
    strain,
    status,
  };
}
