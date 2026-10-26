/**
 * TrussIQ AI Structural Optimization Assistant
 *
 * Rule-based engineering heuristics (no external LLM required) that analyze
 * a solved truss and produce actionable classroom advice:
 *  1. Euler buckling risk for long compression members
 *  2. Zero-force member removal (weight savings)
 *  3. Smart load re-distribution tips at high-stress joints
 */

import { getMaterial } from './materials';
import { computeSectionProps } from './crossSections';
import type {
  AIAdviceItem,
  AIAnalysis,
  Beam,
  FEAResult,
  Node,
} from './types';

/** Effective-length factor K for pin-ended truss bars (Euler). */
const K_EFF = 1.0;
/** Flag buckling when |σ_comp| exceeds this fraction of σ_cr. */
const BUCKLING_MARGIN = 0.85;

/**
 * Second moment of area for an equivalent solid circular section of area A.
 *   A = π r²  →  I = π r⁴ / 4 = A² / (4π)
 * Units: A in mm² → I in mm⁴.
 */
function momentOfInertia(A_mm2: number): number {
  return (A_mm2 * A_mm2) / (4 * Math.PI);
}

/**
 * Euler critical buckling stress (MPa = N/mm²):
 *   σ_cr = π² E I / (A · (K L)²)
 * with E in N/mm², I in mm⁴, L in mm, A in mm².
 * Uses exact section I when available; else solid-rod estimate from A.
 */
function eulerCriticalStress(
  E_GPa: number,
  A_mm2: number,
  L_mm: number,
  I_mm4?: number,
): number {
  const E = E_GPa * 1000; // N/mm²
  const I = I_mm4 && I_mm4 > 0 ? I_mm4 : momentOfInertia(A_mm2);
  const KL = K_EFF * L_mm;
  if (A_mm2 < 1e-9 || KL < 1e-9) return Infinity;
  return (Math.PI * Math.PI * E * I) / (A_mm2 * KL * KL);
}

function shortLabel(id: string, prefix: string): string {
  const parts = id.split('_');
  return `${prefix}${parts[parts.length - 1]}`;
}

/**
 * Analyze a solved structure and return ranked engineering advice.
 */
export function analyzeStructure(
  nodes: Node[],
  beams: Beam[],
  result: FEAResult | null,
): AIAnalysis {
  const items: AIAdviceItem[] = [];
  const bucklingBeamIds: string[] = [];
  const zeroForceBeamIds: string[] = [];
  const hotNodeIds: string[] = [];

  if (!result?.success) {
    items.push({
      id: 'need-solve',
      severity: 'info',
      title: 'Run the solver first',
      message:
        'Click “Run FEA” so the local rule-based coach can inspect stress, screen for buckling risk, and identify zero-force members.',
    });
    return { items, bucklingBeamIds, zeroForceBeamIds, hotNodeIds };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const beamMap = new Map(beams.map((b) => [b.id, b]));

  // --- 1. Buckling & failure risk ---
  for (const m of result.members) {
    if (m.status !== 'compression') continue;
    const beam = beamMap.get(m.beamId);
    if (!beam) continue;
    const mat = getMaterial(beam.materialId);
    const sectionI = beam.I ?? (beam.section ? computeSectionProps(beam.section).I : undefined);
    const sigmaCr = eulerCriticalStress(mat.E, beam.area, m.length, sectionI);
    const sigmaComp = Math.abs(m.stress);

    if (sigmaComp >= BUCKLING_MARGIN * sigmaCr || sigmaCr < mat.sigmaYield * 0.15) {
      bucklingBeamIds.push(m.beamId);
      const ratio = sigmaCr > 0 ? ((sigmaComp / sigmaCr) * 100).toFixed(0) : '∞';
      items.push({
        id: `buckle-${m.beamId}`,
        severity: sigmaComp >= sigmaCr ? 'critical' : 'warning',
        title: `Buckling risk — ${shortLabel(m.beamId, 'M')}`,
        message:
          `Member ${shortLabel(m.beamId, 'M')} is in compression (${sigmaComp.toFixed(1)} MPa) ` +
          `with Euler σ_cr ≈ ${sigmaCr.toFixed(1)} MPa (${ratio}% of critical). ` +
          `Shorten the member, increase cross-section A, or add intermediate bracing. ` +
          `(σ_cr = π²EI / A(KL)², K=${K_EFF})`,
        beamIds: [m.beamId],
      });
    }
  }

  // --- 2. Zero-force members (weight savings) ---
  for (const m of result.members) {
    if (m.status === 'zero') {
      zeroForceBeamIds.push(m.beamId);
    }
  }
  if (zeroForceBeamIds.length > 0) {
    const labels = zeroForceBeamIds.map((id) => shortLabel(id, 'M')).join(', ');
    items.push({
      id: 'zero-force',
      severity: 'info',
      title: 'Weight-to-strength opportunity',
      message:
        `${zeroForceBeamIds.length} zero-force member(s) detected (${labels}). ` +
        `Under the current load case they carry ≈ 0 N — removing them reduces mass and material cost ` +
        `without changing the force path (verify under alternate load cases before deleting).`,
      beamIds: [...zeroForceBeamIds],
    });
  }

  // --- 3. Smart load re-distribution ---
  // Score each free joint by |applied load| + sum of connected |member forces|
  type NodeScore = { nodeId: string; score: number; share: number };
  const scores = new Map<string, number>();

  for (const n of nodes) {
    scores.set(n.id, Math.hypot(n.fx, n.fy));
  }
  for (const m of result.members) {
    const beam = beamMap.get(m.beamId);
    if (!beam) continue;
    const mag = Math.abs(m.axialForce);
    scores.set(beam.nodeI, (scores.get(beam.nodeI) ?? 0) + mag * 0.5);
    scores.set(beam.nodeJ, (scores.get(beam.nodeJ) ?? 0) + mag * 0.5);
  }

  const ranked: NodeScore[] = [...scores.entries()]
    .map(([nodeId, score]) => ({ nodeId, score, share: 0 }))
    .sort((a, b) => b.score - a.score);

  const total = ranked.reduce((s, r) => s + r.score, 0) || 1;
  for (const r of ranked) r.share = r.score / total;

  const hottest = ranked[0];
  if (hottest && hottest.share >= 0.12 && ranked.length >= 3) {
    hotNodeIds.push(hottest.nodeId);
    const hotNode = nodeMap.get(hottest.nodeId);
    // Suggest bracing to a nearby lightly-loaded neighbor not already connected
    const neighbors = new Set<string>();
    for (const b of beams) {
      if (b.nodeI === hottest.nodeId) neighbors.add(b.nodeJ);
      if (b.nodeJ === hottest.nodeId) neighbors.add(b.nodeI);
    }
    const candidate = ranked.find(
      (r) =>
        r.nodeId !== hottest.nodeId &&
        !neighbors.has(r.nodeId) &&
        nodeMap.get(r.nodeId)?.support === 'none',
    );

    let braceTip = 'Consider adding diagonal bracing to redistribute axial stress.';
    if (candidate && hotNode) {
      const other = nodeMap.get(candidate.nodeId);
      if (other) {
        braceTip =
          `Consider adding a diagonal bracing member between ` +
          `${shortLabel(hottest.nodeId, 'N')} and ${shortLabel(candidate.nodeId, 'N')} ` +
          `to redistribute axial stress.`;
      }
    }

    items.push({
      id: `hot-${hottest.nodeId}`,
      severity: hottest.share >= 0.25 ? 'warning' : 'info',
      title: `High load concentration — ${shortLabel(hottest.nodeId, 'N')}`,
      message:
        `${shortLabel(hottest.nodeId, 'N')} carries roughly ${(hottest.share * 100).toFixed(0)}% ` +
        `of the structure’s load intensity. ${braceTip}`,
      nodeIds: [hottest.nodeId, ...(candidate ? [candidate.nodeId] : [])],
    });
  }

  // --- Yield summary ---
  const yielded = result.members.filter((m) => m.yielded);
  if (yielded.length > 0) {
    items.push({
      id: 'yield-fail',
      severity: 'critical',
      title: 'Yield failure detected',
      message:
        `${yielded.length} member(s) exceed σ_yield. Increase cross-section, switch material, ` +
        `or reduce applied loads before using this design.`,
      beamIds: yielded.map((m) => m.beamId),
    });
  } else if (result.passed && items.filter((i) => i.severity === 'critical').length === 0) {
    items.push({
      id: 'sound',
      severity: 'success',
      title: 'Modeled yield check passed',
      message:
        `Peak |σ|/σ_yield = ${(result.maxSafetyRatio * 100).toFixed(0)}%. ` +
        `No members exceed yield under this linear axial load case. This does not establish overall structural safety; ` +
        (bucklingBeamIds.length ? 'review the separate buckling screening flags above. ' : 'compression buckling is not cleared by this check. ') +
        'Connections, bracing, fatigue, and code requirements are not verified.',
    });
  }

  // Sort: critical → warning → info → success
  const order: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  return { items, bucklingBeamIds, zeroForceBeamIds, hotNodeIds };
}
