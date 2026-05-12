'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, LogOut, PanelLeftClose, PanelLeftOpen,
  Clock, FolderOpen, Cpu, Search,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EngProjectMeta {
  id: string;
  title: string;
  domain: string;
  createdAt: number;
}

export type AppView = 'engineering' | 'research';

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadProjects(): EngProjectMeta[] {
  try {
    const raw = typeof window !== 'undefined'
      ? localStorage.getItem('deepchox-eng-projects')
      : null;
    if (!raw) return [];
    const all = JSON.parse(raw) as EngProjectMeta[];
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

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7)  return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

const DOMAIN_LABEL: Record<string, string> = {
  software: 'SW', ai: 'AI', hardware: 'HW', robotics: 'RB',
  aerospace: 'AS', biotech: 'BT', iot: 'IoT', industrial: 'IND',
  web3: 'W3', saas: 'SaaS',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </p>
  );
}

function NavBtn({
  icon: Icon, label, active, onClick, collapsed,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex h-8 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition-all duration-150 ${
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
          : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
      }`}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400'}`}
      />
      {!collapsed && (
        <span className={`flex-1 truncate text-[12.5px] ${active ? 'font-semibold' : 'font-normal'}`}>
          {label}
        </span>
      )}
      {!collapsed && active && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_0_6px_rgba(13,148,136,0.5)]" />
      )}
    </button>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SidebarProps {
  activeView: AppView;
  onSwitchView: (v: AppView) => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onLogout: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Sidebar({
  activeView, onSwitchView,
  selectedProjectId, onSelectProject,
  onNewProject, onLogout,
}: SidebarProps) {
  const [projects, setProjects] = useState<EngProjectMeta[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const refresh = useCallback(() => setProjects(loadProjects()), []);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    const t = setInterval(refresh, 3000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(t); };
  }, [refresh]);

  const handleNewProject = () => { onNewProject(); onSwitchView('engineering'); };
  const handleSelectProject = (id: string) => { onSelectProject(id); onSwitchView('engineering'); };

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-slate-200/90 bg-[#dfe1e8] shadow-[inset_-1px_0_0_rgba(255,255,255,0.45)]"
      style={{
        width: collapsed ? 52 : 240,
        transition: 'width 0.18s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >

      {/* ── Brand header ──────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-[#dfe1e8]/90 px-3 py-4 backdrop-blur-sm"
        style={{ minHeight: 56 }}
      >
        {!collapsed && (
          <div className="min-w-0 select-none pl-0.5">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              northROSC LABS
            </span>
            <span className="block text-[15px] font-semibold tracking-tight text-slate-900">
              Deepchox
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <PanelLeftOpen  className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">

        {/* Views nav */}
        <div className="shrink-0 px-2 pt-4 pb-1">
          {!collapsed && <SectionLabel>Views</SectionLabel>}
          <div className="space-y-1">
            <NavBtn
              icon={Cpu} label="Engineering OS"
              active={activeView === 'engineering'}
              onClick={() => onSwitchView('engineering')}
              collapsed={collapsed}
            />
            <NavBtn
              icon={Search} label="Research Hub"
              active={activeView === 'research'}
              onClick={() => onSwitchView('research')}
              collapsed={collapsed}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 my-3 shrink-0 border-b border-slate-300/50" />

        {/* Projects */}
        <div className="min-h-0 shrink-0 px-2">
          {!collapsed ? (
            <>
              {/* Section header with inline + */}
              <div className="mb-1.5 flex items-center justify-between px-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Projects
                  {projects.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-white/90 px-1.5 py-px text-[9px] font-bold tabular-nums text-slate-500 ring-1 ring-slate-200/80">
                      {projects.length}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleNewProject}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800"
                  title="New project"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {projects.length > 0 ? (
                <div className="space-y-1">
                  {projects.map((p) => {
                    const active = selectedProjectId === p.id && activeView === 'engineering';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProject(p.id)}
                        className={`group flex w-full flex-col rounded-xl px-3 py-2 text-left transition-all ${
                          active
                            ? 'bg-white shadow-sm ring-1 ring-slate-200/90'
                            : 'hover:bg-white/60'
                        }`}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                              active
                                ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_0_6px_rgba(13,148,136,0.45)]'
                                : 'bg-slate-300'
                            }`}
                          />
                          <span
                            className={`min-w-0 flex-1 truncate text-[12px] leading-snug ${
                              active ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'
                            }`}
                          >
                            {p.title}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 pl-[18px]">
                          <span className="rounded-md bg-slate-200/80 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                            {DOMAIN_LABEL[p.domain] ?? p.domain.slice(0, 3).toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1 text-[9px] text-slate-400">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {relativeTime(p.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/80 shadow-sm">
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    No projects yet
                  </p>
                  <button
                    type="button"
                    onClick={handleNewProject}
                    className="mt-2 text-[11px] font-medium text-teal-700 transition-colors hover:underline"
                  >
                    Start building →
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Collapsed: just the + icon */
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={handleNewProject}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/80"
                title="New project"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Flexible space pushes footer down */}
        <div className="flex-1" />
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-200/80 bg-[#dfe1e8]/60 p-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="text-[12px]">Sign out</span>}
        </button>
      </div>

    </aside>
  );
}
