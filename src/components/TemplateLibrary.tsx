import { BookmarkPlus, Copy, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import type { StructureState } from '../lib/types';
import { readStoredValue, writeStoredValue } from '../lib/storage';

interface SavedTemplate {
  id: string;
  name: string;
  savedAt: string;
  state: StructureState;
}

const STORAGE_KEY = 'trussiq-design-templates';
const MAX_TEMPLATES = 30;

function readTemplates(): SavedTemplate[] {
  try {
    const parsed: unknown = JSON.parse(readStoredValue(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isTemplate).slice(0, MAX_TEMPLATES) : [];
  } catch {
    return [];
  }
}

function isTemplate(value: unknown): value is SavedTemplate {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SavedTemplate>;
  return typeof item.id === 'string' && typeof item.name === 'string' &&
    typeof item.savedAt === 'string' && !!item.state &&
    Array.isArray(item.state.nodes) && Array.isArray(item.state.beams);
}

export function TemplateLibrary({ state, onLoad, onClose }: {
  state: StructureState;
  onLoad: (state: StructureState) => void;
  onClose: () => void;
}) {
  const dialogRef = useAccessibleDialog(onClose);
  const [templates, setTemplates] = useState(readTemplates);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const persist = (next: SavedTemplate[]) => {
    setTemplates(next);
    return writeStoredValue(STORAGE_KEY, JSON.stringify(next));
  };

  const save = (copyExisting?: SavedTemplate) => {
    const templateName = (copyExisting ? `${copyExisting.name} copy` : name).trim();
    if (!templateName) {
      setMessage('Enter a name for this template.');
      return;
    }
    if (templates.length >= MAX_TEMPLATES) {
      setMessage(`The library holds up to ${MAX_TEMPLATES} templates. Delete one to add another.`);
      return;
    }
    const snapshot = copyExisting?.state ?? state;
    const stored = persist([{ id: crypto.randomUUID(), name: templateName, savedAt: new Date().toISOString(), state: structuredClone(snapshot) }, ...templates]);
    setName('');
    setMessage(stored ? `Saved “${templateName}”.` : `Added “${templateName}” for this session, but browser storage is unavailable. Export your design to keep a copy.`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/65 p-4 pt-[8vh] backdrop-blur-sm">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Design template library" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div><div className="flex items-center gap-2 text-accent"><BookmarkPlus size={17} /><span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Reusable designs</span></div><h2 className="mt-1 text-xl font-semibold text-surface-100">Template library</h2><p className="mt-1 text-xs text-surface-400">Save a model locally, reuse it in another investigation, or make a copy to branch an idea.</p></div>
          <button type="button" onClick={onClose} aria-label="Close template library" className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"><X size={16} /></button>
        </header>
        <div className="border-b border-surface-700 p-5">
          <form onSubmit={(event) => { event.preventDefault(); save(); }} className="flex flex-wrap gap-2">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Name this design template" aria-label="Template name" className="min-w-48 flex-1 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100 outline-none focus:border-accent" />
            <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300">Save current design</button>
          </form>
          <p className="mt-2 min-h-4 text-[10px] text-surface-400" aria-live="polite">{message || `${state.nodes.length} nodes · ${state.beams.length} members in the current design`}</p>
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto p-5">
          {templates.length === 0 ? <p className="rounded-xl border border-dashed border-surface-700 p-6 text-center text-xs text-surface-400">No saved templates yet. Save the current model to start a library.</p> : templates.map((template) => (
            <article key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-700 bg-surface-800/50 p-3">
              <div className="min-w-0"><h3 className="truncate text-sm font-medium text-surface-100">{template.name}</h3><p className="mt-1 text-[10px] text-surface-400">{template.state.nodes.length} nodes · {template.state.beams.length} members · saved {new Date(template.savedAt).toLocaleDateString()}</p></div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => save(template)} title={`Duplicate ${template.name}`} className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:text-accent"><Copy size={14} /></button>
                <button type="button" onClick={() => { onLoad(structuredClone(template.state)); onClose(); }} className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20">Load</button>
                <button type="button" onClick={() => persist(templates.filter((item) => item.id !== template.id))} aria-label={`Delete ${template.name}`} className="rounded-lg border border-surface-700 p-2 text-surface-400 hover:border-fail/40 hover:text-fail"><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
        <footer className="border-t border-surface-700 px-5 py-3 text-[10px] text-surface-500">Stored in this browser only · {templates.length}/{MAX_TEMPLATES} templates</footer>
      </section>
    </div>
  );
}
