'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatAssistant } from '@/components/ChatAssistant';
import { WorkspaceStage } from '@/components/WorkspaceStage';
import { LandingPage } from '@/components/LandingPage';
import { LandingAuthModal } from '@/components/LandingAuthModal';
import { NameVentureModal } from '@/components/NameVentureModal';
import { AppShell } from '@/components/ui/AppShell';
import { AIInputBarShell } from '@/components/ui/AIInputBar';

import { useOffice } from '@/lib/OfficeContext';
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

export default function Home() {
  const [hasStarted, setHasStarted] = useState(readPersistedWorkspaceStarted);
  const [nameVentureOpen, setNameVentureOpen] = useState(false);
  const [workspaceAuthOpen, setWorkspaceAuthOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const wasSignedInRef = useRef<boolean | null>(null);
  const { setActiveProject, setAllProjects, switchRoom, activeRoom, resetSystem } = useOffice();

  const enterWorkspaceWithVenturePrompt = useCallback(() => {
    persistEnterWorkspace();
    setHasStarted(true);
    setNameVentureOpen(true);
  }, []);

  const enterWorkspaceGuest = useCallback(() => {
    persistEnterWorkspace();
    setHasStarted(true);
    setNameVentureOpen(false);
  }, []);

  useEffect(() => {
    if (!hasStarted) {
      wasSignedInRef.current = null;
    }
  }, [hasStarted]);

  /** Signed in on the landing hero (false → true): enter with name-venture flow. */
  useEffect(() => {
    if (!isLoaded) return;
    if (wasSignedInRef.current === null) {
      wasSignedInRef.current = isSignedIn;
      return;
    }
    if (isSignedIn && !wasSignedInRef.current && !hasStarted) {
      enterWorkspaceWithVenturePrompt();
    }
    wasSignedInRef.current = isSignedIn;
  }, [isLoaded, isSignedIn, hasStarted, enterWorkspaceWithVenturePrompt]);

  /** After OAuth redirect or refresh: open name-venture modal if flagged in sessionStorage. */
  useEffect(() => {
    if (!hasStarted) return;
    if (consumePendingNameVenture()) setNameVentureOpen(true);
  }, [hasStarted]);

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
  }, [isLoaded, isSignedIn, hasStarted]);

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

  // Show landing page
  if (!hasStarted) {
    return <LandingPage onContinueGuest={enterWorkspaceGuest} />;
  }

  // Show main workspace
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)] animate-in fade-in duration-500">
      <NameVentureModal
        open={nameVentureOpen}
        onClose={() => setNameVentureOpen(false)}
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
              activeRoom !== 'personal_assistant' && activeRoom !== 'dexo' ? (
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
