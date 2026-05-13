'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, LogOut, PanelLeftClose, PanelLeftOpen,
  Clock, FolderOpen, Cpu, Search, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

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

function SectionLabel({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <p className={`mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.1em] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
      {children}
    </p>
  );
}

function NavBtn({
  icon: Icon, label, active, onClick, collapsed, dark,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  dark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left transition-all duration-200 ${
        active
          ? dark
            ? 'bg-[#1a1a1a] text-neutral-200'
            : 'bg-white text-neutral-900 shadow-sm'
          : dark
            ? 'text-neutral-400 hover:bg-[#1a1a1a]/50 hover:text-neutral-300'
            : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      {!collapsed && (
        <span className={`flex-1 truncate text-[13px] ${active ? 'font-medium' : 'font-normal'}`}>
          {label}
        </span>
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
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

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
      className={`relative hidden h-full shrink-0 flex-col border-r transition-colors duration-300 lg:flex ${
        dark
          ? 'border-[#1a1a1a] bg-[#0a0a0a]'
          : 'border-neutral-200 bg-white'
      }`}
      style={{
        width: collapsed ? 56 : 260,
        transition: 'width 0.2s ease, background-color 0.3s',
        overflow: 'hidden',
      }}
    >

      {/* ── Brand header ──────────────────────────────────────────────── */}
      <div
        className={`flex shrink-0 items-center justify-between border-b px-4 py-4 ${
          dark ? 'border-[#1a1a1a]' : 'border-neutral-100'
        }`}
        style={{ minHeight: 64 }}
      >
        {!collapsed && (
          <div className="min-w-0 select-none">
            <span className={`block text-[10px] font-medium uppercase tracking-[0.15em] ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              northROSC LABS
            </span>
            <span className={`block text-[16px] font-semibold tracking-tight ${dark ? 'text-neutral-200' : 'text-neutral-900'}`}>
              Deepchox
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              dark ? 'text-neutral-400 hover:bg-[#1a1a1a]' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              dark ? 'text-neutral-500 hover:bg-[#1a1a1a]' : 'text-neutral-400 hover:bg-neutral-100'
            }`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-4">

        {/* Views nav */}
        <div className="mb-6">
          {!collapsed && <SectionLabel dark={dark}>Workspace</SectionLabel>}
          <div className="mt-2 space-y-1">
            <NavBtn
              icon={Cpu} label="Engineering"
              active={activeView === 'engineering'}
              onClick={() => onSwitchView('engineering')}
              collapsed={collapsed}
              dark={dark}
            />
            <NavBtn
              icon={Search} label="Research"
              active={activeView === 'research'}
              onClick={() => onSwitchView('research')}
              collapsed={collapsed}
              dark={dark}
            />
          </div>
        </div>

        {/* Divider */}
        {!collapsed && <div className={`mb-6 border-t ${dark ? 'border-[#1a1a1a]' : 'border-neutral-100'}`} />}

        {/* Projects */}
        <div className="min-h-0 flex-1">
          {!collapsed ? (
            <>
              {/* Section header */}
              <div className="mb-3 flex items-center justify-between px-2">
                <span className={`text-[11px] font-medium uppercase tracking-[0.1em] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Projects
                  {projects.length > 0 && (
                    <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] ${dark ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-neutral-100 text-neutral-500'}`}>
                      {projects.length}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleNewProject}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                    dark ? 'text-neutral-400 hover:bg-[#1a1a1a]' : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                  title="New project"
                >
                  <Plus className="h-4 w-4" />
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
                        className={`group flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-all ${
                          active
                            ? dark
                              ? 'bg-[#1a1a1a]'
                              : 'bg-white shadow-sm'
                            : dark
                              ? 'hover:bg-[#1a1a1a]/30'
                              : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className={`min-w-0 flex-1 truncate text-[13px] ${active ? (dark ? 'text-neutral-200' : 'text-neutral-900') : dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                            {p.title}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${dark ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-neutral-100 text-neutral-500'}`}>
                            {DOMAIN_LABEL[p.domain] ?? p.domain.slice(0, 3).toUpperCase()}
                          </span>
                          <span className={`flex items-center gap-1 text-[11px] ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            <Clock className="h-3 w-3" />
                            {relativeTime(p.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'bg-[#1a1a1a]' : 'bg-neutral-50'}`}>
                    <FolderOpen className={`h-5 w-5 ${dark ? 'text-neutral-600' : 'text-neutral-400'}`} />
                  </div>
                  <p className={`text-[13px] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                    No projects yet
                  </p>
                  <button
                    type="button"
                    onClick={handleNewProject}
                    className={`mt-2 text-[13px] transition-colors ${dark ? 'text-neutral-400 hover:text-neutral-300' : 'text-neutral-600 hover:text-neutral-900'}`}
                  >
                    Create project →
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Collapsed: icon buttons */
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleNewProject}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  dark ? 'text-neutral-500 hover:bg-[#1a1a1a]' : 'text-neutral-400 hover:bg-neutral-100'
                }`}
                title="New project"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className={`border-t p-3 ${dark ? 'border-[#1a1a1a]' : 'border-neutral-100'}`}>
        <button
          type="button"
          onClick={onLogout}
          className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 transition-colors ${
            dark
              ? 'text-neutral-500 hover:bg-[#1a1a1a] hover:text-neutral-400'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-[13px]">Sign out</span>}
        </button>
      </div>

    </aside>
  );
}
