import { nodeLabel, memberLabel } from './entityLabels';
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

import { getMaterial, MATERIALS } from './materials';
import { materialStrength } from './materialLab';
import { computeSectionProps, isValidSectionParams } from './crossSections';
import { solveLinearSystem, zeros } from './math';
import { stressColorForPalette } from './resultPalette';
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
  const EA_over_L = E * (A_mm2 / L);
  if (!Number.isFinite(EA_over_L) || EA_over_L <= 0) return null;

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
    return failedResult('Add joints and members before running analysis.');
  }

  if (beams.length === 0) {
    return failedResult('Add at least one beam (member) connecting two nodes.');
  }

  const invalidModel = validateModel(nodes, beams);
  if (invalidModel) {
    return failedResult(invalidModel);
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
    if (!es) return failedResult(`Member ${memberLabel(beam.id, beams)} is outside the solver's supported numeric range.`);

    const { k, L, c, s, EA_over_L } = es;
    elemData.push({ beam, L, c, s, EA_over_L, iIdx, jIdx });

    // DOF map for this element: [uxi, uyi, uxj, uyj]
    const dofs = [2 * iIdx, 2 * iIdx + 1, 2 * jIdx, 2 * jIdx + 1];
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        K[dofs[a]][dofs[b]] += k[a][b];
        if (!Number.isFinite(K[dofs[a]][dofs[b]])) return failedResult('The model exceeds the solver numeric range. Reduce member areas or coordinate magnitudes.');
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
    return failedResult('Every joint direction is locked. Release some supports so the model can deform under load.');
  }

  // Check that at least some support exists (otherwise pure rigid-body)
  const hasSupport = nodes.some((n) => n.support !== 'none');
  if (!hasSupport) {
    return failedResult('Unstable structure: add supports so the whole model cannot slide or spin.', true);
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

  // Normalize the stiffness matrix so the linear solver's pivot tolerance is
  // independent of the model's chosen units and member sizes.
  let stiffnessScale = 0;
  for (const row of Kred) {
    for (const value of row) stiffnessScale = Math.max(stiffnessScale, Math.abs(value));
  }
  if (!Number.isFinite(stiffnessScale)) return failedResult('The model exceeds the solver numeric range. Reduce member areas or coordinate magnitudes.');
  if (stiffnessScale === 0) return failedResult('Unstable structure: free joints have no connecting stiffness — check members and areas.', true);
  const normalizedK = Kred.map((row) => row.map((value) => value / stiffnessScale));
  const normalizedF = Fred.map((value) => value / stiffnessScale);
  if (!normalizedF.every(Number.isFinite)) return failedResult('The model exceeds the solver numeric range. Reduce applied loads or member stiffness.');

  // --- Solve K_red · u_red = F_red ---
  const uRed = solveLinearSystem(normalizedK, normalizedF);
  if (uRed === null) {
    return failedResult('Unstable structure: check supports and triangulation — the model may still fold (missing triangles).', true);
  }
  if (!uRed.every(Number.isFinite)) return failedResult('The calculated displacement exceeds the solver numeric range. Check loads, dimensions, and member sizes.');

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
  if (!reactions.every((reaction) => Number.isFinite(reaction.fx) && Number.isFinite(reaction.fy))) return failedResult('The calculated support reactions exceed the solver numeric range.');

  // --- Member forces & stresses ---
  // Axial force: N = (EA/L) · [(ux2−ux1)c + (uy2−uy1)s]
  // Positive N ⇒ tension (elongation along member axis).
  const members: MemberResult[] = [];
  let maxSafetyRatio = 0;
  let anyYielded = false;
  let maxAxialForce = 0;

  for (const ed of elemData) {
    const ux1 = u[2 * ed.iIdx];
    const uy1 = u[2 * ed.iIdx + 1];
    const ux2 = u[2 * ed.jIdx];
    const uy2 = u[2 * ed.jIdx + 1];

    const delta = (ux2 - ux1) * ed.c + (uy2 - uy1) * ed.s;
    const axialForce = ed.EA_over_L * delta; // N
    const stress = axialForce / ed.beam.area; // N/mm² = MPa
    const mat = getMaterial(ed.beam.materialId);
    const limit = materialStrength(mat.id, stress);
    // Cables in compression are invalid in this linear model, not rigid bars.
    const safetyRatio = limit > 0 ? Math.abs(stress) / limit : Math.abs(stress) > 1e-8 ? 1e12 : 0;
    if (![delta, axialForce, stress, safetyRatio].every(Number.isFinite)) return failedResult('The calculated member result exceeds the solver numeric range. Check loads, dimensions, and member sizes.');
    const yielded = safetyRatio >= 1;
    if (yielded) anyYielded = true;
    if (safetyRatio > maxSafetyRatio) maxSafetyRatio = safetyRatio;

    maxAxialForce = Math.max(maxAxialForce, Math.abs(axialForce));

    members.push({
      beamId: ed.beam.id,
      axialForce,
      stress,
      safetyRatio,
      status: axialForce > 0 ? 'tension' : axialForce < 0 ? 'compression' : 'zero',
      length: ed.L,
      yielded,
    });
  }

  // Classify near-zero forces relative to this load case. An absolute stress
  // cutoff made identical linear models change labels when loads were scaled.
  const zeroForceTolerance = maxAxialForce * 1e-10;
  for (const member of members) {
    if (Math.abs(member.axialForce) <= zeroForceTolerance) member.status = 'zero';
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

function failedResult(message: string, unstable = false): FEAResult {
  return { success: false, unstable, message, members: [], displacements: [], maxSafetyRatio: 0, passed: false };
}

function validateModel(nodes: Node[], beams: Beam[]): string | null {
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!node.id || nodeIds.has(node.id)) return `Node IDs must be present and unique (${node.id || 'unnamed node'}).`;
    nodeIds.add(node.id);
    if (![node.x, node.y, node.fx, node.fy].every(Number.isFinite)) return `Node ${nodeLabel(node.id)} has a non-finite coordinate or load.`;
    if (!['none', 'pin', 'rollerX', 'rollerY', 'fixed'].includes(node.support)) return `Node ${nodeLabel(node.id)} has an unsupported boundary condition.`;
  }

  const beamIds = new Set<string>();
  for (const beam of beams) {
    if (!beam.id || beamIds.has(beam.id)) return `Member IDs must be present and unique (${beam.id || 'unnamed member'}).`;
    beamIds.add(beam.id);
    if (!nodeIds.has(beam.nodeI) || !nodeIds.has(beam.nodeJ)) return `Member ${memberLabel(beam.id, beams)} references a node that is missing from the model.`;
    if (beam.nodeI === beam.nodeJ) return `Member ${memberLabel(beam.id, beams)} connects a node to itself.`;
    const start = nodes.find((node) => node.id === beam.nodeI)!;
    const end = nodes.find((node) => node.id === beam.nodeJ)!;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (!Number.isFinite(length)) return `Member ${memberLabel(beam.id, beams)} has coordinates outside the solver's numeric range.`;
    if (length < 1e-9) return `Member ${memberLabel(beam.id, beams)} has zero length. Move one of its nodes or remove the member.`;
    if (!Number.isFinite(beam.area) || beam.area <= 0) return `Member ${memberLabel(beam.id, beams)} needs a positive finite cross-sectional area.`;
    if (beam.I !== undefined && (!Number.isFinite(beam.I) || beam.I <= 0)) return `Member ${memberLabel(beam.id, beams)} needs a positive finite moment of inertia for its buckling estimate.`;
    if (beam.section !== undefined) {
      if (!isValidSectionParams(beam.section)) return `Member ${memberLabel(beam.id, beams)} has invalid cross-section dimensions.`;
      const properties = computeSectionProps(beam.section);
      const close = (actual: number, expected: number) => Math.abs(actual - expected) <= Math.max(Math.abs(expected) * 1e-6, 1e-9);
      if (!close(beam.area, properties.area) || (beam.I !== undefined && !close(beam.I, properties.I))) {
        return `Member ${memberLabel(beam.id, beams)} section dimensions do not match its area or moment of inertia. Reapply the section in the editor.`;
      }
    }
    const material = MATERIALS.find((item) => item.id === beam.materialId);
    if (!material || !Number.isFinite(material.E) || material.E <= 0 || !Number.isFinite(material.sigmaYield) || material.sigmaYield <= 0) return `Member ${memberLabel(beam.id, beams)} has an unknown or invalid material.`;
  }
  return null;
}

/** Map safety ratio → heatmap color (CSS hex). Green = low stress, red = yielded. */
export function stressColor(ratio: number, yielded: boolean): string {
  return stressColorForPalette(ratio, yielded, 'default');
}
