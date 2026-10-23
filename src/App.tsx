import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { DemoMode } from './components/DemoMode';
import { Home } from './components/Home';

export default function App() {
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [showDemo, setShowDemo] = useState(false);
  const [launchDemo, setLaunchDemo] = useState(false);

  if (view === 'workspace') return <Dashboard initialDemo={launchDemo} onOpenHome={() => setView('home')} />;

  return (
    <>
      <Home onOpenWorkspace={() => setView('workspace')} onOpenDemo={() => setShowDemo(true)} />
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
