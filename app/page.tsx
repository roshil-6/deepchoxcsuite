'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { AppView } from '@/components/Sidebar';
import { useAuth, useClerk } from '@clerk/nextjs';
import { LandingPage } from '@/components/LandingPage';
import { OfficeProvider } from '@/lib/OfficeContext';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className={`flex h-dvh w-full overflow-hidden transition-colors duration-300 ${
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-20 lg:pb-0">
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
      <MobileBottomNav onOpenMore={() => setMobileMenuOpen(true)} />

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 transition-colors duration-300 ${
              theme === 'dark' ? 'bg-[#0f0f0f] border-t border-zinc-800' : 'bg-white border-t border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setActiveView('engineering');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'engineering'
                    ? theme === 'dark'
                      ? 'bg-teal-500/10 text-teal-400'
                      : 'bg-teal-50 text-teal-600'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Engineering
              </button>
              <button
                onClick={() => {
                  setActiveView('research');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'research'
                    ? theme === 'dark'
                      ? 'bg-teal-500/10 text-teal-400'
                      : 'bg-teal-50 text-teal-600'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                Research
              </button>
              <button
                onClick={() => {
                  setSelectedProjectId(null);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-zinc-400 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Project
              </button>
              <div className={`my-2 h-px ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              <button
                onClick={() => {
                  void handleLogout();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}
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
