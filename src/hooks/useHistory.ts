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
 * History mutations happen in event callbacks rather than React state updaters,
 * which keeps them safe when Strict Mode replays updater functions.
 */
export function useHistory(initial: StructureState) {
  const [state, setState] = useState<StructureState>(() => cloneState(initial));
  const current = useRef(state);
  const past = useRef<StructureState[]>([]);
  const future = useRef<StructureState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const update = useCallback((next: StructureState) => {
    current.current = next;
    setState(next);
    syncFlags();
  }, [syncFlags]);

  const pushPast = useCallback((snapshot: StructureState) => {
    past.current = [...past.current.slice(-(MAX_HISTORY - 1)), cloneState(snapshot)];
    future.current = [];
  }, []);

  const commit = useCallback((next: StructureState | ((prev: StructureState) => StructureState)) => {
    const prev = current.current;
    const snapshot = cloneState(typeof next === 'function' ? next(prev) : next);
    if (sameSnapshot(prev, snapshot)) return;
    pushPast(prev);
    update(snapshot);
  }, [pushPast, update]);

  const replace = useCallback((next: StructureState) => {
    // Loading a preset or import remains undoable.
    pushPast(current.current);
    update(cloneState(next));
  }, [pushPast, update]);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(cloneState(current.current));
    update(previous);
  }, [update]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(cloneState(current.current));
    update(next);
  }, [update]);

  return { state, commit, replace, undo, redo, canUndo, canRedo };
}
