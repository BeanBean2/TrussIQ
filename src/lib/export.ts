import { jsPDF } from 'jspdf';
import { getMaterial } from './materials';
import type { FEAResult, StructureDocument, StructureState } from './types';

export function exportStructureJSON(state: StructureState, name = 'TrussIQ Structure'): void {
  const doc: StructureDocument = {
    version: 1,
    name,
    exportedAt: new Date().toISOString(),
    ...state,
  };
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${sanitizeFilename(name)}.json`);
}

export function exportPDFReport(
  state: StructureState,
  result: FEAResult | null,
  name = 'TrussIQ FEA Report',
): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  let y = margin;

  const line = (text: string, size = 10, style: 'normal' | 'bold' = 'normal') => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.text(text, margin, y);
    y += size * 0.5 + 2;
    if (y > 280) {
      pdf.addPage();
      y = margin;
    }
  };

  line(name, 16, 'bold');
  line(`Generated: ${new Date().toLocaleString()}`, 9);
  y += 2;

  const mat = getMaterial(state.materialId);
  line('Material', 12, 'bold');
  line(`${mat.name}  |  E = ${mat.E} GPa  |  σ_yield = ${mat.sigmaYield} MPa`);
  line(`Default Area: ${state.defaultArea} mm²`);
  line(`Nodes: ${state.nodes.length}   Members: ${state.beams.length}`);
  y += 4;

  if (!result || !result.success) {
    line('Analysis Status', 12, 'bold');
    line(result?.message ?? 'Solver has not been run yet.');
  } else {
    line('Analysis Status', 12, 'bold');
    line(result.passed ? 'PASSED — Structurally Sound' : 'FAILED — Member Yield / Overstress');
    line(`Peak |σ|/σ_yield: ${(result.maxSafetyRatio * 100).toFixed(1)}%`);
    y += 4;

    line('Member Results', 12, 'bold');
    line('ID          Force(N)     Stress(MPa)   Ratio    Status', 8);

    for (const m of result.members) {
      const short = m.beamId.padEnd(10).slice(0, 10);
      const force = m.axialForce.toFixed(1).padStart(10);
      const stress = m.stress.toFixed(2).padStart(12);
      const ratio = `${(m.safetyRatio * 100).toFixed(0)}%`.padStart(7);
      const status = m.status.padStart(10);
      line(`${short} ${force} ${stress} ${ratio} ${status}`, 8);
    }

    y += 4;
    line('Nodal Displacements (mm)', 12, 'bold');
    for (const d of result.displacements) {
      line(`${d.nodeId}:  ux=${d.ux.toExponential(3)}  uy=${d.uy.toExponential(3)}`, 8);
    }
  }

  pdf.save(`${sanitizeFilename(name)}.pdf`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 64) || 'trussiq';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
