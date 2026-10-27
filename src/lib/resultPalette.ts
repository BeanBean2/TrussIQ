/** Member result colors — default heatmap vs colorblind-safer palette. */

export type ResultPalette = 'default' | 'colorblind';

export function readResultPalette(raw: string | null | undefined): ResultPalette {
  return raw === 'colorblind' ? 'colorblind' : 'default';
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function mixHex(from: string, to: string, t: number): string {
  const parse = (hex: string) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ] as const;
  const a = parse(from);
  const b = parse(to);
  const u = clamp01(t);
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * u);
  return `#${[channel(0), channel(1), channel(2)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Map yield utilization (|σ|/limit) → stroke color.
 * Default: green (low stress) → yellow → red (yielded / very stressed).
 */
export function stressColorForPalette(ratio: number, yielded: boolean, palette: ResultPalette): string {
  const t = yielded ? 1 : clamp01(ratio);

  if (palette === 'colorblind') {
    // Blue (safe) → purple → orange → brown (yield) — avoids red/green only
    if (t >= 1) return '#9a3412';
    if (t >= 0.9) return mixHex('#a16207', '#c2410c', (t - 0.9) / 0.1);
    if (t >= 0.5) return mixHex('#7c3aed', '#a16207', (t - 0.5) / 0.4);
    if (t >= 0.25) return mixHex('#0369a1', '#7c3aed', (t - 0.25) / 0.25);
    return mixHex('#0369a1', '#0369a1', 0);
  }

  // Continuous green → yellow → red by utilization
  if (t <= 0) return '#22c55e';
  if (t < 0.5) return mixHex('#22c55e', '#eab308', t / 0.5);
  if (t < 1) return mixHex('#eab308', '#ef4444', (t - 0.5) / 0.5);
  return '#ef4444';
}

export function axialLabelColors(palette: ResultPalette): { compression: string; tension: string } {
  if (palette === 'colorblind') {
    return { compression: '#0284c7', tension: '#7c3aed' };
  }
  return { compression: '#38bdf8', tension: '#86efac' };
}
