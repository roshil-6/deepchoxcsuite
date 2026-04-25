'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatAssistant } from '@/components/ChatAssistant';
import { WorkspaceStage } from '@/components/WorkspaceStage';
import { LandingPage } from '@/components/LandingPage';
import { LandingAuthModal } from '@/components/LandingAuthModal';
import { NameVentureModal } from '@/components/NameVentureModal';
import { AppShell } from '@/components/ui/AppShell';
import { AIInputBarShell } from '@/components/ui/AIInputBar';

import { useOffice } from '@/lib/OfficeContext';
import { useSessionClaim } from '@/hooks/useSessionClaim';
import { Project, saveProject, getAllProjects } from '@/lib/db';
import { emptyVentureShell } from '@/lib/minimalVenture';
import { OfficeShell } from '@/components/OfficeShell';
import { SyncToastHost } from '@/components/SyncToastHost';
import { AgentStaffAutoSync } from '@/components/AgentStaffAutoSync';
import { PersonalAssistantChatProvider } from '@/components/pa/PersonalAssistantChatContext';
import { FloatingDexoOrb } from '@/components/Dexo/FloatingDexoOrb';
import { DexoKnowledgePromptModal } from '@/components/DexoKnowledgePromptModal';
import { DeskChatThreadSlotProvider } from '@/components/DeskChatThreadSlotContext';
import { SectionGuideProvider } from '@/components/SectionGuideCoach';
import {
  clearWorkspacePersistence,
  consumePendingNameVenture,
  persistEnterWorkspace,
  readPersistedWorkspaceStarted,
} from '@/lib/workspacePersistence';

/** After workspace auth modal: open “name venture” once signed in. */
const VENTURE_AUTH_KEY = 'deepchox-after-auth-new-venture';

function SessionGateOverlay({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080808] px-4 sm:px-6">
      {/* Subtle dot grid only — no glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle at center, #4b5563 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-800/40 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center">

        {/* ── northROSC wordmark ── */}
        <div className="flex flex-col items-center">
          {/* Diamond overline */}
          <div className="mb-4 flex items-center gap-2.5">
            <span className="block h-px w-12 bg-zinc-800" />
            <span
              className="block h-[6px] w-[6px] rotate-45"
              style={{ background: '#0D9488' }}
              aria-hidden
            />
            <span className="block h-px w-12 bg-zinc-800" />
          </div>

          {/* Wordmark + LABS */}
          <div className="flex items-end gap-4">
            <span className="font-sans font-black leading-[0.88] tracking-[-0.03em]" style={{ fontSize: 'clamp(2.25rem,8vw,3.5rem)' }}>
              <span className="text-zinc-400">north</span>
              <span style={{ color: '#0D9488' }}>ROSC</span>
            </span>
            <span
              className="mb-[0.08em] border-l border-zinc-800 pl-3 font-sans font-black uppercase leading-tight tracking-[0.38em] text-zinc-600" style={{ fontSize: 'clamp(0.6rem,1.4vw,0.75rem)' }}
            >
              LABS
            </span>
          </div>

          {/* Underline rule */}
          <div className="mt-4 h-px w-40 bg-zinc-800" />
        </div>

        {/* Spinner */}
        <div
          className="mt-8 h-5 w-5 animate-spin rounded-full border border-zinc-800 border-t-zinc-500"
          aria-hidden
        />

        <p className="mt-5 text-center font-sans text-[14px] font-medium tracking-tight text-zinc-300">{title}</p>
        <p className="mt-1.5 text-center font-sans text-[12px] text-zinc-600">{subtitle}</p>

        {/* Bottom micro-brand */}
        <p className="mt-10 font-sans text-[10px] text-zinc-800">DeepChox AI · NorthROSC Labs</p>
      </div>
    </div>
  );
}

export default function Home() {
  /** Must start false on server and first client paint — sessionStorage is read in an effect to avoid hydration mismatch (React #418). */
  const [hasStarted, setHasStarted] = useState(false);
  const [nameVentureOpen, setNameVentureOpen] = useState(false);
  const [workspaceAuthOpen, setWorkspaceAuthOpen] = useState(false);
  const [sessionResolving, setSessionResolving] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { setActiveProject, setAllProjects, switchRoom, activeRoom, resetSystem } = useOffice();

  // Tie ventures to Clerk userId when signed in; migrate anonymous ventures on first sign-in.
  useSessionClaim();

  const enterWorkspaceWithVenturePrompt = useCallback(() => {
    persistEnterWorkspace();
    setHasStarted(true);
    setNameVentureOpen(true);
    switchRoom('dexo');
  }, [switchRoom]);

  const enterWorkspaceGuest = useCallback(() => {
    persistEnterWorkspace();
    setHasStarted(true);
    setNameVentureOpen(false);
    switchRoom('dexo');
  }, [switchRoom]);

  /**
   * After mount: restore guest workspace from sessionStorage, or if Clerk already has a session and
   * the user has not entered as a guest, skip the landing and open the app (name-venture prompt only
   * when they have no ventures yet).
   */
  useEffect(() => {
    if (readPersistedWorkspaceStarted()) {
      setHasStarted(true);
      setSessionResolving(false);
      switchRoom('dexo');
      return;
    }
    if (!isLoaded || !isSignedIn) {
      setSessionResolving(false);
      return;
    }

    setSessionResolving(true);
    let cancelled = false;
    void (async () => {
      try {
        const projects = await getAllProjects();
        if (cancelled) return;
        if (projects.length === 0) {
          enterWorkspaceWithVenturePrompt();
        } else {
          persistEnterWorkspace();
          setHasStarted(true);
          setNameVentureOpen(false);
          switchRoom('dexo');
        }
      } catch {
        if (!cancelled) enterWorkspaceWithVenturePrompt();
      } finally {
        if (!cancelled) setSessionResolving(false);
      }
    })();

    return () => {
      cancelled = true;
      setSessionResolving(false);
    };
  }, [isLoaded, isSignedIn, enterWorkspaceWithVenturePrompt, switchRoom]);

  /** After OAuth redirect or refresh: open name-venture modal if flagged in sessionStorage. */
  useEffect(() => {
    if (!hasStarted) return;
    if (consumePendingNameVenture()) {
      setNameVentureOpen(true);
      switchRoom('dexo');
    }
  }, [hasStarted, switchRoom]);

  /** Guest asked for a venture → signed in in modal → open name venture. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !hasStarted) return;
    let pending = false;
    try {
      pending = sessionStorage.getItem(VENTURE_AUTH_KEY) === '1';
    } catch {
      return;
    }
    if (!pending) return;
    try {
      sessionStorage.removeItem(VENTURE_AUTH_KEY);
    } catch {
      /* ignore */
    }
    setWorkspaceAuthOpen(false);
    setNameVentureOpen(true);
    switchRoom('dexo');
  }, [isLoaded, isSignedIn, hasStarted, switchRoom]);

  /** Create a shell venture (optional name) and open Personal Assistant for chat-first setup. */
  const createVentureWithName = async (name: string) => {
    if (!isSignedIn) {
      try {
        sessionStorage.setItem(VENTURE_AUTH_KEY, '1');
      } catch {
        /* ignore */
      }
      setNameVentureOpen(false);
      setWorkspaceAuthOpen(true);
      return;
    }
    try {
      const shell = emptyVentureShell(name || undefined);
      const ts = Date.now();
      const id = await saveProject({ ...shell, timestamp: ts } as Project);
      const saved = { ...shell, id, timestamp: ts } as Project;
      const list = await getAllProjects();
      setAllProjects(list);
      setActiveProject(saved);
      setNameVentureOpen(false);
      switchRoom('dexo');
    } catch (e) {
      console.error('Failed to create venture:', e);
    }
  };

  /** New venture: requires Clerk; guests get the auth modal first. */
  const requestNewVenture = () => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setNameVentureOpen(true);
      return;
    }
    try {
      sessionStorage.setItem(VENTURE_AUTH_KEY, '1');
    } catch {
      /* ignore */
    }
    setWorkspaceAuthOpen(true);
  };

  const closeWorkspaceAuth = () => {
    setWorkspaceAuthOpen(false);
    try {
      if (!isSignedIn) sessionStorage.removeItem(VENTURE_AUTH_KEY);
    } catch {
      /* ignore */
    }
  };

  if (!isLoaded) {
    return <SessionGateOverlay title="Checking sign-in status…" subtitle="One moment." />;
  }

  if (sessionResolving) {
    return (
      <SessionGateOverlay title="Signed in — opening your workspace…" subtitle="Loading your local ventures." />
    );
  }

  if (!hasStarted) {
    return <LandingPage onContinueGuest={enterWorkspaceGuest} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)] animate-in fade-in duration-500">
      <NameVentureModal
        open={nameVentureOpen}
        onClose={() => {
          setNameVentureOpen(false);
          switchRoom('dexo');
        }}
        onConfirm={(name) => void createVentureWithName(name)}
      />
      <LandingAuthModal open={workspaceAuthOpen} onClose={closeWorkspaceAuth} />
      <OfficeShell>
        <PersonalAssistantChatProvider>
          <DeskChatThreadSlotProvider>
          <SectionGuideProvider>
          <AppShell
            onLogout={() => {
              void resetSystem();
              clearWorkspacePersistence();
              setHasStarted(false);
              setNameVentureOpen(false);
            }}
            onNewVenture={requestNewVenture}
            /** Floating ChatGPT-style pill + thread (same chrome as research strategy desk). Shared venture thread only on CEO; other rooms keep per-desk threads. */
            bottomBar={
              activeRoom !== 'personal_assistant' && activeRoom !== 'dexo' && activeRoom !== 'dashboard' ? (
                <AIInputBarShell>
                  <ChatAssistant variant="ceoSplit" useExecutiveThread={activeRoom === 'ceo'} />
                </AIInputBarShell>
              ) : null
            }
          >
            <WorkspaceStage hideWorkspaceHeader onNewVenture={requestNewVenture} />
          </AppShell>
          </SectionGuideProvider>
          </DeskChatThreadSlotProvider>
          <FloatingDexoOrb />
          <DexoKnowledgePromptModal />
        </PersonalAssistantChatProvider>
        <SyncToastHost />
        <AgentStaffAutoSync />
      </OfficeShell>
    </div>
  );
}
