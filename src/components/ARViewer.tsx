import { Box, Download, Focus, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTrussScene, downloadTrussGLB } from '../lib/gltfExport';
import { getMaterial } from '../lib/materials';
import type { Beam, Node } from '../lib/types';

interface ARViewerProps {
  nodes: Node[];
  beams: Beam[];
  onClose: () => void;
}

function disposeSceneResources(scene: THREE.Scene | null) {
  if (!scene) return;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) geometries.add(object.geometry);
    if ('material' in object) {
      const material = object.material;
      if (Array.isArray(material)) material.forEach((item) => materials.add(item));
      else if (material instanceof THREE.Material) materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

/**
 * 3D extrusion viewer with orbit controls + GLB download for mobile WebAR
 * (open the .glb in iOS Files / Android Scene Viewer / model-viewer).
 */
export function ARViewer({ nodes, beams, onClose }: ARViewerProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const mountRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<() => void>(() => undefined);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const materialLegend = [...new Set(beams.map((beam) => beam.materialId))].map((id) => getMaterial(id));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setError(null);

    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let errorTimer = 0;
    let scene: THREE.Scene | null = null;
    let visibilityHandler: (() => void) | null = null;
    let contextLostHandler: ((event: Event) => void) | null = null;
    let contextRestoredHandler: (() => void) | null = null;

    try {
      const w = Math.max(mount.clientWidth, 1);
      const h = Math.max(mount.clientHeight, 1);
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(w, h, false);
      mount.appendChild(renderer.domElement);

      const activeScene = new THREE.Scene();
      scene = activeScene;
      activeScene.background = new THREE.Color(0x101820);
      activeScene.fog = new THREE.Fog(0x101820, 2200, 8000);
      const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50000);

      activeScene.add(new THREE.HemisphereLight(0xd9ecff, 0x26313b, 1.6));
      const dir = new THREE.DirectionalLight(0xfff3df, 3.2);
      dir.position.set(-500, 900, 700);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      dir.shadow.camera.left = -2000;
      dir.shadow.camera.right = 2000;
      dir.shadow.camera.top = 2000;
      dir.shadow.camera.bottom = -2000;
      dir.shadow.bias = -0.0002;
      activeScene.add(dir);
      const fill = new THREE.DirectionalLight(0x8fc8ff, 1.35);
      fill.position.set(700, 180, -900);
      activeScene.add(fill);

      const model = buildTrussScene(nodes, beams);
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      activeScene.add(model);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      const radius = Math.max(sphere.radius, 20);
      const gridSize = Math.max(500, radius * 4);
      const floorY = bounds.max.y + radius * 0.12;
      const grid = new THREE.GridHelper(gridSize, 32, 0x3b5365, 0x263744);
      grid.position.set(center.x, floorY, center.z);
      const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
      gridMaterials.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.32;
      });
      activeScene.add(grid);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(gridSize, gridSize),
        new THREE.ShadowMaterial({ color: 0x071018, opacity: 0.28 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(center.x, floorY - 0.2, center.z);
      ground.receiveShadow = true;
      activeScene.add(ground);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = Math.max(radius * 0.55, 30);
      controls.maxDistance = radius * 12;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.target.copy(center);

      const fitCamera = () => {
        if (!controls) return;
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const distance = (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.22;
        camera.position.copy(center).add(new THREE.Vector3(1, 0.55, 1).normalize().multiplyScalar(distance));
        camera.near = Math.max(radius / 1000, 0.1);
        camera.far = Math.max(distance + radius * 12, 1000);
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.update();
      };
      resetViewRef.current = fitCamera;
      fitCamera();

      const render = () => {
        frame = 0;
        if (!renderer || !controls || document.hidden) return;
        controls.update();
        renderer.render(activeScene, camera);
      };
      const requestRender = () => {
        if (!frame && !document.hidden) frame = requestAnimationFrame(render);
      };
      contextLostHandler = (event) => {
        event.preventDefault();
        setError('The browser paused the 3D graphics context. Waiting for it to recover…');
      };
      contextRestoredHandler = () => {
        setError(null);
        requestRender();
      };
      renderer.domElement.addEventListener('webglcontextlost', contextLostHandler);
      renderer.domElement.addEventListener('webglcontextrestored', contextRestoredHandler);
      visibilityHandler = requestRender;
      controls.addEventListener('change', requestRender);
      document.addEventListener('visibilitychange', visibilityHandler);
      requestRender();

      const resize = () => {
        if (!renderer || !mount) return;
        const nw = Math.max(mount.clientWidth, 1);
        const nh = Math.max(mount.clientHeight, 1);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh, false);
        fitCamera();
        requestRender();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
    } catch (cause) {
      cancelAnimationFrame(frame);
      controls?.dispose();
      resizeObserver?.disconnect();
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if (contextLostHandler) renderer?.domElement.removeEventListener('webglcontextlost', contextLostHandler);
      if (contextRestoredHandler) renderer?.domElement.removeEventListener('webglcontextrestored', contextRestoredHandler);
      disposeSceneResources(scene);
      renderer?.dispose();
      if (renderer?.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      const message = cause instanceof Error && cause.message
        ? `The 3D preview could not start: ${cause.message}`
        : 'The 3D preview could not start in this browser.';
      errorTimer = window.setTimeout(() => setError(message), 0);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(errorTimer);
      resizeObserver?.disconnect();
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if (contextLostHandler) renderer?.domElement.removeEventListener('webglcontextlost', contextLostHandler);
      if (contextRestoredHandler) renderer?.domElement.removeEventListener('webglcontextrestored', contextRestoredHandler);
      controls?.dispose();
      resetViewRef.current = () => undefined;
      renderer?.dispose();
      disposeSceneResources(scene);
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
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="3D model preview" className="fixed inset-0 z-50 flex flex-col bg-surface-950/95 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-700 bg-surface-900/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent"><Box size={17} /></div>
          <div>
            <h2 className="text-sm font-semibold text-surface-100">3D model preview</h2>
            <p className="text-[11px] text-surface-400">Extruded truss model · orbit to inspect</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => resetViewRef.current()} className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-xs font-medium text-surface-300 hover:border-surface-500 hover:bg-surface-800" title="Fit model in view">
            <Focus size={14} /> Fit model
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-surface-950"
          >
            <Download size={14} />
            {exporting ? 'Preparing GLB...' : 'Export for AR'}
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
      <div ref={mountRef} className="ar-viewer-stage relative min-h-0 flex-1 overflow-hidden">
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
        <div className="pointer-events-none absolute right-3 top-3 flex max-w-[min(18rem,calc(100%-1.5rem))] flex-wrap justify-end gap-1.5">
          {materialLegend.map((material) => (
            <span
              key={material.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-900/85 px-2.5 py-1 text-[10px] text-surface-200 shadow-lg"
            >
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/30"
                style={{ backgroundColor: material.color }}
              />
              {material.name}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-surface-900/80 px-2.5 py-1.5 text-[10px] text-surface-400">
          <RotateCcw size={12} /> Drag to orbit · Scroll to zoom
        </div>
      </div>
    </div>
  );
}
