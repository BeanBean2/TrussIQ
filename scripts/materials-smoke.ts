import assert from 'node:assert/strict';
import { solveTruss } from '../src/lib/feaEngine';
import { MATERIALS } from '../src/lib/materials';
import { comparisonBeams, materialChecks, materialSnapshot, materialStrength, scaleSection, sectionForMaterial, withSection, percentChange } from '../src/lib/materialLab';
import { computeSectionProps, isValidSectionParams } from '../src/lib/crossSections';
import { serializeTruss, tryParseTrussFile } from '../src/lib/trussIO';
import type { Node, Beam } from '../src/lib/types';
const near = (a: number, b: number, tol = 1e-7) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const nodes: Node[] = [
 { id: 'a', x: 0, y: 0, fx: 0, fy: 0, support: 'pin' },
 { id: 'b', x: 1000, y: 0, fx: 0, fy: 0, support: 'rollerY' },
 { id: 'c', x: 500, y: -500, fx: 0, fy: 100, support: 'none' },
];
const beams: Beam[] = [['a','b'], ['a','c'], ['b','c']].map(([nodeI,nodeJ], i) => ({ id: `m${i}`, nodeI, nodeJ, materialId: 'steel', area: 100 }));
const steel = solveTruss(nodes, beams);
assert.ok(steel.success);
const aluminumBeams = comparisonBeams(nodes, beams, 'al6061', 'dimensions');
const aluminum = solveTruss(nodes, aluminumBeams);
assert.ok(aluminum.success);
steel.members.forEach((m,i) => near(aluminum.members[i].axialForce, m.axialForce));
near(aluminum.displacements[2].uy / steel.displacements[2].uy, 200 / 68.9);
const baseline = materialSnapshot(nodes, beams, steel);
for (const mat of MATERIALS) {
 for (const basis of ['mass', 'budget'] as const) {
  const candidate = comparisonBeams(nodes, beams, mat.id, basis);
  const snapshot = materialSnapshot(nodes, candidate, solveTruss(nodes, candidate));
  if (basis === 'mass') near(snapshot.mass, baseline.mass); else near(snapshot.cost, baseline.cost);
 }
 const preset = sectionForMaterial(mat.id);
 assert.ok(isValidSectionParams(preset));
 const p = computeSectionProps(preset), scaled = computeSectionProps(scaleSection(preset, 4));
 near(scaled.area, p.area * 4); near(scaled.I, p.I * 16);
}
const woodBeam = withSection({ ...beams[0], materialId: 'wood' }, sectionForMaterial('wood'));
const rectangular = computeSectionProps({ kind: 'rectangle', width: 10, height: 20 });
near(rectangular.area, 200); near(rectangular.I, 20 * 10 ** 3 / 12);
assert.ok(!isValidSectionParams({ kind: 'rectangle', width: -1, height: 20 }));
assert.equal(materialStrength('cfiber', 1), 600);
assert.equal(materialStrength('cfiber', -1), 300);
assert.equal(materialStrength('wood', -1), 30);
const ropeBeams = beams.map(b => ({ ...b, materialId: 'rope' }));
const rope = solveTruss(nodes, ropeBeams);
assert.ok(rope.success);
assert.ok(!rope.passed);
assert.ok(materialChecks(ropeBeams, rope).some(c => c.mode.includes('Cable in compression')));
const longThin = materialChecks(beams, steel);
assert.ok(longThin.some(c => c.bucklingRatio > 0));
const weak: Beam = withSection(beams[1], {kind:'iBeam',height:40,flangeWidth:20,flangeThickness:3,webThickness:2});
const actual = steel.members.find(m => m.beamId === weak.id)!;
const fake = { ...steel, members: [{...actual, axialForce:-100000, stress:-100000/weak.area}] };
assert.ok(materialChecks([weak],fake)[0].bucklingRatio > 0);
const document = { nodes, beams: [woodBeam, ...beams.slice(1)], materialId: 'steel', defaultArea: 100 };
const parsed = tryParseTrussFile(serializeTruss(document));
assert.ok(parsed.ok);
if(parsed.ok) assert.equal(parsed.data.beams[0].section?.kind,'rectangle');
assert.equal(percentChange(0,0), 'Unchanged');
assert.equal(percentChange(null,1), 'Unavailable');
assert.equal(percentChange(100,50), '-50.0%');
console.log('Material smoke checks passed: force invariance, stiffness, equal mass/budget, presets, weak-axis buckling, cable limits, timber/composite limits, and project round-trip.');
