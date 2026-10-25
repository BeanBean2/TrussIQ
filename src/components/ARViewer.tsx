import { Download, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      const w = Math.max(mount.clientWidth, 1);
      const h = Math.max(mount.clientHeight, 1);
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(w, h, false);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f1620);
      const camera = new THREE.PerspectiveCamera(45, w / h, 1, 20000);
      camera.position.set(400, 280, 520);

      scene.add(new THREE.HemisphereLight(0xb1e1ff, 0x444444, 1.1));
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(200, 400, 300);
      scene.add(dir);
      scene.add(buildTrussScene(nodes, beams));
      scene.add(new THREE.GridHelper(800, 20, 0x334155, 0x1e293b));

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 40, -20);

      const render = () => {
        if (!renderer || !controls) return;
        frame = requestAnimationFrame(render);
        controls.update();
        renderer.render(scene, camera);
      };
      render();
      setLoading(false);

      const resize = () => {
        if (!renderer || !mount) return;
        const nw = Math.max(mount.clientWidth, 1);
        const nh = Math.max(mount.clientHeight, 1);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh, false);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
    } catch (cause) {
      renderer?.dispose();
      setLoading(false);
      setError(
        cause instanceof Error && cause.message
          ? `The 3D preview could not start: ${cause.message}`
          : 'The 3D preview could not start in this browser.',
      );
    }

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      controls?.dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [nodes, beams]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await downloadTrussGLB(nodes, beams);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The GLB export failed.');
    } finally {
      setExporting(false);
    }
  };

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
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-surface-950"
          >
            <Download size={14} />
            {exporting ? 'Preparing GLB…' : 'Export GLB / AR'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"
            aria-label="Close 3D viewer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div ref={mountRef} className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-sm text-surface-300">
            Preparing the lightweight 3D preview…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-md rounded-xl border border-amber-400/30 bg-surface-900/90 p-5">
              <p className="text-sm font-semibold text-amber-200">3D preview unavailable</p>
              <p className="mt-2 text-xs leading-5 text-surface-300">{error}</p>
              <p className="mt-2 text-xs leading-5 text-surface-400">
                Try a browser with hardware acceleration enabled, or export the GLB and open it in a mobile AR viewer.
              </p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-surface-900/80 px-2.5 py-1.5 text-[10px] text-surface-400">
          <RotateCcw size={12} /> Drag to orbit · Scroll to zoom
        </div>
      </div>
    </div>
  );
}
