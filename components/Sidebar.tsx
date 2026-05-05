'use client';

import React, { useEffect, useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects, Project } from '@/lib/db';
import { TeamHuddle } from '@/components/TeamHuddle';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  FileText,
  Notebook,
  Plus,
  LogOut,
  MessageSquare,
  GitBranch,
} from 'lucide-react';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { sidebarPrimaryLabel } from '@/lib/researchStaffLabels';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Sparkles } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  /** Chat-first: create shell venture and open Personal Assistant */
  onNewVenture: () => void;
}

/** Desk teammates in the rail (VC gauntlet / shark excluded â€” overlaps coordination bar) */
const TEAM_DESK_ORDER = ['ceo', 'accountant', 'pm', 'cmo', 'scout', 'dexo'] as const;

export function Sidebar({ onLogout, onNewVenture }: SidebarProps) {
  const { activeRoom, switchRoom, agents, activeProject, setActiveProject, setAllProjects, allProjects, staffAttentionPending } = useOffice();
  const { isPro } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const list = await getAllProjects();
      setAllProjects(list);
    })();
  }, [setAllProjects]);

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    switchRoom('dexo');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="relative z-50 flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-brand-border bg-[#111117]"
    >
      <div className="relative flex min-h-[3.5rem] shrink-0 items-center justify-between gap-2 border-b border-brand-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-muted">northROSC LABS presents</p>
          <h1 className="text-[15px] font-semibold tracking-tight text-brand-text">Deepchox <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted align-middle">SUB</span></h1>
        </div>
        <StaffNotificationCenter />
      </div>

      {/* Team Huddle Widget */}
      <div className="mt-3 px-2">
        <TeamHuddle />
      </div>

      {/* Navigation â€” section labels align to nav item inset */}
      <div className="custom-scrollbar relative flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-2 pb-4 text-brand-text">

        {/* Main Workspace */}
        <NavSection label="Overview">
          <NavItem icon={<LayoutGrid className="w-4 h-4" />} label="Executive Overview" isActive={activeRoom === 'dashboard'} onClick={() => switchRoom('dashboard')} />
          <NavItem
            icon={<MessageSquare className="w-4 h-4" />}
            label="Assistant"
            isActive={activeRoom === 'personal_assistant'}
            onClick={() => switchRoom('personal_assistant')}
            title="Venture context and updates"
          />
        </NavSection>

        {/* Coordination & shared surfaces */}
        <NavSection label="Network">
          <NavItem
            icon={<GitBranch className="w-4 h-4" />}
            label="AI team network"
            isActive={activeRoom === 'suite_intelligence'}
            onClick={() => switchRoom('suite_intelligence')}
          />
          <NavItem icon={<Sparkles className="w-4 h-4" />} label="Dexo" isActive={activeRoom === 'dexo'} onClick={() => switchRoom('dexo')} title="AI command center â€” analysis, voice, venture updates" />
          <NavItem icon={<Notebook className="w-4 h-4" />} label="Neural Diary" isActive={activeRoom === 'intelligence_diary'} onClick={() => switchRoom('intelligence_diary')} />
          <NavItem icon={<FileText className="w-4 h-4" />} label="Knowledge Base" isActive={activeRoom === 'reports'} onClick={() => switchRoom('reports')} />
        </NavSection>

        {/* AI teammates */}
        <NavSection label="Teammates">
          {TEAM_DESK_ORDER.map((role) => {
            const agent = agents[role];
            const pendingN = staffAttentionPending.filter((i) => i.role === role).length;
            return (
            <button
              type="button"
              key={agent.role}
              onClick={() => switchRoom(agent.role)}
              className={`group relative flex min-h-[2.75rem] w-full items-center gap-2 rounded-lg py-1.5 pl-2 pr-3 text-left transition-colors ${activeRoom === agent.role ? 'bg-white/[0.08] text-brand-text' : 'text-brand-muted hover:bg-white/[0.05] hover:text-brand-text'
                }`}
              title={`${sidebarPrimaryLabel(agent.name)} â€” ${sidebarPrimaryLabel(agent.execOutput)}`}
            >
              <span
                className={`absolute left-[10px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${activeRoom === agent.role ? 'bg-brand-teal' : 'bg-brand-border group-hover:bg-brand-muted'}`}
                aria-hidden
              />
                <span className={`relative ml-3 flex h-7 w-7 shrink-0 items-center justify-center ${activeRoom === agent.role ? 'text-brand-teal' : 'text-brand-muted group-hover:text-brand-text'}`} aria-hidden>
                {agent.icon}
              </span>
              <span className="relative flex min-w-0 flex-1 items-center gap-1">
                <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm leading-tight ${activeRoom === agent.role ? 'font-medium text-brand-text' : 'font-normal'}`}>{sidebarPrimaryLabel(agent.title)}</span>
                <span className="mt-0.5 block truncate text-[10px] leading-snug text-brand-muted group-hover:text-brand-muted/90">{sidebarPrimaryLabel(agent.execOutput)}</span>
                <span className="sr-only"> â€” {agent.description}</span>
                </span>
                {pendingN > 0 && (
                  <span className="shrink-0 rounded-full bg-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-rose-300" title={`${pendingN} waiting`}>
                    {pendingN > 9 ? '9+' : pendingN}
                  </span>
                )}
              </span>
            </button>
            );
          })}
        </NavSection>

        {/* Projects */}
        <NavSection label="Ventures">
          <button
            type="button"
            onClick={() => {
              switchRoom('dexo');
              onNewVenture();
            }}
            className="mb-2 flex h-8 w-full items-center gap-2 px-2 text-xs font-medium text-brand-muted transition-colors hover:text-brand-text"
            title="New venture and open Assistant"
          >
            <Plus className="h-3 w-3" aria-hidden />
            New venture
          </button>

          <div className="space-y-1">
            {allProjects.map(p => (
              <div
                key={p.id ?? `${p.name}-${p.timestamp}`}
                onClick={() => handleSelectProject(p)}
                className={`group relative flex h-10 w-full cursor-pointer items-center rounded-lg px-4 transition-colors ${activeProject?.id === p.id
                  ? 'bg-white/[0.06] text-white ring-1 ring-white/[0.08]'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                  }`}
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${activeProject?.id === p.id ? 'bg-brand-teal' : 'bg-zinc-600'}`} />
                <div className="ml-3 font-medium text-xs truncate">{p.name}</div>
              </div>
            ))}
          </div>
        </NavSection>

      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-brand-border p-3 space-y-1.5">
        {/* Upgrade CTA â€” only on free plan */}
        {!isPro && (
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] text-xs font-semibold text-amber-400/90 transition-colors hover:bg-amber-400/[0.12] hover:text-amber-300"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Upgrade to Pro
          </button>
        )}
        <button onClick={onLogout} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-brand-muted transition-colors hover:bg-white/[0.06] hover:text-brand-text">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

    </motion.div>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-1" aria-label={label}>
      <h2 className="section-label mb-1.5 px-3">{label}</h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function NavItem({
  icon,
  label,
  isActive,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group flex min-h-9 w-full items-center gap-3 rounded-md py-2 pl-3 pr-3 text-left text-sm transition-colors ${isActive ? 'bg-white/[0.06] text-brand-text' : 'text-brand-muted hover:bg-white/[0.04] hover:text-brand-text'}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${isActive ? 'text-brand-teal' : 'text-brand-muted group-hover:text-brand-text'}`} aria-hidden>
        {icon}
      </span>
      <span className={`min-w-0 truncate ${isActive ? 'font-medium' : 'font-normal'}`}>{label}</span>
    </button>
  );
}

