import { lazy, Suspense, useState } from 'react';
import { DemoMode } from './components/DemoMode';
import { Home } from './components/Home';
import { readReviewLink } from './lib/reviewLink';
import type { StructureState } from './lib/types';

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));

export default function App() {
  const [sharedReview, setSharedReview] = useState(() => readReviewLink(window.location.hash));
  const [view, setView] = useState<'home' | 'workspace'>(() => sharedReview?.state ? 'workspace' : 'home');
  const [showDemo, setShowDemo] = useState(false);
  const [launchDemo, setLaunchDemo] = useState(false);
  const [sharedInitialState, setSharedInitialState] = useState<StructureState | null>(() => sharedReview?.state ?? null);

  if (view === 'workspace') {
    return (
      <Suspense fallback={<div className="grid h-[100dvh] place-items-center bg-surface-950 text-sm text-surface-400">Opening TrussIQ workspace...</div>}>
        <Dashboard initialDemo={launchDemo} initialSharedState={sharedInitialState} onOpenHome={() => { setLaunchDemo(false); setSharedInitialState(null); setView('home'); }} />
      </Suspense>
    );
  }

  return (
    <>
      <Home
        onOpenWorkspace={() => setView('workspace')}
        onOpenDemo={() => setShowDemo(true)}
        sharedReview={sharedReview}
        onOpenSharedReview={() => {
          if (!sharedReview?.state) return;
          setSharedInitialState(sharedReview.state);
          setSharedReview(null);
          setView('workspace');
        }}
        onDismissSharedReview={() => {
          setSharedReview(null);
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }}
      />
      {showDemo && (
        <DemoMode
          onClose={() => setShowDemo(false)}
          onLaunch={() => {
            setShowDemo(false);
            setLaunchDemo(true);
            setView('workspace');
          }}
        />
      )}
    </>
  );
}
