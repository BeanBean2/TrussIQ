import type { Beam, FEAResult, Node } from './types';

export interface EquilibriumResidual {
  maxForceN: number;
  relative: number;
  nodeId: string | null;
}

/** Measure the largest joint imbalance from applied loads, reactions, and member end forces. */
export function calculateEquilibriumResidual(
  nodes: Node[],
  beams: Beam[],
  result: FEAResult,
): EquilibriumResidual {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const beamMap = new Map(beams.map((beam) => [beam.id, beam]));
  const reactionMap = new Map((result.reactions ?? []).map((reaction) => [reaction.nodeId, reaction]));
  const balance = new Map(nodes.map((node) => {
    const reaction = reactionMap.get(node.id);
    return [node.id, {
      fx: node.fx + (reaction?.fx ?? 0),
      fy: node.fy + (reaction?.fy ?? 0),
    }];
  }));

  let peakForce = 0;
  for (const node of nodes) peakForce = Math.max(peakForce, Math.hypot(node.fx, node.fy));
  for (const reaction of result.reactions ?? []) peakForce = Math.max(peakForce, Math.hypot(reaction.fx, reaction.fy));

  for (const member of result.members) {
    const beam = beamMap.get(member.beamId);
    const start = beam && nodeMap.get(beam.nodeI);
    const end = beam && nodeMap.get(beam.nodeJ);
    if (!beam || !start || !end) return { maxForceN: Infinity, relative: Infinity, nodeId: null };

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(member.axialForce)) {
      return { maxForceN: Infinity, relative: Infinity, nodeId: null };
    }
    const fx = member.axialForce * dx / length;
    const fy = member.axialForce * dy / length;
    const atStart = balance.get(start.id)!;
    const atEnd = balance.get(end.id)!;
    atStart.fx += fx;
    atStart.fy += fy;
    atEnd.fx -= fx;
    atEnd.fy -= fy;
    peakForce = Math.max(peakForce, Math.abs(member.axialForce));
  }

  let maxForceN = 0;
  let nodeId: string | null = null;
  for (const [id, force] of balance) {
    const magnitude = Math.hypot(force.fx, force.fy);
    if (!Number.isFinite(magnitude)) return { maxForceN: Infinity, relative: Infinity, nodeId: id };
    if (magnitude > maxForceN) {
      maxForceN = magnitude;
      nodeId = id;
    }
  }

  const relative = peakForce > 0 ? maxForceN / peakForce : maxForceN === 0 ? 0 : Infinity;
  return { maxForceN, relative, nodeId };
}
