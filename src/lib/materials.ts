import type { Material } from './types';

/**
 * Material library — different members may use different materials
 * in the same bridge (multi-material assemblies).
 */
export const MATERIALS: Material[] = [
  {
    id: 'al6061',
    name: 'Aluminum',
    E: 68.9,
    sigmaYield: 276,
    density: 2.7,
    costUSDPerKg: 3.5,
    color: '#a8b4c4',
  },
  {
    id: 'steel',
    name: 'Steel',
    E: 200,
    sigmaYield: 250,
    density: 7.85,
    costUSDPerKg: 1.2,
    color: '#6b7c8f',
  },
  {
    id: 'pla',
    name: 'Plastic',
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
    color: '#1e293b',
  },
  {
    id: 'titanium',
    name: 'Titanium',
    E: 113.8,
    sigmaYield: 880,
    density: 4.43,
    costUSDPerKg: 45,
    color: '#94a3b8',
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
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[1];
}
