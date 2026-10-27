import {
  ArrowDownUp,
  ArrowLeftRight,
  Box,
  Copy,
  Eraser,
  Focus,
  Layers,
  Link2,
  MousePointer2,
  Plus,
  RotateCcw,
  Settings2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { addTrussChords } from '../lib/chordBuilder';
import { computeSectionProps, SECTION_PRESETS, solidRodFromArea } from '../lib/crossSections';
import { nextId } from '../lib/ids';
import { MATERIALS } from '../lib/materials';
import {
  applyEditorView,
  buildEditableTrussGroup,
  duplicateMirroredHalf,
  intersectEditPlane,
  mirrorStructureHorizontal,
  mirrorStructureVertical,
  snapFea,
  threeToFea,
  type Editor3DView,
} from '../lib/truss3dEdit';
import type { Beam, GridSize, StructureState, SupportType, ToolMode } from '../lib/types';

type Editor3DTool = Extract<ToolMode, 'select' | 'node' | 'beam' | 'erase' | 'support' | 'force'>;

const SUPPORT_CYCLE: SupportType[] = ['none', 'pin', 'rollerY', 'rollerX', 'fixed'];

const VIEW_PRESETS: { id: Editor3DView; label: string }[] = [
  { id: 'iso', label: 'Iso' },
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

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
  const setViewRef = useRef<(view: Editor3DView) => void>(() => undefined);

  const [tool, setTool] = useState<Editor3DTool>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedBeamId, setSelectedBeamId] = useState<string | null>(null);
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<Editor3DView>('iso');
  const [showInspector, setShowInspector] = useState(true);
  const [status, setStatus] = useState('Orbit: right-drag · Views: Front/Back/Top/Bottom · Edit parts in the inspector');
  const [error, setError] = useState<string | null>(null);
  const [chordHeight, setChordHeight] = useState(100);
  const [bayLength, setBayLength] = useState(120);

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

  const selectedNode = useMemo(
    () => state.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [state.nodes, selectedNodeId],
  );
  const selectedBeam = useMemo(
    () => state.beams.find((b) => b.id === selectedBeamId) ?? null,
    [state.beams, selectedBeamId],
  );

  const boundsHint = useMemo(() => {
    if (state.nodes.length === 0) return 'Empty model — use Node tool and click the grid plane';
    return `${state.nodes.length} joints · ${state.beams.length} members · snap ${gridSize} mm`;
  }, [state.nodes.length, state.beams.length, gridSize]);

  const patchState = (next: StructureState) => onChange(next);

  const updateSelectedNode = (patch: Partial<(typeof state.nodes)[number]>) => {
    if (!selectedNodeId) return;
    patchState({
      ...state,
      nodes: state.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...patch } : n)),
    });
  };

  const updateSelectedBeam = (patch: Partial<Beam>) => {
    if (!selectedBeamId) return;
    patchState({
      ...state,
      beams: state.beams.map((b) => (b.id === selectedBeamId ? { ...b, ...patch } : b)),
    });
  };

  const applyMaterialToSelection = (materialId: string) => {
    if (selectedBeam) {
      updateSelectedBeam({ materialId });
      setStatus(`Member ${selectedBeam.id} → ${MATERIALS.find((m) => m.id === materialId)?.name ?? materialId}`);
      return;
    }
    patchState({
      ...state,
      materialId,
      beams: state.beams.map((b) => ({ ...b, materialId })),
    });
    setStatus(`All members → ${MATERIALS.find((m) => m.id === materialId)?.name ?? materialId}`);
  };

  const applySectionPreset = (presetId: string) => {
    const preset = SECTION_PRESETS.find((p) => p.id === presetId);
    if (!preset || !selectedBeam) return;
    const props = computeSectionProps(preset.section);
    updateSelectedBeam({ section: preset.section, area: props.area, I: props.I });
    setStatus(`Member ${selectedBeam.id} section → ${preset.label}`);
  };

  const applyArea = (area: number) => {
    if (!selectedBeam || !(area > 0)) return;
    const section = solidRodFromArea(area);
    const props = computeSectionProps(section);
    updateSelectedBeam({ section, area: props.area, I: props.I });
    setStatus(`Member ${selectedBeam.id} area → ${props.area.toFixed(1)} mm²`);
  };

  const addChord = (which: 'bottom' | 'top' | 'both') => {
    const xs = state.nodes.map((n) => n.x);
    const ys = state.nodes.map((n) => n.y);
    const startX = xs.length ? Math.min(...xs) : 180;
    const startY = ys.length ? Math.max(...ys) : 320;
    const span = xs.length ? Math.max(...xs) - Math.min(...xs) : bayLength * 4;
    const bayCount = Math.max(1, Math.round(span / Math.max(bayLength, 1)) || 4);
    const next = addTrussChords(state, {
      startX,
      startY,
      bayCount,
      bayLength: span > 0 ? span / bayCount : bayLength,
      height: chordHeight,
      bottom: which === 'bottom' || which === 'both',
      top: which === 'top' || which === 'both',
      verticals: which === 'both',
      supports: which !== 'top' && state.nodes.every((n) => n.support === 'none'),
      materialId: state.materialId,
      area: state.defaultArea,
    });
    patchState(next);
    setStatus(
      which === 'both'
        ? 'Added top & bottom chords with verticals'
        : which === 'top'
          ? 'Added / extended top chord'
          : 'Added / extended bottom chord',
    );
  };

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

      const modelBounds = () => {
        const target = model ?? scene;
        const box = new THREE.Box3().setFromObject(target);
        if (box.isEmpty()) {
          return { center: new THREE.Vector3(), radius: 120 };
        }
        const center = box.getCenter(new THREE.Vector3());
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        return { center, radius: Math.max(sphere.radius, 40) };
      };

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
        grid = new THREE.GridHelper(
          span * 2.5,
          Math.max(10, Math.round((span * 2.5) / Math.max(gridSize, 1))),
          0x334155,
          0x1e293b,
        );
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -0.5;
        scene.add(grid);
      };
      rebuildRef.current = rebuild;

      const fit = () => {
        const { center, radius } = modelBounds();
        applyEditorView('iso', camera, controls!, center, radius);
      };
      fitRef.current = fit;

      setViewRef.current = (view: Editor3DView) => {
        const { center, radius } = modelBounds();
        applyEditorView(view, camera, controls!, center, radius);
      };

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
        return (
          hits.find((hit) => hit.object.userData.kind === 'node' || hit.object.userData.kind === 'beam') ??
          null
        );
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
          setStatus(`Selected member ${hit.object.userData.id} — change material/section in the inspector`);
          rebuild();
          return;
        }

        if (toolNow === 'support') {
          if (hit?.object.userData.kind !== 'node') {
            setStatus('Support tool: click a joint to cycle pin / roller / fixed');
            return;
          }
          const nodeId = hit.object.userData.id as string;
          const node = stateRef.current.nodes.find((n) => n.id === nodeId);
          if (!node) return;
          const idx = SUPPORT_CYCLE.indexOf(node.support);
          const next = SUPPORT_CYCLE[(idx + 1) % SUPPORT_CYCLE.length];
          applyPatch({
            nodes: stateRef.current.nodes.map((n) => (n.id === nodeId ? { ...n, support: next } : n)),
          });
          setSelectedNodeId(nodeId);
          setSelectedBeamId(null);
          setStatus(`Joint ${nodeId} support → ${next}`);
          return;
        }

        if (toolNow === 'force') {
          if (hit?.object.userData.kind !== 'node') {
            setStatus('Force tool: click a joint, then edit Fx/Fy in the inspector');
            return;
          }
          const nodeId = hit.object.userData.id as string;
          setSelectedNodeId(nodeId);
          setSelectedBeamId(null);
          setStatus(`Joint ${nodeId} selected — set loads in the inspector`);
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
            nodes: [...stateRef.current.nodes, { id, x, y, support: 'none', fx: 0, fy: 0 }],
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
              (b.nodeI === from && b.nodeJ === nodeId) || (b.nodeI === nodeId && b.nodeJ === from),
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
              Edit joints, members, materials, supports · view every side · {boundsHint}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolChip
            active={tool === 'select'}
            onClick={() => {
              setTool('select');
              setDraftFrom(null);
              setStatus('Select: drag joints · click members to change parts');
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
            active={tool === 'support'}
            onClick={() => {
              setTool('support');
              setDraftFrom(null);
              setStatus('Support: click a joint to cycle pin / roller / fixed');
            }}
            icon={<Layers size={13} />}
            label="Support"
          />
          <ToolChip
            active={tool === 'force'}
            onClick={() => {
              setTool('force');
              setDraftFrom(null);
              setStatus('Force: select a joint, then edit Fx/Fy in the inspector');
            }}
            icon={<Settings2 size={13} />}
            label="Force"
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
            onClick={() => setShowInspector((v) => !v)}
            aria-pressed={showInspector}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs ${
              showInspector
                ? 'border-accent/50 bg-accent/15 text-accent'
                : 'border-surface-700 text-surface-300 hover:border-surface-500'
            }`}
          >
            Parts
          </button>
          <button
            type="button"
            onClick={() => {
              fitRef.current();
              setActiveView('iso');
            }}
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

      <div className="flex min-h-0 flex-1">
        <div ref={mountRef} className="relative min-h-0 flex-1 overflow-hidden">
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-md rounded-xl border border-amber-400/30 bg-surface-900/90 p-5">
                <p className="text-sm font-semibold text-amber-200">3D editor unavailable</p>
                <p className="mt-2 text-xs leading-5 text-surface-300">{error}</p>
              </div>
            </div>
          )}
          <div className="pointer-events-auto absolute left-3 top-3 z-10 flex flex-wrap gap-1">
            {VIEW_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setActiveView(preset.id);
                  setViewRef.current(preset.id);
                  setStatus(`View: ${preset.label}`);
                }}
                className={`rounded-md border px-2 py-1 text-[10px] font-medium ${
                  activeView === preset.id
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-surface-700 bg-surface-900/90 text-surface-300 hover:border-surface-500'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 max-w-[min(28rem,calc(100%-1.5rem))] rounded-md bg-surface-900/85 px-2.5 py-1.5 text-[10px] text-surface-300">
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw size={11} /> {status}
            </span>
            <span className="mt-1 block text-surface-500">
              FEA stays planar (2D). Use view buttons to inspect the other side, top, and bottom while editing.
            </span>
          </div>
        </div>

        {showInspector && (
          <aside className="flex w-[min(22rem,100%)] shrink-0 flex-col overflow-y-auto border-l border-surface-700 bg-surface-900/95">
            <div className="border-b border-surface-700 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Parts & geometry</p>
              <p className="mt-0.5 text-[10px] text-surface-400">Change selected members, supports, loads, chords, and mirrors.</p>
            </div>

            <section className="space-y-2 border-b border-surface-700 p-3">
              <p className="text-[10px] font-semibold text-surface-200">Quick geometry</p>
              <div className="grid grid-cols-2 gap-1.5">
                <ActionBtn
                  icon={<ArrowLeftRight size={12} />}
                  label="Mirror L↔R"
                  onClick={() => {
                    patchState(mirrorStructureHorizontal(state));
                    setStatus('Mirrored left ↔ right');
                  }}
                />
                <ActionBtn
                  icon={<ArrowDownUp size={12} />}
                  label="Mirror U↔D"
                  onClick={() => {
                    patchState(mirrorStructureVertical(state));
                    setStatus('Mirrored top ↔ bottom');
                  }}
                />
                <ActionBtn
                  icon={<Copy size={12} />}
                  label="Copy other side"
                  onClick={() => {
                    patchState(duplicateMirroredHalf(state));
                    setStatus('Duplicated a mirrored half beside the model');
                    window.setTimeout(() => fitRef.current(), 40);
                  }}
                />
                <ActionBtn
                  icon={<Layers size={12} />}
                  label="Bottom chord"
                  onClick={() => addChord('bottom')}
                />
                <ActionBtn icon={<Layers size={12} />} label="Top chord" onClick={() => addChord('top')} />
                <ActionBtn
                  icon={<Layers size={12} />}
                  label="Top+bottom"
                  onClick={() => addChord('both')}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-surface-400">
                  Chord height (mm)
                  <input
                    type="number"
                    min={20}
                    step={10}
                    value={chordHeight}
                    onChange={(e) => setChordHeight(Number(e.target.value) || 100)}
                    className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                  />
                </label>
                <label className="text-[10px] text-surface-400">
                  Bay length (mm)
                  <input
                    type="number"
                    min={20}
                    step={10}
                    value={bayLength}
                    onChange={(e) => setBayLength(Number(e.target.value) || 120)}
                    className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                  />
                </label>
              </div>
            </section>

            {selectedBeam && (
              <section className="space-y-2 border-b border-surface-700 p-3">
                <p className="text-[10px] font-semibold text-surface-200">Member {selectedBeam.id}</p>
                <label className="block text-[10px] text-surface-400">
                  Material
                  <select
                    value={selectedBeam.materialId}
                    onChange={(e) => applyMaterialToSelection(e.target.value)}
                    className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                  >
                    {MATERIALS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] text-surface-400">
                  Section preset
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) applySectionPreset(e.target.value);
                      e.target.value = '';
                    }}
                    className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                  >
                    <option value="">Choose a section…</option>
                    {SECTION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] text-surface-400">
                  Area (mm²)
                  <input
                    type="number"
                    min={1}
                    step={5}
                    value={Math.round(selectedBeam.area)}
                    onChange={(e) => applyArea(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                  />
                </label>
                <p className="text-[10px] text-surface-500">
                  {selectedBeam.nodeI} → {selectedBeam.nodeJ}
                </p>
              </section>
            )}

            {selectedNode && (
              <section className="space-y-2 border-b border-surface-700 p-3">
                <p className="text-[10px] font-semibold text-surface-200">Joint {selectedNode.id}</p>
                <label className="block text-[10px] text-surface-400">
                  Support
                  <select
                    value={selectedNode.support}
                    onChange={(e) => updateSelectedNode({ support: e.target.value as SupportType })}
                    className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                  >
                    {SUPPORT_CYCLE.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-surface-400">
                    Fx (N)
                    <input
                      type="number"
                      step={100}
                      value={selectedNode.fx}
                      onChange={(e) => updateSelectedNode({ fx: Number(e.target.value) || 0 })}
                      className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                    />
                  </label>
                  <label className="text-[10px] text-surface-400">
                    Fy (N)
                    <input
                      type="number"
                      step={100}
                      value={selectedNode.fy}
                      onChange={(e) => updateSelectedNode({ fy: Number(e.target.value) || 0 })}
                      className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                    />
                  </label>
                  <label className="text-[10px] text-surface-400">
                    X (mm)
                    <input
                      type="number"
                      step={gridSize}
                      value={selectedNode.x}
                      onChange={(e) =>
                        updateSelectedNode({ x: snapFea(Number(e.target.value) || 0, gridSize) })
                      }
                      className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                    />
                  </label>
                  <label className="text-[10px] text-surface-400">
                    Y (mm)
                    <input
                      type="number"
                      step={gridSize}
                      value={selectedNode.y}
                      onChange={(e) =>
                        updateSelectedNode({ y: snapFea(Number(e.target.value) || 0, gridSize) })
                      }
                      className="mt-1 w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                    />
                  </label>
                </div>
              </section>
            )}

            {!selectedNode && !selectedBeam && (
              <section className="p-3 text-[10px] leading-4 text-surface-400">
                Select a joint or member in the viewport to edit its parts. Use <span className="text-surface-200">Back</span>{' '}
                / <span className="text-surface-200">Top</span> / <span className="text-surface-200">Bottom</span> views to
                work the other side of the truss.
              </section>
            )}

            {!selectedBeam && state.beams.length > 0 && (
              <section className="space-y-2 p-3">
                <p className="text-[10px] font-semibold text-surface-200">Apply material to all members</p>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) applyMaterialToSelection(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
                >
                  <option value="">Choose material…</option>
                  {MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </section>
            )}
          </aside>
        )}
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
  icon: ReactNode;
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

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1 rounded-lg border border-surface-700 px-2 py-2 text-[10px] text-surface-200 hover:border-accent/40 hover:text-accent"
    >
      {icon}
      {label}
    </button>
  );
}
