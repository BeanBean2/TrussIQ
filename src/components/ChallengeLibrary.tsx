import { CheckCircle2, Filter, Flag, Play, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { CHALLENGE_TRACKS, ENGINEERING_CHALLENGES, type EngineeringChallenge } from '../lib/challenges';
import type { DynamicsMode } from '../lib/types';
import type { PresetKey } from '../lib/presets';
import { readStoredValue, writeStoredValue } from '../lib/storage';

const PROGRESS_KEY = 'trussiq-challenge-progress';

function readProgress(): Set<string> {
  try {
    const value: unknown = JSON.parse(readStoredValue(PROGRESS_KEY) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function ChallengeLibrary({ onStart, onClose }: {
  onStart: (challenge: EngineeringChallenge) => void;
  onClose: () => void;
}) {
  const dialogRef = useAccessibleDialog(onClose);
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState('All tracks');
  const [progress, setProgress] = useState(readProgress);
  const [selected, setSelected] = useState(ENGINEERING_CHALLENGES[0]);

  const filtered = useMemo(() => ENGINEERING_CHALLENGES.filter((challenge) =>
    (track === 'All tracks' || challenge.track === track) &&
    `${challenge.title} ${challenge.brief} ${challenge.target} ${challenge.track}`.toLowerCase().includes(query.toLowerCase()),
  ), [query, track]);

  const toggleComplete = (id: string) => {
    const next = new Set(progress);
    if (next.has(id)) next.delete(id); else next.add(id);
    setProgress(next);
    writeStoredValue(PROGRESS_KEY, JSON.stringify([...next]));
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[4vh] backdrop-blur-sm">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Engineering challenge library" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div><div className="flex items-center gap-2 text-accent"><Flag size={17} /><span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Engineering challenge lab</span></div><h2 className="mt-1 text-xl font-semibold text-surface-100">100 ways to investigate a structure</h2><p className="mt-1 text-xs text-surface-400">Ten tracks, ten levels each. Start with a model, test a change, and explain the evidence.</p></div>
          <button type="button" onClick={onClose} aria-label="Close challenge library" className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"><X size={16} /></button>
        </header>
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-700 px-5 py-3">
          <label className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-3"><Search size={14} className="text-surface-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search challenges" aria-label="Search challenges" className="h-9 min-w-0 flex-1 bg-transparent text-xs text-surface-100 outline-none" /></label>
          <label className="flex items-center gap-2 text-xs text-surface-400"><Filter size={14} /><select value={track} onChange={(event) => setTrack(event.target.value)} aria-label="Filter challenge track" className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-2 text-xs text-surface-200"><option>All tracks</option>{CHALLENGE_TRACKS.map((name) => <option key={name}>{name}</option>)}</select></label>
          <span className="text-[10px] text-surface-500">{progress.size}/100 completed</span>
        </div>
        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_0.82fr]">
          <div className="max-h-[62vh] space-y-1 overflow-y-auto p-3" aria-label="Challenge list">
            {filtered.length === 0 ? <p className="p-6 text-center text-xs text-surface-500">No challenges match that search.</p> : filtered.map((challenge) => (
              <button key={challenge.id} type="button" onClick={() => setSelected(challenge)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${selected.id === challenge.id ? 'border-accent/50 bg-accent/10' : 'border-transparent hover:border-surface-700 hover:bg-surface-800/70'}`}>
                <span className="w-9 shrink-0 font-mono text-[10px] text-surface-500">{challenge.id.slice(-3)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-surface-200">{challenge.title}</span><span className="mt-0.5 block truncate text-[10px] text-surface-500">{challenge.track} · Level {challenge.level}</span></span>{progress.has(challenge.id) && <CheckCircle2 size={15} className="shrink-0 text-pass" />}
              </button>
            ))}
          </div>
          <aside className="flex flex-col justify-between border-t border-surface-700 bg-surface-800/30 p-5 md:border-l md:border-t-0">
            <div>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-medium text-accent">{selected.track} · Level {selected.level}</span>
              <h3 className="mt-4 text-lg font-semibold text-surface-100">{selected.title}</h3>
              <p className="mt-3 text-sm leading-6 text-surface-300">{selected.brief}</p>
              <div className="mt-4 rounded-xl border border-surface-700 bg-surface-900/70 p-3"><h4 className="text-[10px] font-semibold uppercase tracking-wide text-surface-500">Evidence target</h4><p className="mt-1.5 text-xs leading-5 text-surface-300">{selected.target}</p></div>
              <p className="mt-3 text-[10px] text-surface-500">Starter: {selected.preset} truss · {selected.dynamics === 'none' ? 'static loading' : `${selected.dynamics} loading`}</p>
            </div>
            <div className="mt-6 grid gap-2">
              <button type="button" onClick={() => onStart(selected)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-surface-950 hover:bg-teal-300"><Play size={14} fill="currentColor" /> Start this investigation</button>
              <button type="button" onClick={() => toggleComplete(selected.id)} className="rounded-lg border border-surface-700 px-4 py-2 text-xs font-medium text-surface-300 hover:border-pass/40 hover:text-pass">{progress.has(selected.id) ? 'Mark as still in progress' : 'Mark investigation complete'}</button>
            </div>
          </aside>
        </div>
        <footer className="border-t border-surface-700 px-5 py-2.5 text-[10px] text-surface-500">Progress is saved on this device. Challenge prompts are learning activities, not structural design certification.</footer>
      </section>
    </div>
  );
}

export type ChallengeStarter = { preset: PresetKey; dynamics: DynamicsMode };
