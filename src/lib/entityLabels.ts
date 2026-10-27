import type { Beam } from './types';
/** Keep storage IDs untouched; use one joint naming convention everywhere. */
export function nodeLabel(id: string): string {
  const generated = /^(?:n|b|j)_(?:[a-z0-9]+_)?(\d+)$/i.exec(id);
  if (generated) return `n${generated[1]}`;
  const numbered = /^(?:n|b|j)?(\d+)$/i.exec(id);
  if (numbered) return `n${numbered[1]}`;
  return `n-${id}`;
}
/** Members are described by the same joint names printed on the canvas. */
export function memberLabel(id: string, beams: Beam[]): string {
  const beam = beams.find(b => b.id === id);
  return beam ? `${nodeLabel(beam.nodeI)}–${nodeLabel(beam.nodeJ)}` : 'Unknown member';
}
