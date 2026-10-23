import type { StructureDocument, StructureState, SupportType } from './types';

const FORMAT = 'trussiq.truss' as const;
const DRAFT_KEY = 'trussiq-local-draft';

export function serializeTruss(state: StructureState, name = 'TrussIQ Design'): string {
  const doc: StructureDocument = {
    version: 1,
    format: FORMAT,
    name,
    exportedAt: new Date().toISOString(),
    ...state,
  };
  return JSON.stringify(doc, null, 2);
}

/** Serialize structure to a downloadable `.truss` JSON file. */
export function exportTrussFile(state: StructureState, name = 'design'): void {
  const blob = new Blob([serializeTruss(state, name)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(name)}.truss`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse a `.truss` / JSON file into a StructureState. Throws on invalid data. */
export function parseTrussFile(text: string): StructureState & { name: string } {
  const raw = JSON.parse(text) as Partial<StructureDocument>;
  if (!raw || typeof raw !== 'object') throw new Error('Invalid file.');
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.beams)) {
    throw new Error('File must contain nodes[] and beams[].');
  }

  const supportTypes: SupportType[] = ['none', 'pin', 'rollerX', 'rollerY', 'fixed'];
  const nodeIds = new Set<string>();
  for (const node of raw.nodes) {
    if (
      !node ||
      typeof node !== 'object' ||
      typeof node.id !== 'string' ||
      nodeIds.has(node.id) ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      !supportTypes.includes(node.support) ||
      !Number.isFinite(node.fx) ||
      !Number.isFinite(node.fy)
    ) {
      throw new Error('Each node needs a unique id, finite coordinates, support, and loads.');
    }
    nodeIds.add(node.id);
  }

  const beamIds = new Set<string>();
  for (const beam of raw.beams) {
    if (
      !beam ||
      typeof beam !== 'object' ||
      typeof beam.id !== 'string' ||
      beamIds.has(beam.id) ||
      typeof beam.nodeI !== 'string' ||
      typeof beam.nodeJ !== 'string' ||
      beam.nodeI === beam.nodeJ ||
      !nodeIds.has(beam.nodeI) ||
      !nodeIds.has(beam.nodeJ) ||
      !Number.isFinite(beam.area) ||
      beam.area <= 0 ||
      typeof beam.materialId !== 'string' ||
      (beam.I !== undefined && (!Number.isFinite(beam.I) || beam.I <= 0))
    ) {
      throw new Error('Each beam needs a unique id, two valid nodes, material, and positive area.');
    }
    beamIds.add(beam.id);
  }

  return {
    name: typeof raw.name === 'string' ? raw.name : 'Imported Design',
    nodes: raw.nodes as StructureState['nodes'],
    beams: raw.beams as StructureState['beams'],
    materialId: typeof raw.materialId === 'string' ? raw.materialId : 'steel',
    defaultArea: typeof raw.defaultArea === 'number' ? raw.defaultArea : 100,
  };
}

export function saveLocalDraft(state: StructureState): void {
  const doc: StructureDocument = {
    version: 1,
    format: FORMAT,
    name: 'Local Draft',
    exportedAt: new Date().toISOString(),
    ...state,
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
}

export function loadLocalDraft(): StructureState | null {
  const text = localStorage.getItem(DRAFT_KEY);
  if (!text) return null;

  try {
    const parsed = parseTrussFile(text);
    return {
      nodes: parsed.nodes,
      beams: parsed.beams,
      materialId: parsed.materialId,
      defaultArea: parsed.defaultArea,
    };
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

function sanitize(name: string): string {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 64) || 'trussiq';
}
