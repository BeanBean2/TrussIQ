import { CheckCircle2, Download, ExternalLink, FileText, Lightbulb, Presentation, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { buildPresentationDraft, buildSubmissionPrepText, CAC_DEADLINE_NOTICE, CAC_OFFICIAL_SOURCES, CAC_VIDEO_STORYBOARD, LIVE_DEMO_URL } from '../lib/challengePrep';
import type { StructureAudit } from '../lib/structureAudit';
import type { AIAnalysis, Beam, FEAResult, Node, StructureState } from '../lib/types';
import { readStoredValue, writeStoredValue } from '../lib/storage';
import { exportLabWorksheet } from '../lib/worksheet';
import { scoreDesign } from '../lib/designScore';

interface ImpactDashboardProps {
  nodes: Node[];
  beams: Beam[];
  result: FEAResult | null;
  ai: AIAnalysis;
  audit: StructureAudit;
  materialId: string;
  defaultArea: number;
  onClose: () => void;
}

const LEARNING_GOALS = [
  'I can explain how a truss transfers load.',
  'I used evidence from FEA to improve my design.',
  'I checked the modeled yield limit, stability, and material trade-offs.',
  'I can communicate one design decision clearly.',
];

const SUBMISSION_STEPS = [
  { title: 'Verify eligibility and register officially', detail: 'Confirm middle/high school enrollment on October 26, 2026, U.S. residency, and that you live or attend school in a hosting district. Each student enters once in one district. The portal requires a personal (non-school) email and student/guardian and home/school details; do not put those private details in TrussIQ.' },
  { title: 'Check team rules', detail: 'Teams may have up to four students. At least half must live or attend school in the district entered.' },
  { title: 'Prepare and publish the demo video', detail: 'Make a 1–3 minute video showing each participant, app name, one-sentence purpose, audience, tools/languages, and working features. Upload to YouTube or Vimeo and set it to public.' },
  { title: 'Answer the application questions', detail: 'Be ready to explain the inspiration, a coding challenge and how you solved it, what you learned, and what you would change in version 2.' },
  { title: 'Disclose AI assistance and your own work', detail: 'List AI tools and the specific work they supported. Clearly describe your original coding, decisions, testing, and what you can explain.' },
  { title: 'Rehearse a clean app demo', detail: 'Test the submitted version, keep the demo link available, and be ready to provide reasonable access to the app and source code if requested.' },
  { title: 'Submit before the deadline and save confirmation', detail: `${CAC_DEADLINE_NOTICE} Review every field; submitted entries cannot be modified after the period closes.` },
  { title: 'Complete the exit questionnaire', detail: 'After the deadline, watch for the questionnaire link. Every team member must complete it individually.' },
];

export function ImpactDashboard({ nodes, beams, result, ai, audit, materialId, defaultArea, onClose }: ImpactDashboardProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [checkedGoals, setCheckedGoals] = useState<boolean[]>(() => {
    try {
      const saved = JSON.parse(readStoredValue('trussiq-learning-goals') ?? '[]');
      return LEARNING_GOALS.map((_, index) => saved[index] === true);
    } catch {
      return LEARNING_GOALS.map(() => false);
    }
  });
  const [submissionChecks, setSubmissionChecks] = useState<boolean[]>(() => {
    try {
      const saved = JSON.parse(readStoredValue('trussiq-cac-submission-checks') ?? '[]');
      return SUBMISSION_STEPS.map((_, index) => saved[index] === true);
    } catch {
      return SUBMISSION_STEPS.map(() => false);
    }
  });
  const [aiDisclosure, setAiDisclosure] = useState(() => readStoredValue('trussiq-cac-ai-disclosure') ?? '');
  const [storageNotice, setStorageNotice] = useState('');

  const evidence = useMemo(() => {
    const safety = result?.success ? result.maxSafetyRatio > 0 ? `${(1 / result.maxSafetyRatio).toFixed(2)}× yield safety factor` : 'No member stress in this load case' : 'Run FEA to measure yield utilization';
    const status = audit.errors === 0 ? 'No structural audit errors' : `${audit.errors} audit item${audit.errors === 1 ? '' : 's'} to review`;
    return { safety, status };
  }, [audit.errors, result]);

  const progress = checkedGoals.filter(Boolean).length;
  const presentationScript = buildPresentationDraft(nodes.length, beams.length, result);

  const toggleGoal = (index: number) => {
    const next = checkedGoals.map((checked, goalIndex) => goalIndex === index ? !checked : checked);
    setCheckedGoals(next);
    setStorageNotice(writeStoredValue('trussiq-learning-goals', JSON.stringify(next)) ? '' : 'Progress changed for this session, but could not be saved in this browser.');
  };

  const toggleSubmissionStep = (index: number) => {
    const next = submissionChecks.map((checked, stepIndex) => stepIndex === index ? !checked : checked);
    setSubmissionChecks(next);
    setStorageNotice(writeStoredValue('trussiq-cac-submission-checks', JSON.stringify(next)) ? '' : 'Checklist changed for this session, but could not be saved in this browser.');
  };

  const exportSubmissionPrep = () => {
    const contents = buildSubmissionPrepText({
      appTitle: document.title,
      steps: SUBMISSION_STEPS,
      completedSteps: submissionChecks,
      aiDisclosure,
    });
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trussiq-congressional-app-challenge-prep.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const designScore = useMemo(
    () => (result?.success ? scoreDesign(nodes, beams, result, 50, 25) : null),
    [nodes, beams, result],
  );

  const exportWorksheet = () => {
    let brief: { title?: string; author?: string; course?: string; objective?: string } = {};
    try {
      const raw = readStoredValue('trussiq-project-brief');
      if (raw) brief = JSON.parse(raw);
    } catch {
      brief = {};
    }
    const state: StructureState = { nodes, beams, materialId, defaultArea };
    exportLabWorksheet(state, result, brief);
  };

  const exportImpact = () => {
    const payload = {
      format: 'trussiq.learning-portfolio',
      version: 3,
      generatedAt: new Date().toISOString(),
      liveDemo: LIVE_DEMO_URL,
      evidence,
      designScore,
      model: { nodeCount: nodes.length, memberCount: beams.length, materialId, defaultArea },
      learningGoals: LEARNING_GOALS.map((label, index) => ({ label, selfReportedComplete: checkedGoals[index] })),
      congressionalAppChallengeChecklist: SUBMISSION_STEPS.map((step, index) => ({ ...step, selfReportedComplete: submissionChecks[index] })),
      aiDisclosure,
      officialSources: CAC_OFFICIAL_SOURCES,
      deadlineNotice: CAC_DEADLINE_NOTICE,
      videoStoryboard: CAC_VIDEO_STORYBOARD,
      analysisScope: 'Linear, axial-only Direct Stiffness Method yield check for learning; not a structural certification. Engineering coach uses local rules by default; optional Gemini sends model context to Google only when an API key is configured.',
      recommendations: ai.items.slice(0, 3).map((item) => item.title),
      presentationScript,
      projectBrief: (() => {
        try {
          const raw = readStoredValue('trussiq-project-brief');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trussiq-learning-portfolio.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-black/65 p-4 pt-[8vh] backdrop-blur-sm animate-fade-in">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Impact dashboard" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-accent/30 bg-surface-900/95 shadow-2xl shadow-black/40">
        <header className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-accent"><Presentation size={17} /><span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Challenge impact</span></div>
            <h2 className="mt-1 text-xl font-semibold text-surface-100">Turn your model into evidence</h2>
            <p className="mt-1 text-xs text-surface-400">Pitch: free browser FEA for classrooms that cannot afford commercial structural software. Use this panel to rehearse what you built, learned, and can demonstrate.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close impact dashboard" className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"><X size={16} /></button>
        </header>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Engineering evidence" value={result?.success ? 'Analyzed' : 'Not yet measured'} detail={evidence.safety} />
          <Metric label="Model complexity" value={`${nodes.length} nodes · ${beams.length} members`} detail={evidence.status} />
          <Metric label="Classroom score" value={designScore ? `${designScore.score.toFixed(0)} / 100` : '—'} detail={designScore?.explanation ?? 'Run FEA to score mass vs limits'} />
          <Metric label="Learning progress" value={`${progress}/${LEARNING_GOALS.length} goals`} detail={progress === LEARNING_GOALS.length ? 'All reflections marked complete' : 'Complete your reflection'} />
        </div>
        <p className="px-5 pb-1 text-[10px] text-surface-500">
          Live demo for judges:{' '}
          <a href={LIVE_DEMO_URL} target="_blank" rel="noreferrer" className="text-accent hover:text-teal-300">
            {LIVE_DEMO_URL}
          </a>
        </p>

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
            <div className="mb-3 flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /><h3 className="text-sm font-semibold text-surface-100">Presentation draft</h3></div>
            <div className="rounded-xl border border-surface-700 bg-surface-800/60 p-4">
              <p className="text-xs leading-6 text-surface-300">{presentationScript}</p>
            </div>
            <p className="mt-3 text-[11px] text-surface-500">Replace the bracketed text with your actual contribution. Show the model before and after one change you can explain.</p>
          </div>
        </div>

        <section className="space-y-4 border-t border-surface-700 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><FileText size={16} className="text-accent" /><h3 className="text-sm font-semibold text-surface-100">2026 Congressional App Challenge prep</h3></div>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-surface-400">A working checklist based on the official rules. Eligibility is determined by the contest portal and your district; this checklist does not certify eligibility.</p>
            </div>
            <div className="flex items-center gap-3">
              <a href={CAC_OFFICIAL_SOURCES.portal} target="_blank" rel="noreferrer" aria-label="Open the 2026 Congressional App Challenge submission portal in a new tab" className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-teal-300">Open submission portal <ExternalLink size={12} /></a>
              <a href={CAC_OFFICIAL_SOURCES.rules} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-teal-300">Official rules <ExternalLink size={12} /></a>
              <a href={CAC_OFFICIAL_SOURCES.registration} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-teal-300">Registration page <ExternalLink size={12} /></a>
            </div>
          </div>

          <div className="rounded-xl border border-warn/35 bg-warn/5 p-3" role="note" aria-label="Submission deadline and judging criteria">
            <p className="text-xs font-semibold text-warn">2026 deadline sources conflict: {CAC_DEADLINE_NOTICE}</p>
            <p className="mt-1 text-[10px] leading-4 text-surface-300">Confirm the deadline in the live submission portal and submit early. Entries cannot be edited after the period closes. The judging criteria may include idea quality and originality, implementation and user experience, and coding skills. A complete checklist does not confirm eligibility or guarantee an award.</p>
          </div>

          <details className="rounded-xl border border-surface-700 bg-surface-800/40 p-3">
            <summary className="cursor-pointer text-xs font-medium text-surface-200 outline-none focus-visible:ring-2 focus-visible:ring-accent">Plan a 1:55 demo video</summary>
            <p className="mt-2 text-[10px] leading-4 text-surface-500">A timed outline to adapt in your own words. The official rules call for a 1–3 minute video that introduces participants and the app, explains its purpose and audience, names tools and languages, and demonstrates functionality.</p>
            <ol className="mt-3 space-y-2">
              {CAC_VIDEO_STORYBOARD.map((beat) => <li key={beat.time} className="grid gap-1 sm:grid-cols-[4.5rem_1fr]">
                <span className="font-mono text-[10px] text-accent">{beat.time}</span>
                <span className="text-[10px] leading-4 text-surface-300">{beat.prompt}</span>
              </li>)}
            </ol>
            <p className="mt-3 text-[10px] text-surface-500">Replace each prompt with your real work and speak naturally. Turn on captions and keep on-screen labels readable.</p>
          </details>

          <div className="grid gap-2 md:grid-cols-2">
            {SUBMISSION_STEPS.map((step, index) => (
              <label key={step.title} className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 ${submissionChecks[index] ? 'border-pass/35 bg-pass/5' : 'border-surface-700 bg-surface-800/40'}`}>
                <input type="checkbox" checked={submissionChecks[index]} onChange={() => toggleSubmissionStep(index)} className="mt-0.5 accent-teal-500" />
                <span><span className="block text-[11px] font-medium text-surface-200">{step.title}</span><span className="mt-1 block text-[10px] leading-4 text-surface-500">{step.detail}</span></span>
              </label>
            ))}
          </div>

          <label className="block space-y-1.5 text-xs text-surface-300">
            <span className="font-medium">AI-use disclosure notes</span>
            <span className="block text-[10px] leading-4 text-surface-500">Record the tools and specific tasks they supported, including code generation, design, debugging, or testing. Then describe your own original work and what you can explain. Review and complete this truthfully for your submission.</span>
            <textarea value={aiDisclosure} onChange={(event) => { setAiDisclosure(event.target.value); setStorageNotice(writeStoredValue('trussiq-cac-ai-disclosure', event.target.value) ? '' : 'Disclosure notes are available for this session but could not be saved. Export your prep before closing.'); }} placeholder="AI tool(s) and tasks supported: ...\nMy original contributions: ...\nWhat I can explain and demonstrate: ..." className="min-h-24 w-full resize-y rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-[11px] text-surface-100 outline-none placeholder:text-surface-600 focus:border-accent" />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-700 pt-3">
            <div><p className="text-[10px] text-surface-500">Also prepare your inspiration, a coding challenge and solution, what you learned, and one idea for version 2.0.</p>{storageNotice && <p role="status" className="mt-1 text-[10px] text-warn">{storageNotice}</p>}</div>
            <button type="button" onClick={exportSubmissionPrep} className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-[11px] font-medium text-accent hover:bg-accent/20"><Download size={13} />Export submission prep</button>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-700 px-5 py-4">
          <p className="text-[11px] text-surface-500">Recommendations: {ai.items.length} insight{ai.items.length === 1 ? '' : 's'} available</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportWorksheet} className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20"><FileText size={14} />Lab worksheet PDF</button>
            <button type="button" onClick={exportImpact} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-400"><Download size={14} />Export learning portfolio</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-surface-700 bg-surface-800/60 p-3"><p className="text-[10px] uppercase tracking-wide text-surface-500">{label}</p><p className="mt-1 text-sm font-semibold text-surface-100">{value}</p><p className="mt-1 text-[10px] text-surface-400">{detail}</p></div>;
}
