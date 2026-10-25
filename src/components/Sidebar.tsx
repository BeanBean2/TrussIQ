import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { SectionParams } from '../lib/crossSections';
import { solidRodFromArea } from '../lib/crossSections';
import { MATERIALS } from '../lib/materials';
import type { AIAnalysis, Beam, FEAResult, Node } from '../lib/types';
import type { StructureAudit } from '../lib/structureAudit';
import { AIAdvisor } from './AIAdvisor';
import { AnalyticsPanel } from './AnalyticsPanel';
import { AuditPanel } from './AuditPanel';
import { GlossaryTooltip } from './GlossaryTooltip';
import { SectionEditor } from './SectionEditor';

interface SidebarProps {
  materialId: string;
  defaultArea: number;
  result: FEAResult | null;
  ai: AIAnalysis;
  nodes: Node[];
  beams: Beam[];
  selectedBeamId: string | null;
  selectedNodeId: string | null;
  onMaterialChange: (id: string) => void;
  onAreaChange: (area: number) => void;
  onSelectedBeamArea: (area: number) => void;
  onSelectedBeamSection: (section: SectionParams, materialId: string) => void;
  onSelectedNodeChange: (patch: Partial<Node>) => void;
  onOpenFormula: () => void;
  onFocusBeams: (ids: string[]) => void;
  onFocusNodes: (ids: string[]) => void;
  onRunSolver: () => void;
  audit: StructureAudit;
}

type Tab = 'health' | 'inspect' | 'analytics' | 'audit' | 'ai';

export function Sidebar({
  materialId,
  defaultArea,
  result,
  ai,
  nodes,
  beams,
  selectedBeamId,
  selectedNodeId,
  onMaterialChange,
  onAreaChange,
  onSelectedBeamArea,
  onSelectedBeamSection,
  onSelectedNodeChange,
  onOpenFormula,
  onFocusBeams,
  onFocusNodes,
  onRunSolver,
  audit,
}: SidebarProps) {
  const [tab, setTab] = useState<Tab>('inspect');
  const selectedBeam = beams.find((b) => b.id === selectedBeamId) ?? null;
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const mat = MATERIALS.find((m) => m.id === materialId);

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-[min(22rem,calc(100vw-3.5rem))] max-w-full shrink-0 flex-col border-l border-surface-700 bg-surface-900 shadow-2xl shadow-black/25 lg:static lg:w-[22rem] lg:shadow-none">
      <div className="flex border-b border-surface-700">
        {(
          [
            ['health', 'Health'],
            ['inspect', 'Inspect'],
            ['analytics', 'Analytics'],
            ['audit', 'Audit'],
            ['ai', 'AI'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 px-2 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
              tab === id
                ? 'border-b-2 border-accent text-accent'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            {label}
            {id === 'ai' && ai.bucklingBeamIds.length > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[9px] text-surface-950">
                {ai.bucklingBeamIds.length}
              </span>
            )}
            {id === 'audit' && audit.errors + audit.warnings > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[9px] text-surface-950">
                {audit.errors + audit.warnings}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {tab === 'health' && (
          <HealthPanel
            nodes={nodes}
            beams={beams}
            result={result}
            ai={ai}
            audit={audit}
            onRunSolver={onRunSolver}
            onFocusBeams={onFocusBeams}
            onFocusNodes={onFocusNodes}
          />
        )}

        {tab === 'inspect' && (
          <>
            <section className="space-y-2">
              <label className="text-xs font-medium text-surface-300">Material Preset</label>
              <select
                value={materialId}
                onChange={(e) => onMaterialChange(e.target.value)}
                className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 outline-none focus:border-accent"
              >
                {MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {mat && (
                <div className="rounded-lg bg-surface-800/80 px-3 py-2 font-mono text-[11px] text-surface-400">
                  <div>
                    <GlossaryTooltip term="Young's Modulus" /> E = {mat.E} GPa
                  </div>
                  <div>
                    <GlossaryTooltip term="Yield Strength" /> = {mat.sigmaYield} MPa
                  </div>
                  <div>
                    ρ = {mat.density} g/cm³ · ${mat.costUSDPerKg}/kg
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-surface-300">
                  {selectedBeam ? 'Selected Beam Area' : 'Default Cross-Section'}
                </label>
                <span className="font-mono text-xs text-accent">
                  {(selectedBeam?.area ?? defaultArea).toFixed(0)} mm²
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={selectedBeam?.area ?? defaultArea}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (selectedBeam) onSelectedBeamArea(v);
                  else onAreaChange(v);
                }}
                className="w-full accent-accent"
              />
            </section>

            {(selectedNode || selectedBeam) && (
              <section className="space-y-1.5 rounded-lg border border-surface-700 bg-surface-800/50 px-3 py-2.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                  Selection
                </h3>
                {selectedNode && (
                  <div className="space-y-2 text-[11px] text-surface-300">
                    <div className="font-mono">Node {selectedNode.id}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <NodeNumberInput label="X (mm)" value={selectedNode.x} onChange={(value) => onSelectedNodeChange({ x: value })} />
                      <NodeNumberInput label="Y (mm)" value={selectedNode.y} onChange={(value) => onSelectedNodeChange({ y: value })} />
                      <NodeNumberInput label="Force X (N)" value={selectedNode.fx} onChange={(value) => onSelectedNodeChange({ fx: value })} />
                      <NodeNumberInput label="Force Y (N)" value={selectedNode.fy} onChange={(value) => onSelectedNodeChange({ fy: value })} />
                    </div>
                    <div className="rounded-md border border-surface-700 bg-surface-900/50 px-2 py-1.5 font-mono text-[10px] text-surface-500">
                      Support: <span className="text-surface-300">{selectedNode.support}</span>
                    </div>
                  </div>
                )}
                {selectedBeam && (
                  <div className="space-y-2 font-mono text-[11px] text-surface-300">
                    <div>Beam {selectedBeam.id}</div>
                    <div>
                      {selectedBeam.nodeI} → {selectedBeam.nodeJ}
                    </div>
                    <div>A = {selectedBeam.area.toFixed(1)} mm²</div>
                    <button
                      type="button"
                      onClick={onOpenFormula}
                      className="w-full rounded-md border border-accent/40 bg-accent/10 px-2 py-1.5 text-[11px] font-sans font-medium text-accent hover:bg-accent/20"
                    >
                      Open Formula Inspector
                    </button>
                  </div>
                )}
              </section>
            )}

            {selectedBeam && (
              <SectionEditor
                section={selectedBeam.section ?? solidRodFromArea(selectedBeam.area)}
                materialId={selectedBeam.materialId}
                onSectionChange={(section) =>
                  onSelectedBeamSection(section, selectedBeam.materialId)
                }
                onMaterialChange={(mid) =>
                  onSelectedBeamSection(
                    selectedBeam.section ?? solidRodFromArea(selectedBeam.area),
                    mid,
                  )
                }
              />
            )}

            <section>
              <h3 className="mb-2 text-xs font-medium text-surface-300">Structure Status</h3>
              {!result ? (
                <div className="rounded-lg border border-dashed border-surface-600 px-3 py-3 text-center text-xs text-surface-400">
                  Run the FEA solver to see results
                </div>
              ) : result.unstable || !result.success ? (
                <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5 text-sm text-warn">
                  <XCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{result.message ?? 'Analysis failed'}</span>
                </div>
              ) : result.passed ? (
                <div className="flex items-center gap-2 rounded-lg border border-pass/40 bg-pass/10 px-3 py-2.5 text-sm font-semibold text-pass">
                  <CheckCircle2 size={18} />
                  PASSED — Structurally Sound
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-fail/40 bg-fail/10 px-3 py-2.5 text-sm font-semibold text-fail animate-pulse-glow">
                  <XCircle size={18} />
                  FAILED — Member Yield
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium text-surface-300">Member Results</h3>
              {!result?.success || result.members.length === 0 ? (
                <p className="text-xs text-surface-500">No member data yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-surface-700">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-surface-800 text-surface-400">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">ID</th>
                        <th className="px-2 py-1.5 font-medium">N (N)</th>
                        <th className="px-2 py-1.5 font-medium">σ</th>
                        <th className="px-2 py-1.5 font-medium">SF</th>
                        <th className="px-2 py-1.5 font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {result.members.map((m) => (
                        <tr
                          key={m.beamId}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select member ${m.beamId}`}
                          onClick={() => onFocusBeams([m.beamId])}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onFocusBeams([m.beamId]);
                            }
                          }}
                          className={`border-t border-surface-800 ${
                            selectedBeamId === m.beamId
                              ? 'bg-accent/20 text-accent'
                              : m.yielded
                              ? 'bg-fail/15 text-fail'
                              : ai.bucklingBeamIds.includes(m.beamId)
                                ? 'bg-warn/10 text-warn'
                                : 'text-surface-300'
                          } cursor-pointer transition-colors hover:bg-surface-700/60`}
                        >
                          <td className="px-2 py-1.5">
                            {m.beamId.replace(/^b_/, '').slice(-4)}
                            {ai.bucklingBeamIds.includes(m.beamId) ? ' ⚠' : ''}
                          </td>
                          <td className="px-2 py-1.5">{m.axialForce.toFixed(0)}</td>
                          <td className="px-2 py-1.5">{m.stress.toFixed(1)}</td>
                          <td className="px-2 py-1.5">
                            {m.safetyRatio > 0 ? (1 / m.safetyRatio).toFixed(2) : '∞'}
                          </td>
                          <td className="px-2 py-1.5 capitalize">
                            {m.status === 'zero' ? '—' : m.status.slice(0, 4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'analytics' && (
          <AnalyticsPanel
            nodes={nodes}
            beams={beams}
            result={result}
            materialId={materialId}
          />
        )}

        {tab === 'audit' && (
          <AuditPanel
            audit={audit}
            onFocusBeams={onFocusBeams}
            onFocusNodes={onFocusNodes}
          />
        )}

        {tab === 'ai' && (
          <AIAdvisor
            analysis={ai}
            onFocusBeams={onFocusBeams}
            onFocusNodes={onFocusNodes}
          />
        )}
      </div>
    </aside>
  );
}

function NodeNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] text-surface-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="w-full rounded-md border border-surface-700 bg-surface-900 px-2 py-1.5 font-mono text-[11px] text-surface-200 outline-none focus:border-accent"
      />
    </label>
  );
}

function HealthPanel({
  nodes,
  beams,
  result,
  ai,
  audit,
  onRunSolver,
  onFocusBeams,
  onFocusNodes,
}: {
  nodes: Node[];
  beams: Beam[];
  result: FEAResult | null;
  ai: AIAnalysis;
  audit: StructureAudit;
  onRunSolver: () => void;
  onFocusBeams: (ids: string[]) => void;
  onFocusNodes: (ids: string[]) => void;
}) {
  const geometry = audit.errors === 0 ? 25 : 0;
  const analysis = result?.success ? 25 : 0;
  const safety = result?.success
    ? Math.max(0, Math.round(25 * Math.min(1, 1 / Math.max(result.maxSafetyRatio, 0.01))))
    : 0;
  const insight = result?.success && ai.bucklingBeamIds.length === 0 ? 25 : result?.success ? 15 : 0;
  const score = geometry + analysis + safety + insight;
  const tone = score >= 85 ? 'text-pass' : score >= 55 ? 'text-warn' : 'text-accent';
  const nextIssue = audit.issues.find((issue) => issue.severity === 'error') ?? audit.issues[0];

  return (
    <>
      <section className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/15 to-surface-800/50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Design health</p>
            <h2 className="mt-1 text-lg font-semibold text-surface-100">Readiness score</h2>
          </div>
          <Gauge size={20} className={tone} />
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className={`font-mono text-4xl font-semibold ${tone}`}>{score}</span>
          <span className="mb-1 text-xs text-surface-500">/ 100</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-700">
          <div className={`h-full rounded-full transition-all duration-500 ${score >= 85 ? 'bg-pass' : score >= 55 ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${score}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-surface-400">
          {score >= 85 ? 'Ready to explain, compare, or present this design.' : 'Complete the checks below to make this design review-ready.'}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-400">Readiness checks</h3>
        <HealthCheck done={geometry === 25} label="Geometry audit" detail={audit.errors ? `${audit.errors} error(s) need attention` : 'No blocking geometry errors'} />
        <HealthCheck done={analysis === 25} label="FEA analysis" detail={result?.success ? 'Solver completed successfully' : 'Run the solver to unlock results'} />
        <HealthCheck done={safety >= 20} label="Safety margin" detail={result?.success ? `Peak utilization ${(result.maxSafetyRatio * 100).toFixed(0)}%` : 'Waiting for analysis'} />
        <HealthCheck done={insight === 25} label="Engineering insight" detail={ai.bucklingBeamIds.length ? `${ai.bucklingBeamIds.length} buckling risk(s) detected` : 'No buckling risks flagged'} />
      </section>

      {nextIssue && (
        <section className="rounded-lg border border-warn/30 bg-warn/10 p-3">
          <div className="flex gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warn" />
            <div>
              <h3 className="text-xs font-semibold text-warn">Next best action</h3>
              <p className="mt-1 text-[11px] leading-5 text-surface-300">{nextIssue.message}</p>
              {(nextIssue.beamIds || nextIssue.nodeIds) && (
                <button
                  type="button"
                  onClick={() => nextIssue.beamIds ? onFocusBeams(nextIssue.beamIds) : onFocusNodes(nextIssue.nodeIds ?? [])}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-teal-300"
                >
                  Focus affected geometry <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        <Metric label="Nodes" value={String(nodes.length)} />
        <Metric label="Members" value={String(beams.length)} />
        <Metric label="Issues" value={String(audit.errors + audit.warnings)} />
        <Metric label="Buckling flags" value={String(ai.bucklingBeamIds.length)} />
      </section>

      {!result?.success && (
        <button type="button" onClick={onRunSolver} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-surface-950 hover:bg-teal-300">
          <Gauge size={14} /> Run analysis now
        </button>
      )}
    </>
  );
}

function HealthCheck({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${done ? 'border-pass/25 bg-pass/5' : 'border-surface-700 bg-surface-800/50'}`}>
      {done ? <CheckCircle2 size={15} className="text-pass" /> : <XCircle size={15} className="text-surface-600" />}
      <div className="min-w-0">
        <div className={`text-xs font-medium ${done ? 'text-pass' : 'text-surface-200'}`}>{label}</div>
        <div className="truncate text-[10px] text-surface-500">{detail}</div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-surface-700 bg-surface-800/50 p-2.5"><div className="text-[10px] uppercase tracking-wide text-surface-500">{label}</div><div className="mt-1 font-mono text-lg text-surface-100">{value}</div></div>;
}
