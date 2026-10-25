import { CheckCircle2, Download, Lightbulb, Presentation, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { StructureAudit } from '../lib/structureAudit';
import type { AIAnalysis, Beam, FEAResult, Node } from '../lib/types';

interface ImpactDashboardProps {
  nodes: Node[];
  beams: Beam[];
  result: FEAResult | null;
  ai: AIAnalysis;
  audit: StructureAudit;
  onClose: () => void;
}

const LEARNING_GOALS = [
  'I can explain how a truss transfers load.',
  'I used evidence from FEA to improve my design.',
  'I checked safety, stability, and material trade-offs.',
  'I can communicate one design decision clearly.',
];

export function ImpactDashboard({ nodes, beams, result, ai, audit, onClose }: ImpactDashboardProps) {
  const [checkedGoals, setCheckedGoals] = useState<boolean[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('trussiq-learning-goals') ?? '[]');
      return LEARNING_GOALS.map((_, index) => saved[index] === true);
    } catch {
      return LEARNING_GOALS.map(() => false);
    }
  });

  const evidence = useMemo(() => {
    const safety = result?.success ? `${(1 / Math.max(result.maxSafetyRatio, 0.001)).toFixed(2)}× safety factor` : 'Run FEA to measure safety';
    const status = audit.errors === 0 ? 'No structural audit errors' : `${audit.errors} audit item${audit.errors === 1 ? '' : 's'} to review`;
    return { safety, status };
  }, [audit.errors, result]);

  const progress = checkedGoals.filter(Boolean).length;
  const presentationScript = `TrussIQ helped me investigate a structure with ${nodes.length} nodes and ${beams.length} members. I modeled the geometry, ran finite element analysis, and used the evidence to evaluate safety and design trade-offs. My next improvement is to ${result?.success ? 'compare the strongest design choice with a lighter alternative' : 'run the first analysis and document what the forces reveal'}.`;

  const toggleGoal = (index: number) => {
    const next = checkedGoals.map((checked, goalIndex) => goalIndex === index ? !checked : checked);
    setCheckedGoals(next);
    localStorage.setItem('trussiq-learning-goals', JSON.stringify(next));
  };

  const exportImpact = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      evidence,
      learningGoals: LEARNING_GOALS.map((label, index) => ({ label, complete: checkedGoals[index] })),
      recommendations: ai.items.slice(0, 3).map((item) => item.title),
      presentationScript,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trussiq-impact-summary.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-black/65 p-4 pt-[8vh] backdrop-blur-sm animate-fade-in">
      <section role="dialog" aria-modal="true" aria-label="Impact dashboard" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900/95 shadow-2xl shadow-black/40">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-accent"><Presentation size={17} /><span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Challenge impact</span></div>
            <h2 className="mt-1 text-xl font-semibold text-surface-100">Turn your model into evidence</h2>
            <p className="mt-1 text-xs text-surface-400">A judge-ready snapshot of what you built, learned, and can prove.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close impact dashboard" className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"><X size={16} /></button>
        </header>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <Metric label="Engineering evidence" value={result?.success ? 'Analyzed' : 'Not yet measured'} detail={evidence.safety} />
          <Metric label="Model complexity" value={`${nodes.length} nodes · ${beams.length} members`} detail={evidence.status} />
          <Metric label="Learning progress" value={`${progress}/${LEARNING_GOALS.length} goals`} detail={progress === LEARNING_GOALS.length ? 'Ready to present' : 'Complete your reflection'} />
        </div>

        <div className="grid gap-5 border-t border-surface-700 p-5 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-warn" /><h3 className="text-sm font-semibold text-surface-100">Learning evidence</h3></div>
            <div className="space-y-2">
              {LEARNING_GOALS.map((goal, index) => (
                <button key={goal} type="button" onClick={() => toggleGoal(index)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs transition-colors ${checkedGoals[index] ? 'border-pass/40 bg-pass/10 text-surface-100' : 'border-surface-700 bg-surface-800/50 text-surface-300 hover:border-accent/40'}`}>
                  <CheckCircle2 size={17} className={checkedGoals[index] ? 'text-pass' : 'text-surface-600'} />
                  <span>{goal}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /><h3 className="text-sm font-semibold text-surface-100">Judge-ready story</h3></div>
            <div className="rounded-xl border border-surface-700 bg-surface-800/60 p-4">
              <p className="text-xs leading-6 text-surface-300">{presentationScript}</p>
            </div>
            <p className="mt-3 text-[11px] text-surface-500">Tip: show the model before and after one evidence-based change.</p>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-700 px-5 py-4">
          <p className="text-[11px] text-surface-500">Recommendations: {ai.items.length} insight{ai.items.length === 1 ? '' : 's'} available</p>
          <button type="button" onClick={exportImpact} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-400"><Download size={14} />Export impact summary</button>
        </footer>
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-surface-700 bg-surface-800/60 p-3"><p className="text-[10px] uppercase tracking-wide text-surface-500">{label}</p><p className="mt-1 text-sm font-semibold text-surface-100">{value}</p><p className="mt-1 text-[10px] text-surface-400">{detail}</p></div>;
}
