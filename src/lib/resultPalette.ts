/** Member result colors — default heatmap vs colorblind-safer palette. */

export type ResultPalette = 'default' | 'colorblind';

export function readResultPalette(raw: string | null | undefined): ResultPalette {
  return raw === 'colorblind' ? 'colorblind' : 'default';
}

/** Map yield utilization → stroke color. */
export function stressColorForPalette(ratio: number, yielded: boolean, palette: ResultPalette): string {
  if (palette === 'colorblind') {
    // Blue (safe) → purple → orange → brown (yield) — avoids red/green only
    if (yielded || ratio >= 1) return '#9a3412';
    if (ratio >= 0.9) return '#c2410c';
    if (ratio >= 0.5) return '#a16207';
    if (ratio >= 0.25) return '#7c3aed';
    return '#0369a1';
  }
  if (yielded || ratio >= 1) return '#ef4444';
  if (ratio >= 0.9) return '#f97316';
  if (ratio >= 0.5) return '#eab308';
  if (ratio >= 0.25) return '#84cc16';
  return '#22c55e';
}

export function axialLabelColors(palette: ResultPalette): { compression: string; tension: string } {
  if (palette === 'colorblind') {
    return { compression: '#0284c7', tension: '#7c3aed' };
  }
  return { compression: '#38bdf8', tension: '#86efac' };
}
