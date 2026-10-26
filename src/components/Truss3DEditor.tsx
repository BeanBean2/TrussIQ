import {
  Box,
  Eraser,
  Focus,
  Link2,
  MousePointer2,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { nextId } from '../lib/ids';
import { computeSectionProps, solidRodFromArea } from '../lib/crossSections';
import {
  buildEditableTrussGroup,
  intersectEditPlane,
  snapFea,
  threeToFea,
} from '../lib/truss3dEdit';
import type { Beam, GridSize, StructureState, ToolMode } from '../lib/types';

type Editor3DTool = Extract<ToolMode, 'select' | 'node' | 'beam' | 'erase'>;

interface Truss3DEditorProps {
  state: StructureState;
  gridSize: GridSize;
  onChange: (next: StructureState) => void;
  onClose: () => void;
  onOpenPreview?: () => void;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material.dispose();
    }
  });
}

export function Truss3DEditor({
  state,
  gridSize,
  onChange,
  onClose,
  onOpenPreview,
}: Truss3DEditorProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);
  const toolRef = useRef<Editor3DTool>('select');
  const draftFromRef = useRef<string | null>(null);
  const selectedRef = useRef<{ nodeId: string | null; beamId: string | null }>({
    nodeId: null,
    beamId: null,
  });
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const rebuildRef = useRef<() => void>(() => undefined);
  const fitRef = useRef<() => void>(() => undefined);

  const [tool, setTool] = useState<Editor3DTool>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedBeamId, setSelectedBeamId] = useState<string | null>(null);
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const [status, setStatus] = useState('Orbit: right-drag or two-finger · Left-drag joints in Select');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    draftFromRef.current = draftFrom;
  }, [draftFrom]);
  useEffect(() => {
    selectedRef.current = { nodeId: selectedNodeId, beamId: selectedBeamId };
  }, [selectedNodeId, selectedBeamId]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const boundsHint = useMemo(() => {
    if (state.nodes.length === 0) return 'Empty model — use Node tool and click the grid plane';
    return `${state.nodes.length} joints · ${state.beams.length} members · snap ${gridSize} mm`;
  }, [state.nodes.length, state.beams.length, gridSize]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let model: THREE.Group | null = null;
    let grid: THREE.GridHelper | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      const w = Math.max(mount.clientWidth, 1);
      const h = Math.max(mount.clientHeight, 1);
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setSize(w, h, false);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1219);
      const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50000);
      scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.35));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(-400, 700, 500);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x93c5fd, 0.9);
      fill.position.set(500, 200, -400);
      scene.add(fill);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      // Left-drag is reserved for joint edits when Select tool hits a node
      controls.enablePan = true;

      const planeHelper = new THREE.Mesh(
        new THREE.PlaneGeometry(8000, 8000),
        new THREE.MeshBasicMaterial({
          color: 0x0ea5a4,
          transparent: true,
          opacity: 0.04,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      planeHelper.userData = { kind: 'plane' };
      scene.add(planeHelper);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      const rebuild = () => {
        if (model) {
          scene.remove(model);
          disposeObject(model);
        }
        if (grid) {
          scene.remove(grid);
          const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
          mats.forEach((m) => m.dispose());
          grid.geometry.dispose();
        }
        const current = stateRef.current;
        model = buildEditableTrussGroup(current.nodes, current.beams, {
          selectedNodeId: selectedRef.current.nodeId,
          selectedBeamId: selectedRef.current.beamId,
          draftFromId: draftFromRef.current,
        });
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const span = Math.max(size.x, size.y, 400);
        grid = new THREE.GridHelper(span * 2.5, Math.max(10, Math.round((span * 2.5) / Math.max(gridSize, 1))), 0x334155, 0x1e293b);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -0.5;
        scene.add(grid);
      };
      rebuildRef.current = rebuild;

      const fit = () => {
        const target = model ?? scene;
        const box = new THREE.Box3().setFromObject(target);
        if (box.isEmpty()) {
          camera.position.set(280, 220, 520);
          controls!.target.set(0, 0, 0);
          controls!.update();
          return;
        }
        const center = box.getCenter(new THREE.Vector3());
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(sphere.radius, 40);
        camera.position.copy(center).add(new THREE.Vector3(radius * 1.2, radius * 0.85, radius * 1.6));
        controls!.target.copy(center);
        controls!.update();
      };
      fitRef.current = fit;

      rebuild();
      fit();

      const setPointer = (event: PointerEvent) => {
        const rect = renderer!.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
      };

      const pick = (): THREE.Intersection | null => {
        if (!model) return null;
        const hits = raycaster.intersectObjects(model.children, false);
        return hits.find((hit) => hit.object.userData.kind === 'node' || hit.object.userData.kind === 'beam') ?? null;
      };

      const applyPatch = (patch: Partial<StructureState>) => {
        onChangeRef.current({ ...stateRef.current, ...patch });
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        setPointer(event);
        const hit = pick();
        const toolNow = toolRef.current;

        if (toolNow === 'select' && hit?.object.userData.kind === 'node') {
          const nodeId = hit.object.userData.id as string;
          const node = stateRef.current.nodes.find((n) => n.id === nodeId);
          if (!node) return;
          const planeHit = intersectEditPlane(raycaster);
          if (!planeHit) return;
          const fea = threeToFea(planeHit);
          dragRef.current = {
            nodeId,
            offsetX: node.x - fea.x,
            offsetY: node.y - fea.y,
          };
          setSelectedNodeId(nodeId);
          setSelectedBeamId(null);
          controls!.enabled = false;
          renderer!.domElement.setPointerCapture(event.pointerId);
          setStatus(`Moving joint ${nodeId}`);
          event.preventDefault();
          return;
        }

        if (toolNow === 'select' && hit?.object.userData.kind === 'beam') {
          setSelectedBeamId(hit.object.userData.id as string);
          setSelectedNodeId(null);
          setStatus(`Selected member ${hit.object.userData.id}`);
          rebuild();
          return;
        }

        if (toolNow === 'node') {
          const planeHit = intersectEditPlane(raycaster);
          if (!planeHit) return;
          const fea = threeToFea(planeHit);
          const x = snapFea(fea.x, gridSize);
          const y = snapFea(fea.y, gridSize);
          if (stateRef.current.nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 1)) {
            setStatus('A joint already exists near that snap point');
            return;
          }
          const id = nextId('n');
          applyPatch({
            nodes: [
              ...stateRef.current.nodes,
              { id, x, y, support: 'none', fx: 0, fy: 0 },
            ],
          });
          setSelectedNodeId(id);
          setStatus(`Placed joint at (${x}, ${y}) mm`);
          return;
        }

        if (toolNow === 'beam') {
          if (hit?.object.userData.kind !== 'node') {
            setStatus('Beam tool: click a start joint, then an end joint');
            return;
          }
          const nodeId = hit.object.userData.id as string;
          const from = draftFromRef.current;
          if (!from) {
            setDraftFrom(nodeId);
            setStatus(`Beam start: ${nodeId} — click the end joint`);
            rebuild();
            return;
          }
          if (from === nodeId) {
            setDraftFrom(null);
            setStatus('Cancelled beam draft');
            rebuild();
            return;
          }
          const exists = stateRef.current.beams.some(
            (b) =>
              (b.nodeI === from && b.nodeJ === nodeId) ||
              (b.nodeI === nodeId && b.nodeJ === from),
          );
          if (exists) {
            setStatus('Those joints are already connected');
            setDraftFrom(null);
            rebuild();
            return;
          }
          const section = solidRodFromArea(stateRef.current.defaultArea);
          const props = computeSectionProps(section);
          const beam: Beam = {
            id: nextId('b'),
            nodeI: from,
            nodeJ: nodeId,
            area: props.area,
            I: props.I,
            section,
            materialId: stateRef.current.materialId,
          };
          applyPatch({ beams: [...stateRef.current.beams, beam] });
          setDraftFrom(null);
          setSelectedBeamId(beam.id);
          setStatus(`Added member ${beam.id}`);
          return;
        }

        if (toolNow === 'erase') {
          if (hit?.object.userData.kind === 'node') {
            const nodeId = hit.object.userData.id as string;
            applyPatch({
              nodes: stateRef.current.nodes.filter((n) => n.id !== nodeId),
              beams: stateRef.current.beams.filter((b) => b.nodeI !== nodeId && b.nodeJ !== nodeId),
            });
            setSelectedNodeId(null);
            setStatus(`Removed joint ${nodeId}`);
            return;
          }
          if (hit?.object.userData.kind === 'beam') {
            const beamId = hit.object.userData.id as string;
            applyPatch({
              beams: stateRef.current.beams.filter((b) => b.id !== beamId),
            });
            setSelectedBeamId(null);
            setStatus(`Removed member ${beamId}`);
          }
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        setPointer(event);
        const planeHit = intersectEditPlane(raycaster);
        if (!planeHit) return;
        const fea = threeToFea(planeHit);
        const x = snapFea(fea.x + drag.offsetX, gridSize);
        const y = snapFea(fea.y + drag.offsetY, gridSize);
        applyPatch({
          nodes: stateRef.current.nodes.map((n) => (n.id === drag.nodeId ? { ...n, x, y } : n)),
        });
      };

      const onPointerUp = (event: PointerEvent) => {
        if (dragRef.current) {
          dragRef.current = null;
          controls!.enabled = true;
          try {
            renderer!.domElement.releasePointerCapture(event.pointerId);
          } catch {
            // ignore
          }
          setStatus('Joint moved');
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('pointercancel', onPointerUp);

      const resize = () => {
        if (!renderer || !mount) return;
        const rw = Math.max(mount.clientWidth, 1);
        const rh = Math.max(mount.clientHeight, 1);
        camera.aspect = rw / rh;
        camera.updateProjectionMatrix();
        renderer.setSize(rw, rh, false);
      };
      resizeObserver = new ResizeObserver(resize);

      const animate = () => {
        frame = requestAnimationFrame(animate);
        controls?.update();
        renderer?.render(scene, camera);
      };
      animate();
      resizeObserver.observe(mount);

      return () => {
        cancelAnimationFrame(frame);
        resizeObserver?.disconnect();
        renderer?.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer?.domElement.removeEventListener('pointermove', onPointerMove);
        renderer?.domElement.removeEventListener('pointerup', onPointerUp);
        renderer?.domElement.removeEventListener('pointercancel', onPointerUp);
        controls?.dispose();
        if (model) disposeObject(model);
        if (grid) {
          const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
          mats.forEach((m) => m.dispose());
          grid.geometry.dispose();
        }
        planeHelper.geometry.dispose();
        (planeHelper.material as THREE.Material).dispose();
        renderer?.dispose();
        if (renderer?.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The 3D editor could not start.');
      return undefined;
    }
  }, [gridSize]);

  // Rebuild meshes when structure / selection changes (outside WebGL bootstrap)
  useEffect(() => {
    rebuildRef.current();
  }, [state, selectedNodeId, selectedBeamId, draftFrom]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="3D truss editor"
      className="fixed inset-0 z-50 flex flex-col bg-surface-950/95 backdrop-blur-sm animate-fade-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-700 bg-surface-900/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
            <Box size={17} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-100">3D editor</h2>
            <p className="text-[11px] text-surface-400">
              Planar FEA model · edit joints in the structure plane · {boundsHint}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolChip
            active={tool === 'select'}
            onClick={() => {
              setTool('select');
              setDraftFrom(null);
              setStatus('Select: left-drag joints · orbit with right-drag');
            }}
            icon={<MousePointer2 size={13} />}
            label="Select"
          />
          <ToolChip
            active={tool === 'node'}
            onClick={() => {
              setTool('node');
              setDraftFrom(null);
              setStatus('Node: click the grid plane to place a joint');
            }}
            icon={<Plus size={13} />}
            label="Node"
          />
          <ToolChip
            active={tool === 'beam'}
            onClick={() => {
              setTool('beam');
              setStatus('Beam: click start joint, then end joint');
            }}
            icon={<Link2 size={13} />}
            label="Beam"
          />
          <ToolChip
            active={tool === 'erase'}
            onClick={() => {
              setTool('erase');
              setDraftFrom(null);
              setStatus('Erase: click a joint or member');
            }}
            icon={<Eraser size={13} />}
            label="Erase"
          />
          <button
            type="button"
            onClick={() => fitRef.current()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 px-2.5 py-2 text-xs text-surface-300 hover:border-surface-500"
            title="Fit model"
          >
            <Focus size={13} /> Fit
          </button>
          {onOpenPreview && (
            <button
              type="button"
              onClick={onOpenPreview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/35 bg-accent/10 px-2.5 py-2 text-xs text-accent hover:bg-accent/20"
            >
              Extruded preview
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-700 p-2 text-surface-300 hover:bg-surface-800"
            aria-label="Close 3D editor"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div ref={mountRef} className="relative min-h-0 flex-1 overflow-hidden">
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-md rounded-xl border border-amber-400/30 bg-surface-900/90 p-5">
              <p className="text-sm font-semibold text-amber-200">3D editor unavailable</p>
              <p className="mt-2 text-xs leading-5 text-surface-300">{error}</p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[min(28rem,calc(100%-1.5rem))] rounded-md bg-surface-900/85 px-2.5 py-1.5 text-[10px] text-surface-300">
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw size={11} /> {status}
          </span>
          <span className="mt-1 block text-surface-500">
            Analysis stays planar (2D). Depth is for viewing only — use Extruded preview for the AR/GLB model.
          </span>
        </div>
      </div>
    </div>
  );
}

function ToolChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition ${
        active
          ? 'border-accent/50 bg-accent/15 text-accent'
          : 'border-surface-700 text-surface-300 hover:border-surface-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
