import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computeMassCost } from '../lib/massCost';
import { getMaterial } from '../lib/materials';
import type { Beam, FEAResult, Node } from '../lib/types';

interface AnalyticsPanelProps {
  nodes: Node[];
  beams: Beam[];
  result: FEAResult | null;
  materialId: string;
}

export function AnalyticsPanel({ nodes, beams, result, materialId }: AnalyticsPanelProps) {
  const mass = computeMassCost(nodes, beams);
  const mat = getMaterial(materialId);

  const forceData =
    result?.success
      ? result.members.map((m, i) => ({
          name: `M${i}`,
          force: Number(m.axialForce.toFixed(1)),
          fill: m.axialForce >= 0 ? '#22c55e' : '#38bdf8',
        }))
      : [];

  const sfData =
    result?.success
      ? result.members.map((m, i) => {
          const sf = m.safetyRatio > 1e-9 ? 1 / m.safetyRatio : 99;
          const capped = Math.min(sf, 20);
          return {
            name: `M${i}`,
            sf: Number(capped.toFixed(2)),
            fill: m.yielded ? '#ef4444' : m.safetyRatio >= 0.5 ? '#eab308' : '#22c55e',
          };
        })
      : [];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
        Live Analytics
      </h3>

      {/* Mass & cost */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Mass" value={`${mass.totalMassG.toFixed(1)} g`} />
        <Stat label="Est. Cost" value={`$${mass.estimatedCostUSD.toFixed(2)}`} />
        <Stat label="Length" value={`${(mass.totalLengthMm / 1000).toFixed(2)} m`} />
        <Stat label="Members" value={`${mass.memberCount}`} />
      </div>
      <p className="text-[10px] text-surface-400">
        Cost model: {mat.name} @ ${mat.costUSDPerKg}/kg · ρ = {mat.density} g/cm³
      </p>

      {!result?.success ? (
        <p className="rounded-lg border border-dashed border-surface-600 px-3 py-4 text-center text-xs text-surface-400">
          Run FEA to populate force & safety charts
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-surface-700 bg-surface-800/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-medium text-surface-300">Support reactions</h4>
              <span className="font-mono text-[10px] text-surface-500">global forces</span>
            </div>
            <div className="mt-2 space-y-1.5 font-mono text-[10px]">
              {(result.reactions ?? [])
                .filter((reaction) => Math.abs(reaction.fx) > 1e-6 || Math.abs(reaction.fy) > 1e-6)
                .map((reaction) => (
                  <div key={reaction.nodeId} className="flex items-center justify-between text-surface-400">
                    <span>{reaction.nodeId}</span>
                    <span className="text-surface-200">
                      Rx {reaction.fx.toFixed(1)} N · Ry {reaction.fy.toFixed(1)} N
                    </span>
                  </div>
                ))}
              {(result.reactions ?? []).every(
                (reaction) => Math.abs(reaction.fx) <= 1e-6 && Math.abs(reaction.fy) <= 1e-6,
              ) && <span className="text-surface-500">No non-zero reactions reported.</span>}
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-[11px] font-medium text-surface-300">
              Force Distribution (N)
            </h4>
            <p className="mb-2 text-[10px] text-surface-400">
              Green = tension (+) · Blue = compression (−)
            </p>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forceData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#18212c',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="force" radius={[2, 2, 0, 0]}>
                    {forceData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-[11px] font-medium text-surface-300">
              Safety Factor (σ_y / |σ|)
            </h4>
            <p className="mb-2 text-[10px] text-surface-400">Capped at 20 for readability</p>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sfData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#18212c',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="4 2" />
                  <Bar dataKey="sf" radius={[2, 2, 0, 0]}>
                    {sfData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800/60 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-surface-400">{label}</div>
      <div className="font-mono text-sm font-semibold text-accent">{value}</div>
    </div>
  );
}
