import { scoreDesign, type DesignScore } from './designScore';
import { computeMassCost } from './massCost';
import { getMaterial } from './materials';
import type { Beam, FEAResult, Node, StructureState } from './types';

export const SUMMARY_FORMAT = 'trussiq.summary' as const;
export const SUMMARY_DISCLAIMER =
  'TrussIQ results are educational estimates from a linear, axial-only Direct Stiffness Method model. They are not certified construction blueprints, code compliance, or professional engineering approval.';

/** Optional fields that may identify a student — excluded from exports unless consent is given. */
export interface PersonalShareFields {
  author?: string;
  course?: string;
}

export interface ProjectSummaryInput {
  title: string;
  state: StructureState;
  result: FEAResult | null;
  reflection: string;
  canvasImage: string | null;
  /** Must be true to include author/course in the exported payload. */
  includePersonalFields: boolean;
  personal?: PersonalShareFields;
  massBudgetKg?: number;
  maxDeflectionMm?: number;
}

export interface ProjectSummaryDocument {
  format: typeof SUMMARY_FORMAT;
  version: 1;
  title: string;
  createdAt: string;
  privacy: {
    includePersonalFields: boolean;
    note: string;
  };
  personal?: PersonalShareFields;
  model: {
    nodeCount: number;
    beamCount: number;
    materialId: string;
    materialName: string;
    defaultAreaMm2: number;
    massKg: number;
    estimatedCostUSD: number;
  };
  visualization: {
    imageDataUrl: string | null;
  };
  analysis: {
    success: boolean;
    message: string | null;
    passedYieldScreen: boolean | null;
    peakUtilizationPct: number | null;
    peakDeflectionMm: number | null;
    memberCount: number | null;
    tensionCount: number | null;
    compressionCount: number | null;
  };
  designScore: DesignScore;
  reflection: string;
  disclaimer: string;
}

export function buildProjectSummary(input: ProjectSummaryInput): ProjectSummaryDocument {
  const { state, result } = input;
  const mass = computeMassCost(state.nodes, state.beams);
  const material = getMaterial(state.materialId);
  const massBudgetKg = input.massBudgetKg ?? 50;
  const maxDeflectionMm = input.maxDeflectionMm ?? 25;
  const designScore = result
    ? scoreDesign(state.nodes, state.beams, result, massBudgetKg, maxDeflectionMm)
    : {
        score: 0,
        massKg: mass.totalMassG / 1000,
        utilization: null,
        maxDeflection: null,
        stable: false,
        feasible: false,
        explanation: 'Run FEA before scoring this design.',
      };

  const defl =
    result?.success
      ? Math.max(0, ...result.displacements.map((d) => Math.hypot(d.ux, d.uy)))
      : null;

  const personal =
    input.includePersonalFields && input.personal
      ? {
          author: input.personal.author?.trim() || undefined,
          course: input.personal.course?.trim() || undefined,
        }
      : undefined;

  const cleanedPersonal =
    personal && (personal.author || personal.course)
      ? {
          ...(personal.author ? { author: personal.author } : {}),
          ...(personal.course ? { course: personal.course } : {}),
        }
      : undefined;

  return {
    format: SUMMARY_FORMAT,
    version: 1,
    title: input.title.trim() || 'TrussIQ project summary',
    createdAt: new Date().toISOString(),
    privacy: {
      includePersonalFields: Boolean(cleanedPersonal),
      note: cleanedPersonal
        ? 'Student chose to include optional personal fields in this export.'
        : 'Personal fields (name, course) were excluded by default.',
    },
    ...(cleanedPersonal ? { personal: cleanedPersonal } : {}),
    model: {
      nodeCount: state.nodes.length,
      beamCount: state.beams.length,
      materialId: state.materialId,
      materialName: material.name,
      defaultAreaMm2: state.defaultArea,
      massKg: mass.totalMassG / 1000,
      estimatedCostUSD: mass.estimatedCostUSD,
    },
    visualization: {
      imageDataUrl: input.canvasImage,
    },
    analysis: {
      success: Boolean(result?.success),
      message: result?.success ? null : (result?.message ?? 'No FEA result yet'),
      passedYieldScreen: result?.success ? result.passed : null,
      peakUtilizationPct: result?.success ? result.maxSafetyRatio * 100 : null,
      peakDeflectionMm: defl,
      memberCount: result?.success ? result.members.length : null,
      tensionCount: result?.success
        ? result.members.filter((m) => m.status === 'tension').length
        : null,
      compressionCount: result?.success
        ? result.members.filter((m) => m.status === 'compression').length
        : null,
    },
    designScore,
    reflection: input.reflection.trim().slice(0, 4000),
    disclaimer: SUMMARY_DISCLAIMER,
  };
}

export function downloadProjectSummaryJson(doc: ProjectSummaryDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(doc.title)}.summary.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Self-contained HTML summary students can open or print/share. */
export function downloadProjectSummaryHtml(doc: ProjectSummaryDocument): void {
  const html = renderSummaryHtml(doc);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(doc.title)}.summary.html`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderSummaryHtml(doc: ProjectSummaryDocument): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const score = doc.designScore;
  const img = doc.visualization.imageDataUrl
    ? `<img src="${doc.visualization.imageDataUrl}" alt="Structural model visualization" style="width:100%;max-height:360px;object-fit:contain;border-radius:12px;border:1px solid #334155;background:#0f172a"/>`
    : `<p class="muted">No canvas snapshot was available when this summary was created.</p>`;
  const personal = doc.personal
    ? `<p><strong>Student / team:</strong> ${esc(doc.personal.author ?? '—')}<br/><strong>Course:</strong> ${esc(doc.personal.course ?? '—')}</p>`
    : `<p class="muted">Personal fields omitted (privacy default).</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(doc.title)} — TrussIQ summary</title>
<style>
  :root { color-scheme: light dark; font-family: "Segoe UI", system-ui, sans-serif; }
  body { margin: 0; background: #0b1220; color: #e2e8f0; }
  main { max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  h1 { font-size: 1.6rem; margin: 0 0 .35rem; }
  h2 { font-size: 1rem; letter-spacing: .04em; text-transform: uppercase; color: #5eead4; margin: 1.75rem 0 .6rem; }
  .card { background: #111827; border: 1px solid #334155; border-radius: 14px; padding: 1rem 1.1rem; margin-top: .75rem; }
  .muted { color: #94a3b8; font-size: .9rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .75rem; }
  .stat strong { display: block; font-size: 1.15rem; color: #f8fafc; }
  .stat span { font-size: .75rem; color: #94a3b8; }
  .warn { border-color: #ca8a04; background: #42200633; color: #fbbf24; font-size: .85rem; line-height: 1.45; }
  .reflect { white-space: pre-wrap; line-height: 1.55; }
</style>
</head>
<body>
<main>
  <p class="muted">TrussIQ project summary · ${esc(new Date(doc.createdAt).toLocaleString())}</p>
  <h1>${esc(doc.title)}</h1>
  ${personal}
  <div class="card warn" role="note"><strong>Educational estimate only.</strong> ${esc(doc.disclaimer)}</div>

  <h2>Model visualization</h2>
  <div class="card">${img}</div>

  <h2>Design score</h2>
  <div class="card grid">
    <div class="stat"><strong>${score.score.toFixed(0)}</strong><span>/ 100 classroom score</span></div>
    <div class="stat"><strong>${score.massKg.toFixed(3)} kg</strong><span>Estimated mass</span></div>
    <div class="stat"><strong>${score.feasible ? 'Pass' : 'Not yet'}</strong><span>Feasible vs limits</span></div>
  </div>
  <p class="muted">${esc(score.explanation)}</p>

  <h2>FEA analysis</h2>
  <div class="card grid">
    <div class="stat"><strong>${doc.analysis.success ? 'Solved' : 'Unsolved'}</strong><span>Solver</span></div>
    <div class="stat"><strong>${doc.analysis.peakUtilizationPct == null ? '—' : `${doc.analysis.peakUtilizationPct.toFixed(1)}%`}</strong><span>Peak utilization</span></div>
    <div class="stat"><strong>${doc.analysis.peakDeflectionMm == null ? '—' : `${doc.analysis.peakDeflectionMm.toFixed(2)} mm`}</strong><span>Peak |u|</span></div>
    <div class="stat"><strong>${doc.model.nodeCount} / ${doc.model.beamCount}</strong><span>Joints / members</span></div>
  </div>
  ${doc.analysis.message ? `<p class="muted">${esc(doc.analysis.message)}</p>` : ''}

  <h2>Student reflection</h2>
  <div class="card reflect">${doc.reflection ? esc(doc.reflection) : '<span class="muted">No reflection written.</span>'}</div>

  <p class="muted" style="margin-top:2rem">${esc(doc.privacy.note)}</p>
</main>
</body>
</html>`;
}

function sanitize(name: string): string {
  return name.replace(/[^\w-]+/g, '_').slice(0, 64) || 'trussiq-summary';
}

/** Lightweight helper for smoke tests / callers that only need score context. */
export function summarizeStructureForScore(
  nodes: Node[],
  beams: Beam[],
  result: FEAResult | null,
): DesignScore {
  if (!result) {
    return {
      score: 0,
      massKg: computeMassCost(nodes, beams).totalMassG / 1000,
      utilization: null,
      maxDeflection: null,
      stable: false,
      feasible: false,
      explanation: 'Run FEA before scoring this design.',
    };
  }
  return scoreDesign(nodes, beams, result, 50, 25);
}
