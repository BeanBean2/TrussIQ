import { Copy, FlipHorizontal2, FlipVertical2, Move, RotateCw, Scaling, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { nextId } from '../lib/ids';
import type { StructureState } from '../lib/types';

function center(state: StructureState) {
  if (state.nodes.length === 0) return { x: 0, y: 0 };
  const xs = state.nodes.map((node) => node.x);
  const ys = state.nodes.map((node) => node.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

export function GeometryTools({ state, onApply, onClose }: {
  state: StructureState;
  onApply: (next: StructureState) => void;
  onClose: () => void;
}) {
  const dialogRef = useAccessibleDialog(onClose);
  const [dx, setDx] = useState(40);
  const [dy, setDy] = useState(0);
  const [scale, setScale] = useState(1.1);
  const [angle, setAngle] = useState(15);
  const [totalLoad, setTotalLoad] = useState(1000);
  const middle = useMemo(() => center(state), [state]);

  const translate = () => transform((node) => ({ ...node, x: node.x + dx, y: node.y + dy }));
  const mirrorVertical = () => transform((node) => ({ ...node, x: 2 * middle.x - node.x, fx: -node.fx }));
  const mirrorHorizontal = () => transform((node) => ({ ...node, y: 2 * middle.y - node.y, fy: -node.fy }));
  const rotate = () => {
    const radians = (angle * Math.PI) / 180;
    transform((node) => {
      const x = node.x - middle.x;
      const y = node.y - middle.y;
      return { ...node, x: middle.x + x * Math.cos(radians) - y * Math.sin(radians), y: middle.y + x * Math.sin(radians) + y * Math.cos(radians), fx: node.fx * Math.cos(radians) - node.fy * Math.sin(radians), fy: node.fx * Math.sin(radians) + node.fy * Math.cos(radians) };
    });
  };
  const scaleGeometry = () => transform((node) => ({ ...node, x: middle.x + (node.x - middle.x) * scale, y: middle.y + (node.y - middle.y) * scale }));
  const scaleLoads = (factor: number) => onApply({ ...state, nodes: state.nodes.map((node) => ({ ...node, fx: node.fx * factor, fy: node.fy * factor })) });
  const clearLoads = () => onApply({ ...state, nodes: state.nodes.map((node) => ({ ...node, fx: 0, fy: 0 })) });
  const removeIsolated = () => {
    const used = new Set(state.beams.flatMap((beam) => [beam.nodeI, beam.nodeJ]));
    onApply({ ...state, nodes: state.nodes.filter((node) => used.has(node.id)) });
  };
  const clone = () => {
    const ids = new Map(state.nodes.map((node) => [node.id, nextId('n')]));
    const copies = state.nodes.map((node) => ({ ...node, id: ids.get(node.id)!, x: node.x + dx, y: node.y + dy }));
    const beamCopies = state.beams.map((beam) => ({ ...beam, id: nextId('b'), nodeI: ids.get(beam.nodeI) ?? beam.nodeI, nodeJ: ids.get(beam.nodeJ) ?? beam.nodeJ }));
    onApply({ ...state, nodes: [...state.nodes, ...copies], beams: [...state.beams, ...beamCopies] });
  };
  const distributeDeckLoad = () => {
    if (state.nodes.length === 0) return;
    const bottomY = Math.max(...state.nodes.map((node) => node.y));
    const deckNodes = state.nodes.filter((node) => Math.abs(node.y - bottomY) < 1e-6);
    const share = totalLoad / Math.max(deckNodes.length, 1);
    const deckIds = new Set(deckNodes.map((node) => node.id));
    onApply({ ...state, nodes: state.nodes.map((node) => deckIds.has(node.id) ? { ...node, fy: node.fy + share } : node) });
  };

  function transform(mapNode: (node: StructureState['nodes'][number]) => StructureState['nodes'][number]) {
    onApply({ ...state, nodes: state.nodes.map(mapNode) });
  }

  const hasModel = state.nodes.length > 0;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[5vh] backdrop-blur-sm">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Geometry and load tools" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Model operations</p><h2 className="mt-1 text-lg font-semibold text-surface-100">Geometry & load toolbelt</h2><p className="mt-1 text-xs text-surface-400">Every action enters undo history. Transforms operate around the model center.</p></div><button type="button" onClick={onClose} aria-label="Close geometry tools" className="rounded-lg p-2 text-surface-400 hover:bg-surface-800"><X size={17} /></button></header>
        {!hasModel ? <p className="p-8 text-center text-sm text-surface-400">Load or create a model to use geometry tools.</p> : <div className="grid gap-4 p-5 sm:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-surface-700 bg-surface-800/40 p-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-surface-100"><Move size={14} className="text-accent" /> Move & copy</h3><div className="grid grid-cols-2 gap-2"><NumberField label="ΔX (mm)" value={dx} setValue={setDx} /><NumberField label="ΔY (mm)" value={dy} setValue={setDy} /></div><div className="grid grid-cols-2 gap-2"><Action onClick={translate}>Translate model</Action><Action onClick={clone}><Copy size={12} /> Duplicate with offset</Action></div></section>
          <section className="space-y-3 rounded-xl border border-surface-700 bg-surface-800/40 p-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-surface-100"><Scaling size={14} className="text-accent" /> Resize & rotate</h3><div className="grid grid-cols-2 gap-2"><NumberField label="Geometry scale" value={scale} setValue={setScale} min={0.01} step={0.05} /><NumberField label="Rotation (degrees)" value={angle} setValue={setAngle} /></div><div className="grid grid-cols-2 gap-2"><Action onClick={scaleGeometry}>Scale coordinates</Action><Action onClick={rotate}><RotateCw size={12} /> Rotate geometry & loads</Action></div></section>
          <section className="space-y-3 rounded-xl border border-surface-700 bg-surface-800/40 p-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-surface-100"><FlipHorizontal2 size={14} className="text-accent" /> Reflect & clean</h3><div className="grid grid-cols-2 gap-2"><Action onClick={mirrorVertical}><FlipHorizontal2 size={12} /> Mirror left/right</Action><Action onClick={mirrorHorizontal}><FlipVertical2 size={12} /> Mirror top/bottom</Action></div><Action onClick={removeIsolated}>Remove unconnected nodes</Action><p className="text-[10px] text-surface-500">Reflections also reverse the corresponding load component.</p></section>
          <section className="space-y-3 rounded-xl border border-surface-700 bg-surface-800/40 p-4"><h3 className="text-xs font-semibold text-surface-100">Loads</h3><NumberField label="Total downward deck load (N)" value={totalLoad} setValue={setTotalLoad} min={0} step={100} /><Action onClick={distributeDeckLoad}>Distribute to bottom chord nodes</Action><div className="grid grid-cols-2 gap-2"><Action onClick={() => scaleLoads(1.5)}>Factor loads ×1.5</Action><Action onClick={() => scaleLoads(-1)}>Reverse all load directions</Action></div><Action onClick={clearLoads}>Clear all nodal loads</Action></section>
        </div>}
        <footer className="border-t border-surface-700 px-5 py-3 text-[10px] text-surface-500">Coordinate operations preserve member sections. Confirm supports and load directions after large transforms.</footer>
      </section>
    </div>
  );
}

function NumberField({ label, value, setValue, min = -10000, step = 10 }: { label: string; value: number; setValue: (value: number) => void; min?: number; step?: number }) {
  return <label className="space-y-1 text-[10px] text-surface-500"><span>{label}</span><input type="number" value={value} min={min} step={step} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) setValue(next); }} className="w-full rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-2 font-mono text-xs text-surface-200 outline-none focus:border-accent" /></label>;
}

function Action({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-[10px] font-medium text-surface-300 hover:border-accent/50 hover:text-accent">{children}</button>;
}
