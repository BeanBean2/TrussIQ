import { useMemo } from 'react';
import { explainFailures } from '../lib/failureExplanation';
import type { Beam, FEAResult } from '../lib/types';

export function FailurePanel({ beams, result, onFocus }: { beams: Beam[]; result: FEAResult | null; onFocus: (ids: string[]) => void }) {
  const failures = useMemo(() => explainFailures(beams, result), [beams, result]);
  if (!result) return null;
  if (!result.success) return <section role="status" aria-label="Structure failure explanation" className="rounded-lg border border-warn/40 bg-warn/5 p-3 text-xs"><h3 className="font-semibold text-warn">Why the model cannot be solved</h3><p className="mt-2 leading-5 text-surface-300">{result.message ?? 'Check the supports, connectivity, member dimensions, and triangulation.'}</p>{result.unstable && <p className="mt-2 leading-5 text-surface-400">The structure can move or fold without stretching its members. Check that supports stop rigid-body motion and add diagonal members to brace mechanisms. A force calculation is not reliable until the model is stable.</p>}</section>;
  if (!failures.length) return null;
  const invalid = failures.some(f => f.invalidModel);
  const max = Math.max(...failures.map(f => f.demandRatio));
  return <section role="status" aria-live="polite" aria-label="Structure failure explanation" className="space-y-3 rounded-lg border border-fail/40 bg-fail/5 p-3">
    <h3 className="text-sm font-semibold text-fail">{invalid ? 'Load path needs a different model' : 'How this structure could fail'}</h3>
    <p className="text-xs leading-5 text-surface-300">{new Set(failures.map(f => f.beamId)).size} member(s) exceed a modeled limit. Red × marks identify these members on the canvas.</p>
    {failures.slice(0, 4).map(f => <article key={`${f.beamId}-${f.mode}`} className="space-y-2 border-t border-fail/20 pt-2"><button type="button" onClick={() => onFocus([f.beamId])} className="text-left text-xs font-semibold text-fail underline underline-offset-2">{f.member}: {f.mode}</button><p className="text-xs leading-5 text-surface-300">{f.explanation}</p><p className="text-[11px] leading-5 text-surface-400"><strong>What to change: </strong>{f.remedy}</p></article>)}
    {failures.length > 4 && <p className="text-[11px] text-surface-400">{failures.length - 4} additional failure mode(s); inspect the flagged members in Material lab.</p>}
    {!invalid && Number.isFinite(max) && <p className="text-[11px] leading-5 text-surface-400">Under proportional scaling of this load case, the first modeled limit is about {(100 / max).toFixed(1)}% of the current load. This is an idealized screening estimate, not a safe working load.</p>}
    <p className="text-[10px] leading-4 text-surface-500">The solver is linear and axial-only. It does not simulate fracture propagation, post-buckling behavior, connections, or progressive collapse. Once a limit is exceeded, the displayed elastic deformation is not a prediction of the broken structure.</p>
  </section>;
}
