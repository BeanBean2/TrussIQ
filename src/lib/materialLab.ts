import { computeSectionProps, solidRodFromArea, type SectionParams } from './crossSections';
import { getMaterial } from './materials';
import { computeMassCost } from './massCost';
import type { Beam, FEAResult, Node } from './types';

export type ComparisonBasis = 'dimensions' | 'mass' | 'budget';
export type MaterialView = 'materials' | 'stress';
export interface MaterialProfile {
  family: string;
  pattern: string;
  tradeoff: string;
  assumption: string;
  tension: number;
  compression: number;
  limitName: string;
  section: SectionParams;
}
// Illustrative classroom properties, not product specifications or design allowables.
// Composite and timber limits assume loading along fibers/grain; joints are excluded.
const PROFILES: Record<string, MaterialProfile> = {
  steel: { family: 'Ductile metal', pattern: 'solid', tradeoff: 'High stiffness, low material cost, high mass.', assumption: 'Generic structural steel; equal tension/compression yield limit.', tension: 250, compression: 250, limitName: 'Yield', section: { kind: 'solidRod', diameter: 12 } },
  al6061: { family: 'Light metal', pattern: 'double stripe', tradeoff: 'About one-third the density of steel, but more flexible at equal dimensions.', assumption: '6061-like classroom model; alloy temper and joints are not modeled.', tension: 276, compression: 276, limitName: 'Yield', section: { kind: 'hollowTube', outerDiameter: 20, innerDiameter: 16 } },
  wood: { family: 'Along-grain timber', pattern: 'grain', tradeoff: 'Very light and inexpensive; larger sections help control deflection and buckling.', assumption: 'Illustrative dry timber loaded along grain. Species, moisture, knots, and connections are excluded.', tension: 40, compression: 30, limitName: 'Timber strength', section: { kind: 'rectangle', width: 10, height: 20 } },
  cfiber: { family: 'Fiber composite', pattern: 'weave', tradeoff: 'Light and strong along fibers, costly, and weaker in compression than tension.', assumption: 'Equivalent axial laminate: E = 70 GPa along the member. Transverse loads, delamination, and layup are not simulated.', tension: 600, compression: 300, limitName: 'Composite strength', section: { kind: 'hollowTube', outerDiameter: 16, innerDiameter: 12 } },
  pla: { family: 'Printed polymer', pattern: 'layers', tradeoff: 'Light but flexible; printing direction, creep, and temperature matter.', assumption: 'Illustrative room-temperature axial print; layer adhesion, creep, and temperature are excluded.', tension: 50, compression: 50, limitName: 'Polymer strength', section: { kind: 'rectangle', width: 12, height: 12 } },
  titanium: { family: 'Premium metal', pattern: 'fine stripe', tradeoff: 'Strong and lighter than steel, with substantially higher material cost.', assumption: 'Generic titanium classroom model, not a certified grade.', tension: 880, compression: 880, limitName: 'Yield', section: { kind: 'solidRod', diameter: 10 } },
  rope: { family: 'Tension member', pattern: 'braid', tradeoff: 'Light and flexible; cannot carry compression.', assumption: 'Linear axial approximation in tension only. Any compression makes the cable model invalid; slack cable redistribution is not simulated.', tension: 250, compression: 0, limitName: 'Tensile strength', section: { kind: 'solidRod', diameter: 10 } },
};
export function materialProfile(id: string): MaterialProfile { return PROFILES[id] ?? PROFILES.steel; }
export function materialStrength(id: string, stress: number): number {
  const p = materialProfile(id);
  return stress < 0 ? p.compression : p.tension;
}
export function sectionForMaterial(id: string): SectionParams { return { ...materialProfile(id).section }; }
export function withSection(beam: Beam, section: SectionParams): Beam {
  const props = computeSectionProps(section);
  return { ...beam, section, area: props.area, I: props.I };
}
export function scaleSection(section: SectionParams, areaFactor: number): SectionParams {
  const k = Math.sqrt(areaFactor);
  switch (section.kind) {
    case 'solidRod': return { ...section, diameter: section.diameter * k };
    case 'hollowTube': return { ...section, outerDiameter: section.outerDiameter * k, innerDiameter: section.innerDiameter * k };
    case 'rectangle': return { ...section, width: section.width * k, height: section.height * k };
    case 'iBeam': return { ...section, height: section.height * k, flangeWidth: section.flangeWidth * k, flangeThickness: section.flangeThickness * k, webThickness: section.webThickness * k };
  }
}
export function comparisonBeams(nodes: Node[], beams: Beam[], id: string, basis: ComparisonBasis): Beam[] {
  const substituted = beams.map(b => ({ ...b, materialId: id }));
  if (basis === 'dimensions') return substituted;
  const original = computeMassCost(nodes, beams);
  const next = computeMassCost(nodes, substituted);
  const factor = basis === 'mass' ? original.totalMassG / next.totalMassG : original.estimatedCostUSD / next.estimatedCostUSD;
  if (!Number.isFinite(factor) || factor <= 0) return substituted;
  return substituted.map(b => {
    if (b.section) return withSection(b, scaleSection(b.section, factor));
    // Unspecified section: preserve axial area and scale its existing I consistently.
    return { ...b, area: b.area * factor, I: b.I === undefined ? undefined : b.I * factor * factor };
  });
}
export interface MaterialCheck { beamId: string; materialId: string; strengthRatio: number; bucklingRatio: number; mode: string; failed: boolean; }
export function materialChecks(beams: Beam[], result: FEAResult | null): MaterialCheck[] {
  if (!result?.success) return [];
  const byId = new Map(beams.map(b => [b.id, b]));
  return result.members.flatMap(m => {
    const b = byId.get(m.beamId); if (!b) return [];
    const mat = getMaterial(b.materialId), profile = materialProfile(b.materialId);
    const limit = materialStrength(b.materialId, m.stress);
    const strengthRatio = limit > 0 ? Math.abs(m.stress) / limit : Math.abs(m.stress) > 1e-8 ? Infinity : 0;
    let inertia = b.I ?? computeSectionProps(solidRodFromArea(b.area)).I;
    if (b.section?.kind === 'iBeam') {
      const s = b.section;
      inertia = Math.min(inertia, (2 * s.flangeThickness * s.flangeWidth ** 3 + (s.height - 2 * s.flangeThickness) * s.webThickness ** 3) / 12);
    }
    const critical = Math.PI ** 2 * mat.E * 1000 * inertia / Math.max(m.length ** 2, 1e-12);
    const bucklingRatio = m.stress < 0 && profile.compression > 0 ? Math.abs(m.axialForce) / critical : 0;
    const mode = limit === 0 && strengthRatio > 0 ? 'Cable in compression — invalid model' : bucklingRatio > strengthRatio ? 'Euler buckling' : m.stress < 0 && profile.limitName !== 'Yield' ? 'Compression strength' : profile.limitName;
    return [{ beamId: b.id, materialId: b.materialId, strengthRatio, bucklingRatio, mode, failed: Math.max(strengthRatio, bucklingRatio) >= 1 }];
  });
}
export function materialSnapshot(nodes: Node[], beams: Beam[], result: FEAResult | null) {
  const mass = computeMassCost(nodes, beams);
  const checks = materialChecks(beams, result);
  return { mass: mass.totalMassG, cost: mass.estimatedCostUSD, deflection: result?.success ? Math.max(0, ...result.displacements.map(d => Math.hypot(d.ux, d.uy))) : null, utilization: result?.success ? result.maxSafetyRatio : null, failures: checks.filter(c => c.failed).length };
}
export type MaterialSnapshot = ReturnType<typeof materialSnapshot>;
export interface MaterialChange { before: MaterialSnapshot; after: MaterialSnapshot; label: string; signature: string; }
export function percentChange(before: number | null, after: number | null): string {
  if (before === null || after === null || !Number.isFinite(before) || !Number.isFinite(after)) return 'Unavailable';
  if (Math.abs(before) < 1e-12) return Math.abs(after) < 1e-12 ? 'Unchanged' : 'New response';
  const delta = (after / before - 1) * 100;
  return Math.abs(delta) < 0.05 ? 'Unchanged' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
}
