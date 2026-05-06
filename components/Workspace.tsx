'use client';

import React, { useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { saveProject } from '@/lib/db';
import { ChatWindow } from './ChatWindow';
import { StrategyDeck } from './StrategyDeck';
import { ProductBoard } from './ProductBoard';
import { BudgetGrid } from './BudgetGrid';
import { InsightWall } from './InsightWall';
import { ProjectJournal } from './ProjectJournal';
import { Dashboard } from './Dashboard';
import { CalendarView } from './CalendarView';
import { OrgStructureBuilder } from './OrgStructureBuilder';
import { IntelligenceDiary } from './IntelligenceDiary';
import { LayoutGrid, FileText, Book, X } from 'lucide-react';

export function Workspace() {
  const { activeProject, activeRoom } = useOffice();
  const [isSaving, setIsSaving] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'agent_view' | 'journal'>('agent_view');

  const handleProjectUpdate = async () => {
    // Triggered when AI updates a project field
    // Auto-save the project
    if (!activeProject) return;

    setIsSaving(true);
    try {
      if (activeProject.id) {
        await saveProject({
          ...activeProject,
          // specific fields are updated in context, but ensuring we save the object
          id: activeProject.id
        });
      }
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // handleGeneratePDF is removed as LiveReportPreview is no longer used

  // High-level Routing with Transitions
  if (activeRoom === 'dashboard') {
    return (
      <div key="dashboard" className="page-transition flex h-screen flex-1 overflow-hidden bg-[#141416]">
        <Dashboard />
      </div>
    );
  }

  if (activeRoom === 'calendar') {
    return (
      <div key="calendar" className="flex-1 h-screen overflow-hidden bg-[#141416] page-transition">
        <CalendarView />
      </div>
    );
  }

  if (activeRoom === 'org_structure') {
    return (
      <div key="org_structure" className="flex-1 h-screen overflow-hidden bg-[#141416] page-transition">
        <OrgStructureBuilder />
      </div>
    );
  }

  if (activeRoom === 'intelligence_diary') {
    return (
      <div key="intelligence_diary" className="flex-1 h-screen overflow-hidden bg-[#141416] page-transition">
        <IntelligenceDiary />
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div key="dashboard-fallback" className="flex-1 h-screen overflow-hidden bg-[#141416] page-transition">
        <Dashboard />
      </div>
    );
  }

  // Determine which Agent Workspace to show
  const renderAgentWorkspace = () => {
    switch (activeRoom) {
      case 'ceo': return <StrategyDeck />;
      case 'pm': return <ProductBoard />;
      case 'accountant': return <BudgetGrid />;
      case 'scout': return <InsightWall />;
      default: return <StrategyDeck />; // Default to CEO/Master
    }
  };

  return (
    <div key={activeProject?.id || 'workspace'} className="flex-1 flex flex-col h-screen overflow-hidden bg-black relative page-transition">
      {/* Background Pattern - Maroon */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#8B1538 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="flex-1 p-6 flex gap-6 overflow-hidden z-0">
        {/* Left: Chat Window */}
        <div className="flex-[4] flex flex-col min-w-0 h-full">
          <ChatWindow onProjectUpdate={handleProjectUpdate} />
        </div>

        {/* Right: Specialized Agent Workspace */}
        <div className="flex-[5] flex flex-col min-w-0 h-full relative">

          {/* Workspace Toggle (Journal vs Agent Tool) - Maroon Glass */}
          <div className="absolute top-4 right-6 z-20 flex bg-[#141416] rounded-full p-1 shadow-2xl border border-red-800/20 transition-all hover:scale-105">
            <button
              onClick={() => setRightPanelMode('agent_view')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${rightPanelMode === 'agent_view' ? 'bg-red-800 text-white shadow-lg shadow-red-800/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
              <LayoutGrid className="w-3 h-3" />
              Workspace
            </button>
            <button
              onClick={() => setRightPanelMode('journal')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${rightPanelMode === 'journal' ? 'bg-red-800 text-white shadow-lg shadow-red-800/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
              <Book className="w-3 h-3" />
              Journal
            </button>
          </div>

          {/* Content Render */}
          <div className="h-full pt-0">
            {rightPanelMode === 'journal' ? (
              <ProjectJournal />
            ) : (
              <div className="h-full animate-in fade-in zoom-in-95 duration-500">
                {renderAgentWorkspace()}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Auto-save indicator - Maroon */}
      {isSaving && (
        <div className="fixed bottom-6 right-8 px-4 py-2 rounded-full bg-red-900 border border-red-800/30 text-white text-xs font-bold tracking-wide shadow-2xl flex items-center gap-2 animate-pulse z-50">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
          SAVING CHANGES...
        </div>
      )}
    </div>
  );
}


