'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, LogOut, PanelRight, Sparkles } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_ITEMS, WORKSPACE_TITLES, type AppNavRoom } from '@/components/ui/appNav';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { RelayNavHint } from '@/components/pa/RelayNavHint';
import { PA_SECTION_TAG } from '@/lib/paBuddy';
import { useSubscription } from '@/hooks/useSubscription';

type Props = {
    onLogout: () => void;
    onNewVenture: () => void;
    onUpgrade?: () => void;
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
    onUpgrade,
    variant = 'flush',
    desktopWorkspaceStrip = false,
    onToggleIntel,
    intelDesktopCollapsed = false,
}: Props) {
    const { activeRoom, switchRoom, activeProject, setActiveProject, setAllProjects, allProjects } = useOffice();
    const { isPro } = useSubscription();
    const isFlush = variant === 'flush';

    /** Hydrate venture list from IndexedDB; new ventures from elsewhere update `allProjects` in context — list reads that, not a stale local copy. */
    useEffect(() => {
        void (async () => {
            const all = await getAllProjects();
            setAllProjects(all);
        })();
    }, [setAllProjects]);

    const go = (room: AppNavRoom) => {
        if (room === 'dashboard') {
            setActiveProject(null);
        }
        switchRoom(room as Parameters<typeof switchRoom>[0]);
    };

    const surface = isFlush
        ? 'relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg)] lg:w-[272px]'
        : 'relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg)]/95 backdrop-blur-xl lg:w-52';

    return (
        <div role="navigation" aria-label="Deepchox workspace navigation" className={surface}>
            <div
                className={`flex min-h-12 shrink-0 items-center justify-between gap-1 border-b border-[var(--border)] bg-white/[0.02] ${isFlush ? 'px-4 py-3' : 'px-2.5 py-2'}`}
            >
                <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        north<span className="text-[var(--text)]">ROSC</span> LABS
                    </p>
                    <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--text)]">Deepchox</p>
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
                                    ? `group relative flex min-h-11 w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-left text-sm transition-all ${
                                          active
                                              ? 'border border-white/[0.08] bg-white/[0.07] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                              : 'border border-transparent text-[var(--muted)] hover:-translate-y-px hover:border-white/[0.05] hover:bg-white/[0.03] hover:text-[var(--text)]'
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
                                        ? `flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                                              active
                                                  ? 'border-white/[0.08] bg-white/[0.06] text-[var(--accent)]'
                                                  : 'border-transparent text-[var(--muted)] group-hover:border-white/[0.06] group-hover:bg-white/[0.04] group-hover:text-[var(--text)]'
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
                    className={`mb-2 flex w-full items-center gap-2 font-medium text-[var(--muted)] transition-all hover:text-[var(--text)] ${
                        isFlush ? 'executive-card-interactive h-9 px-3 text-xs' : 'rounded-xl py-1.5 pl-1.5 text-[11px] hover:bg-white/[0.05]'
                    }`}
                >
                    <Plus className={`shrink-0 opacity-90 ${isFlush ? 'h-3 w-3' : 'h-[18px] w-[18px]'}`} strokeWidth={isFlush ? 2 : 1.85} aria-hidden />
                    <span className="truncate">New venture</span>
                </button>
                <div className={`max-h-40 overflow-y-auto ${isFlush ? 'space-y-1.5' : 'space-y-px'}`}>
                    {allProjects.map((p) => (
                        <button
                            key={p.id ?? `${p.name}-${p.timestamp}`}
                            type="button"
                            onClick={() => {
                                setActiveProject(p);
                                switchRoom('dashboard');
                            }}
                            className={
                                isFlush
                                    ? `group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                                          activeProject?.id === p.id
                                              ? 'border-white/[0.1] bg-white/[0.07] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                              : 'border-transparent text-[var(--muted)] hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-[var(--text)]'
                                      }`
                                    : `flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-[10px] transition-colors ${
                                          activeProject?.id === p.id
                                              ? 'border-white/[0.1] bg-white/[0.05] text-[var(--text)]'
                                              : 'text-[var(--muted)] hover:bg-white/[0.04]'
                                      }`
                            }
                        >
                            <span
                                className={`shrink-0 rounded-full ${isFlush ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5'} ${
                                    activeProject?.id === p.id
                                        ? 'bg-[var(--accent)]'
                                        : isFlush
                                          ? 'bg-zinc-600'
                                          : 'bg-[var(--muted)]'
                                }`}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate">{p.name}</span>
                                {isFlush ? (
                                    <span className="mt-0.5 block text-[10px] font-normal text-[var(--muted)]/80">
                                        {p.strategy?.trim() ? 'Strategy on file' : 'Draft venture'}
                                    </span>
                                ) : null}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className={`mt-auto border-t border-[var(--border)] ${isFlush ? 'space-y-1.5 p-3' : 'space-y-1 p-1.5'}`}>
                {/* Upgrade CTA — free plan only */}
                {!isPro && (
                    <button
                        type="button"
                        onClick={() => onUpgrade?.()}
                        className={
                            isFlush
                                ? 'flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] text-xs font-semibold text-amber-400/90 transition-colors hover:bg-amber-400/[0.13] hover:text-amber-300'
                                : 'flex w-full items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] py-2 pl-2.5 text-[11px] font-semibold text-amber-400/80 transition-colors hover:bg-amber-400/[0.12]'
                        }
                    >
                        <Sparkles className={`shrink-0 ${isFlush ? 'h-3.5 w-3.5' : 'h-[15px] w-[15px]'}`} aria-hidden />
                        <span className="truncate">Upgrade to Pro</span>
                    </button>
                )}
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
