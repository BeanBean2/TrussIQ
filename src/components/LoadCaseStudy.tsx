import { Download, Scale, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { applySeismicLoads, applySelfWeightLoads, applyWindLoads, DEFAULT_SEISMIC, DEFAULT_WIND, STORM_WIND } from '../lib/dynamicsEngine';
import { solveTruss } from '../lib/feaEngine';
import type { Beam, FEAResult, Node } from '../lib/types';

interface LoadCase {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
}

interface SolvedCase extends LoadCase {
  result: FEAResult;
  maxDeflection: number;
  safetyFactor: number;
}

function makeCases(nodes: Node[], beams: Beam[]): LoadCase[] {
  const seismicPositive = { ...DEFAULT_SEISMIC, time: Math.PI / (2 * DEFAULT_SEISMIC.omega) };
  const seismicNegative = { ...DEFAULT_SEISMIC, time: (3 * Math.PI) / (2 * DEFAULT_SEISMIC.omega) };
  return [
    { id: 'service', name: 'Current service loads', description: 'The nodal loads currently in the model.', nodes: nodes.map((node) => ({ ...node })) },
    { id: 'factor-15', name: '1.5× factored loads', description: 'Current loads scaled by a 1.5 load factor.', nodes: nodes.map((node) => ({ ...node, fx: node.fx * 1.5, fy: node.fy * 1.5 })) },
    { id: 'factor-20', name: '2.0× factored loads', description: 'Current loads scaled by a 2.0 load factor.', nodes: nodes.map((node) => ({ ...node, fx: node.fx * 2, fy: node.fy * 2 })) },
    { id: 'wind-standard', name: 'Standard wind', description: `Power-law wind profile at ${DEFAULT_WIND.v0} m/s.`, nodes: applyWindLoads(nodes, DEFAULT_WIND) },
    { id: 'wind-storm', name: 'Storm wind', description: `Power-law wind profile at ${STORM_WIND.v0} m/s.`, nodes: applyWindLoads(nodes, STORM_WIND) },
    { id: 'seismic-positive', name: 'Seismic positive peak', description: 'Quasi-static snapshot at peak positive ground acceleration.', nodes: applySeismicLoads(nodes, beams, seismicPositive) },
    { id: 'seismic-negative', name: 'Seismic negative peak', description: 'Quasi-static snapshot at peak negative ground acceleration.', nodes: applySeismicLoads(nodes, beams, seismicNegative) },
    { id: 'self-weight', name: 'Self-weight + service', description: 'Member dead weight is distributed downward to its end nodes, combined with service loads.', nodes: applySelfWeightLoads(nodes, beams, 1) },
    { id: 'self-weight-factored', name: 'Self-weight + 1.5× service', description: 'Member dead weight plus the full service-load vector factored by 1.5.', nodes: applySelfWeightLoads(nodes, beams, 1.5) },
  ];
}

function solveCases(nodes: Node[], beams: Beam[]): SolvedCase[] {
  return makeCases(nodes, beams).map((loadCase) => {
    const result = solveTruss(loadCase.nodes, beams);
    const maxDeflection = result.success ? Math.max(0, ...result.displacements.map((d) => Math.hypot(d.ux, d.uy))) : 0;
    return { ...loadCase, result, maxDeflection, safetyFactor: result.success ? (result.maxSafetyRatio > 0 ? 1 / result.maxSafetyRatio : Infinity) : 0 };
  });
}

export function LoadCaseStudy({ nodes, beams, onClose }: { nodes: Node[]; beams: Beam[]; onClose: () => void }) {
  const dialogRef = useAccessibleDialog(onClose);
  const cases = useMemo(() => solveCases(nodes, beams), [nodes, beams]);
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? '');
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0];
  const governing = cases.filter((item) => item.result.success).reduce<SolvedCase | null>((worst, item) => !worst || item.result.maxSafetyRatio > worst.result.maxSafetyRatio ? item : worst, null);

  const exportCsv = () => {
    const data = [
      ['Load case', 'Yield check status', 'Max yield utilization (%)', 'Yield safety factor', 'Max displacement (mm)', 'Members yielded'],
      ...cases.map((item) => [item.name, item.result.success ? 'Solved' : item.result.message ?? 'Failed', item.result.success ? (100 * item.result.maxSafetyRatio).toFixed(2) : '', item.result.success ? Number.isFinite(item.safetyFactor) ? item.safetyFactor.toFixed(3) : 'Infinity' : '', item.result.success ? item.maxDeflection.toFixed(5) : '', item.result.members.filter((member) => member.yielded).length]),
    ];
    const csv = data.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trussiq-load-case-study.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[5vh] backdrop-blur-sm">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Load case study" className="w-full max-w-5xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4"><div className="flex gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><Scale size={18} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Engineering study</p><h2 className="mt-1 text-lg font-semibold text-surface-100">Compare load cases</h2><p className="mt-1 text-xs text-surface-400">Nine independent quasi-static snapshots using the current model geometry and sections.</p></div></div><button type="button" onClick={onClose} aria-label="Close load case study" className="rounded-lg p-2 text-surface-400 hover:bg-surface-800"><X size={17} /></button></header>
        {governing && <div className="border-b border-warn/25 bg-warn/5 px-5 py-2.5 text-xs text-surface-300"><span className="font-semibold text-warn">Governing yield case:</span> {governing.name} · {(governing.result.maxSafetyRatio * 100).toFixed(1)}% utilization{governing.result.maxSafetyRatio >= 1 ? ' · at least one member exceeds yield' : ''}</div>}
        <div className="grid md:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-x-auto p-4"><table className="w-full min-w-[580px] text-left text-[10px]"><thead className="text-surface-500"><tr><th className="px-2 py-2">Scenario</th><th className="px-2 py-2">Yield utilization</th><th className="px-2 py-2">Yield SF</th><th className="px-2 py-2">Deflection</th><th className="px-2 py-2">Yield check</th></tr></thead><tbody>{cases.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`cursor-pointer border-t border-surface-800 ${selectedId === item.id ? 'bg-accent/10' : 'hover:bg-surface-800/50'}`}><td className="px-2 py-2.5 font-medium text-surface-200">{item.name}</td><td className="px-2 py-2.5 font-mono text-surface-300">{item.result.success ? `${(item.result.maxSafetyRatio * 100).toFixed(1)}%` : '—'}</td><td className="px-2 py-2.5 font-mono text-surface-300">{item.result.success ? Number.isFinite(item.safetyFactor) ? `${item.safetyFactor.toFixed(2)}×` : '∞' : '—'}</td><td className="px-2 py-2.5 font-mono text-surface-300">{item.result.success ? `${item.maxDeflection.toFixed(3)} mm` : '—'}</td><td className={`px-2 py-2.5 ${!item.result.success ? 'text-warn' : item.result.passed ? 'text-pass' : 'text-fail'}`}>{!item.result.success ? item.result.unstable ? 'Unstable' : 'Error' : item.result.passed ? 'Below yield' : `${item.result.members.filter((member) => member.yielded).length} yielded`}</td></tr>)}</tbody></table>
            <button type="button" onClick={exportCsv} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:border-accent/40 hover:text-accent"><Download size={14} /> Export study CSV</button>
          </div>
          <aside className="border-t border-surface-700 bg-surface-800/30 p-5 md:border-l md:border-t-0">{selected ? <><span className="text-[10px] uppercase tracking-wide text-accent">Selected scenario</span><h3 className="mt-1 text-base font-semibold text-surface-100">{selected.name}</h3><p className="mt-2 text-xs leading-5 text-surface-400">{selected.description}</p>{selected.result.success ? <><div className="mt-5 grid grid-cols-2 gap-2"><Metric label="Peak yield use" value={`${(selected.result.maxSafetyRatio * 100).toFixed(1)}%`} /><Metric label="Yield safety factor" value={Number.isFinite(selected.safetyFactor) ? `${selected.safetyFactor.toFixed(2)}×` : '∞'} /><Metric label="Max displacement" value={`${selected.maxDeflection.toFixed(3)} mm`} /><Metric label="Yielded members" value={`${selected.result.members.filter((member) => member.yielded).length}`} /></div><h4 className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-surface-500">Critical members</h4><div className="mt-2 space-y-1">{[...selected.result.members].sort((a, b) => b.safetyRatio - a.safetyRatio).slice(0, 5).map((member) => <div key={member.beamId} className="flex items-center justify-between rounded-lg bg-surface-800 px-2.5 py-2 text-[10px]"><span className="font-mono text-surface-300">{member.beamId}</span><span className={member.yielded ? 'text-fail' : 'text-surface-400'}>{(member.safetyRatio * 100).toFixed(1)}% yield use · {member.status}</span></div>)}</div></> : <div className="mt-4 rounded-lg border border-warn/30 bg-warn/10 p-3 text-xs text-warn">{selected.result.message ?? 'This scenario could not be solved.'}</div>}</> : <p className="text-xs text-surface-400">No load cases available.</p>}</aside>
        </div>
        <footer className="border-t border-surface-700 px-5 py-3 text-[10px] leading-4 text-surface-500">These scenarios use linear axial-only snapshots. Seismic rows approximate peak inertial loads, not time-history response. Yield results do not certify safety or check buckling, joints, bracing, fatigue, or code compliance.</footer>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-surface-700 bg-surface-900/70 p-2.5"><p className="text-[9px] uppercase tracking-wide text-surface-500">{label}</p><p className="mt-1 font-mono text-sm font-semibold text-accent">{value}</p></div>;
}
