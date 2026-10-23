/**
 * Export a 2D truss as an extruded 3D GLTF/GLB for WebAR / desktop viewers.
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Beam, Node } from './types';

const DEPTH = 40; // mm extrusion half-depth for visual thickness

export function buildTrussScene(nodes: Node[], beams: Beam[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'TrussIQ_Bridge';

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

  for (const b of beams) {
    const ni = nodeMap.get(b.nodeI);
    const nj = nodeMap.get(b.nodeJ);
    if (!ni || !nj) continue;

    const ax = ni.x - cx;
    const ay = -(ni.y - cy); // flip Y for Three.js Y-up
    const bx = nj.x - cx;
    const by = -(nj.y - cy);

    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;

    const radius = Math.max(Math.sqrt(b.area / Math.PI), 2);
    const geom = new THREE.CylinderGeometry(radius, radius, len, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0ea5a4,
      metalness: 0.4,
      roughness: 0.45,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, 0);
    // Orient cylinder (default Y-axis) along member
    const dir = new THREE.Vector3(dx, dy, 0).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );
    mesh.quaternion.copy(quat);
    mesh.name = b.id;
    group.add(mesh);
  }

  for (const n of nodes) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(6, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }),
    );
    sphere.position.set(n.x - cx, -(n.y - cy), 0);
    sphere.name = n.id;
    group.add(sphere);

    // Extrude depth hint — dual plane joints
    const back = sphere.clone();
    back.position.z = -DEPTH;
    group.add(back);
  }

  // Duplicate chords offset in Z for a simple 3D bridge extrusion
  const clone = group.clone(true);
  clone.position.z = -DEPTH;
  clone.name = 'TrussIQ_Bridge_Back';
  // Cross-links
  const links = new THREE.Group();
  for (const n of nodes) {
    const geom = new THREE.CylinderGeometry(2.5, 2.5, DEPTH, 6);
    const mesh = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({ color: 0x64748b }),
    );
    mesh.position.set(n.x - cx, -(n.y - cy), -DEPTH / 2);
    mesh.rotation.x = Math.PI / 2;
    links.add(mesh);
  }

  const root = new THREE.Group();
  root.add(group);
  root.add(clone);
  root.add(links);
  return root;
}

/** Download a .glb binary of the extruded truss. */
export async function downloadTrussGLB(
  nodes: Node[],
  beams: Beam[],
  filename = 'trussiq_bridge.glb',
): Promise<void> {
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
  URL.revokeObjectURL(url);
}
