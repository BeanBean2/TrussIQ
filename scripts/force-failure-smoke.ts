import assert from 'node:assert/strict';
import { nodeLabel, memberLabel } from '../src/lib/entityLabels';
import { explainFailures } from '../src/lib/failureExplanation';
import { solveTruss } from '../src/lib/feaEngine';
import type { Node, Beam } from '../src/lib/types';

assert.equal(nodeLabel('n_0'), 'n0');
assert.equal(nodeLabel('n_mk123_12'), 'n12');
assert.equal(nodeLabel('b_2'), 'n2');
assert.equal(nodeLabel('N7'), 'n7');
assert.equal(nodeLabel('custom-joint'), 'n-custom-joint');
const beam: Beam = { id:'b_9', nodeI:'n_0', nodeJ:'n_1', area:100, materialId:'steel' };
assert.equal(memberLabel(beam.id,[beam]), 'n0–n1');
function model(fx: number, materialId = 'steel') {
 const nodes: Node[] = [
  { id:'n_0', x:0, y:0, support:'pin', fx:0, fy:0 },
  { id:'n_1', x:1000, y:0, support:'rollerY', fx, fy:0 },
 ];
 const beams = [{...beam,materialId}];
 const result = solveTruss(nodes,beams);
 assert.ok(result.success);
 return explainFailures(beams,result);
}
assert.deepEqual(model(100),[]);
const yieldFailure=model(30000);
assert.ok(yieldFailure.some(f=>f.mode==='Permanent yielding' && f.explanation.includes('300.00 MPa') && f.explanation.includes('250.0 MPa')));
assert.equal(yieldFailure[0].member,'n0–n1');
const buckling=model(-2000);
assert.equal(buckling.length,1);
assert.equal(buckling[0].mode,'Compression buckling');
assert.ok(buckling[0].explanation.includes('1570.8 N')); // Hand-calculated solid circular A=100 mm², L=1000 mm, E=200 GPa.
assert.ok(buckling[0].remedy.includes('weak-axis'));
assert.ok(model(5000,'wood').some(f=>f.mode==='Tensile strength exceeded' && f.explanation.includes('split or rupture')));
assert.ok(model(-4000,'wood').some(f=>f.mode==='Compression strength exceeded' && f.explanation.includes('crush')));
assert.ok(model(70000,'cfiber').some(f=>f.explanation.includes('rupture along its fibers')));
const rope=model(-100,'rope');
assert.ok(rope.some(f=>f.invalidModel && f.mode==='Cable goes slack'));
assert.ok(rope[0].remedy.includes('tension-only nonlinear'));
assert.ok(yieldFailure.every(f => ![f.member,f.explanation,f.remedy].join(' ').includes('b_9')));
console.log('Force/failure checks passed: consistent node names, endpoint member names, elastic response, yielding, Euler buckling, timber/composite failure explanations, and invalid rope compression.');
