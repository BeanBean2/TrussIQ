/**
 * Incremental load testing + progressive (plastic) collapse.
 *
 * Scale user-applied loads from 0% → maxPct in steps. After each solve,
 * members that yield are removed (plastic hinge / snapped bar) and the
 * reduced topology is re-solved until collapse (unstable) or load max.
 */

import { solveTruss } from './feaEngine';
import type { Beam, CollapseFrame, FEAResult, Node } from './types';

export interface CollapseOptions {
  /** Number of load increments (default 10) */
  steps?: number;
  /** Final load multiplier as percent (default 150) */
  maxPct?: number;
}

/**
 * Run a full progressive-collapse sequence (synchronous, fast enough for classroom models).
 */
export function runCollapseSequence(
  nodes: Node[],
  beams: Beam[],
  opts: CollapseOptions = {},
): CollapseFrame[] {
  const steps = opts.steps ?? 10;
  const maxPct = opts.maxPct ?? 150;
  const frames: CollapseFrame[] = [];
  let active = beams.map((b) => ({ ...b }));
  const failed = new Set<string>();

  for (let s = 1; s <= steps; s++) {
    const loadPct = (maxPct * s) / steps;
    const scale = loadPct / 100;
    const scaledNodes = nodes.map((n) => ({
      ...n,
      fx: n.fx * scale,
      fy: n.fy * scale,
    }));

    // Iterate redistributions within this load level until no new yields or unstable
    let guard = 0;
    let result: FEAResult;
    let newlyFailed: string[] = [];

    do {
      newlyFailed = [];
      result = solveTruss(scaledNodes, active);
      if (!result.success) break;

      for (const m of result.members) {
        if (m.yielded && !failed.has(m.beamId)) {
          newlyFailed.push(m.beamId);
          failed.add(m.beamId);
        }
      }
      if (newlyFailed.length > 0) {
        active = active.filter((b) => !failed.has(b.id));
      }
      guard++;
    } while (newlyFailed.length > 0 && active.length > 0 && guard < 40);

    const collapsed =
      !result.success ||
      result.unstable ||
      active.length === 0 ||
      (result.success && result.members.length === 0);

    frames.push({
      loadPct,
      result,
      failedBeamIds: [...failed],
      activeBeamIds: active.map((b) => b.id),
      collapsed,
    });

    if (collapsed) break;
  }

  return frames;
}
