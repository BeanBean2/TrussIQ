import { ArrowRight, BookOpen, ChartNoAxesCombined, FileDown, Play, ShieldCheck, Sparkles } from 'lucide-react';

interface HomeProps {
  onOpenWorkspace: () => void;
  onOpenDemo: () => void;
}

export function Home({ onOpenWorkspace, onOpenDemo }: HomeProps) {
  return (
    <main className="home-shell min-h-full overflow-auto bg-surface-950 text-surface-100">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-surface-950 shadow-[0_0_28px_rgba(14,165,164,0.28)]">IQ</div>
          <div>
            <div className="text-sm font-semibold tracking-tight">TrussIQ</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-surface-500">Structural learning lab</div>
          </div>
        </div>
        <button type="button" onClick={onOpenWorkspace} className="hidden items-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-xs font-medium text-surface-300 transition hover:border-accent/50 hover:text-accent sm:inline-flex">
          Open workspace <ArrowRight size={13} />
        </button>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-24 lg:pt-16">
        <div className="animate-fade-in">
          <p className="mb-4 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Physics, made visible</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-surface-100 sm:text-6xl lg:text-7xl">Build the bridge.<br /><span className="text-accent">Understand the forces.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-surface-400 sm:text-lg">TrussIQ turns structural design into an interactive experiment. Draw a truss, run real Direct Stiffness Method analysis, and learn why it holds or fails.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onOpenWorkspace} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-surface-950 shadow-[0_8px_30px_rgba(14,165,164,0.2)] transition hover:-translate-y-0.5 hover:bg-teal-300"><Play size={15} fill="currentColor" /> Start designing</button>
            <button type="button" onClick={onOpenDemo} className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-700 bg-surface-900/70 px-5 py-3 text-sm font-medium text-surface-200 transition hover:border-accent/50 hover:text-accent"><Sparkles size={15} /> Watch the guided demo</button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-surface-500"><span>2D FEA</span><span>Live heatmaps</span><span>Classroom-ready</span></div>
        </div>

        <div className="home-visual relative min-h-[300px] overflow-hidden rounded-2xl border border-surface-700 bg-surface-900/80 p-5 shadow-2xl sm:min-h-[390px]">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(var(--iq-700) 1px, transparent 1px), linear-gradient(90deg, var(--iq-700) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-surface-500"><span>Live model / 01</span><span className="flex items-center gap-1.5 text-pass"><span className="h-1.5 w-1.5 rounded-full bg-pass" /> Stable</span></div>
          <div className="home-truss absolute inset-x-8 top-1/2 h-32 -translate-y-1/2 sm:inset-x-14">
            <span className="truss-beam truss-bottom" /><span className="truss-beam truss-top" /><span className="truss-beam truss-diagonal-a" /><span className="truss-beam truss-diagonal-b" /><span className="truss-beam truss-diagonal-c" /><span className="truss-beam truss-diagonal-d" />
            <i className="truss-node truss-node-a" /><i className="truss-node truss-node-b" /><i className="truss-node truss-node-c" /><i className="truss-node truss-node-d" /><i className="truss-node truss-node-e" /><i className="truss-node truss-node-f" />
          </div>
          <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2 border-t border-surface-700 pt-4 font-mono text-[10px]
          "><div><span className="block text-surface-500">Members</span><strong className="text-surface-200">12</strong></div><div><span className="block text-surface-500">Peak stress</span><strong className="text-warn">64%</strong></div><div><span className="block text-surface-500">Safety</span><strong className="text-pass">2.1×</strong></div></div>
        </div>
      </section>

      <section className="border-y border-surface-700/70 bg-surface-900/45">
        <div className="mx-auto grid max-w-7xl gap-px bg-surface-700/70 sm:grid-cols-3">
          <Feature icon={<ChartNoAxesCombined size={18} />} title="See the load path" text="Stress heatmaps and exaggerated deflection turn invisible forces into something you can read." />
          <Feature icon={<ShieldCheck size={18} />} title="Design with evidence" text="Check stability, buckling risk, yield, mass, and cost before you commit to a design." />
          <Feature icon={<BookOpen size={18} />} title="Learn by changing it" text="Every member exposes the underlying equations, so experimentation becomes understanding." />
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-[10px] text-surface-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span>Built for physics classrooms, robotics teams, and curious engineers.</span><span className="flex items-center gap-1.5 font-mono"><FileDown size={12} /> Exportable reports · local-first drafts</span></footer>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="bg-surface-900/70 px-5 py-6 sm:px-7"><div className="text-accent">{icon}</div><h2 className="mt-4 text-sm font-semibold text-surface-100">{title}</h2><p className="mt-1.5 text-xs leading-5 text-surface-400">{text}</p></article>;
}