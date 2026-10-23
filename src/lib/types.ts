import type { SectionParams } from './crossSections';

/** Support / boundary condition types for a joint node. */
export type SupportType = 'none' | 'pin' | 'rollerX' | 'rollerY' | 'fixed';

/** Active editor tool mode. */
export type ToolMode = 'select' | 'node' | 'beam' | 'force' | 'support' | 'erase';

/** Grid snap increment in canvas pixels (world mm mapped 1:1 at default zoom). */
export type GridSize = 10 | 20 | 50;

export type ThemeMode = 'dark' | 'light';

export type DynamicsMode = 'none' | 'wind' | 'seismic';

export interface Material {
  id: string;
  name: string;
  /** Young's Modulus in GPa */
  E: number;
  /** Yield strength in MPa */
  sigmaYield: number;
  /** Density g/cm³ */
  density: number;
  /** Approx. material cost USD / kg (classroom estimate) */
  costUSDPerKg: number;
  color: string;
}

export interface Node {
  id: string;
  /** World X coordinate (mm) */
  x: number;
  /** World Y coordinate (mm) — canvas Y grows downward; FEA uses this as-is for 2D plane */
  y: number;
  support: SupportType;
  /** Applied force Fx (N) */
  fx: number;
  /** Applied force Fy (N) — positive = downward in canvas coords */
  fy: number;
}

export interface Beam {
  id: string;
  nodeI: string;
  nodeJ: string;
  /** Cross-sectional area (mm²) — derived from section when present */
  area: number;
  /** Moment of inertia (mm⁴) for buckling — derived from section */
  I?: number;
  materialId: string;
  /** Parametric cross-section (multi-material assemblies per member) */
  section?: SectionParams;
}

/** Per-member results after solving. */
export interface MemberResult {
  beamId: string;
  /** Axial force N (N). Positive = tension. */
  axialForce: number;
  /** Axial stress σ (MPa). Positive = tension. */
  stress: number;
  /** |σ| / σ_yield */
  safetyRatio: number;
  status: 'tension' | 'compression' | 'zero';
  length: number;
  yielded: boolean;
}

export interface NodalDisplacement {
  nodeId: string;
  ux: number;
  uy: number;
}

export interface FEAResult {
  success: boolean;
  unstable: boolean;
  message?: string;
  members: MemberResult[];
  displacements: NodalDisplacement[];
  /** Max |σ|/σ_yield across all members */
  maxSafetyRatio: number;
  passed: boolean;
}

export interface StructureState {
  nodes: Node[];
  beams: Beam[];
  materialId: string;
  defaultArea: number;
}

export interface StructureDocument extends StructureState {
  version: 1;
  name: string;
  exportedAt: string;
  format?: 'trussiq.truss';
}

/** AI advisor recommendation categories. */
export type AdviceSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AIAdviceItem {
  id: string;
  severity: AdviceSeverity;
  title: string;
  message: string;
  beamIds?: string[];
  nodeIds?: string[];
}

export interface AIAnalysis {
  items: AIAdviceItem[];
  bucklingBeamIds: string[];
  zeroForceBeamIds: string[];
  hotNodeIds: string[];
}

export interface MassCostSummary {
  totalLengthMm: number;
  totalVolumeCm3: number;
  totalMassG: number;
  estimatedCostUSD: number;
  memberCount: number;
}

/** DSM formula breakdown for educational Formula Inspector. */
export interface FormulaBreakdown {
  beamId: string;
  nodeI: string;
  nodeJ: string;
  L: number;
  thetaDeg: number;
  c: number;
  s: number;
  E_GPa: number;
  A: number;
  EA_over_L: number;
  kLocal: number[][];
  ux1: number;
  uy1: number;
  ux2: number;
  uy2: number;
  deltaL: number;
  axialForce: number;
  stress: number;
  strain: number;
  status: MemberResult['status'];
}

export interface WindParams {
  /** Reference wind speed v₀ (m/s) */
  v0: number;
  /** Reference height z₀ (mm) */
  z0: number;
  /** Power-law exponent α */
  alpha: number;
  /** Drag force scale (N per (m/s)² at reference) */
  dragScale: number;
}

export interface SeismicParams {
  /** Peak ground acceleration amplitude A (m/s²) */
  amplitude: number;
  /** Angular frequency ω (rad/s) */
  omega: number;
  /** Current simulation time t (s) */
  time: number;
}

export interface CollapseFrame {
  loadPct: number;
  result: FEAResult;
  failedBeamIds: string[];
  activeBeamIds: string[];
  collapsed: boolean;
}
