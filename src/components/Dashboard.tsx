import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, MousePointer2, Play, X } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { analyzeStructure } from '../lib/aiOptimizer';
import { computeSectionProps, solidRodFromArea, type SectionParams } from '../lib/crossSections';
import {
  applyDynamics,
  DEFAULT_SEISMIC,
  DEFAULT_WIND,
} from '../lib/dynamicsEngine';
import { solveTruss } from '../lib/feaEngine';
import { buildFormulaBreakdown } from '../lib/formulaInspector';
import { nextId } from '../lib/ids';
import { computeMassCost } from '../lib/massCost';
import { DEFAULT_AREA, DEFAULT_MATERIAL_ID } from '../lib/materials';
import { PRESET_LOADERS, type PresetKey } from '../lib/presets';
import { captureCanvasPNG, generateOfficialReport } from '../lib/reportGenerator';
import {
  exportTrussFile,
  loadLocalDraft,
  parseTrussFile,
  saveLocalDraft,
  serializeTruss,
} from '../lib/trussIO';
import { auditStructure } from '../lib/structureAudit';
import type {
  Beam,
  DynamicsMode,
  FEAResult,
  FormulaBreakdown,
  GridSize,
  Node,
  SeismicParams,
  StructureState,
  SupportType,
  ThemeMode,
  ToolMode,
  WindParams,
} from '../lib/types';
import { CanvasEditor } from './CanvasEditor';
import { DemoMode } from './DemoMode';
import { ForceModal } from './ForceModal';
import { FormulaInspector } from './FormulaInspector';
import { ShortcutsModal } from './ShortcutsModal';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { TopBar } from './TopBar';
import { TutorialOverlay } from './TutorialOverlay';
import { UnstableModal } from './UnstableModal';

const ARViewer = lazy(() =>
  import('./ARViewer').then((m) => ({ default: m.ARViewer })),
);
const CollapseAnimator = lazy(() =>
  import('./CollapseAnimator').then((m) => ({ default: m.CollapseAnimator })),
);
const CompareMode = lazy(() =>
  import('./CompareMode').then((m) => ({ default: m.CompareMode })),
);

const SUPPORT_CYCLE: SupportType[] = ['none', 'pin', 'rollerY', 'rollerX', 'fixed'];

const EMPTY: StructureState = {
  nodes: [],
  beams: [],
  materialId: DEFAULT_MATERIAL_ID,
  defaultArea: DEFAULT_AREA,
};

export function Dashboard({ initialDemo = false, onOpenHome }: { initialDemo?: boolean; onOpenHome?: () => void }) {
  const { state, commit, replace, undo, redo, canUndo, canRedo } = useHistory(EMPTY);
  const { nodes, beams, materialId, defaultArea } = state;
  const audit = useMemo(() => auditStructure(nodes, beams), [nodes, beams]);

  const [tool, setTool] = useState<ToolMode>('select');
  const [gridSize, setGridSize] = useState<GridSize>(20);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedBeamId, setSelectedBeamId] = useState<string | null>(null);
  const [beamDraftFrom, setBeamDraftFrom] = useState<string | null>(null);
  const [highlightBeamIds, setHighlightBeamIds] = useState<string[]>([]);
  const [highlightNodeIds, setHighlightNodeIds] = useState<string[]>([]);

  const [result, setResult] = useState<FEAResult | null>(null);
  const [showDeflection, setShowDeflection] = useState(false);
  const [deflectionScale, setDeflectionScale] = useState(80);
  const [solving, setSolving] = useState(false);

  const [forceTarget, setForceTarget] = useState<Node | null>(null);
  const [unstableMsg, setUnstableMsg] = useState<string | null>(null);
  const [formula, setFormula] = useState<FormulaBreakdown | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCollapse, setShowCollapse] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [draftStatus, setDraftStatus] = useState('Preparing workspace');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGuide, setShowGuide] = useState(
    () => localStorage.getItem('trussiq-guide-dismissed') !== '1',
  );

  const [dynamicsMode, setDynamicsMode] = useState<DynamicsMode>('none');
  const [wind] = useState<WindParams>(DEFAULT_WIND);
  const [seismic, setSeismic] = useState<SeismicParams>(DEFAULT_SEISMIC);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('trussiq-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const bootstrapped = useRef(false);

  /** Nodes with environmental loads applied (for solver + display arrows). */
  const dynamicNodes = useMemo(
    () => applyDynamics(nodes, beams, dynamicsMode, wind, seismic),
    [nodes, beams, dynamicsMode, wind, seismic],
  );

  const ai = useMemo(
    () => analyzeStructure(dynamicNodes, beams, result),
    [dynamicNodes, beams, result],
  );
  const analysisStatus =
    !nodes.length || !beams.length
      ? 'empty'
      : !result
        ? 'stale'
        : result.success && !result.unstable
          ? 'ready'
          : 'failed';

  const invalidate = useCallback(() => {
    setResult(null);
    setShowDeflection(false);
    setHighlightBeamIds([]);
    setHighlightNodeIds([]);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('trussiq-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const draft = loadLocalDraft();
    replace(draft ?? PRESET_LOADERS.howe.create());
    setDraftStatus(draft ? 'Restored local draft' : 'Ready to edit');
  }, [replace]);

  useEffect(() => {
    if (!bootstrapped.current) return;
    saveLocalDraft(state);
    setDraftStatus('Saved locally');
  }, [state]);

  useEffect(() => {
    if (initialDemo) setShowDemo(true);
  }, [initialDemo]);

  // Seismic real-time sweep — advance time & re-solve while active (~30 Hz)
  useEffect(() => {
    if (dynamicsMode !== 'seismic') return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let t = seismic.time;
    setShowDeflection(true);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      acc += dt;
      if (acc >= 1 / 30) {
        acc = 0;
        const next = { ...DEFAULT_SEISMIC, amplitude: seismic.amplitude, omega: seismic.omega, time: t };
        setSeismic(next);
        const loaded = applyDynamics(nodes, beams, 'seismic', wind, next);
        setResult(solveTruss(loaded, beams));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // intentionally omit seismic.time to avoid restarting each frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicsMode, nodes, beams, wind, seismic.amplitude, seismic.omega]);

  const runSolver = useCallback(() => {
    if (nodes.length < 2 || beams.length < 1) {
      setUnstableMsg(
        'Add at least two nodes and one beam before running the FEA solver.',
      );
      return;
    }
    setSolving(true);
    requestAnimationFrame(() => {
      const loaded = applyDynamics(nodes, beams, dynamicsMode, wind, seismic);
      const res = solveTruss(loaded, beams);
      setResult(res);
      setSolving(false);
      if (res.unstable) {
        setUnstableMsg(
          res.message ??
            'Unstable Structure: Add more supports to prevent rigid body motion.',
        );
      } else if (!res.success && res.message) {
        setUnstableMsg(res.message);
      }
    });
  }, [nodes, beams, dynamicsMode, wind, seismic]);

  // Re-solve when wind mode toggled on
  useEffect(() => {
    if (dynamicsMode === 'wind') {
      runSolver();
    }
  }, [dynamicsMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveLocalDraft(state);
        setDraftStatus('Saved locally');
        return;
      }

      if (showCollapse && e.key === ' ') return;

      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        runSolver();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        invalidate();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        invalidate();
        return;
      }

      const map: Record<string, ToolMode> = {
        v: 'select',
        n: 'node',
        b: 'beam',
        f: 'force',
        s: 'support',
        e: 'erase',
      };
      const t = map[e.key.toLowerCase()];
      if (t) {
        setTool(t);
        setBeamDraftFrom(null);
      }
      if (e.key === 'Escape') {
        setBeamDraftFrom(null);
        setSelectedNodeId(null);
        setSelectedBeamId(null);
        setForceTarget(null);
        setUnstableMsg(null);
        setFormula(null);
        setShowTutorial(false);
        setShowShortcuts(false);
        setShowCollapse(false);
        setShowAR(false);
        setShowCompare(false);
        setHighlightBeamIds([]);
        setHighlightNodeIds([]);
        setPresentationMode(false);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          commit((prev) => ({
            ...prev,
            nodes: prev.nodes.filter((n) => n.id !== selectedNodeId),
            beams: prev.beams.filter(
              (b) => b.nodeI !== selectedNodeId && b.nodeJ !== selectedNodeId,
            ),
          }));
          setSelectedNodeId(null);
          invalidate();
        } else if (selectedBeamId) {
          commit((prev) => ({
            ...prev,
            beams: prev.beams.filter((b) => b.id !== selectedBeamId),
          }));
          setSelectedBeamId(null);
          invalidate();
        }
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        runSolver();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNodeId, selectedBeamId, commit, undo, redo, invalidate, runSolver, state, showCollapse]);

  const loadPreset = (key: PresetKey) => {
    replace(PRESET_LOADERS[key].create());
    setSelectedNodeId(null);
    setSelectedBeamId(null);
    setBeamDraftFrom(null);
    invalidate();
  };

  const launchDemo = () => {
    const demo = PRESET_LOADERS.warren.create();
    replace(demo);
    setDynamicsMode('none');
    setTool('select');
    setSelectedNodeId(null);
    setSelectedBeamId(null);
    setBeamDraftFrom(null);
    setHighlightBeamIds([]);
    setHighlightNodeIds([]);
    setShowDemo(false);
    setShowDeflection(true);
    setResult(solveTruss(demo.nodes, demo.beams));
  };

  const clearAll = () => {
    if ((nodes.length > 0 || beams.length > 0) && !window.confirm('Clear the current design?')) {
      return;
    }
    replace(EMPTY);
    setSelectedNodeId(null);
    setSelectedBeamId(null);
    setBeamDraftFrom(null);
    invalidate();
  };

  const placeNode = (x: number, y: number) => {
    if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 1)) return;
    commit((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { id: nextId('n'), x, y, support: 'none' as const, fx: 0, fy: 0 },
      ],
    }));
    invalidate();
  };

  const beamClickNode = (nodeId: string) => {
    if (!beamDraftFrom) {
      setBeamDraftFrom(nodeId);
      return;
    }
    if (beamDraftFrom === nodeId) {
      setBeamDraftFrom(null);
      return;
    }
    const exists = beams.some(
      (b) =>
        (b.nodeI === beamDraftFrom && b.nodeJ === nodeId) ||
        (b.nodeI === nodeId && b.nodeJ === beamDraftFrom),
    );
    if (!exists) {
      const section = solidRodFromArea(defaultArea);
      const props = computeSectionProps(section);
      const beam: Beam = {
        id: nextId('b'),
        nodeI: beamDraftFrom,
        nodeJ: nodeId,
        area: props.area,
        I: props.I,
        section,
        materialId,
      };
      commit((prev) => ({ ...prev, beams: [...prev.beams, beam] }));
      invalidate();
    }
    setBeamDraftFrom(null);
  };

  const cycleSupport = (nodeId: string) => {
    commit((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const idx = SUPPORT_CYCLE.indexOf(n.support);
        return { ...n, support: SUPPORT_CYCLE[(idx + 1) % SUPPORT_CYCLE.length] };
      }),
    }));
    invalidate();
  };

  const eraseAt = (nodeId: string | null, beamId: string | null) => {
    if (nodeId) {
      commit((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        beams: prev.beams.filter((b) => b.nodeI !== nodeId && b.nodeJ !== nodeId),
      }));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      invalidate();
    } else if (beamId) {
      commit((prev) => ({
        ...prev,
        beams: prev.beams.filter((b) => b.id !== beamId),
      }));
      if (selectedBeamId === beamId) setSelectedBeamId(null);
      invalidate();
    }
  };

  const applyForce = (fx: number, fy: number) => {
    if (!forceTarget) return;
    const id = forceTarget.id;
    commit((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, fx, fy } : n)),
    }));
    setForceTarget(null);
    invalidate();
  };

  const changeMaterial = (id: string) => {
    commit((prev) => ({
      ...prev,
      materialId: id,
      beams: prev.beams.map((b) => ({ ...b, materialId: id })),
    }));
    invalidate();
  };

  const changeDefaultArea = (area: number) => {
    commit((prev) => ({ ...prev, defaultArea: area }));
  };

  const changeSelectedBeamArea = (area: number) => {
    if (!selectedBeamId) return;
    const section = solidRodFromArea(area);
    const props = computeSectionProps(section);
    commit((prev) => ({
      ...prev,
      beams: prev.beams.map((b) =>
        b.id === selectedBeamId
          ? { ...b, area: props.area, I: props.I, section }
          : b,
      ),
    }));
    invalidate();
  };

  const changeSelectedBeamSection = (section: SectionParams, mid: string) => {
    if (!selectedBeamId) return;
    const props = computeSectionProps(section);
    commit((prev) => ({
      ...prev,
      beams: prev.beams.map((b) =>
        b.id === selectedBeamId
          ? { ...b, section, area: props.area, I: props.I, materialId: mid }
          : b,
      ),
    }));
    invalidate();
  };

  const openFormula = () => {
    if (!selectedBeamId) return;
    const data = buildFormulaBreakdown(selectedBeamId, dynamicNodes, beams, result);
    if (data) setFormula(data);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseTrussFile(text);
      replace({
        nodes: parsed.nodes,
        beams: parsed.beams,
        materialId: parsed.materialId,
        defaultArea: parsed.defaultArea,
      });
      invalidate();
    } catch (err) {
      setUnstableMsg(err instanceof Error ? err.message : 'Failed to import .truss file.');
    }
  };

  const handleCopyTruss = async () => {
    try {
      await navigator.clipboard.writeText(serializeTruss(state));
      setCopyStatus('Design JSON copied to clipboard');
    } catch {
      setCopyStatus('Clipboard access unavailable');
    }
    window.setTimeout(() => setCopyStatus(null), 2400);
  };

  const handleOfficialReport = async () => {
    const massCost = computeMassCost(nodes, beams);
    const img = captureCanvasPNG(canvasEl.current);
    await generateOfficialReport({
      name: 'TrussIQ Official Engineering Report',
      state,
      result,
      ai,
      massCost,
      canvasImage: img,
    });
  };

  return (
    <div className="flex h-full flex-col bg-surface-950 text-surface-100">
      {!presentationMode && <TopBar
        gridSize={gridSize}
        showDeflection={showDeflection}
        deflectionScale={deflectionScale}
        solving={solving}
        theme={theme}
        canUndo={canUndo}
        canRedo={canRedo}
        dynamicsMode={dynamicsMode}
        nodeCount={nodes.length}
        beamCount={beams.length}
        analysisStatus={analysisStatus}
        onGridSize={setGridSize}
        onToggleDeflection={() => {
          if (!result?.success) {
            runSolver();
            setShowDeflection(true);
          } else {
            setShowDeflection((v) => !v);
          }
        }}
        onDeflectionScale={setDeflectionScale}
        onRunSolver={runSolver}
        onLoadPreset={loadPreset}
        onClear={clearAll}
        onExportTruss={() => exportTrussFile(state, 'TrussIQ Design')}
        onCopyTruss={handleCopyTruss}
        onImportTruss={handleImport}
        onExportOfficialReport={handleOfficialReport}
        draftStatus={draftStatus}
        onSaveDraft={() => {
          saveLocalDraft(state);
          setDraftStatus('Saved locally');
        }}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onUndo={() => {
          undo();
          invalidate();
        }}
        onRedo={() => {
          redo();
          invalidate();
        }}
        onOpenTutorial={() => setShowTutorial(true)}
        onDynamicsMode={(m) => {
          setDynamicsMode(m);
          if (m === 'none') setShowDeflection(false);
          if (m === 'seismic') setSeismic((s) => ({ ...s, time: 0 }));
        }}
        onOpenCollapse={() => setShowCollapse(true)}
        onOpenAR={() => setShowAR(true)}
        onOpenCompare={() => setShowCompare(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenDemo={() => setShowDemo(true)}
        onOpenPresentation={() => setPresentationMode(true)}
        onOpenHome={onOpenHome ?? (() => undefined)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        nodeCount={nodes.length}
        beamCount={beams.length}
        analysisLabel={result?.success ? 'Analyzed' : result ? 'Needs review' : 'Ready'}
      />}

      {dynamicsMode !== 'none' && (
        <div className="flex items-center gap-3 border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-[11px] text-warn">
          <span className="font-semibold uppercase tracking-wide">
            {dynamicsMode === 'wind' ? 'Wind Shear Active' : 'Seismic Sweep Active'}
          </span>
          {dynamicsMode === 'wind' && (
            <span>
              v₀={wind.v0} m/s · α={wind.alpha} · Fx ∝ v(z)²
            </span>
          )}
          {dynamicsMode === 'seismic' && (
            <span className="font-mono">
              t={seismic.time.toFixed(2)}s · A={seismic.amplitude} m/s² · ω={seismic.omega} rad/s
            </span>
          )}
        </div>
      )}

      {copyStatus && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-accent/40 bg-surface-900 px-3 py-2 text-xs font-medium text-accent shadow-xl animate-fade-in">
          {copyStatus}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {!presentationMode && <Toolbar
          tool={tool}
          onToolChange={(t) => {
            setTool(t);
            setBeamDraftFrom(null);
          }}
        />}

        <main className="relative min-w-0 flex-1">
          <CanvasEditor
            nodes={dynamicNodes}
            beams={beams}
            tool={tool}
            gridSize={gridSize}
            result={result}
            showDeflection={showDeflection || dynamicsMode === 'seismic'}
            deflectionScale={deflectionScale}
            selectedNodeId={selectedNodeId}
            selectedBeamId={selectedBeamId}
            beamDraftFrom={beamDraftFrom}
            bucklingBeamIds={ai.bucklingBeamIds}
            highlightBeamIds={highlightBeamIds}
            highlightNodeIds={highlightNodeIds}
            canvasRefCallback={(el) => {
              canvasEl.current = el;
            }}
            onSelectNode={setSelectedNodeId}
            onSelectBeam={setSelectedBeamId}
            onPlaceNode={placeNode}
            onBeamClickNode={beamClickNode}
            onForceNode={(id) => {
              const n = nodes.find((nn) => nn.id === id);
              if (n) setForceTarget(n);
            }}
            onCycleSupport={cycleSupport}
            onEraseAt={eraseAt}
            onClearBeamDraft={() => setBeamDraftFrom(null)}
          />
          {presentationMode && (
            <PresentationHud
              result={result}
              nodeCount={nodes.length}
              beamCount={beams.length}
              onExit={() => setPresentationMode(false)}
            />
          )}
          {showGuide && nodes.length > 0 && !result && (
            <section className="absolute left-4 top-4 w-[min(23rem,calc(100%-2rem))] rounded-xl border border-accent/30 bg-surface-900/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-sm animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-accent">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
                    <BookOpen size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-surface-100">Your model is ready</p>
                    <p className="text-[10px] text-surface-400">A quick path from geometry to insight</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss workspace guide"
                  onClick={() => {
                    setShowGuide(false);
                    localStorage.setItem('trussiq-guide-dismissed', '1');
                  }}
                  className="rounded-md p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-200"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-surface-800/80 px-2.5 py-2 text-[11px] text-surface-300">
                  <MousePointer2 size={14} className="shrink-0 text-accent" />
                  Select a member or node to inspect its properties.
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-surface-800/80 px-2.5 py-2 text-[11px] text-surface-300">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-700 font-mono text-[9px] text-surface-200">2</span>
                  Adjust material or area in the inspector.
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-surface-800/80 px-2.5 py-2 text-[11px] text-surface-300">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-700 font-mono text-[9px] text-surface-200">3</span>
                  Run FEA to reveal forces and safety.
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={runSolver}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300"
                >
                  <Play size={13} fill="currentColor" /> Run first analysis
                </button>
                <button
                  type="button"
                  onClick={() => setShowTutorial(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-xs font-medium text-surface-300 hover:border-accent/50 hover:text-accent"
                >
                  <BookOpen size={13} /> Tour
                </button>
              </div>
            </section>
          )}
        </main>

        {!presentationMode && sidebarOpen && <Sidebar
          materialId={materialId}
          defaultArea={defaultArea}
          result={result}
          ai={ai}
          nodes={nodes}
          beams={beams}
          selectedBeamId={selectedBeamId}
          selectedNodeId={selectedNodeId}
          onMaterialChange={changeMaterial}
          onAreaChange={changeDefaultArea}
          onSelectedBeamArea={changeSelectedBeamArea}
          onSelectedBeamSection={changeSelectedBeamSection}
          onOpenFormula={openFormula}
          onFocusBeams={(ids) => {
            setHighlightBeamIds(ids);
            setSelectedBeamId(ids[0] ?? null);
          }}
          onFocusNodes={(ids) => {
            setHighlightNodeIds(ids);
            setSelectedNodeId(ids[0] ?? null);
          }}
          audit={audit}
        />}
      </div>

      {forceTarget && (
        <ForceModal
          nodeId={forceTarget.id}
          initialFx={forceTarget.fx}
          initialFy={forceTarget.fy}
          onApply={applyForce}
          onClose={() => setForceTarget(null)}
        />
      )}
      {unstableMsg && (
        <UnstableModal message={unstableMsg} onClose={() => setUnstableMsg(null)} />
      )}
      {formula && <FormulaInspector data={formula} onClose={() => setFormula(null)} />}
      {showTutorial && (
        <TutorialOverlay
          onClose={() => setShowTutorial(false)}
          onLoadWarren={() => {
            loadPreset('warren');
            setShowTutorial(false);
          }}
          onSetTool={(t) => setTool(t)}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showDemo && <DemoMode onClose={() => setShowDemo(false)} onLaunch={launchDemo} />}
      <Suspense fallback={null}>
        {showCollapse && (
          <CollapseAnimator
            nodes={nodes}
            beams={beams}
            onClose={() => setShowCollapse(false)}
          />
        )}
        {showAR && (
          <ARViewer nodes={nodes} beams={beams} onClose={() => setShowAR(false)} />
        )}
        {showCompare && (
          <CompareMode current={state} onClose={() => setShowCompare(false)} />
        )}
      </Suspense>
    </div>
  );
}

function PresentationHud({
  result,
  nodeCount,
  beamCount,
  onExit,
}: {
  result: FEAResult | null;
  nodeCount: number;
  beamCount: number;
  onExit: () => void;
}) {
  const maxDeflection = result?.success
    ? Math.max(...result.displacements.map((d) => Math.hypot(d.ux, d.uy)), 0)
    : 0;
  const safetyFactor = result?.maxSafetyRatio
    ? 1 / result.maxSafetyRatio
    : Number.POSITIVE_INFINITY;

  return (
    <section className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-4 animate-fade-in">
      <div className="pointer-events-auto max-w-xl rounded-xl border border-surface-700/80 bg-surface-900/90 px-4 py-3 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${result?.success ? (result.passed ? 'bg-pass' : 'bg-fail') : 'bg-warn'}`} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-400">TrussIQ presentation</span>
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-surface-100">
          {result?.success ? (result.passed ? 'Structure passes the current load case' : 'Structure needs a design revision') : 'Run FEA to reveal the load path'}
        </h2>
        <p className="mt-1 text-xs text-surface-400">
          {nodeCount} nodes · {beamCount} members · Direct Stiffness Method
        </p>
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700/80 bg-surface-900/90 px-3 py-2 text-xs font-medium text-surface-200 shadow-xl backdrop-blur-sm hover:border-accent/50 hover:text-accent"
        >
          <X size={13} /> Exit presentation
        </button>
        <div className="grid grid-cols-3 gap-2">
          <PresentationMetric label="Safety factor" value={Number.isFinite(safetyFactor) ? `${safetyFactor.toFixed(2)}×` : '∞'} />
          <PresentationMetric label="Max deflection" value={result?.success ? `${maxDeflection.toFixed(3)} mm` : '—'} />
          <PresentationMetric label="Peak stress" value={result?.success ? `${(result.maxSafetyRatio * 100).toFixed(0)}%` : '—'} />
        </div>
      </div>
    </section>
  );
}

function PresentationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-lg border border-surface-700/80 bg-surface-900/90 px-2.5 py-2 text-right shadow-xl backdrop-blur-sm">
      <div className="text-[9px] uppercase tracking-wide text-surface-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-accent">{value}</div>
    </div>
  );
}
