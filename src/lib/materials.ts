import type { Material } from './types';

/**
 * Material library — different members may use different materials
 * in the same bridge (multi-material assemblies).
 */
export const MATERIALS: Material[] = [
  { id: 'wood', name: 'Wood (along grain)', E: 10, sigmaYield: 40, density: 0.6, costUSDPerKg: 1, color: '#d5a45c' },
  {
    id: 'al6061',
    name: 'Aluminum',
    E: 68.9,
    sigmaYield: 276,
    density: 2.7,
    costUSDPerKg: 3.5,
    color: '#e2e8f0',
  },
  {
    id: 'steel',
    name: 'Steel',
    E: 200,
    sigmaYield: 250,
    density: 7.85,
    costUSDPerKg: 1.2,
    color: '#7aa4cf',
  },
  {
    id: 'pla',
    name: 'PLA plastic',
    E: 3.5,
    sigmaYield: 50,
    density: 1.24,
    costUSDPerKg: 25,
    color: '#5eead4',
  },
  {
    id: 'cfiber',
    name: 'Carbon fiber',
    E: 70,
    sigmaYield: 600,
    density: 1.6,
    costUSDPerKg: 80,
    color: '#a78bfa',
  },
  {
    id: 'titanium',
    name: 'Titanium',
    E: 113.8,
    sigmaYield: 880,
    density: 4.43,
    costUSDPerKg: 45,
    color: '#f9a8d4',
  },
  {
    id: 'rope',
    name: 'Rope',
    E: 2.5,
    sigmaYield: 250,
    density: 1.2,
    costUSDPerKg: 3,
    color: '#c98545',
  },
];

export const DEFAULT_MATERIAL_ID = 'steel';
export const DEFAULT_AREA = 100; // mm²

export function getMaterial(id: string): Material {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS.find(m => m.id === 'steel')!;
}
