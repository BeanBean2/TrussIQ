import confetti from 'canvas-confetti';
import { Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  evaluateScaffoldedChallenge,
  getScaffoldedChallenge,
  type ScaffoldedChallenge,
} from '../lib/scaffoldedChallenges';
import type { Beam, DynamicsMode, FEAResult, Node, StructureState } from '../lib/types';
import { ScaffoldedChallengeHub } from './ScaffoldedChallengeHub';

export function ChallengeMode({
  nodes,
  beams,
  result,
  dynamicsMode,
  activeChallengeId,
  onStart,
  onOpenRequest,
  openExternal,
  onCloseExternal,
  hideFab = false,
}: {
  nodes: Node[];
  beams: Beam[];
  result: FEAResult | null;
  dynamicsMode: DynamicsMode;
  activeChallengeId: string | null;
  onStart: (challenge: ScaffoldedChallenge, starter: StructureState) => void;
  /** Optional external open trigger (e.g. empty-canvas CTA). */
  onOpenRequest?: () => void;
  openExternal?: boolean;
  onCloseExternal?: () => void;
  /** Hide the floating button during Demo Mode to avoid mobile overlap. */
  hideFab?: boolean;
}) {
  const [openLocal, setOpenLocal] = useState(false);
  const open = openLocal || Boolean(openExternal);
  const lastCelebratedRef = useRef<string | null>(null);

  const evaluation = useMemo(() => {
    if (!activeChallengeId) return null;
    const challenge = getScaffoldedChallenge(activeChallengeId);
    if (!challenge) return null;
    return evaluateScaffoldedChallenge(challenge, nodes, beams, result, dynamicsMode);
  }, [activeChallengeId, nodes, beams, result, dynamicsMode]);

  useEffect(() => {
    if (!activeChallengeId || !evaluation) return;
    if (evaluation.complete && lastCelebratedRef.current !== activeChallengeId) {
      lastCelebratedRef.current = activeChallengeId;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        void confetti({ particleCount: 90, spread: 62, startVelocity: 34, origin: { y: 0.68 } });
      }
    } else if (!evaluation.complete && lastCelebratedRef.current === activeChallengeId) {
      lastCelebratedRef.current = null;
    }
  }, [evaluation, activeChallengeId]);

  const close = () => {
    setOpenLocal(false);
    onCloseExternal?.();
  };

  return (
    <>
      {!hideFab && (
        <button
          type="button"
          onClick={() => {
            setOpenLocal(true);
            onOpenRequest?.();
          }}
          aria-label="Open scaffolded engineering challenges"
          title="Scaffolded challenges"
          className="challenge-fab fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-surface-900/95 px-3.5 py-2.5 text-xs font-semibold text-accent shadow-xl backdrop-blur hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Trophy size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Challenge</span>
        </button>
      )}
      <ScaffoldedChallengeHub
        open={open}
        onClose={close}
        nodes={nodes}
        beams={beams}
        result={result}
        dynamicsMode={dynamicsMode}
        activeChallengeId={activeChallengeId}
        onStart={(challenge, starter) => {
          onStart(challenge, starter);
          close();
        }}
      />
    </>
  );
}
