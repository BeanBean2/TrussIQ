import { Download, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTrussScene, downloadTrussGLB } from '../lib/gltfExport';
import type { Beam, Node } from '../lib/types';

interface ARViewerProps {
  nodes: Node[];
  beams: Beam[];
  onClose: () => void;
}

/**
 * 3D extrusion viewer with orbit controls + GLB download for mobile WebAR
 * (open the .glb in iOS Files / Android Scene Viewer / model-viewer).
 */
export function ARViewer({ nodes, beams, onClose }: ARViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1620);

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 20000);
    camera.position.set(400, 280, 520);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xb1e1ff, 0x444444, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(200, 400, 300);
    scene.add(dir);

    const truss = buildTrussScene(nodes, beams);
    scene.add(truss);

    const grid = new THREE.GridHelper(800, 20, 0x334155, 0x1e293b);
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 40, -20);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [nodes, beams]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-950/95 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-surface-100">3D Extrusion / WebAR Preview</h2>
          <p className="text-[11px] text-surface-400">
            Orbit to inspect · Download GLB for mobile AR (Scene Viewer / Quick Look)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTrussGLB(nodes, beams)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-surface-950"
          >
            <Download size={14} />
            Export GLB / AR
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div ref={mountRef} className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-surface-900/80 px-2.5 py-1.5 text-[10px] text-surface-400">
          <RotateCcw size={12} /> Drag to orbit · Scroll to zoom
        </div>
      </div>
    </div>
  );
}
