import { nodeLabel, memberLabel } from './entityLabels';
import type { Beam } from './types';
import type { AIAnalysis, FEAResult, Node } from './types';

/** Build a transparent, local response from TrussIQ's current solver and rule-based advice. */
export function getLocalCoachReply(
  question: string,
  analysis: AIAnalysis,
  result: FEAResult | null,
  nodes: Node[],
  beams: Beam[] = [],
): string {
  const q = question.toLowerCase();
  if (!result?.success) {
    return 'Run FEA first so I can answer from your current model. I can then summarize member forces, yield utilization, buckling estimates, and deflection.';
  }

  const yielded = result.members.filter((member) => member.yielded);
  const peak = [...result.members].sort((a, b) => b.safetyRatio - a.safetyRatio)[0];
  const safetyFactor = result.maxSafetyRatio > 0 ? 1 / result.maxSafetyRatio : Infinity;

  if (/\b(support reaction|reactions?|supports?)\b/.test(q)) {
    const reactions = result.reactions ?? [];
    const active = reactions
      .map((reaction) => ({ ...reaction, magnitude: Math.hypot(reaction.fx, reaction.fy) }))
      .filter((reaction) => reaction.magnitude > 1e-8)
      .sort((a, b) => b.magnitude - a.magnitude);
    if (!active.length) return 'The solver did not record any nonzero support reactions for this model. Check the supports and applied loads.';
    const netX = reactions.reduce((sum, reaction) => sum + reaction.fx, 0);
    const netY = reactions.reduce((sum, reaction) => sum + reaction.fy, 0);
    const details = active.slice(0, 4).map((reaction) =>
      `${nodeLabel(reaction.nodeId)}: Rx ${reaction.fx.toFixed(1)} N, Ry ${reaction.fy.toFixed(1)} N`,
    ).join('; ');
    return `Support reactions (signs follow the model's x/y axes): ${details}${active.length > 4 ? `; and ${active.length - 4} more support node(s)` : ''}. Net reaction is (${netX.toFixed(2)}, ${netY.toFixed(2)}) N, which balances the net applied load in a solved static model.`;
  }

  if (/\b(applied loads?|external loads?|load distribution|where.*loads?|loads?.*applied)\b/.test(q)) {
    const loaded = nodes
      .filter((node) => node.fx !== 0 || node.fy !== 0)
      .sort((a, b) => Math.hypot(b.fx, b.fy) - Math.hypot(a.fx, a.fy));
    if (!loaded.length) return 'This model has no nonzero nodal loads. Add a force at a joint, then solve again to see its effect.';
    const details = loaded.slice(0, 5).map((node) =>
      `${nodeLabel(node.id)}: Fx ${node.fx.toFixed(1)} N, Fy ${node.fy.toFixed(1)} N`,
    ).join('; ');
    const totalX = nodes.reduce((sum, node) => sum + node.fx, 0);
    const totalY = nodes.reduce((sum, node) => sum + node.fy, 0);
    return `Applied nodal loads: ${details}${loaded.length > 5 ? `; and ${loaded.length - 5} more loaded node(s)` : ''}. Net applied load is (${totalX.toFixed(1)}, ${totalY.toFixed(1)}) N in the model's x/y axes.`;
  }

  if (/\b(tension|compression|member forces?|force path)\b/.test(q) && !/\b(buckl|slender)\b/.test(q)) {
    const tension = result.members.filter((member) => member.status === 'tension');
    const compression = result.members.filter((member) => member.status === 'compression');
    const describe = (label: string, members: typeof result.members) => {
      const ids = members.slice(0, 6).map((member) => `${memberLabel(member.beamId, beams)} (${Math.abs(member.axialForce).toFixed(1)} N)`).join(', ');
      return `${label}: ${members.length ? ids + (members.length > 6 ? `, plus ${members.length - 6} more` : '') : 'none'}`;
    };
    return `${describe('Tension', tension)}. ${describe('Compression', compression)}. Positive axial force means tension; negative means compression. This model carries axial force only and does not model member bending.`;
  }

  if (/\b(buckl|slender)\b/.test(q)) {
    const risks = analysis.items.filter((item) => item.title.toLowerCase().includes('buckling'));
    if (risks.length === 0) return 'No members are currently flagged for buckling by the coach. This is an Euler estimate for idealized pin-ended members; real connections and bracing can change the result.';
    return `${risks.map((item) => item.message).join(' ')} These are screening estimates; check the member assumptions before making a design decision.`;
  }

  if (/\b(deflect|displac|move|bend|deformation)\b/.test(q)) {
    const maxDisplacement = Math.max(0, ...result.displacements.map((item) => Math.hypot(item.ux, item.uy)));
    return `The largest nodal displacement in this analysis is ${maxDisplacement.toExponential(3)} mm. The model uses linear elastic, axial-only truss behavior, so it does not capture bending or large geometric changes.`;
  }

  if (/\b(yield|safe|safety factor|overstress|stress)\b/.test(q)) {
    const peakText = peak
      ? `The highest member utilization is ${memberLabel(peak.beamId, beams)} at ${(peak.safetyRatio * 100).toFixed(1)}%.`
      : 'There are no member results to compare.';
    const factorText = Number.isFinite(safetyFactor) ? `${safetyFactor.toFixed(2)}` : 'infinite (no member stress)';
    return `${peakText} The yield safety factor is ${factorText}. ${yielded.length ? `${yielded.length} member(s) exceed the material yield limit; increase their area, choose a stronger material, or reduce the load, then solve again.` : 'No members exceed the modeled yield limit for this load case.'} This is a linear, axial-only yield check, not a complete safety assessment; buckling is screened separately and connection, bracing, fatigue, and code checks are not included.`;
  }

  if (/\b(improv|optim|next step|recommend|fix|help)\b/.test(q)) {
    const advice = analysis.items.filter((item) => item.severity === 'critical' || item.severity === 'warning' || item.id === 'zero-force');
    if (advice.length) return advice.slice(0, 3).map((item) => `${item.title}: ${item.message}`).join(' ');
    return 'Try one change at a time: adjust member area or material, solve again, and compare peak utilization and deflection. Check the audit panel and test more than one load case before drawing conclusions.';
  }

  if (/\b(fea|finite element|stiffness method)\b/.test(q)) {
    return 'TrussIQ uses the Direct Stiffness Method for a planar, pin-jointed model. Positive axial force means tension; negative axial force means compression. The current analysis assumes linear elastic members that carry axial force only.';
  }

  const loadX = nodes.reduce((sum, node) => sum + node.fx, 0);
  const loadY = nodes.reduce((sum, node) => sum + node.fy, 0);
  const findings = analysis.items.slice(0, 2).map((item) => `${item.title}: ${item.message}`).join(' ');
  return `Your current model has ${nodes.length} nodes and ${result.members.length} analyzed members, with net applied loads of ${loadX.toFixed(1)} N horizontally and ${loadY.toFixed(1)} N vertically. Peak yield utilization is ${(result.maxSafetyRatio * 100).toFixed(1)}%. ${findings ? `Current findings: ${findings} ` : ''}Ask me about support reactions, applied loads, member forces, yield, buckling, or deflection.`;
}
