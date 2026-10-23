import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { SectionParams } from '../lib/crossSections';
import { solidRodFromArea } from '../lib/crossSections';
import { MATERIALS } from '../lib/materials';
import type { AIAnalysis, Beam, FEAResult, Node } from '../lib/types';
import { AIAdvisor } from './AIAdvisor';
import { AnalyticsPanel } from './AnalyticsPanel';
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
  onOpenFormula: () => void;
  onFocusBeams: (ids: string[]) => void;
  onFocusNodes: (ids: string[]) => void;
}

type Tab = 'inspect' | 'analytics' | 'ai';

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
  onOpenFormula,
  onFocusBeams,
  onFocusNodes,
}: SidebarProps) {
  const [tab, setTab] = useState<Tab>('inspect');
  const selectedBeam = beams.find((b) => b.id === selectedBeamId) ?? null;
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const mat = MATERIALS.find((m) => m.id === materialId);

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-l border-surface-700 bg-surface-900">
      <div className="flex border-b border-surface-700">
        {(
          [
            ['inspect', 'Inspect'],
            ['analytics', 'Analytics'],
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
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
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
                  <div className="font-mono text-[11px] text-surface-300">
                    <div>Node {selectedNode.id}</div>
                    <div>
                      ({selectedNode.x.toFixed(0)}, {selectedNode.y.toFixed(0)}) mm
                    </div>
                    <div>Support: {selectedNode.support}</div>
                    <div>
                      F = ({selectedNode.fx.toFixed(0)}, {selectedNode.fy.toFixed(0)}) N
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
                          className={`border-t border-surface-800 ${
                            m.yielded
                              ? 'bg-fail/15 text-fail'
                              : ai.bucklingBeamIds.includes(m.beamId)
                                ? 'bg-warn/10 text-warn'
                                : 'text-surface-300'
                          }`}
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
