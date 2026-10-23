import type { StructureDocument, StructureState } from './types';

const FORMAT = 'trussiq.truss' as const;

/** Serialize structure to a downloadable `.truss` JSON file. */
export function exportTrussFile(state: StructureState, name = 'design'): void {
  const doc: StructureDocument = {
    version: 1,
    format: FORMAT,
    name,
    exportedAt: new Date().toISOString(),
    ...state,
  };
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
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
  return {
    name: typeof raw.name === 'string' ? raw.name : 'Imported Design',
    nodes: raw.nodes,
    beams: raw.beams,
    materialId: typeof raw.materialId === 'string' ? raw.materialId : 'steel',
    defaultArea: typeof raw.defaultArea === 'number' ? raw.defaultArea : 100,
  };
}

function sanitize(name: string): string {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 64) || 'trussiq';
}
