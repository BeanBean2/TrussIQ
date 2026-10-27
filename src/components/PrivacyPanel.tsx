import { Shield, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import {
  clearPrivateLocalData,
  getPrivacyPrefs,
  privacyStatusSummary,
  setPrivacyPrefs,
  type PrivacyPrefs,
} from '../lib/privacy';
import { setGeminiApiKey } from '../lib/geminiCoach';

interface PrivacyPanelProps {
  onClose: () => void;
  onPrefsChange: (prefs: PrivacyPrefs) => void;
  onCleared: () => void;
}

export function PrivacyPanel({ onClose, onPrefsChange, onCleared }: PrivacyPanelProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [prefs, setPrefs] = useState(() => getPrivacyPrefs());
  const [clearedNote, setClearedNote] = useState<string | null>(null);

  const update = (patch: Partial<PrivacyPrefs>) => {
    const next = setPrivacyPrefs(patch);
    setPrefs(next);
    onPrefsChange(next);
  };

  const clearData = () => {
    const confirmed = window.confirm(
      'Clear saved models, project names, briefs, team comments, and any Gemini API key from this browser? UI settings (theme, layout) are kept.',
    );
    if (!confirmed) return;
    const { removed } = clearPrivateLocalData();
    setGeminiApiKey('');
    const next = getPrivacyPrefs();
    setPrefs(next);
    onPrefsChange(next);
    onCleared();
    setClearedNote(`Cleared ${removed} stored item${removed === 1 ? '' : 's'} from this browser.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Shield size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Privacy</p>
              <h2 id="privacy-title" className="mt-1 text-lg font-semibold text-surface-100">
                Keep classroom data on this device
              </h2>
              <p className="mt-1 text-xs text-surface-400">
                TrussIQ has no account server. Analysis stays in the browser. Sharing and cloud coaching need your OK.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy settings"
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-800"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          <p className="rounded-lg border border-surface-700 bg-surface-800/50 px-3 py-2 text-[10px] text-surface-400">
            Status: {privacyStatusSummary(prefs)}
          </p>

          <Toggle
            checked={prefs.privateSession}
            onChange={(privateSession) => update({ privateSession })}
            title="Private session"
            detail="Do not autosave models, named projects, or briefs to this browser. Export a .truss file if you need a copy."
          />
          <Toggle
            checked={prefs.allowShareLinks}
            onChange={(allowShareLinks) => update({ allowShareLinks })}
            title="Allow shareable design links"
            detail="Links put the full model in the URL. Anyone with the link (and browser history) can open it. Off by default."
          />
          <Toggle
            checked={prefs.allowCloudCoach}
            onChange={(allowCloudCoach) => update({ allowCloudCoach })}
            title="Allow cloud Gemini coach"
            detail="When on and an API key is set, chat questions and a model summary are sent to Google. Local rules work without this."
          />
          <Toggle
            checked={prefs.includePersonalFields}
            onChange={(includePersonalFields) => update({ includePersonalFields })}
            title="Include names on exports"
            detail="Student/team and course fields from the project brief appear on worksheets and review packets only when this is on."
          />

          <div className="rounded-xl border border-warn/40 bg-warn/10 p-3">
            <h3 className="text-xs font-semibold text-warn">Clear private data</h3>
            <p className="mt-1 text-[10px] leading-4 text-surface-300">
              Removes drafts, project library, collaboration notes, project brief, and Gemini key from local storage on
              this device.
            </p>
            <button
              type="button"
              onClick={clearData}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-warn/50 bg-warn/15 px-3 py-2 text-xs font-semibold text-warn hover:bg-warn/25"
            >
              <Trash2 size={14} aria-hidden="true" />
              Clear private data
            </button>
            {clearedNote && (
              <p role="status" className="mt-2 text-[10px] text-pass">
                {clearedNote}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-700 bg-surface-800/40 px-3 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 accent-teal-500"
      />
      <span>
        <span className="block text-xs font-semibold text-surface-100">{title}</span>
        <span className="mt-1 block text-[10px] leading-4 text-surface-400">{detail}</span>
      </span>
    </label>
  );
}
