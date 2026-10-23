import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { exportTrussFile, parseTrussFile } from '../lib/trussIO';
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

export function Dashboard() {
  const { state, commit, replace, undo, redo, canUndo, canRedo } = useHistory(EMPTY);
  const { nodes, beams, materialId, defaultArea } = state;

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
    replace(PRESET_LOADERS.howe.create());
  }, [replace]);

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
  }, [selectedNodeId, selectedBeamId, commit, undo, redo, invalidate, runSolver]);

  const loadPreset = (key: PresetKey) => {
    replace(PRESET_LOADERS[key].create());
    setSelectedNodeId(null);
    setSelectedBeamId(null);
    setBeamDraftFrom(null);
    invalidate();
  };

  const clearAll = () => {
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
      <TopBar
        gridSize={gridSize}
        showDeflection={showDeflection}
        deflectionScale={deflectionScale}
        solving={solving}
        theme={theme}
        canUndo={canUndo}
        canRedo={canRedo}
        dynamicsMode={dynamicsMode}
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
        onImportTruss={handleImport}
        onExportOfficialReport={handleOfficialReport}
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
      />

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

      <div className="flex min-h-0 flex-1">
        <Toolbar
          tool={tool}
          onToolChange={(t) => {
            setTool(t);
            setBeamDraftFrom(null);
          }}
        />

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
        </main>

        <Sidebar
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
        />
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
