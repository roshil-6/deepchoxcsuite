'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, LogOut, Sparkles, LogIn, UserPlus, Home } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_GROUPS, WORKSPACE_TITLES, type AppNavRoom } from '@/components/ui/appNav';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { TokenDisplay } from '@/components/tokens/TokenDisplay';
import { SectionGuideRailButton } from '@/components/SectionGuideCoach';
import { DeskSyncSidebarControls } from '@/components/ui/DeskSyncSidebarControls';

type Props = {
    onLogout: () => void;
    onNewVenture: () => void;
    onUpgrade?: () => void;
    onNavigate?: () => void;
    variant?: 'floating' | 'flush';
    desktopWorkspaceStrip?: boolean;
    onToggleIntel?: () => void;
    intelDesktopCollapsed?: boolean;
};

export function LeftRail({
    onLogout,
    onNewVenture,
    onUpgrade,
    onNavigate,
    onToggleIntel,
}: Props) {
    const { activeRoom, switchRoom, activeProject, setActiveProject, setAllProjects, allProjects } = useOffice();
    const { isPro } = useSubscription();
    const { isSignedIn, isLoaded } = useAuth();

    React.useEffect(() => {
        void (async () => {
            const all = await getAllProjects();
            setAllProjects(all);
        })();
    }, [setAllProjects]);

    const go = (room: AppNavRoom) => {
        if (room === 'dashboard') setActiveProject(null);
        switchRoom(room as Parameters<typeof switchRoom>[0]);
        onNavigate?.();
    };

    return (
        <div
            role="navigation"
            aria-label="DeepChox workspace navigation"
            className="relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-[6px] lg:w-[260px]"
            style={{ background: 'rgba(14, 14, 17, 0.90)' }}
        >
            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">

                {/* ── Brand header ── */}
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-4">
                    <div className="min-w-0">
                        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/30">NorthROSC Labs</p>
                        <p className="mt-0.5 truncate font-sans text-[15px] font-bold tracking-tight text-white/90">DeepChox AI</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {onToggleIntel && (
                            <button
                                type="button"
                                onClick={onToggleIntel}
                                className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                                aria-label="Toggle intelligence panel"
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="1" y="1" width="14" height="14" rx="2" />
                                    <line x1="10" y1="1" x2="10" y2="15" />
                                </svg>
                            </button>
                        )}
                        <StaffNotificationCenter />
                    </div>
                </div>

                {/* ── VENTURES (top — primary context) ── */}
                <div className="shrink-0 px-3 pb-1">
                    <div className="mb-1.5 flex items-center justify-between px-1">
                        <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                            Ventures {allProjects.length > 0 && <span className="ml-1 opacity-60">{allProjects.length}</span>}
                        </span>
                    </div>

                    <div className="flex flex-col gap-px">
                        {allProjects.map((p) => {
                            const isActive = activeProject?.id === p.id;
                            return (
                                <button
                                    key={p.id ?? `${p.name}-${p.timestamp}`}
                                    type="button"
                                    onClick={() => {
                                        setActiveProject(p);
                                        switchRoom('dexo');
                                        onNavigate?.();
                                    }}
                                    className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                                        isActive
                                            ? 'bg-white/[0.07] text-white/85'
                                            : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                                    }`}
                                >
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                                        isActive ? 'bg-white/60' : 'bg-white/15 group-hover:bg-white/30'
                                    }`} />
                                    <span className="min-w-0 flex-1 truncate font-sans text-[13px]">{p.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => { onNewVenture(); onNavigate?.(); }}
                        className="mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-white/[0.08] px-2.5 py-2 font-sans text-[12px] font-medium text-white/30 transition hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-white/60"
                    >
                        <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        New venture
                    </button>
                </div>

                {/* Desk sync controls (venture-specific) */}
                <DeskSyncSidebarControls room={activeRoom} />

                {/* Daily sync banner */}
                {activeProject && (
                    <div className="px-3 pb-1">
                        <DailySyncBanner variant="rail" />
                    </div>
                )}

                {/* ── Divider ── */}
                <div className="mx-3 my-3 h-px bg-[var(--border)]" />

                {/* ── Navigation (grouped) ── */}
                <nav className="flex shrink-0 flex-col px-2 pb-3 gap-4">
                    {APP_NAV_GROUPS.map((group) => (
                        <div key={group.id}>
                            {group.label && (
                                <p className="mb-1 px-2 font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    {group.label}
                                </p>
                            )}
                            <div className="flex flex-col gap-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = activeRoom === item.room;
                                    const isDexo = item.room === 'dexo';

                                    if (isDexo) {
                                        return (
                                            <button
                                                key={item.room}
                                                type="button"
                                                onClick={() => go(item.room)}
                                                className={`group relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-3 pr-3 text-left transition-colors ${
                                                    active
                                                        ? 'border border-white/[0.14] bg-white/[0.07]'
                                                        : 'border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <Icon
                                                    className={`h-4 w-4 shrink-0 ${active ? 'text-white/80' : 'text-[var(--muted)] group-hover:text-white/60'}`}
                                                    strokeWidth={1.75}
                                                />
                                                <span className="flex flex-col gap-0.5 min-w-0">
                                                    <span className={`truncate font-sans text-[13px] font-semibold leading-tight ${active ? 'text-white/90' : 'text-[var(--text-primary)]'}`}>
                                                        {item.label}
                                                    </span>
                                                    <span className="font-mono text-[9px] leading-tight text-white/25 uppercase tracking-[0.14em]">AI co-founder</span>
                                                </span>
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item.room}
                                            type="button"
                                            onClick={() => go(item.room)}
                                            title={WORKSPACE_TITLES[item.room] ?? item.label}
                                            className={`group relative flex w-full items-center gap-3 rounded-md py-2 pl-3 pr-2 text-left transition-colors ${
                                                active
                                                    ? 'bg-white/[0.06] text-white/85'
                                                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                                            }`}
                                        >
                                            {active && (
                                                <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white/40" aria-hidden />
                                            )}
                                            <Icon
                                                className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white/70' : 'text-white/25 group-hover:text-white/50'}`}
                                                strokeWidth={1.75}
                                            />
                                            <span className="min-w-0 flex-1 truncate font-sans text-[12.5px] font-medium leading-tight">
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* ── Footer ── */}
                <div className="mt-auto shrink-0 border-t border-[var(--border)] px-3 pb-4 pt-3 space-y-2">
                    <SectionGuideRailButton />
                    <div className="flex justify-center">
                        <TokenDisplay compact showCosts={false} onRequestUpgrade={onUpgrade ? () => onUpgrade() : undefined} />
                    </div>
                    {!isPro && (
                        <button
                            type="button"
                            onClick={() => onUpgrade?.()}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.05] font-sans text-[12px] font-medium text-white/50 transition hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white/75"
                        >
                            <Sparkles className="h-3.5 w-3.5" aria-hidden />
                            Upgrade to Pro
                        </button>
                    )}
                    {!isLoaded ? (
                        <div className="h-9" aria-hidden />
                    ) : !isSignedIn ? (
                        <div className="flex flex-col gap-2">
                            <Link
                                href="/sign-in"
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.08] font-sans text-[12px] font-semibold text-white transition hover:bg-white/[0.13] hover:border-white/30"
                            >
                                <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Sign in
                            </Link>
                            <Link
                                href="/sign-up"
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] font-sans text-[12px] font-semibold text-white/60 transition hover:border-white/[0.2] hover:bg-white/[0.1] hover:text-white/85"
                            >
                                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Create account
                            </Link>
                            <button
                                type="button"
                                onClick={onLogout}
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl font-sans text-[12px] text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-secondary)]"
                            >
                                <Home className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Back to welcome
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onLogout}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl font-sans text-[12px] text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-secondary)]"
                        >
                            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                            Sign out
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
