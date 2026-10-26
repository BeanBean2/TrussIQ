import { jsPDF } from 'jspdf';
import { getMaterial } from './materials';
import { scoreDesign } from './designScore';
import type { FEAResult, StructureState } from './types';

export interface WorksheetBrief {
  title?: string;
  author?: string;
  course?: string;
  objective?: string;
}

/** Classroom lab worksheet: fill-in prompts plus optional solved evidence. */
export function exportLabWorksheet(
  state: StructureState,
  result: FEAResult | null,
  brief: WorksheetBrief = {},
): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
  const margin = 16;
  let y = margin;
  const width = 216 - margin * 2;

  const line = (text: string, size = 10, style: 'normal' | 'bold' = 'normal') => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, width) as string[];
    for (const wrapped of lines) {
      if (y > 265) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(wrapped, margin, y);
      y += size * 0.45 + 2.2;
    }
  };

  const blank = (label: string, rows = 2) => {
    line(label, 9, 'bold');
    for (let i = 0; i < rows; i++) {
      if (y > 265) {
        pdf.addPage();
        y = margin;
      }
      pdf.setDrawColor(180);
      pdf.line(margin, y + 1, margin + width, y + 1);
      y += 8;
    }
  };

  const title = brief.title?.trim() || 'TrussIQ classroom lab worksheet';
  line('TrussIQ', 16, 'bold');
  line(title, 12, 'bold');
  line(`Generated ${new Date().toLocaleString()} · Educational estimate only (not construction certification)`, 8);
  y += 2;

  line('Student / class', 11, 'bold');
  line(`Name: ${brief.author?.trim() || '________________________'}    Course: ${brief.course?.trim() || '________________'}`, 9);
  line(`Objective: ${brief.objective?.trim() || 'Explain how this truss carries load using FEA evidence.'}`, 9);
  y += 2;

  const mat = getMaterial(state.materialId);
  line('Model snapshot', 11, 'bold');
  line(
    `Nodes: ${state.nodes.length} · Members: ${state.beams.length} · Material: ${mat.name} (E=${mat.E} GPa, σy=${mat.sigmaYield} MPa) · Default area ${state.defaultArea} mm²`,
    9,
  );

  if (result?.success) {
    const scored = scoreDesign(state.nodes, state.beams, result, 50, 25);
    line(
      `FEA: peak yield utilization ${(result.maxSafetyRatio * 100).toFixed(1)}% · ${result.passed ? 'below yield screen' : 'yield screen exceeded'} · mass ${scored.massKg.toFixed(3)} kg · max |u| ${(scored.maxDeflection ?? 0).toExponential(2)} mm`,
      9,
    );
    line(scored.explanation, 8);
  } else {
    line(`FEA: ${result?.message ?? 'Not solved yet — run analysis before turning this in.'}`, 9);
  }
  y += 3;

  line('Lab questions (write in your own words)', 11, 'bold');
  blank('1. Which members are primarily in tension? Which are in compression? How do you know?', 3);
  blank('2. What happens to peak utilization if you change material or cross-section? Cite a number from TrussIQ.', 3);
  blank('3. Name one effect this linear axial-only model does NOT check (for example buckling of a slender member, joint detailing, dynamic wind gusts).', 3);
  blank('4. One design change you would make next, and why.', 2);

  y += 2;
  line('Teacher / peer check', 11, 'bold');
  line('[ ] Model has supports and loads    [ ] FEA run shown    [ ] Reflection uses evidence    [ ] Scope disclaimer understood', 8);
  blank('Comments', 2);

  pdf.save('trussiq-lab-worksheet.pdf');
}
