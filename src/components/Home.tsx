import {
  ArrowRight,
  BookOpen,
  Moon,
  PanelsTopLeft,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ThemeMode } from '../lib/types';
import { createHoweTruss } from '../lib/presets';
import { solveTruss } from '../lib/feaEngine';
import { readStoredValue, writeStoredValue } from '../lib/storage';
import type { ReviewLinkReadResult } from '../lib/reviewLink';

interface HomeProps {
  onOpenWorkspace: () => void;
  onOpenDemo: () => void;
  sharedReview: ReviewLinkReadResult;
  onOpenSharedReview: () => void;
  onDismissSharedReview: () => void;
}

const SAMPLE_STATE = createHoweTruss();
const SAMPLE_RESULT = solveTruss(SAMPLE_STATE.nodes, SAMPLE_STATE.beams);
const SAMPLE_UTILIZATION = SAMPLE_RESULT.success ? SAMPLE_RESULT.maxSafetyRatio * 100 : 0;
const SAMPLE_SAFETY_FACTOR = SAMPLE_RESULT.success
  ? SAMPLE_RESULT.maxSafetyRatio > 0 ? 1 / SAMPLE_RESULT.maxSafetyRatio : Infinity
  : 0;
const SAMPLE_LOAD = SAMPLE_STATE.nodes.reduce((sum, node) => sum + Math.abs(node.fy), 0);

export function Home({ onOpenWorkspace, onOpenDemo, sharedReview, onOpenSharedReview, onDismissSharedReview }: HomeProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredValue('trussiq-theme') === 'light' ? 'light' : 'dark');
  const isFirstVisit = readStoredValue('trussiq-onboarding-complete') !== '1';
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    writeStoredValue('trussiq-theme', theme);
  }, [theme]);

  return (
    <main className="home-shell min-h-full overflow-auto text-surface-100">
      <nav className="home-nav mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <button type="button" onClick={onOpenWorkspace} className="flex shrink-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950" aria-label="Open TrussIQ workspace">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/35 bg-accent/10 font-mono text-xs font-semibold text-accent">TQ</span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">TrussIQ</span>
            <span className="block text-[10px] text-surface-500">Free classroom structural lab</span>
          </span>
        </button>
        <div className="hidden items-center gap-6 text-xs text-surface-400 md:flex">
          <a href="#impact" className="transition hover:text-surface-100">Impact</a>
          <a href="#capabilities" className="transition hover:text-surface-100">Capabilities</a>
          <a href="#workflow" className="transition hover:text-surface-100">Workflow</a>
          <a href="#scope" className="transition hover:text-surface-100">Analysis scope</a>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] text-surface-500 sm:inline">Runs locally in your browser</span>
          <button type="button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} className="rounded-lg border border-surface-700 p-2 text-surface-300 transition hover:border-surface-500 hover:bg-surface-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button type="button" onClick={onOpenWorkspace} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 transition hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950">
            {isFirstVisit ? 'Begin guided tour' : 'Open workspace'} <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {sharedReview && (
        <section role={sharedReview.state ? 'region' : 'alert'} aria-label="Shared design link" className="home-reveal mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pb-2 sm:px-8 lg:px-10">
          <div>
            <p className={`text-sm font-medium ${sharedReview.state ? 'text-accent' : 'text-warn'}`}>{sharedReview.state ? 'A shared truss design is ready to review.' : sharedReview.error}</p>
            {sharedReview.state && <p className="mt-1 text-xs text-surface-400">This opens a temporary review copy. Your local draft stays unchanged unless you choose Save Draft.</p>}
          </div>
          <div className="flex items-center gap-2">
            {sharedReview.state && <button type="button" onClick={onOpenSharedReview} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300">Open shared design</button>}
            <button type="button" onClick={onDismissSharedReview} className="rounded-lg border border-surface-700 px-3 py-2 text-xs text-surface-300 hover:bg-surface-800">Dismiss</button>
          </div>
        </section>
      )}

      <section className="home-hero mx-auto grid max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-10 lg:py-20">
        <div className="home-reveal">
          <p className="mb-4 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
            <span className="h-px w-6 bg-accent" /> STEM access · runs in the browser
          </p>
          <h1 className="home-brand max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-surface-100 sm:text-5xl lg:text-[3.6rem]">
            TrussIQ
          </h1>
          <p className="mt-3 max-w-xl text-xl font-medium leading-snug tracking-tight text-surface-200 sm:text-2xl">
            Free truss FEA so every classroom can see how a structure carries load.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-surface-400 sm:text-base sm:leading-7">
            Expensive analysis software locks many schools out of structural engineering. Draw a pin-jointed truss, run the Direct Stiffness Method, and inspect forces, stress, displacement, and reactions — local-first, no install, no paid license.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onOpenWorkspace} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-surface-950 transition hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950">
              {isFirstVisit ? (
                <><BookOpen size={15} /> Start guided tour</>
              ) : (
                <><PanelsTopLeft size={15} /> Start a design</>
              )}
            </button>
            <button type="button" onClick={onOpenDemo} className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              <BookOpen size={15} /> {isFirstVisit ? 'Launch Demo Mode' : 'Demo Mode'}
            </button>
          </div>
          {isFirstVisit && (
            <p className="mt-3 max-w-xl text-xs text-surface-500">
              First time here? Opening the workspace starts a short walkthrough of nodes, beams, supports, loads, and Run FEA.
            </p>
          )}
          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 border-t border-surface-700/80 pt-5 sm:grid-cols-3">
            <ScopePoint title="Model" detail="Nodes, members, supports, loads" />
            <ScopePoint title="Analyze" detail="Forces, stress, deflection, reactions" />
            <ScopePoint title="Compare" detail="Sections, materials, load cases" />
          </div>
        </div>

        <div className="home-reveal home-reveal-delay">
          <ModelPreview onOpenWorkspace={onOpenWorkspace} />
        </div>
      </section>

      <section id="impact" className="home-impact border-y border-surface-700">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-accent">Who it helps</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-surface-100">Equal access to structural thinking.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-400">
            Built for physics, robotics, and intro engineering classes that need real load-path feedback without CAD licenses or lab workstations. Students keep drafts in the browser, share review links, and export evidence for presentations — teachers stay in control of what leaves the device.
          </p>
        </div>
      </section>

      <section id="capabilities" className="bg-surface-900/45">
        <div className="mx-auto grid max-w-7xl divide-y divide-surface-700 px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-10">
          <Feature number="01" title="Build a model" text="Place joints, connect members, define supports, and apply nodal loads on a snap-to-grid canvas." />
          <Feature number="02" title="Inspect the response" text="Read tension and compression, yield utilization, nodal movement, reactions, and force balance." />
          <Feature number="03" title="Test a decision" text="Compare material choices and load cases, then use the results to guide the next iteration." />
        </div>
      </section>

      <section id="workflow" className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[0.7fr_1.3fr] md:items-start lg:px-10 lg:py-20">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-accent">A practical workflow</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-surface-100">From geometry to evidence.</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-surface-400">Use the same model to ask a question, evaluate a change, and explain what the analysis shows.</p>
        </div>
        <ol className="grid gap-6 sm:grid-cols-3 sm:gap-4">
          <WorkflowStep number="01" title="Model" text="Set geometry, sections, materials, and boundary conditions." />
          <WorkflowStep number="02" title="Solve" text="Run linear elastic analysis and review the load path." />
          <WorkflowStep number="03" title="Explain" text="Capture a project brief and export analysis evidence." />
        </ol>
      </section>

      <section id="scope" className="border-t border-surface-700 bg-surface-900/45">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-10">
          <div>
            <h2 className="text-xs font-semibold text-surface-200">Analysis scope</h2>
            <p className="mt-1.5 max-w-3xl text-xs leading-5 text-surface-400">TrussIQ models planar, pin-jointed members with linear elastic axial behavior. Wind and seismic studies use quasi-static load snapshots. Results are for learning and exploration, not construction design or safety certification.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-[10px] text-surface-500"><span className="h-1.5 w-1.5 rounded-full bg-pass" /> Drafts save in this browser</span>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-[10px] text-surface-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span>TrussIQ · Free classroom structural lab</span>
        <span>Private by default · Local FEA · Share &amp; Gemini need consent · Not construction certification</span>
      </footer>
    </main>
  );
}

function ModelPreview({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const passed = SAMPLE_RESULT.success && SAMPLE_RESULT.passed;
  const nodeXs = SAMPLE_STATE.nodes.map((node) => node.x);
  const nodeYs = SAMPLE_STATE.nodes.map((node) => node.y);
  const minX = Math.min(...nodeXs);
  const maxX = Math.max(...nodeXs);
  const minY = Math.min(...nodeYs);
  const maxY = Math.max(...nodeYs);
  const point = (nodeId: string) => {
    const node = SAMPLE_STATE.nodes.find((candidate) => candidate.id === nodeId)!;
    return {
      x: 28 + ((node.x - minX) / Math.max(maxX - minX, 1)) * 584,
      y: 48 + ((node.y - minY) / Math.max(maxY - minY, 1)) * 150,
    };
  };
  const memberResults = new Map(SAMPLE_RESULT.success ? SAMPLE_RESULT.members.map((member) => [member.beamId, member]) : []);
  return (
    <section className="home-visual overflow-hidden rounded-xl border border-surface-700 bg-surface-900" aria-label="Sample Howe truss analysis">
      <header className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
        <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-surface-500">Example model</p><h2 className="mt-0.5 text-sm font-semibold text-surface-100">Howe bridge truss</h2></div>
        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] ${passed ? 'border-pass/30 bg-pass/10 text-pass' : 'border-warn/30 bg-warn/10 text-warn'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{SAMPLE_RESULT.success ? passed ? 'Passes yield check' : 'Yield check exceeded' : 'Analysis unavailable'}</span>
      </header>
      <div className="preview-grid px-4 py-4 sm:px-7 sm:py-5">
        <div className="flex items-center justify-between text-[10px] text-surface-500"><span>Direct Stiffness Method</span><span>{SAMPLE_LOAD.toLocaleString()} N applied</span></div>
        <svg viewBox="0 0 640 250" role="img" aria-label="Howe truss schematic with member response colors, supports, and applied load" className="mt-2 h-48 w-full sm:h-52">
          <defs><marker id="preview-load-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#c45d54" /></marker></defs>
          {SAMPLE_STATE.beams.map((beam, index) => {
            const a = point(beam.nodeI);
            const b = point(beam.nodeJ);
            const result = memberResults.get(beam.id);
            const color = result?.yielded ? '#c45d54' : result?.status === 'compression' ? '#6686a1' : '#378e83';
            return (
              <line
                key={beam.id}
                className="home-member-draw"
                style={{ animationDelay: `${80 + index * 28}ms` }}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
          {SAMPLE_STATE.nodes.filter((node) => node.support !== 'none').map((node) => {
            const p = point(node.id);
            return <path key={node.id} d={`M ${p.x} ${p.y + 7} L ${p.x - 11} ${p.y + 23} L ${p.x + 11} ${p.y + 23} Z`} fill="var(--iq-900)" stroke="#b28b4c" strokeWidth="2" />;
          })}
          {SAMPLE_STATE.nodes.filter((node) => node.fx !== 0 || node.fy !== 0).map((node) => {
            const p = point(node.id);
            const magnitude = Math.hypot(node.fx, node.fy);
            const length = 22 + Math.min(18, Math.log10(magnitude + 1) * 4);
            const endX = p.x + (node.fx / magnitude) * length;
            const endY = p.y + (node.fy / magnitude) * length;
            return <g key={node.id} className="home-load-pulse"><line x1={p.x} y1={p.y - 22} x2={endX} y2={endY} stroke="#c45d54" strokeWidth="2" markerEnd="url(#preview-load-arrow)" /><text x={endX + 6} y={endY} fill="#c45d54" fontSize="10" fontFamily="ui-monospace, monospace">{magnitude.toFixed(0)} N</text></g>;
          })}
          {SAMPLE_STATE.nodes.map((node) => { const p = point(node.id); return <circle key={node.id} cx={p.x} cy={p.y} r="5" fill="var(--iq-100)" stroke="var(--iq-900)" strokeWidth="2" />; })}
        </svg>
        <div className="grid grid-cols-3 divide-x divide-surface-700 border-t border-surface-700 pt-3">
          <Metric label="Members" value={`${SAMPLE_STATE.beams.length}`} />
          <Metric label="Peak utilization" value={SAMPLE_RESULT.success ? `${SAMPLE_UTILIZATION.toFixed(1)}%` : '—'} />
          <Metric label="Yield safety factor" value={SAMPLE_RESULT.success ? Number.isFinite(SAMPLE_SAFETY_FACTOR) ? `${SAMPLE_SAFETY_FACTOR.toFixed(2)}×` : '∞' : '—'} />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-surface-700 px-4 py-3"><span className="text-[10px] text-surface-500">Sample loads and material from the Howe preset</span><button type="button" onClick={onOpenWorkspace} className="inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">Open model <ArrowRight size={13} /></button></div>
    </section>
  );
}

function ScopePoint({ title, detail }: { title: string; detail: string }) {
  return <div><h2 className="text-[11px] font-semibold text-surface-200">{title}</h2><p className="mt-1 text-[10px] leading-4 text-surface-500">{detail}</p></div>;
}

function Feature({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="py-5 md:px-5 md:py-6 first:md:pl-0 last:md:pr-0"><p className="font-mono text-[10px] text-accent">{number}</p><h2 className="mt-2 text-sm font-semibold text-surface-100">{title}</h2><p className="mt-1.5 text-xs leading-5 text-surface-400">{text}</p></article>;
}

function WorkflowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <li className="relative border-t border-accent/35 pt-4">
      <div className="font-mono text-[10px] text-accent">{number}</div>
      <h3 className="mt-3 text-sm font-semibold text-surface-100">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-surface-400">{text}</p>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="px-3 first:pl-0 last:pr-0"><p className="text-[9px] uppercase tracking-wide text-surface-500">{label}</p><p className="mt-1 font-mono text-sm font-medium text-surface-100">{value}</p></div>;
}
