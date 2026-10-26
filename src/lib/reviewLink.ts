import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';
import { parseTrussFile, serializeTruss } from './trussIO';
import type { StructureState } from './types';

export type ReviewLinkReadResult =
  | { state: StructureState; error: null }
  | { state: null; error: string }
  | null;

const MAX_MODEL_JSON_BYTES = 4 * 1024 * 1024;
const MAX_COMPRESSED_BASE64_CHARS = 1_500_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(payload: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(payload)) throw new Error('Invalid share data.');
  const padded = payload.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - payload.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Build a compressed, backend-free model link that works on the configured site path. */
export function createReviewLink(state: StructureState, location: Pick<Location, 'origin' | 'pathname'>): string {
  const json = serializeTruss(state);
  const jsonBytes = strToU8(json);
  if (jsonBytes.length > MAX_MODEL_JSON_BYTES) throw new Error('This model is too large to share as a link. Export it as a .truss file instead.');
  const payload = toBase64Url(compressSync(jsonBytes));
  if (payload.length > MAX_COMPRESSED_BASE64_CHARS) throw new Error('This model creates a share link that is too long. Export it as a .truss file instead.');
  return `${location.origin}${location.pathname}#model=${payload}`;
}

function stateFromJson(json: string): StructureState {
  const parsed = parseTrussFile(json);
  return {
    nodes: parsed.nodes,
    beams: parsed.beams,
    materialId: parsed.materialId,
    defaultArea: parsed.defaultArea,
  };
}

/** Decode a compressed #model link, and retain compatibility with legacy #review links. */
export function readReviewLink(hash: string): ReviewLinkReadResult {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const model = params.get('model');
  const legacyReview = params.get('review');
  if (model === null && legacyReview === null) return null;

  try {
    if (model !== null) {
      if (!model || model.length > MAX_COMPRESSED_BASE64_CHARS) throw new Error('Share link is too large.');
      const jsonBytes = decompressSync(fromBase64Url(model), { out: new Uint8Array(MAX_MODEL_JSON_BYTES) });
      if (jsonBytes.length >= MAX_MODEL_JSON_BYTES) throw new Error('Shared model is too large.');
      return { state: stateFromJson(strFromU8(jsonBytes)), error: null };
    }

    if (!legacyReview || legacyReview.length > MAX_COMPRESSED_BASE64_CHARS) throw new Error('Share link is invalid.');
    return { state: stateFromJson(decodeURIComponent(atob(legacyReview))), error: null };
  } catch {
    return { state: null, error: 'This design link is invalid, too large, or has been corrupted.' };
  }
}
