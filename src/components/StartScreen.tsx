import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Layers3,
  MousePointer2,
  Play,
  Sparkles,
  Triangle,
} from 'lucide-react';

interface StartScreenProps {
  onOpenDemo: () => void;
  onStartBlank: () => void;
  onResume: () => void;
  hasSavedDesign: boolean;
}

const FEATURES = [
  {
    icon: Triangle,
    title: 'Build visually',
    text: 'Sketch nodes, members, supports, and loads directly on an intuitive canvas.',
  },
  {
    icon: BarChart3,
    title: 'Understand forces',
    text: 'Run finite element analysis and see stress, deflection, and safety factors.',
  },
  {
    icon: Sparkles,
    title: 'Learn by exploring',
    text: 'Compare truss patterns, inspect formulas, and test collapse behavior safely.',
  },
];

export function StartScreen({
  onOpenDemo,
  onStartBlank,
  onResume,
  hasSavedDesign,
}: StartScreenProps) {
  return (
    <main className="min-h-full overflow-y-auto bg-surface-950 text-surface-100">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-32 -top-40 -z-10 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/15 font-mono font-bold text-accent">
              IQ
            </div>
            <div>
              <div className="font-semibold tracking-tight">TrussIQ</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-surface-400">
                Structural learning lab
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-surface-400 sm:flex">
            <span className="h-2 w-2 rounded-full bg-pass shadow-[0_0_12px_theme(colors.green.400)]" />
            Runs in your browser
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-16">
          <div className="animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
              <Sparkles size={13} />
              2D finite element analysis for curious builders
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-surface-100 sm:text-6xl">
              Design a truss.
              <span className="block text-accent">See the forces.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-surface-300 sm:text-lg">
              A hands-on engineering workspace for turning structural ideas into
              understandable experiments. Build, solve, and learn without a
              spreadsheet getting in the way.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-surface-950 shadow-lg shadow-accent/10 transition hover:-translate-y-0.5 hover:bg-teal-300"
              >
                <Play size={16} fill="currentColor" />
                Explore demo truss
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={onStartBlank}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-600 bg-surface-900/70 px-5 py-3 text-sm font-semibold text-surface-200 transition hover:border-accent/50 hover:text-accent"
              >
                Start from blank
              </button>
            </div>
            {hasSavedDesign && (
              <button
                type="button"
                onClick={onResume}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent transition hover:text-teal-300"
              >
                <Layers3 size={15} />
                Resume your saved design
                <ArrowRight size={14} />
              </button>
            )}

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-surface-400">
              {['No account required', 'Undoable experiments', 'Classroom friendly'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-pass" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg animate-fade-in [animation-delay:120ms] [animation-fill-mode:both]">
            <div className="absolute -inset-4 rounded-[2rem] bg-accent/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-2 border-b border-surface-700 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-fail/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-pass/80" />
                <span className="ml-2 font-mono text-[10px] text-surface-500">FEA WORKSPACE</span>
              </div>
              <div className="relative h-72 overflow-hidden bg-[#0f1620] p-5 sm:h-80">
                <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#243041_1px,transparent_1px),linear-gradient(90deg,#243041_1px,transparent_1px)] [background-size:24px_24px]" />
                <svg viewBox="0 0 480 260" className="relative h-full w-full">
                  <g stroke="#334155" strokeWidth="2">
                    <path d="M55 190 H425 M115 95 H365 M55 190 L115 95 M115 95 L175 190 M175 190 L235 95 M235 95 L295 190 M295 190 L365 95 M365 95 L425 190" />
                  </g>
                  <g stroke="#0ea5a4" strokeWidth="5" strokeLinecap="round">
                    <path d="M55 190 H425 M115 95 H365 M55 190 L115 95 M115 95 L175 190 M175 190 L235 95 M235 95 L295 190 M295 190 L365 95 M365 95 L425 190" />
                  </g>
                  <g fill="#e2e8f0" stroke="#0ea5a4" strokeWidth="3">
                    <circle cx="55" cy="190" r="8" /><circle cx="115" cy="95" r="8" />
                    <circle cx="175" cy="190" r="8" /><circle cx="235" cy="95" r="8" />
                    <circle cx="295" cy="190" r="8" /><circle cx="365" cy="95" r="8" />
                    <circle cx="425" cy="190" r="8" />
                  </g>
                  <g stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrow)">
                    <path d="M175 145 V205" /><path d="M295 145 V205" />
                  </g>
                  <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                      <path d="M0 0 L8 4 L0 8 Z" fill="#ef4444" />
                    </marker>
                  </defs>
                </svg>
                <div className="absolute bottom-4 left-4 rounded-lg border border-pass/30 bg-surface-900/90 px-3 py-2 text-[10px] shadow-lg">
                  <div className="flex items-center gap-1.5 font-semibold text-pass">
                    <CheckCircle2 size={12} /> ANALYSIS PASSED
                  </div>
                  <div className="mt-1 font-mono text-surface-400">Safety factor 2.84</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-surface-700 px-4 py-3 text-[10px] text-surface-400">
                <span className="inline-flex items-center gap-1.5"><MousePointer2 size={12} /> Select a member to inspect</span>
                <span className="font-mono text-accent">READY</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="border-y border-surface-800 bg-surface-900/45">
        <div className="mx-auto grid max-w-6xl gap-px bg-surface-700/50 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="bg-surface-950/95 px-6 py-7 lg:px-8">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon size={18} />
              </div>
              <h2 className="text-sm font-semibold text-surface-100">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-surface-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-surface-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span className="inline-flex items-center gap-2"><Layers3 size={14} /> Explore structural behavior, one member at a time.</span>
        <span className="inline-flex items-center gap-2"><BookOpen size={14} /> Built for classrooms and makers.</span>
      </footer>
    </main>
  );
}
