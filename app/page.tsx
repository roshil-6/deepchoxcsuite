'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { AppView } from '@/components/Sidebar';
import { useAuth, useClerk } from '@clerk/nextjs';
import { LandingPage } from '@/components/LandingPage';
import { OfficeProvider } from '@/lib/OfficeContext';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';

// Lazy-load heavy components with ssr:false to prevent SSR issues
const Sidebar = dynamic(() => import('@/components/Sidebar').then(m => ({ default: m.Sidebar })), {
  ssr: false,
});
const EngineeringPlatform = dynamic(() => import('@/components/EngineeringPlatform').then(m => ({ default: m.EngineeringPlatform })), {
  ssr: false,
});
const ResearchHub = dynamic(() => import('@/components/ResearchHub').then(m => ({ default: m.ResearchHub })), {
  ssr: false,
});
const ZepFloatingOrb = dynamic(() => import('@/components/Zep/ZepFloatingOrb').then(m => ({ default: m.ZepFloatingOrb })), {
  ssr: false,
});

// ── Loading overlay ────────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: '#0d0d0d' }}
    >
      <div className="flex flex-col items-center gap-4">
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
        <div
          className="mt-2 h-4 w-4 animate-spin rounded-full border border-zinc-700 border-t-teal-500"
          aria-hidden
        />
      </div>
    </div>
  );
}

// ── Themed Layout (accesses theme context) ───────────────────────────────────

function ThemedLayout({
  activeView,
  setActiveView,
  selectedProjectId,
  setSelectedProjectId,
  handleLogout,
}: {
  activeView: AppView;
  setActiveView: (v: AppView) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  handleLogout: () => void;
}) {
  const { theme } = useTheme();

  return (
    <div
      className={`flex h-screen w-full overflow-hidden transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'
      }`}
    >
      <Sidebar
        activeView={activeView}
        onSwitchView={setActiveView}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onNewProject={() => setSelectedProjectId(null)}
        onLogout={() => void handleLogout()}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {activeView === 'research' ? (
          <ResearchHub />
        ) : (
          <EngineeringPlatform
            key={selectedProjectId ?? '__new__'}
            selectedProjectId={selectedProjectId}
            onProjectCreated={(id) => setSelectedProjectId(id)}
          />
        )}
      </div>

      <ZepFloatingOrb />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function HomeContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  const [started, setStarted] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('engineering');
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
    setActiveView('engineering');
  };

  if (!isLoaded) return <LoadingOverlay />;
  if (!started) return <LandingPage onContinueGuest={() => setStarted(true)} />;

  return (
    <ThemeProvider>
      <OfficeProvider>
        <ThemedLayout
          activeView={activeView}
          setActiveView={setActiveView}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          handleLogout={handleLogout}
        />
      </OfficeProvider>
    </ThemeProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <HomeContent />
    </Suspense>
  );
}
