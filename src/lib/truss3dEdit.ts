/**
 * Helpers for the interactive planar 3D editor (FEA stays 2D; Z is display only).
 */

import * as THREE from 'three';
import { nextId } from './ids';
import { getMaterial } from './materials';
import type { Beam, Node, StructureState } from './types';

/** Named camera angles for inspecting / editing front, back, top, bottom, and sides. */
export type Editor3DView =
  | 'iso'
  | 'front'
  | 'back'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

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

export function structureCenterFea(state: StructureState): { x: number; y: number } {
  if (state.nodes.length === 0) return { x: 0, y: 0 };
  const xs = state.nodes.map((n) => n.x);
  const ys = state.nodes.map((n) => n.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/** Mirror the whole model left↔right about its bounding-box center. */
export function mirrorStructureHorizontal(state: StructureState): StructureState {
  const { x: cx } = structureCenterFea(state);
  return {
    ...state,
    nodes: state.nodes.map((node) => ({
      ...node,
      x: 2 * cx - node.x,
      fx: -node.fx,
      support:
        node.support === 'rollerX' ? 'rollerX' : node.support === 'rollerY' ? 'rollerY' : node.support,
    })),
  };
}

/** Mirror the whole model top↔bottom about its bounding-box center. */
export function mirrorStructureVertical(state: StructureState): StructureState {
  const { y: cy } = structureCenterFea(state);
  return {
    ...state,
    nodes: state.nodes.map((node) => ({
      ...node,
      y: 2 * cy - node.y,
      fy: -node.fy,
    })),
  };
}

/**
 * Duplicate the model to the opposite horizontal side (for “edit the other side”
 * workflows) without wiping the original half.
 */
export function duplicateMirroredHalf(state: StructureState, gapMm = 40): StructureState {
  if (state.nodes.length === 0) return state;
  const xs = state.nodes.map((n) => n.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const width = maxX - minX;
  const idMap = new Map<string, string>();
  const nodes: Node[] = [...state.nodes];
  for (const node of state.nodes) {
    const id = nextId('n');
    idMap.set(node.id, id);
    nodes.push({
      ...node,
      id,
      x: maxX + gapMm + (maxX - node.x) + (width > 0 ? 0 : gapMm),
      fx: -node.fx,
    });
  }
  const beams: Beam[] = [...state.beams];
  for (const beam of state.beams) {
    const nodeI = idMap.get(beam.nodeI);
    const nodeJ = idMap.get(beam.nodeJ);
    if (!nodeI || !nodeJ) continue;
    beams.push({ ...beam, id: nextId('b'), nodeI, nodeJ });
  }
  return { ...state, nodes, beams };
}

/** Place the camera for a named orthographic-style look at the planar model. */
export function applyEditorView(
  view: Editor3DView,
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  center: THREE.Vector3,
  radius: number,
): void {
  const r = Math.max(radius, 40);
  const offset = (() => {
    switch (view) {
      case 'front':
        return new THREE.Vector3(0, 0, r * 2.2);
      case 'back':
        return new THREE.Vector3(0, 0, -r * 2.2);
      case 'top':
        return new THREE.Vector3(0, r * 2.4, 0.01);
      case 'bottom':
        return new THREE.Vector3(0, -r * 2.4, 0.01);
      case 'left':
        return new THREE.Vector3(-r * 2.2, r * 0.25, 0);
      case 'right':
        return new THREE.Vector3(r * 2.2, r * 0.25, 0);
      case 'iso':
      default:
        return new THREE.Vector3(r * 1.2, r * 0.85, r * 1.6);
    }
  })();
  camera.position.copy(center).add(offset);
  controls.target.copy(center);
  controls.update();
  camera.lookAt(controls.target);
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
