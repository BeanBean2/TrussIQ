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
    const lines = pdf.splitTextToSize(text, 210 - margin * 2) as string[];
    for (const wrappedLine of lines) {
      if (y + size * 0.6 > 280) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(wrappedLine, margin, y);
      y += size * 0.5 + 2;
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
    line(result.passed ? 'Yield check: Below modeled yield limit' : 'Yield check: Modeled yield limit exceeded');
    line(`Peak |σ|/σ_yield: ${(result.maxSafetyRatio * 100).toFixed(1)}%`);
    line('Educational linear axial-only yield check. This does not certify overall safety; buckling, joints, bracing, fatigue, and code requirements are not verified.', 8);
    y += 4;

    line('Member Results', 12, 'bold');
    line('Member ID  Axial force (N)  Stress (MPa)  Yield utilization (%)  Member status', 8);

    for (const m of result.members) {
      const short = m.beamId.padEnd(10).slice(0, 10);
      const force = m.axialForce.toFixed(1).padStart(10);
      const stress = m.stress.toFixed(2).padStart(12);
      const ratio = `${(m.safetyRatio * 100).toFixed(0)}%`;
      line(`${short.trimEnd()} | ${force.trim()} | ${stress.trim()} | ${ratio} | ${m.status}`, 8);
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
  return name.replace(/[^\w-]+/g, '_').slice(0, 64) || 'trussiq';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
