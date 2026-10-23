import { Calculator, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FormulaBreakdown } from '../lib/types';

interface FormulaInspectorProps {
  data: FormulaBreakdown;
  onClose: () => void;
}

function fmt(n: number, d = 4): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) > 0 && Math.abs(n) < 1e-3) return n.toExponential(3);
  return n.toFixed(d);
}

function Matrix4({ m }: { m: number[][] }) {
  return (
    <div className="inline-grid grid-cols-4 gap-x-2 gap-y-0.5 rounded-lg border border-surface-700 bg-surface-800 px-2 py-1.5 font-mono text-[10px] text-surface-300">
      {m.flat().map((v, i) => (
        <span key={i} className="text-right tabular-nums">
          {fmt(v, 2)}
        </span>
      ))}
    </div>
  );
}

export function FormulaInspector({ data, onClose }: FormulaInspectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-surface-700 bg-surface-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-surface-100">
              Formula Inspector — DSM Steps
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-800"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 text-sm">
          <p className="text-xs text-surface-400">
            Member <span className="font-mono text-accent">{data.beamId}</span> between{' '}
            <span className="font-mono">{data.nodeI}</span> →{' '}
            <span className="font-mono">{data.nodeJ}</span>
          </p>

          <Section title="1. Geometry & Direction Cosines">
            <Eq>
              L = √(Δx² + Δy²) = <Val>{fmt(data.L, 2)}</Val> mm
            </Eq>
            <Eq>
              θ = atan2(Δy, Δx) = <Val>{fmt(data.thetaDeg, 2)}</Val>°
            </Eq>
            <Eq>
              c = cos θ = <Val>{fmt(data.c)}</Val>
              {' · '}
              s = sin θ = <Val>{fmt(data.s)}</Val>
            </Eq>
          </Section>

          <Section title="2. Element Stiffness kᵉ (global coords)">
            <Eq>
              EA/L = ({fmt(data.E_GPa, 1)}×10³ N/mm² · {fmt(data.A, 0)} mm²) / {fmt(data.L, 2)} ={' '}
              <Val>{fmt(data.EA_over_L, 2)}</Val> N/mm
            </Eq>
            <p className="mb-1 text-[11px] text-surface-400">
              kᵉ = (EA/L) · [[c², cs, −c², −cs], …]
            </p>
            <Matrix4 m={data.kLocal} />
            <p className="mt-2 text-[11px] text-surface-400">
              This 4×4 block is assembled into K_global at DOFs of the two end nodes, then reduced
              by removing constrained DOFs before solving K_red u = F.
            </p>
          </Section>

          <Section title="3. Nodal Displacements (from solver)">
            <Eq>
              u₁ = (<Val>{fmt(data.ux1, 6)}</Val>, <Val>{fmt(data.uy1, 6)}</Val>) mm
            </Eq>
            <Eq>
              u₂ = (<Val>{fmt(data.ux2, 6)}</Val>, <Val>{fmt(data.uy2, 6)}</Val>) mm
            </Eq>
          </Section>

          <Section title="4. Axial Force & Stress">
            <Eq>
              ΔL = (uₓ₂ − uₓ₁)c + (uᵧ₂ − uᵧ₁)s = <Val>{fmt(data.deltaL, 6)}</Val> mm
            </Eq>
            <Eq>
              N = (EA/L)·ΔL = <Val>{fmt(data.axialForce, 2)}</Val> N ({data.status})
            </Eq>
            <Eq>
              σ = N/A = <Val>{fmt(data.stress, 3)}</Val> MPa
            </Eq>
            <Eq>
              ε = ΔL/L = <Val>{fmt(data.strain, 6)}</Val>
            </Eq>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5 rounded-lg border border-surface-700 bg-surface-800/40 px-3 py-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-accent">{title}</h3>
      {children}
    </section>
  );
}

function Eq({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[11px] leading-relaxed text-surface-300">{children}</div>;
}

function Val({ children }: { children: ReactNode }) {
  return <span className="text-warn font-semibold">{children}</span>;
}
