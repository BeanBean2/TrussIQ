import { materialChecks, materialProfile, materialStrength } from './materialLab';
import { getMaterial } from './materials';
import { memberLabel } from './entityLabels';
import type { Beam, FEAResult } from './types';

export interface FailureExplanation {
  beamId: string; member: string; mode: string; demandRatio: number;
  explanation: string; remedy: string; invalidModel: boolean;
}
/** Explains limits of the elastic solution; it does not simulate post-failure redistribution. */
export function explainFailures(beams: Beam[], result: FEAResult | null): FailureExplanation[] {
  if (!result?.success) return [];
  const checks = materialChecks(beams, result);
  const members = new Map(result.members.map(m => [m.beamId, m]));
  const byId = new Map(beams.map(b => [b.id, b]));
  return checks.flatMap(check => {
    const beam = byId.get(check.beamId), member = members.get(check.beamId);
    if (!beam || !member) return [];
    const profile = materialProfile(beam.materialId), material = getMaterial(beam.materialId);
    const common = { beamId: beam.id, member: memberLabel(beam.id, beams), invalidModel: false };
    const failures: FailureExplanation[] = [];
    if (check.strengthRatio >= 1) {
      const compression = member.axialForce < 0;
      const limit = materialStrength(beam.materialId, member.stress);
      if (!limit) {
        failures.push({ ...common, mode: 'Cable goes slack', demandRatio: Infinity, invalidModel: true,
          explanation: `The rope between ${common.member} is being pushed with ${Math.abs(member.axialForce).toFixed(1)} N. Rope cannot resist compression: it would go slack, so the current bar-model solution is not physically valid.`,
          remedy: 'Replace this member with a compression-capable strut, or change the bracing/load path. A tension-only nonlinear analysis is needed to predict the redistributed forces.' });
      } else {
        const mode = profile.limitName === 'Yield' ? 'Permanent yielding' : compression ? 'Compression strength exceeded' : 'Tensile strength exceeded';
        const mechanism = profile.limitName === 'Yield' ? 'can deform permanently; the elastic model no longer predicts its response' : beam.materialId === 'wood' ? compression ? 'can crush along the grain' : 'can split or rupture along the grain' : beam.materialId === 'cfiber' ? compression ? 'can suffer fiber kinking or crushing' : 'can rupture along its fibers' : compression ? 'can crush or deform beyond its modeled strength' : 'can tear or fracture';
        failures.push({ ...common, mode, demandRatio: check.strengthRatio,
          explanation: `${material.name} at ${common.member} carries ${Math.abs(member.stress).toFixed(2)} MPa in ${compression ? 'compression' : 'tension'}, against a ${limit.toFixed(1)} MPa modeled limit (${(check.strengthRatio * 100).toFixed(0)}% use). The member ${mechanism}.`,
          remedy: 'Increase this member’s cross-sectional area, select a material with a higher strength limit, reduce the applied load, or add members to share the force.' });
      }
    }
    if (check.bucklingRatio >= 1) {
      const capacity = Math.abs(member.axialForce) / check.bucklingRatio;
      failures.push({ ...common, mode: 'Compression buckling', demandRatio: check.bucklingRatio,
        explanation: `${common.member} is compressed by ${Math.abs(member.axialForce).toFixed(1)} N, above its ideal pin-ended Euler buckling load of ${capacity.toFixed(1)} N. It may bow sideways and lose load-carrying capacity, even when the material stress is below its strength limit.`,
        remedy: 'Shorten the unsupported length with effective lateral bracing, use a section with greater weak-axis moment of inertia (such as a larger tube), or reduce compression. Making a member stronger alone may not stop buckling.' });
    }
    return failures;
  }).sort((a, b) => a.demandRatio === b.demandRatio ? 0 : a.demandRatio > b.demandRatio ? -1 : 1);
}
