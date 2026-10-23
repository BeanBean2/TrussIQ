/**
 * Cross-section geometry → area A (mm²) and strong-axis moment of inertia I (mm⁴).
 * Used for axial stiffness (EA) and Euler buckling (π²EI/(KL)²).
 */

export type SectionKind = 'solidRod' | 'hollowTube' | 'iBeam';

export interface SolidRodParams {
  kind: 'solidRod';
  /** Diameter (mm) */
  diameter: number;
}

export interface HollowTubeParams {
  kind: 'hollowTube';
  outerDiameter: number;
  innerDiameter: number;
}

export interface IBeamParams {
  kind: 'iBeam';
  /** Total height (mm) */
  height: number;
  /** Flange width (mm) */
  flangeWidth: number;
  /** Flange thickness (mm) */
  flangeThickness: number;
  /** Web thickness (mm) */
  webThickness: number;
}

export type SectionParams = SolidRodParams | HollowTubeParams | IBeamParams;

export interface SectionProperties {
  area: number; // mm²
  I: number; // mm⁴ (bending about axis perpendicular to web for I-beam)
  label: string;
}

export const DEFAULT_SECTION: SectionParams = {
  kind: 'solidRod',
  diameter: 11.28, // ≈ 100 mm² solid circle
};

/** Compute A and I for a section definition. */
export function computeSectionProps(section: SectionParams): SectionProperties {
  switch (section.kind) {
    case 'solidRod': {
      const r = Math.max(section.diameter, 0.1) / 2;
      const area = Math.PI * r * r;
      // I = π r⁴ / 4
      const I = (Math.PI * r * r * r * r) / 4;
      return {
        area,
        I,
        label: `Ø${section.diameter.toFixed(1)} mm rod`,
      };
    }
    case 'hollowTube': {
      const Ro = Math.max(section.outerDiameter, 0.2) / 2;
      const Ri = Math.min(Math.max(section.innerDiameter, 0) / 2, Ro * 0.95);
      const area = Math.PI * (Ro * Ro - Ri * Ri);
      // I = π/4 (Ro⁴ − Ri⁴)
      const I = (Math.PI / 4) * (Ro ** 4 - Ri ** 4);
      return {
        area,
        I,
        label: `Tube Ø${section.outerDiameter.toFixed(1)}/Ø${section.innerDiameter.toFixed(1)}`,
      };
    }
    case 'iBeam': {
      const h = Math.max(section.height, 1);
      const bf = Math.max(section.flangeWidth, 1);
      const tf = Math.max(section.flangeThickness, 0.1);
      const tw = Math.max(section.webThickness, 0.1);
      const hw = Math.max(h - 2 * tf, 0.1);
      // Area = 2·bf·tf + hw·tw
      const area = 2 * bf * tf + hw * tw;
      // I about strong axis (parallel to flanges): 
      // 2 × [bf·tf³/12 + bf·tf·(h/2 − tf/2)²] + tw·hw³/12
      const Iflange =
        2 *
        ((bf * tf ** 3) / 12 + bf * tf * (h / 2 - tf / 2) ** 2);
      const Iweb = (tw * hw ** 3) / 12;
      const I = Iflange + Iweb;
      return {
        area,
        I,
        label: `I ${h.toFixed(0)}×${bf.toFixed(0)} mm`,
      };
    }
  }
}

/** Build a solid rod that approximately matches a target area (mm²). */
export function solidRodFromArea(area: number): SolidRodParams {
  const diameter = 2 * Math.sqrt(Math.max(area, 1) / Math.PI);
  return { kind: 'solidRod', diameter };
}

export const SECTION_PRESETS: { id: string; label: string; section: SectionParams }[] = [
  { id: 'rod-10', label: 'Solid Rod Ø10 mm', section: { kind: 'solidRod', diameter: 10 } },
  { id: 'rod-16', label: 'Solid Rod Ø16 mm', section: { kind: 'solidRod', diameter: 16 } },
  { id: 'tube-20-16', label: 'Tube Ø20×2 mm', section: { kind: 'hollowTube', outerDiameter: 20, innerDiameter: 16 } },
  { id: 'tube-30-24', label: 'Tube Ø30×3 mm', section: { kind: 'hollowTube', outerDiameter: 30, innerDiameter: 24 } },
  {
    id: 'ibeam-s',
    label: 'I-Beam 40×20',
    section: { kind: 'iBeam', height: 40, flangeWidth: 20, flangeThickness: 3, webThickness: 2 },
  },
  {
    id: 'ibeam-m',
    label: 'I-Beam 60×30',
    section: { kind: 'iBeam', height: 60, flangeWidth: 30, flangeThickness: 4, webThickness: 3 },
  },
];
