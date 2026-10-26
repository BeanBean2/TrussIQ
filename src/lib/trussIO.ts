import type { StructureDocument, StructureState, SupportType } from './types';
import { MATERIALS } from './materials';
import { computeSectionProps, isValidSectionParams } from './crossSections';
import { readStoredValue, removeStoredValue, writeStoredValue } from './storage';

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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      node.id.trim().length === 0 ||
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
  const nodeMap = new Map(raw.nodes.map((node) => [node.id, node]));

  const beamIds = new Set<string>();
  for (const beam of raw.beams) {
    const start = beam && typeof beam.nodeI === 'string' ? nodeMap.get(beam.nodeI) : undefined;
    const end = beam && typeof beam.nodeJ === 'string' ? nodeMap.get(beam.nodeJ) : undefined;
    if (
      !beam ||
      typeof beam !== 'object' ||
      typeof beam.id !== 'string' ||
      beam.id.trim().length === 0 ||
      beamIds.has(beam.id) ||
      typeof beam.nodeI !== 'string' ||
      typeof beam.nodeJ !== 'string' ||
      beam.nodeI === beam.nodeJ ||
      !start ||
      !end ||
      !Number.isFinite(beam.area) ||
      beam.area <= 0 ||
      typeof beam.materialId !== 'string' ||
      !MATERIALS.some((material) => material.id === beam.materialId) ||
      (beam.I !== undefined && (!Number.isFinite(beam.I) || beam.I <= 0))
    ) {
      throw new Error('Each beam needs a unique id, two valid nodes, material, and positive area.');
    }
    if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-9) {
      throw new Error(`Member ${beam.id} has zero length.`);
    }
    if (beam.section !== undefined) {
      if (!isValidSectionParams(beam.section)) throw new Error(`Member ${beam.id} has invalid cross-section dimensions.`);
      const properties = computeSectionProps(beam.section);
      const close = (actual: number, expected: number) => Math.abs(actual - expected) <= Math.max(Math.abs(expected) * 1e-6, 1e-9);
      if (!close(beam.area, properties.area) || (beam.I !== undefined && !close(beam.I, properties.I))) {
        throw new Error(`Member ${beam.id} section dimensions do not match its area or moment of inertia.`);
      }
    }
    beamIds.add(beam.id);
  }

  if (typeof raw.materialId !== 'undefined' &&
      (typeof raw.materialId !== 'string' || !MATERIALS.some((material) => material.id === raw.materialId))) {
    throw new Error('The design has an unknown default material.');
  }
  if (typeof raw.defaultArea !== 'undefined' &&
      (typeof raw.defaultArea !== 'number' || !Number.isFinite(raw.defaultArea) || raw.defaultArea <= 0)) {
    throw new Error('The default member area must be a positive finite number.');
  }

  return {
    name: typeof raw.name === 'string' ? raw.name : 'Imported Design',
    nodes: raw.nodes as StructureState['nodes'],
    beams: (raw.beams as StructureState['beams']).map((beam) =>
      beam.section && beam.I === undefined
        ? { ...beam, I: computeSectionProps(beam.section).I }
        : beam,
    ),
    materialId: typeof raw.materialId === 'string' ? raw.materialId : 'steel',
    defaultArea: typeof raw.defaultArea === 'number' ? raw.defaultArea : 100,
  };
}

export function saveLocalDraft(state: StructureState): boolean {
  const doc: StructureDocument = {
    version: 1,
    format: FORMAT,
    name: 'Local Draft',
    exportedAt: new Date().toISOString(),
    ...state,
  };
  return writeStoredValue(DRAFT_KEY, JSON.stringify(doc));
}

export function loadLocalDraft(): StructureState | null {
  const text = readStoredValue(DRAFT_KEY);
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
    removeStoredValue(DRAFT_KEY);
    return null;
  }
}

function sanitize(name: string): string {
  return name.replace(/[^\w-]+/g, '_').slice(0, 64) || 'trussiq';
}
