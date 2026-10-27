import { readStoredValue, writeStoredValue } from './storage';
import type { StructureState } from './types';

const STORAGE_KEY = 'trussiq-project-library';
const NAME_KEY = 'trussiq-project-name';
const MAX_PROJECTS = 24;

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string;
  updatedAt: string;
  state: StructureState;
}

function isProject(value: unknown): value is SavedProject {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SavedProject>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.savedAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    !!item.state &&
    Array.isArray(item.state.nodes) &&
    Array.isArray(item.state.beams)
  );
}

function readAll(): SavedProject[] {
  try {
    const raw = readStoredValue(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isProject).slice(0, MAX_PROJECTS) : [];
  } catch {
    return [];
  }
}

function writeAll(projects: SavedProject[]): boolean {
  return writeStoredValue(STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS)));
}

export function getActiveProjectName(): string {
  return (readStoredValue(NAME_KEY) ?? 'Untitled design').trim() || 'Untitled design';
}

export function setActiveProjectName(name: string): void {
  writeStoredValue(NAME_KEY, name.trim().slice(0, 80) || 'Untitled design');
}

export function listProjects(): SavedProject[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): SavedProject | undefined {
  return readAll().find((p) => p.id === id);
}

/** Save current design under a name. Pass `id` to overwrite an existing project. */
export function saveNamedProject(
  name: string,
  state: StructureState,
  opts?: { id?: string },
): { projects: SavedProject[]; project: SavedProject | null; ok: boolean; error?: string } {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) {
    return { projects: readAll(), project: null, ok: false, error: 'Enter a project name.' };
  }

  const now = new Date().toISOString();
  const existing = opts?.id ? readAll().find((p) => p.id === opts.id) : undefined;
  const project: SavedProject = {
    id: existing?.id ?? crypto.randomUUID(),
    name: trimmed,
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
    state: structuredClone(state),
  };

  let projects = readAll().filter((p) => p.id !== project.id);
  if (!existing && projects.length >= MAX_PROJECTS) {
    return {
      projects: readAll(),
      project,
      ok: false,
      error: `Project library holds up to ${MAX_PROJECTS} designs. Delete one to save another.`,
    };
  }
  projects = [project, ...projects].slice(0, MAX_PROJECTS);
  const ok = writeAll(projects);
  setActiveProjectName(trimmed);
  return {
    projects,
    project,
    ok,
    error: ok
      ? undefined
      : 'Saved for this session, but browser storage is unavailable. Export a .truss backup.',
  };
}

export function duplicateProject(id: string): { projects: SavedProject[]; project: SavedProject | null; ok: boolean; error?: string } {
  const source = getProject(id);
  if (!source) {
    return { projects: readAll(), project: null, ok: false, error: 'That project was not found.' };
  }
  return saveNamedProject(`${source.name} copy`, source.state);
}

export function renameProject(id: string, name: string): { projects: SavedProject[]; ok: boolean; error?: string } {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { projects: readAll(), ok: false, error: 'Enter a project name.' };
  const projects = readAll().map((p) =>
    p.id === id ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p,
  );
  const ok = writeAll(projects);
  return { projects, ok, error: ok ? undefined : 'Could not rename — browser storage unavailable.' };
}

export function deleteProject(id: string): SavedProject[] {
  const projects = readAll().filter((p) => p.id !== id);
  writeAll(projects);
  return projects;
}

export function projectLibraryCapacity(): { used: number; max: number } {
  return { used: readAll().length, max: MAX_PROJECTS };
}
