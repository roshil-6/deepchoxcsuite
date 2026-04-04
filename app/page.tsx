'use client';

import { useState } from 'react';
import { ChatAssistant } from '@/components/ChatAssistant';
import { WorkspaceStage } from '@/components/WorkspaceStage';
import { LandingPage } from '@/components/LandingPage';
import { NameVentureModal } from '@/components/NameVentureModal';
import { AppShell } from '@/components/ui/AppShell';
import { AIInputBarShell } from '@/components/ui/AIInputBar';

import { useOffice } from '@/lib/OfficeContext';
import { Project, saveProject, getAllProjects } from '@/lib/db';
import { emptyVentureShell } from '@/lib/minimalVenture';
import { OfficeShell } from '@/components/OfficeShell';
import { SyncToastHost } from '@/components/SyncToastHost';

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [nameVentureOpen, setNameVentureOpen] = useState(false);
  const { setActiveProject, setAllProjects, switchRoom, activeRoom } = useOffice();

  /** Create a shell venture (optional name) and open Personal Assistant for chat-first setup. */
  const createVentureWithName = async (name: string) => {
    try {
      const shell = emptyVentureShell(name || undefined);
      const id = await saveProject(shell as Project);
      const saved = { ...shell, id, timestamp: Date.now() } as Project;
      const list = await getAllProjects();
      setAllProjects(list);
      setActiveProject(saved);
      setNameVentureOpen(false);
      switchRoom('personal_assistant');
    } catch (e) {
      console.error('Failed to create venture:', e);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    setNameVentureOpen(true);
  };

  const openNameVentureModal = () => setNameVentureOpen(true);

  // Show landing page
  if (!hasStarted) {
    return <LandingPage onStart={handleStart} />;
  }

  // Show main workspace
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)] animate-in fade-in duration-500">
      <NameVentureModal
        open={nameVentureOpen}
        onClose={() => setNameVentureOpen(false)}
        onConfirm={(name) => void createVentureWithName(name)}
      />
      <OfficeShell>
        <AppShell
          onLogout={() => {
            setHasStarted(false);
            setNameVentureOpen(false);
          }}
          onNewVenture={openNameVentureModal}
          /** Floating chat box for every desk except Personal Assistant (PA uses full-page chat). */
          bottomBar={
            activeRoom !== 'personal_assistant' ? (
              <AIInputBarShell>
                <ChatAssistant
                  variant="ceoSplit"
                  useExecutiveThread={activeRoom === 'ceo'}
                />
              </AIInputBarShell>
            ) : null
          }
        >
          <WorkspaceStage hideWorkspaceHeader onNewVenture={openNameVentureModal} />
        </AppShell>
        <SyncToastHost />
      </OfficeShell>
    </div>
  );
}
