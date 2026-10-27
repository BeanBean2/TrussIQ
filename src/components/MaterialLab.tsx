import { memberLabel } from '../lib/entityLabels';
import { useState } from 'react';
import { MATERIALS, getMaterial } from '../lib/materials';
import { materialChecks, materialProfile, percentChange, sectionForMaterial, withSection, type MaterialChange, type MaterialView } from '../lib/materialLab';
import type { Beam, FEAResult } from '../lib/types';

const control = 'w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-100';
export function MaterialLab({ beams, materialId, selectedBeamId, result, change, view, onView, onApply, onDefault, onCompare }: {
  beams: Beam[]; materialId: string; selectedBeamId: string | null; result: FEAResult | null; change: MaterialChange | null;
  view: MaterialView; onView: (v: MaterialView) => void;
  onApply: (beams: Beam[], id: string, label: string, updateDefault?: boolean) => void; onDefault: (id: string) => void; onCompare: () => void;
}) {
  const [all, setAll] = useState(false);
  const selected = beams.find(b => b.id === selectedBeamId);
  const targeted = selected && !all ? [selected] : beams;
  const id = selected && !all ? selected.materialId : materialId;
  const mat = getMaterial(id), profile = materialProfile(id);
  const ids = new Set(targeted.map(b => b.id));
  const checks = materialChecks(beams, result);
  const issues = checks.filter(c => c.failed);
  const apply = (mid: string, preset = false) => {
    if (!beams.length) { onDefault(mid); return; }
    onApply(beams.map(b => ids.has(b.id) ? preset ? withSection({ ...b, materialId: mid }, sectionForMaterial(mid)) : { ...b, materialId: mid } : b), mid, `${getMaterial(mid).name}${preset ? ' + section preset' : ''} · ${selected && !all ? 'selected member' : 'all members'}`, !selected || all);
  };
  return <section className="space-y-3" aria-label="Material lab">
    <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-surface-100">Material lab</h3><button type="button" onClick={onCompare} className="text-xs text-accent">Compare options</button></div>
    <label className="block space-y-1 text-xs text-surface-400"><span>Apply changes to</span><select aria-label="Material scope" className={control} value={selected && !all ? 'member' : 'all'} onChange={e => setAll(e.target.value === 'all')}><option value="member" disabled={!selected}>Selected member</option><option value="all">{beams.length ? `All ${beams.length} members + new members` : 'New members'}</option></select></label>
    <label className="block space-y-1 text-xs text-surface-400"><span>{selected && !all ? `Member ${memberLabel(selected.id, beams)} material` : 'Structure material'}</span><select aria-label="Material selection" className={control} value={id} onChange={e => apply(e.target.value)}>{MATERIALS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    <div className="rounded-lg border border-surface-700 bg-surface-800/60 p-3">
      <div className="flex items-center gap-2"><span className="h-2 w-7 rounded" style={{ background: mat.color }} /><strong className="text-xs text-surface-100">{mat.name}</strong><span className="text-[10px] text-surface-400">{profile.family}</span></div>
      <p className="mt-2 text-xs leading-5 text-surface-300">{profile.tradeoff}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] text-surface-400"><div><dt>Axial E</dt><dd>{mat.E} GPa</dd></div><div><dt>Density / cost</dt><dd>{mat.density} g/cm³ · ${mat.costUSDPerKg}/kg</dd></div><div><dt>Tension limit</dt><dd>{profile.tension} MPa</dd></div><div><dt>Compression limit</dt><dd>{profile.compression} MPa</dd></div></dl>
      <p className="mt-2 text-[10px] leading-4 text-surface-400">{profile.assumption}</p>
      <button type="button" disabled={!beams.length} onClick={() => apply(id, true)} className="mt-3 w-full rounded border border-accent/40 bg-accent/10 px-2 py-2 text-xs text-accent disabled:opacity-40">Apply {mat.name.toLowerCase()} section preset</button>
      <p className="mt-1 text-[10px] text-surface-500">Changes section dimensions too. Undo restores the previous design.</p>
    </div>
    {change && <div role="status" aria-live="polite" className="rounded-lg border border-accent/30 bg-accent/5 p-3"><p className="text-xs font-medium text-accent">{change.label}</p><dl className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-surface-300">{([['Mass', change.before.mass, change.after.mass, 'g'], ['Cost', change.before.cost, change.after.cost, '$'], ['Deflection', change.before.deflection, change.after.deflection, 'mm'], ['Strength utilization', change.before.utilization === null ? null : change.before.utilization * 100, change.after.utilization === null ? null : change.after.utilization * 100, '%']] as const).map(([label, before, after, unit]) => <div key={label}><dt className="text-surface-400">{label}</dt><dd>{percentChange(before, after)}<span className="mt-0.5 block font-mono text-surface-400">{before === null ? '—' : before.toFixed(2)} → {after === null ? '—' : after.toFixed(2)} {unit}</span></dd></div>)}</dl></div>}
    <div className="space-y-2"><label className="block text-xs text-surface-400">Canvas appearance<select aria-label="Material or stress view" className={`${control} mt-1`} value={view} onChange={e => onView(e.target.value as MaterialView)}><option value="stress">Stress heatmap (green → red)</option><option value="materials">Material colors + patterns</option></select></label>{view === 'stress' ? <p className="text-[10px] leading-4 text-surface-400">After analysis, members color by yield utilization: green = low stress, red = at or past the modeled limit. Dashed members are in compression.</p> : <div className="flex flex-wrap gap-2 text-[10px] text-surface-400" aria-label="Material legend">{Array.from(new Set(beams.map(b => b.materialId))).map(mid => <span key={mid} className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: getMaterial(mid).color }} />{getMaterial(mid).name} · {materialProfile(mid).pattern}</span>)}</div>}</div>
    <div className="rounded-lg border border-surface-700 p-3"><h4 className="text-xs font-semibold text-surface-200">Material failure checks</h4>{!result?.success ? <p className="mt-1 text-[10px] text-surface-400">Run analysis to inspect strength and buckling.</p> : <><p className={`mt-1 text-xs ${issues.length ? 'text-warn' : 'text-pass'}`}>{issues.length ? `${issues.length} member${issues.length === 1 ? '' : 's'} exceed a material or buckling screen` : 'Below modeled strength and buckling limits'}</p>{issues.slice(0, 5).map(c => <p key={c.beamId} className="mt-1 text-[10px] text-warn">{memberLabel(c.beamId, beams)}: {c.mode} ({Number.isFinite(Math.max(c.strengthRatio, c.bucklingRatio)) ? `${Math.max(c.strengthRatio, c.bucklingRatio).toFixed(2)}×` : 'unsupported'})</p>)}{issues.length > 5 && <p className="text-[10px] text-surface-400">+ {issues.length - 5} more members</p>}</>}<p className="mt-2 text-[10px] leading-4 text-surface-500">Euler screen: pin-ended members, K = 1, weakest section axis. Unspecified sections assume a solid circular rod. Educational estimates; joints and lateral bracing are excluded.</p></div>
    <p className="text-[10px] leading-4 text-surface-400">Why can forces stay the same? In a statically determinate truss, geometry and loads set member forces. Material changes stiffness, deflection, mass, strength, and buckling resistance. Self-weight is not added automatically.</p>
  </section>;
}
