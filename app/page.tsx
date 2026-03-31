'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatAssistant } from '@/components/ChatAssistant';
import { WorkspaceStage } from '@/components/WorkspaceStage';
import { LandingPage } from '@/components/LandingPage';
import { OnboardingWizard } from '@/components/OnboardingWizard';

import { useOffice } from '@/lib/OfficeContext';
import { Project, saveProject, getAllProjects } from '@/lib/db';
import { OfficeShell } from '@/components/OfficeShell';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { SyncToastHost } from '@/components/SyncToastHost';

interface OnboardingData {
  projectName: string;
  problemStatement: string;
  targetAudience: string;
  primaryGoal: string;
  timeline: string;
  resources: string;
  industry: string;
  valueProposition: string;
  challenges: string;
}

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { activeProject, setActiveProject, setAllProjects, switchRoom, activeRoom } = useOffice();

  const handleStart = () => {
    setHasStarted(true);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      // Create a persistent project SHELL in the database (Deferred Analysis)
      const newProject: Omit<Project, 'id' | 'timestamp'> = {
        name: data.projectName || `Venture ${new Date().toLocaleDateString()}`,
        onboardingData: JSON.stringify(data),
        strategy: '',
        productPlan: '',
        budget: '',
        marketInsights: '',
        userNotes: '',
        teamDirectives: '',
        journal: [],
        events: [],
        files: [],
        orgStructure: [],
        kanban: [],
        diary: [],
        deskDocuments: [],
      };

      const id = await saveProject(newProject as any);
      const savedProject = { ...newProject, id, timestamp: Date.now() } as Project;

      // Update global state
      const updatedProjects = await getAllProjects();
      setAllProjects(updatedProjects);
      setActiveProject(savedProject);

      // Navigate to Executive Overview
      setShowOnboarding(false);
      setOnboardingComplete(true);
      switchRoom('dashboard');
    } catch (error) {
      console.error('Failed to initialize venture:', error);
    }
  };

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
    setOnboardingComplete(true);
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
          {/* Onboarding Overlay */}
          {showOnboarding && (
            <OnboardingWizard
              onComplete={handleOnboardingComplete}
              onSkip={handleSkipOnboarding}
            />
          )}

          {/* Navigation Sidebar (Floating) */}
          <Sidebar
            onLogout={() => {
              setHasStarted(false);
              setShowOnboarding(false);
              setOnboardingComplete(false);
            }}
            onTriggerOnboarding={() => setShowOnboarding(true)}
          />

          {/* Main: full-width workspace + bottom AI dock (same pattern as Executive overview / CFO — all C-Suite rooms) */}
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-brand-bg">
              <DailySyncBanner />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 basis-0 overflow-hidden">
                  <WorkspaceStage onTriggerOnboarding={() => setShowOnboarding(true)} />
                </div>
                {/* Dexo Core has its own full-height composer — hide dock to avoid two chat inputs and theme seams */}
                {activeRoom !== 'dexo' && (
                  <div className="mt-auto w-full shrink-0 border-t border-brand-border/50 bg-brand-bg">
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
