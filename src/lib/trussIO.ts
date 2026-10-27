import type { StructureDocument, StructureState, SupportType } from './types';
import { MATERIALS } from './materials';
import { computeSectionProps, isValidSectionParams } from './crossSections';
import { readStoredValue, removeStoredValue, writeStoredValue } from './storage';

const FORMAT = 'trussiq.truss' as const;
const DRAFT_KEY = 'trussiq-local-draft';

export type TrussParseCode =
  | 'empty'
  | 'not-json'
  | 'not-object'
  | 'missing-arrays'
  | 'invalid-node'
  | 'invalid-beam'
  | 'zero-length'
  | 'bad-section'
  | 'unknown-material'
  | 'bad-default-area'
  | 'unknown';

export class TrussParseError extends Error {
  readonly code: TrussParseCode;
  readonly hint: string;

  constructor(message: string, code: TrussParseCode, hint: string) {
    super(message);
    this.name = 'TrussParseError';
    this.code = code;
    this.hint = hint;
  }
}

export function formatImportError(err: unknown): string {
  if (err instanceof TrussParseError) {
    return `${err.message} ${err.hint}`.trim();
  }
  if (err instanceof SyntaxError) {
    return 'This file is not valid JSON. It may be corrupted, truncated, or not a TrussIQ export. Try re-exporting a .truss file from TrussIQ.';
  }
  if (err instanceof Error && err.message.trim()) {
    return `Could not import this file: ${err.message}`;
  }
  return 'Could not import this file. Choose a valid TrussIQ .truss or JSON export.';
}

export interface TrussParseSuccess {
  ok: true;
  data: StructureState & { name: string };
}

export interface TrussParseFailure {
  ok: false;
  error: TrussParseError;
}

export function tryParseTrussFile(text: string): TrussParseSuccess | TrussParseFailure {
  try {
    return { ok: true, data: parseTrussFile(text) };
  } catch (err) {
    if (err instanceof TrussParseError) return { ok: false, error: err };
    if (err instanceof SyntaxError) {
      return {
        ok: false,
        error: new TrussParseError(
          'This file is not valid JSON.',
          'not-json',
          'It may be corrupted or truncated. Re-export a .truss file from TrussIQ and try again.',
        ),
      };
    }
    return {
      ok: false,
      error: new TrussParseError(
        err instanceof Error ? err.message : 'Could not import this file.',
        'unknown',
        'Choose a TrussIQ .truss or JSON export and try again.',
      ),
    };
  }
}

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

/** Parse a `.truss` / JSON file into a StructureState. Throws TrussParseError on invalid data. */
export function parseTrussFile(text: string): StructureState & { name: string } {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TrussParseError(
      'This file is empty.',
      'empty',
      'Choose a saved .truss export that contains your design JSON.',
    );
  }

  let raw: Partial<StructureDocument>;
  try {
    raw = JSON.parse(text) as Partial<StructureDocument>;
  } catch {
    throw new TrussParseError(
      'This file is not valid JSON.',
      'not-json',
      'It may be corrupted or truncated. Re-export from TrussIQ and try again.',
    );
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TrussParseError(
      'This file does not look like a TrussIQ design.',
      'not-object',
      'Expected a JSON object with nodes and beams arrays.',
    );
  }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.beams)) {
    throw new TrussParseError(
      'This design is missing joints or members.',
      'missing-arrays',
      'A valid file needs both nodes[] and beams[]. Export again from TrussIQ if you edited the file by hand.',
    );
  }

  const supportTypes: SupportType[] = ['none', 'pin', 'rollerX', 'rollerY', 'fixed'];
  const nodeIds = new Set<string>();
  for (const [index, node] of raw.nodes.entries()) {
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
      throw new TrussParseError(
        `Joint #${index + 1} is incomplete or duplicated.`,
        'invalid-node',
        'Each joint needs a unique id, finite x/y, a support type, and numeric loads (fx, fy).',
      );
    }
    nodeIds.add(node.id);
  }
  const nodeMap = new Map(raw.nodes.map((node) => [node.id, node]));

  const beamIds = new Set<string>();
  for (const [index, beam] of raw.beams.entries()) {
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
      throw new TrussParseError(
        `Member #${index + 1} is incomplete or references missing joints.`,
        'invalid-beam',
        'Each member needs a unique id, two different valid joints, a known material, and a positive area.',
      );
    }
    if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-9) {
      throw new TrussParseError(
        `Member ${beam.id} has zero length.`,
        'zero-length',
        'Move one of its joints apart, then re-export the design.',
      );
    }
    if (beam.section !== undefined) {
      if (!isValidSectionParams(beam.section)) {
        throw new TrussParseError(
          `Member ${beam.id} has invalid cross-section dimensions.`,
          'bad-section',
          'Section parameters must be positive and match a supported shape.',
        );
      }
      const properties = computeSectionProps(beam.section);
      const close = (actual: number, expected: number) =>
        Math.abs(actual - expected) <= Math.max(Math.abs(expected) * 1e-6, 1e-9);
      if (!close(beam.area, properties.area) || (beam.I !== undefined && !close(beam.I, properties.I))) {
        throw new TrussParseError(
          `Member ${beam.id} section dimensions do not match its area or moment of inertia.`,
          'bad-section',
          'Re-export from TrussIQ without hand-editing section numbers, or clear the section field.',
        );
      }
    }
    beamIds.add(beam.id);
  }

  if (
    typeof raw.materialId !== 'undefined' &&
    (typeof raw.materialId !== 'string' || !MATERIALS.some((material) => material.id === raw.materialId))
  ) {
    throw new TrussParseError(
      'The design uses an unknown default material.',
      'unknown-material',
      'Use one of the built-in classroom materials (for example steel or aluminum).',
    );
  }
  if (
    typeof raw.defaultArea !== 'undefined' &&
    (typeof raw.defaultArea !== 'number' || !Number.isFinite(raw.defaultArea) || raw.defaultArea <= 0)
  ) {
    throw new TrussParseError(
      'The default member area must be a positive number.',
      'bad-default-area',
      'Edit defaultArea to a positive finite value (mm²) and try again.',
    );
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

  const parsed = tryParseTrussFile(text);
  if (!parsed.ok) {
    removeStoredValue(DRAFT_KEY);
    return null;
  }
  return {
    nodes: parsed.data.nodes,
    beams: parsed.data.beams,
    materialId: parsed.data.materialId,
    defaultArea: parsed.data.defaultArea,
  };
}

function sanitize(name: string): string {
  return name.replace(/[^\w-]+/g, '_').slice(0, 64) || 'trussiq';
}
