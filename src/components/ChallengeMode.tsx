import confetti from 'canvas-confetti';
import { BadgeCheck, Flag, Trophy, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { createBridgeChallengeStarter, evaluateBridgeChallenge, type BridgeChallengeId } from '../lib/bridgeChallenges';
import type { Beam, Node, StructureState } from '../lib/types';
import { useEffect, useMemo, useRef, useState } from 'react';

const CHALLENGES: Array<{ id: BridgeChallengeId; title: string; brief: string; target: string }> = [
  { id: 'low-budget-span', title: 'The Low-Budget Span', brief: 'Bridge a 10 m canyon with an estimated material budget of $500.', target: 'Carry at least 500 N at midspan, stay below the material yield limit, and pass the simplified Euler buckling screen.' },
  { id: 'high-wind-resilience', title: 'High Wind Resilience', brief: 'Tune a bridge for a 120 mph reference wind profile.', target: 'Keep yield and buckling screens below 100%, with peak nodal movement below span / 200.' },
];

export function ChallengeMode({
  nodes,
  beams,
  activeChallengeId,
  onStart,
}: {
  nodes: Node[];
  beams: Beam[];
  activeChallengeId: BridgeChallengeId | null;
  onStart: (id: BridgeChallengeId, starter: StructureState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<BridgeChallengeId>(activeChallengeId ?? 'low-budget-span');
  const dialogRef = useAccessibleDialog(() => setOpen(false));
  const lastCelebratedRef = useRef<BridgeChallengeId | null>(null);
  const selected = CHALLENGES.find((challenge) => challenge.id === selectedId)!;
  const evaluation = useMemo(
    () => activeChallengeId === selectedId ? evaluateBridgeChallenge(selectedId, nodes, beams) : null,
    [activeChallengeId, selectedId, nodes, beams],
  );

  useEffect(() => {
    if (evaluation?.complete && lastCelebratedRef.current !== selectedId) {
      lastCelebratedRef.current = selectedId;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        void confetti({ particleCount: 90, spread: 62, startVelocity: 34, origin: { y: 0.68 } });
      }
    } else if (!evaluation?.complete && lastCelebratedRef.current === selectedId) {
      lastCelebratedRef.current = null;
    }
  }, [evaluation, selectedId]);

  return (
    <>
      <button type="button" onClick={() => { setSelectedId(activeChallengeId ?? 'low-budget-span'); setOpen(true); }} aria-label="Open Bridge Challenge Mode" title="Bridge Challenge Mode" className="challenge-fab fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-surface-900/95 px-3.5 py-2.5 text-xs font-semibold text-accent shadow-xl backdrop-blur hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Trophy size={15} /> <span className="hidden sm:inline">Challenge</span>
      </button>
      {open && <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[5vh] backdrop-blur-sm">
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Bridge Challenge Mode" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl">
          <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
            <div><div className="flex items-center gap-2 text-accent"><Flag size={16} /><span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Bridge Challenge Mode</span></div><h2 className="mt-1 text-xl font-semibold text-surface-100">Design against a real constraint</h2><p className="mt-1 text-xs text-surface-400">Start from a scaled truss, edit it in the workspace, then reopen this panel to check progress.</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Bridge Challenge Mode" className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"><X size={16} /></button>
          </header>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {CHALLENGES.map((challenge) => <button key={challenge.id} type="button" onClick={() => setSelectedId(challenge.id)} aria-pressed={selectedId === challenge.id} className={`rounded-xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${selectedId === challenge.id ? 'border-accent/55 bg-accent/10' : 'border-surface-700 bg-surface-800/50 hover:border-surface-500'}`}>
              <span className="text-xs font-semibold text-surface-100">{challenge.title}</span><span className="mt-2 block text-[11px] leading-5 text-surface-400">{challenge.brief}</span>
            </button>)}
          </div>
          <div className="border-t border-surface-700 px-5 py-4">
            <h3 className="text-sm font-semibold text-surface-100">{selected.title}</h3>
            <p className="mt-1 text-xs leading-5 text-surface-400">{selected.target}</p>
            {evaluation ? <div className="mt-4">
              {evaluation.complete && <div className="mb-3 flex items-center gap-2 rounded-xl border border-pass/35 bg-pass/10 p-3 text-pass"><BadgeCheck size={18} /><span className="text-sm font-semibold">Challenge Completed</span></div>}
              <ul className="grid gap-2 sm:grid-cols-2">
                {evaluation.checks.map((check) => <li key={check.label} className={`flex items-start justify-between gap-2 rounded-lg border p-3 ${check.passed ? 'border-pass/25 bg-pass/5' : 'border-surface-700 bg-surface-800/50'}`}><span className="text-[10px] text-surface-400">{check.label}</span><span className={`text-right text-[10px] font-medium ${check.passed ? 'text-pass' : 'text-warn'}`}>{check.value}</span></li>)}
              </ul>
              <p className="mt-3 text-[10px] leading-4 text-surface-500">This learning challenge uses a linear, axial-only solver and a simplified pin-ended Euler screen. It does not assess connections, fatigue, construction details, or code compliance; it is not a safety certification.</p>
            </div> : <div className="mt-4 rounded-lg border border-surface-700 bg-surface-800/50 p-3 text-[11px] text-surface-400">Load the starter to set up the challenge in the workspace. The existing design will be replaced.</div>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:bg-surface-800">Close</button>
              <button type="button" onClick={() => {
                if ((nodes.length > 0 || beams.length > 0) && !window.confirm('Replace the current design with this challenge starter? Export or save your work first if you want to keep it.')) return;
                onStart(selectedId, createBridgeChallengeStarter(selectedId));
                setOpen(false);
              }} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300">Load challenge starter</button>
            </div>
          </div>
        </section>
      </div>}
    </>
  );
}
