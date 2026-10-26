/**
 * Helpers for the interactive planar 3D editor (FEA stays 2D; Z is display only).
 */

import * as THREE from 'three';
import { getMaterial } from './materials';
import type { Beam, Node } from './types';

/** Convert FEA (x right, y down) → Three.js (x right, y up). */
export function feaToThree(x: number, y: number, z = 0): THREE.Vector3 {
  return new THREE.Vector3(x, -y, z);
}

export function threeToFea(point: THREE.Vector3): { x: number; y: number } {
  return { x: point.x, y: -point.y };
}

export function snapFea(value: number, step: number): number {
  if (!(step > 0)) return value;
  return Math.round(value / step) * step;
}

/** Lightweight single-plane scene for editing (not the dual extruded export mesh). */
export function buildEditableTrussGroup(
  nodes: Node[],
  beams: Beam[],
  options: { selectedNodeId?: string | null; selectedBeamId?: string | null; draftFromId?: string | null } = {},
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'TrussIQ_Editable';

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const beam of beams) {
    const ni = nodeMap.get(beam.nodeI);
    const nj = nodeMap.get(beam.nodeJ);
    if (!ni || !nj) continue;
    const a = feaToThree(ni.x, ni.y);
    const b = feaToThree(nj.x, nj.y);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-6) continue;
    const radius = Math.max(Math.sqrt(beam.area / Math.PI) * 0.55, 2.2);
    const color = getMaterial(beam.materialId).color;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, len, 10),
      new THREE.MeshStandardMaterial({
        color: beam.id === options.selectedBeamId ? 0x5eead4 : new THREE.Color(color).getHex(),
        metalness: 0.35,
        roughness: 0.45,
        emissive: beam.id === options.selectedBeamId ? 0x0f766e : 0x000000,
        emissiveIntensity: beam.id === options.selectedBeamId ? 0.35 : 0,
      }),
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.userData = { kind: 'beam', id: beam.id };
    mesh.name = beam.id;
    root.add(mesh);
  }

  for (const node of nodes) {
    const selected = node.id === options.selectedNodeId || node.id === options.draftFromId;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(selected ? 9 : 7, 16, 12),
      new THREE.MeshStandardMaterial({
        color: selected ? 0x5eead4 : 0xf8fafc,
        metalness: 0.2,
        roughness: 0.3,
        emissive: selected ? 0x0f766e : node.support !== 'none' ? 0xb45309 : 0x000000,
        emissiveIntensity: selected ? 0.45 : node.support !== 'none' ? 0.2 : 0,
      }),
    );
    mesh.position.copy(feaToThree(node.x, node.y));
    mesh.userData = { kind: 'node', id: node.id };
    mesh.name = node.id;
    root.add(mesh);
  }

  return root;
}

/** Ray ↔ plane z=0 intersection in Three.js space. */
export function intersectEditPlane(
  raycaster: THREE.Raycaster,
  plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
): THREE.Vector3 | null {
  const hit = new THREE.Vector3();
  const ok = raycaster.ray.intersectPlane(plane, hit);
  return ok ? hit : null;
}
