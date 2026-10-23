import { useCallback, useRef, useState } from 'react';
import type { StructureState } from '../lib/types';

const MAX_HISTORY = 60;

function cloneState(s: StructureState): StructureState {
  return {
    materialId: s.materialId,
    defaultArea: s.defaultArea,
    nodes: s.nodes.map((n) => ({ ...n })),
    beams: s.beams.map((b) => ({ ...b })),
  };
}

function sameSnapshot(a: StructureState, b: StructureState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Undo / redo stack for the truss structure (Ctrl+Z / Ctrl+Y).
 */
export function useHistory(initial: StructureState) {
  const [state, setState] = useState<StructureState>(() => cloneState(initial));
  const past = useRef<StructureState[]>([]);
  const future = useRef<StructureState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = () => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  };

  const commit = useCallback((next: StructureState | ((prev: StructureState) => StructureState)) => {
    setState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      const snap = cloneState(resolved);
      if (sameSnapshot(prev, snap)) return prev;
      past.current = [...past.current.slice(-(MAX_HISTORY - 1)), cloneState(prev)];
      future.current = [];
      queueMicrotask(syncFlags);
      return snap;
    });
  }, []);

  const replace = useCallback((next: StructureState) => {
    // Load preset / import — push previous onto undo stack
    setState((prev) => {
      past.current = [...past.current.slice(-(MAX_HISTORY - 1)), cloneState(prev)];
      future.current = [];
      queueMicrotask(syncFlags);
      return cloneState(next);
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      const last = past.current.pop();
      if (!last) return prev;
      future.current.push(cloneState(prev));
      queueMicrotask(syncFlags);
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      const next = future.current.pop();
      if (!next) return prev;
      past.current.push(cloneState(prev));
      queueMicrotask(syncFlags);
      return next;
    });
  }, []);

  return { state, commit, replace, undo, redo, canUndo, canRedo };
}
