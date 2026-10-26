/** Display unit system. Solver internals stay SI (mm, N, MPa). */

export type DisplayUnitSystem = 'si' | 'us';

const MM_PER_IN = 25.4;
const N_PER_LBF = 4.4482216153;
const MPA_PER_KSI = 6.8947572932;

export function readDisplayUnits(raw: string | null | undefined): DisplayUnitSystem {
  return raw === 'us' ? 'us' : 'si';
}

export function formatLengthDisplay(mm: number, system: DisplayUnitSystem): string {
  const abs = Math.abs(mm);
  if (!Number.isFinite(abs)) return '—';
  if (system === 'us') {
    const inches = abs / MM_PER_IN;
    if (inches >= 12) {
      const feet = inches / 12;
      if (Math.abs(feet - Math.round(feet)) < 1e-6) return `${Math.round(feet)} ft`;
      return `${parseFloat(feet.toFixed(2))} ft`;
    }
    if (Math.abs(inches - Math.round(inches)) < 1e-6) return `${Math.round(inches)} in`;
    return `${parseFloat(inches.toFixed(2))} in`;
  }
  if (abs >= 1000) {
    const meters = abs / 1000;
    if (Math.abs(meters - Math.round(meters)) < 1e-6) return `${Math.round(meters)} m`;
    return `${parseFloat(meters.toFixed(3))} m`;
  }
  if (Math.abs(abs - Math.round(abs)) < 1e-6) return `${Math.round(abs)} mm`;
  if (abs >= 100) return `${abs.toFixed(1)} mm`;
  return `${parseFloat(abs.toFixed(2))} mm`;
}

export function formatForceDisplay(newtons: number, system: DisplayUnitSystem): string {
  if (!Number.isFinite(newtons)) return '—';
  if (system === 'us') {
    const lbf = newtons / N_PER_LBF;
    const sign = lbf >= 0 ? '+' : '';
    if (Math.abs(lbf) >= 1000) return `${sign}${(lbf / 1000).toFixed(2)} kip`;
    return `${sign}${lbf.toFixed(1)} lbf`;
  }
  const sign = newtons >= 0 ? '+' : '';
  if (Math.abs(newtons) >= 1000) return `${sign}${(newtons / 1000).toFixed(2)} kN`;
  return `${sign}${newtons.toFixed(1)} N`;
}

export function formatStressDisplay(mpa: number, system: DisplayUnitSystem): string {
  if (!Number.isFinite(mpa)) return '—';
  if (system === 'us') {
    const ksi = mpa / MPA_PER_KSI;
    return `${ksi.toFixed(2)} ksi`;
  }
  return `${mpa.toFixed(1)} MPa`;
}

export function formatSpanDisplay(spanMm: number, heightMm: number, system: DisplayUnitSystem): string {
  return `${formatLengthDisplay(spanMm, system)} × ${formatLengthDisplay(heightMm, system)}`;
}

export function unitSystemLabel(system: DisplayUnitSystem): string {
  return system === 'us' ? 'US' : 'SI';
}
