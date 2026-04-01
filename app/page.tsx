'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatAssistant } from '@/components/ChatAssistant';
import { WorkspaceStage } from '@/components/WorkspaceStage';
import { LandingPage } from '@/components/LandingPage';

import { useOffice } from '@/lib/OfficeContext';
import { Project, saveProject, getAllProjects } from '@/lib/db';
import { emptyVentureShell } from '@/lib/minimalVenture';
import { OfficeShell } from '@/components/OfficeShell';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { SyncToastHost } from '@/components/SyncToastHost';

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const { setActiveProject, setAllProjects, switchRoom, activeRoom } = useOffice();

  /** Create a shell venture and open Personal Assistant for chat-first setup (replaces wizard). */
  const createVentureAndOpenAssistant = async () => {
    try {
      const shell = emptyVentureShell();
      const id = await saveProject(shell as Project);
      const saved = { ...shell, id, timestamp: Date.now() } as Project;
      const list = await getAllProjects();
      setAllProjects(list);
      setActiveProject(saved);
      switchRoom('personal_assistant');
    } catch (e) {
      console.error('Failed to create venture:', e);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    void createVentureAndOpenAssistant();
  };

  // Show landing page
  if (!hasStarted) {
    return <LandingPage onStart={handleStart} />;
  }

  // Show main workspace
  return (
    <div className="flex h-screen w-full overflow-hidden bg-brand-bg animate-in fade-in duration-500">
      <OfficeShell>
        <div className="relative z-20 flex h-full w-full min-h-0">
          <Sidebar
            onLogout={() => {
              setHasStarted(false);
            }}
            onNewVenture={() => void createVentureAndOpenAssistant()}
          />

          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-brand-bg">
              <DailySyncBanner />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 basis-0 overflow-hidden">
                  <WorkspaceStage onNewVenture={() => void createVentureAndOpenAssistant()} />
                </div>
                {activeRoom !== 'dexo' && activeRoom !== 'personal_assistant' && (
                  <div className="mt-auto w-full shrink-0 border-t border-white/[0.06] bg-brand-bg/95 backdrop-blur-sm">
                    <div className="max-h-[min(52vh,560px)] min-h-0 w-full overflow-hidden">
                      <ChatAssistant variant="bottomDock" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <SyncToastHost />
      </OfficeShell>
    </div>
  );
}
