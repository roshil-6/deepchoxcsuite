'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { AppView } from '@/components/Sidebar';
import { useAuth, useClerk } from '@clerk/nextjs';
import { LandingPage } from '@/components/LandingPage';
import { OfficeProvider } from '@/lib/OfficeContext';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';
import {
  DEEPCHOX_ZEP_NAV_EVENT,
  SS_ACTIVE_APP_VIEW,
  SS_SELECTED_ENG_PROJECT,
  type ZepNavDetail,
} from '@/lib/zepAppBridge';

interface MobileEngProject {
  id: string;
  title: string;
  domain: string;
  createdAt: number;
}

function loadProjectsMobile(): MobileEngProject[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('deepchox-eng-projects') : null;
    if (!raw) return [];
    const all = JSON.parse(raw) as MobileEngProject[];
    return all.map((p) => ({
      id: p.id,
      title: p.title ?? 'Untitled',
      domain: p.domain ?? 'software',
      createdAt: p.createdAt ?? Date.now(),
    }));
  } catch {
    return [];
  }
}

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
const SiteBuilder = dynamic(() => import('@/components/SiteBuilder').then(m => ({ default: m.SiteBuilder })), {
  ssr: false,
});
const BuilderView = dynamic(() => import('@/components/BuilderView').then(m => ({ default: m.BuilderView })), {
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
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProjects, setMobileProjects] = useState<MobileEngProject[]>([]);

  const refreshProjects = () => setMobileProjects(loadProjectsMobile());

  useEffect(() => {
    refreshProjects();
    const onStorage = () => refreshProjects();
    window.addEventListener('storage', onStorage);
    const t = setInterval(refreshProjects, 3000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SS_ACTIVE_APP_VIEW, activeView);
    } catch { /* ignore */ }
  }, [activeView]);

  useEffect(() => {
    try {
      if (selectedProjectId) sessionStorage.setItem(SS_SELECTED_ENG_PROJECT, selectedProjectId);
      else sessionStorage.removeItem(SS_SELECTED_ENG_PROJECT);
    } catch { /* ignore */ }
  }, [selectedProjectId]);

  useEffect(() => {
    const onNav = (e: Event) => {
      const d = (e as CustomEvent<ZepNavDetail>).detail;
      if (!d) return;
      if (d.kind === 'set_view') setActiveView(d.view);
      if (d.kind === 'new_project') {
        setSelectedProjectId(null);
        setActiveView('engineering');
      }
    };
    window.addEventListener(DEEPCHOX_ZEP_NAV_EVENT, onNav);
    return () => window.removeEventListener(DEEPCHOX_ZEP_NAV_EVENT, onNav);
  }, [setActiveView, setSelectedProjectId]);

  const openNewProject = () => {
    setSelectedProjectId(null);
    setActiveView('engineering');
  };

  return (
    <div
      className={`flex h-dvh w-full overflow-hidden pt-[env(safe-area-inset-top)] transition-colors duration-300 ${
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[max(5.25rem,calc(4.75rem+env(safe-area-inset-bottom)))] lg:pb-0 lg:pt-0">
        {activeView === 'research' ? (
          <ResearchHub />
        ) : activeView === 'sites' ? (
          <SiteBuilder />
        ) : activeView === 'builder' ? (
          <BuilderView />
        ) : (
          <EngineeringPlatform
            key={selectedProjectId ?? '__new__'}
            selectedProjectId={selectedProjectId}
            onProjectCreated={(id) => setSelectedProjectId(id)}
          />
        )}
      </div>

      <ZepFloatingOrb />
      <MobileBottomNav
        activeView={activeView}
        onSwitchView={setActiveView}
        onOpenMore={() => setMobileMenuOpen(true)}
      />

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 flex max-h-[min(85dvh,640px)] flex-col rounded-t-2xl border-t transition-colors duration-300 ${
              theme === 'dark' ? 'border-zinc-800 bg-[#101010]' : 'border-zinc-200 bg-white'
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 mb-0 rounded-t-2xl"
              style={{ borderColor: theme === 'dark' ? 'rgba(63,63,70,0.5)' : 'rgba(228,228,231,0.9)' }}
            >
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Menu
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    theme === 'dark' ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button
                  type="button"
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <nav className="space-y-1 pt-4">
                <button
                  onClick={() => {
                    setActiveView('engineering');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeView === 'engineering'
                      ? theme === 'dark'
                        ? 'bg-zinc-800/90 text-zinc-100'
                        : 'bg-zinc-100 text-zinc-900'
                      : theme === 'dark'
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600 hover:bg-zinc-50'
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeView === 'research'
                      ? theme === 'dark'
                        ? 'bg-zinc-800/90 text-zinc-100'
                        : 'bg-zinc-100 text-zinc-900'
                      : theme === 'dark'
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600 hover:bg-zinc-50'
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
                    setActiveView('sites');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeView === 'sites'
                      ? theme === 'dark'
                        ? 'bg-zinc-800/90 text-zinc-100'
                        : 'bg-zinc-100 text-zinc-900'
                      : theme === 'dark'
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  Sites
                </button>
                <button
                  onClick={() => {
                    setActiveView('builder');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeView === 'builder'
                      ? theme === 'dark'
                        ? 'bg-zinc-800/90 text-zinc-100'
                        : 'bg-zinc-100 text-zinc-900'
                      : theme === 'dark'
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 4V2M15 16a1 1 0 0 0 1 1 4 5-4 0 1 1-3.9-5" />
                    <path d="M9 20a1 1 0 0 1-1 1 4 4 0 1 1 3.9-5" />
                    <path d="M9 4V2M3 10h18M3 14h18M21 20v-2M3 20v-2" />
                  </svg>
                  Builder
                </button>
                <button
                  onClick={() => {
                    openNewProject();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New project
                </button>
              </nav>

              <div className={`my-4 h-px ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

              <p className={`mb-2 px-1 text-[10px] font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Your projects
              </p>
              {mobileProjects.length === 0 ? (
                <p className={`px-1 pb-2 text-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  No saved projects yet. Start from Engineering.
                </p>
              ) : (
                <ul className="space-y-1 pb-4">
                  {mobileProjects.map((p) => {
                    const active = selectedProjectId === p.id && activeView === 'engineering';
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(p.id);
                            setActiveView('engineering');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
                            active
                              ? theme === 'dark'
                                ? 'bg-zinc-800/90'
                                : 'bg-zinc-100'
                              : theme === 'dark'
                                ? 'hover:bg-zinc-800/50'
                                : 'hover:bg-zinc-50'
                          }`}
                        >
                          <span className={`block truncate text-sm font-medium ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-900'}`}>
                            {p.title}
                          </span>
                          <span className={`mt-0.5 block text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            {p.domain}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className={`my-2 h-px ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

              <button
                onClick={() => {
                  void handleLogout();
                  setMobileMenuOpen(false);
                }}
                className={`mb-4 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Log out
              </button>
            </div>
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
