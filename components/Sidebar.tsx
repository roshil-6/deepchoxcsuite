'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, LogOut, PanelLeftClose, PanelLeftOpen, Clock, FolderOpen } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EngProjectMeta {
  id: string;
  title: string;
  domain: string;
  createdAt: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadProjects(): EngProjectMeta[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('deepchox-eng-projects') : null;
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
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

const DOMAIN_SHORT: Record<string, string> = {
  software:   'SW',
  ai:         'AI',
  hardware:   'HW',
  robotics:   'RB',
  aerospace:  'AS',
  biotech:    'BT',
  iot:        'IoT',
  industrial: 'IND',
  web3:       'W3',
  saas:       'SaaS',
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface SidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onLogout: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Sidebar({ selectedProjectId, onSelectProject, onNewProject, onLogout }: SidebarProps) {
  const [projects, setProjects] = useState<EngProjectMeta[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const refresh = useCallback(() => setProjects(loadProjects()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    const interval = setInterval(refresh, 2500);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, [refresh]);

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r"
      style={{
        width: collapsed ? 52 : 240,
        background: '#111113',
        borderColor: 'rgba(255,255,255,0.06)',
        transition: 'width 0.18s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* ── Logo row ─────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-3 py-3.5"
        style={{ borderColor: 'rgba(255,255,255,0.06)', minHeight: 54 }}
      >
        {!collapsed && (
          <div className="min-w-0 pl-1 select-none">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(255,255,255,0.24)' }}
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
          style={{ color: 'rgba(255,255,255,0.30)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen  className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />
          }
        </button>
      </div>

      {/* ── New project ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-2 pt-3 pb-2">
        <button
          type="button"
          onClick={onNewProject}
          className="flex h-9 w-full items-center gap-2 rounded-lg px-3 transition-all hover:opacity-90 active:scale-[0.97]"
          style={{
            background: 'rgba(20,184,166,0.09)',
            border: '1px solid rgba(20,184,166,0.18)',
            color: 'rgba(20,184,166,0.85)',
          }}
          title="New project"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <span className="truncate text-[13px] font-medium">New project</span>
          )}
        </button>
      </div>

      {/* ── Projects list ─────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {projects.length > 0 ? (
            <>
              {/* Section header */}
              <div className="mb-2 mt-1 flex items-center justify-between px-2">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.22)' }}
                >
                  Projects
                </p>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.28)' }}
                >
                  {projects.length}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-px">
                {projects.map((p) => {
                  const active = selectedProjectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProject(p.id)}
                      className="group flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                      style={{
                        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                      }}
                    >
                      {/* Title row */}
                      <div className="flex w-full items-center gap-2">
                        <div
                          className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors"
                          style={{ background: active ? '#14B8A6' : 'rgba(255,255,255,0.15)' }}
                        />
                        <span
                          className="min-w-0 flex-1 truncate text-[12px] leading-snug"
                          style={{ color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.52)' }}
                        >
                          {p.title}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="mt-0.5 flex items-center gap-2 pl-[18px]">
                        <span
                          className="rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.28)' }}
                        >
                          {DOMAIN_SHORT[p.domain] ?? p.domain.slice(0, 4).toUpperCase()}
                        </span>
                        <span
                          className="flex items-center gap-1 text-[9px]"
                          style={{ color: 'rgba(255,255,255,0.22)' }}
                        >
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          {relativeTime(p.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center px-3 pt-8 text-center">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <FolderOpen className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.18)' }} />
              </div>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                No projects yet.
              </p>
              <p
                className="mt-0.5 text-[10px]"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              >
                Describe any idea to build your first execution plan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Spacer when collapsed */}
      {collapsed && <div className="flex-1" />}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div
        className="mt-auto shrink-0 border-t p-2"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 transition-colors hover:bg-white/[0.04]"
          style={{ color: 'rgba(255,255,255,0.28)' }}
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <span className="text-[12px]">Sign out</span>
          )}
        </button>
      </div>
    </aside>
  );
}
