import { ClipboardList, Download, Save, X } from 'lucide-react';
import { useState } from 'react';

interface ProjectBriefProps {
  onClose: () => void;
  onExport: (brief: ProjectBriefData) => void;
}

export interface ProjectBriefData {
  title: string;
  author: string;
  course: string;
  objective: string;
  constraints: string;
  audience: string;
  status: 'draft' | 'testing' | 'ready' | 'presented';
  tags: string;
  deadline: string;
  notes: string;
}

const KEY = 'trussiq-project-brief';
const DEFAULT_BRIEF: ProjectBriefData = {
  title: 'Bridge design study',
  author: '',
  course: '',
  objective: 'Design a safe, efficient truss and explain how forces move through it.',
  constraints: 'Keep the structure stable, safe, and efficient.',
  audience: 'Classroom review',
  status: 'draft',
  tags: 'FEA, truss, structural engineering',
  deadline: '',
  notes: '',
};

export function ProjectBrief({ onClose, onExport }: ProjectBriefProps) {
  const [brief, setBrief] = useState<ProjectBriefData>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return saved ? { ...DEFAULT_BRIEF, ...JSON.parse(saved) } : DEFAULT_BRIEF;
    } catch {
      return DEFAULT_BRIEF;
    }
  });
  const update = (patch: Partial<ProjectBriefData>) => setBrief((current) => ({ ...current, ...patch }));
  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(brief));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <section role="dialog" aria-modal="true" aria-label="Project brief" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><ClipboardList size={18} /></div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Project brief</p>
              <h2 className="mt-1 text-lg font-semibold text-surface-100">Make the engineering story clear</h2>
              <p className="mt-1 text-xs text-surface-400">Capture the context behind the model for reviewers and judges.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close project brief" className="rounded-lg p-2 text-surface-400 hover:bg-surface-800"><X size={17} /></button>
        </header>
        <div className="grid min-h-0 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <Field label="Project title" value={brief.title} onChange={(title) => update({ title })} />
          <Field label="Student / team" value={brief.author} onChange={(author) => update({ author })} placeholder="Your name or team" />
          <Field label="Course / program" value={brief.course} onChange={(course) => update({ course })} placeholder="Engineering, physics, STEM…" />
          <Field label="Audience" value={brief.audience} onChange={(audience) => update({ audience })} />
          <Field label="Deadline" value={brief.deadline} onChange={(deadline) => update({ deadline })} type="date" />
          <label className="space-y-1.5 text-xs text-surface-300"><span>Status</span><select value={brief.status} onChange={(event) => update({ status: event.target.value as ProjectBriefData['status'] })} className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100"><option value="draft">Draft</option><option value="testing">Testing</option><option value="ready">Review ready</option><option value="presented">Presented</option></select></label>
          <Field label="Tags" value={brief.tags} onChange={(tags) => update({ tags })} placeholder="Separate tags with commas" />
          <Field label="Design constraints" value={brief.constraints} onChange={(constraints) => update({ constraints })} />
          <label className="space-y-1.5 text-xs text-surface-300 sm:col-span-2"><span>Design objective</span><textarea value={brief.objective} onChange={(event) => update({ objective: event.target.value })} className="min-h-20 w-full resize-y rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100 outline-none focus:border-accent" /></label>
          <label className="space-y-1.5 text-xs text-surface-300 sm:col-span-2"><span>Notes and design decisions</span><textarea value={brief.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="What changed, what worked, and what you learned…" className="min-h-24 w-full resize-y rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100 outline-none focus:border-accent placeholder:text-surface-600" /></label>
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-surface-700 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onExport(brief)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:border-accent/50 hover:text-accent"><Download size={14} /> Export brief</button>
          <button type="button" onClick={save} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300"><Save size={14} /> Save project brief</button>
        </footer>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="space-y-1.5 text-xs text-surface-300"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100 outline-none focus:border-accent placeholder:text-surface-600" /></label>;
}
