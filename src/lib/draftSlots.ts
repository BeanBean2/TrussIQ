import { readStoredValue, writeStoredValue } from './storage';
import type { StructureState } from './types';

const SLOTS_KEY = 'trussiq-draft-slots';
const MAX_SLOTS = 8;

export interface DraftSlot {
  id: string;
  label: string;
  savedAt: string;
  state: StructureState;
}

function readSlots(): DraftSlot[] {
  try {
    const raw = readStoredValue(SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftSlot[];
    return Array.isArray(parsed) ? parsed.filter((s) => s && s.id && s.state) : [];
  } catch {
    return [];
  }
}

function writeSlots(slots: DraftSlot[]): boolean {
  return writeStoredValue(SLOTS_KEY, JSON.stringify(slots.slice(0, MAX_SLOTS)));
}

export function listDraftSlots(): DraftSlot[] {
  return readSlots();
}

export function saveDraftSlot(label: string, state: StructureState): DraftSlot[] {
  const trimmed = label.trim() || `Period ${new Date().toLocaleTimeString()}`;
  const next: DraftSlot = {
    id: crypto.randomUUID(),
    label: trimmed.slice(0, 48),
    savedAt: new Date().toISOString(),
    state: structuredClone(state),
  };
  const slots = [next, ...readSlots().filter((s) => s.label !== next.label)].slice(0, MAX_SLOTS);
  writeSlots(slots);
  return slots;
}

export function deleteDraftSlot(id: string): DraftSlot[] {
  const slots = readSlots().filter((s) => s.id !== id);
  writeSlots(slots);
  return slots;
}

export function getDraftSlot(id: string): DraftSlot | undefined {
  return readSlots().find((s) => s.id === id);
}
