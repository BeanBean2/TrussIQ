import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  FileDown,
  Gauge,
  Layers3,
  Play,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

interface HomeProps {
  onOpenWorkspace: () => void;
  onOpenDemo: () => void;
}

export function Home({ onOpenWorkspace, onOpenDemo }: HomeProps) {
  return (
    <main className="home-shell min-h-full overflow-auto text-surface-100">
      <nav className="home-nav mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <button type="button" onClick={onOpenWorkspace} className="flex items-center gap-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-surface-950 shadow-[0_0_30px_rgba(14,165,164,0.28)]">IQ</span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">TrussIQ</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-surface-500">Structural learning lab</span>
          </span>
        </button>
        <div className="hidden items-center gap-7 text-xs text-surface-400 md:flex">
          <a href="#workflow" className="transition hover:text-surface-100">Workflow</a>
          <a href="#capabilities" className="transition hover:text-surface-100">Capabilities</a>
          <a href="#principles" className="transition hover:text-surface-100">Built for learning</a>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-surface-700 bg-surface-900/60 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-surface-500 sm:inline-flex">Local-first · v1.0</span>
          <button type="button" onClick={onOpenWorkspace} className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-xs font-medium text-surface-300 transition hover:border-accent/50 hover:text-accent">
            Open workspace <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 lg:px-10 lg:pb-28 lg:pt-20">
        <div className="animate-fade-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" /> Physics, made visible
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-surface-100 sm:text-6xl lg:text-[4.6rem]">
            Think in <span className="text-accent">forces.</span><br />Build with confidence.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-surface-400 sm:text-lg">
            A focused structural design studio for seeing how a truss carries load. Draw, solve, and improve a model with real Direct Stiffness Method analysis.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onOpenWorkspace} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-surface-950 shadow-[0_8px_30px_rgba(14,165,164,0.2)] transition hover:-translate-y-0.5 hover:bg-teal-300">
              <Play size={15} fill="currentColor" /> Start designing
            </button>
            <button type="button" onClick={onOpenDemo} className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-700 bg-surface-900/70 px-5 py-3 text-sm font-medium text-surface-200 transition hover:border-accent/50 hover:text-accent">
              <Sparkles size={15} /> Explore the guided demo
            </button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-mono uppercase tracking-wider text-surface-500">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> 2D FEA</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> Live heatmaps</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> Exportable reports</span>
          </div>
        </div>

        <ModelPreview onOpenWorkspace={onOpenWorkspace} />
      </section>

      <section id="capabilities" className="border-y border-surface-700/70 bg-surface-900/35">
        <div className="mx-auto grid max-w-7xl gap-px bg-surface-700/70 sm:grid-cols-3">
          <Feature icon={<ChartNoAxesCombined size={18} />} eyebrow="01 / Visualize" title="See the load path" text="Stress heatmaps and exaggerated deflection turn invisible forces into something you can read." />
          <Feature icon={<Gauge size={18} />} eyebrow="02 / Validate" title="Make decisions with evidence" text="Check stability, buckling risk, yield, mass, and cost before you commit to a design." />
          <Feature icon={<BookOpen size={18} />} eyebrow="03 / Understand" title="Learn by changing it" text="Every member exposes the underlying equations, so experimentation becomes understanding." />
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">A clear path to insight</p>
            <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.03em] text-surface-100 sm:text-4xl">From a sketch to an engineering story.</h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-surface-400">TrussIQ keeps the model, the math, and the explanation in one workspace. No black boxes, no spreadsheet sprawl.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <WorkflowStep number="01" icon={<Workflow size={18} />} title="Shape it" text="Place joints, members, supports, and loads on a precise canvas." />
            <WorkflowStep number="02" icon={<Layers3 size={18} />} title="Solve it" text="Run a real finite element analysis and inspect the full response." />
            <WorkflowStep number="03" icon={<ShieldCheck size={18} />} title="Improve it" text="Compare options and find a safer, lighter, more efficient design." />
          </div>
        </div>
      </section>

      <section id="principles" className="border-t border-surface-700/70 bg-surface-900/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-10">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-accent/20 bg-accent/10 p-2.5 text-accent"><ShieldCheck size={20} /></div>
            <div><h2 className="text-sm font-semibold text-surface-100">Designed for classrooms, teams, and curious engineers.</h2><p className="mt-1.5 max-w-2xl text-xs leading-5 text-surface-400">Your drafts stay local. Your models stay explainable. Your next iteration is always one click away.</p></div>
          </div>
          <button type="button" onClick={onOpenWorkspace} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-accent transition hover:text-teal-300">Open the lab <ArrowRight size={15} /></button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-10 text-[10px] text-surface-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span>Build the bridge. Understand the forces.</span>
        <span className="flex items-center gap-1.5 font-mono"><FileDown size={12} /> Local-first drafts · exportable reports</span>
      </footer>
    </main>
  );
}

function ModelPreview({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  return (
    <div className="home-visual relative min-h-[390px] overflow-hidden rounded-2xl border border-surface-700 bg-surface-900/85 p-5 shadow-2xl sm:min-h-[440px]">
      <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(var(--iq-700) 1px, transparent 1px), linear-gradient(90deg, var(--iq-700) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="relative flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-surface-500"><span>Model / HOWE-01</span><span className="flex items-center gap-1.5 text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" /> Analysis ready</span></div>
      <div className="relative mt-7 grid max-w-[17rem] gap-2 font-mono text-[9px] uppercase tracking-wider text-surface-500">
        <div className="flex items-center justify-between border-b border-surface-700/70 pb-2"><span>Load case</span><strong className="font-medium text-surface-300">Deck / −3.0 kN</strong></div>
        <div className="flex items-center justify-between border-b border-surface-700/70 pb-2"><span>Method</span><strong className="font-medium text-surface-300">2D DSM</strong></div>
      </div>
      <div className="home-truss absolute inset-x-8 top-[47%] h-32 -translate-y-1/2 sm:inset-x-14">
        <span className="truss-beam truss-bottom" /><span className="truss-beam truss-top" /><span className="truss-beam truss-diagonal-a" /><span className="truss-beam truss-diagonal-b" /><span className="truss-beam truss-diagonal-c" /><span className="truss-beam truss-diagonal-d" />
        <i className="truss-node truss-node-a" /><i className="truss-node truss-node-b" /><i className="truss-node truss-node-c" /><i className="truss-node truss-node-d" /><i className="truss-node truss-node-e" /><i className="truss-node truss-node-f" />
      </div>
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between border-t border-surface-700 pt-4">
        <div className="grid grid-cols-3 gap-5 font-mono text-[10px]"><div><span className="block text-surface-500">Members</span><strong className="text-surface-200">12</strong></div><div><span className="block text-surface-500">Peak stress</span><strong className="text-accent">64%</strong></div><div><span className="block text-surface-500">Safety</span><strong className="text-accent">2.1×</strong></div></div>
        <button type="button" onClick={onOpenWorkspace} className="hidden items-center gap-1 text-[10px] font-semibold text-accent transition hover:text-teal-300 sm:flex">Open model <ArrowRight size={12} /></button>
      </div>
    </div>
  );
}

function Feature({ icon, eyebrow, title, text }: { icon: React.ReactNode; eyebrow: string; title: string; text: string }) {
  return <article className="bg-surface-900/70 px-5 py-7 sm:px-7"><div className="flex items-center justify-between text-accent"><span>{icon}</span><span className="font-mono text-[9px] text-surface-500">{eyebrow}</span></div><h2 className="mt-5 text-sm font-semibold text-surface-100">{title}</h2><p className="mt-2 text-xs leading-5 text-surface-400">{text}</p></article>;
}

function WorkflowStep({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-xl border border-surface-700 bg-surface-900/65 p-5 transition hover:-translate-y-0.5 hover:border-accent/40"><div className="flex items-center justify-between text-accent"><span>{icon}</span><span className="font-mono text-[10px] text-surface-500">{number}</span></div><h3 className="mt-8 text-sm font-semibold text-surface-100">{title}</h3><p className="mt-2 text-xs leading-5 text-surface-400">{text}</p></article>;
}
