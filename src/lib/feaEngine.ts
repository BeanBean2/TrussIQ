/**
 * TrussIQ — 2D Direct Stiffness Method (DSM) engine.
 *
 * Solves [K]{u} = {F} for pin-jointed plane trusses.
 *
 * Unit system (consistent):
 *   Length  → mm
 *   Force   → N
 *   E       → GPa  (= 10³ N/mm²)
 *   A       → mm²
 *   Stress  → MPa  (= N/mm²)
 *
 * Conversion: E_N_per_mm2 = E_GPa * 1000
 * Then EA/L has units N/mm, × displacement(mm) → force(N). ✓
 */

import { getMaterial } from './materials';
import { solveLinearSystem, zeros } from './math';
import type {
  Beam,
  FEAResult,
  MemberResult,
  Node,
  NodalDisplacement,
  SupportType,
} from './types';

/** Degrees of freedom constrained (fixed = true) for each support type. */
function constrainedDOFs(support: SupportType): { x: boolean; y: boolean } {
  switch (support) {
    case 'pin':
    case 'fixed':
      return { x: true, y: true };
    case 'rollerX':
      // Roller on vertical wall / restrains X motion
      return { x: true, y: false };
    case 'rollerY':
      // Roller on horizontal ground / restrains Y motion
      return { x: false, y: true };
    default:
      return { x: false, y: false };
  }
}

/**
 * Local → global element stiffness matrix (4×4) for a truss bar.
 *
 *   kᵉ = (EA/L) · [[ c²,  cs, -c², -cs],
 *                   [ cs,  s², -cs, -s²],
 *                   [-c², -cs,  c²,  cs],
 *                   [-cs, -s²,  cs,  s²]]
 *
 * where c = cos θ, s = sin θ, θ = atan2(dy, dx).
 */
function elementStiffness(
  xi: number,
  yi: number,
  xj: number,
  yj: number,
  E_GPa: number,
  A_mm2: number,
): { k: number[][]; L: number; c: number; s: number; EA_over_L: number } | null {
  const dx = xj - xi;
  const dy = yj - yi;
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) return null; // degenerate zero-length member

  const c = dx / L;
  const s = dy / L;
  // E [GPa] → N/mm²
  const E = E_GPa * 1000;
  const EA_over_L = (E * A_mm2) / L;

  const c2 = c * c;
  const s2 = s * s;
  const cs = c * s;

  const k = [
    [EA_over_L * c2, EA_over_L * cs, -EA_over_L * c2, -EA_over_L * cs],
    [EA_over_L * cs, EA_over_L * s2, -EA_over_L * cs, -EA_over_L * s2],
    [-EA_over_L * c2, -EA_over_L * cs, EA_over_L * c2, EA_over_L * cs],
    [-EA_over_L * cs, -EA_over_L * s2, EA_over_L * cs, EA_over_L * s2],
  ];

  return { k, L, c, s, EA_over_L };
}

/**
 * Assemble global K, apply BCs, solve for nodal displacements, then
 * recover member axial forces and stresses.
 */
export function solveTruss(nodes: Node[], beams: Beam[]): FEAResult {
  if (nodes.length === 0) {
    return {
      success: false,
      unstable: false,
      message: 'Add nodes and members before running the solver.',
      members: [],
      displacements: [],
      maxSafetyRatio: 0,
      passed: false,
    };
  }

  if (beams.length === 0) {
    return {
      success: false,
      unstable: false,
      message: 'Add at least one beam (member) connecting two nodes.',
      members: [],
      displacements: [],
      maxSafetyRatio: 0,
      passed: false,
    };
  }

  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const N = nodes.length;
  const ndof = 2 * N;

  // --- Global stiffness assembly ---
  const K = zeros(ndof);
  const F = Array(ndof).fill(0);

  // Applied nodal loads
  for (let i = 0; i < N; i++) {
    F[2 * i] = nodes[i].fx;
    F[2 * i + 1] = nodes[i].fy;
  }

  // Element data cached for post-processing
  const elemData: Array<{
    beam: Beam;
    L: number;
    c: number;
    s: number;
    EA_over_L: number;
    iIdx: number;
    jIdx: number;
  }> = [];

  for (const beam of beams) {
    const iIdx = nodeIndex.get(beam.nodeI);
    const jIdx = nodeIndex.get(beam.nodeJ);
    if (iIdx === undefined || jIdx === undefined) continue;

    const ni = nodes[iIdx];
    const nj = nodes[jIdx];
    const mat = getMaterial(beam.materialId);
    const es = elementStiffness(ni.x, ni.y, nj.x, nj.y, mat.E, beam.area);
    if (!es) continue;

    const { k, L, c, s, EA_over_L } = es;
    elemData.push({ beam, L, c, s, EA_over_L, iIdx, jIdx });

    // DOF map for this element: [uxi, uyi, uxj, uyj]
    const dofs = [2 * iIdx, 2 * iIdx + 1, 2 * jIdx, 2 * jIdx + 1];
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        K[dofs[a]][dofs[b]] += k[a][b];
      }
    }
  }

  // --- Boundary conditions: mark constrained DOFs ---
  const isFixed = Array(ndof).fill(false);
  let freeCount = 0;
  for (let i = 0; i < N; i++) {
    const cstr = constrainedDOFs(nodes[i].support);
    isFixed[2 * i] = cstr.x;
    isFixed[2 * i + 1] = cstr.y;
    if (!cstr.x) freeCount++;
    if (!cstr.y) freeCount++;
  }

  if (freeCount === 0) {
    return {
      success: false,
      unstable: false,
      message: 'All degrees of freedom are constrained. Release some supports.',
      members: [],
      displacements: [],
      maxSafetyRatio: 0,
      passed: false,
    };
  }

  // Check that at least some support exists (otherwise pure rigid-body)
  const hasSupport = nodes.some((n) => n.support !== 'none');
  if (!hasSupport) {
    return {
      success: false,
      unstable: true,
      message: 'Unstable Structure: Add more supports to prevent rigid body motion.',
      members: [],
      displacements: [],
      maxSafetyRatio: 0,
      passed: false,
    };
  }

  // --- Reduce system to free DOFs ---
  const freeDOFs: number[] = [];
  for (let d = 0; d < ndof; d++) {
    if (!isFixed[d]) freeDOFs.push(d);
  }

  const nFree = freeDOFs.length;
  const Kred = zeros(nFree);
  const Fred = Array(nFree).fill(0);

  for (let a = 0; a < nFree; a++) {
    Fred[a] = F[freeDOFs[a]];
    for (let b = 0; b < nFree; b++) {
      Kred[a][b] = K[freeDOFs[a]][freeDOFs[b]];
    }
  }

  // --- Solve K_red · u_red = F_red ---
  const uRed = solveLinearSystem(Kred, Fred);
  if (uRed === null) {
    return {
      success: false,
      unstable: true,
      message: 'Unstable Structure: Add more supports to prevent rigid body motion.',
      members: [],
      displacements: [],
      maxSafetyRatio: 0,
      passed: false,
    };
  }

  // Expand to full displacement vector (constrained DOFs = 0)
  const u = Array(ndof).fill(0);
  for (let a = 0; a < nFree; a++) {
    u[freeDOFs[a]] = uRed[a];
  }

  const displacements: NodalDisplacement[] = nodes.map((n, i) => ({
    nodeId: n.id,
    ux: u[2 * i],
    uy: u[2 * i + 1],
  }));

  // Recover support reactions from the unmodified global equilibrium residual.
  // Free DOFs should have a near-zero residual; constrained DOFs carry the reactions.
  const reactions = nodes.map((node, i) => ({
    nodeId: node.id,
    fx: isFixed[2 * i]
      ? K[2 * i].reduce((sum, value, j) => sum + value * u[j], 0) - F[2 * i]
      : 0,
    fy: isFixed[2 * i + 1]
      ? K[2 * i + 1].reduce((sum, value, j) => sum + value * u[j], 0) - F[2 * i + 1]
      : 0,
  }));

  // --- Member forces & stresses ---
  // Axial force: N = (EA/L) · [(ux2−ux1)c + (uy2−uy1)s]
  // Positive N ⇒ tension (elongation along member axis).
  const members: MemberResult[] = [];
  let maxSafetyRatio = 0;
  let anyYielded = false;

  for (const ed of elemData) {
    const ux1 = u[2 * ed.iIdx];
    const uy1 = u[2 * ed.iIdx + 1];
    const ux2 = u[2 * ed.jIdx];
    const uy2 = u[2 * ed.jIdx + 1];

    const delta = (ux2 - ux1) * ed.c + (uy2 - uy1) * ed.s;
    const axialForce = ed.EA_over_L * delta; // N
    const stress = axialForce / ed.beam.area; // N/mm² = MPa
    const mat = getMaterial(ed.beam.materialId);
    const safetyRatio = Math.abs(stress) / mat.sigmaYield;
    const yielded = safetyRatio >= 1;
    if (yielded) anyYielded = true;
    if (safetyRatio > maxSafetyRatio) maxSafetyRatio = safetyRatio;

    let status: MemberResult['status'] = 'zero';
    if (Math.abs(stress) < 1e-6) status = 'zero';
    else if (stress > 0) status = 'tension';
    else status = 'compression';

    members.push({
      beamId: ed.beam.id,
      axialForce,
      stress,
      safetyRatio,
      status,
      length: ed.L,
      yielded,
    });
  }

  return {
    success: true,
    unstable: false,
    members,
    displacements,
    reactions,
    maxSafetyRatio,
    passed: !anyYielded,
  };
}

/** Map safety ratio → heatmap color (CSS hex). */
export function stressColor(ratio: number, yielded: boolean): string {
  if (yielded || ratio >= 1) return '#ef4444'; // failure red
  if (ratio >= 0.9) return '#f97316'; // orange
  if (ratio >= 0.5) return '#eab308'; // yellow
  if (ratio >= 0.25) return '#84cc16'; // lime
  return '#22c55e'; // green — low stress
}
