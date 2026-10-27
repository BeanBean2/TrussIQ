import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Circle,
  Flag,
  Lightbulb,
  Play,
  Trophy,
  X,
} from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import {
  CHALLENGE_TIERS,
  createChallengeStarterState,
  EDUCATIONAL_DISCLAIMER,
  evaluateScaffoldedChallenge,
  getScaffoldedChallenge,
  SCAFFOLDED_CHALLENGES,
  type ChallengeTier,
  type ScaffoldedChallenge,
} from '../lib/scaffoldedChallenges';
import type { Beam, DynamicsMode, FEAResult, Node, StructureState } from '../lib/types';

interface ScaffoldedChallengeHubProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  beams: Beam[];
  result: FEAResult | null;
  dynamicsMode: DynamicsMode;
  activeChallengeId: string | null;
  onStart: (challenge: ScaffoldedChallenge, starter: StructureState) => void;
}

const TIER_FILTERS: Array<{ id: ChallengeTier | 'all'; label: string }> = [
  { id: 'all', label: 'All levels' },
  ...CHALLENGE_TIERS.map((t) => ({ id: t.id, label: t.label })),
];

export function ScaffoldedChallengeHub({
  open,
  onClose,
  nodes,
  beams,
  result,
  dynamicsMode,
  activeChallengeId,
  onStart,
}: ScaffoldedChallengeHubProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const titleId = useId();
  const descId = useId();
  const disclaimerId = useId();
  const [tier, setTier] = useState<ChallengeTier | 'all'>('all');
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      tier === 'all'
        ? SCAFFOLDED_CHALLENGES
        : SCAFFOLDED_CHALLENGES.filter((c) => c.tier === tier),
    [tier],
  );

  const selectedId =
    userSelectedId ??
    activeChallengeId ??
    filtered[0]?.id ??
    SCAFFOLDED_CHALLENGES[0]?.id ??
    '';

  const selected =
    getScaffoldedChallenge(selectedId) ??
    filtered[0] ??
    SCAFFOLDED_CHALLENGES[0];

  const evaluation = useMemo(() => {
    if (!selected) return null;
    if (activeChallengeId !== selected.id) return null;
    return evaluateScaffoldedChallenge(selected, nodes, beams, result, dynamicsMode);
  }, [selected, activeChallengeId, nodes, beams, result, dynamicsMode]);

  if (!open || !selected) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[4vh] backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descId} ${disclaimerId}`}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-surface-700 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Trophy size={16} aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                Scaffolded challenges
              </span>
            </div>
            <h2 id={titleId} className="mt-1 text-xl font-semibold text-surface-100">
              Beginner → advanced engineering goals
            </h2>
            <p id={descId} className="mt-1 max-w-2xl text-xs leading-5 text-surface-400">
              Each challenge has a goal, constraints, progressive hints, and a live scorecard compared to your analysis results.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scaffolded challenges"
            className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div
          id={disclaimerId}
          role="note"
          className="border-b border-warn/30 bg-warn/10 px-5 py-2.5 text-[11px] leading-5 text-warn"
        >
          <strong className="font-semibold">Educational estimate only.</strong> {EDUCATIONAL_DISCLAIMER}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-surface-700 px-5 py-3" role="tablist" aria-label="Challenge difficulty">
          {TIER_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tier === item.id}
              onClick={() => setTier(item.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                tier === item.id
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-surface-700 text-surface-400 hover:border-surface-500 hover:text-surface-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_1.05fr]">
          <div
            ref={listRef}
            role="listbox"
            aria-label="Challenge list"
            className="max-h-[58vh] space-y-1 overflow-y-auto p-3"
          >
            {filtered.map((challenge) => {
              const active = challenge.id === selected.id;
              const isRunning = challenge.id === activeChallengeId;
              return (
                <button
                  key={challenge.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setUserSelectedId(challenge.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    active
                      ? 'border-accent/55 bg-accent/10'
                      : 'border-transparent hover:border-surface-700 hover:bg-surface-800/70'
                  }`}
                >
                  <span
                    className={`mt-0.5 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      challenge.tier === 'beginner'
                        ? 'border-pass/40 text-pass'
                        : challenge.tier === 'intermediate'
                          ? 'border-warn/40 text-warn'
                          : 'border-fail/40 text-fail'
                    }`}
                  >
                    {challenge.tier}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-surface-100">{challenge.title}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-surface-500">{challenge.goal}</span>
                    {isRunning && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-accent">
                        <Flag size={11} aria-hidden="true" /> Active on canvas
                      </span>
                    )}
                  </span>
                  <ChevronRight size={14} className="mt-1 shrink-0 text-surface-600" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <aside className="flex flex-col border-t border-surface-700 bg-surface-800/30 p-5 md:border-l md:border-t-0" aria-live="polite">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              {selected.tier} · ~{selected.minutes} min
            </span>
            <h3 className="mt-2 text-lg font-semibold text-surface-100">{selected.title}</h3>
            <p className="mt-2 text-sm leading-6 text-surface-300">
              <span className="font-medium text-surface-100">Goal: </span>
              {selected.goal}
            </p>

            <div className="mt-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-surface-500">Constraints</h4>
              <ul className="mt-2 space-y-1.5">
                {selected.constraints.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-surface-300">
                    <Circle size={10} className="mt-1 shrink-0 text-surface-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-xl border border-surface-700 bg-surface-900/60 p-3">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-500">
                <Lightbulb size={12} className="text-warn" aria-hidden="true" /> Progressive hints
              </h4>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-4 text-surface-400">
                {selected.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ol>
              <p className="mt-2 text-[10px] text-surface-500">
                On the canvas panel you can reveal hints one at a time so they stay scaffolded.
              </p>
            </div>

            {evaluation && (
              <div className="mt-4">
                {evaluation.complete ? (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-pass/35 bg-pass/10 p-3 text-pass" role="status">
                    <BadgeCheck size={18} aria-hidden="true" />
                    <span className="text-sm font-semibold">Challenge complete — all goals met</span>
                  </div>
                ) : (
                  <p className="mb-2 text-[11px] text-surface-400" role="status">
                    Live score vs your current design: {evaluation.scorePct.toFixed(0)}% of checks passing
                  </p>
                )}
                <ul className="grid gap-2 sm:grid-cols-2" aria-label="Challenge scorecard">
                  {evaluation.checks.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-lg border p-2.5 ${
                        item.passed ? 'border-pass/30 bg-pass/5' : 'border-surface-700 bg-surface-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] text-surface-400">{item.label}</span>
                        {item.passed ? (
                          <CheckCircle2 size={13} className="shrink-0 text-pass" aria-label="Passed" />
                        ) : (
                          <Circle size={13} className="shrink-0 text-surface-600" aria-label="Not yet" />
                        )}
                      </div>
                      <p className={`mt-1 text-right font-mono text-[10px] ${item.passed ? 'text-pass' : 'text-warn'}`}>
                        {item.value}
                      </p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-800" aria-hidden="true">
                        <div
                          className={`h-full ${item.passed ? 'bg-pass' : 'bg-warn/70'}`}
                          style={{ width: `${Math.round(item.progress * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto flex flex-wrap justify-end gap-2 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    (nodes.length > 0 || beams.length > 0) &&
                    !window.confirm(
                      'Load this challenge starter? The current design will be replaced. Save or export first if you need it.',
                    )
                  ) {
                    return;
                  }
                  onStart(selected, createChallengeStarterState(selected));
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
              >
                <Play size={13} fill="currentColor" aria-hidden="true" />
                {activeChallengeId === selected.id ? 'Reload starter' : 'Start challenge'}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

/** Compact live scorecard while a scaffolded challenge is active. */
export function ActiveChallengePanel({
  challenge,
  nodes,
  beams,
  result,
  dynamicsMode,
  onOpenHub,
  onDismiss,
}: {
  challenge: ScaffoldedChallenge;
  nodes: Node[];
  beams: Beam[];
  result: FEAResult | null;
  dynamicsMode: DynamicsMode;
  onOpenHub: () => void;
  onDismiss: () => void;
}) {
  const [hintState, setHintState] = useState({ challengeId: challenge.id, index: 0 });
  const hintIndex = hintState.challengeId === challenge.id ? hintState.index : 0;
  const evaluation = useMemo(
    () => evaluateScaffoldedChallenge(challenge, nodes, beams, result, dynamicsMode),
    [challenge, nodes, beams, result, dynamicsMode],
  );
  const visibleHints = challenge.hints.slice(0, hintIndex + 1);

  return (
    <section
      className="absolute right-4 top-4 z-10 w-[min(22rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-accent/35 bg-surface-900/95 shadow-xl backdrop-blur-sm"
      aria-label={`Active challenge: ${challenge.title}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-surface-700 px-3 py-2.5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-accent">
            {challenge.tier} challenge
          </p>
          <h3 className="mt-0.5 text-xs font-semibold text-surface-100">{challenge.title}</h3>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss active challenge"
          className="rounded-md p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-2 p-3">
        <p className="text-[10px] leading-4 text-surface-400">{challenge.goal}</p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(evaluation.scorePct)}
          aria-label="Challenge completion"
        >
          <div className="h-full bg-accent transition-all" style={{ width: `${evaluation.scorePct}%` }} />
        </div>
        <p className="text-[10px] text-surface-500" role="status">
          {evaluation.complete
            ? 'All goals met'
            : `${evaluation.scorePct.toFixed(0)}% of checks passing · Run analysis after edits`}
        </p>
        <ul className="space-y-1" aria-label="Live goal comparison">
          {evaluation.checks.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-surface-400">{item.label}</span>
              <span className={`font-mono ${item.passed ? 'text-pass' : 'text-warn'}`}>{item.value}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-surface-700 bg-surface-800/50 p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-surface-500">Hints</p>
          <ol className="mt-1 list-decimal space-y-1 pl-3.5 text-[10px] leading-4 text-surface-400">
            {visibleHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ol>
          {hintIndex < challenge.hints.length - 1 && (
            <button
              type="button"
              onClick={() =>
                setHintState({
                  challengeId: challenge.id,
                  index: Math.min(challenge.hints.length - 1, hintIndex + 1),
                })
              }
              className="mt-2 text-[10px] font-medium text-accent hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Reveal next hint
            </button>
          )}
        </div>
        <p className="text-[9px] leading-4 text-surface-500" role="note">
          {EDUCATIONAL_DISCLAIMER}
        </p>
        <button
          type="button"
          onClick={onOpenHub}
          className="w-full rounded-lg border border-accent/35 bg-accent/10 px-2 py-1.5 text-[10px] font-medium text-accent hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Open challenge hub
        </button>
      </div>
    </section>
  );
}
