import type { Beam, Node } from './types';

export type AuditSeverity = 'error' | 'warning' | 'info';

export interface AuditIssue {
  id: string;
  severity: AuditSeverity;
  title: string;
  message: string;
  nodeIds?: string[];
  beamIds?: string[];
}

export interface StructureAudit {
  issues: AuditIssue[];
  errors: number;
  warnings: number;
  ready: boolean;
}

export function auditStructure(nodes: Node[], beams: Beam[]): StructureAudit {
  const issues: AuditIssue[] = [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const connected = new Set<string>();
  const pairs = new Map<string, string>();
  const restrainedDOFs = nodes.reduce((count, node) => {
    if (node.support === 'pin' || node.support === 'fixed') return count + 2;
    if (node.support === 'rollerX' || node.support === 'rollerY') return count + 1;
    return count;
  }, 0);

  if (nodes.length === 0) {
    issues.push({ id: 'empty-nodes', severity: 'error', title: 'No nodes yet', message: 'Place at least two nodes to begin a truss.' });
  }
  if (beams.length === 0) {
    issues.push({ id: 'empty-beams', severity: 'error', title: 'No members yet', message: 'Connect nodes with at least one member before running FEA.' });
  }

  const invalidBeams: string[] = [];
  const duplicateBeams: string[] = [];
  for (const beam of beams) {
    const start = nodeMap.get(beam.nodeI);
    const end = nodeMap.get(beam.nodeJ);
    if (!start || !end) {
      invalidBeams.push(beam.id);
      continue;
    }
    connected.add(start.id);
    connected.add(end.id);
    const pair = [beam.nodeI, beam.nodeJ].sort().join('|');
    if (pairs.has(pair)) duplicateBeams.push(beam.id);
    pairs.set(pair, beam.id);

    if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-9) {
      issues.push({ id: `zero-length-${beam.id}`, severity: 'error', title: 'Zero-length member', message: `${beam.id} connects coincident nodes and cannot contribute stiffness.`, beamIds: [beam.id] });
    }
    if (!Number.isFinite(beam.area) || beam.area <= 0) {
      issues.push({ id: `invalid-area-${beam.id}`, severity: 'error', title: 'Invalid cross-section', message: `${beam.id} needs a positive finite cross-sectional area.`, beamIds: [beam.id] });
    }
  }

  if (invalidBeams.length > 0) {
    issues.push({ id: 'dangling-members', severity: 'error', title: 'Dangling member references', message: `${invalidBeams.length} member(s) reference nodes that are not in the model.`, beamIds: invalidBeams });
  }
  if (duplicateBeams.length > 0) {
    issues.push({ id: 'duplicate-members', severity: 'warning', title: 'Duplicate members', message: `${duplicateBeams.length} member(s) overlap an existing node pair.`, beamIds: duplicateBeams });
  }

  const unconnected = nodes.filter((node) => !connected.has(node.id)).map((node) => node.id);
  if (unconnected.length > 0) {
    issues.push({ id: 'unconnected-nodes', severity: 'warning', title: 'Unconnected nodes', message: `${unconnected.length} node(s) are not attached to any member.`, nodeIds: unconnected });
  }
  if (restrainedDOFs === 0 && nodes.length > 0) {
    issues.push({ id: 'no-supports', severity: 'error', title: 'No supports defined', message: 'Add a pin, roller, or fixed support to restrain rigid-body motion.' });
  } else if (restrainedDOFs < 3 && nodes.length > 0) {
    issues.push({ id: 'few-supports', severity: 'warning', title: 'Check boundary conditions', message: 'A plane truss usually needs at least three restrained degrees of freedom.' });
  }
  if (nodes.length > 0 && !nodes.some((node) => node.fx !== 0 || node.fy !== 0)) {
    issues.push({ id: 'no-loads', severity: 'info', title: 'No applied loads', message: 'Add a force to inspect meaningful member forces and stresses.' });
  }

  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  return { issues, errors, warnings, ready: errors === 0 && nodes.length > 0 && beams.length > 0 };
}