import { FlaskConical, X } from 'lucide-react';
import { useMemo } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { solveTruss } from '../lib/feaEngine';
import { computeMassCost } from '../lib/massCost';
import { MATERIALS } from '../lib/materials';
import type { Beam, FEAResult, Material, Node } from '../lib/types';

interface Candidate {
  material: Material;
  result: FEAResult;
  massKg: number;
  cost: number;
  maxDeflection: number;
}

export function MaterialStudy({ nodes, beams, currentMaterialId, onApply, onClose }: {
  nodes: Node[];
  beams: Beam[];
  currentMaterialId: string;
  onApply: (materialId: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useAccessibleDialog(onClose);
  const candidates = useMemo<Candidate[]>(() => MATERIALS.map((material) => {
    const candidateBeams = beams.map((beam) => ({ ...beam, materialId: material.id }));
    const result = solveTruss(nodes, candidateBeams);
    const massCost = computeMassCost(nodes, candidateBeams);
    return {
      material,
      result,
      massKg: massCost.totalMassG / 1000,
      cost: massCost.estimatedCostUSD,
      maxDeflection: result.success ? Math.max(0, ...result.displacements.map((d) => Math.hypot(d.ux, d.uy))) : 0,
    };
  }), [nodes, beams]);

  const viable = candidates.filter((item) => item.result.success && item.result.passed);
  const lightest = viable.reduce<Candidate | null>((best, item) => !best || item.massKg < best.massKg ? item : best, null);
  const cheapest = viable.reduce<Candidate | null>((best, item) => !best || item.cost < best.cost ? item : best, null);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[5vh] backdrop-blur-sm">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Material study" className="w-full max-w-5xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4"><div className="flex gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><FlaskConical size={18} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Engineering study</p><h2 className="mt-1 text-lg font-semibold text-surface-100">Compare materials</h2><p className="mt-1 text-xs text-surface-400">Replace every member with each library material, then compare strength, stiffness, weight, and estimated cost.</p></div></div><button type="button" onClick={onClose} aria-label="Close material study" className="rounded-lg p-2 text-surface-400 hover:bg-surface-800"><X size={17} /></button></header>
        <p className="border-b border-warn/20 bg-warn/5 px-5 py-2.5 text-[10px] leading-4 text-surface-400">Candidates are ranked by the modeled yield limit only. Buckling estimates, joints, bracing, fatigue, and building-code requirements are not certified here.</p>
        <div className="grid gap-2 border-b border-surface-700 bg-surface-800/30 p-4 sm:grid-cols-2"><Summary label="Lightest below-yield option" candidate={lightest} metric={(candidate) => `${candidate.massKg.toFixed(3)} kg · ${candidate.material.name}`} /><Summary label="Lowest-cost below-yield option" candidate={cheapest} metric={(candidate) => `$${candidate.cost.toFixed(2)} · ${candidate.material.name}`} /></div>
        <div className="overflow-x-auto p-4"><table className="w-full min-w-[780px] text-left text-[10px]"><thead className="text-surface-500"><tr><th className="px-2 py-2">Material</th><th className="px-2 py-2">E (GPa)</th><th className="px-2 py-2">Yield (MPa)</th><th className="px-2 py-2">Mass (kg)</th><th className="px-2 py-2">Est. cost</th><th className="px-2 py-2">Yield SF</th><th className="px-2 py-2">Deflection</th><th className="px-2 py-2">Yield result</th><th /></tr></thead><tbody>{candidates.map((candidate) => {
          const result = candidate.result;
          const safety = result.success ? (result.maxSafetyRatio > 0 ? 1 / result.maxSafetyRatio : Infinity) : 0;
          const isCurrent = candidate.material.id === currentMaterialId;
          return <tr key={candidate.material.id} className={`border-t border-surface-800 ${isCurrent ? 'bg-accent/5' : ''}`}><td className="px-2 py-2.5"><span className="font-medium text-surface-200">{candidate.material.name}</span>{isCurrent && <span className="ml-1 text-accent">Current</span>}</td><td className="px-2 py-2.5 font-mono text-surface-300">{candidate.material.E}</td><td className="px-2 py-2.5 font-mono text-surface-300">{candidate.material.sigmaYield}</td><td className="px-2 py-2.5 font-mono text-surface-300">{candidate.massKg.toFixed(3)}</td><td className="px-2 py-2.5 font-mono text-surface-300">${candidate.cost.toFixed(2)}</td><td className="px-2 py-2.5 font-mono text-surface-300">{result.success ? Number.isFinite(safety) ? `${safety.toFixed(2)}×` : '∞' : '—'}</td><td className="px-2 py-2.5 font-mono text-surface-300">{result.success ? `${candidate.maxDeflection.toFixed(3)} mm` : '—'}</td><td className={`px-2 py-2.5 ${!result.success ? 'text-warn' : result.passed ? 'text-pass' : 'text-fail'}`}>{!result.success ? 'No solution' : result.passed ? 'Below yield' : 'Yield exceeded'}</td><td className="px-2 py-2.5">{!isCurrent && <button type="button" disabled={!result.success} onClick={() => { onApply(candidate.material.id); onClose(); }} className="rounded border border-surface-700 px-2 py-1 text-[10px] text-surface-300 hover:border-accent/40 hover:text-accent disabled:opacity-40">Apply</button>}</td></tr>;
        })}</tbody></table></div>
        <footer className="border-t border-surface-700 px-5 py-3 text-[10px] text-surface-500">Uniform material substitution keeps geometry and section areas fixed. Cost and material values are classroom estimates; confirm real-world properties before any physical build.</footer>
      </section>
    </div>
  );
}

function Summary({ label, candidate, metric }: { label: string; candidate: Candidate | null; metric: (candidate: Candidate) => string }) {
  return <div className="rounded-xl border border-surface-700 bg-surface-900/70 p-3"><p className="text-[9px] uppercase tracking-wide text-surface-500">{label}</p><p className="mt-1 text-sm font-semibold text-surface-100">{candidate ? metric(candidate) : 'No material is below the current yield limit'}</p></div>;
}
