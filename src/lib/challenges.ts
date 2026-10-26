import type { PresetKey } from './presets';
import type { DynamicsMode } from './types';

export interface EngineeringChallenge {
  id: string;
  track: string;
  level: number;
  title: string;
  brief: string;
  target: string;
  preset: PresetKey;
  dynamics: DynamicsMode;
}

const tracks: Array<{
  name: string;
  action: string;
  metric: string;
  preset: PresetKey;
  dynamics?: DynamicsMode;
}> = [
  { name: 'Bridge yield study', action: 'Strengthen the load path', metric: 'peak yield utilization', preset: 'howe' },
  { name: 'Lightweight design', action: 'Remove material without losing stability', metric: 'member count and total mass', preset: 'warren' },
  { name: 'Robot arm', action: 'Improve a loaded robot arm', metric: 'tip deflection and member yield utilization', preset: 'cantilever' },
  { name: 'Roof resilience', action: 'Reinforce a roof under changing loads', metric: 'support reactions and peak yield utilization', preset: 'roof' },
  { name: 'Topology study', action: 'Compare two ways to triangulate the same span', metric: 'force distribution and yield safety factor', preset: 'pratt' },
  { name: 'Material choice', action: 'Choose a material for the critical members', metric: 'mass, cost, and yield safety factor', preset: 'howe' },
  { name: 'Wind engineering', action: 'Reduce lateral movement under wind', metric: 'horizontal deflection', preset: 'roof', dynamics: 'wind' },
  { name: 'Earthquake engineering', action: 'Trace the load path under ground motion', metric: 'member forces through the seismic sweep', preset: 'warren', dynamics: 'seismic' },
  { name: 'Buckling prevention', action: 'Shorten or brace compression members', metric: 'buckling warnings', preset: 'howe' },
  { name: 'Failure investigation', action: 'Predict and explain the first failure', metric: 'collapse sequence and failed-member order', preset: 'pratt' },
];

/** Ten levels across ten tracks make a 100-lesson, measurable design curriculum. */
export const ENGINEERING_CHALLENGES: EngineeringChallenge[] = tracks.flatMap((track, trackIndex) =>
  Array.from({ length: 10 }, (_, levelIndex) => {
    const level = levelIndex + 1;
    const number = trackIndex * 10 + level;
    const difficulty = level <= 3 ? 'Explore' : level <= 7 ? 'Investigate' : 'Optimize';
    const progressiveTarget = Math.max(0.35, 0.9 - (level - 1) * 0.06);
    return {
      id: `challenge-${String(number).padStart(3, '0')}`,
      track: track.name,
      level,
      title: `${track.name}: ${difficulty} ${level}`,
      brief: `${track.action}. Change the model, analyze it, and use the results to explain one design decision.`,
      target: `Use ${track.metric} as evidence. Aim for a peak utilization at or below ${(progressiveTarget * 100).toFixed(0)}% where applicable.`,
      preset: track.preset,
      dynamics: track.dynamics ?? 'none',
    } satisfies EngineeringChallenge;
  }),
);

export const CHALLENGE_TRACKS = tracks.map((track) => track.name);
