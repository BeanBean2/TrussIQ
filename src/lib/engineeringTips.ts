/** Short classroom tips rotated in the workspace. */
export const ENGINEERING_TIPS: string[] = [
  'A plane truss usually needs a pin + roller (or equivalent) to block rigid-body motion without locking thermal expansion.',
  'Positive axial force = tension; negative = compression. Only compression members can Euler-buckle.',
  'Safety factor SF = σ_yield / |σ|. SF > 1.5 is a common student design target — not a code check.',
  'Zero-force members can still matter under alternate loads (wind from the other side, construction cases).',
  'Increase cross-section area A to cut stress; increase I (tubes / I-beams) to raise buckling resistance.',
  'The Direct Stiffness Method solves Ku = F for joint moves, then recovers N = (EA/L)·ΔL in each bar.',
  'Try one change at a time: tweak A or material, re-solve, and compare peak utilization.',
  'Long, skinny compression bars fail by buckling long before they reach σ_yield.',
  'Deflection mode exaggerates shape change so you can see the load path — check the real |u| in results.',
  'Compare Pratt vs Warren under the same loads: stiffer isn’t always lighter.',
  'PLA is soft (low E) — great for 3D-printed demos, poor for high loads vs steel.',
  'Symmetry in geometry often means symmetry in forces — odd spikes can hint at modeling mistakes.',
];

export function tipForDay(date = new Date()): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return ENGINEERING_TIPS[Math.abs(day) % ENGINEERING_TIPS.length];
}

export function nextTipIndex(current: number): number {
  return (current + 1) % ENGINEERING_TIPS.length;
}
