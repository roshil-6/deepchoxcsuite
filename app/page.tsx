'use client';

import { useState, useEffect } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { LandingPage } from '@/components/LandingPage';
import { EngineeringPlatform } from '@/components/EngineeringPlatform';
import { Sidebar } from '@/components/Sidebar';

// ── Loading overlay ────────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: '#0d0d0d' }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Brand */}
        <div className="flex flex-col items-center gap-1">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            northROSC LABS
          </p>
          <h1
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            Deepchox
          </h1>
        </div>

        {/* Spinner */}
        <div
          className="mt-2 h-4 w-4 animate-spin rounded-full border border-zinc-700 border-t-teal-500"
          aria-hidden
        />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  const [started, setStarted] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Auto-enter workspace when already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn && !started) {
      setStarted(true);
    }
  }, [isLoaded, isSignedIn, started]);

  const handleLogout = async () => {
    if (isSignedIn) {
      try { await signOut(); } catch { /* ignore */ }
    }
    setStarted(false);
    setSelectedProjectId(null);
  };

  // Auth loading
  if (!isLoaded) {
    return <LoadingOverlay />;
  }

  // Not started — show landing
  if (!started) {
    return <LandingPage onContinueGuest={() => setStarted(true)} />;
  }

  // Workspace
  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: '#0d0d0d' }}
    >
      <Sidebar
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onNewProject={() => setSelectedProjectId(null)}
        onLogout={() => void handleLogout()}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <EngineeringPlatform
          key={selectedProjectId ?? '__new__'}
          selectedProjectId={selectedProjectId}
          onProjectCreated={(id) => setSelectedProjectId(id)}
        />
      </div>
    </div>
  );
}
