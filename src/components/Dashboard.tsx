import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BookOpen, MousePointer2, Play, X } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { analyzeStructure } from '../lib/aiOptimizer';
import { computeSectionProps, isValidSectionParams, solidRodFromArea, type SectionParams } from '../lib/crossSections';
import {
  applyDynamics,
  DEFAULT_SEISMIC,
  DEFAULT_WIND,
  STORM_WIND,
} from '../lib/dynamicsEngine';
import { solveTruss } from '../lib/feaEngine';
import { playUiSound } from '../lib/uiFeedback';
import { buildFormulaBreakdown } from '../lib/formulaInspector';
import { nextId } from '../lib/ids';
import { computeMassCost } from '../lib/massCost';
import { DEFAULT_AREA, DEFAULT_MATERIAL_ID } from '../lib/materials';
import { PRESET_LOADERS, type PresetKey } from '../lib/presets';
import {
  exportTrussFile,
  loadLocalDraft,
  parseTrussFile,
  saveLocalDraft,
  serializeTruss,
} from '../lib/trussIO';
import { auditStructure } from '../lib/structureAudit';
import { readStoredValue, writeStoredValue } from '../lib/storage';
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
import { MissionMode } from './MissionMode';
import { CollaborationCenter } from './CollaborationCenter';
import { CommandPalette } from './CommandPalette';
import { ProjectBrief, type ProjectBriefData } from './ProjectBrief';
import { ImpactDashboard } from './ImpactDashboard';
import { ForceModal } from './ForceModal';
import { FormulaInspector } from './FormulaInspector';
import { ShortcutsModal } from './ShortcutsModal';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { TopBar } from './TopBar';
import { TutorialOverlay } from './TutorialOverlay';
import { UnstableModal } from './UnstableModal';
import { TemplateLibrary } from './TemplateLibrary';
import { ChallengeLibrary } from './ChallengeLibrary';
import type { EngineeringChallenge } from '../lib/challenges';
import { LoadCaseStudy } from './LoadCaseStudy';
import { MaterialStudy } from './MaterialStudy';
import { GeometryTools } from './GeometryTools';
import { ARPreviewBoundary } from './ARPreviewBoundary';
import { ChallengeMode } from './ChallengeMode';
import { DemoHelper } from './DemoHelper';
import { ResizeDivider } from './ResizeDivider';
import { HIGH_WIND_PROFILE, type BridgeChallengeId } from '../lib/bridgeChallenges';
import { computeStructureMetrics, type MemberViewFilter } from '../lib/structureMetrics';
import { readResultPalette } from '../lib/resultPalette';
import { readDisplayUnits } from '../lib/units';
import { exportLabWorksheet } from '../lib/worksheet';
import { FeatureBar } from './FeatureBar';

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

export function Dashboard({ initialDemo = false, initialSharedState = null, onOpenHome }: { initialDemo?: boolean; initialSharedState?: StructureState | null; onOpenHome?: () => void }) {
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
  const [tutorialFirstRun, setTutorialFirstRun] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCollapse, setShowCollapse] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showMission, setShowMission] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showChallengeLibrary, setShowChallengeLibrary] = useState(false);
  const [showLoadCaseStudy, setShowLoadCaseStudy] = useState(false);
  const [showMaterialStudy, setShowMaterialStudy] = useState(false);
  const [showGeometryTools, setShowGeometryTools] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<EngineeringChallenge | null>(null);
  const [activeBridgeChallengeId, setActiveBridgeChallengeId] = useState<BridgeChallengeId | null>(null);
  const [draftStatus, setDraftStatus] = useState('Preparing workspace');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(() => readStoredValue('trussiq-ui-sounds') !== '0');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = readStoredValue('trussiq-sidebar-open');
    if (stored === '0') return false;
    if (stored === '1') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [toolbarOpen, setToolbarOpen] = useState(() => readStoredValue('trussiq-toolbar-open') !== '0');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const key = window.matchMedia('(max-width: 767px)').matches ? 'trussiq-inspector-height' : 'trussiq-inspector-width';
    const stored = Number(readStoredValue(key));
    const min = key.endsWith('height') ? 200 : 280;
    const max = key.endsWith('height') ? window.innerHeight - 120 : 520;
    return Number.isFinite(stored) && stored >= min && stored <= max ? stored : key.endsWith('height') ? Math.min(360, max) : 352;
  });
  const [toolbarWidth, setToolbarWidth] = useState(() => {
    const stored = Number(readStoredValue('trussiq-toolbar-width'));
    return Number.isFinite(stored) && stored >= 56 && stored <= 112 ? stored : 56;
  });
  const [uiScale, setUiScale] = useState(() => {
    const stored = Number(readStoredValue('trussiq-ui-scale'));
    return stored >= 0.75 && stored <= 1.5 ? stored : 1;
  });
  const [showGuide, setShowGuide] = useState(
    () => readStoredValue('trussiq-guide-dismissed') !== '1',
  );
  const [showForceLabels, setShowForceLabels] = useState(
    () => readStoredValue('trussiq-force-labels') === '1',
  );
  const [displayUnits, setDisplayUnits] = useState(() =>
    readDisplayUnits(readStoredValue('trussiq-display-units')),
  );
  const [resultPalette, setResultPalette] = useState(() =>
    readResultPalette(readStoredValue('trussiq-result-palette')),
  );
  const [memberFilter, setMemberFilter] = useState<MemberViewFilter>('all');
  const [autoSolve, setAutoSolve] = useState(
    () => readStoredValue('trussiq-auto-solve') === '1',
  );
  const [loadScalePct, setLoadScalePct] = useState(100);
  const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);
  const [resultStale, setResultStale] = useState(false);

  const [dynamicsMode, setDynamicsMode] = useState<DynamicsMode>('none');
  const [wind, setWind] = useState<WindParams>(DEFAULT_WIND);
  const [seismic, setSeismic] = useState<SeismicParams>(DEFAULT_SEISMIC);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = readStoredValue('trussiq-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const setCanvasEl = useCallback((el: HTMLCanvasElement | null) => {
    canvasEl.current = el;
  }, []);
  const toastTimeoutRef = useRef<number | null>(null);
  const bootstrapped = useRef(false);
  const skipInitialAutosave = useRef(false);
  const sharedReviewSession = useRef(false);
  const solveGenRef = useRef(0);
  const autoSolveRef = useRef(autoSolve);
  autoSolveRef.current = autoSolve;

  /** User loads after the service-load slider (before wind / seismic). */
  const scaledUserNodes = useMemo(() => {
    const scale = loadScalePct / 100;
    if (scale === 1) return nodes;
    return nodes.map((n) => ({ ...n, fx: n.fx * scale, fy: n.fy * scale }));
  }, [nodes, loadScalePct]);

  /** Nodes with load-scale + environmental loads (for solver + display arrows). */
  const dynamicNodes = useMemo(
    () => applyDynamics(scaledUserNodes, beams, dynamicsMode, wind, seismic),
    [scaledUserNodes, beams, dynamicsMode, wind, seismic],
  );

  const ai = useMemo(
    () => analyzeStructure(dynamicNodes, beams, result),
    [dynamicNodes, beams, result],
  );
  const invalidate = useCallback(() => {
    // Keep last FEA frame while Live FEA re-solves (avoids heatmap flicker)
    if (autoSolveRef.current) {
      setResultStale(true);
    } else {
      setResult(null);
      setShowDeflection(false);
      setResultStale(false);
    }
    setHighlightBeamIds([]);
    setHighlightNodeIds([]);
  }, []);

  const showToast = useCallback((message: string) => {
    setCopyStatus(message);
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setCopyStatus(null);
      toastTimeoutRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    writeStoredValue('trussiq-theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const previousFontSize = root.style.fontSize;
    root.style.fontSize = `${uiScale * 100}%`;
    return () => {
      root.style.fontSize = previousFontSize;
    };
  }, [uiScale]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    skipInitialAutosave.current = true;
    sharedReviewSession.current = Boolean(initialSharedState);
    const draft = loadLocalDraft();
    replace(draft ?? PRESET_LOADERS.howe.create());
    if (initialSharedState) replace(initialSharedState);
    setDraftStatus(initialSharedState ? 'Shared model opened · Undo restores your previous design' : draft ? 'Restored local draft' : 'Ready to edit');
  }, [initialSharedState, replace]);

  useEffect(() => {
    if (!bootstrapped.current) return;
    if (skipInitialAutosave.current) {
      skipInitialAutosave.current = false;
      return;
    }
    if (sharedReviewSession.current) {
      setDraftStatus('Shared review · local draft preserved · Save Draft to keep changes');
      return;
    }
    const saved = saveLocalDraft(state);
    setDraftStatus(saved ? 'Saved locally' : 'Autosave unavailable — export a backup');
  }, [state]);

  useEffect(() => {
    if (initialDemo) setShowDemo(true);
  }, [initialDemo]);

  // First workspace visit: walk the user through the core tools and FEA workflow.
  useEffect(() => {
    if (initialDemo || initialSharedState) return;
    if (readStoredValue('trussiq-onboarding-complete') === '1') return;
    const timer = window.setTimeout(() => {
      setTutorialFirstRun(true);
      setShowTutorial(true);
      setShowGuide(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [initialDemo, initialSharedState]);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    setTutorialFirstRun(false);
    writeStoredValue('trussiq-onboarding-complete', '1');
    writeStoredValue('trussiq-guide-dismissed', '1');
    setShowGuide(false);
  }, []);

  const openTutorial = useCallback((firstRun = false) => {
    setTutorialFirstRun(firstRun);
    setShowTutorial(true);
    if (firstRun) setShowGuide(false);
  }, []);

  useEffect(() => {
    const onCommandShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', onCommandShortcut);
    return () => window.removeEventListener('keydown', onCommandShortcut);
  }, []);

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

  const structureMetrics = useMemo(
    () => computeStructureMetrics(nodes, beams),
    [nodes, beams],
  );

  const runSolver = useCallback((opts?: { quiet?: boolean }) => {
    if (audit.errors > 0) {
      if (!opts?.quiet) {
        const first = audit.issues.find((issue) => issue.severity === 'error');
        setUnstableMsg(`Fix the model audit errors before running FEA. ${first?.title ?? ''} ${first?.message ?? ''}`.trim());
      }
      return;
    }
    if (nodes.length < 2 || beams.length < 1) {
      if (!opts?.quiet) {
        setUnstableMsg(
          'Add at least two nodes and one beam before running the FEA solver.',
        );
      }
      return;
    }
    const gen = ++solveGenRef.current;
    setSolving(true);
    requestAnimationFrame(() => {
      // Drop stale async solves (rapid edits / double Live FEA)
      if (gen !== solveGenRef.current) return;
      try {
        const scale = loadScalePct / 100;
        const scaledNodes =
          scale === 1
            ? nodes
            : nodes.map((n) => ({ ...n, fx: n.fx * scale, fy: n.fy * scale }));
        const loaded = applyDynamics(scaledNodes, beams, dynamicsMode, wind, seismic);
        const res = solveTruss(loaded, beams);
        if (gen !== solveGenRef.current) return;
        setResult(res);
        setResultStale(false);
        if (showGuide) {
          setShowGuide(false);
          writeStoredValue('trussiq-guide-dismissed', '1');
        }
        if (opts?.quiet) return;
        if (res.success) {
          playUiSound('solve', soundsEnabled);
          if (res.passed) {
            playUiSound('pass', soundsEnabled);
            showToast(
              loadScalePct === 100
                ? 'Analysis solved; modeled members are below yield.'
                : `Solved at ${loadScalePct}% load; members below yield.`,
            );
          } else {
            showToast(
              loadScalePct === 100
                ? 'Analysis solved; one or more members exceed modeled yield.'
                : `Solved at ${loadScalePct}% load; yield exceeded.`,
            );
          }
        } else if (res.unstable) {
          setUnstableMsg(
            res.message ??
              'Unstable Structure: Add more supports to prevent rigid body motion.',
          );
        } else if (!res.success && res.message) {
          setUnstableMsg(res.message);
        }
      } catch {
        if (gen === solveGenRef.current) {
          setUnstableMsg('Solver failed unexpectedly. Check the model and try again.');
        }
      } finally {
        if (gen === solveGenRef.current) setSolving(false);
      }
    });
  }, [nodes, beams, dynamicsMode, wind, seismic, audit, soundsEnabled, showToast, loadScalePct, showGuide]);

  // Live FEA — debounced re-solve after edits
  useEffect(() => {
    if (!autoSolve || presentationMode || dynamicsMode === 'seismic') return;
    if (nodes.length < 2 || beams.length < 1) return;
    const timer = window.setTimeout(() => runSolver({ quiet: true }), 500);
    return () => window.clearTimeout(timer);
  }, [autoSolve, presentationMode, dynamicsMode, nodes, beams, loadScalePct, wind, seismic, runSolver]);

  // Re-solve once when entering wind mode
  const prevDynamicsRef = useRef(dynamicsMode);
  useEffect(() => {
    const prev = prevDynamicsRef.current;
    prevDynamicsRef.current = dynamicsMode;
    if (dynamicsMode === 'wind' && prev !== 'wind') {
      runSolver({ quiet: true });
    }
  }, [dynamicsMode, runSolver]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target && (target.isContentEditable || target.closest('input, select, textarea, [role="textbox"], [contenteditable="true"]'))) return;
      const modifierShortcut = e.ctrlKey || e.metaKey;
      if (target?.closest('button, a') && !(modifierShortcut && ['z', 'y', 's', 'enter'].includes(e.key.toLowerCase()))) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        sharedReviewSession.current = false;
        setDraftStatus(saveLocalDraft(state) ? 'Saved locally' : 'Save failed — export a backup');
        return;
      }

      if (showCollapse && e.key === ' ') return;

      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
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

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
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
      }
      if (e.key === 'Escape') {
        setBeamDraftFrom(null);
        setSelectedNodeId(null);
        setSelectedBeamId(null);
        setForceTarget(null);
        setUnstableMsg(null);
        setFormula(null);
        if (showTutorial) closeTutorial();
        setShowShortcuts(false);
        setShowCollapse(false);
        setShowAR(false);
        setShowCompare(false);
        setHighlightBeamIds([]);
        setHighlightNodeIds([]);
        setPresentationMode(false);
        setShowMission(false);
        setShowCollaboration(false);
        setShowCommandPalette(false);
        setShowBrief(false);
        setShowImpact(false);
        setShowDemo(false);
        setShowChallengeLibrary(false);
        setShowGeometryTools(false);
        setShowTemplateLibrary(false);
        setShowLoadCaseStudy(false);
        setShowMaterialStudy(false);
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
      // Arrow-key nudge selected node by one grid step
      if (
        selectedNodeId &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -gridSize : e.key === 'ArrowRight' ? gridSize : 0;
        const dy = e.key === 'ArrowUp' ? -gridSize : e.key === 'ArrowDown' ? gridSize : 0;
        commit((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === selectedNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n,
          ),
        }));
        invalidate();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        runSolver();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNodeId, selectedBeamId, commit, undo, redo, invalidate, runSolver, state, showCollapse, gridSize, showTutorial, closeTutorial]);

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
    playUiSound('click', soundsEnabled);
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
      playUiSound('click', soundsEnabled);
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
    if (!Number.isFinite(area) || area <= 0) return;
    commit((prev) => ({ ...prev, defaultArea: area }));
  };

  const changeSelectedBeamArea = (area: number) => {
    if (!selectedBeamId || !Number.isFinite(area) || area <= 0) return;
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
    if (!selectedBeamId || !isValidSectionParams(section)) return;
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
      setSelectedNodeId(null);
      setSelectedBeamId(null);
      setBeamDraftFrom(null);
      invalidate();
    } catch (err) {
      setUnstableMsg(err instanceof Error ? err.message : 'Failed to import .truss file.');
    }
  };

  const handleCopyTruss = async () => {
    try {
      await navigator.clipboard.writeText(serializeTruss(state));
      showToast('Design JSON copied to clipboard.');
    } catch {
      showToast('Clipboard access unavailable.');
    }
  };

  const handleOfficialReport = async () => {
    try {
      const massCost = computeMassCost(nodes, beams);
      let canvasImage: string | null = null;
      try {
        canvasImage = canvasEl.current?.toDataURL('image/png') ?? null;
      } catch {
        // The report can still be generated without a canvas snapshot.
      }
      const { generateOfficialReport } = await import('../lib/reportGenerator');
      await generateOfficialReport({
        name: 'TrussIQ Structural Study Report',
        state,
        result,
        ai,
        massCost,
        canvasImage,
      });
    } catch (error) {
      setUnstableMsg(error instanceof Error ? error.message : 'Could not generate the PDF report.');
    }
  };

  return (
    <div
      className="workspace-root flex h-[100dvh] min-h-[24rem] flex-col overflow-hidden bg-surface-950 text-surface-100"
      data-inspector-open={!presentationMode && sidebarOpen ? 'true' : 'false'}
      style={{ '--inspector-height': `${sidebarWidth}px` } as CSSProperties}
    >
      {!presentationMode && <TopBar
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
        onOpenTemplateLibrary={() => setShowTemplateLibrary(true)}
        onOpenGeometryTools={() => setShowGeometryTools(true)}
        onClear={clearAll}
        onExportTruss={() => exportTrussFile(state, 'TrussIQ Design')}
        onCopyTruss={handleCopyTruss}
        onImportTruss={handleImport}
        onExportOfficialReport={handleOfficialReport}
        draftStatus={draftStatus}
        onSaveDraft={() => {
          sharedReviewSession.current = false;
          setDraftStatus(saveLocalDraft(state) ? 'Saved locally' : 'Save failed — export a backup');
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
        onOpenTutorial={() => openTutorial(false)}
        onDynamicsMode={(m) => {
          setDynamicsMode(m);
          if (m === 'none') setShowDeflection(false);
          if (m === 'seismic') setSeismic((s) => ({ ...s, time: 0 }));
        }}
        onOpenLoadCaseStudy={() => setShowLoadCaseStudy(true)}
        onWindProfile={(profile) => {
          setWind(profile === 'storm' ? STORM_WIND : DEFAULT_WIND);
          setDynamicsMode('wind');
        }}
        onOpenCollapse={() => { setShowDemo(false); setShowMission(false); setShowCollaboration(false); setShowCompare(false); setShowAR(false); setShowImpact(false); setShowCollapse(true); }}
        onOpenAR={() => { setShowDemo(false); setShowCollapse(false); setShowCompare(false); setShowAR(true); }}
        onOpenCompare={() => { setShowDemo(false); setShowCollapse(false); setShowAR(false); setShowCompare(true); }}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenDemo={() => { setShowMission(false); setShowCollaboration(false); setShowImpact(false); setShowCompare(false); setShowAR(false); setShowCollapse(false); setShowDemo(true); }}
        onOpenPresentation={() => { setShowDemo(false); setPresentationMode(true); }}
        onOpenMission={() => { setShowDemo(false); setShowCollaboration(false); setShowImpact(false); setShowMission(true); }}
        onOpenCollaboration={() => { setShowDemo(false); setShowMission(false); setShowImpact(false); setShowCollaboration(true); }}
        onOpenCommand={() => setShowCommandPalette(true)}
        onOpenBrief={() => setShowBrief(true)}
        onOpenImpact={() => { setShowDemo(false); setShowMission(false); setShowCollaboration(false); setShowImpact(true); }}
        onOpenHome={onOpenHome ?? (() => undefined)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => {
          const next = !open;
          writeStoredValue('trussiq-sidebar-open', next ? '1' : '0');
          return next;
        })}
        toolbarOpen={toolbarOpen}
        onToggleToolbar={() => setToolbarOpen((open) => {
          const next = !open;
          writeStoredValue('trussiq-toolbar-open', next ? '1' : '0');
          return next;
        })}
        uiScale={uiScale}
        onUiScale={(scale) => {
          setUiScale(scale);
          writeStoredValue('trussiq-ui-scale', String(scale));
        }}
        nodeCount={nodes.length}
        beamCount={beams.length}
        analysisLabel={result?.success ? 'Analyzed' : result ? 'Needs review' : 'Ready'}
        soundsEnabled={soundsEnabled}
        onToggleSounds={() => setSoundsEnabled((enabled) => {
          const next = !enabled;
          writeStoredValue('trussiq-ui-sounds', next ? '1' : '0');
          return next;
        })}
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
        <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[95] -translate-x-1/2 rounded-lg border border-accent/40 bg-surface-900 px-3 py-2 text-xs font-medium text-accent shadow-xl animate-fade-in">
          {copyStatus}
        </div>
      )}

      <div
        className={`workspace-panels relative flex min-h-0 min-w-0 flex-1 ${!toolbarOpen && !sidebarOpen ? 'workspace-panels--focus' : ''}`}
      >
        {!presentationMode && toolbarOpen && (
          <div className="toolbar-panel max-md:hidden" style={{ '--toolbar-width': `${toolbarWidth}px` } as CSSProperties}>
            <Toolbar
              tool={tool}
              onToolChange={(t) => {
                setTool(t);
                setBeamDraftFrom(null);
              }}
              onCollapse={() => {
                setToolbarOpen(false);
                writeStoredValue('trussiq-toolbar-open', '0');
              }}
            />
          </div>
        )}
        {!presentationMode && toolbarOpen && (
          <div className="max-md:hidden">
            <ResizeDivider
              label="Resize drawing tools"
              orientation="vertical"
              onResize={(delta) => setToolbarWidth((width) => {
                const next = Math.max(56, Math.min(112, width + delta));
                writeStoredValue('trussiq-toolbar-width', String(next));
                return next;
              })}
            />
          </div>
        )}

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {!presentationMode && (
            <Toolbar
              variant="mobile"
              tool={tool}
              onToolChange={(t) => {
                setTool(t);
                setBeamDraftFrom(null);
              }}
            />
          )}
          {!presentationMode && !toolbarOpen && (
            <button
              type="button"
              className="panel-edge-tab panel-edge-tab-left absolute max-md:hidden"
              title="Show drawing tools"
              aria-label="Show drawing tools"
              onClick={() => {
                setToolbarOpen(true);
                writeStoredValue('trussiq-toolbar-open', '1');
              }}
            >
              <span className="panel-edge-tab-label">Tools</span>
            </button>
          )}
          {!presentationMode && !sidebarOpen && (
            <button
              type="button"
              className="panel-edge-tab panel-edge-tab-right absolute"
              title="Show inspector"
              aria-label="Show inspector"
              onClick={() => {
                setSidebarOpen(true);
                writeStoredValue('trussiq-sidebar-open', '1');
              }}
            >
              <span className="panel-edge-tab-label">Inspector</span>
            </button>
          )}
          <CanvasEditor
            nodes={dynamicNodes}
            userLoadNodes={scaledUserNodes}
            dynamicsMode={dynamicsMode}
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
            showForceLabels={showForceLabels}
            memberFilter={memberFilter}
            displayUnits={displayUnits}
            resultPalette={resultPalette}
            canvasRefCallback={setCanvasEl}
            onSelectNode={setSelectedNodeId}
            onSelectBeam={setSelectedBeamId}
            onPlaceNode={placeNode}
            onMoveNode={(id, x, y) => {
              commit((prev) => ({
                ...prev,
                nodes: prev.nodes.map((node) =>
                  node.id === id ? { ...node, x, y } : node,
                ),
              }));
              invalidate();
            }}
            onBeamClickNode={beamClickNode}
            onForceNode={(id) => {
              const n = nodes.find((nn) => nn.id === id);
              if (n) setForceTarget(n);
            }}
            onCycleSupport={cycleSupport}
            onEraseAt={eraseAt}
            onClearBeamDraft={() => setBeamDraftFrom(null)}
          />
          {!presentationMode && (
            <FeatureBar
              showForceLabels={showForceLabels}
              onToggleForceLabels={() =>
                setShowForceLabels((v) => {
                  const next = !v;
                  writeStoredValue('trussiq-force-labels', next ? '1' : '0');
                  return next;
                })
              }
              memberFilter={memberFilter}
              onMemberFilter={setMemberFilter}
              autoSolve={autoSolve}
              onToggleAutoSolve={() =>
                setAutoSolve((v) => {
                  const next = !v;
                  writeStoredValue('trussiq-auto-solve', next ? '1' : '0');
                  if (next) runSolver({ quiet: true });
                  return next;
                })
              }
              loadScalePct={loadScalePct}
              onLoadScale={setLoadScalePct}
              metrics={structureMetrics}
              screenshotStatus={screenshotStatus}
              resultStale={resultStale}
              displayUnits={displayUnits}
              onToggleDisplayUnits={() =>
                setDisplayUnits((current) => {
                  const next = current === 'si' ? 'us' : 'si';
                  writeStoredValue('trussiq-display-units', next);
                  showToast(next === 'us' ? 'Display units: US customary' : 'Display units: SI');
                  return next;
                })
              }
              resultPalette={resultPalette}
              onToggleResultPalette={() =>
                setResultPalette((current) => {
                  const next = current === 'default' ? 'colorblind' : 'default';
                  writeStoredValue('trussiq-result-palette', next);
                  showToast(next === 'colorblind' ? 'Colorblind-safer palette on' : 'Default result palette');
                  return next;
                })
              }
              onExportWorksheet={() => {
                let brief: ProjectBriefData | undefined;
                try {
                  const raw = readStoredValue('trussiq-project-brief');
                  if (raw) brief = JSON.parse(raw) as ProjectBriefData;
                } catch {
                  brief = undefined;
                }
                exportLabWorksheet(state, result, {
                  title: brief?.title,
                  author: brief?.author,
                  course: brief?.course,
                  objective: brief?.objective,
                });
                showToast('Lab worksheet PDF downloaded.');
              }}
              onScreenshot={async () => {
                const canvas = canvasEl.current;
                if (!canvas) {
                  showToast('Canvas not ready for screenshot.');
                  return;
                }
                try {
                  const blob = await new Promise<Blob | null>((resolve) =>
                    canvas.toBlob((b) => resolve(b), 'image/png'),
                  );
                  if (!blob) throw new Error('Could not capture canvas');
                  await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob }),
                  ]);
                  setScreenshotStatus('Copied!');
                  showToast('Canvas screenshot copied to clipboard.');
                  window.setTimeout(() => setScreenshotStatus(null), 1800);
                } catch {
                  // Fallback: download
                  const url = canvas.toDataURL('image/png');
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'trussiq-canvas.png';
                  a.click();
                  setScreenshotStatus('Saved');
                  showToast('Clipboard blocked — PNG downloaded instead.');
                  window.setTimeout(() => setScreenshotStatus(null), 1800);
                }
              }}
            />
          )}
          {presentationMode && (
            <PresentationHud
              result={result}
              nodeCount={nodes.length}
              beamCount={beams.length}
              onExit={() => setPresentationMode(false)}
            />
          )}
          {activeChallenge && !presentationMode && (
            <section className="absolute right-4 top-4 z-10 w-[min(20rem,calc(100%-2rem))] rounded-xl border border-accent/35 bg-surface-900/95 p-3 shadow-xl backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-wider text-accent">Active investigation · {activeChallenge.id.slice(-3)}</p><h3 className="mt-1 text-xs font-semibold text-surface-100">{activeChallenge.title}</h3></div><button type="button" onClick={() => setActiveChallenge(null)} aria-label="Dismiss active investigation" className="text-surface-500 hover:text-surface-200"><X size={13} /></button></div>
              <p className="mt-2 text-[10px] leading-4 text-surface-300">{activeChallenge.brief}</p>
              <p className="mt-2 border-t border-surface-700 pt-2 text-[10px] leading-4 text-surface-400">Evidence: {activeChallenge.target}</p>
            </section>
          )}
          {activeBridgeChallengeId && !presentationMode && !activeChallenge && (
            <section className="absolute right-4 top-4 z-10 w-[min(20rem,calc(100%-2rem))] rounded-xl border border-accent/35 bg-surface-900/95 p-3 shadow-xl backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-accent">Active bridge challenge</p>
                  <h3 className="mt-1 text-xs font-semibold text-surface-100">
                    {activeBridgeChallengeId === 'high-wind-resilience'
                      ? 'High Wind Resilience'
                      : 'The Low-Budget Span'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBridgeChallengeId(null)}
                  aria-label="Dismiss active bridge challenge"
                  className="text-surface-500 hover:text-surface-200"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-surface-400">
                Edit the model, run FEA, then reopen Challenge to check progress.
              </p>
            </section>
          )}
          {!showTutorial && nodes.length === 0 && beams.length === 0 && !presentationMode && (
            <section className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-6 animate-fade-in">
              <div className="pointer-events-auto max-w-sm rounded-2xl border border-surface-700/90 bg-surface-900/92 px-5 py-5 text-center shadow-2xl shadow-black/25 backdrop-blur-md">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Empty canvas</p>
                <h3 className="mt-2 text-base font-semibold text-surface-100">Start with a joint or a preset</h3>
                <p className="mt-2 text-xs leading-5 text-surface-400">
                  Choose <span className="text-surface-200">Node</span> and click the grid, or open <span className="text-surface-200">Presets</span> for a ready Howe / Warren / Pratt model.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTool('node')}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-400"
                  >
                    Place a joint
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loadPreset('howe');
                      setTool('select');
                    }}
                    className="rounded-lg border border-surface-600 px-3 py-2 text-xs font-medium text-surface-200 hover:border-accent/40 hover:text-accent"
                  >
                    Load Howe example
                  </button>
                </div>
              </div>
            </section>
          )}
          {showGuide && !showTutorial && nodes.length > 0 && !result && !activeBridgeChallengeId && !activeChallenge && (
            <section className="absolute left-4 top-14 z-10 w-[min(23rem,calc(100%-2rem))] rounded-xl border border-accent/30 bg-surface-900/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-sm animate-fade-in">
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
                    writeStoredValue('trussiq-guide-dismissed', '1');
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
                  onClick={() => runSolver()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-950 hover:bg-teal-300"
                >
                  <Play size={13} fill="currentColor" /> Run first analysis
                </button>
                <button
                  type="button"
                  onClick={() => openTutorial(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-xs font-medium text-surface-300 hover:border-accent/50 hover:text-accent"
                >
                  <BookOpen size={13} /> Tour
                </button>
              </div>
            </section>
          )}
        </main>

        {!presentationMode && sidebarOpen && (
          <ResizeDivider
            label="Resize inspector"
            orientation="auto"
            onResize={(delta) => setSidebarWidth((width) => {
              const phone = window.matchMedia('(max-width: 767px)').matches;
              const next = phone
                ? Math.max(200, Math.min(window.innerHeight - 120, width - delta))
                : Math.max(280, Math.min(Math.min(520, window.innerWidth - 40), width - delta));
              writeStoredValue(phone ? 'trussiq-inspector-height' : 'trussiq-inspector-width', String(next));
              return next;
            })}
          />
        )}
        {!presentationMode && sidebarOpen && (
          <div
            className="inspector-panel"
            style={{ '--inspector-width': `${sidebarWidth}px`, '--inspector-height': `${sidebarWidth}px` } as CSSProperties}
          >
            <Sidebar
              materialId={materialId}
              defaultArea={defaultArea}
              result={result}
              ai={ai}
              nodes={nodes}
              analysisNodes={dynamicNodes}
              beams={beams}
              selectedBeamId={selectedBeamId}
              selectedNodeId={selectedNodeId}
              onMaterialChange={changeMaterial}
              onCompareMaterials={() => setShowMaterialStudy(true)}
              onAreaChange={changeDefaultArea}
              onSelectedBeamArea={changeSelectedBeamArea}
              onSelectedBeamSection={changeSelectedBeamSection}
              onSelectedNodeChange={(patch) => {
                if (!selectedNodeId) return;
                commit((prev) => ({
                  ...prev,
                  nodes: prev.nodes.map((node) =>
                    node.id === selectedNodeId ? { ...node, ...patch } : node,
                  ),
                }));
                invalidate();
              }}
              onOpenFormula={openFormula}
              onFocusBeams={(ids) => {
                setHighlightBeamIds(ids);
                setSelectedBeamId(ids[0] ?? null);
              }}
              onFocusNodes={(ids) => {
                setHighlightNodeIds(ids);
                setSelectedNodeId(ids[0] ?? null);
              }}
              onRunSolver={runSolver}
              audit={audit}
              onCollapse={() => {
                setSidebarOpen(false);
                writeStoredValue('trussiq-sidebar-open', '0');
              }}
            />
          </div>
        )}
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
          firstRun={tutorialFirstRun}
          onClose={closeTutorial}
          onLoadWarren={() => loadPreset('warren')}
          onSetTool={(t) => setTool(t)}
          onRunSolver={() => runSolver()}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showDemo && <DemoMode onClose={() => setShowDemo(false)} onLaunch={launchDemo} />}
      {showMission && (
        <MissionMode
          state={state}
          result={result}
          audit={audit}
          onRunSolver={runSolver}
          onLoadChallenge={() => {
            loadPreset('warren');
            setShowMission(true);
          }}
          onBrowseChallenges={() => {
            setShowMission(false);
            setShowChallengeLibrary(true);
          }}
          onClose={() => setShowMission(false)}
        />
      )}
      {showChallengeLibrary && (
        <ChallengeLibrary
          onClose={() => setShowChallengeLibrary(false)}
          onStart={(challenge) => {
            loadPreset(challenge.preset);
            setDynamicsMode(challenge.dynamics);
            if (challenge.dynamics === 'seismic') setSeismic((current) => ({ ...current, time: 0 }));
            setActiveChallenge(challenge);
            setShowChallengeLibrary(false);
          }}
        />
      )}
      {showLoadCaseStudy && <LoadCaseStudy nodes={nodes} beams={beams} onClose={() => setShowLoadCaseStudy(false)} />}
      {showMaterialStudy && <MaterialStudy nodes={dynamicNodes} beams={beams} currentMaterialId={materialId} onApply={changeMaterial} onClose={() => setShowMaterialStudy(false)} />}
      {showGeometryTools && <GeometryTools state={state} onApply={(next) => { commit(next); invalidate(); }} onClose={() => setShowGeometryTools(false)} />}
      {showCollaboration && (
        <CollaborationCenter
          state={state}
          result={result}
          audit={audit}
          onClose={() => setShowCollaboration(false)}
          onApplySnapshot={(snapshot) => {
            replace(snapshot);
            invalidate();
          }}
        />
      )}
      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onRunSolver={runSolver}
          onLoadPreset={loadPreset}
          onDynamics={(mode) => {
            setDynamicsMode(mode);
            if (mode === 'none') setShowDeflection(false);
            if (mode === 'seismic') setSeismic((current) => ({ ...current, time: 0 }));
          }}
          onOpenTutorial={() => openTutorial(false)}
          onOpenMission={() => setShowMission(true)}
          onOpenCollaboration={() => setShowCollaboration(true)}
          onOpenPresentation={() => setPresentationMode(true)}
          onOpenCompare={() => setShowCompare(true)}
          onOpenCollapse={() => setShowCollapse(true)}
          onOpenAR={() => setShowAR(true)}
          onOpenShortcuts={() => setShowShortcuts(true)}
          onExport={() => {
            // Defer so the palette close click does not immediately dismiss the export menu.
            window.setTimeout(() => {
              document
                .querySelector<HTMLButtonElement>('[aria-label="Open export and import menu"]')
                ?.click();
            }, 40);
          }}
          onClear={clearAll}
          onOpenBrief={() => setShowBrief(true)}
          onOpenImpact={() => setShowImpact(true)}
        />
      )}
      {showBrief && (
        <ProjectBrief
          onClose={() => setShowBrief(false)}
          onExport={(brief: ProjectBriefData) => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${brief.title.replace(/[^\w-]+/g, '_') || 'trussiq-brief'}.json`;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        />
      )}
      {showImpact && (
        <ImpactDashboard
          nodes={nodes}
          beams={beams}
          result={result}
          ai={ai}
          audit={audit}
          materialId={materialId}
          defaultArea={defaultArea}
          onClose={() => setShowImpact(false)}
        />
      )}
      <ChallengeMode
        nodes={nodes}
        beams={beams}
        activeChallengeId={activeBridgeChallengeId}
        onStart={(id, starter) => {
          replace(starter);
          invalidate();
          setActiveBridgeChallengeId(id);
          if (id === 'high-wind-resilience') {
            setWind(HIGH_WIND_PROFILE);
            setDynamicsMode('wind');
          } else {
            setDynamicsMode('none');
          }
        }}
      />
      <DemoHelper
        onLoadWarren={() => {
          if ((nodes.length > 0 || beams.length > 0) && !window.confirm('Load the Warren truss for the demo? This replaces the current design.')) return false;
          loadPreset('warren');
          return true;
        }}
        onRunSolver={runSolver}
        onToggleDeflection={() => {
          if (!result?.success) {
            runSolver();
            setShowDeflection(true);
          } else {
            setShowDeflection((visible) => !visible);
          }
        }}
      />
      {showTemplateLibrary && (
        <TemplateLibrary
          state={state}
          onLoad={(snapshot) => {
            replace(snapshot);
            invalidate();
            setSelectedNodeId(null);
            setSelectedBeamId(null);
          }}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}
      <Suspense fallback={null}>
        {showCollapse && (
          <CollapseAnimator
            nodes={nodes}
            beams={beams}
            onClose={() => setShowCollapse(false)}
          />
        )}
        {showAR && (
          <ARPreviewBoundary onClose={() => setShowAR(false)}>
            <ARViewer nodes={nodes} beams={beams} onClose={() => setShowAR(false)} />
          </ARPreviewBoundary>
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
          {result?.success ? (result.passed ? 'Below the modeled yield limit' : 'Modeled yield limit exceeded') : 'Run FEA to reveal the load path'}
        </h2>
        <p className="mt-1 text-xs text-surface-400">
          {nodeCount} nodes · {beamCount} members · Direct Stiffness Method
        </p>
        <p className="mt-1 text-[10px] leading-4 text-surface-500">Linear, axial-only yield check for learning; not a structural safety certification.</p>
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
          <PresentationMetric label="Yield safety factor" value={Number.isFinite(safetyFactor) ? `${safetyFactor.toFixed(2)}×` : '∞'} />
          <PresentationMetric label="Max deflection" value={result?.success ? `${maxDeflection.toFixed(3)} mm` : '—'} />
          <PresentationMetric label="Peak yield use" value={result?.success ? `${(result.maxSafetyRatio * 100).toFixed(0)}%` : '—'} />
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
