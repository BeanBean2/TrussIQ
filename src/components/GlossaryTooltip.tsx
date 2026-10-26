import { HelpCircle } from 'lucide-react';
import { useId, useState } from 'react';

const GLOSSARY: Record<string, string> = {
  'Young\'s Modulus':
    'E — stiffness of a material. Stress / strain in the elastic range. Higher E → less stretch under the same load (steel ≈ 200 GPa, PLA ≈ 3.5 GPa).',
  'Yield Strength':
    'σ_yield — stress at which permanent (plastic) deformation begins. If |σ| ≥ σ_yield the member has “failed” for elastic design.',
  'Axial Stress':
    'σ = N / A — force along the member divided by cross-sectional area. Tension positive, compression negative in TrussIQ.',
  'Euler Buckling':
    'Long slender bars in compression can buckle sideways before yielding. Critical stress σ_cr = π² E I / (A (K L)²). Increase I or shorten L to resist buckling.',
  'Zero-Force Member':
    'A bar that carries ≈ 0 N under the current load case. Useful for stability under alternate loads, but removable to save weight if that load case is the only one.',
  'Direct Stiffness Method':
    'FEA approach that assembles element stiffness matrices into K, then solves [K]{u} = {F} for nodal displacements before recovering member forces.',
  'Safety Factor':
    'SF = σ_yield / |σ|. SF > 1 means the member is below yield. Competition designs often target SF ≥ 1.5–2.',
};

interface GlossaryTooltipProps {
  term: keyof typeof GLOSSARY | string;
  className?: string;
}

/** Hover/focus definition chip for engineering vocabulary. */
export function GlossaryTooltip({ term, className = '' }: GlossaryTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const def = GLOSSARY[term] ?? 'Engineering term used in TrussIQ analysis.';

  return (
    <span
      className={`relative inline-flex items-center gap-0.5 ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span className="border-b border-dotted border-accent/60 text-accent">{term}</span>
      <button
        type="button"
        className="rounded text-surface-400 outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Define ${term}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
      >
        <HelpCircle size={11} />
      </button>
      {open && (
        <span id={tooltipId} role="tooltip" className="absolute bottom-full left-0 z-30 mb-1 w-64 rounded-lg border border-surface-700 bg-surface-900 p-2.5 text-[11px] leading-relaxed text-surface-300 shadow-xl animate-fade-in">
          {def}
        </span>
      )}
    </span>
  );
}
