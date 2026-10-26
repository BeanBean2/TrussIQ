/**
 * Export a 2D truss as an extruded 3D GLTF/GLB for WebAR / desktop viewers.
 */

import * as THREE from 'three';
import { getMaterial } from './materials';
import type { Beam, Material, Node } from './types';

const DEPTH = 40; // mm extrusion half-depth for visual thickness

interface MaterialAppearance {
  color: number;
  metalness: number;
  roughness: number;
  emissive?: number;
  emissiveIntensity?: number;
}

function materialAppearance(material: Material): MaterialAppearance {
  switch (material.id) {
    case 'al6061':
      return { color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 };
    case 'pla':
      return {
        color: 0x2dd4bf,
        metalness: 0.05,
        roughness: 0.38,
        emissive: 0x064e3b,
        emissiveIntensity: 0.12,
      };
    case 'cfiber':
      return { color: 0x172033, metalness: 0.7, roughness: 0.22 };
    case 'titanium':
      return { color: 0xc4b5fd, metalness: 0.92, roughness: 0.16 };
    case 'steel':
    default:
      return { color: 0x64748b, metalness: 0.78, roughness: 0.28 };
  }
}

function createBeamMaterial(materialId: string): THREE.MeshStandardMaterial {
  const appearance = materialAppearance(getMaterial(materialId));
  return new THREE.MeshStandardMaterial(appearance);
}

export function buildTrussScene(nodes: Node[], beams: Beam[]): THREE.Group {
  const front = new THREE.Group();
  front.name = 'TrussIQ_Bridge_Front';

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Center the model
  let cx = 0;
  let cy = 0;
  for (const n of nodes) {
    cx += n.x;
    cy += n.y;
  }
  cx /= Math.max(nodes.length, 1);
  cy /= Math.max(nodes.length, 1);

  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.25,
    roughness: 0.25,
  });

  const addBeam = (parent: THREE.Group, b: Beam, z: number) => {
    const ni = nodeMap.get(b.nodeI);
    const nj = nodeMap.get(b.nodeJ);
    if (!ni || !nj) return;

    const ax = ni.x - cx;
    const ay = -(ni.y - cy);
    const bx = nj.x - cx;
    const by = -(nj.y - cy);
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;

    const radius = Math.max(Math.sqrt(b.area / Math.PI), 2.5);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12), createBeamMaterial(b.materialId));
    mesh.userData.materialId = b.materialId;
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, z);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx, dy, 0).normalize(),
    );
    mesh.name = b.id;
    parent.add(mesh);
  };

  const addJoint = (parent: THREE.Group, n: Node, z: number) => {
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(7, 16, 12),
      jointMaterial,
    );
    joint.position.set(n.x - cx, -(n.y - cy), z);
    joint.name = n.id;
    parent.add(joint);
  };

  for (const b of beams) addBeam(front, b, 0);
  for (const n of nodes) addJoint(front, n, 0);

  const back = front.clone(true);
  back.name = 'TrussIQ_Bridge_Back';
  back.position.z = -DEPTH;

  const links = new THREE.Group();
  links.name = 'TrussIQ_JointConnectors';
  const linkMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.5,
    roughness: 0.32,
  });
  for (const n of nodes) {
    const geom = new THREE.CylinderGeometry(3, 3, DEPTH, 8);
    const mesh = new THREE.Mesh(
      geom,
      linkMaterial,
    );
    mesh.position.set(n.x - cx, -(n.y - cy), -DEPTH / 2);
    mesh.rotation.x = Math.PI / 2;
    mesh.name = `${n.id}_connector`;
    links.add(mesh);
  }

  const root = new THREE.Group();
  root.name = 'TrussIQ_Bridge';
  root.add(front);
  root.add(back);
  root.add(links);
  return root;
}

/** Download a .glb binary of the extruded truss. */
export async function downloadTrussGLB(
  nodes: Node[],
  beams: Beam[],
  filename = 'trussiq_bridge.glb',
): Promise<void> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const scene = new THREE.Scene();
  scene.add(buildTrussScene(nodes, beams));
  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
  });

  const blob =
    result instanceof ArrayBuffer
      ? new Blob([result], { type: 'model/gltf-binary' })
      : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.glb') ? filename : `${filename}.glb`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
