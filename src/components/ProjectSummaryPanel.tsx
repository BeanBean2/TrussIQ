import { Download, FileJson, Shield, Sparkles, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { getActiveProjectName } from '../lib/projectLibrary';
import {
  buildProjectSummary,
  downloadProjectSummaryHtml,
  downloadProjectSummaryJson,
  SUMMARY_DISCLAIMER,
  type PersonalShareFields,
} from '../lib/projectSummary';
import { readStoredValue } from '../lib/storage';
import type { FEAResult, StructureState } from '../lib/types';

interface ProjectSummaryPanelProps {
  state: StructureState;
  result: FEAResult | null;
  canvasImage: string | null;
  onClose: () => void;
}

function readBriefPersonal(): PersonalShareFields {
  try {
    const raw = readStoredValue('trussiq-project-brief');
    if (!raw) return {};
    const brief = JSON.parse(raw) as { author?: string; course?: string };
    return {
      author: typeof brief.author === 'string' ? brief.author : '',
      course: typeof brief.course === 'string' ? brief.course : '',
    };
  } catch {
    return {};
  }
}

export function ProjectSummaryPanel({
  state,
  result,
  canvasImage,
  onClose,
}: ProjectSummaryPanelProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const titleId = useId();
  const descId = useId();
  const consentId = useId();
  const reflectionId = useId();
  const savedPersonal = useMemo(() => readBriefPersonal(), []);
  const [title, setTitle] = useState(() => getActiveProjectName());
  const [reflection, setReflection] = useState('');
  const [includePersonal, setIncludePersonal] = useState(false);
  const [author, setAuthor] = useState(savedPersonal.author ?? '');
  const [course, setCourse] = useState(savedPersonal.course ?? '');
  const [status, setStatus] = useState('');

  const preview = useMemo(
    () =>
      buildProjectSummary({
        title,
        state,
        result,
        reflection,
        canvasImage,
        includePersonalFields: includePersonal,
        personal: { author, course },
      }),
    [title, state, result, reflection, canvasImage, includePersonal, author, course],
  );

  const exportWith = (kind: 'json' | 'html') => {
    const doc = buildProjectSummary({
      title,
      state,
      result,
      reflection,
      canvasImage,
      includePersonalFields: includePersonal,
      personal: { author, course },
    });
    if (kind === 'json') downloadProjectSummaryJson(doc);
    else downloadProjectSummaryHtml(doc);
    setStatus(
      includePersonal
        ? `Exported ${kind.toUpperCase()} with personal fields included (your choice).`
        : `Exported ${kind.toUpperCase()} without personal fields (privacy default).`,
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[4vh] backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-surface-700 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Sparkles size={16} aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Shareable summary</span>
            </div>
            <h2 id={titleId} className="mt-1 text-xl font-semibold text-surface-100">
              Model · FEA · score · reflection
            </h2>
            <p id={descId} className="mt-1 max-w-xl text-xs leading-5 text-surface-400">
              Build a clean hand-in package. Personal name and course stay out of exports unless you opt in below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project summary"
            className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div role="note" className="border-b border-warn/30 bg-warn/10 px-5 py-2.5 text-[11px] leading-5 text-warn">
          <strong className="font-semibold">Educational estimate only.</strong> {SUMMARY_DISCLAIMER}
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 border-b border-surface-700 p-5 md:border-b-0 md:border-r">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-surface-500">
              Summary title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                className="mt-1.5 w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>

            <label htmlFor={reflectionId} className="block text-[10px] font-semibold uppercase tracking-wide text-surface-500">
              Student reflection
              <textarea
                id={reflectionId}
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                maxLength={4000}
                rows={5}
                placeholder="What load path did you expect? What surprised you in the FEA results? What would you change next?"
                className="mt-1.5 w-full resize-y rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs leading-5 text-surface-100 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent placeholder:text-surface-600"
              />
            </label>

            <fieldset className="rounded-xl border border-surface-700 bg-surface-800/40 p-3">
              <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-surface-500">
                <Shield size={12} aria-hidden="true" /> Privacy
              </legend>
              <label htmlFor={consentId} className="mt-1 flex items-start gap-2 text-[11px] leading-5 text-surface-300">
                <input
                  id={consentId}
                  type="checkbox"
                  checked={includePersonal}
                  onChange={(event) => setIncludePersonal(event.target.checked)}
                  className="mt-1 accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                <span>
                  Include optional personal fields (student/team name and course) in this shared export.
                  <span className="mt-1 block text-surface-500">
                    Off by default. Leave unchecked for anonymous classroom sharing.
                  </span>
                </span>
              </label>
              {includePersonal && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-[10px] text-surface-400">
                    Student / team
                    <input
                      value={author}
                      onChange={(event) => setAuthor(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-xs text-surface-100 outline-none focus:border-accent"
                    />
                  </label>
                  <label className="text-[10px] text-surface-400">
                    Course
                    <input
                      value={course}
                      onChange={(event) => setCourse(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-xs text-surface-100 outline-none focus:border-accent"
                    />
                  </label>
                </div>
              )}
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportWith('html')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Download size={13} aria-hidden="true" /> Export HTML summary
              </button>
              <button
                type="button"
                onClick={() => exportWith('json')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <FileJson size={13} aria-hidden="true" /> Export JSON
              </button>
            </div>
            <p className="min-h-4 text-[10px] text-surface-400" role="status" aria-live="polite">
              {status}
            </p>
          </div>

          <aside className="space-y-3 bg-surface-800/25 p-5" aria-label="Summary preview">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-surface-500">Live preview</h3>
            {canvasImage ? (
              <img
                src={canvasImage}
                alt="Current structural model visualization"
                className="max-h-40 w-full rounded-xl border border-surface-700 object-contain bg-surface-950"
              />
            ) : (
              <p className="rounded-xl border border-dashed border-surface-700 p-4 text-[11px] text-surface-500">
                No canvas snapshot yet — open the workspace canvas so the summary can include a model image.
              </p>
            )}
            <dl className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-surface-700 bg-surface-900/60 p-2.5">
                <dt className="text-surface-500">Design score</dt>
                <dd className="mt-1 font-mono text-sm text-accent">{preview.designScore.score.toFixed(0)} / 100</dd>
              </div>
              <div className="rounded-lg border border-surface-700 bg-surface-900/60 p-2.5">
                <dt className="text-surface-500">FEA</dt>
                <dd className="mt-1 font-medium text-surface-100">
                  {preview.analysis.success ? 'Solved' : 'Not solved'}
                </dd>
              </div>
              <div className="rounded-lg border border-surface-700 bg-surface-900/60 p-2.5">
                <dt className="text-surface-500">Peak utilization</dt>
                <dd className="mt-1 font-mono text-surface-100">
                  {preview.analysis.peakUtilizationPct == null
                    ? '—'
                    : `${preview.analysis.peakUtilizationPct.toFixed(1)}%`}
                </dd>
              </div>
              <div className="rounded-lg border border-surface-700 bg-surface-900/60 p-2.5">
                <dt className="text-surface-500">Mass</dt>
                <dd className="mt-1 font-mono text-surface-100">{preview.model.massKg.toFixed(3)} kg</dd>
              </div>
            </dl>
            <p className="text-[10px] leading-4 text-surface-500">{preview.designScore.explanation}</p>
            <p className="text-[10px] leading-4 text-surface-500">
              Privacy: {preview.privacy.note}
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
