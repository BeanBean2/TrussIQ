/**
 * Educational structural study PDF — jsPDF + optional canvas screenshot.
 */

import { jsPDF } from 'jspdf';
import type { AIAnalysis, FEAResult, MassCostSummary, StructureState } from './types';
import { getMaterial } from './materials';

export interface ReportOptions {
  name?: string;
  state: StructureState;
  result: FEAResult | null;
  ai: AIAnalysis | null;
  massCost: MassCostSummary;
  /** Data URL (PNG) of the canvas heatmap, if available */
  canvasImage?: string | null;
}

export async function generateOfficialReport(opts: ReportOptions): Promise<void> {
  const {
    name = 'TrussIQ Structural Study Report',
    state,
    result,
    ai,
    massCost,
    canvasImage,
  } = opts;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageW = 210;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > 285) {
      pdf.addPage();
      y = margin;
    }
  };

  const h = (text: string, size = 14) => {
    ensure(size * 0.6 + 4);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(size);
    pdf.setTextColor(15, 23, 42);
    pdf.text(text, margin, y);
    y += size * 0.55 + 3;
  };

  const p = (text: string, size = 9, color: [number, number, number] = [51, 65, 85]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, pageW - margin * 2) as string[];
    for (const line of lines) {
      ensure(5);
      pdf.text(line, margin, y);
      y += 4.2;
    }
  };

  // --- Cover header ---
  pdf.setFillColor(14, 165, 164);
  pdf.rect(0, 0, pageW, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('TrussIQ', margin, 12);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Educational Structural Analysis Report', margin, 20);
  y = 36;

  p(`Generated: ${new Date().toLocaleString()}`, 8, [100, 116, 139]);
  p(name, 11);
  y += 2;

  // --- Screenshot ---
  if (canvasImage) {
    h('1. Stress Heatmap', 12);
    try {
      const imgW = pageW - margin * 2;
      const imgH = 70;
      ensure(imgH + 4);
      pdf.addImage(canvasImage, 'PNG', margin, y, imgW, imgH);
      y += imgH + 6;
    } catch {
      p('(Canvas screenshot unavailable)');
    }
  }

  // --- Project summary ---
  h('2. Project Summary', 12);
  const mat = getMaterial(state.materialId);
  const totalLoad = state.nodes.reduce((s, n) => s + Math.hypot(n.fx, n.fy), 0);
  let maxDefl = 0;
  if (result?.success) {
    for (const d of result.displacements) {
      maxDefl = Math.max(maxDefl, Math.hypot(d.ux, d.uy));
    }
  }

  p(`Material: ${mat.name}  |  E = ${mat.E} GPa  |  σ_yield = ${mat.sigmaYield} MPa`);
  p(
    `Nodes: ${state.nodes.length}   Members: ${state.beams.length}   Default A: ${state.defaultArea} mm²`,
  );
  p(`Total applied load magnitude: ${totalLoad.toFixed(1)} N`);
  p(`Total member length: ${massCost.totalLengthMm.toFixed(0)} mm`);
  p(
    `Estimated mass: ${massCost.totalMassG.toFixed(1)} g   |   Est. cost: $${massCost.estimatedCostUSD.toFixed(2)}`,
  );
  p(`Maximum nodal deflection |u|: ${result?.success ? maxDefl.toExponential(3) + ' mm' : 'N/A'}`);

  if (!result?.success) {
    p(`Global status: NOT SOLVED — ${result?.message ?? 'Run FEA first.'}`, 9, [180, 83, 9]);
  } else if (result.passed) {
    p(
      `Yield check: BELOW YIELD — peak |σ|/σ_yield = ${(result.maxSafetyRatio * 100).toFixed(1)}%`,
      9,
      [22, 163, 74],
    );
  } else {
    p(
      `Yield check: EXCEEDED — peak |σ|/σ_yield = ${(result.maxSafetyRatio * 100).toFixed(1)}%`,
      9,
      [220, 38, 38],
    );
  }
  y += 3;
  p('Scope: educational linear, axial-only truss analysis. Below-yield results do not establish overall structural safety. Buckling is screened separately; connections, bracing, fatigue, and building-code requirements are not verified.', 8, [100, 116, 139]);
  y += 3;

  // --- Member table ---
  h('3. FEA Member Results', 12);
  if (!result?.success) {
    p('No member data — solver has not produced a successful solution.');
  } else {
    p('ID | Force(N) | Stress(MPa) | Strain | Type | Yield%', 8);
    y += 1;
    for (const m of result.members) {
      const beam = state.beams.find((b) => b.id === m.beamId);
      const E = getMaterial(beam?.materialId ?? state.materialId).E * 1000; // N/mm²
      const eps = E > 0 ? m.stress / E : 0; // strain = σ / E
      const row =
        `${m.beamId.slice(-6).padEnd(8)} ` +
        `${m.axialForce.toFixed(1).padStart(9)} ` +
        `${m.stress.toFixed(2).padStart(10)} ` +
        `${eps.toExponential(2).padStart(10)} ` +
        `${m.status.slice(0, 4).padStart(5)} ` +
        `${(m.safetyRatio * 100).toFixed(0).padStart(5)}%`;
      p(row, 7);
    }
  }
  y += 3;

  // --- AI recommendations ---
  h('4. Local Rule-Based Engineering Guidance', 12);
  if (!ai || ai.items.length === 0) {
    p('No guidance available for this model.');
  } else {
    for (const item of ai.items) {
      ensure(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      const color =
        item.severity === 'critical'
          ? ([220, 38, 38] as [number, number, number])
          : item.severity === 'warning'
            ? ([180, 83, 9] as [number, number, number])
            : item.severity === 'success'
              ? ([22, 163, 74] as [number, number, number])
              : ([51, 65, 85] as [number, number, number]);
      pdf.setTextColor(...color);
      pdf.text(`[${item.severity.toUpperCase()}] ${item.title}`, margin, y);
      y += 4.5;
      p(item.message, 8);
      y += 2;
    }
  }

  y += 4;
  p('— End of Report — TrussIQ Direct Stiffness Method Engine —', 8, [148, 163, 184]);

  pdf.save(`${sanitize(name)}.pdf`);
}

function sanitize(name: string): string {
  return name.replace(/[^\w-]+/g, '_').slice(0, 64) || 'trussiq_report';
}

/** Capture an HTMLCanvasElement as a PNG data URL. */
export function captureCanvasPNG(canvas: HTMLCanvasElement | null): string | null {
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
