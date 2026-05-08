'use client';

import React, { useState, useEffect } from 'react';
import { Plus, LogOut, Cpu } from 'lucide-react';

interface EngProjectMeta {
  id: string;
  title: string;
  createdAt: number;
}

function loadProjects(): EngProjectMeta[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('deepchox-eng-projects') : null;
    if (!raw) return [];
    const all = JSON.parse(raw) as EngProjectMeta[];
    return all.map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt }));
  } catch {
    return [];
  }
}

interface SidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onLogout: () => void;
}

export function Sidebar({ selectedProjectId, onSelectProject, onNewProject, onLogout }: SidebarProps) {
  const [projects, setProjects] = useState<EngProjectMeta[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const refresh = () => setProjects(loadProjects());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    const interval = setInterval(refresh, 2500);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, []);

  return (
    <aside
      className="relative flex h-full flex-col border-r flex-shrink-0"
      style={{
        width: collapsed ? 52 : 240,
        background: '#111113',
        borderColor: 'rgba(255,255,255,0.06)',
        transition: 'width 0.2s ease',
      }}
    >
      {/* Logo row */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-4"
        style={{ borderColor: 'rgba(255,255,255,0.06)', minHeight: 56 }}
      >
        {!collapsed && (
          <div className="min-w-0">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(255,255,255,0.28)' }}
            >
              northROSC LABS
            </p>
            <h1
              className="text-[15px] font-semibold tracking-tight"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              Deepchox
            </h1>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
          style={{ color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Cpu className="h-4 w-4" />
        </button>
      </div>

      {/* New project */}
      <div className="px-2 pt-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={onNewProject}
          className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'rgba(20,184,166,0.12)', color: 'rgba(20,184,166,0.9)' }}
          title="New project"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">New project</span>}
        </button>
      </div>

      {/* Projects list */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {projects.length > 0 && (
            <>
              <p
                className="mb-2 mt-1 px-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.22)' }}
              >
                Recent
              </p>
              <div className="space-y-0.5">
                {projects.map((p) => {
                  const active = selectedProjectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProject(p.id)}
                      className="group flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left transition-colors hover:bg-white/[0.04]"
                      style={{
                        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.40)',
                      }}
                    >
                      <div
                        className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors"
                        style={{ background: active ? '#14B8A6' : 'rgba(255,255,255,0.18)' }}
                      />
                      <span className="truncate text-xs">{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {projects.length === 0 && (
            <p
              className="px-2 pt-2 text-xs"
              style={{ color: 'rgba(255,255,255,0.20)' }}
            >
              No projects yet. Start one above.
            </p>
          )}
        </div>
      )}

      {/* Spacer when collapsed */}
      {collapsed && <div className="flex-1" />}

      {/* Footer */}
      <div
        className="mt-auto border-t p-2 shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors hover:bg-white/[0.04]"
          style={{ color: 'rgba(255,255,255,0.28)' }}
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
