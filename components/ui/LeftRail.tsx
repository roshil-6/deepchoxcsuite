'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, LogOut, PanelRight } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects, type Project } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_ITEMS, WORKSPACE_TITLES, type AppNavRoom } from '@/components/ui/appNav';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { RelayNavHint } from '@/components/pa/RelayNavHint';
import { PA_SECTION_TAG } from '@/lib/paBuddy';

type Props = {
    onLogout: () => void;
    onNewVenture: () => void;
    /** `flush` = docked rail with border-r; `floating` = rounded card (e.g. legacy desktop). */
    variant?: 'floating' | 'flush';
    /** Desktop docked rail only: room title, venture, intel toggle, daily sync — keeps center column for desk + chat. */
    desktopWorkspaceStrip?: boolean;
    onToggleIntel?: () => void;
    intelDesktopCollapsed?: boolean;
};

export function LeftRail({
    onLogout,
    onNewVenture,
    variant = 'flush',
    desktopWorkspaceStrip = false,
    onToggleIntel,
    intelDesktopCollapsed = false,
}: Props) {
    const { activeRoom, switchRoom, activeProject, setActiveProject, setAllProjects } = useOffice();
    const [projects, setProjects] = useState<Project[]>([]);
    const isFlush = variant === 'flush';

    useEffect(() => {
        void (async () => {
            const all = await getAllProjects();
            setProjects(all);
            setAllProjects(all);
        })();
    }, [setAllProjects]);

    const go = (room: AppNavRoom) => {
        switchRoom(room as Parameters<typeof switchRoom>[0]);
    };

    const surface = isFlush
        ? 'relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg)] lg:w-[260px]'
        : 'relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--bg)]/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:w-52';

    return (
        <div role="navigation" aria-label="Research workspace navigation" className={surface}>
            <div
                className={`flex min-h-12 shrink-0 items-center justify-between gap-1 border-b border-[var(--border)] ${isFlush ? 'px-4 py-3' : 'px-2.5 py-2'}`}
            >
                <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-[15px] font-medium tracking-tight text-[var(--text)]">DeepChox</p>
                    <p className={`truncate leading-tight text-[var(--muted)] ${isFlush ? 'mt-0.5 text-[11px]' : 'text-[10px]'}`}>
                        {isFlush ? 'Workspace' : 'Research workspace'}
                    </p>
                </div>
                <StaffNotificationCenter />
            </div>

            {desktopWorkspaceStrip && isFlush ? (
                <>
                    <div className="shrink-0 border-b border-[var(--border)] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-[12px] font-semibold leading-snug tracking-tight text-[var(--text)]">
                                    {WORKSPACE_TITLES[activeRoom] ?? activeRoom}
                                </h2>
                                <p className="mt-0.5 truncate text-[10px] leading-tight text-[var(--muted)]">
                                    {activeProject?.name ?? 'Select or create a venture'}
                                </p>
                            </div>
                            {onToggleIntel ? (
                                <button
                                    type="button"
                                    className="shrink-0 rounded-lg border border-[var(--border)] bg-white/[0.03] p-1.5 text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)]"
                                    onClick={onToggleIntel}
                                    aria-expanded={!intelDesktopCollapsed}
                                    aria-label={intelDesktopCollapsed ? 'Show intelligence panel' : 'Hide intelligence panel'}
                                    title={intelDesktopCollapsed ? 'Show alerts panel' : 'Hide alerts panel'}
                                >
                                    <PanelRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                                </button>
                            ) : null}
                        </div>
                    </div>
                    <div className="shrink-0">
                        <DailySyncBanner variant="rail" />
                    </div>
                </>
            ) : null}

            <nav className={`custom-scrollbar flex flex-1 flex-col overflow-y-auto ${isFlush ? 'gap-0.5 px-2 py-3' : 'gap-px px-1.5 py-2'}`}>
                {APP_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeRoom === item.room;
                    return (
                        <motion.button
                            key={item.room}
                            type="button"
                            layout
                            onClick={() => go(item.room)}
                            title={item.room === 'personal_assistant' ? PA_SECTION_TAG : item.label}
                            whileTap={{ scale: 0.98 }}
                            className={
                                isFlush
                                    ? `group relative flex min-h-9 w-full items-center gap-3 rounded-md py-2 pl-3 pr-3 text-left text-sm transition-colors ${
                                          active
                                              ? 'bg-white/[0.06] text-[var(--text)]'
                                              : 'text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--text)]'
                                      }`
                                    : `relative flex w-full items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 text-left transition-colors ${
                                          active
                                              ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                                              : 'text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--text)]'
                                      }`
                            }
                        >
                            <span
                                className={
                                    isFlush
                                        ? `flex h-7 w-7 shrink-0 items-center justify-center ${
                                              active ? 'text-[var(--accent)]' : 'text-[var(--muted)] group-hover:text-[var(--text)]'
                                          }`
                                        : `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[var(--text)] ${
                                              active ? 'border-white/[0.16] bg-white/[0.06]' : 'text-zinc-300'
                                          }`
                                }
                            >
                                <Icon className={isFlush ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={isFlush ? 2 : 1.85} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                                {item.room === 'personal_assistant' ? (
                                    <span className="flex flex-col items-start gap-0">
                                        <span
                                            className={`truncate font-medium leading-snug ${isFlush ? 'text-sm' : 'text-[11px]'}`}
                                        >
                                            {item.label}
                                        </span>
                                        <RelayNavHint
                                            className={isFlush ? '!text-[10px] !leading-snug !text-[var(--muted)]' : '!text-[9px] !leading-snug !text-[var(--muted)]'}
                                        />
                                    </span>
                                ) : (
                                    <span className={`truncate font-medium leading-snug ${isFlush ? 'text-sm' : 'text-[11px]'}`}>
                                        {item.label}
                                    </span>
                                )}
                            </span>
                        </motion.button>
                    );
                })}
            </nav>

            <div className={`border-t border-[var(--border)] ${isFlush ? 'px-2 py-3' : 'px-1.5 py-2'}`}>
                <button
                    type="button"
                    onClick={onNewVenture}
                    className={`mb-2 flex w-full items-center gap-2 font-medium text-[var(--muted)] transition-colors hover:text-[var(--text)] ${
                        isFlush ? 'h-8 px-2 text-xs hover:bg-transparent' : 'rounded-xl py-1.5 pl-1.5 text-[11px] hover:bg-white/[0.05]'
                    }`}
                >
                    <Plus className={`shrink-0 opacity-90 ${isFlush ? 'h-3 w-3' : 'h-[18px] w-[18px]'}`} strokeWidth={isFlush ? 2 : 1.85} aria-hidden />
                    <span className="truncate">New venture</span>
                </button>
                <div className={`max-h-28 overflow-y-auto ${isFlush ? 'space-y-1' : 'space-y-px'}`}>
                    {projects.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                                setActiveProject(p);
                                switchRoom('dashboard');
                            }}
                            className={
                                isFlush
                                    ? `flex h-10 w-full cursor-pointer items-center rounded-lg px-4 text-left text-xs font-medium transition-colors ${
                                          activeProject?.id === p.id
                                              ? 'bg-white/[0.06] text-[var(--text)] ring-1 ring-white/[0.08]'
                                              : 'text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--text)]'
                                      }`
                                    : `flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-[10px] transition-colors ${
                                          activeProject?.id === p.id
                                              ? 'border-white/[0.1] bg-white/[0.05] text-[var(--text)]'
                                              : 'text-[var(--muted)] hover:bg-white/[0.04]'
                                      }`
                            }
                        >
                            <span
                                className={`shrink-0 rounded-full ${isFlush ? 'h-2 w-2' : 'h-1.5 w-1.5'} ${
                                    activeProject?.id === p.id
                                        ? 'bg-[var(--accent)]'
                                        : isFlush
                                          ? 'bg-zinc-600'
                                          : 'bg-[var(--muted)]'
                                }`}
                            />
                            <span className={`min-w-0 truncate ${isFlush ? 'ml-3' : ''}`}>{p.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className={`mt-auto border-t border-[var(--border)] ${isFlush ? 'p-3' : 'p-1.5'}`}>
                <button
                    type="button"
                    onClick={onLogout}
                    className={
                        isFlush
                            ? 'flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)]'
                            : 'flex w-full items-center gap-2 rounded-xl py-2 pl-1.5 text-[11px] text-[var(--muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text)]'
                    }
                >
                    <LogOut className={`shrink-0 opacity-90 ${isFlush ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`} strokeWidth={isFlush ? 2 : 1.85} aria-hidden />
                    <span className="truncate">{isFlush ? 'Sign Out' : 'Sign out'}</span>
                </button>
            </div>
        </div>
    );
}
