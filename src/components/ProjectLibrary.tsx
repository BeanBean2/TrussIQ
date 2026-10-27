import { Copy, FolderOpen, Pencil, Save, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import {
  deleteProject,
  duplicateProject,
  getActiveProjectName,
  listProjects,
  projectLibraryCapacity,
  renameProject,
  saveNamedProject,
  setActiveProjectName,
  type SavedProject,
} from '../lib/projectLibrary';
import { getPrivacyPrefs } from '../lib/privacy';
import { exportTrussFile } from '../lib/trussIO';
import type { StructureState } from '../lib/types';

interface ProjectLibraryProps {
  state: StructureState;
  onLoad: (state: StructureState, projectName: string) => void;
  onClose: () => void;
  onNameChange?: (name: string) => void;
}

export function ProjectLibrary({ state, onLoad, onClose, onNameChange }: ProjectLibraryProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const titleId = useId();
  const descId = useId();
  const [projects, setProjects] = useState(listProjects);
  const [name, setName] = useState(getActiveProjectName);
  const [message, setMessage] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const capacity = projectLibraryCapacity();

  const refresh = (next: SavedProject[], status?: string) => {
    setProjects(next);
    if (status) setMessage(status);
  };

  const saveCurrent = (overwriteId?: string) => {
    if (getPrivacyPrefs().privateSession) {
      setMessage('Private session is on — browser project saves are disabled. Export a .truss file instead.');
      return;
    }
    const result = saveNamedProject(name, state, overwriteId ? { id: overwriteId } : undefined);
    if (!result.ok) {
      setMessage(result.error ?? 'Could not save.');
      return;
    }
    onNameChange?.(result.project!.name);
    refresh(
      result.projects,
      result.error ?? `Saved “${result.project!.name}” in this browser.`,
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[5vh] backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-surface-700 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <FolderOpen size={16} aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Project library</span>
            </div>
            <h2 id={titleId} className="mt-1 text-xl font-semibold text-surface-100">
              Name, save, reopen, duplicate
            </h2>
            <p id={descId} className="mt-1 text-xs leading-5 text-surface-400">
              Keep classroom designs in this browser, export a .truss backup anytime, or duplicate a project to branch an idea.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project library"
            className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-surface-700 p-5">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveCurrent();
            }}
          >
            <label className="min-w-[12rem] flex-1 text-[10px] text-surface-400">
              Project name
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setActiveProjectName(event.target.value);
                  onNameChange?.(event.target.value);
                }}
                maxLength={80}
                aria-label="Project name"
                className="mt-1 w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Save size={13} aria-hidden="true" /> Save to library
              </button>
              <button
                type="button"
                onClick={() => {
                  exportTrussFile(state, name || 'TrussIQ Design');
                  setMessage(`Exported “${name || 'TrussIQ Design'}.truss”.`);
                }}
                className="rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Export .truss
              </button>
            </div>
          </form>
          <p className="mt-2 min-h-4 text-[10px] text-surface-400" role="status" aria-live="polite">
            {message ||
              `${state.nodes.length} joints · ${state.beams.length} members · ${capacity.used}/${capacity.max} saved projects`}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5" role="list" aria-label="Saved projects">
          {projects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-700 p-6 text-center text-xs text-surface-400">
              No named projects yet. Save the current design to reopen it later on this device.
            </p>
          ) : (
            projects.map((project) => (
              <article
                key={project.id}
                role="listitem"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-700 bg-surface-800/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  {renamingId === project.id ? (
                    <form
                      className="flex flex-wrap gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const result = renameProject(project.id, renameValue);
                        setRenamingId(null);
                        refresh(result.projects, result.error ?? `Renamed to “${renameValue.trim()}”.`);
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        aria-label={`Rename ${project.name}`}
                        className="min-w-40 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-2 py-1.5 text-xs text-surface-100 outline-none focus:border-accent"
                        autoFocus
                      />
                      <button type="submit" className="rounded-lg bg-accent px-2 py-1.5 text-[10px] font-semibold text-surface-950">
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="rounded-lg border border-surface-700 px-2 py-1.5 text-[10px] text-surface-400"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <h3 className="truncate text-sm font-medium text-surface-100">{project.name}</h3>
                      <p className="mt-1 text-[10px] text-surface-400">
                        {project.state.nodes.length} joints · {project.state.beams.length} members · updated{' '}
                        {new Date(project.updatedAt).toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    title={`Overwrite “${project.name}” with the canvas`}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Overwrite “${project.name}” with the current canvas design?`,
                        )
                      ) {
                        return;
                      }
                      setName(project.name);
                      saveCurrent(project.id);
                    }}
                    className="rounded-lg border border-surface-700 px-2 py-1.5 text-[10px] text-surface-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    title={`Rename ${project.name}`}
                    aria-label={`Rename ${project.name}`}
                    onClick={() => {
                      setRenamingId(project.id);
                      setRenameValue(project.name);
                    }}
                    className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    title={`Duplicate ${project.name}`}
                    aria-label={`Duplicate ${project.name}`}
                    onClick={() => {
                      const result = duplicateProject(project.id);
                      refresh(
                        result.projects,
                        result.error ?? (result.project ? `Duplicated as “${result.project.name}”.` : 'Duplicate failed.'),
                      );
                    }}
                    className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Copy size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        (state.nodes.length > 0 || state.beams.length > 0) &&
                        !window.confirm(
                          `Open “${project.name}”? The current canvas will be replaced. Save first if you need it.`,
                        )
                      ) {
                        return;
                      }
                      onLoad(structuredClone(project.state), project.name);
                      onClose();
                    }}
                    className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => {
                      if (!window.confirm(`Delete “${project.name}” from this browser?`)) return;
                      refresh(deleteProject(project.id), `Deleted “${project.name}”.`);
                    }}
                    className="rounded-lg border border-surface-700 p-2 text-surface-400 hover:border-fail/40 hover:text-fail focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fail"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <footer className="border-t border-surface-700 px-5 py-3 text-[10px] leading-4 text-surface-500">
          Stored in this browser only · templates remain under Presets · export .truss for hand-in or another device
        </footer>
      </section>
    </div>
  );
}
