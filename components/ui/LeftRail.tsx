'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, LogOut, Sparkles, PanelRight, LogIn, UserPlus, Home } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_ITEMS, WORKSPACE_TITLES, type AppNavRoom } from '@/components/ui/appNav';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { TokenDisplay } from '@/components/tokens/TokenDisplay';
import { SectionGuideRailButton } from '@/components/SectionGuideCoach';
import { DeskSyncSidebarControls } from '@/components/ui/DeskSyncSidebarControls';

const AI_STATUS_MESSAGES = [
    'Monitoring venture health...',
    'Analyzing market signals...',
    'Reviewing strategy data...',
    'Processing team insights...',
    'Scanning opportunities...',
    'Evaluating priorities...',
    'Optimizing workflows...',
    'Tracking milestones...',
];

function AmbientStatus() {
    const [msgIndex, setMsgIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setMsgIndex((i) => (i + 1) % AI_STATUS_MESSAGES.length);
                setVisible(true);
            }, 280);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-2">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/40 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span
                className="min-w-0 flex-1 font-sans text-[10px] leading-snug text-[var(--text-secondary)] transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
            >
                {AI_STATUS_MESSAGES[msgIndex]}
            </span>
        </div>
    );
}

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
    variant = 'flush',
    desktopWorkspaceStrip = false,
    onToggleIntel,
    intelDesktopCollapsed = false,
}: Props) {
    const { activeRoom, switchRoom, activeProject, setActiveProject, setAllProjects, allProjects } = useOffice();
    const { isPro } = useSubscription();
    const { isSignedIn, isLoaded } = useAuth();
    const isFlush = variant === 'flush';

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
        onNavigate?.();
    };

    return (
        <div
            role="navigation"
            aria-label="NorthROSC Labs DeepChox workspace navigation"
            className="relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-secondary)]/95 shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:w-[272px]"
        >
            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                {/* Brand */}
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-4">
                    <div className="min-w-0">
                        <p className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-[#7456ff]">NorthROSC Labs</p>
                        <p className="mt-0.5 truncate font-sans text-[15px] font-bold tracking-tight text-[var(--text-primary)]">DeepChox AI</p>
                        <p className="mt-0.5 truncate font-sans text-[11px] text-[var(--text-secondary)]">Co-founder</p>
                    </div>
                    <StaffNotificationCenter />
                </div>

                {desktopWorkspaceStrip && isFlush && activeProject && (
                    <div className="mx-3 mb-3 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                                    Venture
                                </span>
                                <h2 className="mt-0.5 truncate font-sans text-[13px] font-medium leading-snug text-[var(--text-primary)]">
                                    {activeProject.name}
                                </h2>
                                <p className="mt-0.5 truncate font-sans text-[11px] text-[var(--text-secondary)]">
                                    {WORKSPACE_TITLES[activeRoom] ?? activeRoom}
                                </p>
                            </div>
                            {onToggleIntel && (
                                <button
                                    type="button"
                                    className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                                    onClick={onToggleIntel}
                                    aria-expanded={!intelDesktopCollapsed}
                                    aria-label={intelDesktopCollapsed ? 'Show intelligence panel' : 'Hide intelligence panel'}
                                >
                                    <PanelRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                </button>
                            )}
                        </div>
                        <div className="mt-2">
                            <DailySyncBanner variant="rail" />
                        </div>
                    </div>
                )}

                <div className="shrink-0 px-3 pb-2">
                    <button
                        type="button"
                        onClick={() => {
                            onNewVenture();
                            onNavigate?.();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] py-2.5 font-sans text-[13px] font-medium text-[var(--text-primary)] transition hover:bg-[rgba(255,255,255,0.1)]"
                    >
                        <Plus className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={1.75} aria-hidden />
                        New venture
                    </button>
                </div>

                <DeskSyncSidebarControls room={activeRoom} />

                <nav className="flex shrink-0 flex-col gap-0.5 px-2 pt-2">
                    {APP_NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = activeRoom === item.room;
                        const isDexo = item.room === 'dexo';
                        return (
                            <button
                                key={item.room}
                                type="button"
                                onClick={() => go(item.room)}
                                title={item.label}
                                className={`group relative flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-2 text-left transition-colors ${
                                    active
                                        ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]/70 hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {active && (
                                    <span
                                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                                        aria-hidden
                                    />
                                )}
                                <Icon
                                    className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)] group-hover:text-[var(--text-secondary)]'}`}
                                    strokeWidth={1.75}
                                    aria-hidden
                                />
                                <span className="min-w-0 flex-1">
                                    {isDexo ? (
                                        <span className="flex flex-col gap-0.5">
                                            <span className="truncate font-sans text-[13px] font-medium leading-tight">{item.label}</span>
                                            <span className="font-sans text-[10px] leading-tight text-[var(--muted)]">AI co-founder</span>
                                        </span>
                                    ) : (
                                        <span className="truncate font-sans text-[13px] font-medium leading-tight">{item.label}</span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Divider */}
                <div className="mx-3 my-4 h-px bg-[var(--border)]" />

                {/* Ventures */}
                <div className="px-2 pb-3">
                    <div className="mb-2 flex items-center justify-between px-2">
                        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Ventures</span>
                        {allProjects.length > 0 && (
                            <span className="font-sans text-[10px] tabular-nums text-[var(--muted)]">{allProjects.length}</span>
                        )}
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
                                    className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                        isActive
                                            ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] ring-1 ring-[rgba(116,86,255,0.12)]'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]/70 hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                            isActive ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]/40 group-hover:bg-[var(--muted)]/70'
                                        }`}
                                    />
                                    <span className="min-w-0 flex-1 truncate font-sans text-[13px]">{p.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-2 shrink-0 border-t border-[var(--border)] px-3 pb-4 pt-3">
                    <SectionGuideRailButton />
                    <AmbientStatus />
                    <div className="mb-2 flex justify-center">
                        <TokenDisplay compact showCosts={false} onRequestUpgrade={onUpgrade ? () => onUpgrade() : undefined} />
                    </div>
                    {!isPro && (
                        <button
                            type="button"
                            onClick={() => onUpgrade?.()}
                            className="mb-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(116,86,255,0.25)] bg-[rgba(116,86,255,0.1)] font-sans text-[12px] font-medium text-[#9d88ff] transition hover:border-[rgba(116,86,255,0.4)] hover:bg-[rgba(116,86,255,0.16)]"
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
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(116,86,255,0.35)] bg-[rgba(116,86,255,0.1)] font-sans text-[12px] font-semibold text-[#b8a8ff] transition hover:bg-[rgba(116,86,255,0.18)] hover:text-[#cfc3ff]"
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
